/**
 * @file request-timeout.test.ts — Request Timeout Tests (Phase 1)
 * @layer tests
 * @owner core-engine
 *
 * Tests for the three-tier timeout guard:
 *   1. withTimeout utility
 *   2. ModelRouter per-adapter timeout + fallback
 *   3. Engine.process() request-level timeout
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { withTimeout, TimeoutError, createTimeoutController } from '../src/core/util/with-timeout.js';
import { ModelRouter } from '../src/core/llm/model-adapter.js';

// ─── Helper: create a mock adapter ───
function createMockAdapter(name: string, delayMs: number = 0, shouldFail: boolean = false) {
  let callCount = 0;
  return {
    name,
    label: `Mock ${name}`,
    isAvailable: () => true,
    estimateTokens: () => 10,
    invoke: vi.fn().mockImplementation(async () => {
      callCount++;
      if (shouldFail) throw new Error(`Adapter ${name} failed`);
      await new Promise(r => setTimeout(r, delayMs));
      return {
        content: `Response from ${name}`,
        modelUsed: name,
        providerUsed: name,
        finishReason: 'stop',
      };
    }),
    getCallCount: () => callCount,
  };
}

// ════════════════════════════════════════════════
// 1. withTimeout utility tests
// ════════════════════════════════════════════════

describe('withTimeout utility', () => {
  it('should resolve before timeout', async () => {
    const result = await withTimeout(
      Promise.resolve('ok'),
      1000,
    );
    expect(result).toBe('ok');
  });

  it('should reject with TimeoutError when promise is slow', async () => {
    const slow = new Promise(resolve => setTimeout(resolve, 500));
    await expect(
      withTimeout(slow, 50),
    ).rejects.toThrow(TimeoutError);
  });

  it('should reject with TimeoutError message containing the timeout ms', async () => {
    const slow = new Promise(resolve => setTimeout(resolve, 500));
    try {
      await withTimeout(slow, 100);
      expect.unreachable('Should have thrown');
    } catch (err: any) {
      expect(err.message).toContain('100');
      expect(err.message).toContain('timed out');
    }
  });

  it('should resolve immediately for already-resolved promise', async () => {
    const result = await withTimeout(Promise.resolve('instant'), 1000);
    expect(result).toBe('instant');
  });

  it('should reject with original error (not timeout) if promise fails fast', async () => {
    const failing = Promise.reject(new Error('original error'));
    await expect(
      withTimeout(failing, 1000),
    ).rejects.toThrow('original error');
  });

  it('should reject immediately if signal already aborted', async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(
      withTimeout(Promise.resolve('never'), 1000, controller.signal),
    ).rejects.toThrow('aborted');
  });

  it('should abort when signal is aborted mid-wait', async () => {
    const controller = new AbortController();
    const slow = new Promise(resolve => setTimeout(resolve, 500));

    const timeoutPromise = withTimeout(slow, 1000, controller.signal);
    setTimeout(() => controller.abort(), 20);

    await expect(timeoutPromise).rejects.toThrow('aborted');
  });
});

// ════════════════════════════════════════════════
// 2. createTimeoutController tests
// ════════════════════════════════════════════════

describe('createTimeoutController', () => {
  it('should auto-abort after specified ms', async () => {
    const { controller, clear } = createTimeoutController(50);
    await new Promise(r => setTimeout(r, 100));
    expect(controller.signal.aborted).toBe(true);
    clear(); // prevent leak
  });

  it('should not abort before timeout', async () => {
    const { controller, clear } = createTimeoutController(200);
    expect(controller.signal.aborted).toBe(false);
    clear(); // cancel before timeout
  });

  it('should allow clear() to prevent abort', async () => {
    const { controller, clear } = createTimeoutController(50);
    clear();
    await new Promise(r => setTimeout(r, 100));
    expect(controller.signal.aborted).toBe(false);
  });
});

// ════════════════════════════════════════════════
// 3. ModelRouter timeout + fallback tests
// ════════════════════════════════════════════════

describe('ModelRouter timeout fallback', () => {
  let router: ModelRouter;

  beforeEach(() => {
    router = new ModelRouter();
  });

  it('should return response from fast adapter', async () => {
    const fast = createMockAdapter('fast', 10);
    router.use(fast);

    const result = await router.route([{ role: 'user', content: 'hi' }]);
    expect(result.content).toBe('Response from fast');
  });

  it('should fallback to next adapter when first times out', async () => {
    // Adapter that would time out (route() has internal 120_000ms timeout,
    // but we test by making it reject which simulates the behavior)
    const slow = createMockAdapter('slow', 10);
    slow.invoke = vi.fn().mockRejectedValue(new Error('timed out after 120000ms'));

    const fast = createMockAdapter('backup', 10);
    router.use(slow);
    router.use(fast);
    router.setDefault('slow');

    const result = await router.route([{ role: 'user', content: 'hi' }]);
    expect(result.content).toBe('Response from backup');
  });

  it('should try third adapter when first two fail', async () => {
    const fail1 = createMockAdapter('fail1', 0, true);
    const fail2 = createMockAdapter('fail2', 0, true);
    const ok = createMockAdapter('ok', 10);

    router.use(fail1);
    router.use(fail2);
    router.use(ok);
    router.setDefault('fail1');

    const result = await router.route([{ role: 'user', content: 'hi' }]);
    expect(result.content).toBe('Response from ok');
  });

  it('should throw when all adapters fail', async () => {
    const fail1 = createMockAdapter('fail1', 0, true);
    const fail2 = createMockAdapter('fail2', 0, true);

    router.use(fail1);
    router.use(fail2);

    await expect(
      router.route([{ role: 'user', content: 'hi' }]),
    ).rejects.toThrow('All adapters failed');
  });

  it('should use default adapter first (priority order)', async () => {
    const primary = createMockAdapter('primary', 10);
    const backup = createMockAdapter('backup', 10);

    router.use(backup);
    router.use(primary);
    router.setDefault('primary');

    const result = await router.route([{ role: 'user', content: 'hi' }]);
    expect(result.content).toBe('Response from primary');
  });

  it('should skip unavailable adapters and try next', async () => {
    const unavailable = createMockAdapter('unavailable', 0, false);
    unavailable.isAvailable = () => false; // Override: this adapter is down

    const ok = createMockAdapter('ok', 10);
    router.use(unavailable);
    router.use(ok);
    router.setDefault('unavailable');

    const result = await router.route([{ role: 'user', content: 'hi' }]);
    expect(result.content).toBe('Response from ok');
  });

  it('should return first successful response when mixed failure/timeout', async () => {
    // Simulate mixed failures: timeout then success
    const fail = createMockAdapter('fail', 10);
    fail.invoke = vi.fn().mockImplementation(async () => {
      throw new Error('random failure');
    });

    const ok = createMockAdapter('ok', 10);
    router.use(fail);
    router.use(ok);
    router.setDefault('fail');

    const result = await router.route([{ role: 'user', content: 'hi' }]);
    expect(result.content).toBe('Response from ok');
  });
});

// ════════════════════════════════════════════════
// 4. TimeoutError class tests
// ════════════════════════════════════════════════

describe('TimeoutError', () => {
  it('should have correct name and message', () => {
    const err = new TimeoutError(5000);
    expect(err.name).toBe('TimeoutError');
    expect(err.message).toContain('5000');
    expect(err.message).toContain('timed out');
  });

  it('should be instance of Error', () => {
    const err = new TimeoutError(100);
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(TimeoutError);
  });

  it('should have stack trace', () => {
    const err = new TimeoutError(100);
    expect(err.stack).toBeDefined();
  });
});
