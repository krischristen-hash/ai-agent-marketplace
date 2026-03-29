CREATE TABLE IF NOT EXISTS feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('feedback', 'support', 'feature_request', 'skill_request', 'general')),
  agent_name TEXT,
  message TEXT NOT NULL,
  skill_request TEXT,
  email TEXT,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all inserts to feedback\" ON feedback FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all selects from feedback\" ON feedback FOR SELECT USING (true);
CREATE POLICY "Allow all updates to feedback\" ON feedback FOR UPDATE USING (true);
