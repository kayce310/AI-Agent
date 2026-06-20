/**
 * @file RateLimiter Tests
 * @layer tests
 */
import { describe, it, expect } from 'vitest';
import { RateLimiter } from '../src/core/security/rate-limiter.js';

describe('RateLimiter', () => {
  it('should allow requests under limit', () => {
    const limiter = new RateLimiter('test', { tokensPerInterval: 5, intervalMs: 60000 });
    expect(limiter.tryConsume()).toBe(true);
    expect(limiter.tryConsume()).toBe(true);
    expect(limiter.tryConsume()).toBe(true);
  });

  it('should reject requests over limit', () => {
    const limiter = new RateLimiter('test', { tokensPerInterval: 2, intervalMs: 60000 });
    limiter.tryConsume();
    limiter.tryConsume();
    expect(limiter.tryConsume()).toBe(false);
  });

  it('should track state', () => {
    const limiter = new RateLimiter('test', { tokensPerInterval: 1, intervalMs: 60000 });
    limiter.tryConsume();
    limiter.tryConsume();
    const state = limiter.getState();
    expect(state.allowed).toBe(1);
    expect(state.denied).toBe(1);
  });
});
