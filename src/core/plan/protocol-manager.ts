/**
 * @file Protocol Manager — Completion Authority Orchestrator
 * @layer core
 * @owner core-engine
 *
 * Implements the Runtime Completion Authority layer of Completion Protocol v1.2.
 * Core principle: LLM proposes, Runtime governs progress.
 *
 * Phase 3: Independent Verification.
 */

import { Logger } from '../logger.js';
import { evaluatorRegistry } from './evaluator-registry.js';
import { IndependentVerifier } from './independent-verifier.js';
import type { TaskPlan, PlanItem, CriterionEvaluation, AcceptanceCriterion } from './types.js';

const log = new Logger({ module: 'ProtocolManager' });

export interface CompletionEligibility {
  eligible: boolean;
  itemIndex: number;
  evaluations: CriterionEvaluation[];
  canAutoComplete: boolean;
  hasSemanticCriteria: boolean;
  reason?: string;
}

export class ProtocolManager {
  private verifier?: IndependentVerifier;
  private attempts: Map<string, number> = new Map(); // planId:itemIndex -> count

  setVerifier(verifier: IndependentVerifier) {
    this.verifier = verifier;
  }

  async evaluateItem(item: PlanItem, evidence: any): Promise<CompletionEligibility> {
    const evaluations: CriterionEvaluation[] = [];
    const criteria = item.criteria || [];
    
    if (criteria.length === 0) {
      return {
        eligible: false,
        itemIndex: item.index,
        evaluations: [],
        canAutoComplete: false,
        hasSemanticCriteria: false,
        reason: 'Legacy item with no acceptance criteria.'
      };
    }

    let hasSemantic = false;
    let requiredRuntimePassed = true;
    let blockedByRequired = false;

    for (const crit of criteria) {
      if (crit.mechanism === 'llm') {
        hasSemantic = true;
        evaluations.push({
          criterionId: crit.id,
          outcome: 'pending',
          evaluatedAt: Date.now(),
          reasoning: 'Semantic criteria evaluation deferred to IndependentVerifier'
        });
        if (crit.required) blockedByRequired = true;
        continue;
      }
      if (crit.mechanism === 'runtime') {
        if (!crit.evaluatorId) {
          evaluations.push({ criterionId: crit.id, outcome: 'inconclusive', evaluatedAt: Date.now(), reasoning: 'Missing evaluatorId' });
          if (crit.required) { requiredRuntimePassed = false; blockedByRequired = true; }
          continue;
        }
        const evaluation = await evaluatorRegistry.resolve(crit.evaluatorId, evidence);
        evaluations.push(evaluation);
        if (crit.required && evaluation.outcome !== 'pass') { requiredRuntimePassed = false; blockedByRequired = true; }
      }
    }

    return {
      eligible: !blockedByRequired,
      itemIndex: item.index,
      evaluations,
      canAutoComplete: !hasSemantic && requiredRuntimePassed,
      hasSemanticCriteria: hasSemantic,
      reason: blockedByRequired ? 'Blocked by required criteria' : undefined
    };
  }

  applyPureRuntimeCompletion(plan: TaskPlan, itemIndex: number, eligibility: CompletionEligibility): boolean {
    if (!eligibility.canAutoComplete) return false;
    const item = plan.items[itemIndex];
    if (!item || item.status !== 'in_progress') return false;
    item.status = 'completed';
    this.advancePlan(plan, itemIndex);
    return true;
  }

  async verifyItem(plan: TaskPlan, itemIndex: number, evidence: any): Promise<boolean> {
    const item = plan.items[itemIndex];
    if (!item || item.status !== 'awaiting_verification' || !this.verifier) return false;

    const key = `${plan.id}:${itemIndex}`;
    const count = (this.attempts.get(key) || 0) + 1;
    this.attempts.set(key, count);

    if (count > 3) {
      log.warn(`[ProtocolManager] Budget exhausted for ${key}`);
      item.status = 'escalated';
      return false;
    }

    const semanticCriteria = (item.criteria || []).filter(c => c.mechanism === 'llm');
    if (semanticCriteria.length === 0) return false;

    let allPassed = true;
    for (const crit of semanticCriteria) {
      const verdict = await this.verifier.verify(crit.id, evidence);
      if (verdict !== 'pass') allPassed = false;
    }

    if (allPassed) {
      item.status = 'completed';
      this.advancePlan(plan, itemIndex);
      return true;
    } else {
      item.status = 'in_progress';
      return false;
    }
  }

  private advancePlan(plan: TaskPlan, completedIndex: number) {
    plan.currentItemIndex = completedIndex + 1;
    if (plan.items.every(i => i.status === 'completed' || i.status === 'skipped' || i.status === 'failed')) {
      plan.status = 'completed';
      plan.completedAt = Date.now();
    }
  }
}

export const protocolManager = new ProtocolManager();
