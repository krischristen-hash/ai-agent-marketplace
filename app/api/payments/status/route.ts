// GET /api/payments/status?reference=xxx
// Polling endpoint for clients to check payment status after returning from wallet
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export async function GET(req: NextRequest) {
  try {
    const reference = req.nextUrl.searchParams.get('reference');
    if (!reference) {
      return NextResponse.json({ error: 'Reference is required' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    const { data: tx, error } = await supabase
      .from('transactions')
      .select('id, reference, status, amount_sol, amount_usd, tx_signature, completed_at, created_at')
      .eq('reference', reference)
      .maybeSingle();

    if (error) throw error;
    if (!tx) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    return NextResponse.json({
      reference: tx.reference,
      status: tx.status,
      amount_sol: tx.amount_sol,
      amount_usd: tx.amount_usd,
      tx_signature: tx.tx_signature,
      completed_at: tx.completed_at,
      created_at: tx.created_at,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
