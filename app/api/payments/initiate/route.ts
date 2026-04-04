// POST /api/payments/initiate
// Creates a pending transaction and returns a Solana Pay URL + QR
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

// Nova's wallet
const NOVA_WALLET = process.env.NOVA_WALLET ?? '75Pxyr1sbvBDwNqZgu4Kmk9HQthbCerKF3j2vhMFTqG3';

function generateRefSuffix(): string {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes)).replace(/[\/+=]/g, '').slice(0, 12);
}

export async function POST(req: NextRequest) {
  try {
    const { agentId, buyerWallet, amountSol, memo } = await req.json();

    if (!agentId || !buyerWallet || !amountSol || !memo) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    if (amountSol <= 0 || amountSol > 1000) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // Generate reference key (memo prefix + random suffix)
    const safeMemo = memo.replace(/[^A-Z0-9]/gi, '').toUpperCase().slice(0, 16);
    const reference = `${safeMemo}_${generateRefSuffix()}`;

    // Rough USD conversion (in production, fetch live from CoinGecko)
    const amountUsd = amountSol * 120;

    // Create pending transaction
    const { data: tx, error: txError } = await supabase
      .from('transactions')
      .insert({
        reference,
        buyer_wallet: buyerWallet,
        agent_id: agentId,
        amount_sol: amountSol,
        amount_usd: amountUsd,
        status: 'pending',
        memo,
      })
      .select()
      .single();

    if (txError) throw txError;

    // Build Solana Pay URL
    const url = buildSolanaPayUrl({
      recipient: NOVA_WALLET,
      amount: amountSol,
      label: 'Nova Platform',
      message: `Purchase: ${memo}`,
      memo: reference,
    });

    // Generate QR as data URI
    const QRCode = await import('qrcode');
    const qrDataUri = await QRCode.toDataURL(url, { width: 240, margin: 2 });

    return NextResponse.json({
      transactionId: tx.id,
      reference,
      solanaPayUrl: url,
      qrDataUri,
      amount: amountSol,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

function buildSolanaPayUrl(cfg: {
  recipient: string;
  amount: number;
  label: string;
  message: string;
  memo: string;
}): string {
  const u = new URL('solana:' + cfg.recipient);
  u.searchParams.set('amount', cfg.amount.toString());
  u.searchParams.set('label', cfg.label);
  u.searchParams.set('message', cfg.message);
  u.searchParams.set('memo', cfg.memo);
  u.searchParams.set('reference', crypto.randomUUID().replace(/-/g, '').slice(0, 16));
  return u.toString();
}
