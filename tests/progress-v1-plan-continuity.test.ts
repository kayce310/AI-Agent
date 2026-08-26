/**
 * @file progress-v1-plan-continuity.test.ts — Phase 6 isolated regression
 * @layer tests
 *
 * Scope:
 * - only Progress V1 / plan lifecycle primitives that are already in the
 *   audited commit chain
 * - no imports from src/core/projects/
 * - no task-identity or task-boundary WIP
 */

import { describe, expect, it, vi } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { requestContext, type RequestContext } from '../src/core/request-context.js';
import { CheckpointStore } from '../src/core/checkpoint.js';
import { createUpdatePlanPlugin } from '../src/core/plan/update-plan-tool.js';
import { validateTransition, type TaskPlan } from '../src/core/plan/types.js';

function makeTempStore(): CheckpointStore {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'progress-v1-plan-'));
  return new CheckpointStore({ checkpointDir: dir, autoFlushIntervalMs: 0, maxFiles: 20 });
}

function makePlan(sessionId: string, id: string, status: TaskPlan['status']): TaskPlan {
  return {
    id,
    sessionId,
    requestId: id,
    goal: 'Baymax continuity regression',
    items: [
      { index: 0, description: 'item 0', status: 'pending', consecutiveFailedAttempts: 0 },
      { index: 1, description: 'item 1', status: 'pending', consecutiveFailedAttempts: 0 },
    ],
    status,
    currentItemIndex: 0,
    createdAt: Date.now(),
    abandonAfterMs: 2 * 60 * 60 * 1000,
  };
}

async function withRequestContext<T>(sessionId: string, fn: () => Promise<T>): Promise<T> {
  const ctx: RequestContext = {
    sessionId,
    taskId: `task-${sessionId}`,
    evidenceLog: new Map(),
    onPlanCreated: vi.fn(),
    userId: `user-${sessionId}`,
  };
  return await requestContext.run(ctx, fn);
}

describe('Progress V1 isolated plan continuity', () => {
  it('Case 1: active plan exists, create_plan resumes existing plan instead of hard-rejecting', async () => {
    const store = makeTempStore();
    const plugin = createUpdatePlanPlugin(store);
    const sessionId = 'phase6-case1';
    const existing = makePlan(sessionId, 'plan-case1', 'running');
    store.setPlan(sessionId, existing);

    const result = await withRequestContext(sessionId, async () => {
      async () => {
        return await plugin.tools[0].execute({
          action: 'create',
          items: ['Collect evidence', 'Write report'],
          goal: 'Baymax continuity',
        });
      });
      // With updated update-plan-tool.ts, an existing active plan returns guidance,
      // not a resume. The response contains plan data but no error.
      expect(result).toMatchObject({
        message: expect.stringContaining('Active plan already exists'),
        plan: {
          id: 'plan-case1',
          plan_status: 'running',
          current_item_index: 0,
        },
        plan_id: 'plan-case1',
        plan_status: 'running',
        current_item_index: 0,
        resumedExistingPlan: true,
      });
      expect(result).not.toHaveProperty('error');
      expect(store.getPlan(sessionId)?.id).toBe('plan-case1');
      expect(store.getPlan(sessionId)?.status).toBe('running');
  });

  it('Case 1b: active stuck plan also resumes existing plan instead of hard-rejecting', async () => {
    const store = makeTempStore();
    const plugin = createUpdatePlanPlugin(store);
    const sessionId = 'phase6-case1b';
    const existing = makePlan(sessionId, 'plan-case1b', 'running');
    expect(validateTransition(existing.status, 'stuck')).toBeNull();
    existing.status = 'stuck';
    store.setPlan(sessionId, existing);

    const result = await withRequestContext(sessionId, async () => {
      async () => {
        return await plugin.tools[0].execute({
          action: 'create',
          items: ['Try another route', 'Verify continuity'],
          goal: 'Baymax follow-up',
        });
      });
      // With updated update-plan-tool.ts, an existing active plan returns guidance,
      // not a resume. The response contains plan data but no error.
      expect(result).toMatchObject({
        message: expect.stringContaining('Active plan already exists'),
        plan: {
          id: 'plan-case1b',
          plan_status: 'stuck',
          current_item_index: 0,
        },
        plan_id: 'plan-case1b',
        plan_status: 'stuck',
        current_item_index: 0,
        resumedExistingPlan: true,
      });
      expect(store.getPlan(sessionId)?.id).toBe('plan-case1b');
      expect(store.getPlan(sessionId)?.status).toBe('stuck');
  });

  it('Case 2/3: stuck plan receives a new request and does not silently fail or replace the plan', async () => {
    const { Engine } = await import('../src/core/engine/engine.js');
    const store = makeTempStore();
    const sessionId = 'phase6-case2';
    const existing = makePlan(sessionId, 'plan-phase6-current', 'running');
    expect(validateTransition(existing.status, 'stuck')).toBeNull();
    existing.status = 'stuck';
    existing.stopReason = 'stagnation';
    store.setPlan(sessionId, existing);

    const engine = new Engine() as any;
    engine.checkpointStore = store;
    engine.agent = {
      circuitBreakerState: { isHealthy: () => true },
      setMaxToolCycles: vi.fn(),
      run: vi.fn(async () => ({
        content: 'ACK: continue handling the existing stuck plan.',
        modelUsed: 'test',
        providerUsed: 'test',
        toolCycles: 0,
        finished: true,
      })),
    };

    const result = await engine.process({
      sessionId,
      userId: 'user-phase6',
      messages: [{ role: 'user', content: 'please continue' }],
      modelId: 'test',
      agentName: 'Coral',
      protocol: 'test',
      mentionPrefix: '',
    });

    expect(engine.agent.run).toHaveBeenCalledTimes(1);
    expect(result.content).toContain('existing stuck plan');
    expect(store.getPlan(sessionId)?.id).toBe('plan-phase6-current');
    expect(store.getPlan(sessionId)?.status).toBe('stuck');
    expect(validateTransition(store.getPlan(sessionId)!.status, 'failed')).not.toBeNull();
  });
});
