// Types for the Self-Improving Harness skill

export type FailureCategory =
  | 'missing_capability'
  | 'weak_verification'
  | 'bad_strategy'
  | 'misunderstanding'
  | 'environment_issue'
  | 'token_limit'
  | 'timeout'
  | 'unknown';

export interface Failure {
  id: string;
  taskId: string;
  category: FailureCategory;
  description: string;
  timestamp: string;
  verified: boolean;
  confidence?: 'high' | 'medium' | 'low';
}

export interface TaskResult {
  taskId: string;
  passed: boolean;
  score: number;        // 0.0 – 1.0
  durationMs: number;
  costUsd?: number;
  error?: string;
  verified: boolean;
}

export interface BenchmarkScore {
  total: number;
  passed: number;
  failed: number;
  avgScore: number;
  costUsd: number;
  taskScores: Record<string, number>;
  durationMs: number;
}

export interface Experiment {
  id: string;
  commit: string;            // short git hash
  description: string;
  target: HarnessTarget;
  baseline: BenchmarkScore;
  result?: BenchmarkScore;
  status: 'running' | 'keep' | 'discard' | 'crash';
  timestamp: string;
  durationMs?: number;
  changes: HarnessChange[];
}

export type HarnessTarget = 'coordinator' | 'skills' | 'tools' | 'orchestration';

export interface HarnessChange {
  file: string;
  before: string;
  after: string;
  reason: string;
}

export interface ImprovementPlan {
  priority: number;           // 1 = highest
  category: FailureCategory;
  description: string;
  change: HarnessChange;
  expectedImpact: 'high' | 'medium' | 'low';
  risk: 'high' | 'medium' | 'low';
}

export interface HarnessSnapshot {
  commit: string;
  timestamp: string;
  coordinatorPrompt: string;
  skillRegistry: string;
  tools: string[];
}

export interface ExperimentConfig {
  target: HarnessTarget;
  maxExperiments: number;
  baselineOnly: boolean;
  description?: string;
  verbose: boolean;
}
