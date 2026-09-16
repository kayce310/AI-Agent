/**
 * @file Evaluator Registry — Runtime check for plan completion
 * @layer core
 * @owner core-engine
 *
 * Registry for runtime acceptance criteria evaluators.
 * Invariant #12: runtime mechanism MUST resolve a valid evaluator.
 */

import { Logger } from '../logger.js';
import type { CriterionEvaluation } from './types.js';

const log = new Logger({ module: 'EvaluatorRegistry' });

export type RuntimeEvaluator = (evidence: any) => Promise<CriterionEvaluation>;

class EvaluatorRegistry {
  private evaluators: Map<string, RuntimeEvaluator> = new Map();

  register(id: string, evaluator: RuntimeEvaluator) {
    this.evaluators.set(id, evaluator);
    log.info(`[EvaluatorRegistry] Registered: ${id}`);
  }

  async resolve(id: string, evidence: any): Promise<CriterionEvaluation> {
    const evaluator = this.evaluators.get(id);
    if (!evaluator) {
      log.error(`[EvaluatorRegistry] Invalid evaluatorId: ${id}`);
      return {
        criterionId: id,
        outcome: 'inconclusive',
        evidence: 'Evaluator not found',
        evaluatedAt: Date.now(),
        reasoning: `Evaluator ${id} missing in registry`
      };
    }
    return evaluator(evidence);
  }

  has(id: string): boolean {
    return this.evaluators.has(id);
  }
}

export const evaluatorRegistry = new EvaluatorRegistry();
