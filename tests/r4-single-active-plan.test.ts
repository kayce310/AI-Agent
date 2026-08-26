/**
 * @file r4-single-active-plan.test.ts — R4-F.2 Single Active-Plan Invariant
 * @layer tests
 * @spec docs/evidence/R4/R4_V1_SPEC.md
 *
 * B4 semantics = HARD-REJECT (product decision A, chốt 2026-08-26).
 * Verified at two layers per spec F2-AC5:
 *   - Tool layer: direct plugin execution, model-independent (S4)
 *   - Loop layer: full Agent.run() with scripted model attempting duplicate create (S3)
 *   - Recovery: crash/boot-recovery preserves exactly-one-active-plan (S5, R2 consumed as-is)
 */

import { describe, it, expect } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Agent } from '../src/core/engine/agent.js';
import { ToolRegistry } from '../src/core/tools/tool-registry.js';
import { CheckpointStore } from '../src/core/checkpoint.js';
import { createUpdatePlanPlugin } from '../src/core/plan/update-plan-tool.js';
import { requestContext, type RequestContext } from '../src/core/request-context.js';
import { isPlanActive, type PlanStatus, type TaskPlan } from '../src/core/plan/types.js';

function makeCtx(sessionId: string): RequestContext {
  return {
    sessionId,
    taskId: `task-${sessionId}`,
    evidenceLog: new Map(),
    onPlanCreated: () => {},
    userId: 'r4-tester',
  };
}

function makePlan(sessionId: string, id: string, status: PlanStatus, items: string[]): TaskPlan {
  return {
    id,
    sessionId,
    requestId: `req-${id}`,
    goal: `goal-${id}`,
    items: items.map((d, i) => ({ index: i, description: d, status: 'pending' as const, consecutiveFailedAttempts: 0 })),
    status,
    currentItemIndex: 0,
    createdAt: Date.now(),
    abandonAfterMs: 7200000,
  };
}

/** Execute update_plan through the real plugin (same instance production registers). */
function execTool(store: CheckpointStore, sessionId: string, args: Record<string, unknown>): Promise<any> {
  const plugin = createUpdatePlanPlugin(store);
  return requestContext.run(makeCtx(sessionId), () => plugin.tools[0].execute(args as any));
}

const ACTIVE_STATUSES: PlanStatus[] = ['pending', 'running', 'stuck'];

describe('R4-F.2 single active-plan invariant', () => {

  // ── S4: tool layer, model-independent ──

  it('F2-AC1/AC2: create with an active plan is HARD-REJECTED, existing plan byte-immutable', async () => {
    for (const status of ACTIVE_STATUSES) {
      const sid = `r4-f2-${status}`;
      const store = new CheckpointStore();
      store.start(`req-${sid}`, sid, 'seed');
      const original = makePlan(sid, `plan-${status}`, status, ['a', 'b']);
      store.setPlan(sid, original);
      expect(isPlanActive(status)).toBe(true);

      const before = JSON.parse(JSON.stringify(store.getPlan(sid)));
      const res = await execTool(store, sid, { action: 'create', items: ['intruder-x'], goal: 'INTRUDER' });

      // AC1: rejection observable + deterministic payload shape
      expect(typeof res.error).toBe('string');
      expect(res.error).toContain('already has active plan');
      expect(res.plan_id).toBe(`plan-${status}`);
      expect(res.plan_status).toBe(status);
      // No resume/guidance shape may ever appear
      expect(res).not.toHaveProperty('resumedExistingPlan');

      // AC2: existing plan immutable
      const after = JSON.parse(JSON.stringify(store.getPlan(sid)));
      expect(after).toEqual(before);
      expect(store.getPlan(sid)!.goal).not.toBe('INTRUDER');
    }
  });

  it('F2-AC3: repeated create attempts never produce a second active plan', async () => {
    const sid = 'r4-f2-repeat';
    const store = new CheckpointStore();
    store.start(`req-${sid}`, sid, 'seed');
    const original = makePlan(sid, 'plan-original', 'running', ['only-plan']);
    store.setPlan(sid, original);
    const before = JSON.parse(JSON.stringify(original));

    for (let n = 0; n < 3; n++) {
      const res = await execTool(store, sid, { action: 'create', items: [`attempt-${n}`] });
      expect(res.error).toContain('already has active plan');
    }

    const plan = store.getPlan(sid)!;
    expect(plan.id).toBe('plan-original');           // same identity
    expect(JSON.parse(JSON.stringify(plan))).toEqual(before); // untouched
  });

  it('negative control: create on a planless session still succeeds (guard is not blanket)', async () => {
    const sid = 'r4-f2-control';
    const store = new CheckpointStore();
    const res = await execTool(store, sid, { action: 'create', items: ['x', 'y'], goal: 'fresh' });
    expect(res.error).toBeUndefined();
    expect(res.plan_status).toBe('pending');
    expect(store.getPlan(sid)?.items.length).toBe(2);
  });

  // ── S5: crash / boot recovery (R2 consumed as-is) ──

  it('F2-AC4: after crash+boot recovery there is still exactly one active plan; hard-reject holds post-recovery', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'r4-cp-'));
    try {
      const sid = 'r4-f2-crash';
      // Store A: "pre-crash" — seed running plan, persist to disk
      const storeA = new CheckpointStore({ checkpointDir: dir });
      await storeA.init();
      storeA.start('req-crash', sid, 'crash scenario');
      const original = makePlan(sid, 'plan-crash-survivor', 'running', ['survived-item']);
      storeA.setPlan(sid, original);
      await storeA.shutdown(); // flush → disk

      // Store B: "post-crash" fresh process — boot recovery loads persisted state
      const storeB = new CheckpointStore({ checkpointDir: dir });
      await storeB.init();

      const recovered = storeB.getPlan(sid);
      expect(recovered).not.toBeNull();
      expect(recovered!.id).toBe('plan-crash-survivor');
      expect(isPlanActive(recovered!.status)).toBe(true);

      // Invariant holds after recovery: create is hard-rejected, survivor untouched
      const before = JSON.parse(JSON.stringify(storeB.getPlan(sid)));
      const res = await execTool(storeB, sid, { action: 'create', items: ['post-crash-intruder'] });
      expect(res.error).toContain('already has active plan');
      expect(res.plan_id).toBe('plan-crash-survivor');
      expect(JSON.parse(JSON.stringify(storeB.getPlan(sid)))).toEqual(before);

      await storeB.shutdown();
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  // ── S3: loop layer — scripted model attempts duplicate create mid-lifecycle ──

  it('F2-AC5(loop): duplicate create inside full Agent.run loop is rejected; original plan survives to completion', async () => {
    const SID = 'r4-f2-loop';
    const store = new CheckpointStore();
    store.start(`req-${SID}`, SID, 'loop scenario');

    const registry = new ToolRegistry();
    registry.use(createUpdatePlanPlugin(store));
    registry.use({
      name: 'r4_work',
      tools: [{
        name: 'r4_work',
        description: 'deterministic work',
        schema: { type: 'object', properties: { step: { type: 'number' } } },
        execute: async (args: Record<string, any>) => ({ ok: true, step: args.step }),
      }],
    });

    const toolPayloads: string[] = [];
    const queue = [
      tc('update_plan', { action: 'create', items: ['orig-a', 'orig-b'], goal: 'ORIGINAL' }, 'v1'),
      tc('r4_work', { step: 0 }, 'v2'),
      tc('update_plan', { action: 'complete_item', item_index: 0 }, 'v3'),
      // Duplicate create with DIFFERENT shape — if implementation wrongly resumes/replaces/merges, this shows up in final state
      tc('update_plan', { action: 'create', items: ['intruder-1', 'intruder-2', 'intruder-3'], goal: 'INTRUDER' }, 'v4'),
      tc('r4_work', { step: 1 }, 'v5'),
      tc('update_plan', { action: 'complete_item', item_index: 1 }, 'v6'),
      { content: 'done', finishReason: 'stop' },
    ];
    const route = async (messages: any[]) => {
      for (const m of messages) {
        if (m.role === 'tool') toolPayloads.push(typeof m.content === 'string' ? m.content : JSON.stringify(m.content));
      }
      return queue.shift()!;
    };

    const agent = new Agent({
      modelRouter: { route },
      toolRegistry: registry,
      checkpointStore: store,
      maxToolCycles: 15,
    } as any);

    const req = {
      sessionId: SID, messages: [{ role: 'user', content: 'R4 F2 loop' }], modelId: 'test',
      agentName: 'test', protocol: 'test', mentionPrefix: '', task: 'R4 F2 loop',
    };
    await requestContext.run(makeCtx(SID), () => agent.run(req as any));

    // Rejection observable inside the loop
    const rejectedInLoop = toolPayloads.some(p => p.includes('Cannot create plan: session already has active plan'));
    expect(rejectedInLoop, 'hard-reject payload reached the model').toBe(true);

    // Exactly-one: ORIGINAL plan identity survives; intruder items/goal nowhere
    const plan = store.getPlan(SID)!;
    expect(plan.goal).toBe('ORIGINAL');
    expect(plan.items.map(i => i.description)).toEqual(['orig-a', 'orig-b']);
    expect(plan.status).toBe('completed');
    expect(plan.items.every(i => i.status === 'completed')).toBe(true);
  });
});

function tc(name: string, args: Record<string, unknown>, id: string) {
  return {
    finishReason: 'tool_calls',
    toolCalls: [{ id, type: 'function', function: { name, arguments: JSON.stringify(args) } }],
  };
}
