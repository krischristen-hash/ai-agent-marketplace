// Harness Editor — reads and writes Nova's harness files
// Edits: coordinator prompt, skill registry, tool configs, orchestration logic

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { execSync } from 'child_process';
import { join } from 'path';
import type { HarnessChange, HarnessSnapshot, HarnessTarget } from './types.js';

const PLATFORM_ROOT = '/Users/krischristen/NovaPlatform';

const HARNESS_FILES: Record<HarnessTarget, { primary: string; secondary?: string[] }> = {
  coordinator: {
    primary: `${PLATFORM_ROOT}/src/coordinator/coordinator.ts`,
    secondary: [
      `${PLATFORM_ROOT}/src/coordinator/task-master.ts`,
      `${PLATFORM_ROOT}/src/workflows/coder-workflow.ts`,
    ],
  },
  skills: {
    primary: `${PLATFORM_ROOT}/src/skills/skill-registry.ts`,
    secondary: [`${PLATFORM_ROOT}/skill/SKILL.md`],
  },
  tools: {
    primary: `${PLATFORM_ROOT}/src/mcp/mcp-client.ts`,
    secondary: [
      `${PLATFORM_ROOT}/src/mcp/server-manager.ts`,
      `${PLATFORM_ROOT}/src/mcp/verification-engine.ts`,
    ],
  },
  orchestration: {
    primary: `${PLATFORM_ROOT}/src/tasks/InProcessTeammate.ts`,
    secondary: [
      `${PLATFORM_ROOT}/src/tasks/tool-calling-loop.ts`,
      `${PLATFORM_ROOT}/src/messaging/mailbox.ts`,
    ],
  },
};

export class HarnessEditor {
  private root: string;

  constructor(root: string = PLATFORM_ROOT) {
    this.root = root;
  }

  /** Get current git commit hash */
  getCurrentCommit(): string {
    if (!existsSync(join(this.root, '.git'))) return 'no-git';
    try {
      return execSync('git rev-parse --short HEAD', {
        cwd: this.root,
        stdio: ['ignore', 'pipe', 'ignore'],
      }).toString().trim();
    } catch {
      return 'no-git';
    }
  }

  /** Get list of changed files since last commit */
  getChangedFiles(): string[] {
    if (!existsSync(join(this.root, '.git'))) return [];
    try {
      const out = execSync('git diff --name-only HEAD', {
        cwd: this.root,
        stdio: ['ignore', 'pipe', 'ignore'],
      }).toString().trim();
      return out ? out.split('\n') : [];
    } catch {
      return [];
    }
  }

  /** Snapshot current harness state */
  snapshot(): HarnessSnapshot {
    const hasGit = existsSync(join(this.root, '.git'));
    return {
      commit: hasGit ? this.getCurrentCommit() : 'no-git',
      timestamp: new Date().toISOString(),
      coordinatorPrompt: this.readFile(HARNESS_FILES.coordinator.primary),
      skillRegistry: this.readFile(HARNESS_FILES.skills.primary),
      tools: [
        this.readFile(HARNESS_FILES.tools.primary),
        this.readFile(`${PLATFORM_ROOT}/src/mcp/server-manager.ts`),
      ],
    };
  }

  /** Save a snapshot to disk (for rollback) */
  saveSnapshot(snap: HarnessSnapshot, label: string): void {
    const dir = join(this.root, '.harness-snapshots');
    try {
      mkdirSync(dir, { recursive: true });
    } catch { /* ignore */ }
    const path = join(dir, `${label}--${snap.commit}.json`);
    try {
      writeFileSync(path, JSON.stringify(snap, null, 2));
    } catch { /* ignore — non-critical */ }
  }

  /** Restore from a saved snapshot */
  restoreSnapshot(snap: HarnessSnapshot): void {
    if (snap.commit === 'no-git' || !existsSync(join(this.root, '.git'))) {
      console.log('restoreSnapshot: no-git env, skipping restore');
      return;
    }
    const files = [
      HARNESS_FILES.coordinator.primary,
      HARNESS_FILES.skills.primary,
      HARNESS_FILES.tools.primary,
    ];
    for (const file of files) {
      if (existsSync(file)) {
        try {
          execSync(`git checkout ${snap.commit} -- "${file}"`, { cwd: this.root });
        } catch { /* ignore individual file failures */ }
      }
    }
  }

  /** Apply a harness change to the correct file */
  applyChange(change: HarnessChange): boolean {
    const file = change.file;
    if (!existsSync(file)) {
      console.error(`HarnessEditor: file not found: ${file}`);
      return false;
    }

    const content = this.readFile(file);
    const anchor = change.before;

    if (!content.includes(anchor)) {
      // Try fuzzy match
      const fuzzy = this.fuzzyFind(anchor, content);
      if (!fuzzy) {
        console.error(`HarnessEditor: could not find anchor text in ${file}`);
        console.error(`Looking for: ${anchor.slice(0, 80)}...`);
        return false;
      }
      const newContent = content.replace(fuzzy, change.after);
      this.writeFile(file, newContent);
    } else {
      const newContent = content.replace(anchor, change.after);
      this.writeFile(file, newContent);
    }

    return true;
  }

  /** Commit current state with a message */
  commit(message: string): string {
    if (!existsSync(join(this.root, '.git'))) {
      console.log('HarnessEditor: not a git repo, skipping commit');
      return this.getCurrentCommit();
    }
    try {
      execSync('git add -A', { cwd: this.root, stdio: ['ignore', 'pipe', 'ignore'] });
      execSync(`git commit -m "${message.replace(/"/g, '\\"')}"`, { cwd: this.root });
      return this.getCurrentCommit();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes('nothing to commit')) return this.getCurrentCommit();
      throw e;
    }
  }

  /** Revert last n commits */
  revertLast(n = 1): void {
    if (!existsSync(join(this.root, '.git'))) return;
    try {
      execSync(`git reset --hard HEAD~${n}`, { cwd: this.root });
    } catch { /* ignore */ }
  }

  /** Get file content for a target */
  getHarnessContent(target: HarnessTarget): string {
    const files = HARNESS_FILES[target];
    const parts: string[] = [];
    if (files.primary && existsSync(files.primary)) {
      parts.push(`// === ${files.primary} ===\n${this.readFile(files.primary)}`);
    }
    if (files.secondary) {
      for (const f of files.secondary) {
        if (existsSync(f)) {
          parts.push(`// === ${f} ===\n${this.readFile(f)}`);
        }
      }
    }
    return parts.join('\n\n');
  }

  /** Find a plausible edit location in content */
  private fuzzyFind(anchor: string, content: string): string | null {
    const lines = anchor.split('\n');
    if (lines.length < 2) return null;
    const contentLines = content.split('\n');
    const firstLine = lines[0].trim();

    for (let i = 0; i < contentLines.length; i++) {
      if (contentLines[i].trim() !== firstLine) continue;
      let match = true;
      for (let j = 1; j < Math.min(lines.length, 8); j++) {
        if (contentLines[i + j]?.trim() !== lines[j].trim()) {
          match = false;
          break;
        }
      }
      if (match) {
        return contentLines.slice(i, i + lines.length).join('\n');
      }
    }
    return null;
  }

  private readFile(path: string): string {
    try {
      return readFileSync(path, 'utf-8');
    } catch {
      return `// File not found: ${path}`;
    }
  }

  private writeFile(path: string, content: string): void {
    writeFileSync(path, content, 'utf-8');
  }
}

export const defaultEditor = new HarnessEditor();
