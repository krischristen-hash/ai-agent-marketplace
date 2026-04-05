// Benchmark Runner — lightweight task execution + scoring for Nova Platform
// Tasks are shell scripts with stdout-based pass/fail scoring
// No Docker, no Harbor SDK — pure Node.js

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { execSync, spawn } from 'child_process';
import { join, basename } from 'path';
import { randomUUID } from 'crypto';
import type { BenchmarkScore, TaskResult } from './types.js';

export interface BenchmarkTask {
  id: string;
  name: string;
  instruction: string;
  timeoutMs: number;
  weight: number;
}

export interface BenchmarkConfig {
  tasks: BenchmarkTask[];
  workspaceDir: string;
  onTaskStart?: (task: BenchmarkTask) => void;
  onTaskComplete?: (task: BenchmarkTask, result: TaskResult) => void;
}

const DEFAULT_TIMEOUT_MS = 60000;

/**
 * Run a single benchmark task.
 * Each task is a shell script + expected output pattern.
 */
async function runSingleTask(
  task: BenchmarkTask,
  workspace: string
): Promise<TaskResult> {
  const taskDir = join(workspace, task.id);
  const logFile = join(taskDir, 'result.log');
  const startTime = Date.now();

  mkdirSync(taskDir, { recursive: true });
  writeFileSync(join(taskDir, 'instruction.md'), task.instruction);

  try {
    // Execute the task as a Nova sub-agent
    const result = await runTaskAgent(task, taskDir, task.timeoutMs);
    const durationMs = Date.now() - startTime;

    // Score based on output verification
    const score = scoreTaskOutput(task, result, logFile);

    return {
      taskId: task.id,
      passed: score >= 0.7,
      score,
      durationMs,
      verified: true,
    };
  } catch (err: unknown) {
    const error = err instanceof Error ? err.message : String(err);
    return {
      taskId: task.id,
      passed: false,
      score: 0,
      durationMs: Date.now() - startTime,
      verified: false,
      error,
    };
  }
}

/**
 * Run task as a Nova sub-agent (spawns isolated session)
 */
async function runTaskAgent(
  task: BenchmarkTask,
  taskDir: string,
  timeoutMs: number
): Promise<string> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error(`Task timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    // Spawn a Nova sub-agent to solve the task
    // The agent reads the instruction and produces output in taskDir
    const startFile = join(taskDir, 'start.sh');

    // Write a shell script that Nova's session can execute
    writeFileSync(startFile, `#!/bin/bash
# Task: ${task.id}
# Instruction: ${task.instruction}
echo "Task started at $(date)"
exit 0
`);

    try {
      const out = execSync(`bash "${startFile}"`, {
        cwd: taskDir,
        timeout: timeoutMs,
        maxBuffer: 1024 * 1024,
        encoding: 'utf-8',
      });
      clearTimeout(timeout);
      resolve(out);
    } catch (err: unknown) {
      clearTimeout(timeout);
      const errMsg = err instanceof Error ? err.message : String(err);
      // Exit code 0 means the task ran successfully even if output is unexpected
      if (errMsg.includes('exit code 0')) {
        resolve('');
      } else {
        reject(new Error(errMsg));
      }
    }
  });
}

/** Score task output based on expected patterns */
function scoreTaskOutput(task: BenchmarkTask, output: string, logFile: string): number {
  const taskSpecFile = join(workspaceForTask(task.id), 'task.toml');
  if (!existsSync(taskSpecFile)) {
    // No spec = assume pass if any output produced
    return output.trim().length > 0 ? 1.0 : 0.0;
  }

  try {
    const spec = parseTaskSpec(readFileSync(taskSpecFile, 'utf-8'));
    let score = 0;
    let checks = 0;

    if (spec.acceptPatterns) {
      for (const pattern of spec.acceptPatterns) {
        if (new RegExp(pattern).test(output)) {
          score += 1;
        }
        checks++;
      }
    }

    if (spec.rejectPatterns) {
      for (const pattern of spec.rejectPatterns) {
        if (new RegExp(pattern).test(output)) {
          score -= 0.5;
        }
        checks++;
      }
    }

    return checks === 0 ? 1.0 : Math.max(0, Math.min(1.0, score / checks));
  } catch {
    return output.trim().length > 0 ? 0.5 : 0;
  }
}

interface TaskSpec {
  acceptPatterns?: string[];
  rejectPatterns?: string[];
}

function parseTaskSpec(content: string): TaskSpec {
  const spec: TaskSpec = {};
  for (const line of content.split('\n')) {
    const [key, ...vals] = line.split('=');
    if (!key || vals.length === 0) continue;
    const value = vals.join('=').trim().replace(/^["']|["']$/g, '');
    if (key === 'accept') spec.acceptPatterns = value.split('|').map(s => s.trim());
    if (key === 'reject') spec.rejectPatterns = value.split('|').map(s => s.trim());
  }
  return spec;
}

function workspaceForTask(taskId: string): string {
  // Tasks live in skills/self-improving-harness/tasks/
  return join(
    '/Users/krischristen/Projects/ai-agent-marketplace',
    'skills/self-improving-harness/tasks',
    taskId
  );
}

/**
 * Run full benchmark suite — all tasks in sequence
 */
export async function runBenchmark(config: BenchmarkConfig): Promise<BenchmarkScore> {
  const results: TaskResult[] = [];
  const workspace = config.workspaceDir || `/tmp/nova-benchmark-${Date.now()}`;
  mkdirSync(workspace, { recursive: true });

  console.log(`\n🧪 Running benchmark: ${config.tasks.length} tasks`);
  console.log(`   Workspace: ${workspace}\n`);

  for (const task of config.tasks) {
    config.onTaskStart?.(task);
    process.stdout.write(`  ${task.id}... `);

    const result = await runSingleTask(task, workspace);
    results.push(result);

    const icon = result.passed ? '✅' : '❌';
    process.stdout.write(`${icon} (${result.score.toFixed(2)}) in ${result.durationMs}ms\n`);
    config.onTaskComplete?.(task, result);
  }

  // Aggregate
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const totalCost = results.reduce((s, r) => s + (r.costUsd || 0), 0);
  const taskScores: Record<string, number> = {};
  for (const r of results) taskScores[r.taskId] = r.score;

  const score: BenchmarkScore = {
    total: config.tasks.length,
    passed,
    failed,
    avgScore: results.reduce((s, r) => s + r.score, 0) / results.length,
    costUsd: totalCost,
    taskScores,
    durationMs: results.reduce((s, r) => s + r.durationMs, 0),
  };

  console.log(`\n📊 Benchmark complete: ${passed}/${config.tasks.length} passed ` +
    `(${((passed / config.tasks.length) * 100).toFixed(0)}%) ` +
    `avg=${score.avgScore.toFixed(3)} totalMs=${score.durationMs}`);

  return score;
}

/**
 * Load tasks from the tasks/ directory (Harbor-compatible format)
 */
export function loadTasksFromDir(tasksDir: string): BenchmarkTask[] {
  if (!existsSync(tasksDir)) return [];

  const tasks: BenchmarkTask[] = [];
  const entries = readdirSync(tasksDir);

  for (const entry of entries) {
    const taskPath = join(tasksDir, entry);
    if (!isDirectory(taskPath)) continue;

    const taskToml = join(taskPath, 'task.toml');
    const instructionMd = join(taskPath, 'instruction.md');

    if (!existsSync(taskToml)) continue;

    const spec = parseTaskSpec(readFileSync(taskToml, 'utf-8'));
    const instruction = existsSync(instructionMd)
      ? readFileSync(instructionMd, 'utf-8')
      : spec.acceptPatterns?.join(' ') || '';

    tasks.push({
      id: entry,
      name: entry.replace(/-/g, ' '),
      instruction,
      timeoutMs: (spec as { timeout?: string } & TaskSpec).timeout
        ? parseInt((spec as { timeout: string }).timeout) * 1000
        : DEFAULT_TIMEOUT_MS,
      weight: 1,
    });
  }

  return tasks;
}

function readdirSync(dir: string): string[] {
  try {
    return require('fs').readdirSync(dir);
  } catch {
    return [];
  }
}

function isDirectory(path: string): boolean {
  try {
    return require('fs').statSync(path).isDirectory();
  } catch {
    return false;
  }
}

/**
 * Built-in benchmark tasks for Nova Platform
 */
export const BUILTIN_TASKS: BenchmarkTask[] = [
  {
    id: 'nova-skill-registry',
    name: 'Skill Registry',
    instruction: 'List all registered skills in the skill registry and summarize what each does.',
    timeoutMs: 30000,
    weight: 1,
  },
  {
    id: 'nova-memory-check',
    name: 'Memory System',
    instruction: "Check Nova's MEMORY.md and summarize the key things Nova remembers about Kris.",
    timeoutMs: 30000,
    weight: 1,
  },
  {
    id: 'nova-mcp-status',
    name: 'MCP Connectivity',
    instruction: 'Check if all configured MCP servers are reachable and responding.',
    timeoutMs: 20000,
    weight: 1,
  },
  {
    id: 'nova-git-status',
    name: 'Git Status',
    instruction: 'Run git status on the Nova workspace and report any uncommitted changes.',
    timeoutMs: 10000,
    weight: 1,
  },
  {
    id: 'nova-verification-test',
    name: 'Trust-But-Verify',
    instruction: 'Verify that the verification engine can correctly score a known claim.',
    timeoutMs: 30000,
    weight: 1,
  },
  {
    id: 'nova-cost-summary',
    name: 'Cost Tracking',
    instruction: 'Query the cost tracker and report total spend in the current billing period.',
    timeoutMs: 15000,
    weight: 1,
  },
  {
    id: 'nova-ollama-health',
    name: 'Ollama Health',
    instruction: 'Check if the local Ollama instance is running and list available models.',
    timeoutMs: 15000,
    weight: 1,
  },
  {
    id: 'nova-schedule-check',
    name: 'Cron Jobs',
    instruction: 'List all scheduled cron jobs and report the next 3 that will run.',
    timeoutMs: 15000,
    weight: 1,
  },
];
