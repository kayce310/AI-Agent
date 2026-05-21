/**
 * @file supervisor — Agent pattern
 * @layer core
 * @depends-on (none — standalone)
 * @imported-by src/core/patterns/index.ts
 * @owner core-patterns
 */

/**
 * Supervisor Pattern
 * Monitors agent execution, validates intermediate steps, and intervenes on errors.
 * 
 * The supervisor:
 * 1. Monitors each step of agent execution
 * 2. Validates intermediate outputs against expected criteria
 * 3. Intervenes when errors or deviations are detected
 * 4. Provides corrective feedback to the agent
 * 5. Decides whether to retry, escalate, or abort
 */

export interface StepResult {
  stepNumber: number;
  action: string;
  output: string;
  status: 'success' | 'warning' | 'error';
  feedback?: string;
}

export interface SupervisorConfig {
  maxRetries: number;
  strictMode: boolean;
  validationCriteria: string[];
}

export class Supervisor {
  private config: SupervisorConfig;
  private stepHistory: StepResult[] = [];
  private interventionCount: number = 0;

  constructor(config?: Partial<SupervisorConfig>) {
    this.config = {
      maxRetries: 3,
      strictMode: false,
      validationCriteria: ['output_not_empty', 'no_harmful_content', 'task_relevant'],
      ...config,
    };
  }

  /**
   * Validate a step result and decide whether to proceed, retry, or abort.
   */
  validateStep(step: StepResult): { decision: 'proceed' | 'retry' | 'abort'; feedback: string } {
    this.stepHistory.push(step);

    if (step.status === 'error') {
      const retryCount = this.stepHistory.filter(s => s.action === step.action && s.status === 'error').length;
      if (retryCount >= this.config.maxRetries) {
        return {
          decision: 'abort',
          feedback: `Step "${step.action}" failed ${retryCount} times. Aborting. Last error: ${step.output}`,
        };
      }
      return {
        decision: 'retry',
        feedback: this.generateCorrection(step),
      };
    }

    if (step.status === 'warning' && this.config.strictMode) {
      return {
        decision: 'retry',
        feedback: `Warning detected: ${step.output}. Please revise.`,
      };
    }

    // Validate against criteria
    const failures = this.runValidationChecks(step);
    if (failures.length > 0) {
      return {
        decision: 'retry',
        feedback: `Validation failed: ${failures.join(', ')}. Please correct.`,
      };
    }

    return { decision: 'proceed', feedback: 'Step validated successfully.' };
  }

  private runValidationChecks(step: StepResult): string[] {
    const failures: string[] = [];

    for (const criterion of this.config.validationCriteria) {
      switch (criterion) {
        case 'output_not_empty':
          if (!step.output || step.output.trim().length === 0) {
            failures.push('Output is empty');
          }
          break;
        case 'no_harmful_content':
          if (this.containsHarmfulContent(step.output)) {
            failures.push('Potentially harmful content detected');
          }
          break;
        case 'task_relevant':
          if (step.output.length < 10) {
            failures.push('Output too short to be relevant');
          }
          break;
      }
    }

    return failures;
  }

  private containsHarmfulContent(output: string): boolean {
    const harmfulPatterns = [
      /ignore (all |previous |above )?instructions/i,
      /jailbreak/i,
      /bypass (security|filter|restriction)/i,
    ];
    return harmfulPatterns.some(p => p.test(output));
  }

  private generateCorrection(step: StepResult): string {
    this.interventionCount++;
    return `Intervention #${this.interventionCount}: Step "${step.action}" failed with: ${step.output}\n\n` +
      `Please:\n1. Review the error\n2. Adjust your approach\n3. Try again with a different strategy\n` +
      `Max retries remaining: ${this.config.maxRetries - this.stepHistory.filter(s => s.action === step.action && s.status === 'error').length}`;
  }

  /**
   * Get supervision statistics.
   */
  getStats(): { totalSteps: number; interventions: number; successRate: number } {
    const total = this.stepHistory.length;
    const successes = this.stepHistory.filter(s => s.status === 'success').length;
    return {
      totalSteps: total,
      interventions: this.interventionCount,
      successRate: total > 0 ? successes / total : 0,
    };
  }

  /**
   * Get full step history.
   */
  getHistory(): StepResult[] {
    return [...this.stepHistory];
  }
}

export default Supervisor;