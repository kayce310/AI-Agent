/**
 * @file ollama-adapter — LLM adapter
 * @layer core
 * @depends-on src/core/types.ts
 * @imported-by src/core/engine/engine.ts
 * @owner core-llm
 */

/**
 * OllamaAdapter — Local model inference via Ollama
 * Phase 6.5: run local models (Llama, Mistral, Phi, etc.)
 */

import { ModelAdapter, ModelOptions, ModelResponse } from './model-adapter.js';

export interface OllamaAdapterConfig {
  baseUrl: string;
  defaultModel: string;
  timeout: number;
}

const DEFAULT_CONFIG: OllamaAdapterConfig = {
  baseUrl: 'http://localhost:11434',
  defaultModel: 'llama3.2',
  timeout: 120_000,
};

export class OllamaAdapter implements ModelAdapter {
  readonly name = 'ollama';
  readonly label = 'Ollama (Local Models)';
  private config: OllamaAdapterConfig;

  constructor(config?: Partial<OllamaAdapterConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  async invoke(messages: any[], options?: ModelOptions): Promise<ModelResponse> {
    const model = options?.model || this.config.defaultModel;
    const url = `${this.config.baseUrl}/api/chat`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages,
        stream: false,
        options: {
          num_predict: options?.maxTokens || 2048,
          temperature: options?.temperature || 0.7,
        },
      }),
      signal: AbortSignal.timeout(this.config.timeout),
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
    }

    const data: any = await response.json();
    return {
      content: data.message?.content || '',
      modelUsed: model,
      providerUsed: 'ollama',
    };
  }

  estimateTokens(messages: any[]): number {
    let total = 0;
    for (const msg of messages) {
      if (typeof msg.content === 'string') {
        total += Math.ceil(msg.content.length / 4);
      }
    }
    return total + messages.length * 10;
  }

  isAvailable(): boolean {
    return true; // Will fail on actual call if Ollama not running
  }

  setConfig(config: Partial<OllamaAdapterConfig>): void {
    Object.assign(this.config, config);
  }

  getConfig(): OllamaAdapterConfig {
    return { ...this.config };
  }
}

export default OllamaAdapter;