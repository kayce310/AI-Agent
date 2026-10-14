import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { CheckpointStore } from '../src/core/checkpoint.js';
import type { TaskPlan } from '../src/core/plan/types.js';

describe('Plan Rehydration & Watchdog Progress Reset', () => {
  const testDir = path.join(process.cwd(), '.test-checkpoint-rehydrate');

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

  describe('CheckpointStore.getLatestIncompletePlan & getPlan', () => {
    it('rehydrates incomplete plan from a failed checkpoint snapshot without leaking tool/cycle context', async () => {
      const store = new CheckpointStore({
        checkpointDir: testDir,
        maxFiles: 10,
        syncIntervalMs: 60000,
      });

      const sessionId = 'test-session-123';
      const taskId = 'task-old-failed';

      // Simulate an execution that failed mid-way
      store.start(taskId, sessionId, 'Merge 2 games together', taskId);

      const oldPlan: TaskPlan = {
        id: 'plan-merge-1',
        sessionId,
        requestId: taskId,
        goal: 'Merge 2 games together',
        status: 'running',
        currentItemIndex: 1,
        sequenceNumber: 2,
        createdAt: Date.now() - 5000,
        abandonAfterMs: 7200000,
        items: [
          {
            id: 'item-0',
            index: 0,
            description: 'Phân tích 2 game',
            status: 'completed',
            resultSummary: 'Đã phân tích xong',
            consecutiveFailedAttempts: 0,
          },
          {
            id: 'item-1',
            index: 1,
            description: 'Thiết kế hệ thống merge',
            status: 'completed',
            resultSummary: 'Đã thiết kế xong',
            consecutiveFailedAttempts: 0,
          },
          {
            id: 'item-2',
            index: 2,
            description: 'Viết code game merge',
            status: 'pending',
            consecutiveFailedAttempts: 0,
          },
          {
            id: 'item-3',
            index: 3,
            description: 'Kiểm thử',
            status: 'pending',
            consecutiveFailedAttempts: 0,
          },
        ],
      };

      store.setPlan(sessionId, oldPlan);

      // Record a cycle with tool calls
      store.cycle(
        taskId,
        1,
        'Reading files',
        [{ id: 'tc1', name: 'read_file', args: { path: 'game1.js' } }],
        [{ id: 'tc1', result: { content: 'var a = 1;' } }],
      );

      // Mark the task as failed (like E3 failure)
      store.failed(taskId, { message: '[E3] ❌ Task ended before plan completed' });
      await store.flush();

      // Now create a NEW CheckpointStore instance to simulate restarting the bot
      const newStore = new CheckpointStore({
        checkpointDir: testDir,
        maxFiles: 10,
        syncIntervalMs: 60000,
      });
      await newStore.init();

      // Verify that getPlan recovers the plan even though snapshot status is 'failed'
      const recovered = newStore.getPlan(sessionId);
      expect(recovered).not.toBeNull();
      expect(recovered!.id).toBe('plan-merge-1');
      expect(recovered!.goal).toBe('Merge 2 games together');
      expect(recovered!.status).toBe('running');
      expect(recovered!.items.length).toBe(4);

      // Completed items preserved
      expect(recovered!.items[0].status).toBe('completed');
      expect(recovered!.items[0].resultSummary).toBe('Đã phân tích xong');
      expect(recovered!.items[1].status).toBe('completed');
      expect(recovered!.items[1].resultSummary).toBe('Đã thiết kế xong');

      // Pending items preserved
      expect(recovered!.items[2].status).toBe('pending');
      expect(recovered!.items[3].status).toBe('pending');

      // Current item index automatically points to the first pending item (item 2)
      expect(recovered!.currentItemIndex).toBe(2);

      // Verify ZERO context / cycle / tool history leakage:
      // The recovered object is strictly a TaskPlan, not containing cycles or execution memory
      expect((recovered as any).cycles).toBeUndefined();
      expect((recovered as any).executedToolCalls).toBeUndefined();
    });

    it('does NOT recover a plan if all items were already completed or aborted', async () => {
      const store = new CheckpointStore({
        checkpointDir: testDir,
        maxFiles: 10,
        syncIntervalMs: 60000,
      });

      const sessionId = 'test-session-completed';
      const taskId = 'task-completed';

      store.start(taskId, sessionId, 'Done task', taskId);

      const completedPlan: TaskPlan = {
        id: 'plan-done',
        sessionId,
        requestId: taskId,
        goal: 'Done task',
        status: 'completed',
        currentItemIndex: 1,
        sequenceNumber: 2,
        createdAt: Date.now() - 5000,
        abandonAfterMs: 7200000,
        items: [
          {
            id: 'item-0',
            index: 0,
            description: 'Item 0',
            status: 'completed',
            consecutiveFailedAttempts: 0,
          },
        ],
      };

      store.setPlan(sessionId, completedPlan);
      store.complete(taskId, { content: 'All done' });
      await store.flush();

      // Fresh instance
      const newStore = new CheckpointStore({
        checkpointDir: testDir,
        maxFiles: 10,
        syncIntervalMs: 60000,
      });
      await newStore.init();

      // Has active plan must be false
      expect(newStore.hasActivePlan(sessionId)).toBe(false);
    });
  });
});
