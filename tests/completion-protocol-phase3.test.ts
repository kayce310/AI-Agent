
import { describe, it, expect, beforeEach } from 'vitest';
import { protocolManager } from '../src/core/plan/protocol-manager.js';
import { mockIndependentVerifier } from '../src/core/plan/independent-verifier.js';
import type { PlanItem, TaskPlan, AcceptanceCriterion } from '../src/core/plan/types.js';

describe('Phase 3: Independent Verification & Budget', () => {
  beforeEach(() => {
    (protocolManager as any).attempts.clear();
  });

  const createItem = (status: any = 'awaiting_verification'): PlanItem => ({
    index: 0,
    description: 'test',
    status,
    consecutiveFailedAttempts: 0,
    criteria: [{ id: 'c1', mechanism: 'llm', required: true } as any]
  });

  const createPlan = (item: PlanItem): TaskPlan => ({
    id: 'p1',
    items: [item],
    status: 'running',
    currentItemIndex: 0
  } as any);

  it('PASS -> COMPLETE', async () => {
    mockIndependentVerifier.setNextVerdict('pass');
    protocolManager.setVerifier(mockIndependentVerifier);
    const item = createItem();
    const plan = createPlan(item);
    await protocolManager.verifyItem(plan, 0, {});
    expect(item.status).toBe('completed');
  });

  it('FAIL -> IN_PROGRESS', async () => {
    mockIndependentVerifier.setNextVerdict('fail');
    const item = createItem();
    const plan = createPlan(item);
    await protocolManager.verifyItem(plan, 0, {});
    expect(item.status).toBe('in_progress');
  });

  it('INCONCLUSIVE -> IN_PROGRESS', async () => {
    mockIndependentVerifier.setNextVerdict('inconclusive');
    const item = createItem();
    const plan = createPlan(item);
    await protocolManager.verifyItem(plan, 0, {});
    expect(item.status).toBe('in_progress');
  });

  it('Budget Exhaustion -> ESCALATED', async () => {
    mockIndependentVerifier.setNextVerdict('fail');
    const item = createItem();
    const plan = createPlan(item);
    
    await protocolManager.verifyItem(plan, 0, {}); // #1
    item.status = 'awaiting_verification';
    await protocolManager.verifyItem(plan, 0, {}); // #2
    item.status = 'awaiting_verification';
    await protocolManager.verifyItem(plan, 0, {}); // #3
    item.status = 'awaiting_verification';
    
    const verified = await protocolManager.verifyItem(plan, 0, {}); // #4 (exhaust)
    expect(verified).toBe(false);
    expect(item.status).toBe('escalated');
  });

  it('Pure runtime completion still works (Phase 2 regression)', async () => {
    const item: PlanItem = {
      index: 0,
      description: 'rt',
      status: 'in_progress',
      consecutiveFailedAttempts: 0,
      criteria: [{ id: 'c1', mechanism: 'runtime', required: true, evaluatorId: 'e1' } as any]
    };
    const plan = createPlan(item);
    
    const eligibility = { canAutoComplete: true, itemIndex: 0 } as any;
    protocolManager.applyPureRuntimeCompletion(plan, 0, eligibility);
    expect(item.status).toBe('completed');
  });
});
