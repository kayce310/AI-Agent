/**
 * @file Tests for plan-state.ts — ADR-001 PlanState derivation
 * @layer tests
 *
 * Verifies every valid PlanState transition from ADR-001 §4
 * and that canCompleteItem() evidence validation works correctly.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { derivePlanState, isGuardActive, canCompleteItem } from '../src/core/plan/plan-state.js';
import type { CheckpointStore } from '../src/core/checkpoint.js';
import type { ToolCallRecord } from '../src/core/plan/types.js';

// ── Helpers ──

function mockCheckpointStore(plan: any): CheckpointStore {
  return {
    getPlan: vi.fn().mockReturnValue(plan),
  } as unknown as CheckpointStore;
}

function makeToolCall(success: boolean): ToolCallRecord {
  return {
    toolName: 'test_tool',
    args: {},
    result: { status: success ? 'success' : 'error', content: '' },
    timestamp: Date.now(),
    success,
  };
}

// ── ADR-001 PlanState derivation ──

describe('derivePlanState — ADR-001 transitions', () => {

  it('no plan → { kind: "none" }', () => {
    const store = mockCheckpointStore(null);
    expect(derivePlanState(store, 's1')).toEqual({ kind: 'none' });
  });

  it('null store → { kind: "none" }', () => {
    expect(derivePlanState(null, 's1')).toEqual({ kind: 'none' });
  });

  it('undefined sessionId → { kind: "none" }', () => {
    expect(derivePlanState(mockCheckpointStore({}), undefined)).toEqual({ kind: 'none' });
  });

  it('plan with all items pending, no execution → { kind: "planning" }', () => {
    const plan = {
      id: 'p1',
      status: 'running',
      items: [
        { index: 0, status: 'pending', description: 'step 1' },
        { index: 1, status: 'pending', description: 'step 2' },
      ],
    };
    const store = mockCheckpointStore(plan);
    const state = derivePlanState(store, 's1');
    expect(state).toEqual({ kind: 'planning', planId: 'p1' });
  });

  it('plan with in_progress item → { kind: "executing" }', () => {
    const plan = {
      id: 'p1',
      status: 'running',
      items: [
        { index: 0, status: 'completed', description: 'done' },
        { index: 1, status: 'in_progress', description: 'active' },
        { index: 2, status: 'pending', description: 'todo' },
      ],
    };
    const store = mockCheckpointStore(plan);
    const state = derivePlanState(store, 's1');
    expect(state).toEqual({ kind: 'executing', planId: 'p1', activeItemIndex: 1 });
  });

  it('plan with failed item → { kind: "executing" }', () => {
    const plan = {
      id: 'p1',
      status: 'running',
      items: [
        { index: 0, status: 'failed', description: 'broke' },
        { index: 1, status: 'pending', description: 'todo' },
      ],
    };
    const store = mockCheckpointStore(plan);
    const state = derivePlanState(store, 's1');
    expect(state).toEqual({ kind: 'executing', planId: 'p1', activeItemIndex: 0 });
  });

  it('plan with skipped item → { kind: "executing" }', () => {
    const plan = {
      id: 'p1',
      status: 'running',
      items: [
        { index: 0, status: 'skipped', description: 'skipped' },
        { index: 1, status: 'pending', description: 'todo' },
      ],
    };
    const store = mockCheckpointStore(plan);
    const state = derivePlanState(store, 's1');
    expect(state).toEqual({ kind: 'executing', planId: 'p1', activeItemIndex: 0 });
  });

  it('all items completed → { kind: "completed" }', () => {
    const plan = {
      id: 'p1',
      status: 'running',
      items: [
        { index: 0, status: 'completed', description: 'done 1' },
        { index: 1, status: 'completed', description: 'done 2' },
      ],
    };
    const store = mockCheckpointStore(plan);
    const state = derivePlanState(store, 's1');
    expect(state).toEqual({ kind: 'completed', planId: 'p1' });
  });

  it('plan.status = completed → { kind: "completed" }', () => {
    const plan = {
      id: 'p1',
      status: 'completed',
      items: [{ index: 0, status: 'completed', description: 'done' }],
    };
    const store = mockCheckpointStore(plan);
    expect(derivePlanState(store, 's1')).toEqual({ kind: 'completed', planId: 'p1' });
  });

  it('plan.status = failed → { kind: "failed" } with reason', () => {
    const plan = {
      id: 'p1',
      status: 'failed',
      stopReason: 'security error',
      items: [],
    };
    const store = mockCheckpointStore(plan);
    const state = derivePlanState(store, 's1');
    expect(state).toEqual({ kind: 'failed', planId: 'p1', reason: 'security error' });
  });

  it('plan.status = failed without stopReason → reason defaults to "unknown"', () => {
    const plan = { id: 'p1', status: 'failed', items: [] };
    const store = mockCheckpointStore(plan);
    const state = derivePlanState(store, 's1');
    expect(state).toEqual({ kind: 'failed', planId: 'p1', reason: 'unknown' });
  });

  it('plan.status = aborted → { kind: "aborted" }', () => {
    const plan = { id: 'p1', status: 'aborted', items: [] };
    const store = mockCheckpointStore(plan);
    expect(derivePlanState(store, 's1')).toEqual({ kind: 'aborted', planId: 'p1' });
  });

  it('getPlan throws → { kind: "none" } (graceful)', () => {
    const store = { getPlan: vi.fn().mockImplementation(() => { throw new Error('db error'); }) } as unknown as CheckpointStore;
    expect(derivePlanState(store, 's1')).toEqual({ kind: 'none' });
  });
});

// ── isGuardActive ──

describe('isGuardActive', () => {
  it('none → false', () => expect(isGuardActive({ kind: 'none' })).toBe(false));
  it('planning → true', () => expect(isGuardActive({ kind: 'planning', planId: 'p1' })).toBe(true));
  it('executing → true', () => expect(isGuardActive({ kind: 'executing', planId: 'p1', activeItemIndex: 0 })).toBe(true));
  it('completed → false', () => expect(isGuardActive({ kind: 'completed', planId: 'p1' })).toBe(false));
  it('failed → false', () => expect(isGuardActive({ kind: 'failed', planId: 'p1', reason: 'x' })).toBe(false));
  it('aborted → false', () => expect(isGuardActive({ kind: 'aborted', planId: 'p1' })).toBe(false));
});

// ── canCompleteItem ──

describe('canCompleteItem — evidence validation', () => {
  it('no evidence log → reject', () => {
    const result = canCompleteItem(undefined, 0);
    expect(result.ok).toBe(false);
    expect(result.reason).toContain('Evidence log is empty');
  });

  it('empty evidence for item → reject', () => {
    const log = new Map<number, ToolCallRecord[]>();
    log.set(0, []);
    const result = canCompleteItem(log, 0);
    expect(result.ok).toBe(false);
  });

  it('all evidence failed → reject', () => {
    const log = new Map<number, ToolCallRecord[]>();
    log.set(0, [makeToolCall(false), makeToolCall(false)]);
    const result = canCompleteItem(log, 0);
    expect(result.ok).toBe(false);
    expect(result.reason).toContain('All tool calls');
  });

  it('at least one success → accept', () => {
    const log = new Map<number, ToolCallRecord[]>();
    log.set(0, [makeToolCall(false), makeToolCall(true)]);
    const result = canCompleteItem(log, 0);
    expect(result.ok).toBe(true);
  });

  it('single success → accept', () => {
    const log = new Map<number, ToolCallRecord[]>();
    log.set(0, [makeToolCall(true)]);
    const result = canCompleteItem(log, 0);
    expect(result.ok).toBe(true);
  });
});
