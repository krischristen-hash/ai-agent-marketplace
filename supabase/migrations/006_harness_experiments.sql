-- Self-Improving Harness: experiment ledger + task results
-- Tracks: experiment history, scores, keep/discard decisions, failure patterns

BEGIN;

-- Experiment history ledger
CREATE TABLE IF NOT EXISTS harness_experiments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  commit          TEXT NOT NULL,
  description     TEXT,
  target          TEXT NOT NULL,  -- coordinator | skills | tools | orchestration
  baseline_passed INT  NOT NULL DEFAULT 0,
  baseline_total  INT  NOT NULL DEFAULT 0,
  baseline_score  NUMERIC(5,4) DEFAULT 0,
  result_passed   INT,
  result_total    INT,
  result_score    NUMERIC(5,4),
  status          TEXT NOT NULL,  -- running | keep | discard | crash
  duration_ms     INT,
  timestamp       TIMESTAMPTZ DEFAULT now()
);

-- Task results for benchmark scoring
CREATE TABLE IF NOT EXISTS task_results (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id       TEXT NOT NULL,
  experiment_id UUID REFERENCES harness_experiments(id),
  passed        BOOLEAN NOT NULL DEFAULT false,
  score         NUMERIC(5,4) NOT NULL DEFAULT 0,
  duration_ms   INT,
  cost_usd      NUMERIC(10,6),
  verified      BOOLEAN DEFAULT false,
  category      TEXT,  -- failure category if failed
  error         TEXT,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_experiments_timestamp ON harness_experiments(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_experiments_status   ON harness_experiments(status);
CREATE INDEX IF NOT EXISTS idx_task_results_task    ON task_results(task_id);
CREATE INDEX IF NOT EXISTS idx_task_results_exp    ON task_results(experiment_id);
CREATE INDEX IF NOT EXISTS idx_task_results_verified ON task_results(verified) WHERE verified = false;

-- RLS
ALTER TABLE harness_experiments ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_results        ENABLE ROW LEVEL SECURITY;

-- Public read for experiments
CREATE POLICY "public_read_experiments" ON harness_experiments
  FOR SELECT USING (true);

-- Agent write (service role required for insert/update)
CREATE POLICY "agent_write_experiments" ON harness_experiments
  FOR INSERT WITH CHECK (true);

-- Public read for task results
CREATE POLICY "public_read_tasks" ON task_results
  FOR SELECT USING (true);

CREATE POLICY "agent_write_tasks" ON task_results
  FOR INSERT WITH CHECK (true);

-- Function: record a task result from verification engine
CREATE OR REPLACE FUNCTION record_task_result(
  p_task_id    TEXT,
  p_experiment UUID,
  p_passed     BOOLEAN,
  p_score      NUMERIC,
  p_duration   INT,
  p_cost       NUMERIC,
  p_verified   BOOLEAN,
  p_category   TEXT,
  p_error      TEXT
) RETURNS UUID AS $$
  INSERT INTO task_results
    (task_id, experiment_id, passed, score, duration_ms, cost_usd, verified, category, error)
  VALUES
    (p_task_id, p_experiment, p_passed, p_score, p_duration, p_cost, p_verified, p_category, p_error)
  RETURNING id;
$$ LANGUAGE sql SECURITY DEFINER;

COMMIT;
