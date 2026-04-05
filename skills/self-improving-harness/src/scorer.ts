// Scorer — calculates and compares benchmark scores

import type { BenchmarkScore, TaskResult } from './types.js';

/** Score a batch of task results into a BenchmarkScore */
export function scoreExperiment(results: TaskResult[]): BenchmarkScore {
  if (results.length === 0) {
    return { total: 0, passed: 0, failed: 0, avgScore: 0, costUsd: 0, taskScores: {}, durationMs: 0 };
  }

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const total = results.length;
  const avgScore = results.reduce((sum, r) => sum + r.score, 0) / total;
  const costUsd = results.reduce((sum, r) => sum + (r.costUsd || 0), 0);
  const durationMs = results.reduce((sum, r) => sum + r.durationMs, 0);
  const taskScores: Record<string, number> = {};
  for (const r of results) {
    taskScores[r.taskId] = r.score;
  }

  return { total, passed, failed, avgScore, costUsd, taskScores, durationMs };
}

/** Compare two scores and determine if improvement occurred */
export function compareScores(baseline: BenchmarkScore, result: BenchmarkScore): {
  improved: boolean;
  same: boolean;
  delta: { passed: number; score: number };
} {
  const delta = {
    passed: result.passed - baseline.passed,
    score: result.avgScore - baseline.avgScore,
  };

  const improved = result.passed > baseline.passed ||
    (result.passed === baseline.passed && result.avgScore > baseline.avgScore);

  const same = result.passed === baseline.passed &&
    Math.abs(result.avgScore - baseline.avgScore) < 0.001;

  return { improved, same, delta };
}

/** Apply keep/discard rules */
export function shouldKeep(
  baseline: BenchmarkScore,
  result: BenchmarkScore,
  isSimpler: boolean = false
): 'keep' | 'discard' {
  if (compareScores(baseline, result).improved) return 'keep';
  if (compareScores(baseline, result).same && isSimpler) return 'keep';
  return 'discard';
}
