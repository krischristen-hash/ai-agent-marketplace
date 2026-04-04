-- Fix 004 migration to use actual column names from the existing transactions table
-- Remote table has: id, skill_id, buyer_wallet, seller_wallet, amount_sol, amount_usd, tx_signature, status, created_at, reference
-- We need to: add missing columns + add agent_id alias

BEGIN;

-- Add missing columns if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'amount') THEN
    ALTER TABLE transactions ADD COLUMN amount NUMERIC(10, 6);
    UPDATE transactions SET amount = amount_sol WHERE amount IS NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'updated_at') THEN
    ALTER TABLE transactions ADD COLUMN updated_at TIMESTAMPTZ DEFAULT now();
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'completed_at') THEN
    ALTER TABLE transactions ADD COLUMN completed_at TIMESTAMPTZ;
  END IF;
END $$;

-- Add agent_id as an alias/join key (for agent marketplace FK)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'agent_id') THEN
    ALTER TABLE transactions ADD COLUMN agent_id UUID;
    -- Backfill from skill_id (they're the same concept in our schema)
    UPDATE transactions SET agent_id = skill_id WHERE skill_id IS NOT NULL;
  END IF;
END $$;

COMMIT;
