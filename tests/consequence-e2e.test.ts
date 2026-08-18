/**
 * Coral Agent — PHASE 9: Consequence Memory End-to-End Loop
 *
 * Each scenario runs the COMPLETE runtime chain with real components
 * (no mocks, no store stub):
 *
 *   WRITE (tool:result) → STORE (SQLite :memory:) → READ (tool:call guard)
 *   → DECISION (resolveDecision) → REQUEST CONTEXT (hint) → AGENT PROMPT
 *   (buildCycleMessagesWithHint) / HITL (real singleton) → TOOL BEHAVIOR.
 *
 * Sub-pieces are already proven in dedicated suites (write-path, store,
 * read-path, hint-consumer, hitl-singleton-wiring) — this file chains them
 * through the real write path so records are produced the same way the
 * runtime produces them, not by store.append().
 */

import { describe, it, beforeEach, afterEach, expect } from 'vitest';
import { ConsequenceStore } from '../src/core/memory/consequence-store.js';
import { registerConsequenceWritePath } from '../src/core/memory/consequence-write-path.js';
import { registerConsequenceReadPath } from '../src/core/memory/consequence-read-path.js';
import { buildCycleMessagesWithHint } from '../src/core/engine/agent.js';
import { globalHooks } from '../src/core/hooks.js';
import { requestContext, RequestContext } from '../src/core/request-context.js';
import { getHITLManager, resetHITLManager } from '../src/core/security/hitl-manager.js';

function makeRctx(opts: { userId?: string; sessionId?: string; taskId?: string } = {}): RequestContext {
  return {
    sessionId: opts.sessionId ?? 's1',
    taskId: opts.taskId ?? 't1',
    userId: opts.userId ?? 'user-1',
    evidenceLog: new Map(),
    onPlanCreated: () => {},
  };
}
function withRctx<T>(fn: () => T, opts: { userId?: string; sessionId?: string } = {}): T {
  return requestContext.run(makeRctx({ ...opts, taskId: `t-${opts.userId ?? 'u'}` }), fn);
}

/** WRITE: emit tool:result (outcome from result.error) */
function toolResult(payload: { sessionId: string; toolName: string; args?: Record<string, unknown>; result: unknown; cycle: number }) {
  return globalHooks.emit('tool:result', payload as never);
}

/** READ: emit tool:call (guard runs decide + optional HITL + sets hint) */
function toolCall(payload: { sessionId: string; toolName: string; toolArgs?: Record<string, unknown>; cycle: number }) {
  return globalHooks.emit('tool:call', payload as never);
}

function renderPrompt(hint?: unknown): string[] {
  const messages = [{ role: 'user', content: 'run' }];
  const out = buildCycleMessagesWithHint(messages, hint as never);
  return out.map((m) => String((m as { content?: unknown }).content ?? ''));
}

describe('PHASE 9 — E2E: FAILURE → SUGGEST', () => {
  let store: ConsequenceStore;
  let unsubs: Array<() => void>;

  beforeEach(() => {
    store = new ConsequenceStore(':memory:');
    unsubs = [registerConsequenceWritePath({ store }), registerConsequenceReadPath({ store })];
  });
  afterEach(() => {
    unsubs.forEach((u) => u());
    globalHooks.clear();
    store.close();
  });

  it('fail lặp pattern (cross-session) → persisted → suggest → hint vào prompt → tool vẫn allowed', async () => {
    // WRITE: cùng pattern fail ở 2 session khác nhau → failCountSession=1, failCountWindow=2
    // (precedence resolveDecision: session >= 2 mới escalate HITL; suggest = window pattern)
    await withRctx(() => toolResult({ sessionId: 's1', toolName: 'deploy', args: { env: 'prod' }, result: { error: 'boom' }, cycle: 1 }));
    await withRctx(() => toolResult({ sessionId: 's2', toolName: 'deploy', args: { env: 'prod' }, result: { error: 'boom' }, cycle: 1 }));
    // STORE: 2 records persisted
    const recs = store.listByTool('deploy', 10, 'user-1');
    expect(recs).toHaveLength(2);
    expect(recs.every((r) => r.outcome === 'fail')).toBe(true);

    // READ + DECISION (suggest) + REQUEST CONTEXT + PROMPT
    let ok = false;
    let hint: unknown;
    await withRctx(async () => {
      ok = await toolCall({ sessionId: 's3', toolName: 'deploy', toolArgs: { env: 'prod' }, cycle: 3 });
      hint = requestContext.getStore()?.consequenceHint;
    });
    // TOOL BEHAVIOR: suggest không block
    expect(ok).toBe(true);
    expect(hint).toBeDefined();
    const prompt = renderPrompt(hint);
    expect(prompt.some((c) => c.includes('[Consequence]') && c.includes('deploy') && c.includes('fail (7 ngày)'))).toBe(true);
  });
});

describe('PHASE 9 — E2E: SUCCESS → REUSE', () => {
  let store: ConsequenceStore;
  let unsubs: Array<() => void>;

  beforeEach(() => {
    store = new ConsequenceStore(':memory:');
    unsubs = [registerConsequenceWritePath({ store }), registerConsequenceReadPath({ store })];
  });
  afterEach(() => {
    unsubs.forEach((u) => u());
    globalHooks.clear();
    store.close();
  });

  it('2 success lặp → occurrence_count=2, reusePolicy suggest → hint success-aware vào prompt, allowed', async () => {
    // WRITE ×2 (success → recordSuccessOccurrence, cùng user/tool/digest)
    for (let i = 1; i <= 2; i++) {
      await withRctx(() => toolResult({ sessionId: 's1', toolName: 'read_file', args: { path: '/tmp/x' }, result: { content: 'ok' }, cycle: i }));
    }
    // STORE: 1 pattern row, count=2, suggest
    const recs = store.listByTool('read_file', 10, 'user-1').filter((r) => r.outcome === 'success');
    expect(recs).toHaveLength(1);
    expect(recs[0].occurrenceCount).toBe(2);
    expect(recs[0].reusePolicy).toBe('suggest');

    // READ + DECISION + REQUEST CONTEXT + PROMPT (success-aware)
    let ok = false;
    let hint: { successCount?: number; policy?: string } | undefined;
    await withRctx(async () => {
      ok = await toolCall({ sessionId: 's1', toolName: 'read_file', toolArgs: { path: '/tmp/y' }, cycle: 3 });
      hint = requestContext.getStore()?.consequenceHint;
    });
    expect(ok).toBe(true);
    expect(hint?.successCount).toBe(2);
    const prompt = renderPrompt(hint);
    expect(prompt.some((c) => c.includes('[Consequence]') && c.includes('thành công 2 lần') && c.includes('tái sử dụng'))).toBe(true);
  });
});

describe('PHASE 9 — E2E: FAILURE → HITL (real singleton)', () => {
  let store: ConsequenceStore;
  let unsubs: Array<() => void>;

  beforeEach(() => {
    resetHITLManager();
    store = new ConsequenceStore(':memory:');
    unsubs = [registerConsequenceWritePath({ store }), registerConsequenceReadPath({ store })];
  });
  afterEach(() => {
    unsubs.forEach((u) => u());
    globalHooks.clear();
    store.close();
    resetHITLManager();
  });

  async function seedRequireHitl(): Promise<{ emit: Promise<boolean>; pendingCaptured: Promise<{ id: string }> }> {
    // WRITE ×2 same session → failCountSession=2 >= HITL_FAIL_THRESHOLD_SESSION → require_hitl
    for (let i = 1; i <= 2; i++) {
      await withRctx(() => toolResult({ sessionId: 's1', toolName: 'delete_file', args: { path: '/x' }, result: { error: 'denied' }, cycle: i }));
    }
    const hitl = getHITLManager();
    let resolvePending: (r: { id: string }) => void = () => {};
    const pendingCaptured = new Promise<{ id: string }>((res) => { resolvePending = res; });
    hitl.onPending = async (request) => resolvePending(request);
    const emit = withRctx(() => toolCall({ sessionId: 's1', toolName: 'delete_file', toolArgs: { path: '/x' }, cycle: 3 }));
    return { emit, pendingCaptured };
  }

  it('2 fail qua tool:result → require_hitl → SAME instance nhận request → approve → tool chạy', async () => {
    const { emit, pendingCaptured } = await seedRequireHitl();
    const captured = await pendingCaptured;
    const hitl = getHITLManager();
    expect(hitl.getQueue().getPending()).toHaveLength(1);
    expect(hitl.getQueue().get(captured.id)?.status).toBe('pending');

    const success = hitl.resolve(captured.id, 'approved', 'tg-admin');
    expect(success).toBe(true);
    expect(await emit).toBe(true); // approved → tool chạy
  });

  it('2 fail qua tool:result → require_hitl → reject → tool bị chặn', async () => {
    const { emit, pendingCaptured } = await seedRequireHitl();
    const captured = await pendingCaptured;
    const hitl = getHITLManager();

    const success = hitl.resolve(captured.id, 'rejected', 'tg-admin');
    expect(success).toBe(true);
    expect(await emit).toBe(false); // rejected → tool không chạy
    expect(hitl.getQueue().get(captured.id)?.status).toBe('rejected');
  });
  // expire: đã chứng minh ở hitl-singleton-wiring.test.ts (test 5: TTL auto-expire → 'expired'),
  // cùng class/queue — không lặp lại ở đây.
});

describe('PHASE 9 — E2E: USER ISOLATION', () => {
  let store: ConsequenceStore;
  let unsubs: Array<() => void>;

  beforeEach(() => {
    store = new ConsequenceStore(':memory:');
    unsubs = [registerConsequenceWritePath({ store }), registerConsequenceReadPath({ store })];
  });
  afterEach(() => {
    unsubs.forEach((u) => u());
    globalHooks.clear();
    store.close();
  });

  it('User A fail lặp → User B cùng tool KHÔNG kế thừa: allow, không hint; B fail riêng → B mới bị suggest', async () => {
    // WRITE: A fail 2 lần
    for (let i = 1; i <= 2; i++) {
      await withRctx(() => toolResult({ sessionId: 'sA', toolName: 'deploy', args: { env: 'prod' }, result: { error: 'e' }, cycle: i }), { userId: 'user-a', sessionId: 'sA' });
    }
    expect(store.listByTool('deploy', 10, 'user-a')).toHaveLength(2);
    expect(store.listByTool('deploy', 10, 'user-b')).toHaveLength(0);

    // READ: B gọi cùng pattern → allow, không hint, không HITL
    let okB = false;
    let hintB: unknown;
    await withRctx(async () => {
      okB = await toolCall({ sessionId: 'sB', toolName: 'deploy', toolArgs: { env: 'prod' }, cycle: 1 });
      hintB = requestContext.getStore()?.consequenceHint;
    }, { userId: 'user-b', sessionId: 'sB' });
    expect(okB).toBe(true);
    expect(hintB).toBeUndefined();
    expect(getHITLManager().getQueue().getStats().pending).toBe(0);

    // B tự fail 2 lần → B giờ bị suggest (pattern riêng của B)
    for (let i = 1; i <= 2; i++) {
      await withRctx(() => toolResult({ sessionId: 'sB', toolName: 'deploy', args: { env: 'prod' }, result: { error: 'e' }, cycle: i }), { userId: 'user-b', sessionId: 'sB' });
    }
    let hintB2: unknown;
    await withRctx(async () => {
      await toolCall({ sessionId: 'sB', toolName: 'deploy', toolArgs: { env: 'prod' }, cycle: 3 });
      hintB2 = requestContext.getStore()?.consequenceHint;
    }, { userId: 'user-b', sessionId: 'sB' });
    expect(hintB2).toBeDefined(); // B nhìn thấy consequence CỦA B
  });
});