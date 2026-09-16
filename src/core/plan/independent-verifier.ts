/**
 * @file Independent Verifier — Semantic verification contract
 * @layer core
 * @owner core-engine
 */

import type { CriterionEvaluation } from './types.js';

export type VerificationVerdict = 'pass' | 'fail' | 'inconclusive';

export interface IndependentVerifier {
  verify(criterionId: string, evidence: any): Promise<VerificationVerdict>;
}

/**
 * Mock Independent Verifier for Phase 3 testing.
 * In a real scenario, this would call an LLM Judge or an external service.
 */
export class MockIndependentVerifier implements IndependentVerifier {
  private nextVerdict: VerificationVerdict = 'pass';

  setNextVerdict(verdict: VerificationVerdict) {
    this.nextVerdict = verdict;
  }

  async verify(criterionId: string, evidence: any): Promise<VerificationVerdict> {
    return this.nextVerdict;
  }
}

export const mockIndependentVerifier = new MockIndependentVerifier();
