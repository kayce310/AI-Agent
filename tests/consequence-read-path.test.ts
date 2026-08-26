/**
 * Coral Agent — Consequence Memory Read Path Tests (ADR-003 Phase 2)
 *
 * Verifies:
 *  - lookup match theo toolName trả đúng record Phase 1
 *  - suggest path: không block, có hint/log
 *  - require_hitl: mock HITL approve → tool chạy
 *  - require_hitl: mock HITL deny → tool không chạy
 *  - lookup throw: request không crash trên suggest path (fail-open)
 *  - lesson thay đổi không đổi quyết định (cùng outcome/policy/count)
 */

import { describe, it, beforeEach, afterEach, expect, vi } from 'vitest';
import { ConsequenceStore } from '../src/core/memory/consequence-store.js';
import {
  registerConsequenceReadPath,
  resolveDecision,
  HITL_FAIL_THRESHOLD_SESSION,
  HITL_FAIL_THRESHOLD_WINDOW,
  BLOCK_FAIL_THRESHOLD_WINDOW,
  BLOCK_ALLOWLIST,
} from '../src/core/memory/consequence-read-path.js';
import {
  ConsequenceRecord,
} from '../src/core/memory/consequence-types.js';
import { globalHooks } from '../src/core/hooks.js';

function makeRecord(overrides: Partial<ConsequenceRecord> = {}): ConsequenceRecord {
  return {
    id: `rec-${Math.random().toString(36).slice(2)}`,
    createdAt: Date.now(),
    sessionId: 's1',
    taskId: 't1',
    context: { tags: ['tool_result'] },
    action: { toolName: 'some_tool' },
    outcome: 'fail',
    evidenceRef: { cycle: 1, checkpointId: 't1' },
    reusePolicy: 'record_only',
    ...overrides,
  };
}

describe('ConsequenceStore.findRelevantForToolCall', () => {
  let store: ConsequenceStore;

  beforeEach(() => {
    store = new ConsequenceStore(':memory:');
  });

  afterEach(() => {
    store.close();
  });

  it('should match records by toolName and return failCountSession + maxPolicy', () => {
    store.append(makeRecord({ action: { toolName: 'deploy' }, outcome: 'fail', reusePolicy: 'record_only' }));
    store.append(makeRecord({ action: { toolName: 'deploy' }, outcome: 'fail', reusePolicy: 'suggest' }));
    store.append(makeRecord({ action: { toolName: 'other' }, outcome: 'fail' }));

    const lookup = store.findRelevantForToolCall({ toolName: 'deploy', sessionId: 's1' });
    expect(lookup.matched).toHaveLength(2);
    expect(lookup.failCountSession).toBe(2);
    expect(lookup.failCountWindow).toBe(2); // cùng session cũng nằm trong window
    expect(lookup.maxPolicy).toBe('suggest');
    expect(lookup.evidenceIds).toHaveLength(2);
  });

  it('should fallback to cross-session when no records in session', () => {
    store.append(makeRecord({ action: { toolName: 'deploy' }, outcome: 'fail', sessionId: 'other-session' }));
    const lookup = store.findRelevantForToolCall({ toolName: 'deploy', sessionId: 's1' });
    expect(lookup.matched).toHaveLength(1); // fallback cross-session
    expect(lookup.failCountSession).toBe(0);
    expect(lookup.failCountWindow).toBe(1); // cross-session window count
  });

  it('should return empty when no match', () => {
    const lookup = store.findRelevantForToolCall({ toolName: 'nothing', sessionId: 's1' });
    expect(lookup.matched).toHaveLength(0);
    expect(lookup.maxPolicy).toBe('record_only');
    expect(lookup.failCountSession).toBe(0);
    expect(lookup.failCountWindow).toBe(0);
  });
});

describe('resolveDecision', () => {
  it('should resolve block > require_hitl > suggest > record_only', () => {
    expect(resolveDecision({ maxPolicy: 'block', failCountSession: 0, failCountWindow: 0, evidenceIds: [] })).toMatchObject({ action: 'allow' }); // block ngoài allowlist chưa enforce
    expect(resolveDecision({ maxPolicy: 'require_hitl', failCountSession: 1, failCountWindow: 1, evidenceIds: [] })).toMatchObject({ action: 'require_hitl' });
    expect(resolveDecision({ maxPolicy: 'suggest', failCountSession: 1, failCountWindow: 1, evidenceIds: [] })).toMatchObject({ action: 'suggest' });
    expect(resolveDecision({ maxPolicy: 'record_only', failCountSession: 0, failCountWindow: 0, evidenceIds: [] })).toMatchObject({ action: 'allow' });
  });

  it('should enforce block only when tool in allowlist + threshold + evidence', () => {
    // Tool trong allowlist + đủ ngưỡng + evidence + enforceBlock → block
    const d = resolveDecision(
      { maxPolicy: 'block', failCountSession: 3, failCountWindow: BLOCK_FAIL_THRESHOLD_WINDOW, evidenceIds: ['a', 'b'] },
      { toolName: 'danger_tool', blockAllowlist: ['danger_tool'], enforceBlock: true },
    );
    expect(d.action).toBe('block');
    expect(d.reasonCode).toBe('consequence_block_allowlist');
  });

  it('should NOT block when tool not in allowlist (fallback HITL/allow)', () => {
    // Tool KHÔNG trong allowlist + policy block → không hard-deny
    const d = resolveDecision(
      { maxPolicy: 'block', failCountSession: 3, failCountWindow: 10, evidenceIds: ['a'] },
      { toolName: 'normal_tool', blockAllowlist: ['danger_tool'], enforceBlock: true },
    );
    expect(d.action).not.toBe('block');
  });

  it('should NOT block when below window threshold even if in allowlist', () => {
    const d = resolveDecision(
      { maxPolicy: 'block', failCountSession: 1, failCountWindow: 2, evidenceIds: ['a'] },
      { toolName: 'danger_tool', blockAllowlist: ['danger_tool'], enforceBlock: true },
    );
    expect(d.action).not.toBe('block');
  });

  it('should require HITL when failCountSession >= threshold', () => {
    const d = resolveDecision({
      maxPolicy: 'record_only',
      failCountSession: HITL_FAIL_THRESHOLD_SESSION,
      failCountWindow: 1,
      evidenceIds: ['a', 'b'],
    });
    expect(d.action).toBe('require_hitl');
    expect(d.reasonCode).toBe('consequence_require_hitl_session');
  });

  it('should require HITL when failCountWindow >= threshold (cross-session)', () => {
    const d = resolveDecision({
      maxPolicy: 'record_only',
      failCountSession: 0,
      failCountWindow: HITL_FAIL_THRESHOLD_WINDOW,
      evidenceIds: ['a', 'b', 'c'],
    });
    expect(d.action).toBe('require_hitl');
    expect(d.reasonCode).toBe('consequence_require_hitl_window');
  });
});

describe('Consequence Read Path — guard on tool:call', () => {
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

  it('should allow tool when no records (record_only/allow)', async () => {
    unsub = registerConsequenceReadPath({ store });
    const ok = await globalHooks.emit('tool:call', {
      sessionId: 's1',
      toolName: 'fresh_tool',
      cycle: 1,
    });
    expect(ok).toBe(true);
  });

  it('should allow tool on suggest path (không block) + log hint', async () => {
    store.append(makeRecord({ action: { toolName: 'deploy' }, outcome: 'fail', reusePolicy: 'suggest' }));
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    unsub = registerConsequenceReadPath({ store });
    const ok = await globalHooks.emit('tool:call', {
      sessionId: 's1',
      toolName: 'deploy',
      cycle: 1,
    });
    expect(ok).toBe(true); // suggest không block
    logSpy.mockRestore();
  });

  it('should run tool when HITL approves', async () => {
    store.append(makeRecord({ action: { toolName: 'danger' }, outcome: 'fail', reusePolicy: 'require_hitl' }));
    const hitlMock = {
      checkAndRequest: vi.fn().mockResolvedValue('approved'),
    };
    unsub = registerConsequenceReadPath({ store, hitl: hitlMock as any });
    const ok = await globalHooks.emit('tool:call', {
      sessionId: 's1',
      toolName: 'danger',
      cycle: 1,
    });
    expect(ok).toBe(true); // approved → tool chạy
    expect(hitlMock.checkAndRequest).toHaveBeenCalledTimes(1);
  });

  it('should block tool when HITL denies', async () => {
    store.append(makeRecord({ action: { toolName: 'danger' }, outcome: 'fail', reusePolicy: 'require_hitl' }));
    const hitlMock = {
      checkAndRequest: vi.fn().mockResolvedValue('rejected'),
    };
    unsub = registerConsequenceReadPath({ store, hitl: hitlMock as any });
    const ok = await globalHooks.emit('tool:call', {
      sessionId: 's1',
      toolName: 'danger',
      cycle: 1,
    });
    expect(ok).toBe(false); // denied → tool không chạy
    expect(hitlMock.checkAndRequest).toHaveBeenCalledTimes(1);
  });

  it('should block tool when HITL expires', async () => {
    store.append(makeRecord({ action: { toolName: 'danger' }, outcome: 'fail', reusePolicy: 'require_hitl' }));
    const hitlMock = {
      checkAndRequest: vi.fn().mockResolvedValue('expired'),
    };
    unsub = registerConsequenceReadPath({ store, hitl: hitlMock as any });
    const ok = await globalHooks.emit('tool:call', {
      sessionId: 's1',
      toolName: 'danger',
      cycle: 1,
    });
    expect(ok).toBe(false);
  });

  it('should fail-open: lookup throw không crash request (suggest path)', async () => {
    // store bị đóng → lookup throw → fail-open → allow
    const closedStore = new ConsequenceStore(':memory:');
    closedStore.close();
    unsub = registerConsequenceReadPath({ store: closedStore });
    const ok = await globalHooks.emit('tool:call', {
      sessionId: 's1',
      toolName: 'deploy',
      cycle: 1,
    });
    expect(ok).toBe(true); // không crash, cho qua
  });

  it('should require HITL when failCountSession >= threshold even with record_only policy', async () => {
    store.append(makeRecord({ action: { toolName: 'deploy' }, outcome: 'fail', reusePolicy: 'record_only' }));
    store.append(makeRecord({ action: { toolName: 'deploy' }, outcome: 'fail', reusePolicy: 'record_only' }));
    const hitlMock = {
      checkAndRequest: vi.fn().mockResolvedValue('approved'),
    };
    unsub = registerConsequenceReadPath({ store, hitl: hitlMock as any });
    const ok = await globalHooks.emit('tool:call', {
      sessionId: 's1',
      toolName: 'deploy',
      cycle: 1,
    });
    expect(ok).toBe(true); // approved
    expect(hitlMock.checkAndRequest).toHaveBeenCalledTimes(1); // HITL được hỏi
  });

  it('should require HITL from cross-session window signal (failCountWindow >= threshold)', async () => {
    // Session khác (s2) đã fail tool 'deploy' nhiều lần → session s1 cùng tool bị HITL
    store.append(makeRecord({ action: { toolName: 'deploy' }, outcome: 'fail', sessionId: 's2' }));
    store.append(makeRecord({ action: { toolName: 'deploy' }, outcome: 'fail', sessionId: 's2' }));
    store.append(makeRecord({ action: { toolName: 'deploy' }, outcome: 'fail', sessionId: 's2' }));
    const hitlMock = {
      checkAndRequest: vi.fn().mockResolvedValue('approved'),
    };
    unsub = registerConsequenceReadPath({ store, hitl: hitlMock as any });
    const ok = await globalHooks.emit('tool:call', {
      sessionId: 's1',
      toolName: 'deploy',
      cycle: 1,
    });
    expect(ok).toBe(true); // approved
    expect(hitlMock.checkAndRequest).toHaveBeenCalledTimes(1); // HITL hỏi dù session s1 chưa fail
  });

  it('lesson thay đổi không đổi quyết định (cùng outcome/policy/count)', async () => {
    // Cùng tool, cùng failCount=1, cùng policy suggest — lesson khác nhau
    const r1 = makeRecord({ action: { toolName: 'deploy' }, outcome: 'fail', reusePolicy: 'suggest', lesson: 'Lỗi mạng' });
    const r2 = makeRecord({ action: { toolName: 'deploy' }, outcome: 'fail', reusePolicy: 'suggest', lesson: 'Một câu chuyện hoàn toàn khác về lỗi' });
    const decision1 = resolveDecision({ maxPolicy: r1.reusePolicy, failCountSession: 1, failCountWindow: 1, evidenceIds: [r1.id] });
    const decision2 = resolveDecision({ maxPolicy: r2.reusePolicy, failCountSession: 1, failCountWindow: 1, evidenceIds: [r2.id] });
    expect(decision1.action).toBe(decision2.action); // lesson không ảnh hưởng
    expect(decision1.action).toBe('suggest');
  });
});