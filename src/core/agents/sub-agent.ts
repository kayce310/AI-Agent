/**
 * @file sub-agent — Agent module
 * @layer core
 * @depends-on src/core/types.ts, src/core/tools/tool-registry.ts
 * @imported-by src/core/engine/engine.ts
 * @owner core-agents
 */

/**
 * SubAgent — Lightweight sub-agent abstraction
 * Phase 5.3: standalone agent instance with its own prompt + tools
 */

import { EventEmitter } from 'events';

export interface SubAgentConfig {
  name: string;
  systemPrompt: string;
  tools?: string[];
  maxIterations?: number;
}

export interface SubAgentResult {
  name: string;
  output: string;
  iterations: number;
  success: boolean;
}

export class SubAgent extends EventEmitter {
  public readonly name: string;
  public readonly systemPrompt: string;
  public readonly tools: string[];
  private maxIterations: number;

  constructor(config: SubAgentConfig) {
    super();
    this.name = config.name;
    this.systemPrompt = config.systemPrompt;
    this.tools = config.tools || [];
    this.maxIterations = config.maxIterations || 5;
  }

  /**
   * Execute the sub-agent with given input.
   */
  async execute(input: string): Promise<SubAgentResult> {
    this.emit('subagent:start', { name: this.name, input });

    // Simplified execution — real impl would use ModelRouter
    const output = `[${this.name}] Processed: ${input.substring(0, 100)}`;

    this.emit('subagent:complete', { name: this.name, output });
    return {
      name: this.name,
      output,
      iterations: 1,
      success: true,
    };
  }
}

export default SubAgent;