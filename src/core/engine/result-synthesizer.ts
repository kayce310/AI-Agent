/**
 * @file result-synthesizer — Core Engine component
 * @layer core
 * @depends-on src/core/tools/tool-registry.ts, src/core/llm/model-adapter.ts
 * @imported-by src/scripts/start-discord.ts
 * @owner core-engine
 */

/**
 * Kato Agent — ResultSynthesizer (Execution Summary → Human Response)
 * Phase 5.1c — final LLM call to synthesize execution results
 *
 * Takes an ExecutionReport (from PlanExecutor) and the original task,
 * then makes one LLM call to produce a coherent human-readable response.
 *
 * This is the "synthesize" step in the Bernstein pattern:
 *   decompose → execute → synthesize
 */

import { ModelAdapter, ModelResponse } from '../llm/model-adapter.js';
import { ExecutionReport } from './plan-executor.js';

// ── System Prompt ──

const SYNTHESIZE_SYSTEM_PROMPT = `You are a response synthesis engine.
You are given the results of executing a multi-step plan and must produce a coherent, helpful response to the user.

CRITICAL FORMATTING RULES:
1. If the plan has sub-tasks, include their outputs in your response
2. If all sub-tasks succeeded, present the results clearly
3. If any sub-task failed, mention it and explain what was accomplished despite the error
4. Do NOT mention "sub-task", "execution report", "plan executor", or internal implementation details
5. Format the response naturally as a direct answer to the user's question
6. If there are multiple parts, use clear section headers or bullet points
7. Keep the response focused on what the user asked for`;

// ── ResultSynthesizer Class ──

export class ResultSynthesizer {
  private model: ModelAdapter;
  private debug: boolean;

  constructor(model: ModelAdapter, debug = false) {
    this.model = model;
    this.debug = debug;
  }

  /**
   * Synthesize an execution report into a human-readable response.
   * Makes 1 LLM call with the report + original task as context.
   */
  async synthesize(report: ExecutionReport, originalTask: string): Promise<string> {
    if (this.debug) {
      console.log(`🪡 ResultSynthesizer: ${report.results.length} results, ${report.errorCount} errors`);
    }

    // Edge case: single task with no errors → just return its output
    if (report.results.length === 1 && report.errorCount === 0) {
      const output = report.results[0].output.trim();
      if (output.length > 0) {
        return output;
      }
    }

    // Build context from report
    const context = this.buildContext(report);

    const messages: any[] = [
      { role: 'system', content: SYNTHESIZE_SYSTEM_PROMPT },
      {
        role: 'user',
        content: `Original task: ${originalTask}\n\nExecution results:\n${context}\n\nProduce a clear, helpful response for the user.`,
      },
    ];

    try {
      const response: ModelResponse = await this.model.invoke(messages, {
        temperature: 0.5,
        maxTokens: 4096,
      });

      return response.content;
    } catch (err: any) {
      // Fallback: concatenate all outputs
      if (this.debug) {
        console.warn(`⚠️ ResultSynthesizer LLM call failed: ${err.message}`);
      }
      return this.fallbackSynthesis(report);
    }
  }

  // ── Private ──

  private buildContext(report: ExecutionReport): string {
    const parts: string[] = [];

    for (const result of report.results) {
      if (result.error) {
        parts.push(`[Task: ${result.description}]\nStatus: FAILED\nError: ${result.error}\n`);
      } else if (result.output.trim()) {
        parts.push(`[Task: ${result.description}]\n${result.output.trim()}\n`);
      }
    }

    return parts.join('---\n');
  }

  private fallbackSynthesis(report: ExecutionReport): string {
    const parts: string[] = [];
    const errors: string[] = [];

    for (const result of report.results) {
      if (result.error) {
        errors.push(result.description);
      } else if (result.output.trim()) {
        parts.push(result.output.trim());
      }
    }

    let response = parts.join('\n\n');

    if (errors.length > 0) {
      response += `\n\n⚠️ Failed to complete: ${errors.join(', ')}`;
    }

    return response || 'No results produced.';
  }
}