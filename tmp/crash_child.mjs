import { MemoryStore } from '../dist/core/memory/memory-store.js';

const tmpDir = process.argv[2] || './tmp_ac8';
const store = new MemoryStore(tmpDir);
await store.init();

const b1 = await store.add('fact', 'block_1_test_ac8');
const b2 = await store.add('fact', 'block_2_test_ac8');
const b3 = await store.add('fact', 'block_3_test_ac8');

console.log('ADD_RETURNED:' + [b1.id, b2.id, b3.id].join(','));

// Hold process alive — parent will SIGKILL us
// If we exit naturally before SIGKILL, the test logs a warning
await new Promise(resolve => setTimeout(resolve, 2000));
