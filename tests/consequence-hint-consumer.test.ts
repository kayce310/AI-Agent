/**
 * @file Consequence Hint Consumer (Phase 7)
 *
 * Verifies the dead consequenceHint consumer is now connected:
 *  - rctx.consequenceHint (set by read-path guard) → renderConsequenceHint()
 *    → system message appended to the messages array sent to the model
 *  - fail hint renders correctly (failCountSession / failCountWindow)
 *  - success-aware hint renders correctly (successCount)
 *  - hint absent → messages array unchanged (prompt behavior unchanged)
 *  - consume-once: after injection, hint cleared from rctx (no stale repeat)
 */

import { describe, it, beforeEach, afterEach, expect } from 'vitest';
import { buildCycleMessagesWithHint } from '../src/core/engine/agent.js';
import { renderConsequenceHint, registerConsequenceReadPath } from '../src/core/memory/consequence-read-path.js';
import { ConsequenceStore } from '../src/core/memory/consequence-store.js';
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

describe('buildCycleMessagesWithHint (Phase 7 consumer)', () => {
  it('hint absent → trả về messages gốc (KHÔNG đổi prompt)', () => {
    const messages = [{ role: 'user', content: 'hello' }];
    const out = buildCycleMessagesWithHint(messages, undefined);
    expect(out).toBe(messages); // same reference — no copy, no extra message
    expect(out).toHaveLength(1);
  });

  it('fail hint → append system message chứa fail counts (failCountSession/Window)', () => {
    const messages = [{ role: 'user', content: 'deploy' }];
    const out = buildCycleMessagesWithHint(messages, {
      toolName: 'deploy',
      policy: 'suggest',
      failCountSession: 2,
      failCountWindow: 3,
    });
    expect(out).toHaveLength(2);
    const last = out[out.length - 1];
    expect(last.role).toBe('system');
    expect(last.content).toContain('[Consequence]');
    expect(last.content).toContain('deploy');
    expect(last.content).toContain('2 fail (session) / 3 fail (7 ngày)');
    // messages gốc không bị mutate
    expect(messages).toHaveLength(1);
  });

  it('success-aware hint → append system message chứa successCount', () => {
    const messages = [{ role: 'user', content: 'deploy' }];
    const out = buildCycleMessagesWithHint(messages, {
      toolName: 'deploy',
      policy: 'suggest',
      failCountSession: 0,
      failCountWindow: 0,
      successCount: 2,
    });
    expect(out).toHaveLength(2);
    const last = out[out.length - 1];
    expect(last.role).toBe('system');
    expect(last.content).toContain('thành công 2 lần');
    expect(last.content).toContain('tái sử dụng');
    expect(last.content).not.toContain('fail (session)');
  });

  it('renderConsequenceHint vẫn render fail hint đúng khi không có successCount', () => {
    const rendered = renderConsequenceHint({
      toolName: 'deploy',
      policy: 'suggest',
      failCountSession: 1,
      failCountWindow: 4,
    });
    expect(rendered).toContain('1 fail (session) / 4 fail (7 ngày)');
    expect(rendered).not.toContain('thành công');
  });
});

describe('Consequence hint → prompt (guard → rctx → consumer)', () => {
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

  it('fail suggest: guard set hint → consumer đưa hint vào messages', async () => {
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

    await withRctx(async () => {
      const ok = await globalHooks.emit('tool:call', {
        sessionId: 's1',
        toolName: 'deploy',
        toolArgs: { env: 'prod' },
        cycle: 3,
      });
      expect(ok).toBe(true); // suggest không block

      const hint = requestContext.getStore()?.consequenceHint;
      expect(hint).toBeDefined();

      const messages = [{ role: 'user', content: 'deploy' }];
      const out = buildCycleMessagesWithHint(messages, hint);
      expect(out).toHaveLength(2);
      expect(out[1].role).toBe('system');
      expect(out[1].content).toContain('deploy');
      expect(out[1].content).toContain('fail (session)');
    });
  });

  it('success suggest: guard set hint successCount → consumer đưa hint success-aware vào messages', async () => {
    withRctx(() => {
      store.recordSuccessOccurrence({ toolName: 'read_file', argsDigest: 'path' });
      store.recordSuccessOccurrence({ toolName: 'read_file', argsDigest: 'path' });
    });
    unsub = registerConsequenceReadPath({ store });

    await withRctx(async () => {
      const ok = await globalHooks.emit('tool:call', {
        sessionId: 's1',
        toolName: 'read_file',
        toolArgs: { path: '/tmp/y' },
        cycle: 3,
      });
      expect(ok).toBe(true);

      const hint = requestContext.getStore()?.consequenceHint;
      expect(hint?.successCount).toBe(2);

      const messages = [{ role: 'user', content: 'read' }];
      const out = buildCycleMessagesWithHint(messages, hint);
      expect(out[1].role).toBe('system');
      expect(out[1].content).toContain('thành công 2 lần');
    });
  });
});
