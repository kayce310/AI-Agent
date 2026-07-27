/**
 * @file Stall Guard — derived plan state regression tests
 * @layer tests
 *
 * Verifies Fix 4: plan state derived from checkpointStore, not static flags.
 *
 * Test 1: Plan complete + extra tool + text → FINAL_ANSWER (no E3)
 * Test 2: Plan active + text 3x → E3 (existing behavior preserved)
 * Test 3: No plan + text multiple times → no stall guard trigger (out of scope, preserved)
 */

import { describe, it, expect, vi } from 'vitest';
import { Agent } from '../src/core/engine/agent.js';
import { CheckpointStore } from '../src/core/checkpoint.js';
import type { TaskPlan } from '../src/core/plan/types.js';

// ── Stub helpers ──

function makeCompletedPlan(sessionId: string): TaskPlan {
  return {
    id: `plan-${sessionId}-test`,
    sessionId,
    requestId: `plan-${sessionId}-test`,
    goal: 'Test task',
    items: [
      { index: 0, description: 'Step 1', status: 'completed', consecutiveFailedAttempts: 0 },
      { index: 1, description: 'Step 2', status: 'completed', consecutiveFailedAttempts: 0 },
    ],
    status: 'completed',
    currentItemIndex: 2,
    createdAt: Date.now(),
    completedAt: Date.now(),
    abandonAfterMs: 7200000,
  };
}

function setupStore(sessionId: string, plan: TaskPlan): CheckpointStore {
  const store = new CheckpointStore();
  // Must call start() to create an active snapshot before setPlan
  store.start(`req-${sessionId}`, sessionId, plan.goal);
  store.setPlan(sessionId, plan);
  return store;
}

function makeRunningPlan(sessionId: string): TaskPlan {
  return {
    id: `plan-${sessionId}-test`,
    sessionId,
    requestId: `plan-${sessionId}-test`,
    goal: 'Test task',
    items: [
      { index: 0, description: 'Step 1', status: 'completed', consecutiveFailedAttempts: 0 },
      { index: 1, description: 'Step 2', status: 'pending', consecutiveFailedAttempts: 0 },
    ],
    status: 'running',
    currentItemIndex: 1,
    createdAt: Date.now(),
    abandonAfterMs: 7200000,
  };
}

function makeAgent(checkpointStore: CheckpointStore, modelRouter: any): Agent {
  const toolRegistry: any = {
    getDefinitions: () => [],
    executeToolCall: async () => ({}),
    use: () => {},
  };
  return new Agent({
    modelRouter,
    toolRegistry,
    checkpointStore,
    maxToolCycles: 10,
  });
}

function makeRequest(sessionId: string): any {
  return {
    sessionId,
    messages: [{ role: 'user', content: 'Do something' }],
    modelId: 'test',
    agentName: 'test',
    protocol: 'test',
    mentionPrefix: '',
    task: 'Test task',
  };
}

// ════════════════════════════════════════════════════════════════
// Test 1: Plan complete + text → FINAL_ANSWER, no E3
// ════════════════════════════════════════════════════════════════

describe('Stall Guard: derived plan state', () => {
  it('plan complete + text response → FINAL_ANSWER (no E3)', async () => {
    const sessionId = 'test-session-complete';
    const store = setupStore(sessionId, makeCompletedPlan(sessionId));

    // Model returns text only (no tool calls) — should be accepted as FINAL_ANSWER
    const modelRouter: any = {
      route: async () => ({
        content: 'Task completed. Here are the results.',
        modelUsed: 'test',
        providerUsed: 'test',
        finishReason: 'stop',
        toolCalls: [],
      }),
    };

    const agent = makeAgent(store, modelRouter);
    const result = await agent.run(makeRequest(sessionId));

    // Should NOT contain E3 error
    expect(result.content).not.toContain('[E3]');
    // Should contain the actual response
    expect(result.content).toContain('Task completed');
  });

  // ════════════════════════════════════════════════════════════════
  // Test 2: Plan active + text 3x → E3
  // ════════════════════════════════════════════════════════════════

  it('plan active + 3 consecutive text responses → E3', async () => {
    const sessionId = 'test-session-active';
    const store = setupStore(sessionId, makeRunningPlan(sessionId));

    let callCount = 0;
    const modelRouter: any = {
      route: async () => {
        callCount++;
        return {
          content: 'I am thinking about the task...',
          modelUsed: 'test',
          providerUsed: 'test',
          finishReason: 'stop',
          toolCalls: [],
        };
      },
    };

    const agent = makeAgent(store, modelRouter);
    const result = await agent.run(makeRequest(sessionId));

    // Should contain E3 error
    expect(result.content).toContain('[E3]');
    // Should have called model at least 3 times (3 stalls + 1 initial)
    expect(callCount).toBeGreaterThanOrEqual(3);
  });

  // ════════════════════════════════════════════════════════════════
  // Test 3: Plan complete + extra tool call + text → FINAL_ANSWER
  // (simulates the exact bug scenario from the issue)
  // ════════════════════════════════════════════════════════════════

  it('plan complete + extra tool call + text → FINAL_ANSWER (bug scenario)', async () => {
    const sessionId = 'test-session-extra';
    const store = setupStore(sessionId, makeCompletedPlan(sessionId));

    let callCount = 0;
    const modelRouter: any = {
      route: async () => {
        callCount++;
        if (callCount === 1) {
          // First call: extra tool call after plan complete
          return {
            content: '',
            modelUsed: 'test',
            providerUsed: 'test',
            finishReason: 'tool_calls',
            toolCalls: [{
              type: 'function',
              id: 'call-extra-1',
              function: { name: 'read_file', arguments: '{}' },
            }],
          };
        }
        // Second call: text response (reporting results)
        return {
          content: 'All steps completed successfully.',
          modelUsed: 'test',
          providerUsed: 'test',
          finishReason: 'stop',
          toolCalls: [],
        };
      },
    };

    const agent = makeAgent(store, modelRouter);
    const result = await agent.run(makeRequest(sessionId));

    // Should NOT contain E3 error
    expect(result.content).not.toContain('[E3]');
    // Should contain the actual response
    expect(result.content).toContain('All steps completed');
  });
});
