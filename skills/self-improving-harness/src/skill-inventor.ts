// Skill Inventor — analyzes failure patterns and identifies missing capabilities
// Then generates new skills to fill those gaps using LLM

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { randomUUID } from 'crypto';
import type { Failure } from './types.js';

interface CapabilityGap {
  id: string;
  name: string;
  description: string;
  failureCount: number;
  impact: 'high' | 'medium' | 'low';
  suggestedSkillName: string;
  suggestedSkillDescription: string;
  fileName: string;
  skillDir: string;
}

export function identifyCapabilityGaps(failures: Failure[]): CapabilityGap[] {
  const gaps: CapabilityGap[] = [];
  const byCategory: Record<string, Failure[]> = {};
  for (const f of failures) {
    if (!byCategory[f.category]) byCategory[f.category] = [];
    byCategory[f.category].push(f);
  }

  for (const [category, categoryFailures] of Object.entries(byCategory)) {
    if (category !== 'missing_capability') continue;
    const byTaskPrefix = clusterByPrefix(categoryFailures);
    for (const [prefix, prefixFailures] of Object.entries(byTaskPrefix)) {
      gaps.push(buildCapabilityGap(prefix, prefixFailures));
    }
  }

  gaps.sort((a, b) => {
    const impactOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
    if (impactOrder[a.impact] !== impactOrder[b.impact]) return impactOrder[a.impact] - impactOrder[b.impact];
    return b.failureCount - a.failureCount;
  });

  return gaps;
}

function clusterByPrefix(failures: Failure[]): Record<string, Failure[]> {
  const clusters: Record<string, Failure[]> = {};
  for (const f of failures) {
    const prefix = f.taskId.split('/')[0].split('-')[0];
    const key = prefix || 'general';
    if (!clusters[key]) clusters[key] = [];
    clusters[key].push(f);
  }
  return clusters;
}

const DESCRIPTIONS: Record<string, { name: string; description: string; fileName: string }> = {
  file: { name: 'File Operations', description: 'Read, write, search, and manipulate files efficiently', fileName: 'file-ops' },
  code: { name: 'Code Analysis', description: 'Understand, debug, and refactor code across languages', fileName: 'code-analysis' },
  git: { name: 'Git Operations', description: 'Branch, merge, rebase, and resolve git conflicts', fileName: 'git-master' },
  api: { name: 'API Integration', description: 'Call REST APIs, parse JSON, handle errors gracefully', fileName: 'api-integration' },
  test: { name: 'Testing', description: 'Write and run tests, interpret results, fix failures', fileName: 'testing' },
  deploy: { name: 'Deployment', description: 'Deploy applications to cloud platforms', fileName: 'deployment' },
  data: { name: 'Data Processing', description: 'Transform, filter, and aggregate data', fileName: 'data-processing' },
  sql: { name: 'Database Queries', description: 'Write and optimize SQL queries', fileName: 'sql-query' },
  shell: { name: 'Shell Scripting', description: 'Write and debug shell scripts, manage processes', fileName: 'shell-scripting' },
  docs: { name: 'Documentation', description: 'Read and write documentation, generate READMEs', fileName: 'documentation' },
  review: { name: 'Code Review', description: 'Review code changes, suggest improvements', fileName: 'code-review' },
  search: { name: 'Search & Research', description: 'Search the web, find relevant information', fileName: 'search-research' },
  general: { name: 'General Assistance', description: 'Handle general tasks that dont fit other categories', fileName: 'general-assist' },
};

function buildCapabilityGap(prefix: string, failures: Failure[]): CapabilityGap {
  const info = DESCRIPTIONS[prefix] || DESCRIPTIONS.general;
  return {
    id: `cap-${prefix}-${randomUUID().slice(0, 8)}`,
    name: info.name,
    description: info.description,
    failureCount: failures.length,
    impact: failures.length >= 5 ? 'high' : failures.length >= 2 ? 'medium' : 'low',
    suggestedSkillName: info.name,
    suggestedSkillDescription: info.description,
    fileName: info.fileName,
    skillDir: '',
  };
}

export function skillExists(skillName: string, skillsDir: string): boolean {
  return existsSync(join(skillsDir, skillName, 'SKILL.md'));
}

export function listExistingSkills(skillsDir: string): string[] {
  if (!existsSync(skillsDir)) return [];
  try {
    return readdirSync(skillsDir).filter(f => existsSync(join(skillsDir, f, 'SKILL.md')));
  } catch { return []; }
}

function readdirSync(dir: string): string[] {
  try { return require('fs').readdirSync(dir); } catch { return []; }
}

export async function generateSkill(
  gap: CapabilityGap,
  skillsDir: string,
  llm: (prompt: string, model?: string, maxTokens?: number) => Promise<string>
): Promise<string> {
  const skillDir = join(skillsDir, gap.fileName);
  if (existsSync(join(skillDir, 'SKILL.md'))) {
    console.log(`Skill ${gap.fileName} already exists — skipping`);
    return skillDir;
  }

  mkdirSync(join(skillDir, 'src'), { recursive: true });

  // Simpler prompt — ask for SKILL.md only (not code) to keep generation fast
  const prompt = `You are Nova's skill generator. Generate ONLY a complete SKILL.md file for the following skill. No code, no explanations, just the file.

# Skill Name
${gap.suggestedSkillName}

# Description
${gap.suggestedSkillDescription}

# Format
Write a SKILL.md file with these sections:
- Header with skill name
- ## What It Does (2-3 sentences)
- ## Actions (list of actions with backtick formatting)
- ## Usage (how to use the skill)

Be specific and practical. This is for Nova (an AI assistant) to use when handling tasks related to ${gap.name}.

IMPORTANT: Return ONLY the SKILL.md content. No code blocks, no markdown fences around the whole thing. Start directly with "# SKILL.md"`;

  const generated = await llm(prompt, undefined, 800);

  // Parse SKILL.md from response (handle bare markdown, fenced, or mixed)
  const skillMd = extractMarkdown(generated, gap.fileName);
  writeFileSync(join(skillDir, 'SKILL.md'), skillMd);

  // Write placeholder src files (can be filled in later)
  writeFileSync(join(skillDir, 'src', 'index.ts'), getDefaultIndexTs(gap));
  writeFileSync(join(skillDir, 'src', 'types.ts'), getDefaultTypesTs(gap));

  console.log(`Skill "${gap.fileName}" generated at ${skillDir}`);
  return skillDir;
}

function extractMarkdown(content: string, fallbackName: string): string {
  // Already bare markdown (no fences)
  if (content.trim().startsWith('#')) {
    const trimmed = content.trim();
    if (trimmed.includes('# SKILL') || trimmed.includes('# File') || trimmed.includes('# Code')) {
      return trimmed;
    }
  }

  // Fenced blocks — try common patterns
  const patterns = [
    /```skill-md\s*\n([\s\S]*?)```/i,
    /```markdown\s*\n([\s\S]*?)```/i,
    /```\s*\n([\s\S]*?# SKILL[\s\S]*?)```/i,
    /```\s*\n([\s\S]*?# [\w\s]+[\s\S]*?)(?=\n```)/i,
  ];

  for (const p of patterns) {
    const m = content.match(p);
    if (m?.[1]?.trim()) return m[1].trim();
  }

  // Last resort
  return `# SKILL.md — ${fallbackName}\n\nPlaceholder skill generated by Nova Self-Improving Harness.`;
}

function getDefaultIndexTs(gap: CapabilityGap): string {
  return `// ${gap.name} skill — generated by Self-Improving Harness
import type { SkillConfig, ActionResult } from './types.js';

export const config: SkillConfig = {
  name: '${gap.fileName}',
  version: '1.0.0',
  description: '${gap.suggestedSkillDescription}',
};

export async function handleAction(
  action: string,
  _params: Record<string, unknown>
): Promise<ActionResult> {
  switch (action) {
    default:
      return { success: false, error: \`Unknown action: \${action}\` };
  }
}
`;
}

function getDefaultTypesTs(_gap: CapabilityGap): string {
  return `// Types for skill
export interface SkillConfig {
  name: string;
  version: string;
  description: string;
}

export interface ActionResult {
  success: boolean;
  data?: unknown;
  error?: string;
}
`;
}

export function validateSkill(skillDir: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!existsSync(join(skillDir, 'SKILL.md'))) errors.push('SKILL.md not found');
  if (!existsSync(join(skillDir, 'src', 'index.ts'))) errors.push('src/index.ts not found');
  if (!existsSync(join(skillDir, 'src', 'types.ts'))) errors.push('src/types.ts not found');
  return { valid: errors.length === 0, errors };
}
