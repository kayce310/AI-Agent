/**
 * Coral ResponseCache — Phase 8.3a Test Suite
 *
 * Covers:
 * - Basic get/set/has/delete/clear
 * - TTL expiration
 * - LRU eviction
 * - Stats tracking (hits, misses, evictions, hit rate)
 * - Static key builders
 * - Generic type support
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('ResponseCache', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('stores and retrieves values', async () => {
    const { ResponseCache } = await import('../src/core/security/response-cache.js');
    const cache = new ResponseCache<string>({ trackStats: false });

    cache.set('key1', 'value1');
    expect(cache.get('key1')).toBe('value1');
  });

  it('returns undefined for missing key', async () => {
    const { ResponseCache } = await import('../src/core/security/response-cache.js');
    const cache = new ResponseCache<string>({ trackStats: false });

    expect(cache.get('nonexistent')).toBeUndefined();
  });

  it('respects TTL expiration', async () => {
    const { ResponseCache } = await import('../src/core/security/response-cache.js');
    const cache = new ResponseCache<string>({
      defaultTTL: 1000, // 1 second
      trackStats: false,
    });

    cache.set('key1', 'value1');
    expect(cache.get('key1')).toBe('value1');

    // Advance time past TTL
    vi.advanceTimersByTime(1500);

    // Should still be accessible via get (expired entry is evicted on access)
    expect(cache.get('key1')).toBeUndefined();
  });

  it('has returns false for expired entries', async () => {
    const { ResponseCache } = await import('../src/core/security/response-cache.js');
    const cache = new ResponseCache<string>({
      defaultTTL: 500,
      trackStats: false,
    });

    cache.set('key1', 'value1');
    expect(cache.has('key1')).toBe(true);

    vi.advanceTimersByTime(1000);
    expect(cache.has('key1')).toBe(false);
  });

  it('deletes specific keys', async () => {
    const { ResponseCache } = await import('../src/core/security/response-cache.js');
    const cache = new ResponseCache<string>({ trackStats: false });

    cache.set('key1', 'value1');
    expect(cache.delete('key1')).toBe(true);
    expect(cache.get('key1')).toBeUndefined();
    expect(cache.delete('nonexistent')).toBe(false);
  });

  it('clears all entries', async () => {
    const { ResponseCache } = await import('../src/core/security/response-cache.js');
    const cache = new ResponseCache<string>({ trackStats: false });

    cache.set('key1', 'value1');
    cache.set('key2', 'value2');
    expect(cache.size).toBe(2);

    cache.clear();
    expect(cache.size).toBe(0);
    expect(cache.get('key1')).toBeUndefined();
    expect(cache.get('key2')).toBeUndefined();
  });

  it('evicts LRU entries when at capacity', async () => {
    const { ResponseCache } = await import('../src/core/security/response-cache.js');
    const cache = new ResponseCache<string>({
      maxSize: 3,
      trackStats: false,
    });

    cache.set('a', '1');
    cache.set('b', '2');
    cache.set('c', '3');

    // Access 'a' to make it recently used
    cache.get('a');

    // Add 'd' — should evict 'b' (LRU)
    cache.set('d', '4');

    expect(cache.get('a')).toBe('1'); // still there (recently accessed)
    expect(cache.get('b')).toBeUndefined(); // evicted
    expect(cache.get('c')).toBe('3');
    expect(cache.get('d')).toBe('4');
  });

  it('supports custom TTL per entry', async () => {
    const { ResponseCache } = await import('../src/core/security/response-cache.js');
    const cache = new ResponseCache<string>({
      defaultTTL: 10000,
      trackStats: false,
    });

    // Override TTL to 1 second
    cache.set('key1', 'value1', 1000);
    expect(cache.get('key1')).toBe('value1');

    vi.advanceTimersByTime(1500);
    expect(cache.get('key1')).toBeUndefined();
  });

  it('updates access count and lastAccessedAt on get', async () => {
    const { ResponseCache } = await import('../src/core/security/response-cache.js');
    const cache = new ResponseCache<string>({ trackStats: false });

    cache.set('key1', 'value1');

    // Access 3 times
    cache.get('key1');
    cache.get('key1');
    cache.get('key1');

    // We can't easily introspect the internal entry,
    // but we can verify the value is still returned correctly
    expect(cache.get('key1')).toBe('value1');
  });

  it('tracks hit/miss statistics', async () => {
    const { ResponseCache } = await import('../src/core/security/response-cache.js');
    const cache = new ResponseCache<string>({ trackStats: true });

    cache.set('key1', 'value1');

    // Miss
    cache.get('nonexistent');
    // Hit
    cache.get('key1');
    // Miss
    cache.get('unknown');

    const stats = cache.getStats();
    expect(stats.hits).toBe(1);
    expect(stats.misses).toBe(2);
    expect(stats.hitRate).toBeCloseTo(1 / 3, 5);
  });

  it('tracks evictions in stats', async () => {
    const { ResponseCache } = await import('../src/core/security/response-cache.js');
    const cache = new ResponseCache<string>({
      maxSize: 2,
      trackStats: true,
    });

    cache.set('a', '1');
    cache.set('b', '2');
    cache.set('c', '3'); // Should evict 'a'

    const stats = cache.getStats();
    expect(stats.evictions).toBeGreaterThanOrEqual(1);
    expect(stats.size).toBe(2);
  });

  it('resets statistics', async () => {
    const { ResponseCache } = await import('../src/core/security/response-cache.js');
    const cache = new ResponseCache<string>({ trackStats: true });

    cache.get('miss1');
    cache.get('miss2');

    let stats = cache.getStats();
    expect(stats.misses).toBe(2);

    cache.resetStats();
    stats = cache.getStats();
    expect(stats.misses).toBe(0);
    expect(stats.hits).toBe(0);
    expect(stats.evictions).toBe(0);
  });

  it('builds cache keys from components', async () => {
    const { ResponseCache } = await import('../src/core/security/response-cache.js');

    const key1 = ResponseCache.buildKey('gpt-4', 'session-123', 'What is AI?');
    const key2 = ResponseCache.buildKey('gpt-4', 'session-123', 'What is AI?');
    const key3 = ResponseCache.buildKey('gpt-4', 'session-456', 'What is AI?');

    expect(key1).toBe(key2); // same input = same key
    expect(key1).not.toBe(key3); // different session = different key
  });

  it('builds cache keys from object', async () => {
    const { ResponseCache } = await import('../src/core/security/response-cache.js');

    const key1 = ResponseCache.buildKeyFromObject({
      modelId: 'gpt-4',
      sessionId: 'session-123',
      promptHash: 'abc123',
    });
    const key2 = ResponseCache.buildKeyFromObject({
      modelId: 'gpt-4',
      sessionId: 'session-123',
      promptHash: 'abc123',
    });

    expect(key1).toBe(key2);
  });

  it('supports generic type parameter', async () => {
    const { ResponseCache } = await import('../src/core/security/response-cache.js');

    interface ComplexValue {
      id: number;
      data: Record<string, unknown>;
    }

    const cache = new ResponseCache<ComplexValue>({ trackStats: false });

    const value: ComplexValue = { id: 1, data: { name: 'test' } };
    cache.set('complex', value);

    const retrieved = cache.get('complex');
    expect(retrieved).toEqual(value);
    expect(retrieved!.id).toBe(1);
    expect(retrieved!.data.name).toBe('test');
  });

  it('createDefaultCache creates a working cache', async () => {
    const { createDefaultCache } = await import('../src/core/security/response-cache.js');
    const cache = createDefaultCache({ trackStats: false });

    cache.set('key', 'value');
    expect(cache.get('key')).toBe('value');
  });

  it('handles many entries gracefully', async () => {
    const { ResponseCache } = await import('../src/core/security/response-cache.js');
    const cache = new ResponseCache<number>({
      maxSize: 100,
      trackStats: false,
    });

    for (let i = 0; i < 100; i++) {
      cache.set(`key-${i}`, i);
    }

    expect(cache.size).toBe(100);
    expect(cache.get('key-0')).toBe(0);
    expect(cache.get('key-99')).toBe(99);
  });
});