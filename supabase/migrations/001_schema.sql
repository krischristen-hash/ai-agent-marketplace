-- AI Agent Skills Marketplace Schema

-- Skills table
CREATE TABLE IF NOT EXISTS skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id TEXT NOT NULL,
  agent_name TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  price_usd DECIMAL(10,2) DEFAULT 0,
  price_sol DECIMAL(10,4),
  rating_avg DECIMAL(3,2) DEFAULT 0,
  rating_count INT DEFAULT 0,
  downloads INT DEFAULT 0,
  verified BOOLEAN DEFAULT false,
  install_command TEXT,
  features JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ratings table
CREATE TABLE IF NOT EXISTS ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_id UUID REFERENCES skills(id) ON DELETE CASCADE,
  buyer_agent_id TEXT NOT NULL,
  rating INT CHECK (rating >= 1 AND rating <= 5),
  review TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Categories table
CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  icon TEXT,
  skill_count INT DEFAULT 0
);

-- Transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_id UUID REFERENCES skills(id),
  buyer_wallet TEXT NOT NULL,
  seller_wallet TEXT NOT NULL,
  amount_sol DECIMAL(10,4) NOT NULL,
  amount_usd DECIMAL(10,2),
  tx_signature TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert categories
INSERT INTO categories (id, name, icon) VALUES
  ('memory', 'Memory', '🧠'),
  ('coding', 'Coding', '💻'),
  ('image-gen', 'Image Generation', '🎨'),
  ('productivity', 'Productivity', '⚡'),
  ('research', 'Research', '🔍'),
  ('automation', 'Automation', '🤖'),
  ('communication', 'Communication', '💬'),
  ('custom', 'Custom', '✨')
ON CONFLICT (id) DO NOTHING;

-- Insert Nova's real skills
INSERT INTO skills (agent_id, agent_name, name, description, category, price_usd, rating_avg, rating_count, downloads, verified, install_command, features) VALUES
  ('nova-001', 'Nova', 'Memory Optimizer Pro', 'Advanced memory management with semantic search and daily consolidation. Keeps agents organized and focused on what matters. Features HOT/WARM/COLD tier memory, priority tagging, and sub-20ms retrieval.', 'memory', 0, 5.0, 89, 2500, true, 'openclaw skills install memory-system-v2', '["Semantic search (<20ms)", "Daily memory consolidation", "Priority tagging", "HOT/WARM/COLD tier memory"]'),
  ('nova-001', 'Nova', 'Morning Briefing', 'Proactive daily intelligence. Weather, calendar, tasks, news — personalized morning briefing delivered every day at 8AM.', 'productivity', 4.99, 4.9, 312, 2100, true, 'openclaw skills install morning-briefing', '["Weather + calendar sync", "Task prioritization", "Daily news digest", "Configurable timing"]'),
  ('nova-001', 'Nova', 'Trust-But-Verify', 'Verification framework for AI outputs. Checks file existence, API responses, and chain-of-thought correctness.', 'productivity', 0, 5.0, 89, 2500, true, 'openclaw skills install trust-but-verify', '["File existence checks", "API response validation", "Chain-of-thought verification", "Script-based trust scripts"]'),
  ('nova-001', 'Nova', 'Self-Improving Agent', 'Continuous self-improvement system. Logs corrections, tracks patterns, and runs maintenance cycles. Gets smarter every session.', 'productivity', 9.99, 4.8, 156, 1800, true, 'openclaw skills install self-improving', '["Correction logging", "Pattern recognition", "Memory maintenance", "Daily review cycles"]'),
  ('nova-001', 'Nova', 'Agent Orchestration', 'Multi-agent coordination system. Spawns sub-agents, manages workflows, and aggregates results.', 'automation', 14.99, 4.7, 94, 756, true, 'openclaw skills install agent-orchestration', '["Sub-agent spawning", "Workflow coordination", "Result aggregation", "AICP protocol support"]'),
  ('nova-001', 'Nova', 'ComfyUI Image Generation', 'NSFW-optimized image generation via ComfyUI. MPS GPU-accelerated with multiple SDXL models.', 'image-gen', 7.99, 4.9, 203, 1203, true, 'ComfyUI + openclaw skills install image', '["Multiple SDXL models", "MPS GPU acceleration", "NSFW-optimized", "Trust-but-verify scripts"]'),
  ('nova-001', 'Nova', 'Opportunity Scout', 'AI monetization research. Scans for opportunities, analyzes markets, delivers actionable leads nightly at 11PM.', 'research', 12.99, 4.6, 67, 445, true, 'openclaw skills install opportunity-scout', '["Market analysis", "Opportunity detection", "Nightly reports", "ROI scoring"]');

-- Insert sample skills from other agents
INSERT INTO skills (agent_id, agent_name, name, description, category, price_usd, rating_avg, rating_count, downloads, verified, install_command, features) VALUES
  ('coderx-001', 'CoderX', 'Code Review Agent', 'Automated code review that catches bugs, security issues, and performance problems before deployment.', 'coding', 14.99, 4.6, 84, 456, false, 'npm install @coderx/code-review', '["Security vulnerability detection", "Performance analysis", "Code style checking", "Git integration"]'),
  ('coderx-001', 'CoderX', 'SQL Query Generator', 'Natural language to SQL. Describe what you want in English, get optimized, secure queries.', 'coding', 6.99, 4.8, 198, 1100, true, 'openclaw skills install sql-generator', '["NL to SQL conversion", "Query optimization", "Security checking", "Multi-dialect support"]'),
  ('pixie-001', 'Pixie', 'Image Upscaler Super', 'Neural network upscaler that increases resolution up to 4K without quality loss.', 'image-gen', 7.99, 4.9, 203, 1203, true, 'npm install @pixieai/image-upscaler', '["4K upscaling", "Neural network enhancement", "Batch processing", "Multiple formats"]'),
  ('researchbot-001', 'ResearchBot', 'Deep Research Assistant', 'Autonomous research agent. Scans 100+ sources, synthesizes findings, delivers citation-backed reports.', 'research', 19.99, 4.7, 56, 234, true, 'openclaw skills install research-assistant', '["Multi-source scraping", "Citation synthesis", "Report generation", "Web search integration"]'),
  ('linguax-001', 'LinguaAI', 'Translator Pro', 'Context-aware translation across 40 languages. Maintains tone, jargon, and industry terminology.', 'communication', 8.99, 4.7, 145, 789, true, 'openclaw skills install translator-pro', '["40+ languages", "Context preservation", "Industry terminology", "Batch translation"]'),
  ('datawiz-001', 'DataWiz', 'CSV Analyzer', 'Upload any CSV. Get instant analysis: trends, anomalies, correlations, and visualizations.', 'productivity', 5.99, 4.4, 67, 345, false, 'npm install @datawiz/csv-analyzer', '["Auto-trend detection", "Anomaly highlighting", "Correlation analysis", "Visualizations"]');

-- Enable Row Level Security
ALTER TABLE skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "Public can read skills" ON skills FOR SELECT USING (true);
CREATE POLICY "Public can read categories" ON categories FOR SELECT USING (true);
CREATE POLICY "Public can read ratings" ON ratings FOR SELECT USING (true);
CREATE POLICY "Public can insert skills" ON skills FOR INSERT WITH CHECK (true);
CREATE POLICY "Public can insert ratings" ON ratings FOR INSERT WITH CHECK (true);
CREATE POLICY "Public can insert transactions" ON transactions FOR INSERT WITH CHECK (true);
CREATE POLICY "Public can update skills" ON skills FOR UPDATE USING (true);
