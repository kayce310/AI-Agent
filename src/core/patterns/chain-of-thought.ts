/**
 * Chain-of-Thought Pattern
 * Structured reasoning with step-by-step thinking process.
 * 
 * Prompts the LLM to think through problems step by step,
 * improving accuracy for complex reasoning tasks.
 */

export interface CoTStep {
  stepNumber: number;
  thought: string;
  action?: string;
  observation?: string;
}

export interface CoTResult {
  steps: CoTStep[];
  finalAnswer: string;
  reasoning: string;
}

export class ChainOfThought {
  private maxSteps: number;

  constructor(maxSteps: number = 10) {
    this.maxSteps = maxSteps;
  }

  /**
   * Build a Chain-of-Thought prompt.
   */
  buildPrompt(task: string): string {
    return `Solve this problem step by step. Think carefully about each step.

Problem: ${task}

Let's work through this step by step:

Step 1:`;
  }

  /**
   * Parse CoT response into structured steps.
   */
  parseResponse(response: string): CoTResult {
    const lines = response.split('\n');
    const steps: CoTStep[] = [];
    let currentStep: Partial<CoTStep> = {};
    let stepNum = 0;

    for (const line of lines) {
      const stepMatch = line.match(/^Step\s*(\d+)[:\s]*(.*)/i);
      if (stepMatch) {
        if (stepNum > 0 && currentStep.thought) {
          steps.push(currentStep as CoTStep);
        }
        stepNum = parseInt(stepMatch[1], 10);
        currentStep = { stepNumber: stepNum, thought: stepMatch[2] };
      } else if (line.trim().length > 0 && stepNum > 0) {
        currentStep.thought = (currentStep.thought || '') + ' ' + line.trim();
      }
    }

    if (currentStep.thought) {
      steps.push(currentStep as CoTStep);
    }

    // Extract final answer
    const answerMatch = response.match(/(?:Final Answer|Answer|Result|Conclusion)[:\s]*(.+)/i);
    const finalAnswer = answerMatch ? answerMatch[1].trim() : steps[steps.length - 1]?.thought || '';

    return {
      steps,
      finalAnswer,
      reasoning: steps.map(s => `Step ${s.stepNumber}: ${s.thought}`).join('\n'),
    };
  }

  /**
   * Validate that CoT reasoning is complete.
   */
  validate(result: CoTResult): { valid: boolean; issues: string[] } {
    const issues: string[] = [];

    if (result.steps.length === 0) {
      issues.push('No reasoning steps found');
    }

    if (!result.finalAnswer || result.finalAnswer.trim().length === 0) {
      issues.push('No final answer provided');
    }

    if (result.steps.length > this.maxSteps) {
      issues.push(`Too many steps (${result.steps.length} > ${this.maxSteps})`);
    }

    return { valid: issues.length === 0, issues };
  }
}

export default ChainOfThought;