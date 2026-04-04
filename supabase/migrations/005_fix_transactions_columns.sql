-- Fix: align transactions table with what the payment API expects
-- Adds: amount, updated_at, completed_at, agent_id, memo

BEGIN;

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

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'agent_id') THEN
    ALTER TABLE transactions ADD COLUMN agent_id UUID;
    UPDATE transactions SET agent_id = skill_id WHERE skill_id IS NOT NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transactions' AND column_name = 'memo') THEN
    ALTER TABLE transactions ADD COLUMN memo TEXT;
  END IF;
END $$;

COMMIT;
