/**
 * @file r3-admission-control.test.ts — R3 Global Foreground Concurrency Admission
 * @layer tests
 *
 * R3 v1: Global foreground concurrency limit with hard reject semantics.
 * 
 * Acceptance criteria:
 * - Requests 1-4 admitted when active < N
 * - Request 5 rejected when active >= N (providerUsed: 'r3-admission')
 * - Counter released on success and error paths
 * - Per-session max-1 invariant preserved
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Engine } from '../src/core/engine/engine.js';
import { EngineRequest } from '../src/core/types.js';
import { asUserId, asConversationSessionId } from '../src/core/types/branded.js';

function makeRequest(sessionId: string, msg: string = 'test'): EngineRequest {
  return {
    sessionId: asConversationSessionId(sessionId),
    userId: asUserId('user-test'),
    messages: [{ role: 'user', content: msg }],
    modelId: 'test-model',
    agentName: 'Coral',
    protocol: 'test',
    mentionPrefix: '',
  };
}

describe('R3 — Global Foreground Concurrency Admission', () => {
  let engine: Engine;
  let barrier: { count: number; resolve: () => void; promise: Promise<void> };

  beforeEach(async () => {
    engine = new Engine() as any;
    
    // Initialize minimal state
    engine.agent = {
      circuitBreakerState: { isHealthy: () => true },
      setMaxToolCycles: vi.fn(),
      run: vi.fn(),
      on: vi.fn(),
      onEvent: vi.fn(),
    };
    
    engine.rateLimiter = {
      tryAll: vi.fn(() => true),
    };
    
    engine.perUserLimiter = {
      tryConsume: vi.fn(() => true),
    };
    
    engine.responseCache = {
      beginRequest: vi.fn(),
      get: vi.fn(() => null),
    };
    
    engine.checkpointStore = {
      getActiveTaskForSession: vi.fn(() => null),
      start: vi.fn(),
    };
    
    engine.taskQueue = {
      enqueue: vi.fn(),
    };
    
    engine.requestControllers = new Map();
    engine.pendingRequests = new Map();

    // Barrier: all N requests block at same point
    barrier = {
      count: 0,
      resolve: () => {},
      promise: new Promise(() => {}),
    };

    // Mock modelRouter to suspend indefinitely
    engine.modelRouter = {
      route: vi.fn(async () => {
        barrier.count++;
        // Wait indefinitely — caller must resolve barrier
        await new Promise(() => {});
      }),
    };
    
    // No-op hooks/memory/other
    engine.hooks = { on: vi.fn(), off: vi.fn() };
    engine.memory = { getContext: vi.fn(() => '') };
    engine.temporalMemory = { addBlockForAgent: vi.fn() };
    engine.eventLogger = { taskStarted: vi.fn(), decisionMade: vi.fn(), toolCall: vi.fn() };
    engine.pendingCallIds = new Map();
    engine.tasksWithToolCalls = new Set();
    engine.agentRegistry = {};
    engine.learner = {};
    engine.consolidation = {};
    
    // Set N = 4 for test
    (engine as any).globalForegroundConcurrencyLimit = 4;
  });

  it('should admit requests 1-4, reject request 5', async () => {
    // Setup: mock processInner to hold requests active
    let resolveBarrier: (() => void) | null = null;
    const barrierPromise = new Promise<void>((resolve) => {
      resolveBarrier = resolve;
    });

    (engine as any).processInner = vi.fn(async (req: EngineRequest) => {
      await barrierPromise; // Block all requests at same point
      return { content: 'ok', modelUsed: 'test', providerUsed: 'test' };
    });

    // Start 4 requests with different sessionIds
    const sessions = ['s1', 's2', 's3', 's4'];
    const promises = sessions.map((sid) =>
      engine.process(makeRequest(sid, `msg-${sid}`))
    );

    // Let requests enter processInner
    await new Promise((r) => setTimeout(r, 50));

    // All 4 should be in-flight
    expect((engine as any).activeForegroundCount).toBe(4);

    // Request 5 should be rejected
    const req5Response = await engine.process(makeRequest('s5', 'msg-s5'));
    expect(req5Response.providerUsed).toBe('r3-admission');
    expect(req5Response.content).toContain('xử lý quá nhiều yêu cầu');

    // Active count still 4 (rejection doesn't increment)
    expect((engine as any).activeForegroundCount).toBe(4);

    // Release barrier — requests complete
    if (resolveBarrier) resolveBarrier();

    // Wait for all 4 to settle
    const results = await Promise.all(promises);
    expect(results).toHaveLength(4);
    results.forEach((r) => {
      expect(r.content).toBe('ok');
    });

    // After all 4 complete, activeCount should be 0 (all decremented)
    expect((engine as any).activeForegroundCount).toBe(0);
  });

  it('should decrement counter on error path', async () => {
    (engine as any).processInner = vi.fn(async () => {
      throw new Error('simulated failure');
    });

    const req = makeRequest('s1', 'msg');
    const promise = engine.process(req).catch(() => {});

    await new Promise((r) => setTimeout(r, 50));

    // Even though processInner threw, counter should be decremented in finally
    // (Note: the .catch() above swallows the error)
    await promise;

    // Should be back to 0 after error handling
    expect((engine as any).activeForegroundCount).toBe(0);
  });

  it('counter never exceeds limit N', async () => {
    (engine as any).globalForegroundConcurrencyLimit = 2;

    const results: any[] = [];
    (engine as any).processInner = vi.fn(async (req: EngineRequest) => {
      results.push({ active: (engine as any).activeForegroundCount, sessionId: req.sessionId });
      await new Promise((r) => setTimeout(r, 10));
      return { content: 'ok', modelUsed: 'test', providerUsed: 'test' };
    });

    // Spam 10 requests
    const promises = Array.from({ length: 10 }, (_, i) =>
      engine.process(makeRequest(`s${i}`, `msg${i}`))
    );

    const settled = await Promise.all(promises);

    // Count rejections
    const rejections = settled.filter((r) => r.providerUsed === 'r3-admission');
    const admissions = settled.filter((r) => r.providerUsed !== 'r3-admission');

    // At least 2 admitted, rest rejected
    expect(admissions.length).toBeGreaterThanOrEqual(2);
    expect(rejections.length).toBeGreaterThan(0);

    // Final counter = 0 (all cleaned up)
    expect((engine as any).activeForegroundCount).toBe(0);

    // Active count in results never exceeded limit
    results.forEach((r) => {
      expect(r.active).toBeLessThanOrEqual(2);
    });
  });
});
