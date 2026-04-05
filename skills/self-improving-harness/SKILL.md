# Self-Improving Harness Skill

Autonomous agent harness improvement loop — the AutoAgent pattern, adapted for Nova Platform.

## What It Does

Monitors Nova's own performance, identifies failure patterns, edits her own harness code (prompts, tools, coordination logic), and iterates toward better outcomes — completely autonomously, overnight if needed.

Based on the experiment loop from [kevinrgu/autoagent](https://github.com/kevinrgu/autoagent).

---

## Concept: The Harness Improvement Loop

Nova's "harness" = the combination of:
- Coordinator system prompt (`src/coordinator/coordinator.ts`)
- Skill registry configuration (`src/skills/skill-registry.ts`)
- Tool definitions (MCP clients, OCMT bridge)
- Orchestration logic (`src/tasks/InProcessTeammate.ts`)

The loop:

```
BASELINE ──► RUN ──► SCORE ──► ANALYZE ──► EDIT ──► REPEAT
                ▲                           │
                └───────────────────────────┘
                   (keep if improved)
```

Every experiment is logged. Every change is reversible. Nova never stops unless stopped.

---

## Usage

```json
{
  "skill": "self-improving-harness",
  "action": "run",
  "target": "coordinator",
  "description": "Improve Nova's code review harness after analyzing last 20 verification failures"
}
```

---

## Actions

### `run` — Execute an Experiment Loop

Run one full improvement cycle:
1. Establish baseline (current score)
2. Analyze recent failures from verification DB
3. Choose one harness improvement
4. Apply the change
5. Re-run benchmark suite
6. Score and decide: keep or discard
7. Log result

**Options:**
- `target` — which part of the harness to improve: `coordinator`, `skills`, `tools`, `orchestration`
- `description` — what improvement to attempt
- `maxExperiments` — how many iterations before stopping (default: 5)
- `baselineOnly` — just measure baseline, don't edit (default: false)

### `analyze` — Diagnose Recent Failures

Scan verification logs and group failures by root cause.
Returns a ranked list of improvement opportunities.

**Options:**
- `windowHours` — how far back to look (default: 72)
- `minScore` — minimum failure rate to report (default: 0.1)

### `score` — Measure Current Performance

Calculate current benchmark score across all recent task outcomes.
Returns: `passed`, `failed`, `avgScore`, `costUsd`, `topFailureCategories`

### `baseline` — Establish Baseline

Record the current harness state and score as the baseline.
All future experiments compare against this.

### `history` — View Experiment Ledger

Show recent experiments, their scores, and keep/discard status.

**Options:**
- `limit` — how many rows (default: 10)

### `revert` — Revert Last Change

Undo the most recent experiment's harness edit and restore the previous state.

---

## Experiment Loop (AutoAgent-Style)

```
LOOP:
  1. READ: current harness files
  2. ANALYZE: recent failures from verification DB
  3. PLAN: choose one high-impact improvement
  4. EDIT: apply change to harness
  5. TEST: run benchmark task(s)
  6. SCORE: compare against baseline
  7. DECIDE:
     - If improved → keep change, log "keep"
     - If same + simpler → keep change, log "keep"
     - If worse → revert change, log "discard"
  8. REPEAT (until stopped or maxExperiments reached)
```

---

## Keep / Discard Rules

Strict:

- **Keep** if: `passed` improved
- **Keep** if: `passed` same AND harness is simpler
- **Discard** otherwise

Even discarded experiments are useful — they reveal failure signals for the next attempt.

---

## Failure Categories

Failures are classified into root cause categories:

| Category | Description |
|----------|-------------|
| `missing_capability` | Agent doesn't have a tool/skill for this task |
| `weak_verification` | Verification check passes but output is wrong |
| `bad_strategy` | Agent uses wrong approach (wrong tool, bad sequence) |
| `misunderstanding` | Agent misinterprets the task instruction |
| `environment_issue` | Infrastructure/runtime error (not agent's fault) |
| `token_limit` | Agent runs out of context budget mid-task |
| `timeout` | Task exceeds time budget |

---

## Benchmark Tasks

Benchmark tasks live in `tasks/` (Harbor format compatible):

```
tasks/
  code-review/
    task.toml          — config: name, timeout, metadata
    instruction.md     — prompt sent to agent
    tests/
      test.sh          — entry point, writes /logs/reward.txt
      verify.ts        — verification (pass/fail scoring)
    environment/
      Dockerfile        — task container (FROM nova-base)
```

Tasks write a score 0.0–1.0 to `/logs/reward.txt`.

---

## Architecture

```
self-improving-harness/
├── SKILL.md               — this file
├── src/
│   ├── index.ts           — skill entry point (run/analyze/score/baseline/history/revert)
│   ├── experiment-loop.ts — the AutoAgent-style loop engine
│   ├── harness-editor.ts  — reads/writes harness files (coordinator, skills, etc.)
│   ├── failure-analyzer.ts — scans verification DB, groups by root cause
│   ├── benchmark-runner.ts — runs benchmark tasks, collects scores
│   ├── scorer.ts           — calculates scores, applies keep/discard rules
│   └── types.ts            — shared types: Experiment, Failure, Score
├── prompts/
│   └── experiment-prompt.md — system prompt for the experiment planner
├── tasks/                  — benchmark task templates
└── examples/
    └── run-experiment.ts   — usage example
```

---

## Key Design Decisions

- **Single-file harness editing:** Coordinator prompt + skill registry = the two primary edit surfaces
- **Git-based undo:** Each experiment is a git commit. Revert = `git checkout HEAD~1`
- **Nova writes the harness, not reads it during execution:** No circular dependency
- **Docker isolation for benchmarks:** Each task runs in a fresh container
- **Trust-but-verify integration:** Verification failures are the primary failure signal

---

## Dependencies

Requires:
- Nova Platform `src/` (coordinator, skill-registry, verification-engine)
- Git CLI for versioning
- Optional: Harbor benchmark runner (for formal task suites)
- Supabase DB access (for verification failure logs)

---

## Inspired By

- [kevinrgu/autoagent](https://github.com/kevinrgu/autoagent) — the canonical autonomous harness improvement loop
- Nova Platform's own Trust-But-Verify engine
- OpenClaw's skill system

---

*Built by Nova Platform — 2026-04-04*
