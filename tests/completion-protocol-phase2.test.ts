import { describe, it, expect, beforeEach, vi } from 'vitest';
import { protocolManager } from '../src/core/plan/protocol-manager.js';
import { evaluatorRegistry } from '../src/core/plan/evaluator-registry.js';
import type { PlanItem, TaskPlan, AcceptanceCriterion } from '../src/core/plan/types.js';

describe('Completion Protocol Phase 2 - ProtocolManager', () => {
  
  beforeEach(() => {
    // Clear registry for clean tests
    (evaluatorRegistry as any).evaluators.clear();
  });

  it('required runtime criterion PASS -> eligible', async () => {
    const criterion: AcceptanceCriterion = {
      id: 'c1',
      description: 'Files exist',
      tracesTo: 'goal-1',
      mechanism: 'runtime',
      independence: 'same_context',
      required: true,
      provenance: 'planner',
      planVersion: '1',
      createdAt: Date.now(),
      evaluatorId: 'eval-exist'
    };

    evaluatorRegistry.register('eval-exist', async () => ({
      criterionId: 'c1',
      outcome: 'pass',
      evaluatedAt: Date.now()
    }));

    const item: PlanItem = {
      index: 0,
      description: 'Test item',
      status: 'in_progress',
      consecutiveFailedAttempts: 0,
      criteria: [criterion]
    };

    const eligibility = await protocolManager.evaluateItem(item, {});
    expect(eligibility.eligible).toBe(true);
    expect(eligibility.canAutoComplete).toBe(true);
    expect(eligibility.evaluations[0].outcome).toBe('pass');
  });

  it('required runtime criterion FAIL -> not complete', async () => {
    const criterion: AcceptanceCriterion = {
      id: 'c1',
      description: 'Files exist',
      tracesTo: 'goal-1',
      mechanism: 'runtime',
      independence: 'same_context',
      required: true,
      provenance: 'planner',
      planVersion: '1',
      createdAt: Date.now(),
      evaluatorId: 'eval-exist'
    };

    evaluatorRegistry.register('eval-exist', async () => ({
      criterionId: 'c1',
      outcome: 'fail',
      evaluatedAt: Date.now()
    }));

    const item: PlanItem = {
      index: 0,
      description: 'Test item',
      status: 'in_progress',
      consecutiveFailedAttempts: 0,
      criteria: [criterion]
    };

    const eligibility = await protocolManager.evaluateItem(item, {});
    expect(eligibility.eligible).toBe(false);
    expect(eligibility.canAutoComplete).toBe(false);
    expect(eligibility.evaluations[0].outcome).toBe('fail');
  });

  it('optional failing criterion does not block completion', async () => {
    const criterion: AcceptanceCriterion = {
      id: 'c1',
      description: 'Optional check',
      tracesTo: 'goal-1',
      mechanism: 'runtime',
      independence: 'same_context',
      required: false,
      provenance: 'planner',
      planVersion: '1',
      createdAt: Date.now(),
      evaluatorId: 'eval-fail'
    };

    evaluatorRegistry.register('eval-fail', async () => ({
      criterionId: 'c1',
      outcome: 'fail',
      evaluatedAt: Date.now()
    }));

    const item: PlanItem = {
      index: 0,
      description: 'Test item',
      status: 'in_progress',
      consecutiveFailedAttempts: 0,
      criteria: [criterion]
    };

    const eligibility = await protocolManager.evaluateItem(item, {});
    expect(eligibility.eligible).toBe(true);
    expect(eligibility.canAutoComplete).toBe(true);
  });

  it('invalid/missing evaluator cannot PASS', async () => {
    const criterion: AcceptanceCriterion = {
      id: 'c1',
      description: 'Missing eval',
      tracesTo: 'goal-1',
      mechanism: 'runtime',
      independence: 'same_context',
      required: true,
      provenance: 'planner',
      planVersion: '1',
      createdAt: Date.now(),
      evaluatorId: 'non-existent'
    };

    const item: PlanItem = {
      index: 0,
      description: 'Test item',
      status: 'in_progress',
      consecutiveFailedAttempts: 0,
      criteria: [criterion]
    };

    const eligibility = await protocolManager.evaluateItem(item, {});
    expect(eligibility.eligible).toBe(false);
    expect(eligibility.evaluations[0].outcome).toBe('inconclusive');
  });

  it('pure-runtime criteria can auto-complete without complete_item', async () => {
    const plan: TaskPlan = {
      id: 'p1',
      sessionId: 's1',
      requestId: 'r1',
      goal: 'Goal',
      status: 'running',
      currentItemIndex: 0,
      createdAt: Date.now(),
      abandonAfterMs: 3600000,
      items: [{
        index: 0,
        description: 'Item 0',
        status: 'in_progress',
        consecutiveFailedAttempts: 0,
        criteria: [{
          id: 'c1',
          description: 'Runtime check',
          tracesTo: 'g1',
          mechanism: 'runtime',
          independence: 'same_context',
          required: true,
          provenance: 'planner',
          planVersion: '1',
          createdAt: Date.now(),
          evaluatorId: 'eval-pass'
        }]
      }]
    };

    evaluatorRegistry.register('eval-pass', async () => ({
      criterionId: 'c1',
      outcome: 'pass',
      evaluatedAt: Date.now()
    }));

    const eligibility = await protocolManager.evaluateItem(plan.items[0], {});
    const completed = protocolManager.applyPureRuntimeCompletion(plan, 0, eligibility);
    
    expect(completed).toBe(true);
    expect(plan.items[0].status).toBe('completed');
    expect(plan.status).toBe('completed');
  });

  it('required semantic criterion prevents pure-runtime auto-complete', async () => {
    const item: PlanItem = {
      index: 0,
      description: 'Semantic item',
      status: 'in_progress',
      consecutiveFailedAttempts: 0,
      criteria: [{
        id: 'c1',
        description: 'LLM check',
        tracesTo: 'g1',
        mechanism: 'llm',
        independence: 'independent',
        required: true,
        provenance: 'planner',
        planVersion: '1',
        createdAt: Date.now()
      }]
    };

    const eligibility = await protocolManager.evaluateItem(item, {});
    expect(eligibility.eligible).toBe(false); // blocked by required semantic pending
    expect(eligibility.canAutoComplete).toBe(false);
    expect(eligibility.hasSemanticCriteria).toBe(true);
  });
});
