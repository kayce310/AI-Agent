/**
 * @file Auxiliary LLM — Fast/cheap model for context compression
 * @layer core
 * @depends-on src/core/llm/model-adapter.ts
 * @imported-by src/core/engine/agent.ts
 * @owner core-llm
 *
 * Wraps a fast, cheap LLM (e.g., Claude Haiku) for context compression.
 * Uses same model router infrastructure but with lower token budgets.
 */

import { ModelRouter } from './model-adapter.js';

export interface AuxiliaryLlmConfig {
  modelRouter: ModelRouter;
  model?: string;  // default: 'claude-3-5-haiku-20241022' or 'gpt-4o-mini'
  maxTokens?: number;  // default: 2048
}

/**
 * Auxiliary LLM for cheap/fast summarization.
 * Wrapper around ModelRouter targeting low-cost models.
 */
export class AuxiliaryLLM {
  private modelRouter: ModelRouter;
  private model: string;
  private maxTokens: number;

  constructor(config: AuxiliaryLlmConfig) {
    this.modelRouter = config.modelRouter;
    // Hermes uses claude-3-5-haiku for compression — very cheap
    this.model = config.model ?? 'claude-3-5-haiku-20241022';
    this.maxTokens = config.maxTokens ?? 2048;
  }

  /**
   * Call the auxiliary LLM with a prompt.
   * Returns the completion text.
   */
  async call(prompt: string): Promise<string> {
    const messages = [
      {
        role: 'user',
        content: prompt,
      },
    ];

    try {
      const result = await this.modelRouter.route(messages, {
        maxTokens: this.maxTokens,
        model: this.model,  // Hint to router which model to prefer
      });

      return result.content || '';
    } catch (err: any) {
      console.error(`Auxiliary LLM call failed: ${err.message}`);
      throw err;
    }
  }
}

/**
 * Factory function to create auxiliary LLM.
 */
export function createAuxiliaryLLM(modelRouter: ModelRouter): (prompt: string) => Promise<string> {
  const auxLlm = new AuxiliaryLLM({ modelRouter });
  return (prompt: string) => auxLlm.call(prompt);
}

export default AuxiliaryLLM;
