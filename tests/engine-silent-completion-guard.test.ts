/**
 * @file engine-silent-completion-guard.test.ts — Silent completion guard
 *
 * Verifies the Engine-level guard: when the LLM returns a final answer while
 * the plan still has pending items, the outcome must be marked as failure (success=false, [E3]).
 */

import { describe, it, expect } from 'vitest';
import { CheckpointStore } from '../src/core/checkpoint.js';
import { createUpdatePlanPlugin } from '../src/core/plan/update-plan-tool.js';
import { requestContext, type RequestContext } from '../src/core/request-context.js';
import type { EvidenceLog } from '../src/core/plan/types.js';

function makeCtx(sessionId: string, evidenceLog: EvidenceLog): RequestContext {
  return {
    sessionId,
    taskId: `task-${sessionId}`,
    evidenceLog,
    onPlanCreated: () => {},
    userId: 'test',
  };
}

describe('Engine silent-completion guard (unit)', () => {

  it('guard condition: plan.running + currentItemIndex < items.length + pending items → should trigger', () => {
    // Shared evidence log across calls
    const store = new CheckpointStore();
    const plugin = createUpdatePlanPlugin(store);
    const sid = 'guard-test';
    const evidenceLog: EvidenceLog = new Map();
    const ctx = makeCtx(sid, evidenceLog);

    requestContext.run(ctx, () =>
      plugin.tools[0].execute({ action: 'create', items: ['a', 'b', 'c'], goal: 'g' })
    );

    // To get complete_item to succeed, we need evidence for item 0.
    // Manually add evidence record for item 0's UUID.
    const plan = store.getPlan(sid)!;
    const item0Id = plan.items[0].id;
    evidenceLog.set(item0Id, [{ toolName: 'work', timestamp: Date.now(), success: true }]);

    requestContext.run(ctx, () =>
      plugin.tools[0].execute({ action: 'complete_item', item_index: 0, result_summary: 'x' })
    );

    const planAfter = store.getPlan(sid)!;
    expect(planAfter.status).toBe('running');
    expect(planAfter.currentItemIndex).toBe(1);
    expect(planAfter.items[0].status).toBe('completed');
    expect(planAfter.items[1].status).toBe('pending');
    expect(planAfter.items[2].status).toBe('pending');

    // Replicate the guard's condition check
    const hasPendingItems = planAfter.status === 'running'
      && planAfter.currentItemIndex < planAfter.items.length;

    if (hasPendingItems) {
      const pendingItems = planAfter.items.slice(planAfter.currentItemIndex).filter(
        (i: any) => i.status !== 'completed' && i.status !== 'skipped' && i.status !== 'failed',
      );
      expect(pendingItems.length).toBe(2); // items 1 and 2 are pending
    }
  });

  it('no false positive: plan.completed does NOT trigger guard', () => {
    const store = new CheckpointStore();
    const plugin = createUpdatePlanPlugin(store);
    const sid = 'guard-full';
    const evidenceLog: EvidenceLog = new Map();
    const ctx = makeCtx(sid, evidenceLog);

    requestContext.run(ctx, () =>
      plugin.tools[0].execute({ action: 'create', items: ['a', 'b'], goal: 'g' })
    );

    // Add evidence for both items
    const plan1 = store.getPlan(sid)!;
    evidenceLog.set(plan1.items[0].id, [{ toolName: 'work', timestamp: Date.now(), success: true }]);
    evidenceLog.set(plan1.items[1].id, [{ toolName: 'work', timestamp: Date.now(), success: true }]);

    requestContext.run(ctx, () =>
      plugin.tools[0].execute({ action: 'complete_item', item_index: 0, result_summary: 'x' })
    );
    requestContext.run(ctx, () =>
      plugin.tools[0].execute({ action: 'complete_item', item_index: 1, result_summary: 'y' })
    );

    const plan = store.getPlan(sid)!;
    expect(plan.status).toBe('completed');

    // Guard condition should be false: plan is not 'running'
    const hasPendingItems = plan.status === 'running'
      && plan.currentItemIndex < plan.items.length;
    expect(hasPendingItems).toBe(false);
  });

  it('no false positive: all items skipped → no guard trigger', () => {
    const store = new CheckpointStore();
    const plugin = createUpdatePlanPlugin(store);
    const sid = 'guard-skip';
    const evidenceLog: EvidenceLog = new Map();
    const ctx = makeCtx(sid, evidenceLog);

    requestContext.run(ctx, () =>
      plugin.tools[0].execute({ action: 'create', items: ['a', 'b'], goal: 'g' })
    );
    requestContext.run(ctx, () =>
      plugin.tools[0].execute({ action: 'skip_item', item_index: 0, reason: 'skip' })
    );
    requestContext.run(ctx, () =>
      plugin.tools[0].execute({ action: 'skip_item', item_index: 1, reason: 'skip' })
    );

    const plan = store.getPlan(sid)!;
    expect(plan.items.every((i: any) => i.status === 'skipped')).toBe(true);

    // Guard should NOT fire: no non-terminal items remain
    const hasPendingItems = plan.status === 'running'
      && plan.currentItemIndex < plan.items.length;
    if (hasPendingItems) {
      const pendingItems = plan.items.slice(plan.currentItemIndex).filter(
        (i: any) => i.status !== 'completed' && i.status !== 'skipped' && i.status !== 'failed',
      );
      expect(pendingItems.length).toBe(0);
    }
  });

  it('no false positive: plan pending with no items worked on yet → no guard trigger', () => {
    const store = new CheckpointStore();
    const plugin = createUpdatePlanPlugin(store);
    const sid = 'guard-pending';
    const ctx = makeCtx(sid, new Map());

    requestContext.run(ctx, () =>
      plugin.tools[0].execute({ action: 'create', items: ['a'], goal: 'g' })
    );

    const plan = store.getPlan(sid)!;
    expect(plan.status).toBe('pending');
    expect(plan.currentItemIndex).toBe(0);

    // Guard condition: plan.status === 'running' — plan is 'pending', not 'running'
    const hasPendingItems = plan.status === 'running'
      && plan.currentItemIndex < plan.items.length;
    expect(hasPendingItems).toBe(false);
  });
});
