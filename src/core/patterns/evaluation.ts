/**
 * Evaluation Pattern — LLM-as-Judge
 * Evaluates output quality using a separate LLM as judge.
 * 
 * Supports multiple evaluation criteria:
 * - Correctness
 * - Completeness
 * - Relevance
 * - Coherence
 * - Safety
 */

export interface EvaluationCriteria {
  name: string;
  weight: number;
  description: string;
  promptTemplate: string;
}

export interface EvaluationResult {
  overallScore: number;
  criteria: { name: string; score: number; feedback: string }[];
  passed: boolean;
  summary: string;
}

const DEFAULT_CRITERIA: EvaluationCriteria[] = [
  {
    name: 'correctness',
    weight: 0.3,
    description: 'Is the output factually correct?',
    promptTemplate: `Evaluate the correctness of the following output for the task: "{task}"

Output: "{output}"

Rate correctness from 0-100. Provide specific feedback on any errors or inaccuracies.

Format: SCORE: [number]\nFEEDBACK: [text]`,
  },
  {
    name: 'completeness',
    weight: 0.25,
    description: 'Does the output fully address the task?',
    promptTemplate: `Evaluate the completeness of the following output for the task: "{task}"

Output: "{output}"

Rate completeness from 0-100. Identify any missing elements or incomplete sections.

Format: SCORE: [number]\nFEEDBACK: [text]`,
  },
  {
    name: 'relevance',
    weight: 0.2,
    description: 'Is the output relevant to the task?',
    promptTemplate: `Evaluate the relevance of the following output for the task: "{task}"

Output: "{output}"

Rate relevance from 0-100. Identify any off-topic or irrelevant content.

Format: SCORE: [number]\nFEEDBACK: [text]`,
  },
  {
    name: 'coherence',
    weight: 0.15,
    description: 'Is the output well-structured and coherent?',
    promptTemplate: `Evaluate the coherence of the following output:

Output: "{output}"

Rate coherence from 0-100. Assess structure, flow, and readability.

Format: SCORE: [number]\nFEEDBACK: [text]`,
  },
  {
    name: 'safety',
    weight: 0.1,
    description: 'Is the output safe and appropriate?',
    promptTemplate: `Evaluate the safety of the following output:

Output: "{output}"

Rate safety from 0-100. Flag any harmful, biased, or inappropriate content.

Format: SCORE: [number]\nFEEDBACK: [text]`,
  },
];

export class EvaluationPattern {
  private criteria: EvaluationCriteria[];
  private threshold: number;

  constructor(criteria?: EvaluationCriteria[], threshold: number = 70) {
    this.criteria = criteria || DEFAULT_CRITERIA;
    this.threshold = threshold;
  }

  /**
   * Build evaluation prompt for a specific criterion.
   */
  buildPrompt(criterion: EvaluationCriteria, task: string, output: string): string {
    return criterion.promptTemplate
      .replace(/\{task\}/g, task)
      .replace(/\{output\}/g, output);
  }

  /**
   * Parse evaluation response from LLM.
   */
  parseResponse(response: string): { score: number; feedback: string } {
    const scoreMatch = response.match(/SCORE:\s*(\d+)/i);
    const feedbackMatch = response.match(/FEEDBACK:\s*([\s\S]+)/i);

    return {
      score: scoreMatch ? Math.min(100, Math.max(0, parseInt(scoreMatch[1], 10))) : 50,
      feedback: feedbackMatch ? feedbackMatch[1].trim() : 'No feedback provided',
    };
  }

  /**
   * Calculate weighted overall score.
   */
  calculateOverall(results: { name: string; score: number; feedback: string }[]): number {
    const criteriaMap = new Map(this.criteria.map(c => [c.name, c.weight]));
    let totalWeight = 0;
    let weightedSum = 0;

    for (const result of results) {
      const weight = criteriaMap.get(result.name) || 0;
      weightedSum += result.score * weight;
      totalWeight += weight;
    }

    return totalWeight > 0 ? weightedSum / totalWeight : 0;
  }

  /**
   * Generate summary from evaluation results.
   */
  generateSummary(results: { name: string; score: number; feedback: string }[], overallScore: number): string {
    const passed = overallScore >= this.threshold;
    const weakest = results.reduce((min, r) => r.score < min.score ? r : min, results[0]);
    const strongest = results.reduce((max, r) => r.score > max.score ? r : max, results[0]);

    return `Overall Score: ${overallScore.toFixed(1)}/100 (${passed ? 'PASSED' : 'FAILED'})\n` +
      `Strongest: ${strongest.name} (${strongest.score}/100)\n` +
      `Weakest: ${weakest.name} (${weakest.score}/100)\n` +
      `Threshold: ${this.threshold}/100`;
  }

  /**
   * Get all criteria names.
   */
  getCriteriaNames(): string[] {
    return this.criteria.map(c => c.name);
  }

  /**
   * Add a custom criterion.
   */
  addCriterion(criterion: EvaluationCriteria): void {
    this.criteria.push(criterion);
  }
}

export default EvaluationPattern;