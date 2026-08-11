/**
 * @file task-outcome.test.ts — P2: structured task outcome (E1/E2/E3)
 * @layer tests
 *
 * P2 fix: agent trả [E1] (empty response), [E2] (model error + empty),
 * [E3] (stalled sau plan) = task KHÔNG hoàn thành. Engine phải ghi:
 *   - metric task_finished success=false (trước đây hardcode success=true)
 *   - checkpoint.failed (trước đây luôn complete) → terminal state,
 *     không resurrect trên restart, không bị tính là thành công.
 *
 * Test 1: isFailureOutcome nhận diện đúng [E1]/[E2]/[E3] vs content thường.
 * Test 2: engine.process + agent trả [E3] → success=false + checkpoint failed.
 * Test 3: engine.process + agent trả content thường → success=true (regression).
 */

import { describe, it, expect, vi } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { CheckpointStore } from '../src/core/checkpoint.js';

function makeIsolatedStore(): CheckpointStore {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cp-p2-'));
  return new CheckpointStore({ checkpointDir: dir });
}

describe('P2: isFailureOutcome — nhận diện structured outcome (E1/E2/E3)', () => {
  it('[E1]/[E2]/[E3] prefix → true', async () => {
    const { isFailureOutcome } = await import('../src/core/engine/engine.js');
    expect(isFailureOutcome('[E1] ❌ Coral chưa hoàn tất yêu cầu. Model trả về nội dung rỗng.')).toBe(true);
    expect(isFailureOutcome('[E2] ❌ Coral gặp sự cố khi xử lý yêu cầu. Model trả về phản hồi rỗng.')).toBe(true);
    expect(isFailureOutcome('[E3] ❌ Agent stalled after plan creation: 3 consecutive turns without tool execution.')).toBe(true);
  });

  it('content thường / rỗng → false', async () => {
    const { isFailureOutcome } = await import('../src/core/engine/engine.js');
    expect(isFailureOutcome('Task completed. Here are the results.')).toBe(false);
    expect(isFailureOutcome('')).toBe(false);
    expect(isFailureOutcome('   ')).toBe(false);
    expect(isFailureOutcome('Xem thêm [E3] trong docs')).toBe(false);
  });
});

describe('P2: engine ghi outcome thật — E3 stalled → success=false + checkpoint failed', () => {
  it('agent trả [E3] → task_finished success=false, checkpoint terminal (không resurrect)', async () => {
    const { Engine } = await import('../src/core/engine/engine.js');
    const engine = new Engine() as any;
    // Cô lập checkpoint — không đụng singleton / knowledge/checkpoints thật
    engine.checkpointStore = makeIsolatedStore();
    const sessionId = `p2-e3-${Date.now()}`;

    const finishedEvents: any[] = [];
    engine.eventBus.subscribe('task_finished', (e: any) => finishedEvents.push(e));

    engine.agent = {
      circuitBreakerState: { isHealthy: () => true },
      setMaxToolCycles: vi.fn(),
      run: vi.fn(async () => ({
        content: '[E3] ❌ Agent stalled after plan creation: 3 consecutive turns without tool execution. Plan may need to be simplified or re-created.',
        modelUsed: 'test',
        providerUsed: 'test',
        toolCycles: 3,
        finished: true,
      })),
    };

    const result = await engine.process({
      sessionId,
      userId: 'u-p2-e3',
      messages: [{ role: 'user', content: 'Làm việc gì đó' }],
      modelId: 'test',
      agentName: 'Coral',
      protocol: 'test',
      mentionPrefix: '',
    });

    expect(result.content).toContain('[E3]');
    // Metric: success=false — stalled KHÔNG được tính là thành công
    expect(finishedEvents.length).toBeGreaterThan(0);
    const ev = finishedEvents[finishedEvents.length - 1];
    expect(ev.type).toBe('task_finished');
    expect(ev.payload.success).toBe(false);
    // Checkpoint: failed = terminal → không còn in-progress cho session
    expect(engine.checkpointStore.getLatestForSession(sessionId)).toBeNull();
    expect(engine.checkpointStore.getAllInProgress().some(c => c.sessionId === sessionId)).toBe(false);
  });

  it('agent trả content bình thường → success=true, checkpoint completed (regression)', async () => {
    const { Engine } = await import('../src/core/engine/engine.js');
    const engine = new Engine() as any;
    engine.checkpointStore = makeIsolatedStore();
    const sessionId = `p2-ok-${Date.now()}`;

    const finishedEvents: any[] = [];
    engine.eventBus.subscribe('task_finished', (e: any) => finishedEvents.push(e));

    engine.agent = {
      circuitBreakerState: { isHealthy: () => true },
      setMaxToolCycles: vi.fn(),
      run: vi.fn(async () => ({
        content: 'Task completed. Here are the results.',
        modelUsed: 'test',
        providerUsed: 'test',
        toolCycles: 0,
        finished: true,
      })),
    };

    const result = await engine.process({
      sessionId,
      userId: 'u-p2-ok',
      messages: [{ role: 'user', content: 'Làm việc gì đó' }],
      modelId: 'test',
      agentName: 'Coral',
      protocol: 'test',
      mentionPrefix: '',
    });

    expect(result.content).toContain('Task completed');
    const ev = finishedEvents[finishedEvents.length - 1];
    expect(ev.payload.success).toBe(true);
    // completed = terminal → không còn in-progress
    expect(engine.checkpointStore.getLatestForSession(sessionId)).toBeNull();
  });
});
