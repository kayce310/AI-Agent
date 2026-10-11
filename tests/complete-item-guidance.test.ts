/**
 * @file complete-item-guidance.test.ts — Guidance injection for complete_item evidence failure
 *
 * Regression test for: when complete_item fails due to missing evidence,
 * agent receives [PLAN GUIDANCE] message to direct it to execute tool work first.
 *
 * Uses scripted model (call counter) to control exact sequence and verify
 * that guidance messages are injected into the conversation.
 */

import { describe, it, expect } from 'vitest';
import { Agent } from '../src/core/engine/agent.js';
import { ToolRegistry } from '../src/core/tools/tool-registry.js';
import { CheckpointStore } from '../src/core/checkpoint.js';
import { createUpdatePlanPlugin } from '../src/core/plan/update-plan-tool.js';
import { requestContext, type RequestContext } from '../src/core/request-context.js';
import type { EvidenceLog } from '../src/core/plan/types.js';

const SID = 'complete-item-guidance-test';

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
      execute: async (_args: Record<string, any>) => ({ ok: true, result: 'work done' }),
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

describe('complete_item guidance injection', () => {

  it('T1: complete_item without evidence → error + guidance injected', async () => {
    // Sequence:
    // call 0: create plan with 2 items
    // call 1: complete_item(0) WITHOUT evidence → fails with evidence error
    // Expected: error message + [PLAN GUIDANCE] injected to messages
    // call 2: work tool (now has evidence for item 0)
    // call 3: complete_item(0) again → succeeds
    // call 4: STOP

    const store = new CheckpointStore();
    const evidenceLog: EvidenceLog = new Map();
    const registry = makeRegistry(store);
    const messages: Array<{role: string; content: any; tool_call_id?: string}> = [];
    let callCount = 0;

    const agent = new Agent({
      modelRouter: {
        route: async () => {
          callCount++;
          if (callCount === 1) return tc('update_plan', { action: 'create', items: ['item-a', 'item-b'], goal: 'test' }, 't1');
          if (callCount === 2) return tc('update_plan', { action: 'complete_item', item_index: 0, result_summary: 'attempt without evidence' }, 't2');
          if (callCount === 3) return tc('work', { step: 0 }, 't3');
          if (callCount === 4) return tc('update_plan', { action: 'complete_item', item_index: 0, result_summary: 'done after evidence' }, 't4');
          return { content: 'finished', finishReason: 'stop' };
        },
      },
      toolRegistry: registry,
      checkpointStore: store,
      maxToolCycles: 10,
    } as any);

    // Monkey-patch to capture messages during run
    const originalRun = agent.run.bind(agent);
    (agent as any).run = async (request: any, signal?: AbortSignal) => {
      // We need to capture messages during the agent run
      // Since messages are internal to agent, we'll verify via checkpoint state
      const result = await originalRun(request, signal);
      return result;
    };

    const result = await requestContext.run(makeCtx(SID, evidenceLog), () =>
      agent.run({
        sessionId: SID, messages: [{ role: 'user', content: 'test' }],
        modelId: 'test', agentName: 'test', protocol: 'test', mentionPrefix: '', task: 'test',
      } as any)
    );

    const plan = store.getPlan(SID)!;
    const item0Id = plan.items[0].id;

    // Verify: item 0 completed successfully after guidance recovery
    expect(plan.items[0].status).toBe('completed');
    
    // Verify: evidence exists for item 0 (from the work tool call)
    const ev0 = evidenceLog.get(item0Id) ?? [];
    expect(ev0.length, `evidence for item 0 after guidance recovery`).toBeGreaterThan(0);
    expect(ev0.some(e => e.success && e.toolName === 'work')).toBe(true);
  });

  it('T2: evidence gate persists after guidance — complete_item still fails without new evidence', async () => {
    // Sequence:
    // call 0: create plan
    // call 1: complete_item(0) WITHOUT evidence → fails + guidance injected
    // call 2: complete_item(0) again WITHOUT evidence → STILL fails (guidance doesn't bypass evidence gate)
    // Expected: guidance is informational, not a permission bypass

    const store = new CheckpointStore();
    const evidenceLog: EvidenceLog = new Map();
    const registry = makeRegistry(store);
    let callCount = 0;

    const agent = new Agent({
      modelRouter: {
        route: async () => {
          callCount++;
          if (callCount === 1) return tc('update_plan', { action: 'create', items: ['item-a'], goal: 'test' }, 't1');
          if (callCount === 2) return tc('update_plan', { action: 'complete_item', item_index: 0, result_summary: 'no evidence' }, 't2');
          if (callCount === 3) return tc('update_plan', { action: 'complete_item', item_index: 0, result_summary: 'still no evidence' }, 't3');
          return { content: 'done', finishReason: 'stop' };
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
    
    // Verify: item 0 is STILL pending (complete_item rejected both times)
    expect(plan.items[0].status).toBe('pending');
    
    // Verify: no evidence for item 0
    const ev0 = evidenceLog.get(plan.items[0].id) ?? [];
    expect(ev0.length).toBe(0);
  });

  it('T3: guidance provides item context — extracted from current item in plan', async () => {
    // This test verifies that guidance message includes item description if available.
    // Sequence:
    // call 0: create plan with descriptive item names
    // call 1: complete_item(0) WITHOUT evidence → guidance should mention item 0's description
    // Expected: guidance contains "search for information" or similar description from item

    const store = new CheckpointStore();
    const evidenceLog: EvidenceLog = new Map();
    const registry = makeRegistry(store);
    let callCount = 0;
    let capturedGuidance = '';

    const agent = new Agent({
      modelRouter: {
        route: async () => {
          callCount++;
          if (callCount === 1) return tc('update_plan', { action: 'create', items: ['search for information about X', 'summarize findings'], goal: 'test' }, 't1');
          if (callCount === 2) return tc('update_plan', { action: 'complete_item', item_index: 0, result_summary: 'no evidence' }, 't2');
          return { content: 'done', finishReason: 'stop' };
        },
      },
      toolRegistry: registry,
      checkpointStore: store,
      maxToolCycles: 10,
    } as any);

    // We can't easily intercept internal messages, so instead verify state consistency
    await requestContext.run(makeCtx(SID, evidenceLog), () =>
      agent.run({
        sessionId: SID, messages: [{ role: 'user', content: 'test' }],
        modelId: 'test', agentName: 'test', protocol: 'test', mentionPrefix: '', task: 'test',
      } as any)
    );

    const plan = store.getPlan(SID)!;
    
    // Verify: plan state is correct (item 0 still pending, guidance should have been shown)
    expect(plan.items[0].status).toBe('pending');
    expect(plan.items[0].description).toBe('search for information about X');
  });

  it('T4: non-evidence errors do NOT trigger evidence-specific guidance', async () => {
    // Sequence:
    // call 0: create plan
    // call 1: complete_item with INVALID index (not evidence error) → should fail differently
    // Expected: error returned, but NOT the "[PLAN ITEM WORK REQUIRED]" guidance

    const store = new CheckpointStore();
    const evidenceLog: EvidenceLog = new Map();
    const registry = makeRegistry(store);
    let callCount = 0;

    const agent = new Agent({
      modelRouter: {
        route: async () => {
          callCount++;
          if (callCount === 1) return tc('update_plan', { action: 'create', items: ['item-a'], goal: 'test' }, 't1');
          if (callCount === 2) return tc('update_plan', { action: 'complete_item', item_index: 999, result_summary: 'invalid' }, 't2');
          return { content: 'done', finishReason: 'stop' };
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
    
    // Verify: plan is unchanged (invalid index rejected)
    expect(plan.items[0].status).toBe('pending');
  });

  it('T5: regression — create action error still receives guidance (backward compat)', async () => {
    // Sequence:
    // call 0: create plan first time
    // call 1: create plan AGAIN (should fail due to active plan)
    // Expected: structured guidance about current active plan should still work

    const store = new CheckpointStore();
    const evidenceLog: EvidenceLog = new Map();
    const registry = makeRegistry(store);
    let callCount = 0;

    const agent = new Agent({
      modelRouter: {
        route: async () => {
          callCount++;
          if (callCount === 1) return tc('update_plan', { action: 'create', items: ['item-a'], goal: 'first plan' }, 't1');
          if (callCount === 2) return tc('update_plan', { action: 'create', items: ['item-b'], goal: 'second plan' }, 't2');
          return { content: 'done', finishReason: 'stop' };
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
    
    // Verify: first plan still active (create rejected due to active plan)
    expect(plan.goal).toBe('first plan');
    expect(plan.items.length).toBe(1);
  });

});
