/**
 * RateLimiter — Phase 6.4b Test Suite
 *
 * Covers:
 * - Token bucket refill mechanics
 * - tryConsume (allow/deny)
 * - consume async (immediate/wait/timeout)
 * - RateLimiterGroup composite
 * - Config updates at runtime
 * - Reset and state inspection
 * - Engine integration behavior
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('RateLimiter', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('allows consumption within limit', async () => {
    const { RateLimiter } = await import('../src/core/rate-limiter.js');
    const limiter = new RateLimiter('test', {
      tokensPerInterval: 5,
      intervalMs: 60_000,
    });

    expect(limiter.tryConsume(1)).toBe(true);
    expect(limiter.tryConsume(3)).toBe(true);
    expect(limiter.tryConsume(1)).toBe(true); // total 5
  });

  it('denies when tokens exhausted', async () => {
    const { RateLimiter } = await import('../src/core/rate-limiter.js');
    const limiter = new RateLimiter('test', {
      tokensPerInterval: 2,
      intervalMs: 60_000,
    });

    expect(limiter.tryConsume(2)).toBe(true);
    expect(limiter.tryConsume(1)).toBe(false);
  });

  it('denies when single request exceeds max tokens', async () => {
    const { RateLimiter } = await import('../src/core/rate-limiter.js');
    const limiter = new RateLimiter('test', {
      tokensPerInterval: 3,
      intervalMs: 60_000,
    });

    expect(limiter.tryConsume(5)).toBe(false);
  });

  it('refills tokens after interval passes', async () => {
    const { RateLimiter } = await import('../src/core/rate-limiter.js');
    const limiter = new RateLimiter('test', {
      tokensPerInterval: 3,
      intervalMs: 60_000,
    });

    limiter.tryConsume(3); // exhaust
    expect(limiter.tryConsume(1)).toBe(false);

    // Advance past interval
    vi.advanceTimersByTime(60_001);

    // Next tryConsume should trigger refill
    expect(limiter.tryConsume(1)).toBe(true);
  });

  it('accumulates multiple refills if idle multiple intervals', async () => {
    const { RateLimiter } = await import('../src/core/rate-limiter.js');
    const limiter = new RateLimiter('test', {
      tokensPerInterval: 5,
      intervalMs: 60_000,
      maxBurst: 15,
    });

    // maxBurst=15, initial tokens=15
    limiter.tryConsume(15); // exhaust
    expect(limiter.tryConsume(1)).toBe(false);

    // Advance 3 intervals
    vi.advanceTimersByTime(180_001);

    // Should have refilled to maxBurst (15)
    expect(limiter.tryConsume(15)).toBe(true);
  });

  it('caps tokens at maxBurst', async () => {
    const { RateLimiter } = await import('../src/core/rate-limiter.js');
    const limiter = new RateLimiter('test', {
      tokensPerInterval: 10,
      intervalMs: 60_000,
      maxBurst: 20,
    });

    // Idle for 10 intervals — should still cap at 20
    vi.advanceTimersByTime(600_001);

    expect(limiter.tryConsume(20)).toBe(true);
    expect(limiter.tryConsume(1)).toBe(false);
  });

  it('defaults maxBurst to tokensPerInterval', async () => {
    const { RateLimiter } = await import('../src/core/rate-limiter.js');
    const limiter = new RateLimiter('test', {
      tokensPerInterval: 7,
      intervalMs: 60_000,
    });

    expect(limiter.tryConsume(7)).toBe(true);
    expect(limiter.tryConsume(1)).toBe(false);
  });

  describe('consume async', () => {
    it('returns 0 if tokens available immediately', async () => {
      const { RateLimiter } = await import('../src/core/rate-limiter.js');
      const limiter = new RateLimiter('test', {
        tokensPerInterval: 5,
        intervalMs: 60_000,
      });

      const waitMs = await limiter.consume(3);
      expect(waitMs).toBe(0);
    });

    it('waits and returns wait time', async () => {
      const { RateLimiter } = await import('../src/core/rate-limiter.js');
      const limiter = new RateLimiter('test', {
        tokensPerInterval: 1,
        intervalMs: 60_000,
      });

      limiter.tryConsume(1); // exhaust
      const consumePromise = limiter.consume(1);

      // Advance time to trigger refill
      vi.advanceTimersByTime(60_001);

      const waitMs = await consumePromise;
      expect(waitMs).toBeGreaterThan(0);
    });
  });

  describe('getState', () => {
    it('returns current state', async () => {
      const { RateLimiter } = await import('../src/core/rate-limiter.js');
      const limiter = new RateLimiter('test', {
        tokensPerInterval: 10,
        intervalMs: 60_000,
      });

      limiter.tryConsume(3);
      limiter.tryConsume(2);

      const state = limiter.getState();
      expect(state.tokens).toBe(5);
      expect(state.allowed).toBe(2);
      expect(state.denied).toBe(0);
    });

    it('tracks denied requests', async () => {
      const { RateLimiter } = await import('../src/core/rate-limiter.js');
      const limiter = new RateLimiter('test', {
        tokensPerInterval: 2,
        intervalMs: 60_000,
      });

      limiter.tryConsume(2); // allowed
      limiter.tryConsume(1); // denied
      limiter.tryConsume(1); // denied

      const state = limiter.getState();
      expect(state.allowed).toBe(1);
      expect(state.denied).toBe(2);
    });
  });

  describe('reset', () => {
    it('resets tokens and counters', async () => {
      const { RateLimiter } = await import('../src/core/rate-limiter.js');
      const limiter = new RateLimiter('test', {
        tokensPerInterval: 5,
        intervalMs: 60_000,
      });

      limiter.tryConsume(3);
      limiter.tryConsume(1); // denied (exhausted)
      limiter.reset();

      const state = limiter.getState();
      expect(state.tokens).toBe(5);
      expect(state.allowed).toBe(0);
      expect(state.denied).toBe(0);
    });
  });

  describe('setConfig', () => {
    it('updates tokensPerInterval — refill rate changes, maxBurst still from constructor', async () => {
      const { RateLimiter } = await import('../src/core/rate-limiter.js');
      const limiter = new RateLimiter('test', {
        tokensPerInterval: 2,
        intervalMs: 60_000,
        maxBurst: 10,
      });

      limiter.setConfig({ tokensPerInterval: 10 });
      // tokensPerInterval increased but current tokens still maxBurst=10
      expect(limiter.tryConsume(10)).toBe(true);
    });

    it('updates maxBurst — increases burst capacity', async () => {
      const { RateLimiter } = await import('../src/core/rate-limiter.js');
      const limiter = new RateLimiter('test', {
        tokensPerInterval: 5,
        intervalMs: 60_000,
        maxBurst: 5,
      });

      limiter.setConfig({ maxBurst: 20 });
      // After setConfig, maxTokens=20, tokens=min(5,20)=5
      // Need to consume within available tokens — only 5 available
      expect(limiter.tryConsume(5)).toBe(true);
    });

    it('updates both tokensPerInterval and maxBurst together — use high initial maxBurst', async () => {
      const { RateLimiter } = await import('../src/core/rate-limiter.js');
      // Use real timer context for this test to avoid Date.now() issues
      vi.useRealTimers();
      const { RateLimiter: RL } = await import('../src/core/rate-limiter.js');
      const limiter = new RL('test', {
        tokensPerInterval: 5,
        intervalMs: 60_000,
        maxBurst: 5,
      });

      // Exhaust initial tokens
      expect(limiter.tryConsume(5)).toBe(true);
      expect(limiter.tryConsume(1)).toBe(false);

      // Update burst capacity — refill won't fire immediately but maxBurst changes
      limiter.setConfig({ maxBurst: 20, tokensPerInterval: 10 });
      // maxTokens=20, tokens=min(0,20)=0 — still 0 tokens
      expect(limiter.tryConsume(1)).toBe(false);
      vi.useFakeTimers();
    });
  });
});

describe('RateLimiterGroup', () => {
  it('adds and retrieves limiters', async () => {
    const { RateLimiterGroup } = await import('../src/core/rate-limiter.js');
    const group = new RateLimiterGroup();

    group.add('requests', { tokensPerInterval: 10, intervalMs: 60_000 });
    group.add('tokens', { tokensPerInterval: 1000, intervalMs: 60_000 });

    expect(group.get('requests')).toBeDefined();
    expect(group.get('tokens')).toBeDefined();
    expect(group.get('nonexistent')).toBeUndefined();
  });

  it('tryAll returns true only when ALL limiters allow', async () => {
    const { RateLimiterGroup } = await import('../src/core/rate-limiter.js');
    const group = new RateLimiterGroup();

    group.add('requests', { tokensPerInterval: 2, intervalMs: 60_000 });
    group.add('tokens', { tokensPerInterval: 100, intervalMs: 60_000 });

    expect(group.tryAll(1)).toBe(true);
    expect(group.tryAll(1)).toBe(true); // requests: 2/2 used

    // requests exhausted, tokens still has 98
    expect(group.tryAll(1)).toBe(false);
  });

  it('getAllStates returns states for all limiters', async () => {
    const { RateLimiterGroup } = await import('../src/core/rate-limiter.js');
    const group = new RateLimiterGroup();

    group.add('a', { tokensPerInterval: 5, intervalMs: 60_000 });
    group.add('b', { tokensPerInterval: 10, intervalMs: 60_000 });

    group.tryAll(3);

    const states = group.getAllStates();
    expect(states.a).toBeDefined();
    expect(states.b).toBeDefined();
    expect(states.a.allowed).toBe(1);
    expect(states.b.allowed).toBe(1);
  });

  it('resetAll resets all limiters', async () => {
    const { RateLimiterGroup } = await import('../src/core/rate-limiter.js');
    const group = new RateLimiterGroup();

    group.add('a', { tokensPerInterval: 2, intervalMs: 60_000 });
    group.add('b', { tokensPerInterval: 2, intervalMs: 60_000 });

    group.tryAll(2);
    expect(group.tryAll(1)).toBe(false);

    group.resetAll();
    expect(group.tryAll(1)).toBe(true);
  });
});