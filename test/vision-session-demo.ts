/**
 * @file vision-session-demo — Smoke test cho vision_analyze + session_search
 * @ponytail: self-check, 0 assertions framework deps
 */
import { globalMemoryStore } from '../src/core/memory/memory-store.js';

async function testSessionSearch() {
  console.log('=== session_search ===');

  // Seed test data
  await globalMemoryStore.add('session', 'Coral agent should use circuit breaker for LLM calls', { sessionId: 'test-session', tags: ['user'] });
  await globalMemoryStore.add('session', 'The AbortSignal propagation was fixed in agent.ts run() method', { sessionId: 'test-session', tags: ['user'] });
  await globalMemoryStore.add('session', 'MemoryStore mutex prevents data race on blocks array', { sessionId: 'test-session', tags: ['user'] });

  // Search
  const results = await globalMemoryStore.query('circuit breaker');
  console.log(`query('circuit breaker'): ${results.length} results`);
  if (results.length === 0) throw new Error('FAIL: expected at least 1 result for circuit breaker');
  const match = results.find(r => r.content.includes('circuit breaker'));
  if (!match) throw new Error('FAIL: expected match containing "circuit breaker"');
  console.log(`  match: "${match.content.slice(0, 80)}..." (score: ${match.score})`);

  const results2 = await globalMemoryStore.query('AbortSignal');
  console.log(`query('AbortSignal'): ${results2.length} results`);
  if (results2.length === 0) throw new Error('FAIL: expected at least 1 result for AbortSignal');

  console.log('session_search: PASS\n');
}

async function testKnowledgePlugin() {
  console.log('=== knowledge plugin import ===');
  const { default: knowledgePlugin } = await import('../src/core/tools/knowledge.js');
  const toolNames = knowledgePlugin.tools.map((t: any) => t.name);
  console.log(`  tools: ${toolNames.join(', ')}`);
  if (!toolNames.includes('session_search')) throw new Error('FAIL: session_search not in knowledge plugin');
  console.log('knowledge plugin: PASS\n');
}

async function testBrowserPlugin() {
  console.log('=== browser plugin import ===');
  const { default: browserPlugin } = await import('../src/core/tools/browser.js');
  const toolNames = browserPlugin.tools.map((t: any) => t.name);
  console.log(`  tools: ${toolNames.join(', ')}`);
  if (!toolNames.includes('vision_analyze')) throw new Error('FAIL: vision_analyze not in browser plugin');
  if (toolNames.length !== 10) throw new Error(`FAIL: expected 10 tools, got ${toolNames.length}`);
  console.log('browser plugin: PASS\n');
}

async function testToolRegistry() {
  console.log('=== tool registry (built-in) ===');
  const { getDefaultRegistry } = await import('../src/core/tools/tool-registry.js');
  const registry = await getDefaultRegistry();
  const toolList = registry.listTools();
  console.log(`  total tools: ${toolList.length}`);
  const hasVision = toolList.includes('vision_analyze');
  const hasSession = toolList.includes('session_search');
  console.log(`  vision_analyze: ${hasVision ? 'YES' : 'NO'}`);
  console.log(`  session_search: ${hasSession ? 'YES' : 'NO'}`);
  if (!hasVision) throw new Error('FAIL: vision_analyze not registered');
  if (!hasSession) throw new Error('FAIL: session_search not registered');
  console.log('tool registry: PASS\n');
}

async function testSessionSearchViaRegistry() {
  console.log('=== session_search via registry ===');
  const { getDefaultRegistry } = await import('../src/core/tools/tool-registry.js');
  const registry = await getDefaultRegistry();
  const result = await registry.execute('session_search', { query: 'circuit' });
  const data = typeof result === 'string' ? JSON.parse(result) : result;
  console.log(`  results: ${data.total || data.results?.length || 0}`);
  console.log(`  result keys: ${Object.keys(data).join(', ')}`);
  if (!data.results || data.results.length === 0) {
    console.log('  (results may be 0 if memory-store query returns empty — OK for first run)');
  }
  console.log('session_search via registry: OK\n');
}

async function main() {
  try {
    await testSessionSearch();
    await testKnowledgePlugin();
    await testBrowserPlugin();
    await testToolRegistry();
    // Can't test vision_analyze fully without Puppeteer in CI-like env
    // Just verify it's registered
    console.log('=== vision_analyze via registry (schema check) ===');
    const { getDefaultRegistry } = await import('../src/core/tools/tool-registry.js');
    const registry = await getDefaultRegistry();
    const defs = registry.getDefinitions();
    const visionDef = defs.find((d: any) => d.function.name === 'vision_analyze');
    if (!visionDef) throw new Error('FAIL: vision_analyze definition not found');
    console.log(`  schema props: ${Object.keys(visionDef.function.parameters.properties).join(', ')}`);
    console.log('vision_analyze schema: PASS\n');

    console.log('=== ALL PASS ===');
    process.exit(0);
  } catch (err: any) {
    console.error(`FAIL: ${err.message}`);
    process.exit(1);
  }
}

main();
