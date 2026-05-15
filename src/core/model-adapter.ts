/**
 * Kato Agent — Model Adapter (Multi-Provider Abstraction)
 * Phase 3.2 — cho phép fallback chain + multi-provider.
 * 
 * Mỗi adapter wrap 1 provider (9router, LiteLLM, Ollama, OpenAI, Anthropic...)
 * ModelRouter quản lý danh sách adapter và fallback khi provider down.
 */

import OpenAI from 'openai';
import ProviderRegistry, { IProviderClient, ProviderInvokeParams } from './provider-registry.js';
import { LLMProviderConfig, ModelSpec, ChatMessage } from './types.js';
import { evolutionEngine } from './evolution.js';
import path from 'path';
import fs from 'fs';

// ── Interfaces ──────────────────────────────────────────────────

export interface ModelOptions {
  model?: string;
  tools?: any[];
  maxTokens?: number;
  temperature?: number;
}

export interface ModelResponse {
  content: string;
  modelUsed: string;
  providerUsed: string;
  raw?: any;
  tokenUsage?: { input: number; output: number };
  toolCalls?: any[];
  finishReason?: string;
  reasoningContent?: string;
}

export interface ModelAdapter {
  readonly name: string;
  readonly label: string;
  invoke(messages: any[], options?: ModelOptions): Promise<ModelResponse>;
  estimateTokens(messages: any[]): number;
  isAvailable(): boolean;
}

// ── Token Estimator ─────────────────────────────────────────────

const AVG_CHARS_PER_TOKEN = 4;

function estimateMessageTokens(msg: any): number {
  let text = '';
  if (typeof msg.content === 'string') text += msg.content;
  if (msg.role) text += msg.role;
  if (msg.tool_calls) text += JSON.stringify(msg.tool_calls);
  return Math.ceil(text.length / AVG_CHARS_PER_TOKEN);
}

function estimateToolsTokens(tools: any[]): number {
  return tools.reduce((sum, t) => sum + Math.ceil(JSON.stringify(t).length / AVG_CHARS_PER_TOKEN), 0);
}

// ── Adapter 1: 9Router (legacy proxy) ───────────────────────────

export class RouterAdapter implements ModelAdapter {
  readonly name = '9router';
  readonly label = '9Router (Single-Point Proxy)';
  private registry: ProviderRegistry;
  private modelId: string = '';
  private providerName: string = '';

  constructor(registry: ProviderRegistry, preferredModel?: string) {
    this.registry = registry;
    const models = registry.listModels();
    if (models.length > 0) {
      this.modelId = preferredModel || models[0];
      const resolved = registry.resolve(this.modelId);
      if (resolved) this.providerName = resolved.providerName;
    }
  }

  isAvailable(): boolean {
    const models = this.registry.listModels();
    return models.length > 0;
  }

  estimateTokens(messages: any[]): number {
    return messages.reduce((sum, m) => sum + estimateMessageTokens(m), 0);
  }

  async invoke(messages: any[], options?: ModelOptions): Promise<ModelResponse> {
    const modelId = options?.model || this.modelId;
    const resolved = this.registry.resolve(modelId);
    if (!resolved) {
      const available = this.registry.listModels();
      throw new Error(`Model "${modelId}" not available. Available: ${available.join(', ') || 'none'}`);
    }

    const payload: any = {
      model: modelId,
      messages,
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.maxTokens ?? 4096,
    };
    if (options?.tools && options.tools.length > 0) {
      payload.tools = options.tools;
      payload.tool_choice = 'auto';
    }

    const response = await resolved.provider.invoke(payload);
    const rawData = (response as any).data ? (response as any).data : response;

    if (!rawData?.choices?.[0]) {
      throw new Error('9router returned empty response');
    }

    const choice = rawData.choices[0];
    const finishReason = choice.finish_reason;
    let content = choice.message?.content || '';

    // Strip model prefix headers
    content = content.replace(/^[\w\/\.-]+:\s*/m, '');

    // Check for tool calls
    const toolCalls: any[] | undefined = choice.message?.tool_calls || undefined;

    return {
      content,
      modelUsed: modelId,
      providerUsed: resolved.providerName,
      raw: rawData,
      tokenUsage: rawData.usage ? { input: rawData.usage.prompt_tokens || 0, output: rawData.usage.completion_tokens || 0 } : undefined,
      toolCalls,
      finishReason,
    };
  }
}

// ── Adapter 2: LiteLLM Proxy ────────────────────────────────────

export interface LiteLLMConfig {
  baseUrl: string;
  apiKey: string;
  models: string[];
  timeout?: number;
}

export class LiteLLMAdapter implements ModelAdapter {
  readonly name = 'litellm';
  readonly label = 'LiteLLM Proxy (100+ Models)';
  private client: OpenAI;
  private models: string[];
  private baseUrl: string;
  private available: boolean = false;

  constructor(config: LiteLLMConfig) {
    this.baseUrl = config.baseUrl;
    this.models = config.models;
    this.client = new OpenAI({
      baseURL: config.baseUrl,
      apiKey: config.apiKey,
      timeout: config.timeout ?? 60000,
      maxRetries: 1,
    });
  }

  /** Create from environment variables */
  static fromEnv(): LiteLLMAdapter | null {
    const baseUrl = process.env.LITELLM_BASE_URL;
    const apiKey = process.env.LITELLM_API_KEY;
    const modelsStr = process.env.LITELLM_MODELS;
    if (!baseUrl || !apiKey || !modelsStr) return null;

    return new LiteLLMAdapter({
      baseUrl,
      apiKey,
      models: modelsStr.split(',').map(m => m.trim()),
      timeout: parseInt(process.env.LITELLM_TIMEOUT || '60000', 10),
    });
  }

  isAvailable(): boolean {
    return !!this.baseUrl && this.models.length > 0;
  }

  estimateTokens(messages: any[]): number {
    return messages.reduce((sum, m) => sum + estimateMessageTokens(m), 0);
  }

  async invoke(messages: any[], options?: ModelOptions): Promise<ModelResponse> {
    const modelId = options?.model || this.models[0] || 'gpt-3.5-turbo';
    if (this.models.length === 0) throw new Error('LiteLLM has no models configured');

    const payload: any = {
      model: modelId,
      messages,
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.maxTokens ?? 4096,
    };
    if (options?.tools && options.tools.length > 0) {
      payload.tools = options.tools;
      payload.tool_choice = 'auto';
    }

    const response = await this.client.chat.completions.create(payload);
    const choice = response.choices?.[0];
    if (!choice) throw new Error('LiteLLM returned empty response');

    let content = choice.message?.content || '';
    content = content.replace(/^[\w\/\.-]+:\s*/m, '');

    const toolCalls: any[] | undefined = choice.message?.tool_calls || undefined;

    return {
      content,
      modelUsed: modelId,
      providerUsed: 'litellm',
      raw: response,
      tokenUsage: response.usage ? { input: response.usage.prompt_tokens || 0, output: response.usage.completion_tokens || 0 } : undefined,
      toolCalls,
      finishReason: choice.finish_reason,
    };
  }
}

// ── Adapter 3: Ollama (Local) ───────────────────────────────────

export interface OllamaConfig {
  baseUrl?: string;
  model?: string;
  timeout?: number;
}

export class OllamaAdapter implements ModelAdapter {
  readonly name = 'ollama';
  readonly label = 'Ollama (Local LLMs)';
  private baseUrl: string;
  private defaultModel: string;
  private controller: AbortController;

  constructor(config?: OllamaConfig) {
    this.baseUrl = config?.baseUrl || 'http://127.0.0.1:11434';
    this.defaultModel = config?.model || 'llama3.1:8b';
    this.controller = new AbortController();
  }

  static fromEnv(): OllamaAdapter | null {
    const baseUrl = process.env.OLLAMA_BASE_URL;
    const model = process.env.OLLAMA_MODEL;
    if (!baseUrl && !model) return null;
    return new OllamaAdapter({ baseUrl, model });
  }

  isAvailable(): boolean {
    // Quick check: can we reach the Ollama server?
    // We don't block on this — let the invoke fail fast
    return true;
  }

  estimateTokens(messages: any[]): number {
    return messages.reduce((sum, m) => sum + estimateMessageTokens(m), 0);
  }

  async invoke(messages: any[], options?: ModelOptions): Promise<ModelResponse> {
    const model = options?.model || this.defaultModel;

    // Convert OpenAI-format messages to Ollama format
    const ollamaMessages = messages.map((m: any) => ({
      role: m.role,
      content: m.content || '',
      images: m.images || undefined,
    }));

    const res = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages: ollamaMessages,
        stream: false,
        options: {
          temperature: options?.temperature ?? 0.7,
          num_predict: options?.maxTokens ?? 4096,
        },
      }),
      signal: this.controller.signal,
    });

    if (!res.ok) {
      throw new Error(`Ollama error (${res.status}): ${res.statusText}`);
    }

    const data = await res.json();
    const content = (data.message?.content || '').replace(/^[\w\/\.-]+:\s*/m, '');

    return {
      content,
      modelUsed: model,
      providerUsed: 'ollama',
      raw: data,
      finishReason: data.done ? 'stop' : 'unknown',
    };
  }
}

// ── ModelRouter: Fallback Chain ─────────────────────────────────

export class ModelRouter {
  private adapters: ModelAdapter[] = [];
  private defaultAdapter: string = '';
  private lastError: Map<string, string> = new Map(); // adapterName -> error

  /** Register an adapter */
  use(adapter: ModelAdapter): void {
    this.adapters.push(adapter);
    if (!this.defaultAdapter && adapter.isAvailable()) {
      this.defaultAdapter = adapter.name;
    }
    console.log(`🔌 ModelRouter: registered adapter "${adapter.name}" (${adapter.label})`);
  }

  /** Set default adapter */
  setDefault(name: string): void {
    if (this.adapters.some(a => a.name === name)) {
      this.defaultAdapter = name;
    }
  }

  /** List registered adapters */
  listAdapters(): { name: string; label: string; available: boolean }[] {
    return this.adapters.map(a => ({
      name: a.name,
      label: a.label,
      available: a.isAvailable(),
    }));
  }

  /** Get a specific adapter by name */
  getAdapter(name: string): ModelAdapter | undefined {
    return this.adapters.find(a => a.name === name);
  }

  /**
   * Route request to best adapter with fallback chain.
   * Strategy: try default → try each remaining → throw if all fail.
   */
  async route(messages: any[], options?: ModelOptions): Promise<ModelResponse> {
    // Build ordered candidate list: default first, then by registration order
    const candidates = this.buildCandidateList();
    if (candidates.length === 0) {
      throw new Error('No adapters registered in ModelRouter');
    }

    let lastError: Error | null = null;

    for (const adapter of candidates) {
      try {
        if (!adapter.isAvailable()) {
          console.warn(`⚠️ ModelRouter: skipping "${adapter.name}" (not available)`);
          continue;
        }

        console.log(`📤 ModelRouter: trying adapter "${adapter.name}"...`);
        const response = await adapter.invoke(messages, options);
        console.log(`✅ ModelRouter: success via "${adapter.name}" (model: ${response.modelUsed})`);

        // Record success in evolution
        evolutionEngine.recordSuccess(adapter.name, 0).catch(() => {});

        // Clear last error for this adapter
        this.lastError.delete(adapter.name);

        return response;
      } catch (err: any) {
        console.warn(`⚠️ ModelRouter: adapter "${adapter.name}" failed: ${err.message}`);
        this.lastError.set(adapter.name, err.message);

        // Record error in evolution
        evolutionEngine.recordError({
          modelId: options?.model || adapter.name,
          errorType: 'ADAPTER_FAILED',
          errorMessage: err.message,
          sessionId: 'model-router',
          contextSnippet: messages[messages.length - 1]?.content?.substring(0, 200),
        }).catch(() => {});

        lastError = err;
        // Continue to next adapter
      }
    }

    // All adapters failed
    throw new Error(`All adapters failed. Last error: ${lastError?.message}`);
  }

  /** Estimate total tokens */
  estimateTokens(messages: any[]): number {
    if (this.adapters.length === 0) return 0;
    return this.adapters[0].estimateTokens(messages);
  }

  /** Get last error for each adapter */
  getAdapterErrors(): Map<string, string> {
    return new Map(this.lastError);
  }

  /** Build candidate list: default first, then rest by registration order */
  private buildCandidateList(): ModelAdapter[] {
    if (this.adapters.length === 0) return [];

    const defaultIdx = this.adapters.findIndex(a => a.name === this.defaultAdapter);
    if (defaultIdx === -1) return [...this.adapters];

    const ordered = [this.adapters[defaultIdx]];
    for (let i = 0; i < this.adapters.length; i++) {
      if (i !== defaultIdx) ordered.push(this.adapters[i]);
    }
    return ordered;
  }
}

// ── Default Adapter Builder ─────────────────────────────────────

/**
 * Build a ModelRouter with default adapters based on available config.
 * Priority: 9router (from provider-registry) > LiteLLM (from env) > Ollama (from env)
 */
export async function buildDefaultRouter(registry?: ProviderRegistry): Promise<ModelRouter> {
  const router = new ModelRouter();

  // 1. Try 9router from ProviderRegistry
  const reg = registry ?? new ProviderRegistry();
  try {
    reg.loadFromConfig();
    if (reg.listModels().length > 0) {
      router.use(new RouterAdapter(reg));
      router.setDefault('9router');
      console.log('🔌 ModelRouter: 9router adapter registered as default');
    }
  } catch (err: any) {
    console.warn(`⚠️ ModelRouter: 9router config load failed: ${err.message}`);
  }

  // 2. Try LiteLLM from env
  const litellm = LiteLLMAdapter.fromEnv();
  if (litellm) {
    router.use(litellm);
    console.log('🔌 ModelRouter: LiteLLM adapter registered');
  }

  // 3. Try Ollama from env
  const ollama = OllamaAdapter.fromEnv();
  if (ollama) {
    router.use(ollama);
    console.log('🔌 ModelRouter: Ollama adapter registered');
  }

  return router;
}

export default ModelRouter;