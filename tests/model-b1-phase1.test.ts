import * as path from 'path';
import * as os from 'os';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { CheckpointStore } from '../src/core/checkpoint';

const tmpDir = () =>
  path.join(os.tmpdir(), 'b1-checkpoints-' + Date.now() + '-' + Math.random().toString(36).slice(2));

describe('Model B1 Phase 1 — checkpoint identity', () => {
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

  it('throws "Checkpoint identity mismatch" when a write references an unknown requestId', () => {
    store.start('task-A', 'session-1', 'goal A');

    // cycle() with the WRONG id (task-B) must throw, not silently no-op
    expect(() =>
      store.cycle('task-B', 1, 'goal', [{ id: 't1', name: 'x', args: {} }], []),
    ).toThrow(/Checkpoint identity mismatch: no snapshot for requestId "task-B"/);

    // complete()/failed()/markToolRunning()/clear() on unknown ids must also throw
    expect(() =>
      store.complete('task-B', { content: '', modelUsed: 'm', providerUsed: 'p' }),
    ).toThrow(/Checkpoint identity mismatch/);
    expect(() => store.failed('task-B', { message: 'boom' })).toThrow(/Checkpoint identity mismatch/);
    expect(() => store.markToolRunning('task-B', 't1')).toThrow(/Checkpoint identity mismatch/);
    expect(() => store.clear('task-B')).toThrow(/Checkpoint identity mismatch/);

    // No silent success: the store still holds only task-A
    expect(() => store.cycle('task-A', 1, 'goal', [{ id: 't1', name: 'x', args: {} }], [])).not.toThrow();
    expect(() => store.complete('task-A', { content: '', modelUsed: 'm', providerUsed: 'p' })).not.toThrow();
  });

  it('gives every Execution its own separate checkpoint keyed by its fresh requestId', () => {
    // Execution A
    store.start('task-A', 'session-1', 'goal A');
    store.cycle('task-A', 1, 'goal A', [{ id: 't1', name: 'x', args: {} }], []);
    // Execution A still non-terminal — B must NOT reuse it

    // Execution B — fresh id, own checkpoint, even though A is still in progress
    store.start('task-B', 'session-1', 'goal B');

    const snapA = (store as any).snapshots.get('task-A');
    const snapB = (store as any).snapshots.get('task-B');

    // identity: checkpoint requestId === taskId
    expect(snapA.requestId).toBe('task-A');
    expect(snapB.requestId).toBe('task-B');

    // separation: two distinct snapshots, distinct ids
    expect(snapA).not.toBe(snapB);
    expect('task-A').not.toBe('task-B');

    // A and B coexist as independent in-progress checkpoints
    expect(snapA.status).toBe('in_progress');
    expect(snapB.status).toBe('started');

    // writes to each write only their own checkpoint
    store.cycle('task-B', 1, 'goal B', [], []);
    expect(snapA.cycles.length).toBe(1); // unchanged by B's cycle
    expect(snapB.cycles.length).toBe(1);
  });
});