import * as path from 'path';
import * as os from 'os';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { CheckpointStore } from '../src/core/checkpoint';

const tmpDir = () =>
  path.join(os.tmpdir(), 'b3-plan-' + Date.now() + '-' + Math.random().toString(36).slice(2));

function makePlan(overrides: Record<string, any> = {}): any {
  return {
    id: 'plan-test',
    sessionId: 'session-1',
    requestId: 'task-A',
    goal: 'test goal',
    items: [{ index: 0, description: 'item', status: 'pending' as const }],
    status: 'pending' as any,
    currentItemIndex: 0,
    createdAt: Date.now(),
    abandonAfterMs: 7200000,
    ...overrides,
  };
}

describe('Model B1 Phase 3 — Plan loading / version selection', () => {
  let store: CheckpointStore;

  beforeEach(async () => {
    const globalCheckpoint = (global as any).globalCheckpoint;
    if (globalCheckpoint) {
      globalCheckpoint.snapshots?.clear();
      globalCheckpoint.plans?.clear();
    }
    store = new CheckpointStore({
      checkpointDir: tmpDir(),
      autoFlushIntervalMs: 1000 * 60 * 60,
    });
    await store.init();
  });

  afterEach(async () => {
    await store.shutdown();
  });

  // ── T1 — Multiple checkpoints, latest Plan wins ──

  it('T1: getPlan returns the latest Plan when multiple checkpoints exist', () => {
    // task-A → Plan-A, task-B → Plan-B, task-C → Plan-C
    const planA = makePlan({ id: 'plan-A', requestId: 'task-A', createdAt: 1000 });
    const planB = makePlan({ id: 'plan-B', requestId: 'task-B', createdAt: 2000 });
    const planC = makePlan({ id: 'plan-C', requestId: 'task-C', createdAt: 3000 });

    store.start('task-A', 'session-1', 'goal A');
    store.cycle('task-A', 1, 'goal A', [], []);
    store.setPlan('session-1', planA);
    store.complete('task-A', { content: 'done', modelUsed: 'm', providerUsed: 'p' });

    store.start('task-B', 'session-1', 'goal B');
    store.cycle('task-B', 1, 'goal B', [], []);
    store.setPlan('session-1', planB);
    store.complete('task-B', { content: 'done', modelUsed: 'm', providerUsed: 'p' });

    store.start('task-C', 'session-1', 'goal C');
    store.cycle('task-C', 1, 'goal C', [], []);
    store.setPlan('session-1', planC);
    store.complete('task-C', { content: 'done', modelUsed: 'm', providerUsed: 'p' });

    // getPlan should return Plan-C (latest by startedAt)
    const plan = store.getPlan('session-1');
    expect(plan).not.toBeNull();
    expect(plan!.id).toBe('plan-C');
  });

  // ── T2 — Latest terminal snapshot still loads ──

  it('T2: getPlan returns Plan from latest terminal (completed) checkpoint', () => {
    const planA = makePlan({ id: 'plan-A', requestId: 'task-A', createdAt: 1000 });
    const planB = makePlan({ id: 'plan-B', requestId: 'task-B', createdAt: 2000 });

    store.start('task-A', 'session-1', 'goal A');
    store.setPlan('session-1', planA);
    store.complete('task-A', { content: 'done', modelUsed: 'm', providerUsed: 'p' });

    store.start('task-B', 'session-1', 'goal B');
    store.setPlan('session-1', planB);
    store.complete('task-B', { content: 'done', modelUsed: 'm', providerUsed: 'p' });

    // Both are terminal, but getPlan must return Plan-B (latest)
    const plan = store.getPlan('session-1');
    expect(plan).not.toBeNull();
    expect(plan!.id).toBe('plan-B');
  });

  // ── T3 — Session isolation ──

  it('T3: getPlan respects session isolation', () => {
    const planA = makePlan({ id: 'plan-A', requestId: 'task-A', sessionId: 'session-A', createdAt: 1000 });
    const planB = makePlan({ id: 'plan-B', requestId: 'task-B', sessionId: 'session-B', createdAt: 2000 });

    store.start('task-A', 'session-A', 'goal A');
    store.setPlan('session-A', planA);

    store.start('task-B', 'session-B', 'goal B');
    store.setPlan('session-B', planB);

    expect(store.getPlan('session-A')?.id).toBe('plan-A');
    expect(store.getPlan('session-B')?.id).toBe('plan-B');
    expect(store.getPlan('session-A')).not.toBeNull();
    expect(store.getPlan('session-B')).not.toBeNull();
  });

  // ── T4 — Active ≠ loaded ──

  it('T4: getPlan returns Plan but hasActivePlan is false for terminal Plan', () => {
    const planA = makePlan({ id: 'plan-A', requestId: 'task-A', status: 'completed', createdAt: 1000 });

    store.start('task-A', 'session-1', 'goal A');
    store.setPlan('session-1', planA);
    store.complete('task-A', { content: 'done', modelUsed: 'm', providerUsed: 'p' });

    const plan = store.getPlan('session-1');
    expect(plan).not.toBeNull();
    expect(plan!.id).toBe('plan-A');
    expect(store.hasActivePlan('session-1')).toBe(false);
  });

  it('T4b: getPlan returns Plan and hasActivePlan is true for active Plan', () => {
    const planA = makePlan({ id: 'plan-A', requestId: 'task-A', status: 'running', createdAt: 1000 });

    store.start('task-A', 'session-1', 'goal A');
    store.setPlan('session-1', planA);

    expect(store.getPlan('session-1')).not.toBeNull();
    expect(store.hasActivePlan('session-1')).toBe(true);
  });

  // ── T5 — No-plan case ──

  it('T5: getPlan returns null when session has no Plan', () => {
    store.start('task-A', 'session-1', 'goal A');
    store.complete('task-A', { content: 'done', modelUsed: 'm', providerUsed: 'p' });

    expect(store.getPlan('session-1')).toBeNull();
    expect(store.hasActivePlan('session-1')).toBe(false);
  });

  // ── T6 — Historical integrity: setPlan never mutates terminal snapshot ──

  it('T6: setPlan does not mutate plan field of a terminal (completed) checkpoint', () => {
    // Execution A → Plan-A → completed
    const planA = makePlan({ id: 'plan-A', requestId: 'task-A', status: 'completed', createdAt: 1000 });
    store.start('task-A', 'session-1', 'goal A');
    store.setPlan('session-1', planA);
    store.complete('task-A', { content: 'done', modelUsed: 'm', providerUsed: 'p' });

    // Verify terminal snapshot has Plan-A
    const terminalSnap = (store as any).snapshots.get('task-A');
    expect(terminalSnap?.plan?.id).toBe('plan-A');

    // Execution B starts — setPlan for session-1 with Plan-B
    const planB = makePlan({ id: 'plan-B', requestId: 'task-B', sessionId: 'session-1', status: 'pending', createdAt: 2000 });
    store.start('task-B', 'session-1', 'goal B');
    store.setPlan('session-1', planB);

    // Terminal snapshot must still have Plan-A, NOT Plan-B
    expect(terminalSnap?.plan?.id).toBe('plan-A');
  });
});
