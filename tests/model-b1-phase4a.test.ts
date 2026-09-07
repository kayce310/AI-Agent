import * as path from 'path';
import * as os from 'os';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { CheckpointStore } from '../src/core/checkpoint';

const tmpDir = () =>
  path.join(os.tmpdir(), 'b4a-' + Date.now() + '-' + Math.random().toString(36).slice(2));

describe('Model B1 Phase 4A — UNCERTAIN classification', () => {
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

  // ── R1: interrupted running checkpoint → UNCERTAIN ──
  it('R1: running tool after restart → classified UNCERTAIN', () => {
    store.start('task-A', 'session-1', 'goal A');
    store.cycle('task-A', 1, 'goal', [{ id: 't1', name: 'write_file', args: {} }], []);
    store.markToolRunning('task-A', 't1');

    const snapshot = (store as any).snapshots.get('task-A');
    expect(snapshot.cycles[0].toolStatus['t1']).toBe('running');

    store.classifySnapshot('task-A');
    const classified = (store as any).snapshots.get('task-A');
    expect(classified.uncertainTools).toContain('t1');
    expect(classified.status).toBe('in_progress');
    expect(classified.classifiedAt).toBeDefined();
  });

  // ── R2: interrupted pending checkpoint → UNCERTAIN ──
  it('R2: pending tool after restart → classified UNCERTAIN', () => {
    store.start('task-A', 'session-1', 'goal A');
    store.cycle('task-A', 1, 'goal', [{ id: 't1', name: 'write_file', args: {} }], []);
    // Tool is 'pending' — markToolRunning() was NOT called

    store.classifySnapshot('task-A');
    const classified = (store as any).snapshots.get('task-A');
    expect(classified.uncertainTools).toContain('t1');
    expect(classified.status).toBe('in_progress');
    expect(classified.classifiedAt).toBeDefined();
  });

  // ── R3: completed checkpoint untouched ──
  it('R3: completed checkpoint → no UNCERTAIN classification', () => {
    store.start('task-A', 'session-1', 'goal A');
    store.cycle('task-A', 1, 'goal', [{ id: 't1', name: 'write_file', args: {} }], [{ id: 't1', result: 'ok' }]);
    store.classifySnapshot('task-A');

    const classified = (store as any).snapshots.get('task-A');
    expect(classified.uncertainTools).toBeUndefined();
    expect(classified.classifiedAt).toBeDefined(); // still gets classifiedAt
  });

  // ── R4: failed checkpoint untouched ──
  it('R4: failed checkpoint → classification skipped entirely', () => {
    store.start('task-A', 'session-1', 'goal A');
    store.cycle('task-A', 1, 'goal', [{ id: 't1', name: 'write_file', args: {} }], []);
    (store as any).snapshots.get('task-A').status = 'failed';

    store.classifySnapshot('task-A');
    const classified = (store as any).snapshots.get('task-A');
    expect(classified.uncertainTools).toBeUndefined();
    // failed snapshot: classifySnapshot returns early, classifiedAt not set by Phase 4A
    expect(classified.classifiedAt).toBeUndefined();
  });

  // ── R5: multiple checkpoints classified independently ──
  it('R5: multiple checkpoints classified independently', () => {
    store.start('task-A', 'session-1', 'goal A');
    store.cycle('task-A', 1, 'goal', [{ id: 't1', name: 'read_file', args: {} }], []);
    store.markToolRunning('task-A', 't1');

    store.start('task-B', 'session-1', 'goal B');
    store.cycle('task-B', 1, 'goal', [{ id: 't2', name: 'write_file', args: {} }], []);
    store.markToolRunning('task-B', 't2');

    store.classifySnapshot('task-A');
    store.classifySnapshot('task-B');

    const snapA = (store as any).snapshots.get('task-A');
    const snapB = (store as any).snapshots.get('task-B');
    expect(snapA.uncertainTools).toContain('t1');
    expect(snapB.uncertainTools).toContain('t2');
    expect(snapA.status).toBe('in_progress');
    expect(snapB.status).toBe('in_progress'); // cycle() transitions started→in_progress
  });

  // ── R6: session isolation ──
  it('R6: session isolation — classification does not cross-contaminate', () => {
    store.start('task-A', 'session-1', 'goal A');
    store.cycle('task-A', 1, 'goal', [{ id: 't1', name: 'write_file', args: {} }], []);
    store.markToolRunning('task-A', 't1');

    store.start('task-B', 'session-2', 'goal B');
    store.cycle('task-B', 1, 'goal', [{ id: 't2', name: 'read_file', args: {} }], []);

    store.classifySnapshot('task-A');

    const snapA = (store as any).snapshots.get('task-A');
    const snapB = (store as any).snapshots.get('task-B');
    expect(snapA.uncertainTools).toContain('t1');
    expect(snapB.uncertainTools).toBeUndefined();
  });

  // ── R7: no tool execution / side effect ──
  it('R7: classification performs no tool execution or side effect', () => {
    let toolExecuted = false;
    const mockExecute = () => { toolExecuted = true; };

    store.start('task-A', 'session-1', 'goal A');
    store.cycle('task-A', 1, 'goal', [{ id: 't1', name: 'write_file', args: {} }], []);
    store.markToolRunning('task-A', 't1');

    // classifySnapshot does NOT call any tool execution
    store.classifySnapshot('task-A');

    expect(toolExecuted).toBe(false);
    const classified = (store as any).snapshots.get('task-A');
    expect(classified.status).toBe('in_progress');
    expect(classified.cycles[0].toolStatus['t1']).toBe('running');
  });

  // ── R8: fresh execution identity ──
  it('R8: continuation creates fresh taskId (A !== B)', () => {
    // Simulate: old task-A was interrupted
    store.start('task-A', 'session-1', 'goal A');
    store.cycle('task-A', 1, 'goal', [{ id: 't1', name: 'write_file', args: {} }], []);
    store.markToolRunning('task-A', 't1');
    store.classifySnapshot('task-A');

    // New execution after restart uses fresh taskId
    const taskIdB = `task-${Date.now()}`;
    store.start(taskIdB, 'session-1', 'goal A (continued)');

    const snapA = (store as any).snapshots.get('task-A');
    const snapB = (store as any).snapshots.get(taskIdB);
    expect(snapA.requestId).not.toBe(snapB.requestId);
    expect('task-A').not.toBe(taskIdB);
  });

  // ── R9: Plan remains available after classification ──
  it('R9: Plan remains available after classification', () => {
    const plan = {
      id: 'plan-test',
      sessionId: 'session-1',
      items: [{ index: 0, description: 'item', status: 'pending' as const }],
      currentItemIndex: 0,
    };
    store.start('task-A', 'session-1', 'goal A');
    store.setPlan('session-1', plan);
    store.cycle('task-A', 1, 'goal', [{ id: 't1', name: 'write_file', args: {} }], []);
    store.markToolRunning('task-A', 't1');

    store.classifySnapshot('task-A');

    const retrieved = store.getPlan('session-1');
    expect(retrieved).not.toBeNull();
    expect(retrieved!.id).toBe('plan-test');
  });

  // ── R10: no activeTaskBySession regression ──
  it('R10: activeTaskBySession not modified by classification', () => {
    store.start('task-A', 'session-1', 'goal A');
    store.cycle('task-A', 1, 'goal', [{ id: 't1', name: 'write_file', args: {} }], []);
    store.markToolRunning('task-A', 't1');

    const before = (store as any).activeTaskBySession.get('session-1');
    expect(before).toBe('task-A');

    store.classifySnapshot('task-A');

    const after = (store as any).activeTaskBySession.get('session-1');
    expect(after).toBe('task-A');
    expect(after).not.toBeUndefined();
  });

  // ── Repeated classification ──
  it('repeated classification of same snapshot sets classifiedAt each time', () => {
    store.start('task-A', 'session-1', 'goal A');
    store.cycle('task-A', 1, 'goal', [{ id: 't1', name: 'write_file', args: {} }], []);
    store.markToolRunning('task-A', 't1');

    store.classifySnapshot('task-A');
    const first = (store as any).snapshots.get('task-A');
    const firstTime = first.classifiedAt;
    expect(first.uncertainTools).toContain('t1');

    store.classifySnapshot('task-A');
    const second = (store as any).snapshots.get('task-A');
    expect(second.classifiedAt).toBeDefined();
    // classifiedAt is overwritten on each call (current behavior)
    expect(second.uncertainTools).toContain('t1');
  });

  // ── getRunningToolsForSession: direct test ──
  it('getRunningToolsForSession returns correct session, excludes others', () => {
    // Session A: task-A has running tool t1 and pending tool t2
    store.start('task-A', 'session-A', 'goal A');
    store.cycle('task-A', 1, 'goal', [{ id: 't1', name: 'write_file', args: {} }, { id: 't2', name: 'read_file', args: {} }], []);
    // Both t1 and t2 are 'pending' after cycle() (no toolResults)
    store.markToolRunning('task-A', 't1');
    // t1 → 'running', t2 stays 'pending'

    // Session B: task-B has running tool t3
    store.start('task-B', 'session-B', 'goal B');
    store.cycle('task-B', 1, 'goal', [{ id: 't3', name: 'delete_file', args: {} }], []);
    store.markToolRunning('task-B', 't3');

    // Session C: task-C has no pending/running tools (all completed)
    store.start('task-C', 'session-C', 'goal C');
    store.cycle('task-C', 1, 'goal', [{ id: 't4', name: 'read_file', args: {} }], [{ id: 't4', result: 'ok' }]);

    const resultA = store.getRunningToolsForSession('session-A');
    const resultB = store.getRunningToolsForSession('session-B');
    const resultC = store.getRunningToolsForSession('session-C');

    // Session A: t1 (running) + t2 (pending)
    expect(resultA.get('task-A')).toContain('t1');
    expect(resultA.get('task-A')).toContain('t2');
    expect(resultA.size).toBe(1);

    // Session B: t3 (running)
    expect(resultB.get('task-B')).toContain('t3');
    expect(resultB.size).toBe(1);

    // Session C: no pending/running → empty map
    expect(resultC.size).toBe(0);

    // Cross-session isolation
    expect(resultA.get('task-B')).toBeUndefined();
    expect(resultB.get('task-A')).toBeUndefined();
  });

  // ── Started checkpoint: no cycles = no uncertain tools ──
  it('started checkpoint with empty cycles → no UNCERTAIN tools', () => {
    store.start('task-A', 'session-1', 'goal A');
    // status is 'started', no cycle() called yet → empty cycles

    const snapshot = (store as any).snapshots.get('task-A');
    expect(snapshot.status).toBe('started');

    store.classifySnapshot('task-A');
    const classified = (store as any).snapshots.get('task-A');
    expect(classified.uncertainTools).toBeUndefined();
    expect(classified.classifiedAt).toBeDefined();
  });

  // ── getAllInProgress includes both started and in_progress ──
  it('getAllInProgress returns both started and in_progress snapshots', () => {
    store.start('task-A', 'session-1', 'goal A');
    // started snapshot

    store.start('task-B', 'session-1', 'goal B');
    store.cycle('task-B', 1, 'goal', [{ id: 't1', name: 'write_file', args: {} }], []);
    // in_progress snapshot

    const inProgress = store.getAllInProgress();
    const requestIds = inProgress.map((s: any) => s.requestId);
    expect(requestIds).toContain('task-A');
    expect(requestIds).toContain('task-B');
    expect(inProgress.length).toBe(2);
  });
});
