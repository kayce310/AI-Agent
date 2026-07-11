/**
 * @file CircuitBreaker Tests
 * @layer tests
 * @owner core-engine
 *
 * Tests the CircuitBreaker class that prevents zombie retry loops.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CircuitBreaker } from '../src/core/circuit-breaker';

describe('CircuitBreaker', () => {
  let cb: CircuitBreaker;

  beforeEach(() => {
    cb = new CircuitBreaker({
      failureThreshold: 3,
      recoveryTimeoutMs: 100, // Short timeout for testing
      halfOpenMaxAttempts: 1,
    });
  });

  describe('Closed state (normal)', () => {
    it('should start in closed state', () => {
      expect(cb.getState()).toBe('closed');
      expect(cb.isHealthy()).toBe(true);
      expect(cb.getFailureCount()).toBe(0);
    });

    it('should execute function successfully', async () => {
      const result = await cb.execute(async () => 'success');
      expect(result).toBe('success');
      expect(cb.getState()).toBe('closed');
      expect(cb.getFailureCount()).toBe(0);
    });

    it('should reset failure count on success', async () => {
      // 2 failures
      await cb.execute(async () => { throw new Error('fail 1'); }).catch(() => {});
      await cb.execute(async () => { throw new Error('fail 2'); }).catch(() => {});
      expect(cb.getFailureCount()).toBe(2);

      // 1 success
      await cb.execute(async () => 'ok');
      expect(cb.getFailureCount()).toBe(0);
      expect(cb.getState()).toBe('closed');
    });
  });

  describe('Open state (blocking)', () => {
    it('should open circuit after threshold failures', async () => {
      // 3 consecutive failures
      for (let i = 0; i < 3; i++) {
        await cb.execute(async () => { throw new Error(`fail ${i + 1}`); }).catch(() => {});
      }

      expect(cb.getState()).toBe('open');
      expect(cb.isHealthy()).toBe(false);
      expect(cb.getFailureCount()).toBe(3);
    });

    it('should reject requests when circuit is open', async () => {
      // Open the circuit
      for (let i = 0; i < 3; i++) {
        await cb.execute(async () => { throw new Error('fail'); }).catch(() => {});
      }

      // Next request should be rejected immediately
      let caught = false;
      try {
        await cb.execute(async () => 'should not run');
      } catch (err: any) {
        caught = true;
        expect(err.message).toContain('Circuit breaker OPEN');
      }
      expect(caught).toBe(true);
    });

    it('should not execute function when circuit is open', async () => {
      // Open the circuit
      for (let i = 0; i < 3; i++) {
        await cb.execute(async () => { throw new Error('fail'); }).catch(() => {});
      }

      let fnCalled = false;
      try {
        await cb.execute(async () => { fnCalled = true; return 'ok'; });
      } catch { /* expected */ }
      expect(fnCalled).toBe(false);
    });
  });

  describe('Half-Open state (testing)', () => {
    it('should transition to half-open after recovery timeout', async () => {
      // Open the circuit
      for (let i = 0; i < 3; i++) {
        await cb.execute(async () => { throw new Error('fail'); }).catch(() => {});
      }
      expect(cb.getState()).toBe('open');

      // Wait for recovery timeout
      await new Promise(resolve => setTimeout(resolve, 150));

      // Should now be half-open (transition happens on next execute)
      let fnCalled = false;
      try {
        await cb.execute(async () => { fnCalled = true; return 'ok'; });
      } catch { /* might still fail */ }
      expect(fnCalled).toBe(true);
    });

    it('should close circuit on success in half-open', async () => {
      // Open the circuit
      for (let i = 0; i < 3; i++) {
        await cb.execute(async () => { throw new Error('fail'); }).catch(() => {});
      }

      // Wait for recovery timeout
      await new Promise(resolve => setTimeout(resolve, 150));

      // Succeed in half-open
      const result = await cb.execute(async () => 'recovered');
      expect(result).toBe('recovered');
      expect(cb.getState()).toBe('closed');
      expect(cb.isHealthy()).toBe(true);
    });

    it('should re-open circuit on failure in half-open', async () => {
      // Open the circuit
      for (let i = 0; i < 3; i++) {
        await cb.execute(async () => { throw new Error('fail'); }).catch(() => {});
      }

      // Wait for recovery timeout
      await new Promise(resolve => setTimeout(resolve, 150));

      // Fail in half-open
      try {
        await cb.execute(async () => { throw new Error('still broken'); });
      } catch { /* expected */ }
      expect(cb.getState()).toBe('open');
    });
  });

  describe('Reset', () => {
    it('should reset to closed state', async () => {
      // Open the circuit
      for (let i = 0; i < 3; i++) {
        await cb.execute(async () => { throw new Error('fail'); }).catch(() => {});
      }
      expect(cb.getState()).toBe('open');

      // Reset
      cb.reset();
      expect(cb.getState()).toBe('closed');
      expect(cb.isHealthy()).toBe(true);
      expect(cb.getFailureCount()).toBe(0);
    });
  });

  describe('Edge cases', () => {
    it('should handle errors that are not instances of Error', async () => {
      await cb.execute(async () => { throw 'string error'; }).catch(() => {});
      expect(cb.getFailureCount()).toBe(1);
    });

    it('should handle async function that returns undefined', async () => {
      const result = await cb.execute(async () => undefined);
      expect(result).toBeUndefined();
      expect(cb.getState()).toBe('closed');
    });

    it('should handle rapid successive calls', async () => {
      const promises = [];
      for (let i = 0; i < 5; i++) {
        promises.push(
          cb.execute(async () => { throw new Error('concurrent fail'); }).catch(() => {})
        );
      }
      await Promise.all(promises);
      expect(cb.getFailureCount()).toBe(5);
      expect(cb.getState()).toBe('open');
    });
  });

  describe('Custom config', () => {
    it('should respect custom failure threshold', async () => {
      const strictCb = new CircuitBreaker({
        failureThreshold: 1,
        recoveryTimeoutMs: 50,
        halfOpenMaxAttempts: 1,
      });

      await strictCb.execute(async () => { throw new Error('one fail'); }).catch(() => {});
      expect(strictCb.getState()).toBe('open');
    });

    it('should respect custom recovery timeout', async () => {
      const slowCb = new CircuitBreaker({
        failureThreshold: 2,
        recoveryTimeoutMs: 500, // Long timeout
        halfOpenMaxAttempts: 1,
      });

      // Open the circuit
      for (let i = 0; i < 2; i++) {
        await slowCb.execute(async () => { throw new Error('fail'); }).catch(() => {});
      }

      // Wait only 100ms (less than 500ms)
      await new Promise(resolve => setTimeout(resolve, 100));

      // Should still be open
      let blocked = false;
      try {
        await slowCb.execute(async () => 'should not run');
      } catch {
        blocked = true;
      }
      expect(blocked).toBe(true);
    });
  });
});
