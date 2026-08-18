/**
 * Coral Agent — PHASE 8: HITL Singleton Wiring Tests
 *
 * Proves ONE shared HITLManager instance serves both runtime paths:
 *  - consequence-read-path.ts (require_hitl → getHITLManager singleton)
 *  - Telegram approval handlers (registerHITLCallbackHandler → hitlManager.resolve)
 *
 * Before the fix, start-telegram.ts did `new HITLManager()` (separate instance):
 * the pending request + waiter lived on the singleton, but approve/reject
 * resolved a DIFFERENT instance → approval never resolved the pending request.
 *
 * These tests use the REAL HITLManager (no mock) end-to-end:
 *  guard (tool:call) → singleton.checkAndRequest → pending request
 *  → onPending (Telegram wiring) → resolve (Telegram callback path) → guard result.
 */

import { describe, it, beforeEach, afterEach, expect } from 'vitest';
import { randomUUID } from 'node:crypto';
import { ConsequenceStore } from '../src/core/memory/consequence-store.js';
import { registerConsequenceReadPath } from '../src/core/memory/consequence-read-path.js';
import { ConsequenceRecord } from '../src/core/memory/consequence-types.js';
import { globalHooks } from '../src/core/hooks.js';
import { HITLManager } from '../src/core/security/hitl.js';
import { getHITLManager, resetHITLManager } from '../src/core/security/hitl-manager.js';

function makeRecord(overrides: Partial<ConsequenceRecord> = {}): ConsequenceRecord {
  return {
    id: randomUUID(),
    createdAt: Date.now(),
    userId: 'user-1',
    sessionId: 's1',
    taskId: 't1',
    context: {},
    action: { toolName: 'default_tool' },
    outcome: 'fail',
    evidenceRef: { checkpointId: 't1' },
    reusePolicy: 'record_only',
    ...overrides,
  };
}

describe('PHASE 8 — HITL singleton wiring (real HITLManager, no mock)', () => {
  let store: ConsequenceStore;
  let unsub: (() => void) | null = null;

  beforeEach(() => {
    resetHITLManager(); // test isolation: fresh singleton
    store = new ConsequenceStore(':memory:');
  });

  afterEach(() => {
    unsub?.();
    unsub = null;
    resetHITLManager();
    store.close();
  });

  /**
   * Trigger the consequence guard with a require_hitl policy and NO hitl mock.
   * Returns { emitPromise, pendingCaptured } where pendingCaptured resolves with
   * the request the singleton's onPending callback received.
   */
  function triggerRequireHitl(toolName = 'delete_file') {
    store.append(makeRecord({ action: { toolName }, outcome: 'fail', reusePolicy: 'require_hitl' }));

    const hitl = getHITLManager();
    let resolvePending: (req: unknown) => void = () => {};
    const pendingCaptured = new Promise<unknown>((res) => { resolvePending = res; });
    hitl.onPending = async (request) => { resolvePending(request); };

    unsub = registerConsequenceReadPath({ store }); // NO hitl option → uses singleton

    const emitPromise = globalHooks.emit('tool:call', {
      sessionId: 's1',
      toolName,
      cycle: 1,
    });
    return { emitPromise, pendingCaptured, hitl };
  }

  it('1. require_hitl creates a pending request on the shared instance', async () => {
    const { emitPromise, pendingCaptured, hitl } = triggerRequireHitl();

    const captured = await pendingCaptured; // wait until onPending fired
    const pending = hitl.getQueue().getPending();

    expect(pending).toHaveLength(1);
    expect(pending[0].status).toBe('pending');
    expect(captured).toBeDefined();
    expect((captured as { id: string }).id).toBe(pending[0].id);

    // Release the waiter so the test doesn't hang
    hitl.resolve(pending[0].id, 'rejected', 'test');
    await emitPromise;
  });

  it('2. Telegram onPending receives that SAME request (identity match)', async () => {
    const { emitPromise, pendingCaptured, hitl } = triggerRequireHitl();

    const captured = (await pendingCaptured) as { id: string };
    const inQueue = hitl.getQueue().get(captured.id);

    expect(inQueue).toBeDefined();
    expect(inQueue!.id).toBe(captured.id);
    expect(inQueue!.status).toBe('pending');
    expect(inQueue!.action.name).toBe('delete_file');

    hitl.resolve(captured.id, 'rejected', 'test');
    await emitPromise;
  });

  it('3. approve resolves that SAME request → tool runs (allowed=true)', async () => {
    const { emitPromise, pendingCaptured, hitl } = triggerRequireHitl();

    const captured = (await pendingCaptured) as { id: string };

    // Same call registerHITLCallbackHandler makes on 'hitl:approve:<id>'
    const success = hitl.resolve(captured.id, 'approved', 'tg-user-123');
    expect(success).toBe(true);

    const ok = await emitPromise;
    expect(ok).toBe(true); // approved → tool chạy

    expect(hitl.getQueue().get(captured.id)!.status).toBe('approved');
    expect(hitl.getQueue().getPending()).toHaveLength(0);
  });

  it('4. reject resolves that SAME request → tool blocked (allowed=false)', async () => {
    const { emitPromise, pendingCaptured, hitl } = triggerRequireHitl();

    const captured = (await pendingCaptured) as { id: string };

    // Same call registerHITLCallbackHandler makes on 'hitl:reject:<id>'
    const success = hitl.resolve(captured.id, 'rejected', 'tg-user-123');
    expect(success).toBe(true);

    const ok = await emitPromise;
    expect(ok).toBe(false); // rejected → tool không chạy

    expect(hitl.getQueue().get(captured.id)!.status).toBe('rejected');
    expect(hitl.getQueue().getPending()).toHaveLength(0);
  });

  it('5. expiry behavior unchanged — TTL auto-expire resolves waiter with expired', async () => {
    // Same class the singleton instantiates, short TTL (30ms) to test expiry fast
    const manager = new HITLManager({ defaultTTLMs: 30 });

    const statusPromise = manager.checkAndRequest(
      { type: 'tool_call', name: 'delete_file', args: {}, description: 'expiry test' },
      { userId: 'user-1' },
    );

    const status = await statusPromise;
    expect(status).toBe('expired');
    expect(manager.getStats().expired).toBe(1);
    expect(manager.getQueue().getPending()).toHaveLength(0);
  });

  it('6. singleton default TTL unchanged (5 min) for boot-path wiring', async () => {
    const hitl = getHITLManager();
    const pendingPromise = hitl.checkAndRequest(
      { type: 'tool_call', name: 'delete_file', args: {}, description: 'ttl check' },
      { userId: 'user-1' },
    );

    // Wait until the request is queued, then inspect TTL
    await new Promise((res) => setTimeout(res, 10));
    const pending = hitl.getQueue().getPending();
    expect(pending).toHaveLength(1);
    expect(pending[0].expiresAt - pending[0].createdAt).toBe(5 * 60 * 1000);

    hitl.resolve(pending[0].id, 'rejected', 'test');
    await pendingPromise;
  });
});
