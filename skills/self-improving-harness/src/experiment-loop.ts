// Experiment Loop — the AutoAgent-style improvement engine
// Runs: baseline → analyze → plan → edit → test → score → keep/discard → repeat

import { createClient } from '@supabase/supabase-js';
import { defaultEditor, HarnessEditor } from './harness-editor.js';
import { runBenchmark, BUILTIN_TASKS } from './benchmark-runner.js';
import { scoreExperiment, compareScores } from './scorer.js';
import {
  classifyFailure,
  categorizeFailures,
  rankImprovementOpportunities,
  generateAnalysisReport,
} from './failure-analyzer.js';
import type {
  Experiment,
  ExperimentConfig,
  Failure,
  HarnessSnapshot,
  ImprovementPlan,
  BenchmarkScore,
  HarnessChange,
} from './types.js';

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

    // Always establish current performance first (this IS the baseline)
    console.log('\n📏 Establishing current harness performance...');
    const baseline = await runBenchmark({
      tasks: BUILTIN_TASKS,
      workspaceDir: `/tmp/nova-baseline-${Date.now()}`,
      onTaskStart(task) { process.stdout.write(`  ${task.id}... `); },
      onTaskComplete(_task, res) {
        process.stdout.write(`${res.passed ? '✅' : '❌'} `);
      },
    });
    console.log(`\n   Baseline: ${baseline.passed}/${baseline.total} passed, avgScore=${baseline.avgScore.toFixed(3)}`);

    if (this.config.baselineOnly) {
      console.log('Baseline-only mode — skipping experiments');
      return experiments;
    }

    // Analyze recent failures to find improvement opportunities
    const failures = await this.fetchRecentFailures();
    const categorized = categorizeFailures(failures);
    const report = generateAnalysisReport(failures, categorized);
    this.callbacks.onAnalysisComplete?.(report);
    console.log(report);

    // Get ranked improvement opportunities
    const plans = rankImprovementOpportunities(categorized);

    if (plans.length === 0) {
      console.log('No improvement opportunities found — harness is performing optimally.');
      return experiments;
    }

    // Run experiments for each improvement opportunity (up to maxExperiments)
    for (let i = 0; i < Math.min(this.config.maxExperiments, plans.length); i++) {
      const plan = plans[i];
      const exp = await this.runSingleExperiment(baseline, plan, i);
      experiments.push(exp);

      if (exp.status === 'crash') {
        console.log(`Experiment ${i + 1} crashed — stopping loop`);
        break;
      }

      // AutoAgent "NEVER STOP" rule: continue until maxExperiments or no more plans
    }

    return experiments;
  }

  /** Run one experiment: apply change, benchmark, compare to baseline */
  async runSingleExperiment(
    baseline: BenchmarkScore,
    plan: ImprovementPlan,
    index: number
  ): Promise<Experiment> {
    const commit = this.editor.getCurrentCommit();
    const exp: Experiment = {
      id: `exp-${Date.now()}-${index}`,
      commit,
      description: plan.description,
      target: this.config.target,
      baseline,
      status: 'running',
      timestamp: new Date().toISOString(),
      changes: [],
    };

    this.callbacks.onExperimentStart?.(exp);

    try {
      console.log(`\n🚀 [Experiment ${index + 1}] ${plan.description}`);
      console.log(`   Category: ${plan.category} | Expected: ${plan.expectedImpact} | Risk: ${plan.risk}`);
      console.log(`   File: ${plan.change.file}`);

      // Snapshot before change
      const snapshot = this.editor.snapshot();
      this.editor.saveSnapshot(snapshot, `before-${exp.id}`);

      // Apply change
      console.log(`\n✏️  Applying harness change...`);
      const applied = this.editor.applyChange(plan.change);
      if (!applied) {
        throw new Error(`Failed to apply change to ${plan.change.file}`);
      }
      exp.changes.push(plan.change);

      // Commit
      const changeCommit = this.editor.commit(
        `exp(${index + 1}): ${plan.change.reason}`
      );
      exp.commit = changeCommit;
      console.log(`   Committed: ${changeCommit}`);

      // Run benchmark (same tasks, same conditions)
      console.log(`\n🧪 Re-running benchmark after change...`);
      const result = await runBenchmark({
        tasks: BUILTIN_TASKS,
        workspaceDir: `/tmp/nova-exp-${exp.id}`,
        onTaskStart(task) { process.stdout.write(`  ${task.id}... `); },
        onTaskComplete(_task, res) {
          process.stdout.write(`${res.passed ? '✅' : '❌'} `);
        },
      });

      // Score and decide
      const comparison = compareScores(baseline, result);
      exp.result = result;
      exp.durationMs = Date.now() - new Date(exp.timestamp).getTime();

      if (comparison.improved) {
        exp.status = 'keep';
        console.log(`\n✅ KEEP — passed: ${result.passed}/${result.total} (baseline was ${baseline.passed}/${baseline.total})`);
        console.log(`   Δpassed: ${comparison.delta.passed >= 0 ? '+' : ''}${comparison.delta.passed} | Δscore: ${comparison.delta.score >= 0 ? '+' : ''}${comparison.delta.score.toFixed(3)}`);
        this.callbacks.onKeep?.(exp);
      } else if (comparison.same && plan.change.reason.toLowerCase().includes('simpler')) {
        exp.status = 'keep';
        console.log(`\n✅ KEEP (simpler harness, same performance)`);
        this.callbacks.onKeep?.(exp);
      } else {
        exp.status = 'discard';
        console.log(`\n❌ DISCARD — passed: ${result.passed}/${result.total} (baseline was ${baseline.passed}/${baseline.total})`);
        console.log(`   Reverting to previous state...`);
        this.editor.restoreSnapshot(snapshot);
        this.callbacks.onDiscard?.(exp);
      }

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

  /** Fetch recent verification failures from DB */
  async fetchRecentFailures(windowHours = 72): Promise<Failure[]> {
    const cutoff = new Date(Date.now() - windowHours * 60 * 60 * 1000).toISOString();

    // Try transactions table for failed payments
    const { data: txs } = await this.supabase
      .from('transactions')
      .select('id, status, created_at, memo')
      .eq('status', 'failed')
      .gte('created_at', cutoff)
      .limit(200);

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

    return failures;
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
