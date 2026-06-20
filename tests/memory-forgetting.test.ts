/**
 * @file MemoryStore Forgetting Strategy Tests (Phase 2)
 * @layer tests
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import MemoryStore from '../src/core/memory/memory-store.js';

describe('MemoryStore — Forgetting Strategy', () => {
  it('should add memory with TTL', async () => {
    const store = new MemoryStore(`./.test-memory/${Date.now()}_1`);
    const block = await store.add('human', 'test memory', {
      tags: ['test'],
      ttl: 60000,
    });
    expect(block.ttl).toBe(60000);
    expect(block.expiresAt).toBeDefined();
  });

  it('should add memory with importance score', async () => {
    const store = new MemoryStore(`./.test-memory/${Date.now()}_2`);
    const block = await store.add('persona', 'important fact', {
      tags: ['test'],
      importance: 0.9,
    });
    expect(block.importance).toBe(0.9);
  });

  it('should treat block without TTL as non-expiring', async () => {
    const store = new MemoryStore(`./.test-memory/${Date.now()}_3`);
    const block = await store.add('human', 'permanent', {
      tags: ['test'],
    });
    expect(block.ttl).toBeUndefined();
    expect(block.expiresAt).toBeUndefined();
  });

  it('should return only active blocks', async () => {
    const store = new MemoryStore(`./.test-memory/${Date.now()}_4`);
    await store.add('human', 'permanent', { tags: ['test'] });
    await store.add('human', 'expired', { tags: ['test'], ttl: -60000 });

    const active = await store.getActive();
    expect(active.some((b: any) => b.content === 'permanent')).toBe(true);
    expect(active.some((b: any) => b.content === 'expired')).toBe(false);
  });

  it('should cleanup expired blocks', async () => {
    const store = new MemoryStore(`./.test-memory/${Date.now()}_5`);
    const b1 = await store.add('human', 'permanent', { tags: ['test'] });
    const b2 = await store.add('human', 'expired', { tags: ['test'], ttl: -60000 });

    expect(b1.expiresAt).toBeUndefined();

    const removed = await store.cleanupExpired();
    expect(removed).toBe(1);

    const all = await store.getAll();
    expect(all.length).toBe(1);
    expect(all[0].content).toBe('permanent');
  });

  it('should keep blocks with future TTL', async () => {
    const store = new MemoryStore(`./.test-memory/${Date.now()}_6`);
    await store.add('human', 'future', { tags: ['test'], ttl: 60000 });

    const removed = await store.cleanupExpired();
    expect(removed).toBe(0);
  });
});
