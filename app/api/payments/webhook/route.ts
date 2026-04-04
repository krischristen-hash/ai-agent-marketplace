// POST /api/payments/webhook
// Receives transaction confirmations from Solana indexer services (Helius, QuickNode, Triton)
// Also supports manual verification polling fallback
//
// Setup: Point your indexer webhook to this endpoint with ?key=YOUR_WEBHOOK_KEY
// The indexer sends a POST when txs involving your wallet addresses are confirmed

import { NextRequest, NextResponse } from 'next/server';

const SOLANA_RPC = process.env.SOLANA_RPC ?? 'https://api.mainnet-beta.solana.com';
const NOVA_WALLET = process.env.NOVA_WALLET ?? '75Pxyr1sbvBDwNqZgu4Kmk9HQthbCerKF3j2vhMFTqG3';
const WEBHOOK_KEY = process.env.PAYMENT_WEBHOOK_KEY ?? '';

// ── Helius/QuickNode webhook format ────────────────────────────────────────────
// These services send parsed Solana transactions in their webhook payload

type HeliusWebhookTx = {
  signature: string;
  timestamp: number;
  fee: number;
  status: { Ok: unknown } | { Err: unknown };
  tokenTransfers: Array<{
    fromUserAccount: string;
    toUserAccount: string;
    tokenAmount: string;
    mint: string;
  }>;
  nativeTransfers: Array<{
    fromUserAccount: string;
    toUserAccount: string;
    amount: number;
  }>;
};

type HeliusWebhookPayload = {
  hash: string;
  slot: number;
  validator: string;
  signature: string;
  timestamp: number;
  fee: number;
  status: 'success' | 'failed';
  tokenTransfers?: HeliusWebhookTx['tokenTransfers'];
  nativeTransfers?: HeliusWebhookTx['nativeTransfers'];
};

export async function POST(req: NextRequest) {
  // ── Auth ───────────────────────────────────────────────────────────────────
  const providedKey = req.nextUrl.searchParams.get('key');
  if (WEBHOOK_KEY && providedKey !== WEBHOOK_KEY) {
    return NextResponse.json({ error: 'Invalid webhook key' }, { status: 401 });
  }

  // ── Parse payload ──────────────────────────────────────────────────────────
  let payload: HeliusWebhookPayload;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // Determine amount and reference
  let amountSol = 0;
  let fromWallet = '';
  let reference = '';

  // Check native SOL transfers to Nova's wallet
  if (payload.nativeTransfers) {
    for (const t of payload.nativeTransfers) {
      if (t.toUserAccount === NOVA_WALLET) {
        amountSol = t.amount / 1e9;  // lamports → SOL
        fromWallet = t.fromUserAccount;
      }
      // Solana Pay reference keys appear in accountKeys — check if this looks like one
      // Reference keys are derived public keys, typically 32-44 chars base58
      if (t.toUserAccount.length > 30 && /^[1-9A-HJ-NP-Za-km-z]+$/.test(t.toUserAccount)) {
        reference = t.toUserAccount;
      }
    }
  }

  // Check SPL token transfers (for larger amounts via wormhole/USDC etc)
  if (payload.tokenTransfers) {
    for (const t of payload.tokenTransfers) {
      if (t.toUserAccount === NOVA_WALLET) {
        const uiAmount = parseFloat(t.tokenAmount);
        if (uiAmount > amountSol) amountSol = uiAmount;
        fromWallet = t.fromUserAccount;
      }
    }
  }

  // ── Log the webhook hit (for debugging) ────────────────────────────────────
  console.log(`[payment-webhook] tx=${payload.signature} slot=${payload.slot} amount=${amountSol} status=${payload.status}`);

  // ── Respond to indexer quickly (don't wait for DB) ─────────────────────────
  // In production: push to a job queue here (e.g. BullMQ, Inngest)
  // For now, we do a fire-and-forget DB update
  if (amountSol > 0 && reference) {
    verifyAndCompleteAsync(payload.signature, reference, amountSol, fromWallet).catch(err => {
      console.error('[payment-webhook] Background verify failed:', err);
    });
  }

  return NextResponse.json({ received: true });
}

// ── Async verification (non-blocking) ─────────────────────────────────────────

async function verifyAndCompleteAsync(
  _txSignature: string,
  reference: string,
  amountSol: number,
  fromWallet: string
): Promise<void> {
  try {
    // Dynamically import to avoid top-level import issues in Next.js
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://latoisacellcgrlvcpjz.supabase.co',
      process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
    );

    // Look up pending transaction by reference
    const { data: tx, error } = await supabase
      .from('transactions')
      .select('id, buyer_wallet, amount_sol, status')
      .eq('reference', reference)
      .eq('status', 'pending')
      .maybeSingle();

    if (error || !tx) {
      console.log(`[payment-webhook] No pending tx for ref=${reference}`);
      return;
    }

    // Verify amount matches (with 1% tolerance for rounding)
    const expected = Number(tx.amount_sol);
    const tolerance = expected * 0.01;
    if (Math.abs(amountSol - expected) > tolerance) {
      console.log(`[payment-webhook] Amount mismatch for ref=${reference}: expected=${expected} got=${amountSol}`);
      return;
    }

    // Mark completed
    await supabase
      .from('transactions')
      .update({
        status: 'completed',
        tx_signature: _txSignature,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', tx.id);

    console.log(`[payment-webhook] ✅ Completed tx ref=${reference} amount=${amountSol} SOL`);

    // TODO: Create revenue_payouts record (75/25 split)
    // TODO: Send confirmation email / push notification to buyer
  } catch (e) {
    console.error('[payment-webhook] verifyAndCompleteAsync error:', e);
  }
}
