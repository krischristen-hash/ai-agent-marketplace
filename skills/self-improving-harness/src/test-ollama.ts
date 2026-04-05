// Quick test for Ollama connectivity and skill generation
import { isOllamaReachable, listModels, callOllama } from './ollama-client.js';
import { identifyCapabilityGaps, generateSkill, validateSkill } from './skill-inventor.js';
import type { Failure } from './types.js';

async function main() {
  console.log('=== Ollama Check ===');
  const reachable = await isOllamaReachable();
  console.log('Reachable:', reachable);
  if (!reachable) {
    console.log('Ollama not running — skipping skill gen test');
    process.exit(0);
  }

  const models = await listModels();
  console.log('Models:', models.join(', '));

  console.log('\n=== Skill Generation Test ===');
  // Create a synthetic capability gap
  const fakeFailure: Failure = {
    id: 'test-1',
    taskId: 'coding/file-ops',
    category: 'missing_capability',
    description: 'No skill for batch file operations',
    timestamp: new Date().toISOString(),
    verified: true,
  };

  const gaps = identifyCapabilityGaps([fakeFailure]);
  console.log('Gaps found:', gaps.length);
  if (gaps.length > 0) {
    console.log('Top gap:', gaps[0].name, gaps[0].fileName);
    console.log('\nGenerating skill via Ollama (may take a moment)...');
    try {
      const skillDir = await generateSkill(gaps[0], '/tmp/test-skills', callOllama);
      console.log('Generated at:', skillDir);
      const validation = validateSkill(skillDir);
      console.log('Valid:', validation.valid);
      if (!validation.valid) {
        console.log('Errors:', validation.errors);
      }
    } catch (err: unknown) {
      console.log('Generation failed:', err instanceof Error ? err.message : String(err));
    }
  }

  console.log('\nDone');
}

main().catch(console.error);
