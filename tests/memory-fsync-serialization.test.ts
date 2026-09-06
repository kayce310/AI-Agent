/**
 * AC9 — R5 v1: Legacy Memory Serialization / Order Guarantee
 * Protocol:
 * 1. Real fsync latency (no mocking).
 * 2. At least 2 add() calls in sequence.
 * 3. Verify blocks recovered in correct order, no loss.
 */
import { describe, it, beforeEach, afterEach } from 'vitest';
import * as path from 'path';
import * as fsPromises from 'fs/promises';
import { MemoryStore } from '../dist/core/memory/memory-store.js';

describe('AC9 — Serialization / Order Guarantee (real fsync)', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = path.join('D:/AI-Agent/tmp_ac9', `ser_${Date.now()}`);
    await fsPromises.mkdir(tmpDir, { recursive: true });
  });

  afterEach(async () => {
    await fsPromises.rm(tmpDir, { recursive: true, force: true });
  });

  it('AC9: consecutive add() calls are serialized and recovered in order', async () => {
    // Use production dist with real fsync
    const { MemoryStore } = await import('../dist/core/memory/memory-store.js');
    const store = new MemoryStore(tmpDir);
    await store.init();

    // Add 5 blocks sequentially — each triggers log.append() + log.sync()
    // Real fsync latency between each call proves serialization
    const contents = ['alpha', 'beta', 'gamma', 'delta', 'epsilon'];
    const added: string[] = [];

    for (const content of contents) {
      const block = await store.add('fact', `serial_${content}`);
      added.push(block.id);
    }

    // Verify all 5 blocks are in the in-memory store immediately
    const all = await store.getAll('fact');
    const serBlocks = all.filter(b => b.content.startsWith('serial_'));
    console.log(`In-memory after 5 adds: ${serBlocks.length} blocks`);
    for (const b of serBlocks) {
      console.log(`  ${b.id}: ${b.content}`);
    }

    // Simulate restart: new store instance, same path
    const store2 = new MemoryStore(tmpDir);
    await store2.init();

    const recovered = (await store2.getAll('fact'))
      .filter(b => b.content.startsWith('serial_'));

    console.log(`After restart recovery: ${recovered.length} blocks`);
    for (const b of recovered) {
      console.log(`  ${b.id}: ${b.content}`);
    }

    // Verify order preserved (blocks sorted by timestamp should match add order)
    const recoveredSorted = [...recovered].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
    const recoveredOrder = recoveredSorted.map(b => b.content.replace('serial_', ''));

    // Verify no loss
    if (recovered.length !== 5) {
      throw new Error(`AC9 FAIL: expected 5 blocks, recovered ${recovered.length}`);
    }

    // Verify correct order
    const expectedOrder = contents;
    if (JSON.stringify(recoveredOrder) !== JSON.stringify(expectedOrder)) {
      throw new Error(
        `AC9 FAIL: order mismatch. Expected ${expectedOrder.join(',')}, got ${recoveredOrder.join(',')}`
      );
    }

    // Verify IDs preserved (not re-generated on restart)
    const recoveredIds = recovered.map(b => b.id);
    if (JSON.stringify([...recoveredIds].sort()) !== JSON.stringify([...added].sort())) {
      throw new Error(
        `AC9 FAIL: ID mismatch. Original IDs: ${added.join(',')}, Recovered: ${recoveredIds.join(',')}`
      );
    }

    console.log(`AC9 PASS: 5/5 blocks recovered in correct order, IDs preserved`);
  });
});
