-- Agents table for Nova Platform agent registration
CREATE TABLE IF NOT EXISTS agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  owner_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

DROP POLICY IF EXISTS "agents_read" ON agents;
DROP POLICY IF EXISTS "agents_admin" ON agents;

ALTER TABLE agents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "agents_read" ON agents FOR SELECT USING (true);
CREATE POLICY "agents_admin" ON agents FOR ALL USING (auth.role() = 'service_role');