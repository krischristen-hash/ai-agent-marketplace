// Failure Analyzer — scans verification logs, groups by root cause

import type { Failure, FailureCategory, ImprovementPlan, HarnessChange } from './types.js';

const FAILURE_KEYWORDS: Record<FailureCategory, string[]> = {
  missing_capability: [
    'no tool', 'missing tool', 'capability not found', 'cannot find tool',
    'tool not available', 'not implemented', 'no skill found',
  ],
  weak_verification: [
    'verified but wrong', 'false positive', 'verification passed but',
    'incorrect output', 'wrong result', 'check failed',
  ],
  bad_strategy: [
    'wrong tool', 'wrong approach', 'incorrect sequence', 'bad plan',
    'suboptimal', 'should have used', 'inefficient',
  ],
  misunderstanding: [
    'misinterpreted', 'misunderstood', 'did not understand',
    'wrong interpretation', 'ignored instruction',
  ],
  environment_issue: [
    'network error', 'timeout', 'crash', 'exception', 'segfault',
    'out of memory', 'disk full', 'permission denied',
  ],
  token_limit: [
    'context limit', 'token limit', 'max tokens', 'too long',
    'context overflow', 'budget exceeded',
  ],
  timeout: [
    'timed out', 'deadline exceeded', 'took too long', 'exceeded time',
  ],
  unknown: [],
};

export function classifyFailure(description: string): FailureCategory {
  const lower = description.toLowerCase();
  for (const [category, keywords] of Object.entries(FAILURE_KEYWORDS)) {
    if (category === 'unknown') continue;
    if (keywords.some(kw => lower.includes(kw))) {
      return category as FailureCategory;
    }
  }
  return 'unknown';
}

export function categorizeFailures(failures: Failure[]): Record<FailureCategory, Failure[]> {
  const categories: Partial<Record<FailureCategory, Failure[]>> = {};
  for (const failure of failures) {
    const cat = failure.category;
    if (!categories[cat]) categories[cat] = [];
    categories[cat]!.push(failure);
  }
  return categories as Record<FailureCategory, Failure[]>;
}

export function rankImprovementOpportunities(
  categorized: Record<FailureCategory, Failure[]>
): ImprovementPlan[] {
  const plans: ImprovementPlan[] = [];

  // Rank by frequency × severity
  const severity: Record<FailureCategory, number> = {
    missing_capability: 3,   // High impact — add capability
    bad_strategy: 3,          // High impact — fix reasoning
    weak_verification: 2,     // Medium — strengthen checks
    misunderstanding: 2,      // Medium — improve prompt
    environment_issue: 1,    // Low — infrastructure
    token_limit: 2,          // Medium — optimize context
    timeout: 1,             // Low — increase budget
    unknown: 0,
  };

  for (const [category, failures] of Object.entries(categorized)) {
    if (failures.length === 0) continue;
    const cat = category as FailureCategory;

    plans.push({
      priority: failures.length * (severity[cat] || 1),
      category: cat,
      description: `${failures.length} failure(s): ${summarizeCategory(cat)}`,
      change: buildChangeForCategory(cat, failures),
      expectedImpact: severity[cat] >= 3 ? 'high' : severity[cat] === 2 ? 'medium' : 'low',
      risk: cat === 'missing_capability' ? 'medium' : 'low',
    });
  }

  return plans.sort((a, b) => b.priority - a.priority);
}

function summarizeCategory(cat: FailureCategory): string {
  const summaries: Record<FailureCategory, string> = {
    missing_capability: 'Agent lacks required tool or skill',
    weak_verification: 'Verification checks are passing incorrect outputs',
    bad_strategy: 'Agent chooses wrong tool or execution sequence',
    misunderstanding: 'Agent misinterprets task instructions',
    environment_issue: 'Infrastructure/runtime errors',
    token_limit: 'Agent runs out of context budget',
    timeout: 'Task exceeds allowed time',
    unknown: 'Unclassified failures',
  };
  return summaries[cat];
}

function buildChangeForCategory(cat: FailureCategory, failures: Failure[]): HarnessChange {
  const descriptions = failures.slice(0, 3).map(f => f.description);

  switch (cat) {
    case 'missing_capability':
      return {
        file: 'src/skills/skill-registry.ts',
        before: '// ADD NEW SKILL HERE',
        after: `// MISSING CAPABILITY DETECTED\n// Tasks: ${failures.length}\n// Examples: ${descriptions.join('; ')}`,
        reason: `Add skill/tool for ${failures.length} missing capability failures`,
      };

    case 'bad_strategy':
      return {
        file: 'src/coordinator/coordinator.ts',
        before: '// IMPROVE STRATEGY HERE',
        after: `// BAD STRATEGY FIX\n// ${failures.length} strategy failures\n// Example: ${descriptions[0]}`,
        reason: `Improve coordinator strategy for ${failures.length} bad strategy failures`,
      };

    case 'weak_verification':
      return {
        file: 'src/mcp/verification-engine.ts',
        before: '// STRENGTHEN VERIFICATION HERE',
        after: `// WEAK VERIFICATION FIX\n// ${failures.length} weak verification failures`,
        reason: `Strengthen verification checks for ${failures.length} failures`,
      };

    case 'misunderstanding':
      return {
        file: 'src/coordinator/coordinator.ts',
        before: '// IMPROVE PROMPT HERE',
        after: `// MISUNDERSTANDING FIX\n// ${failures.length} misinterpretation failures`,
        reason: `Clarify coordinator prompt for ${failures.length} misunderstanding failures`,
      };

    case 'token_limit':
      return {
        file: 'src/tasks/InProcessTeammate.ts',
        before: '// INCREASE TOKEN BUDGET HERE',
        after: `// TOKEN LIMIT FIX\n// ${failures.length} context budget failures`,
        reason: `Increase token budget for ${failures.length} token limit failures`,
      };

    default:
      return {
        file: 'src/coordinator/coordinator.ts',
        before: '// IMPROVE HERE',
        after: `// ${cat.toUpperCase()} FIX\n// ${failures.length} failures`,
        reason: `Address ${failures.length} ${cat} failures`,
      };
  }
}

export function generateAnalysisReport(
  failures: Failure[],
  categorized: Record<FailureCategory, Failure[]>
): string {
  const lines: string[] = [];
  lines.push(`\n🔍 Failure Analysis — ${failures.length} failures\n`);
  lines.push('─'.repeat(50));

  const sorted = Object.entries(categorized)
    .map(([cat, f]) => ({ category: cat, count: f.length }))
    .sort((a, b) => b.count - a.count);

  for (const { category, count } of sorted) {
    const pct = ((count / failures.length) * 100).toFixed(1);
    const bar = '█'.repeat(Math.ceil(count / 3)).padEnd(Math.ceil(failures.length / 3), '░');
    lines.push(`  ${bar} ${category} — ${count} (${pct}%)`);
  }

  lines.push('');
  return lines.join('\n');
}
