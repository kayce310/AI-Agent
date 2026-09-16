import { describe, it, expect, beforeEach } from 'vitest';
import { evaluatorRegistry } from '../src/core/plan/evaluator-registry.js';
import { evidenceVault } from '../src/core/plan/evidence-vault.ts';
import type { PlanItemStatus, PlanStatus } from '../src/core/plan/types.js';

describe('Completion Protocol Phase 1 - Foundation', () => {
  it('should support new PlanItem states', () => {
    const s1: PlanItemStatus = 'awaiting_verification';
    const s2: PlanItemStatus = 'escalated';
    expect(s1).toBe('awaiting_verification');
    expect(s2).toBe('escalated');
  });

  it('should support new PlanStatus states', () => {
    const s1: PlanStatus = 'awaiting_verification';
    const s2: PlanStatus = 'escalated';
    expect(s1).toBe('awaiting_verification');
    expect(s2).toBe('escalated');
  });

  it('should register and resolve evaluators in EvaluatorRegistry', async () => {
    const mockEvaluator = async (evidence: any) => ({
      criterionId: 'test-crit',
      outcome: 'pass' as const,
      evaluatedAt: Date.now(),
      evidence: 'Proven by test'
    });

    evaluatorRegistry.register('test-eval', mockEvaluator);
    expect(evaluatorRegistry.has('test-eval')).toBe(true);

    const result = await evaluatorRegistry.resolve('test-eval', {});
    expect(result.outcome).toBe('pass');
    expect(result.evidence).toBe('Proven by test');
  });

  it('should reject invalid evaluatorId with inconclusive outcome', async () => {
    const result = await evaluatorRegistry.resolve('non-existent', {});
    expect(result.outcome).toBe('inconclusive');
    expect(result.reasoning).toContain('missing in registry');
  });

  it('should store and retrieve evidence in EvidenceVault', () => {
    const evidence = {
      id: 'ev-1',
      planId: 'plan-1',
      itemIndex: 0,
      type: 'tool_result',
      payload: { foo: 'bar' },
      timestamp: Date.now()
    };

    evidenceVault.record(evidence);
    const retrieved = evidenceVault.getByItem('plan-1', 0);
    expect(retrieved.length).toBe(1);
    expect(retrieved[0].id).toBe('ev-1');
  });
});
