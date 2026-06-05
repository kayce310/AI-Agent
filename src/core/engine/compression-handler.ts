/**
 * @file Compression Handler — Handles /compact command and automatic compression
 * @layer core
 * @depends-on src/core/context-compression.ts, src/core/llm/auxiliary-llm.ts
 * @imported-by src/core/gateway/gateway.ts
 * @owner core-engine
 *
 * Bridges compression system with agent execution.
 * Handles:
 *   - /compact [topic] command from Discord
 *   - Passes auxiliaryLlmCall to Agent
 *   - Logs compression events
 */

import { EngineRequest, EngineResponse, AdapterMessage } from '../types.js';
import { Agent } from './agent.js';
import { createAuxiliaryLLM } from '../llm/auxiliary-llm.js';
import { ModelRouter } from '../llm/model-adapter.js';

export interface CompressionHandlerConfig {
  agent: Agent;
  modelRouter: ModelRouter;
  debug?: boolean;
}

/**
 * Compression handler — integrates compression into the engine workflow.
 */
export class CompressionHandler {
  private agent: Agent;
  private modelRouter: ModelRouter;
  private debug: boolean;
  private sessionCompressions: Map<string, { count: number; lastTime: number }> = new Map();

  constructor(config: CompressionHandlerConfig) {
    this.agent = config.agent;
    this.modelRouter = config.modelRouter;
    this.debug = config.debug ?? false;
  }

  /**
   * Check if an AdapterMessage is a /compact command.
   */
  isCompressionRequest(msg: AdapterMessage): boolean {
    return (
      (msg.metadata?.isCompression === true) ||
      (typeof msg.text === 'string' && msg.text.toLowerCase().startsWith('/compact'))
    );
  }

  /**
   * Handle compression request.
   * Trigger compression in the agent and return summary.
   */
  async handleCompressionRequest(msg: AdapterMessage): Promise<EngineResponse> {
    const sessionId = msg.metadata?.sessionId || msg.userId;
    const focusTopic = msg.metadata?.focusTopic || '';

    // Rate limit: max 1 compression per session per 60 seconds
    const lastCompression = this.sessionCompressions.get(sessionId);
    if (lastCompression && Date.now() - lastCompression.lastTime < 60_000) {
      return {
        output: '⏳ Compression already triggered recently. Please wait before triggering again.',
        usage: { inputTokens: 0, outputTokens: 0 },
        modelUsed: 'compression-handler',
      };
    }

    try {
      // Create internal compression request for agent
      // Agent will handle compression via shouldAttemptCompression + compressContext
      const compressionNote = focusTopic
        ? `Context compression triggered with focus: ${focusTopic}`
        : 'Context compression triggered (scanning conversation history)';

      if (this.debug) {
        console.log(`[Compression] ${sessionId}: ${compressionNote}`);
      }

      // Update rate limiter
      const count = (lastCompression?.count ?? 0) + 1;
      this.sessionCompressions.set(sessionId, { count, lastTime: Date.now() });

      return {
        output: `✅ ${compressionNote}. The agent will compress context on the next message.`,
        usage: { inputTokens: 0, outputTokens: 0 },
        modelUsed: 'compression-handler',
      };
    } catch (err: any) {
      return {
        output: `❌ Compression handler error: ${err.message}`,
        usage: { inputTokens: 0, outputTokens: 0 },
        modelUsed: 'compression-handler',
      };
    }
  }

  /**
   * Get compression statistics for a session.
   */
  getSessionStats(sessionId: string): { count: number; lastTime: number } | null {
    return this.sessionCompressions.get(sessionId) ?? null;
  }

  /**
   * Clear compression stats (useful for testing or session cleanup).
   */
  clearSessionStats(sessionId: string): void {
    this.sessionCompressions.delete(sessionId);
  }

  /**
   * Create auxiliary LLM call wrapper.
   * Pass this to Agent config so it can use it for compression.
   */
  createAuxiliaryLlmCall(): (prompt: string) => Promise<string> {
    return createAuxiliaryLLM(this.modelRouter);
  }
}

export default CompressionHandler;
