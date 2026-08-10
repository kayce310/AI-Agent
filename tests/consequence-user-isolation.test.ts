import { describe, it, beforeEach, afterEach, expect } from 'vitest';
import { ConsequenceStore } from '../src/core/memory/consequence-store.js';
import { requestContext, RequestContext } from '../src/core/request-context.js';
import { registerConsequenceWritePath } from '../src/core/memory/consequence-write-path.js';
import { globalHooks } from '../src/core/hooks.js';
import { ConsequenceRecord } from '../src/core/memory/consequence-types.js';

// ═══ Q3 — userId isolation cho Consequence Memory ═══
// 1) append() stamp userId từ request context (record không userId + ngoài rctx → fail-loud)
// 2) query window (session + 7 ngày) filter theo userId — record cũ (không userId) bị loại khỏi đếm multi-user
// 3) subagent emit tool:result trong rctx của parent → kế thừa đúng userId gốc qua AsyncLocalStorage

function makeRctx(userId: string, sessionId = 's1'): RequestContext {
  return {
    sessionId,
    taskId: `t-${userId}`,
    userId,
    evidenceLog: new Map(),
    onPlanCreated: () => {},
  };
}
function withRctx<T>(userId: string, sessionId: string, fn: () => T): T {
  return requestContext.run(makeRctx(userId, sessionId), fn);
}

function makeRec(overrides: Partial<ConsequenceRecord> = {}): ConsequenceRecord {
  return {
    id: `rec-${Math.random().toString(36).slice(2)}`,
    createdAt: Date.now(),
    userId: 'user-a',
    sessionId: 's1',
    taskId: 't1',
    context: { tags: ['tool_result'] },
    action: { toolName: 'some_tool' },
    outcome: 'fail',
    evidenceRef: { checkpointId: 't1' },
    reusePolicy: 'record_only',
    ...overrides,
  };
}

describe('Q3 — userId isolation: cách ly 2 user', () => {
  let store: ConsequenceStore;
  let unsub: (() => void) | null = null;

  beforeEach(() => {
    store = new ConsequenceStore(':memory:');
    unsub = registerConsequenceWritePath({ store });
  });

  afterEach(() => {
    if (unsub) { unsub(); unsub = null; }
    globalHooks.clear();
    store.close();
  });

  it('fail của user A (cross-session) KHÔNG đếm vào window của user B', async () => {
    // user A fail browser_tool 3 lần, 3 session khác nhau (cross-session window)
    await withRctx('user-a', 'sA1', () => globalHooks.emit('tool:result', {
      sessionId: 'sA1', toolName: 'browser_tool', args: { url: 'https://x' }, result: { error: 'e1' }, cycle: 1,
    }));
    await withRctx('user-a', 'sA2', () => globalHooks.emit('tool:result', {
      sessionId: 'sA2', toolName: 'browser_tool', args: { url: 'https://x' }, result: { error: 'e2' }, cycle: 1,
    }));
    await withRctx('user-a', 'sA3', () => globalHooks.emit('tool:result', {
      sessionId: 'sA3', toolName: 'browser_tool', args: { url: 'https://x' }, result: { error: 'e3' }, cycle: 1,
    }));

    // user B lookup → KHÔNG thấy gì của A
    const resB = store.findRelevantForToolCall({ toolName: 'browser_tool', userId: 'user-b', sessionId: 'sB1' });
    expect(resB.failCountWindow).toBe(0);
    expect(resB.failCountSession).toBe(0);
    expect(resB.matched).toHaveLength(0);

    // user B tự fail 2 lần → window đếm đúng 2 của B
    await withRctx('user-b', 'sB1', () => globalHooks.emit('tool:result', {
      sessionId: 'sB1', toolName: 'browser_tool', args: { url: 'https://x' }, result: { error: 'e4' }, cycle: 1,
    }));
    await withRctx('user-b', 'sB1', () => globalHooks.emit('tool:result', {
      sessionId: 'sB1', toolName: 'browser_tool', args: { url: 'https://x' }, result: { error: 'e5' }, cycle: 2,
    }));
    const resB2 = store.findRelevantForToolCall({ toolName: 'browser_tool', userId: 'user-b', sessionId: 'sB1' });
    expect(resB2.failCountWindow).toBe(2);
    expect(resB2.failCountSession).toBe(2);

    // user A vẫn thấy đúng 3 của mình, không lẫn record của B
    const resA = store.findRelevantForToolCall({ toolName: 'browser_tool', userId: 'user-a', sessionId: 'sA4' });
    expect(resA.failCountWindow).toBe(3);
    expect(resA.matched.some((r) => r.userId === 'user-b')).toBe(false);
  });

  it('subagent emit tool:result giữ đúng userId gốc qua AsyncLocalStorage', async () => {
    // Mô phỏng path subagent: delegate emit tool:result qua globalHooks
    // TRONG request context của parent → record phải mang userId của parent.
    await withRctx('user-root', 's-root', () => globalHooks.emit('tool:result', {
      sessionId: 's-root', toolName: 'delegate_task', args: { goal: 'x' }, result: { error: 'subagent failed' }, cycle: 5,
    }));
    const recs = store.listRecent({ toolName: 'delegate_task' });
    expect(recs).toHaveLength(1);
    expect(recs[0].userId).toBe('user-root');
    expect(recs[0].sessionId).toBe('s-root');
  });

  it('append fail-loud khi record không userId và không có request context', () => {
    const rec = {
      id: 'rec-x',
      createdAt: Date.now(),
      sessionId: 's1',
      context: { tags: ['tool_result'] },
      action: { toolName: 'some_tool' },
      outcome: 'fail',
      evidenceRef: {},
      reusePolicy: 'record_only',
    } as unknown as ConsequenceRecord;
    // record thiếu userId + gọi ngoài rctx → THROW (không ghi record rác)
    expect(() => store.append(rec)).toThrow(/userId/);
  });

  it('record cũ (không userId, trước Q3) bị loại khỏi đếm multi-user; không backfill', () => {
    // record MỚI của user-a (có userId)
    store.append(makeRec({ action: { toolName: 'browser_tool' } }));
    // record CŨ kiểu trước Q3: payload không userId, cột user_id NULL — mô phỏng DB cũ
    const oldRec = JSON.stringify({
      id: 'rec-old', createdAt: Date.now(), sessionId: 's-old',
      context: { tags: ['tool_result'] }, action: { toolName: 'browser_tool' },
      outcome: 'fail', evidenceRef: {}, reusePolicy: 'record_only',
    });
    (store as unknown as { db: { prepare(sql: string): { run(...args: unknown[]): unknown } } })
      .db.prepare(
        `INSERT INTO consequences
          (id, created_at, user_id, session_id, task_id, agent_id,
           tool_name, outcome, reuse_policy, evidence_ref, context_json, action_json, payload_json)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      )
      .run(
        'rec-old', Date.now(), null, 's-old', null, null,
        'browser_tool', 'fail', 'record_only', '{}', '{"tags":["tool_result"]}',
        '{"toolName":"browser_tool"}', oldRec,
      );

    // query CÓ userId → record cũ không đếm (undefined !== userId), không suy đoán/backfill
    const resUser = store.findRelevantForToolCall({ toolName: 'browser_tool', userId: 'user-b', sessionId: 'sB' });
    expect(resUser.failCountWindow).toBe(0);
    expect(resUser.matched).toHaveLength(0);

    // listByTool theo userId → record cũ loại, chỉ thấy record của user tương ứng
    expect(store.listByTool('browser_tool', 10, 'user-b')).toHaveLength(0);
    expect(store.listByTool('browser_tool', 10, 'user-a')).toHaveLength(1);

    // caller cũ không truyền userId → hành vi cũ giữ nguyên (record cũ vẫn đếm)
    const resNoUser = store.findRelevantForToolCall({ toolName: 'browser_tool', sessionId: 'sB' });
    expect(resNoUser.failCountWindow).toBe(2);
  });
});
