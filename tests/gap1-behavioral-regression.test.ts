
import * as fs from 'fs';
import * as path from 'path';
import { CheckpointStore } from '../src/core/checkpoint.js';
import { requestContext } from '../src/core/request-context.js';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

describe('GAP 1 Behavioral Regression', () => {
  const testDir = path.join(process.cwd(), 'knowledge', 'test-checkpoints-reg');

  beforeEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
    fs.mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  it('should separate Execution Identity from Checkpoint Identity during resume', async () => {
    const store1 = new CheckpointStore({ checkpointDir: testDir });
    await store1.init();

    const sessionId = 'session-1';
    const cpId = 'cp-abc';
    const taskId1 = 'task-123';

    console.log('--- Execution #1 ---');
    store1.start(taskId1, sessionId, 'goal 1', cpId);
    const ctx1 = {
      sessionId,
      taskId: taskId1,
      checkpointRequestId: cpId,
      evidenceLog: new Map(),
      onPlanCreated: () => {},
      userId: 'user-1'
    };

    await requestContext.run(ctx1 as any, async () => {
      store1.cycle(taskId1, 1, 'goal 1', [], []);
    });

    await store1.flush();
    await store1.shutdown();

    console.log('--- Restarting (Store 2) ---');
    const store2 = new CheckpointStore({ checkpointDir: testDir });
    await store2.init();

    const existingCpId = store2.getActiveTaskForSession(sessionId);
    expect(existingCpId).toBe(cpId);

    const taskId2 = 'task-456';
    const checkpointRequestId2 = existingCpId || taskId2;

    const ctx2 = {
      sessionId,
      taskId: taskId2,
      checkpointRequestId: checkpointRequestId2,
      evidenceLog: new Map(),
      onPlanCreated: () => {},
      userId: 'user-1'
    };

    console.log('--- Execution #2 ---');
    await requestContext.run(ctx2 as any, async () => {
      expect(taskId2).not.toBe(taskId1);
      expect(checkpointRequestId2).toBe(cpId);

      store2.cycle(taskId2, 2, 'goal 2', [], []);
      store2.complete(taskId2, { content: 'done', modelUsed: 'test', providerUsed: 'test' });
    });

    await store2.flush();

    console.log('--- Verifying Results ---');
    const snapshots = (store2 as any).snapshots;
    const snapshot = snapshots.get(cpId);

    expect(snapshot).toBeDefined();
    expect(snapshot.status).toBe('completed');
    expect(snapshot.requestId).toBe(taskId2);
    expect(snapshots.has(taskId2)).toBe(false);

    // Verify on disk
    const files = fs.readdirSync(testDir).filter(f => f.startsWith(`cp-${cpId}-`));
    expect(files.length).toBe(1);
    const content = JSON.parse(fs.readFileSync(path.join(testDir, files[0]), 'utf-8'));
    expect(content.status).toBe('completed');
    expect(content.requestId).toBe(taskId2);
  });
});
