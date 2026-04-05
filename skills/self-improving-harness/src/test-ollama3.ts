import { callOllama } from './ollama-client.js';
import type { Failure } from './types.js';
import { identifyCapabilityGaps } from './skill-inventor.js';

async function main() {
  const fakeFailure: Failure = {
    id: 'test-1',
    taskId: 'coding/file-ops',
    category: 'missing_capability',
    description: 'No skill for batch file operations',
    timestamp: new Date().toISOString(),
    verified: true,
  };

  const gaps = identifyCapabilityGaps([fakeFailure]);
  console.log('Gap:', gaps[0].name, gaps[0].fileName, gaps[0].description);

  // Test with a simpler prompt
  const simplePrompt = `You are Nova's skill generator. Generate a complete OpenClaw skill.

Skill name: file-ops
Description: Read, write, search, and manipulate files efficiently

Return ONLY a SKILL.md file with this exact format (no other text):
---
# SKILL.md — File Operations

## What It Does
Handles file operations for Nova.

## Actions
- \`read\`: Read a file
- \`write\`: Write to a file
\`\`\`
技能的名字是 file-ops.
`;

  const result = await callOllama(simplePrompt, 'nemotron-3-super:cloud', 500);
  console.log('\nSimple prompt response:');
  console.log(result);
  console.log('\n---END---');
}

main().catch(console.error);
