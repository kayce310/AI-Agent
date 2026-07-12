import { globalMemoryStore } from '../dist/core/memory/memory-store.js';

async function main() {
  console.log('=== Concurrent MemoryStore test ===');
  const N = 5;
  const start = Date.now();

  const promises = [];
  for (let i = 0; i < N; i++) {
    promises.push(
      globalMemoryStore.add('test', `concurrent-message-${i}`, {
        sessionId: `test-session`,
        tags: ['test']
      })
    );
  }
  
  const blocks = await Promise.all(promises);
  const elapsed = Date.now() - start;

  console.log(`Sent ${N} concurrent messages`);
  console.log(`All resolved in ${elapsed}ms`);
  console.log(`Blocks received: ${blocks.length}`);
  
  // Verify all were stored
  const all = await globalMemoryStore.getAll();
  const recent = all.filter(b => b.tags?.includes('test'));
  console.log(`Recent test blocks in store: ${recent.length}`);
  
  // Heap report
  const heap = process.memoryUsage();
  console.log(`Heap used: ${(heap.heapUsed / 1024 / 1024).toFixed(2)} MB`);
  console.log(`Heap total: ${(heap.heapTotal / 1024 / 1024).toFixed(2)} MB`);
  
  console.log('=== No deadlock — all 5 completed ===');
}

main().catch(e => {
  console.error('TEST FAILED:', e);
  process.exit(1);
});
