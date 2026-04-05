/**
 * Self-Improving Harness Skill — Nova Platform
 *
 * Autonomous harness improvement loop (AutoAgent pattern).
 *
 * Actions:
 *   run       — Execute an experiment loop
 *   analyze   — Diagnose recent failures
 *   score     — Measure current performance
 *   baseline  — Establish baseline
 *   history   — View experiment ledger
 *   revert    — Revert last change
 */

import { createClient } from '@supabase/supabase-js';
import { ExperimentLoop } from './experiment-loop.js';
import { defaultEditor } from './harness-editor.js';
import {
  classifyFailure,
  categorizeFailures,
  rankImprovementOpportunities,
  generateAnalysisReport,
} from './failure-analyzer.js';
import type { Experiment, ExperimentConfig, HarnessSnapshot } from './types.js';

const SUPABASE_URL = 'https://latoisacellcgrlvcpjz.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxhdG9pc2FjZWxsY2dybHZjcGp6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4MDY4OTgsImV4cCI6MjA5MDM4Mjg5OH0.wuibE6munsQ40uTS3S4Aw33aY0k_6dtl1GFzjuIAVXo';

// ============================================================================
// Skill Actions
// ============================================================================

export interface AnalyzeAction {
  action: 'analyze';
  windowHours?: number;
  minScore?: number;
}

export interface RunAction {
  action: 'run';
  target?: 'coordinator' | 'skills' | 'tools' | 'orchestration';
  description?: string;
  maxExperiments?: number;
  baselineOnly?: boolean;
}

export interface ScoreAction {
  action: 'score';
}

export interface BaselineAction {
  action: 'baseline';
}

export interface HistoryAction {
  action: 'history';
  limit?: number;
}

export interface RevertAction {
  action: 'revert';
  count?: number;
}

export type SkillAction = AnalyzeAction | RunAction | ScoreAction | BaselineAction | HistoryAction | RevertAction;

// ============================================================================
// Main Handler
// ============================================================================

export async function handleSkillAction(action: SkillAction): Promise<string> {
  switch (action.action) {
    case 'analyze':
      return handleAnalyze(action);
    case 'run':
      return handleRun(action);
    case 'score':
      return handleScore();
    case 'baseline':
      return handleBaseline();
    case 'history':
      return handleHistory(action);
    case 'revert':
      return handleRevert(action);
    default:
      return `Unknown action: ${(action as { action: string }).action}`;
  }
}

// ============================================================================
// Action Handlers
// ============================================================================

async function handleAnalyze(action: AnalyzeAction): Promise<string> {
  const windowHours = action.windowHours || 72;
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const cutoff = new Date(Date.now() - windowHours * 3600 * 1000).toISOString();

  const { data: txs } = await supabase
    .from('transactions')
    .select('id, status, created_at, memo')
    .eq('status', 'failed')
    .gte('created_at', cutoff)
    .limit(200);

  const failures = (txs || []).map(tx => ({
    id: tx.id,
    taskId: tx.memo || tx.id,
    category: classifyFailure(tx.memo || ''),
    description: `Transaction failed: ${tx.memo || 'unknown'}`,
    timestamp: tx.created_at,
    verified: true,
  }));

  if (failures.length === 0) {
    return `✅ No failures in the last ${windowHours}h. Harness is clean.\n` +
           `Run \`skill self-improving-harness run\` to start improving anyway.`;
  }

  const categorized = categorizeFailures(failures);
  const report = generateAnalysisReport(failures, categorized);
  const plans = rankImprovementOpportunities(categorized);

  const planSummary = plans.slice(0, 3).map((p, i) =>
    `\n  ${i + 1}. [${p.category}] — ${p.description}\n` +
    `     Impact: ${p.expectedImpact} | Risk: ${p.risk} | File: ${p.change.file}`
  ).join('');

  return `${report}\n📋 Top 3 Improvement Opportunities:${planSummary}\n\n` +
    `Run \`skill self-improving-harness run --target <type>\` to start the experiment loop.`;
}

async function handleRun(action: RunAction): Promise<string> {
  const config: ExperimentConfig = {
    target: action.target || 'coordinator',
    maxExperiments: action.maxExperiments || 5,
    baselineOnly: action.baselineOnly || false,
    description: action.description,
    verbose: true,
  };

  const loop = new ExperimentLoop(config, defaultEditor, {
    onExperimentStart(exp) {
      console.log(`\n🚀 Starting experiment: ${exp.description}`);
    },
    onKeep(exp) {
      console.log(`✅ KEEP: +${exp.result?.passed || 0} passed`);
    },
    onDiscard(exp) {
      console.log(`❌ DISCARD: reverted to previous state`);
    },
    onError(err, phase) {
      console.error(`💥 Error in ${phase}: ${err.message}`);
    },
  });

  const results = await loop.run();
  const kept = results.filter(e => e.status === 'keep').length;
  const discarded = results.filter(e => e.status === 'discard').length;
  const crashed = results.filter(e => e.status === 'crash').length;

  return `\n🏁 Experiment Loop Complete\n` +
    `   Experiments run: ${results.length}\n` +
    `   ✅ Kept: ${kept} | ❌ Discarded: ${discarded} | 💥 Crashed: ${crashed}\n` +
    `   Run \`skill self-improving-harness history\` to see details.`;
}

async function handleScore(): Promise<string> {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data: txs } = await supabase
    .from('transactions')
    .select('id, status, amount_sol, created_at')
    .order('created_at', { ascending: false })
    .limit(100);

  if (!txs || txs.length === 0) {
    return '📏 Current Score: No data yet. Run `skill self-improving-harness baseline` first.';
  }

  const total = txs.length;
  const passed = txs.filter(t => t.status === 'completed').length;
  const failed = txs.filter(t => t.status === 'failed').length;
  const pending = txs.filter(t => t.status === 'pending').length;
  const avgScore = passed / total;

  return `\n📏 Current Harness Score\n` +
    `   Total transactions: ${total}\n` +
    `   ✅ Completed: ${passed} (${((passed/total)*100).toFixed(1)}%)\n` +
    `   ❌ Failed: ${failed}\n` +
    `   ⏳ Pending: ${pending}\n` +
    `   Average Score: ${(avgScore * 100).toFixed(1)}%\n`;
}

async function handleBaseline(): Promise<string> {
  const snapshot = defaultEditor.snapshot();
  defaultEditor.saveSnapshot(snapshot, `baseline-${snapshot.commit}`);

  return `📏 Baseline Established\n` +
    `   Commit: ${snapshot.commit}\n` +
    `   Timestamp: ${snapshot.timestamp}\n` +
    `   Files snapshotted: coordinator prompt, skill registry, tools\n\n` +
    `   All future experiments will be compared against this baseline.\n`;
}

async function handleHistory(action: HistoryAction): Promise<string> {
  const limit = action.limit || 10;
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  const { data: rows } = await supabase
    .from('harness_experiments')
    .select('*')
    .order('timestamp', { ascending: false })
    .limit(limit);

  if (!rows || rows.length === 0) {
    return '📜 No experiments recorded yet. Run `skill self-improving-harness run` first.';
  }

  const lines = ['\n📜 Experiment History\n' + '─'.repeat(70)];
  for (const row of rows) {
    const statusIcon = row.status === 'keep' ? '✅' : row.status === 'discard' ? '❌' : '💥';
    const delta = row.result_score !== null
      ? ` | Δscore: ${(row.result_score - row.baseline_score).toFixed(3)}`
      : '';
    lines.push(
      `${statusIcon} ${row.commit} | ${row.target} | ${row.status}\n` +
      `   ${row.description}${delta}`
    );
  }

  return lines.join('\n');
}

async function handleRevert(action: RevertAction): Promise<string> {
  const count = action.count || 1;
  defaultEditor.revertLast(count);
  const commit = defaultEditor.getCurrentCommit();

  return `↩️  Reverted ${count} experiment(s). Current commit: ${commit}\n` +
    `   Harness is now at the previous state.\n`;
}

// ============================================================================
// CLI Entry Point
// ============================================================================

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.log('Self-Improving Harness Skill — Nova Platform');
    console.log('Usage:');
    console.log('  analyze  [--window-hours 72]');
    console.log('  run      [--target coordinator|skills|tools|orchestration] [--max-experiments 5]');
    console.log('  score');
    console.log('  baseline');
    console.log('  history  [--limit 10]');
    console.log('  revert   [--count 1]');
    process.exit(0);
  }

  const [cmd, ...rest] = args;
  let action: SkillAction;

  switch (cmd) {
    case 'analyze': {
      const windowHours = parseInt(extractFlag(rest, '--window-hours') || '72');
      action = { action: 'analyze', windowHours };
      break;
    }
    case 'run': {
      const target = extractFlag(rest, '--target') as 'coordinator' | 'skills' | 'tools' | 'orchestration' || 'coordinator';
      const maxExperiments = parseInt(extractFlag(rest, '--max-experiments') || '5');
      const description = extractFlag(rest, '--description');
      const baselineOnly = rest.includes('--baseline-only');
      action = { action: 'run', target, maxExperiments, description, baselineOnly };
      break;
    }
    case 'score':
      action = { action: 'score' };
      break;
    case 'baseline':
      action = { action: 'baseline' };
      break;
    case 'history':
      action = { action: 'history', limit: parseInt(extractFlag(rest, '--limit') || '10') };
      break;
    case 'revert':
      action = { action: 'revert', count: parseInt(extractFlag(rest, '--count') || '1') };
      break;
    default:
      console.error(`Unknown command: ${cmd}`);
      process.exit(1);
  }

  const result = await handleSkillAction(action);
  console.log(result);
}

function extractFlag(args: string[], flag: string): string | undefined {
  const idx = args.indexOf(flag);
  if (idx === -1 || idx + 1 >= args.length) return undefined;
  const val = args[idx + 1];
  return val.startsWith('--') ? undefined : val;
}

main().catch(err => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
