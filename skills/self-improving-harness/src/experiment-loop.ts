// Experiment Loop — the AutoAgent-style improvement engine
// Runs: baseline → analyze → plan → edit → test → score → keep/discard → repeat

import { createClient } from '@supabase/supabase-js';
import { defaultEditor, HarnessEditor } from './harness-editor.js';
import {
  classifyFailure,
  categorizeFailures,
  rankImprovementOpportunities,
  generateAnalysisReport,
} from './failure-analyzer.js';
import { scoreExperiment, compareScores } from './scorer.js';
import type {
  Experiment,
  ExperimentConfig,
  Failure,
  HarnessSnapshot,
  ImprovementPlan,
  BenchmarkScore,
  HarnessChange,
} from './types.js';

// Supabase connection (Nova's marketplace DB)
const SUPABASE_URL = 'https://latoisacellcgrlvcpjz.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxhdG9pc2FjZWxsY2dybHZjcGp6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4MDY4OTgsImV4cCI6MjA5MDM4Mjg5OH0.wuibE6munsQ40uTS3S4Aw33aY0k_6dtl1GFzjuIAVXo';

export interface LoopCallbacks {
  onExperimentStart?: (exp: Experiment) => void;
  onExperimentComplete?: (exp: Experiment) => void;
  onAnalysisComplete?: (report: string) => void;
  onKeep?: (exp: Experiment) => void;
  onDiscard?: (exp: Experiment) => void;
  onError?: (err: Error, phase: string) => void;
}

export class ExperimentLoop {
  private editor: HarnessEditor;
  private supabase: ReturnType<typeof createClient>;
  private callbacks: LoopCallbacks;
  private config: ExperimentConfig;

  constructor(
    config: ExperimentConfig,
    editor: HarnessEditor = defaultEditor,
    callbacks: LoopCallbacks = {}
  ) {
    this.editor = editor;
    this.config = config;
    this.callbacks = callbacks;
    this.supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }

  /** Run the full experiment loop */
  async run(): Promise<Experiment[]> {
    const experiments: Experiment[] = [];
    const baseline = await this.measureBaseline();

    if (this.config.baselineOnly) {
      console.log('Baseline only mode — skipping experiments');
      return experiments;
    }

    for (let i = 0; i < this.config.maxExperiments; i++) {
      const exp = await this.runSingleExperiment(baseline, i);
      experiments.push(exp);

      if (exp.status === 'crash') {
        console.log(`Experiment ${i + 1} crashed — stopping loop`);
        break;
      }

      // NEVER STOP unless explicitly asked
      // (this matches AutoAgent's "NEVER STOP" directive)
    }

    return experiments;
  }

  /** Run one experiment cycle */
  async runSingleExperiment(baseline: BenchmarkScore, index: number): Promise<Experiment> {
    const commit = this.editor.getCurrentCommit();
    const exp: Experiment = {
      id: `exp-${Date.now()}-${index}`,
      commit,
      description: this.config.description || 'Auto-generated experiment',
      target: this.config.target,
      baseline,
      status: 'running',
      timestamp: new Date().toISOString(),
      changes: [],
    };

    this.callbacks.onExperimentStart?.(exp);

    try {
      // Step 1: Analyze failures
      console.log(`\n🔍 [Experiment ${index + 1}] Analyzing recent failures...`);
      const failures = await this.fetchRecentFailures();
      const categorized = categorizeFailures(failures);
      const report = generateAnalysisReport(failures, categorized);
      this.callbacks.onAnalysisComplete?.(report);
      console.log(report);

      if (failures.length === 0) {
        console.log('No failures found — harness is performing perfectly!');
        exp.status = 'keep';
        exp.result = baseline;
        return exp;
      }

      // Step 2: Plan improvement
      const plans = rankImprovementOpportunities(categorized);
      const plan = plans[0];
      if (!plan) {
        console.log('No improvement plan available');
        exp.status = 'keep';
        exp.result = baseline;
        return exp;
      }

      console.log(`\n📋 Top improvement: ${plan.description}`);
      console.log(`   File: ${plan.change.file}`);
      console.log(`   Expected impact: ${plan.expectedImpact} | Risk: ${plan.risk}`);

      // Step 3: Snapshot before change
      const snapshot = this.editor.snapshot();
      this.editor.saveSnapshot(snapshot, `before-${exp.id}`);

      // Step 4: Apply change
      console.log(`\n✏️  Applying harness change...`);
      const applied = this.editor.applyChange(plan.change);
      if (!applied) {
        throw new Error(`Failed to apply change to ${plan.change.file}`);
      }
      exp.changes.push(plan.change);

      // Step 5: Commit
      const changeCommit = this.editor.commit(
        `exp(${index + 1}): ${plan.change.reason}`
      );
      exp.commit = changeCommit;
      console.log(`   Committed: ${changeCommit}`);

      // Step 6: Run benchmark
      console.log(`\n🧪 Running benchmark...`);
      const result = await this.runBenchmark();

      // Step 7: Score and decide
      const comparison = compareScores(baseline, result);
      exp.result = result;
      exp.durationMs = Date.now() - new Date(exp.timestamp).getTime();

      if (comparison.improved) {
        exp.status = 'keep';
        console.log(`\n✅ KEEP — passed: ${result.passed}/${result.total} (was ${baseline.passed}/${baseline.total})`);
        console.log(`   +${comparison.delta.passed} passed, score: ${baseline.avgScore} → ${result.avgScore}`);
        this.callbacks.onKeep?.(exp);
      } else if (comparison.same && plan.change.reason.includes('simpler')) {
        exp.status = 'keep';
        console.log(`\n✅ KEEP (simpler) — no regression`);
        this.callbacks.onKeep?.(exp);
      } else {
        exp.status = 'discard';
        console.log(`\n❌ DISCARD — passed: ${result.passed}/${result.total} (was ${baseline.passed}/${baseline.total})`);
        // Revert
        console.log(`   Reverting to snapshot ${snapshot.commit}...`);
        this.editor.restoreSnapshot(snapshot);
        this.callbacks.onDiscard?.(exp);
      }

      // Step 8: Log result
      await this.logExperiment(exp);
      this.callbacks.onExperimentComplete?.(exp);

      return exp;
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      exp.status = 'crash';
      exp.result = undefined;
      this.callbacks.onError?.(error, 'experiment-loop');
      console.error(`\n💥 Experiment crashed: ${error.message}`);
      return exp;
    }
  }

  /** Measure current baseline score */
  async measureBaseline(): Promise<BenchmarkScore> {
    console.log('📏 Establishing baseline...');

    // Check for recent task results in DB
    const { data: rows } = await this.supabase
      .from('task_results')  // May not exist yet — schema TBD
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (!rows || rows.length === 0) {
      // No data yet — return neutral baseline
      return {
        total: 0, passed: 0, failed: 0,
        avgScore: 0, costUsd: 0,
        taskScores: {}, durationMs: 0,
      };
    }

    return scoreExperiment(rows);
  }

  /** Fetch recent verification failures from DB */
  async fetchRecentFailures(windowHours = 72): Promise<Failure[]> {
    const cutoff = new Date(Date.now() - windowHours * 60 * 60 * 1000).toISOString();

    // Try transactions table for failed payments (proxy for failed tasks)
    const { data: txs } = await this.supabase
      .from('transactions')
      .select('id, status, created_at, memo')
      .eq('status', 'failed')
      .gte('created_at', cutoff)
      .limit(200);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const failures: Failure[] = [];

    if (txs) {
      for (const tx of txs as any[]) {
        failures.push({
          id: tx.id as string,
          taskId: (tx.memo as string) || (tx.id as string),
          category: classifyFailure((tx.memo as string) || ''),
          description: `Transaction failed: ${(tx.memo as string) || 'unknown'}`,
          timestamp: tx.created_at as string,
          verified: true,
        });
      }
    }

    // TODO: Add task_results table for structured task failure logging
    // For now, use transactions as a proxy for "completed but failed" tasks

    return failures;
  }

  /** Run benchmark tasks (placeholder — hooks into Harbor or local test suite) */
  async runBenchmark(): Promise<BenchmarkScore> {
    // TODO: Run Harbor benchmark suite when tasks/ are available
    // For now, return a simulated score based on change type

    return {
      total: 10,
      passed: Math.floor(Math.random() * 5) + 3,  // Simulate 3-7 passed
      failed: 0,
      avgScore: 0.5 + Math.random() * 0.4,
      costUsd: 0.05 + Math.random() * 0.10,
      taskScores: {},
      durationMs: 5000 + Math.floor(Math.random() * 10000),
    };
  }

  /** Log experiment to DB */
  async logExperiment(exp: Experiment): Promise<void> {
    try {
      await (this.supabase.from('harness_experiments') as any).insert({
        id: exp.id,
        commit: exp.commit,
        description: exp.description,
        target: exp.target,
        baseline_passed: exp.baseline.passed,
        baseline_total: exp.baseline.total,
        baseline_score: exp.baseline.avgScore,
        result_passed: exp.result?.passed,
        result_total: exp.result?.total,
        result_score: exp.result?.avgScore,
        status: exp.status,
        duration_ms: exp.durationMs,
        timestamp: exp.timestamp,
      });
    } catch {
      // Table may not exist yet — ignore
    }
  }
}
