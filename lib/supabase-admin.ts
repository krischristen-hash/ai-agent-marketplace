// Shared Supabase admin client (service role — bypasses RLS)
// Used only in server-side API routes. Never expose this key client-side.

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://latoisacellcgrlvcpjz.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

// Admin client — for API routes that need full DB access
export function getSupabaseAdmin() {
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  });
}

// Anon client — for client-side reads
export function getSupabaseAnon() {
  const { createClient: mk } = require('@supabase/supabase-js');
  return mk(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '');
}
