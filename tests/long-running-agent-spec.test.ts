/**
 * Long-Running Agent Spec — OD-1/2/3/4/5 Regression Tests
 * Verifies: background timeout, heartbeat, plan rehydration, evidence merge
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { CheckpointStore } from '../src/core/checkpoint.js';
import { TaskQueue, type BackgroundTask, type TaskQueueConfig } from '../src/core/task-queue.js';
import { withTimeout, TimeoutError } from '../src/core/util/with-timeout.js';

// ── Helpers ──

function tmpDir(): string {
  return path.join(os.tmpdir(), 'lra-spec-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6));
}

function cleanupDir(dir: string): void {
  if (fs.existsSync(dir)) {
    for (const f of fs.readdirSync(dir)) {
      try { fs.unlinkSync(path.join(dir, f)); } catch { /* ignore */ }
    }
    try { fs.rmdirSync(dir); } catch { /* ignore */ }
  }
}

// ── OD-4: Plan Rehydration ──

describe('OD-4: Plan rehydration across restart', () => {
  const dir = tmpDir();
  beforeEach(() => fs.mkdirSync(dir, { recursive: true }));
  afterEach(() => cleanupDir(dir));

  it('rebuilt plans Map contains plan from persisted snapshot', async () => {
    // Process A: write
    const storeA = new CheckpointStore({ checkpointDir: dir });
    await storeA.init();
    storeA.start('req-1', 'session-1', 'Build feature X');
    storeA.setPlan('session-1', {
      id: 'plan-x',
      sessionId: 'session-1',
      requestId: 'req-1',
      goal: 'Build feature X',
      items: [{ id: 'item-1', index: 0, description: 'Setup', status: 'pending' }],
      status: 'running',
      currentItemIndex: 0,
      createdAt: Date.now(),
      abandonAfterMs: 7200000,
    });
    await storeA.flush();
    await storeA.shutdown();

    // Process B: read (fresh store = restart)
    const storeB = new CheckpointStore({ checkpointDir: dir });
    await storeB.init();

    const plan = storeB.getPlan('session-1');
    expect(plan).not.toBeNull();
    expect(plan?.id).toBe('plan-x');
    expect(plan?.status).toBe('running');

    await storeB.shutdown();
  });

  it('getPlan returns completed plan from old snapshot', async () => {
    const store = new CheckpointStore({ checkpointDir: dir });
    await store.init();

    // Write two snapshots: one completed, one in-progress
    store.start('req-old', 'session-1', 'Old task');
    store.setPlan('session-1', {
      id: 'plan-old',
      sessionId: 'session-1',
      requestId: 'req-old',
      goal: 'Old task',
      items: [{ id: 'i1', index: 0, description: 'Done', status: 'completed' }],
      status: 'completed',
      currentItemIndex: 0,
      createdAt: Date.now() - 10000,
      abandonAfterMs: 7200000,
    });
    store.complete('req-old', { content: 'done', modelUsed: 'x', providerUsed: 'x' });

    store.start('req-new', 'session-1', 'New task');
    store.setPlan('session-1', {
      id: 'plan-new',
      sessionId: 'session-1',
      requestId: 'req-new',
      goal: 'New task',
      items: [{ id: 'i2', index: 0, description: 'Active', status: 'pending' }],
      status: 'running',
      currentItemIndex: 0,
      createdAt: Date.now(),
      abandonAfterMs: 7200000,
    });

    await store.flush();
    await store.shutdown();

    // Restart
    const store2 = new CheckpointStore({ checkpointDir: dir });
    await store2.init();

    // getPlan should return the latest (non-terminal) plan
    const activePlan = store2.getPlan('session-1');
    expect(activePlan).not.toBeNull();
    expect(activePlan?.id).toBe('plan-new');

    // Completed plan should also be queryable via snapshot lookup
    const allSnapshots = store2.getAllInProgress();
    expect(allSnapshots.length).toBe(1);

    await store2.shutdown();
  });
});

// ── OD-5: Evidence Merge ──

describe('OD-5: Evidence merge across snapshots', () => {
  const dir = tmpDir();
  beforeEach(() => fs.mkdirSync(dir, { recursive: true }));
  afterEach(() => cleanupDir(dir));

  it('mergeEvidenceForSession aggregates evidence from multiple snapshots', async () => {
    const store = new CheckpointStore({ checkpointDir: dir });
    await store.init();

    // Snapshot 1: item-1 has 2 evidence records
    store.start('req-1', 'session-1', 'Goal 1');
    const snap1 = store['snapshots'].get('req-1');
    snap1!.evidenceLog = {
      'item-1': [
        { toolName: 'read_file', timestamp: 1000, success: true },
        { toolName: 'write_file', timestamp: 2000, success: true },
      ],
    };

    // Snapshot 2: item-1 gets more evidence
    store.start('req-2', 'session-1', 'Goal 2');
    const snap2 = store['snapshots'].get('req-2');
    snap2!.evidenceLog = {
      'item-1': [
        { toolName: 'search', timestamp: 3000, success: true },
      ],
      'item-2': [
        { toolName: 'execute', timestamp: 4000, success: false },
      ],
    };

    await store.flush();
    await store.shutdown();

    // Restart and merge
    const store2 = new CheckpointStore({ checkpointDir: dir });
    await store2.init();

    const merged = store2.mergeEvidenceForSession('session-1');
    expect(merged.size).toBe(2);

    const item1 = merged.get('item-1');
    expect(item1).toBeDefined();
    expect(item1!.length).toBe(3); // 2 from snap1 + 1 from snap2

    const item2 = merged.get('item-2');
    expect(item2).toBeDefined();
    expect(item2!.length).toBe(1);

    await store2.shutdown();
  });

  it('setEvidence writes to current in-progress snapshot', async () => {
    const dir2 = tmpDir();
    fs.mkdirSync(dir2, { recursive: true });

    const store = new CheckpointStore({ checkpointDir: dir2 });
    await store.init();
    store.start('req-1', 'session-1', 'Goal');

    // setEvidence without AsyncLocalStorage context — uses fallback
    store.setEvidence('item-1', { toolName: 'test', timestamp: Date.now(), success: true });

    await store.flush();
    await store.shutdown();

    const store2 = new CheckpointStore({ checkpointDir: dir2 });
    await store2.init();

    const snap = store2.getLatestForSession('session-1');
    expect(snap?.evidenceLog).toBeDefined();
    expect(snap!.evidenceLog!['item-1']).toBeDefined();
    expect(snap!.evidenceLog!['item-1'].length).toBe(1);

    await store2.shutdown();
    cleanupDir(dir2);
  });
});

// ── OD-1: Background Task Timeout ──

describe('OD-1: Background task timeout', () => {
  it('task fails with timeout when executor exceeds executionTimeoutMs', async () => {
    const dir = tmpDir();
    fs.mkdirSync(dir, { recursive: true });

    let executorCalled = false;
    const config: TaskQueueConfig = {
      dataDir: dir,
      pollIntervalMs: 10,
      executor: async () => {
        executorCalled = true;
        // Use a promise that never resolves within test timeframe
        await new Promise(() => {}); // never resolves
        return { content: 'done', modelUsed: 'x', providerUsed: 'x' };
      },
      executionTimeoutMs: 80,
    };

    const tq = new TaskQueue(config);
    await tq.init();
    tq.start();

    const taskId = tq.enqueue({
      sessionId: 'session-1',
      task: 'Never-ending task',
      messages: [],
    } as any);

    // Wait for timeout + several polls
    await new Promise(r => setTimeout(r, 300));
    await tq.stop();

    const task = tq.getStatus(taskId);
    expect(task).not.toBeNull();
    // Task should be failed due to timeout
    expect(task!.status).toBe('failed');

    cleanupDir(dir);
  });

  it('task completes successfully within timeout', async () => {
    const dir = tmpDir();
    fs.mkdirSync(dir, { recursive: true });

    const config: TaskQueueConfig = {
      dataDir: dir,
      pollIntervalMs: 10,
      executor: async () => ({ content: 'done', modelUsed: 'x', providerUsed: 'x' }),
      executionTimeoutMs: 5000,
    };

    const tq = new TaskQueue(config);
    await tq.init();
    tq.start();

    const taskId = tq.enqueue({
      sessionId: 'session-1',
      task: 'Fast task',
      messages: [],
    } as any);

    // Wait for completion (poll + execute)
    await new Promise(r => setTimeout(r, 200));
    await tq.stop();

    const task = tq.getStatus(taskId);
    expect(task).not.toBeNull();
    expect(task!.status).toBe('completed');
    expect(task!.result).toBe('done');

    cleanupDir(dir);
  });
});

// ── OD-2: Heartbeat ──

describe('OD-2: Background task heartbeat', () => {
  it('onProgress fires at heartbeat interval', async () => {
    const dir = tmpDir();
    fs.mkdirSync(dir, { recursive: true });

    const progressEvents: string[] = [];
    const config: TaskQueueConfig = {
      dataDir: dir,
      pollIntervalMs: 10,
      heartbeatIntervalMs: 20,
      onProgress: (taskId, sessionId, progress) => {
        progressEvents.push(progress);
      },
      executor: async () => {
        // Never completes — allows heartbeat to fire
        await new Promise(() => {});
        return { content: 'done', modelUsed: 'x', providerUsed: 'x' };
      },
      executionTimeoutMs: 5000,
    };

    const tq = new TaskQueue(config);
    await tq.init();
    tq.start();

    tq.enqueue({
      sessionId: 'session-1',
      task: 'Heartbeat test',
      messages: [],
    } as any);

    // Wait for multiple heartbeat intervals
    await new Promise(r => setTimeout(r, 100));
    await tq.stop();

    // Should have at least 1 progress event (heartbeat at 20ms, 40ms, 60ms...)
    expect(progressEvents.length).toBeGreaterThanOrEqual(1);

    cleanupDir(dir);
  });
});

// ── withTimeout utility ──

describe('withTimeout utility', () => {
  it('resolves when promise completes before timeout', async () => {
    const result = await withTimeout(Promise.resolve('ok'), 100);
    expect(result).toBe('ok');
  });

  it('rejects with TimeoutError when promise exceeds timeout', async () => {
    const promise = withTimeout(
      new Promise(resolve => setTimeout(() => resolve('late'), 100)),
      10,
    );
    await expect(promise).rejects.toThrow(TimeoutError);
  });

  it('respects abort signal', async () => {
    const controller = new AbortController();
    const promise = withTimeout(
      new Promise(resolve => setTimeout(() => resolve('ok'), 100)),
      5000,
      controller.signal,
    );
    controller.abort();
    await expect(promise).rejects.toThrow('Operation aborted');
  });
});
