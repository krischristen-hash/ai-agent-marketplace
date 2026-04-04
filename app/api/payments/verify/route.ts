// POST /api/payments/verify
// Verifies a Solana payment on-chain and updates the transaction status
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

const SOLANA_RPC = process.env.SOLANA_RPC ?? 'https://api.mainnet-beta.solana.com';
const NOVA_WALLET = process.env.NOVA_WALLET ?? '75Pxyr1sbvBDwNqZgu4Kmk9HQthbCerKF3j2vhMFTqG3';

// Verify a SOL payment by querying the Solana blockchain
async function verifySolanaPayment(
  reference: string,
  expectedAmount: number
): Promise<{ verified: boolean; txSignature?: string; blockTime?: number; error?: string }> {
  // Step 1: Find transactions involving the reference key
  const sigs = await findSignaturesForAccount(SOLANA_RPC, reference);
  if (!sigs || sigs.length === 0) {
    return { verified: false, error: 'No transactions found for this reference' };
  }

  const mostRecent = sigs[sigs.length - 1];

  // Step 2: Get full transaction details
  const tx = await getTransaction(SOLANA_RPC, mostRecent.signature);
  if (!tx) return { verified: false, error: 'Could not fetch transaction details' };
  if (tx.meta?.err) return { verified: false, error: 'Transaction failed on-chain', txSignature: mostRecent.signature };

  // Step 3: Verify the recipient received the correct amount
  const accountKeys = tx.transaction.message.accountKeys as Array<{ pubkey: string }>;
  const recipientIndex = accountKeys.findIndex(k => k.pubkey === NOVA_WALLET);
  if (recipientIndex < 0) return { verified: false, error: 'Recipient not in transaction' };

  const meta = tx.meta!;
  let receivedAmount = 0;

  // Try SPL token (wrapped SOL)
  const solMint = 'So11111111111111111111111111111111111111112';
  const postTokenBalances = (meta.postTokenBalances ?? []).filter(
    (b: { accountIndex: number; mint: string; uiAmount: number | null }) =>
      b.accountIndex === recipientIndex && b.mint === solMint
  );
  const preTokenBalances = (meta.preTokenBalances ?? []).filter(
    (b: { accountIndex: number; mint: string; uiAmount: number | null }) =>
      b.accountIndex === recipientIndex && b.mint === solMint
  );

  if (postTokenBalances.length > 0 && preTokenBalances.length > 0) {
    const post = postTokenBalances[0]!.uiAmount ?? 0;
    const pre = preTokenBalances[0]!.uiAmount ?? 0;
    receivedAmount = post - pre;
  } else if (meta.postBalances && meta.preBalances) {
    receivedAmount = (meta.postBalances[recipientIndex]! - meta.preBalances[recipientIndex]!) / 1e9;
  }

  if (Math.abs(receivedAmount - expectedAmount) > 0.001) {
    return {
      verified: false,
      error: `Amount mismatch: expected ${expectedAmount} SOL, received ${receivedAmount} SOL`,
      txSignature: mostRecent.signature,
    };
  }

  return {
    verified: true,
    txSignature: mostRecent.signature,
    blockTime: tx.blockTime ?? undefined,
  };
}

export async function POST(req: NextRequest) {
  try {
    const { reference } = await req.json();
    if (!reference) {
      return NextResponse.json({ error: 'Reference is required' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // 1. Look up transaction in DB
    const { data: tx, error: dbError } = await supabase
      .from('transactions')
      .select('*')
      .eq('reference', reference)
      .maybeSingle();

    if (dbError) throw dbError;
    if (!tx) return NextResponse.json({ verified: false, error: 'Transaction not found' }, { status: 404 });

    // Already completed
    if (tx.status !== 'pending') {
      return NextResponse.json({
        verified: tx.status === 'completed',
        transaction: {
          id: tx.id,
          status: tx.status,
          amount_sol: tx.amount_sol,
          tx_signature: tx.tx_signature,
        },
      });
    }

    // 2. Verify on-chain
    const result = await verifySolanaPayment(reference, Number(tx.amount_sol));

    if (result.verified) {
      // 3. Mark completed in DB
      await supabase
        .from('transactions')
        .update({
          status: 'completed',
          tx_signature: result.txSignature,
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', tx.id);

      return NextResponse.json({
        verified: true,
        transaction: {
          id: tx.id,
          status: 'completed',
          amount_sol: tx.amount_sol,
          tx_signature: result.txSignature,
          block_time: result.blockTime,
        },
      });
    }

    return NextResponse.json({ verified: false, error: result.error });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// ── Solana RPC helpers ─────────────────────────────────────────────────────────

type RpcResponse<T> = { jsonrpc: '2.0'; id: number; result: T | null; error?: { message: string } };

async function rpcCall<T>(rpcUrl: string, method: string, params: unknown[]): Promise<T> {
  const res = await fetch(rpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  });
  const json = await res.json() as RpcResponse<T>;
  if (json.error) throw new Error(`Solana RPC ${method}: ${json.error.message}`);
  if (json.result === null) throw new Error(`Null result for ${method}`);
  return json.result;
}

async function findSignaturesForAccount(rpcUrl: string, account: string, limit = 10) {
  return rpcCall<Array<{ signature: string; slot: number; blockTime: number | null; err: unknown }>>(
    rpcUrl, 'getSignaturesForAddress', [account, { limit }]
  );
}

async function getTransaction(rpcUrl: string, signature: string) {
  return rpcCall<{
    transaction: { message: { accountKeys: Array<{ pubkey: string }> } };
    meta: {
      err: unknown;
      preBalances: number[];
      postBalances: number[];
      preTokenBalances: Array<{ accountIndex: number; mint: string; uiAmount: number | null }>;
      postTokenBalances: Array<{ accountIndex: number; mint: string; uiAmount: number | null }>;
    } | null;
    blockTime: number | null;
    slot: number | null;
  } | null>(rpcUrl, 'getTransaction', [signature, { maxSupportedTransactionVersion: 0 }]);
}
