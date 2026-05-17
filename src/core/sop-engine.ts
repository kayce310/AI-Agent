/**
 * Kato Agent — SOP Engine (Phase 7.1b)
 * 
 * Executes SOP steps sequentially, routing each step to the right handler:
 * - 'llm' → model adapter for LLM generation
 * - 'tool' → tool registry call
 * - 'sub-sop' → recursive SOP execution
 * - 'decision' → conditional branching
 * - 'verify' → validation check
 */

import { SOP, SOPStep } from './sop-registry.js';
import { ModelResponse, ModelAdapter } from './model-adapter.js';

export interface SOPExecutionContext {
  sopId: string;
  currentStepIndex: number;
  results: Map<string, SOPStepResult>;
  startTime: number;
  variables: Record<string, string>;
}

export interface SOPStepResult {
  stepId: string;
  status: 'success' | 'failure' | 'skipped' | 'error';
  output: string;
  durationMs: number;
  error?: string;
  retriesUsed: number;
}

export interface SOPEngineOptions {
  llmProvider?: (instruction: string, context: string) => Promise<string>;
  toolProvider?: (toolName: string, input: string) => Promise<string>;
  sopProvider?: (sopId: string) => SOP | undefined;
  onStepComplete?: (step: SOPStep, result: SOPStepResult) => void;
  onError?: (step: SOPStep, error: Error) => void;
}

export interface SOPEngine {
  execute(sop: SOP, initialVars?: Record<string, string>): Promise<SOPExecutionContext>;
  getResult(id: string): SOPExecutionContext | undefined;
}

export function createSOPEngine(options: SOPEngineOptions): SOPEngine {
  const results = new Map<string, SOPExecutionContext>();

  async function executeStep(
    step: SOPStep,
    context: string,
    sop: SOP,
    vars: Record<string, string>,
    stepIndex: number,
  ): Promise<SOPStepResult> {
    const startTime = Date.now();
    let retriesUsed = 0;
    const maxRetries = step.retryCount ?? 0;

    while (retriesUsed <= maxRetries) {
      try {
        let output = '';

        switch (step.type) {
          case 'llm': {
            if (!options.llmProvider) throw new Error('No LLM provider configured for SOP engine');
            const interpolatedInstruction = interpolateVars(step.instruction, vars);
            output = await options.llmProvider(interpolatedInstruction, context);
            break;
          }

          case 'tool': {
            if (!options.toolProvider) throw new Error('No tool provider configured for SOP engine');
            if (!step.toolName) throw new Error(`Step ${step.id} has no toolName for tool step`);
            output = await options.toolProvider(step.toolName, step.instruction);
            break;
          }

          case 'sub-sop': {
            if (!options.sopProvider) throw new Error('No SOP provider configured for SOP engine');
            if (!step.subSOPId) throw new Error(`Step ${step.id} has no subSOPId for sub-sop step`);
            const subSOP = options.sopProvider(step.subSOPId);
            if (!subSOP) throw new Error(`Sub-SOP '${step.subSOPId}' not found`);
            const subCtx = await execute(subSOP, vars);
            output = formatSubSOPResult(subCtx);
            break;
          }

          case 'decision': {
            if (!options.llmProvider) throw new Error('No LLM provider for decision step');
            const decisionPrompt = `Given this context:\n${context}\n\nDecision needed: ${step.instruction}\n\nRespond with exactly one of: YES / NO / CONDITIONAL`;
            output = await options.llmProvider(decisionPrompt, context);
            break;
          }

          case 'verify': {
            if (!options.llmProvider) throw new Error('No LLM provider for verify step');
            const verifyPrompt = `Verify the following against expectations:\n\nContext: ${context}\n\nCheck: ${step.instruction}\nExpected: ${step.expectedOutput || 'No specific expectation'}\n\nRespond with PASS or FAIL and reason.`;
            output = await options.llmProvider(verifyPrompt, context);
            break;
          }

          default:
            throw new Error(`Unknown step type: ${step.type}`);
        }

        const durationMs = Date.now() - startTime;
        const result: SOPStepResult = {
          stepId: step.id,
          status: 'success',
          output,
          durationMs,
          retriesUsed,
        };

        options.onStepComplete?.(step, result);
        return result;
      } catch (err) {
        retriesUsed++;
        const error = err instanceof Error ? err : new Error(String(err));
        if (retriesUsed > maxRetries) {
          const durationMs = Date.now() - startTime;
          const result: SOPStepResult = {
            stepId: step.id,
            status: 'error',
            output: '',
            durationMs,
            error: error.message,
            retriesUsed,
          };
          options.onError?.(step, error);
          return result;
        }
      }
    }

    // Unreachable — but satisfies TS
    throw new Error('Unexpected: retry loop exited without result');
  }

  function buildContext(sop: SOP, results: Map<string, SOPStepResult>): string {
    const parts: string[] = [`SOP: ${sop.name} (${sop.description})`];
    for (const [stepId, result] of results) {
      parts.push(`\nStep ${stepId}: ${result.status}`);
      if (result.output) parts.push(`Output: ${result.output.slice(0, 500)}`);
      if (result.error) parts.push(`Error: ${result.error}`);
    }
    return parts.join('\n');
  }

  function formatSubSOPResult(ctx: SOPExecutionContext): string {
    const lines: string[] = ['[Sub-SOP Results]'];
    for (const [, result] of ctx.results) {
      lines.push(`  ${result.stepId}: ${result.status}`);
      if (result.output) lines.push(`    → ${result.output.slice(0, 200)}`);
    }
    return lines.join('\n');
  }

  async function execute(
    sop: SOP,
    initialVars: Record<string, string> = {},
  ): Promise<SOPExecutionContext> {
    const ctx: SOPExecutionContext = {
      sopId: sop.id,
      currentStepIndex: 0,
      results: new Map(),
      startTime: Date.now(),
      variables: { ...initialVars },
    };

    for (let i = 0; i < sop.steps.length; i++) {
      ctx.currentStepIndex = i;
      const step = sop.steps[i];
      const context = buildContext(sop, ctx.results);
      const result = await executeStep(step, context, sop, ctx.variables, i);
      ctx.results.set(step.id, result);

      // Update variables from successful step output
      if (result.status === 'success' && result.output) {
        ctx.variables[`step-${step.id}-output`] = result.output;
        ctx.variables[`step-${i + 1}-output`] = result.output;
      }

      // Stop on critical failure
      if (result.status === 'error') {
        break;
      }
    }

    results.set(sop.id, ctx);
    return ctx;
  }

  return {
    execute,
    getResult(id: string): SOPExecutionContext | undefined {
      return results.get(id);
    },
  };
}

/** Interpolate {{variable}} placeholders with values */
function interpolateVars(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(.+?)\}\}/g, (_, key) => {
    const trimmedKey = key.trim();
    return vars[trimmedKey] !== undefined ? vars[trimmedKey] : `{{${trimmedKey}}}`;
  });
}

/**
 * Helper: create a full SOP engine with model adapter integration.
 * Wraps ModelAdapter for LLM steps.
 */
export function createEngineWithAdapter(
  adapter: ModelAdapter,
  sopRegistry: { get: (id: string) => SOP | undefined },
): SOPEngine {
  return createSOPEngine({
    llmProvider: async (instruction: string, context: string) => {
      const messages = [
        { role: 'system' as const, content: `You are executing SOP steps. Follow instructions precisely.\n\nContext:\n${context}` },
        { role: 'user' as const, content: instruction },
      ];
      const response: ModelResponse = await adapter.invoke(messages, { maxTokens: 2048 });
      return response.content;
    },
    toolProvider: async (toolName: string, input: string) => {
      // Default: pass to LLM with tool context
      return `[Tool ${toolName} would be called with: ${input.slice(0, 200)}]`;
    },
    sopProvider: (sopId: string) => sopRegistry.get(sopId),
  });
}