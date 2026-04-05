import { callOllama } from './ollama-client.js';

async function main() {
  const result = await callOllama(
    'Return ONLY the word: HELLO',
    'nemotron-3-super:cloud',
    50
  );
  console.log('Response length:', result.length);
  console.log('Response:', JSON.stringify(result.slice(0, 300)));
}

main().catch(console.error);
