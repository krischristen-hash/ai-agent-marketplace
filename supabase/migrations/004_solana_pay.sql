-- M3: Solana Pay Transactions
-- Records payment lifecycle: pending → completed → fulfilled
-- Idempotent: uses ADD COLUMN IF NOT EXISTS so it's safe to re-run

-- ── Transactions table ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS transactions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_wallet  TEXT NOT NULL,
  agent_id      UUID,
  amount_sol    NUMERIC(10, 6) NOT NULL,
  amount_usd    NUMERIC(10, 2),
  status        TEXT NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  memo          TEXT,
  tx_signature  TEXT,
  completed_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now(),
  reference     TEXT UNIQUE   -- Solana Pay reference key (added separately for idempotency)
);

-- Add reference column only if it doesn't exist (pre-existing table without it)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transactions' AND column_name = 'reference'
  ) THEN
    ALTER TABLE transactions ADD COLUMN reference TEXT UNIQUE;
  END IF;
END $$;

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "transactions_insert" ON transactions;
DROP POLICY IF EXISTS "transactions_buyer_read" ON transactions;
DROP POLICY IF EXISTS "transactions_admin_update" ON transactions;

CREATE POLICY "transactions_insert" ON transactions FOR INSERT WITH CHECK (true);
CREATE POLICY "transactions_buyer_read" ON transactions FOR SELECT
  USING (true);  -- Public read for payment status checks
CREATE POLICY "transactions_admin_update" ON transactions FOR UPDATE
  USING (auth.role() = 'service_role');

-- Indexes
CREATE INDEX IF NOT EXISTS idx_transactions_reference ON transactions(reference);
CREATE INDEX IF NOT EXISTS idx_transactions_buyer ON transactions(buyer_wallet);
CREATE INDEX IF NOT EXISTS idx_transactions_status_pending ON transactions(status) WHERE status = 'pending';

-- ── Agents table: add SOL fields ──────────────────────────────────────────
ALTER TABLE agents ADD COLUMN IF NOT EXISTS purchase_count INTEGER DEFAULT 0;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS total_revenue_sol NUMERIC(12, 6) DEFAULT 0;

-- ── Revenue payouts table ───────────────────────────────────────────────────
DROP TABLE IF EXISTS revenue_payouts;
CREATE TABLE revenue_payouts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id        UUID REFERENCES agents(id) ON DELETE SET NULL,
  transaction_id  UUID,
  gross_sol       NUMERIC(10, 6) NOT NULL,
  platform_fee    NUMERIC(10, 6) NOT NULL,  -- Nova Platform's 25%
  agent_payout    NUMERIC(10, 6) NOT NULL,   -- Agent owner's 75%
  payout_wallet   TEXT NOT NULL,
  status          TEXT DEFAULT 'pending'
                  CHECK (status IN ('pending', 'paid', 'failed')),
  paid_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payouts_agent ON revenue_payouts(agent_id);
CREATE INDEX IF NOT EXISTS idx_payouts_status_pending ON revenue_payouts(status) WHERE status = 'pending';

ALTER TABLE revenue_payouts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "payouts_admin_all" ON revenue_payouts;
CREATE POLICY "payouts_admin_all" ON revenue_payouts FOR ALL
  USING (auth.role() = 'service_role');

-- ── Atomic counter function ─────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION increment_purchase_count(agent_id UUID)
RETURNS VOID AS $$
  UPDATE agents
  SET purchase_count = purchase_count + 1
  WHERE id = agent_id;
$$ LANGUAGE SQL SECURITY DEFINER;
