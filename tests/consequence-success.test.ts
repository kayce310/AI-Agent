/**
 * Coral Agent — Consequence Memory: Reusable Success (Phase 5)
 *
 * Verifies (contract Phase 5):
 *  - first success → pattern row count=1, record_only
 *  - repeated cùng user/tool/digest → count tăng, vẫn 1 row
 *  - count=2 (SUCCESS_SUGGEST_THRESHOLD) → reusePolicy 'suggest'
 *  - user khác không share count
 *  - success không argsDigest → bị bỏ qua (write path)
 *  - success suggest → hint success-aware đúng (guard + render)
 */

import { describe, it, beforeEach, afterEach, expect } from 'vitest';
import { ConsequenceStore, SUCCESS_SUGGEST_THRESHOLD } from '../src/core/memory/consequence-store.js';
import { registerConsequenceWritePath } from '../src/core/memory/consequence-write-path.js';
import {
  registerConsequenceReadPath,
  buildSuccessSuggestHint,
  renderConsequenceHint,
} from '../src/core/memory/consequence-read-path.js';
import { globalHooks } from '../src/core/hooks.js';
import { requestContext, RequestContext } from '../src/core/request-context.js';

function makeRctx(opts: { userId?: string; sessionId?: string; taskId?: string } = {}): RequestContext {
  return {
    sessionId: opts.sessionId ?? 's1',
    taskId: opts.taskId ?? 't1',
    userId: opts.userId ?? 'user-1',
    evidenceLog: new Map(),
    onPlanCreated: () => {},
  };
}
function withRctx<T>(fn: () => T, opts: { userId?: string; sessionId?: string; taskId?: string } = {}): T {
  return requestContext.run(makeRctx(opts), fn);
}
async function emitToolResult(payload: unknown): Promise<void> {
  await withRctx(() => globalHooks.emit('tool:result', payload as never));
}

describe('ConsequenceStore.recordSuccessOccurrence', () => {
  let store: ConsequenceStore;

  beforeEach(() => {
    store = new ConsequenceStore(':memory:');
  });
  afterEach(() => {
    store.close();
  });

  it('first success → pattern row count=1, record_only, evidenceRef đủ', () => {
    const rec = withRctx(() => store.recordSuccessOccurrence({
      toolName: 'read_file',
      argsDigest: 'path',
      cycle: 1,
    }));
    expect(rec.outcome).toBe('success');
    expect(rec.occurrenceCount).toBe(1);
    expect(rec.reusePolicy).toBe('record_only');
    expect(rec.action.argsDigest).toBe('path');
    expect(rec.evidenceRef.cycle).toBe(1);
    expect(store.listRecent()).toHaveLength(1); // 1 row per pattern, không phải per call
  });

  it('repeat cùng user/tool/digest → count tăng, vẫn 1 row', () => {
    const first = withRctx(() => store.recordSuccessOccurrence({ toolName: 'read_file', argsDigest: 'path' }));
    const second = withRctx(() => store.recordSuccessOccurrence({ toolName: 'read_file', argsDigest: 'path' }));
    expect(second.id).toBe(first.id); // deterministic id
    expect(second.occurrenceCount).toBe(2);
    expect(second.reusePolicy).toBe('suggest'); // threshold = 2
    expect(second.evidenceRef).toEqual(first.evidenceRef); // evidenceRef gốc giữ nguyên
    expect(store.listRecent()).toHaveLength(1);
  });

  it(`count >= SUCCESS_SUGGEST_THRESHOLD (${SUCCESS_SUGGEST_THRESHOLD}) → suggest`, () => {
    const rec = withRctx(() => {
      store.recordSuccessOccurrence({ toolName: 'deploy', argsDigest: 'env,region' });
      return store.recordSuccessOccurrence({ toolName: 'deploy', argsDigest: 'env,region' });
    });
    expect(rec.occurrenceCount).toBe(2);
    expect(rec.reusePolicy).toBe('suggest');
  });

  it('user khác không share count', () => {
    withRctx(() => store.recordSuccessOccurrence({ toolName: 'read_file', argsDigest: 'path' }), { userId: 'user-1' });
    const rec = withRctx(() => store.recordSuccessOccurrence({ toolName: 'read_file', argsDigest: 'path' }), { userId: 'user-2' });
    expect(rec.occurrenceCount).toBe(1); // user-2 bắt đầu từ 0
    expect(rec.reusePolicy).toBe('record_only');
    expect(store.listRecent()).toHaveLength(2); // 2 pattern rows riêng biệt
  });

  it('digest khác → pattern khác, không cộng dồn', () => {
    withRctx(() => store.recordSuccessOccurrence({ toolName: 'read_file', argsDigest: 'path' }));
    const rec = withRctx(() => store.recordSuccessOccurrence({ toolName: 'read_file', argsDigest: 'path,offset' }));
    expect(rec.occurrenceCount).toBe(1);
    expect(store.listRecent()).toHaveLength(2);
  });
});

describe('Consequence Write Path — success (Phase 5)', () => {
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

  it('success có args (digest) → tạo pattern row count=1', async () => {
    await emitToolResult({
      sessionId: 's1',
      toolName: 'read_file',
      args: { path: '/tmp/x' },
      result: { content: 'ok' },
      cycle: 1,
    });
    const recs = store.listRecent();
    expect(recs).toHaveLength(1);
    expect(recs[0].outcome).toBe('success');
    expect(recs[0].occurrenceCount).toBe(1);
    expect(recs[0].action.argsDigest).toBe('path');
  });

  it('success không args → bị bỏ qua (không ghi mọi success)', async () => {
    await emitToolResult({
      sessionId: 's1',
      toolName: 'noop_tool',
      result: { ok: true },
      cycle: 1,
    });
    expect(store.listRecent()).toHaveLength(0);
  });

  it('2 lần success cùng pattern qua write path → suggest', async () => {
    for (let i = 0; i < 2; i++) {
      await emitToolResult({
        sessionId: 's1',
        toolName: 'read_file',
        args: { path: '/tmp/x' },
        result: { content: 'ok' },
        cycle: i + 1,
      });
    }
    const recs = store.listRecent();
    expect(recs).toHaveLength(1);
    expect(recs[0].occurrenceCount).toBe(2);
    expect(recs[0].reusePolicy).toBe('suggest');
  });
});

describe('Consequence Read Path — success suggest hint (Phase 5)', () => {
  let store: ConsequenceStore;
  let unsub: (() => void) | null = null;

  beforeEach(() => {
    store = new ConsequenceStore(':memory:');
  });
  afterEach(() => {
    if (unsub) { unsub(); unsub = null; }
    globalHooks.clear();
    store.close();
  });

  it('buildSuccessSuggestHint mô tả số lần success', () => {
    const hint = buildSuccessSuggestHint('read_file', 2);
    expect(hint).toContain('read_file');
    expect(hint).toContain('2');
    expect(hint).toContain('thành công');
  });

  it('renderConsequenceHint success-aware khi successCount có', () => {
    const rendered = renderConsequenceHint({
      toolName: 'read_file',
      policy: 'suggest',
      failCountSession: 0,
      failCountWindow: 0,
      successCount: 2,
    });
    expect(rendered).toContain('thành công 2 lần');
    expect(rendered).toContain('tái sử dụng');
    expect(rendered).not.toContain('fail (session)');
  });

  it('renderConsequenceHint giữ nguyên fail text khi không có successCount', () => {
    const rendered = renderConsequenceHint({
      toolName: 'deploy',
      policy: 'suggest',
      failCountSession: 2,
      failCountWindow: 3,
    });
    expect(rendered).toContain('2 fail (session) / 3 fail (7 ngày)');
    expect(rendered).not.toContain('thành công');
  });

  it('guard: suggest từ pattern success proven → rctx hint successCount=2', async () => {
    // Pattern success đã proven (count=2 → suggest) — dựng thẳng qua store.
    withRctx(() => {
      store.recordSuccessOccurrence({ toolName: 'read_file', argsDigest: 'path' });
      store.recordSuccessOccurrence({ toolName: 'read_file', argsDigest: 'path' });
    });
    unsub = registerConsequenceReadPath({ store });

    const hint = await withRctx(async () => {
      const ok = await globalHooks.emit('tool:call', {
        sessionId: 's1',
        toolName: 'read_file',
        toolArgs: { path: '/tmp/y' },
        cycle: 3,
      });
      expect(ok).toBe(true); // suggest không block
      return requestContext.getStore()?.consequenceHint;
    });
    expect(hint?.successCount).toBe(2);
    expect(hint?.policy).toBe('suggest');
    expect(renderConsequenceHint(hint!)).toContain('thành công 2 lần');
  });

  it('guard: fail suggest vẫn dùng fail hint (không successCount)', async () => {
    store.append({
      id: 'fail-1',
      createdAt: Date.now(),
      userId: 'user-1',
      sessionId: 's1',
      taskId: 't1',
      context: { tags: ['tool_result'] },
      action: { toolName: 'deploy', argsDigest: 'env' },
      outcome: 'fail',
      evidenceRef: {},
      reusePolicy: 'suggest',
    });
    unsub = registerConsequenceReadPath({ store });

    const hint = await withRctx(async () => {
      await globalHooks.emit('tool:call', {
        sessionId: 's1',
        toolName: 'deploy',
        toolArgs: { env: 'prod' },
        cycle: 3,
      });
      return requestContext.getStore()?.consequenceHint;
    });
    expect(hint?.successCount).toBeUndefined();
    expect(renderConsequenceHint(hint!)).toContain('fail (session)');
  });
});
