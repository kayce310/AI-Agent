/**
 * @file plan-evidence-alignment.test.ts — Evidence logging vs item progress alignment
 *
 * Regression test for root cause: evidence logged to sp.items[sp.currentItemIndex]
 * instead of first non-terminal item, causing complete_item(index=N) to fail for N>=1
 * when earlier items were already completed.
 *
 * Uses scripted model (call counter) to avoid stale-plan-state race in test setup.
 */

import { describe, it, expect } from 'vitest';
import { Agent } from '../src/core/engine/agent.js';
import { ToolRegistry } from '../src/core/tools/tool-registry.js';
import { CheckpointStore } from '../src/core/checkpoint.js';
import { createUpdatePlanPlugin } from '../src/core/plan/update-plan-tool.js';
import { requestContext, type RequestContext } from '../src/core/request-context.js';
import type { EvidenceLog } from '../src/core/plan/types.js';

const SID = 'evidence-align-test';

function makeCtx(sessionId: string, evidenceLog: EvidenceLog): RequestContext {
  return {
    sessionId,
    taskId: `task-${sessionId}`,
    evidenceLog,
    onPlanCreated: () => {},
    userId: 'test',
  };
}

function makeRegistry(store: CheckpointStore): ToolRegistry {
  const registry = new ToolRegistry();
  registry.use(createUpdatePlanPlugin(store));
  registry.use({
    name: 'work',
    tools: [{
      name: 'work',
      description: 'do work',
      schema: { type: 'object', properties: { step: { type: 'number' } } },
      execute: async (_args: Record<string, any>) => ({ ok: true }),
    }],
  });
  return registry;
}

function tc(name: string, args: Record<string, unknown>, id: string) {
  return {
    finishReason: 'tool_calls',
    toolCalls: [{ id, type: 'function', function: { name, arguments: JSON.stringify(args) } }],
  };
}

const STOP = { content: 'done', finishReason: 'stop' };

describe('Plan evidence alignment (Agent-level)', () => {

  it('AC1: tool call after complete_item(0) logs evidence to item 1, not item 0', async () => {
    // Scripted sequence via call counter:
    // call 0: create plan
    // call 1: work step 0
    // call 2: complete_item(0)
    // call 3: work step 1
    // call 4: complete_item(1)
    // call 5: STOP
    const store = new CheckpointStore();
    const evidenceLog: EvidenceLog = new Map();
    const registry = makeRegistry(store);
    let callCount = 0;

    const agent = new Agent({
      modelRouter: {
        route: async () => {
          callCount++;
          if (callCount === 1) return tc('update_plan', { action: 'create', items: ['step-a', 'step-b'], goal: 'test' }, 't1');
          if (callCount === 2) return tc('work', { step: 0 }, 't2');
          if (callCount === 3) return tc('update_plan', { action: 'complete_item', item_index: 0, result_summary: 'did a' }, 't3');
          if (callCount === 4) return tc('work', { step: 1 }, 't4');
          if (callCount === 5) return tc('update_plan', { action: 'complete_item', item_index: 1, result_summary: 'did b' }, 't5');
          return STOP;
        },
      },
      toolRegistry: registry,
      checkpointStore: store,
      maxToolCycles: 10,
    } as any);

    await requestContext.run(makeCtx(SID, evidenceLog), () =>
      agent.run({
        sessionId: SID, messages: [{ role: 'user', content: 'test' }],
        modelId: 'test', agentName: 'test', protocol: 'test', mentionPrefix: '', task: 'test',
      } as any)
    );

    const plan = store.getPlan(SID)!;
    expect(plan.status).toBe('completed');
    expect(plan.items[0].status).toBe('completed');
    expect(plan.items[1].status).toBe('completed');

    // CRITICAL: evidence for item 1 must exist (this was the bug)
    const item1Id = plan.items[1].id;
    const ev1 = evidenceLog.get(item1Id) ?? [];
    expect(ev1.length, `evidence for item 1 (${item1Id})`).toBeGreaterThan(0);
    expect(ev1.some(e => e.success && e.toolName === 'work'), 'item 1 has work success evidence').toBe(true);
  });

  it('AC1-negative: each item gets ONLY its own work evidence (no cross-contamination)', async () => {
    const store = new CheckpointStore();
    const evidenceLog: EvidenceLog = new Map();
    const registry = makeRegistry(store);
    let callCount = 0;

    const agent = new Agent({
      modelRouter: {
        route: async () => {
          callCount++;
          if (callCount === 1) return tc('update_plan', { action: 'create', items: ['a', 'b'], goal: 'test' }, 't1');
          if (callCount === 2) return tc('work', { step: 0 }, 't2');
          if (callCount === 3) return tc('update_plan', { action: 'complete_item', item_index: 0, result_summary: 'did a' }, 't3');
          if (callCount === 4) return tc('work', { step: 1 }, 't4');
          if (callCount === 5) return tc('update_plan', { action: 'complete_item', item_index: 1, result_summary: 'did b' }, 't5');
          return STOP;
        },
      },
      toolRegistry: registry,
      checkpointStore: store,
      maxToolCycles: 10,
    } as any);

    await requestContext.run(makeCtx(SID, evidenceLog), () =>
      agent.run({
        sessionId: SID, messages: [{ role: 'user', content: 'test' }],
        modelId: 'test', agentName: 'test', protocol: 'test', mentionPrefix: '', task: 'test',
      } as any)
    );

    const plan = store.getPlan(SID)!;
    const item0Id = plan.items[0].id;
    const item1Id = plan.items[1].id;
    const ev0 = evidenceLog.get(item0Id) ?? [];
    const ev1 = evidenceLog.get(item1Id) ?? [];

    // Each item should have exactly 1 work evidence (from its own work call)
    expect(ev0.map(e => e.toolName)).toEqual(['work']);
    expect(ev1.map(e => e.toolName)).toEqual(['work']);
    // No cross-contamination
    expect(ev0.length).toBe(1);
    expect(ev1.length).toBe(1);
  });

  it('AC2: stale out-of-bounds currentItemIndex corrected to first non-terminal item', async () => {
    // Setup: plan with 3 items, first two completed, third pending
    // currentItemIndex deliberately set out of bounds (999)
    // Tool call should log evidence to item 2 (the pending one), not to completed items
    const store = new CheckpointStore();
    const evidenceLog: EvidenceLog = new Map();
    const registry = makeRegistry(store);
    let callCount = 0;

    // First, create a plan and advance it to have completed items with stale index
    const setupAgent = new Agent({
      modelRouter: {
        route: async () => {
          callCount++;
          if (callCount === 1) return tc('update_plan', { action: 'create', items: ['step-a', 'step-b', 'step-c'], goal: 'test' }, 't1');
          if (callCount === 2) return tc('work', { step: 0 }, 't2');
          if (callCount === 3) return tc('update_plan', { action: 'complete_item', item_index: 0, result_summary: 'did a' }, 't3');
          if (callCount === 4) return tc('work', { step: 1 }, 't4');
          if (callCount === 5) return tc('update_plan', { action: 'complete_item', item_index: 1, result_summary: 'did b' }, 't5');
          return STOP;
        },
      },
      toolRegistry: registry,
      checkpointStore: store,
      maxToolCycles: 10,
    } as any);

    await requestContext.run(makeCtx(SID, evidenceLog), () =>
      setupAgent.run({
        sessionId: SID, messages: [{ role: 'user', content: 'test' }],
        modelId: 'test', agentName: 'test', protocol: 'test', mentionPrefix: '', task: 'test',
      } as any)
    );

    // Now manipulate the plan directly: set currentItemIndex out of bounds
    const plan = store.getPlan(SID)!;
    expect(plan.items.length).toBe(3);
    expect(plan.items[0].status).toBe('completed');
    expect(plan.items[1].status).toBe('completed');
    expect(plan.items[2].status).toBe('pending');
    expect(plan.currentItemIndex).toBe(2); // Normal state after completing item 1

    // Simulate stale out-of-bounds index (e.g., from bug/race)
    plan.currentItemIndex = 999;
    store.setPlan(SID, plan);

    // Clear evidenceLog for clean test of the new tool call
    evidenceLog.clear();

    // Now run agent with a single tool call - should log to item 2 (first non-terminal)
    let toolCallCount = 0;
    const testAgent = new Agent({
      modelRouter: {
        route: async () => {
          toolCallCount++;
          if (toolCallCount === 1) return tc('work', { step: 2 }, 't6');
          return STOP;
        },
      },
      toolRegistry: registry,
      checkpointStore: store,
      maxToolCycles: 10,
    } as any);

    await requestContext.run(makeCtx(SID, evidenceLog), () =>
      testAgent.run({
        sessionId: SID, messages: [{ role: 'user', content: 'test' }],
        modelId: 'test', agentName: 'test', protocol: 'test', mentionPrefix: '', task: 'test',
      } as any)
    );

    // Verify: evidence should be assigned to item 2 (the pending one), not to completed items
    const item2Id = plan.items[2].id;
    const item0Id = plan.items[0].id;
    const item1Id = plan.items[1].id;

    const ev2 = evidenceLog.get(item2Id) ?? [];
    const ev0 = evidenceLog.get(item0Id) ?? [];
    const ev1 = evidenceLog.get(item1Id) ?? [];

    // Evidence should exist for item 2
    expect(ev2.length, `evidence for item 2 (${item2Id})`).toBeGreaterThan(0);
    expect(ev2.some(e => e.success && e.toolName === 'work'), 'item 2 has work success evidence').toBe(true);

    // No evidence should be assigned to completed items (no cross-contamination)
    expect(ev0.length, 'item 0 (completed) should have no evidence').toBe(0);
    expect(ev1.length, 'item 1 (completed) should have no evidence').toBe(0);
  });

  it('AC2-negative: no non-terminal items → no evidence logged to terminal items', async () => {
    // Setup: all items completed, currentItemIndex out of bounds
    // Tool call should NOT log evidence to any item (no non-terminal target)
    const store = new CheckpointStore();
    const evidenceLog: EvidenceLog = new Map();
    const registry = makeRegistry(store);
    let callCount = 0;

    const setupAgent = new Agent({
      modelRouter: {
        route: async () => {
          callCount++;
          if (callCount === 1) return tc('update_plan', { action: 'create', items: ['step-a'], goal: 'test' }, 't1');
          if (callCount === 2) return tc('work', { step: 0 }, 't2');
          if (callCount === 3) return tc('update_plan', { action: 'complete_item', item_index: 0, result_summary: 'did a' }, 't3');
          return STOP;
        },
      },
      toolRegistry: registry,
      checkpointStore: store,
      maxToolCycles: 10,
    } as any);

    await requestContext.run(makeCtx(SID, evidenceLog), () =>
      setupAgent.run({
        sessionId: SID, messages: [{ role: 'user', content: 'test' }],
        modelId: 'test', agentName: 'test', protocol: 'test', mentionPrefix: '', task: 'test',
      } as any)
    );

    const plan = store.getPlan(SID)!;
    expect(plan.items[0].status).toBe('completed');
    expect(plan.currentItemIndex).toBe(1);

    // Simulate stale out-of-bounds index
    plan.currentItemIndex = 999;
    store.setPlan(SID, plan);

    evidenceLog.clear();

    // Run agent with a tool call - should NOT log evidence (no non-terminal items)
    let toolCallCount = 0;
    const testAgent = new Agent({
      modelRouter: {
        route: async () => {
          toolCallCount++;
          if (toolCallCount === 1) return tc('work', { step: 0 }, 't4');
          return STOP;
        },
      },
      toolRegistry: registry,
      checkpointStore: store,
      maxToolCycles: 10,
    } as any);

    await requestContext.run(makeCtx(SID, evidenceLog), () =>
      testAgent.run({
        sessionId: SID, messages: [{ role: 'user', content: 'test' }],
        modelId: 'test', agentName: 'test', protocol: 'test', mentionPrefix: '', task: 'test',
      } as any)
    );

    // Verify: no evidence should be assigned to any item
    const item0Id = plan.items[0].id;
    const ev0 = evidenceLog.get(item0Id) ?? [];
    expect(ev0.length, 'no evidence should be logged when no non-terminal items exist').toBe(0);
    expect(evidenceLog.size).toBe(0);
  });
});
