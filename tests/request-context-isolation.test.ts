/**
 * @file Concurrency isolation — requestContext via AsyncLocalStorage
 * @layer tests
 *
 * Verifies that per-request state (sessionId, taskId, evidenceLog) is
 * isolated between concurrent requests via AsyncLocalStorage.
 */

import { describe, it, expect } from 'vitest';
import { requestContext, getRequestContext } from '../src/core/request-context.js';

describe('requestContext (AsyncLocalStorage isolation)', () => {
  it('provides per-request state inside run()', async () => {
    const ctx = {
      sessionId: 'sess-A',
      taskId: 'task-1',
      evidenceLog: new Map(),
      onPlanCreated: () => {},
    };

    await requestContext.run(ctx, async () => {
      const store = getRequestContext();
      expect(store).not.toBeNull();
      expect(store!.sessionId).toBe('sess-A');
      expect(store!.taskId).toBe('task-1');
    });
  });

  it('returns null outside run()', () => {
    expect(getRequestContext()).toBeNull();
  });

  it('isolates concurrent requests — different sessionIds do not leak', async () => {
    const results: Array<{ sessionId: string; taskId: string }> = [];

    // Two concurrent requests with different context
    await Promise.all([
      requestContext.run(
        { sessionId: 'sess-A', taskId: 'task-A', evidenceLog: new Map(), onPlanCreated: () => {} },
        async () => {
          // Simulate async work
          await new Promise(r => setTimeout(r, 50));
          const ctx = getRequestContext();
          results.push({ sessionId: ctx!.sessionId, taskId: ctx!.taskId });
        }
      ),
      requestContext.run(
        { sessionId: 'sess-B', taskId: 'task-B', evidenceLog: new Map(), onPlanCreated: () => {} },
        async () => {
          // Simulate async work
          await new Promise(r => setTimeout(r, 30));
          const ctx = getRequestContext();
          results.push({ sessionId: ctx!.sessionId, taskId: ctx!.taskId });
        }
      ),
    ]);

    // Both requests should have their own context — no cross-contamination
    expect(results).toHaveLength(2);
    const rA = results.find(r => r.taskId === 'task-A');
    const rB = results.find(r => r.taskId === 'task-B');
    expect(rA).toEqual({ sessionId: 'sess-A', taskId: 'task-A' });
    expect(rB).toEqual({ sessionId: 'sess-B', taskId: 'task-B' });
  });

  it('isolates evidenceLog — mutations in one request do not affect another', async () => {
    const logA = new Map<number, Array<{ toolName: string; args: Record<string, unknown>; result: any; timestamp: number; success: boolean }>>();
    const logB = new Map<number, Array<{ toolName: string; args: Record<string, unknown>; result: any; timestamp: number; success: boolean }>>();

    const evidenceA = { toolName: 'read_file', args: {}, result: 'content-A', timestamp: 1, success: true };
    const evidenceB = { toolName: 'write_file', args: {}, result: 'content-B', timestamp: 2, success: true };

    await Promise.all([
      requestContext.run(
        { sessionId: 'sess-A', taskId: 'task-A', evidenceLog: logA, onPlanCreated: () => {} },
        async () => {
          await new Promise(r => setTimeout(r, 20));
          const ctx = getRequestContext()!;
          // Write evidence for item 0
          ctx.evidenceLog.set(0, [evidenceA]);
        }
      ),
      requestContext.run(
        { sessionId: 'sess-B', taskId: 'task-B', evidenceLog: logB, onPlanCreated: () => {} },
        async () => {
          await new Promise(r => setTimeout(r, 10));
          const ctx = getRequestContext()!;
          // Write evidence for item 0 — different data
          ctx.evidenceLog.set(0, [evidenceB]);
        }
      ),
    ]);

    // Each log should only contain its own evidence
    expect(logA.get(0)).toHaveLength(1);
    expect(logA.get(0)![0].toolName).toBe('read_file');

    expect(logB.get(0)).toHaveLength(1);
    expect(logB.get(0)![0].toolName).toBe('write_file');
  });

  it('onPlanCreated callback is per-request', async () => {
    const calls: string[] = [];

    await Promise.all([
      requestContext.run(
        { sessionId: 'A', taskId: 't1', evidenceLog: new Map(), onPlanCreated: () => calls.push('A') },
        async () => {
          await new Promise(r => setTimeout(r, 10));
          getRequestContext()!.onPlanCreated(3);
        }
      ),
      requestContext.run(
        { sessionId: 'B', taskId: 't2', evidenceLog: new Map(), onPlanCreated: () => calls.push('B') },
        async () => {
          await new Promise(r => setTimeout(r, 5));
          getRequestContext()!.onPlanCreated(5);
        }
      ),
    ]);

    expect(calls).toHaveLength(2);
    expect(calls).toContain('A');
    expect(calls).toContain('B');
  });

  // ADR-000 §2P3 guard: context MUST be torn down after run() completes.
  // enterWith() (the wrong API) leaves the LAST request's context on the
  // thread permanently — a cron/timer/EventEmitter callback starting after
  // the requests finish would inherit stale session/taskId (data leak).
  // This test fails if someone swaps run() → enterWith().
  it('run() tears down context after completion (no leakage to later callbacks)', async () => {
    await requestContext.run(
      { sessionId: 'sess-X', taskId: 'task-X', evidenceLog: new Map(), onPlanCreated: () => {} },
      async () => {
        await new Promise(r => setTimeout(r, 5));
        expect(getRequestContext()?.sessionId).toBe('sess-X');
      }
    );

    // After run() completes, context must be null — NOT the last request's ctx
    expect(getRequestContext()).toBeNull();

    // A later async callback (simulating cron/event-listener outside a request)
    // must NOT see the stale context.
    await new Promise<void>((resolve) => {
      setTimeout(() => {
        expect(getRequestContext()).toBeNull();
        resolve();
      }, 5);
    });
  });

  it('concurrent run() scopes never leak across each other or outward', async () => {
    // Interleave two requests through the SAME async function shape as
    // processInner: enterWith-style overwrite would corrupt reads.
    const reads: string[] = [];
    async function pseudoProcessInner(taskId: string, waitMs: number): Promise<void> {
      await requestContext.run(
        { sessionId: `s-${taskId}`, taskId, evidenceLog: new Map(), onPlanCreated: () => {} },
        async () => {
          await new Promise(r => setTimeout(r, waitMs));
          reads.push(`${taskId}:${getRequestContext()?.taskId}`);
        }
      );
    }

    await Promise.all([pseudoProcessInner('A', 40), pseudoProcessInner('B', 10)]);

    // Each request read its OWN context — no cross-contamination
    expect(reads).toContain('A:A');
    expect(reads).toContain('B:B');
    expect(reads).toHaveLength(2);

    // And nothing leaks after both finish
    expect(getRequestContext()).toBeNull();
  });
});
