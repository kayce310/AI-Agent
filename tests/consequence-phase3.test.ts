/**
 * Coral Agent — Consequence Memory Phase 3 Tests (cross-session aggregation + narrow block)
 *
 * Verifies:
 *  - Hai session khác nhau, cùng tool fail → failCountWindow tăng đúng
 *  - Ngoài window → không tính
 *  - argsDigest match (secondary key)
 *  - Window threshold chạm → HITL (mock)
 *  - Tool không trong allowlist + policy block → không hard-deny
 *  - Tool trong allowlist + đủ ngưỡng + evidence → deny
 *  - lesson khác nhau không đổi quyết định
 */

import { describe, it, beforeEach, afterEach, expect, vi } from 'vitest';
import { ConsequenceStore } from '../src/core/memory/consequence-store.js';
import {
  registerConsequenceReadPath,
  resolveDecision,
  HITL_FAIL_THRESHOLD_WINDOW,
  BLOCK_FAIL_THRESHOLD_WINDOW,
} from '../src/core/memory/consequence-read-path.js';
import { ConsequenceRecord } from '../src/core/memory/consequence-types.js';
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

describe('ConsequenceStore — cross-session window aggregation', () => {
  let store: ConsequenceStore;

  beforeEach(() => {
    store = new ConsequenceStore(':memory:');
  });

  afterEach(() => {
    store.close();
  });

  it('should count failCountWindow across different sessions', () => {
    store.append(makeRecord({ action: { toolName: 'deploy' }, outcome: 'fail', sessionId: 'sA' }));
    store.append(makeRecord({ action: { toolName: 'deploy' }, outcome: 'fail', sessionId: 'sB' }));
    store.append(makeRecord({ action: { toolName: 'deploy' }, outcome: 'fail', sessionId: 'sC' }));

    const lookup = store.findRelevantForToolCall({ toolName: 'deploy', sessionId: 'sX' });
    expect(lookup.failCountWindow).toBe(3); // cross-session
    expect(lookup.failCountSession).toBe(0); // session sX chưa fail
  });

  it('should NOT count records outside the window', () => {
    const old = Date.now() - 30 * 24 * 3600 * 1000; // 30 ngày trước
    store.append(makeRecord({ action: { toolName: 'deploy' }, outcome: 'fail', createdAt: old }));
    store.append(makeRecord({ action: { toolName: 'deploy' }, outcome: 'fail', createdAt: old }));

    const lookup = store.findRelevantForToolCall({
      toolName: 'deploy',
      sessionId: 's1',
      windowMs: 7 * 24 * 3600 * 1000, // 7 ngày
    });
    expect(lookup.failCountWindow).toBe(0); // ngoài window → không tính
  });

  it('should match by argsDigest (secondary key)', () => {
    store.append(makeRecord({ action: { toolName: 'deploy', argsDigest: 'env,region' }, outcome: 'fail' }));
    store.append(makeRecord({ action: { toolName: 'deploy', argsDigest: 'env,region' }, outcome: 'fail' }));
    store.append(makeRecord({ action: { toolName: 'deploy', argsDigest: 'other' }, outcome: 'fail' }));

    const lookup = store.findRelevantForToolCall({
      toolName: 'deploy',
      argsDigest: 'env,region',
      sessionId: 's1',
    });
    expect(lookup.failCountWindow).toBe(2); // chỉ digest khớp
  });
});

describe('Consequence Read Path — Phase 3 narrow block', () => {
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

  it('should NOT hard-deny tool not in allowlist even with block policy', async () => {
    // Tool 'normal_tool' có policy block nhưng KHÔNG trong allowlist → không deny
    for (let i = 0; i < BLOCK_FAIL_THRESHOLD_WINDOW; i++) {
      store.append(makeRecord({ action: { toolName: 'normal_tool' }, outcome: 'fail', reusePolicy: 'block' }));
    }
    const hitlMock = { checkAndRequest: vi.fn().mockResolvedValue('approved') };
    unsub = registerConsequenceReadPath({
      store,
      hitl: hitlMock as any,
      enforceBlock: true,
      blockAllowlist: ['danger_tool'], // normal_tool không trong allowlist
    });
    const ok = await globalHooks.emit('tool:call', {
      sessionId: 's1',
      toolName: 'normal_tool',
      cycle: 1,
    });
    // Không hard-deny — fallback HITL (approved) hoặc allow
    expect(ok).toBe(true);
  });

  it('should deny tool in allowlist + threshold + evidence', async () => {
    for (let i = 0; i < BLOCK_FAIL_THRESHOLD_WINDOW; i++) {
      store.append(makeRecord({ action: { toolName: 'danger_tool' }, outcome: 'fail', reusePolicy: 'block' }));
    }
    const hitlMock = { checkAndRequest: vi.fn() };
    unsub = registerConsequenceReadPath({
      store,
      hitl: hitlMock as any,
      enforceBlock: true,
      blockAllowlist: ['danger_tool'],
    });
    const ok = await globalHooks.emit('tool:call', {
      sessionId: 's1',
      toolName: 'danger_tool',
      cycle: 1,
    });
    expect(ok).toBe(false); // deny
    expect(hitlMock.checkAndRequest).not.toHaveBeenCalled(); // không hỏi HITL, block thẳng
  });

  it('should NOT deny when below block threshold even if in allowlist', async () => {
    store.append(makeRecord({ action: { toolName: 'danger_tool' }, outcome: 'fail', reusePolicy: 'block' }));
    const hitlMock = { checkAndRequest: vi.fn().mockResolvedValue('approved') };
    unsub = registerConsequenceReadPath({
      store,
      hitl: hitlMock as any,
      enforceBlock: true,
      blockAllowlist: ['danger_tool'],
    });
    const ok = await globalHooks.emit('tool:call', {
      sessionId: 's1',
      toolName: 'danger_tool',
      cycle: 1,
    });
    expect(ok).toBe(true); // dưới ngưỡng → không block
  });

  it('should trigger HITL from window signal across sessions', async () => {
    // Session sA/sB/sC fail 'deploy' → session s1 cùng tool bị HITL (window threshold)
    store.append(makeRecord({ action: { toolName: 'deploy' }, outcome: 'fail', sessionId: 'sA' }));
    store.append(makeRecord({ action: { toolName: 'deploy' }, outcome: 'fail', sessionId: 'sB' }));
    store.append(makeRecord({ action: { toolName: 'deploy' }, outcome: 'fail', sessionId: 'sC' }));
    const hitlMock = { checkAndRequest: vi.fn().mockResolvedValue('approved') };
    unsub = registerConsequenceReadPath({ store, hitl: hitlMock as any });
    const ok = await globalHooks.emit('tool:call', {
      sessionId: 's1',
      toolName: 'deploy',
      cycle: 1,
    });
    expect(ok).toBe(true); // approved
    expect(hitlMock.checkAndRequest).toHaveBeenCalledTimes(1); // HITL hỏi dù session s1 chưa fail
  });
});

describe('resolveDecision — Phase 3', () => {
  it('lesson thay đổi không đổi quyết định (cùng outcome/policy/count)', () => {
    const base = { maxPolicy: 'suggest' as const, failCountSession: 1, failCountWindow: 1 };
    const d1 = resolveDecision({ ...base, evidenceIds: ['a'] });
    const d2 = resolveDecision({ ...base, evidenceIds: ['b'] });
    expect(d1.action).toBe(d2.action);
    expect(d1.action).toBe('suggest');
  });

  it('block ngoài allowlist → fallback (không hard-deny)', () => {
    const d = resolveDecision(
      { maxPolicy: 'block', failCountSession: 5, failCountWindow: 10, evidenceIds: ['a'] },
      { toolName: 'x', blockAllowlist: ['y'], enforceBlock: true },
    );
    expect(d.action).not.toBe('block');
  });

  it('window threshold chạm → HITL', () => {
    const d = resolveDecision(
      { maxPolicy: 'record_only', failCountSession: 0, failCountWindow: HITL_FAIL_THRESHOLD_WINDOW, evidenceIds: ['a', 'b', 'c'] },
    );
    expect(d.action).toBe('require_hitl');
    expect(d.reasonCode).toBe('consequence_require_hitl_window');
  });
});