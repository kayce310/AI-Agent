/**
 * @file model-adapter â€” LLM adapter
 * @layer core
 * @depends-on src/core/types.ts
 * @imported-by src/core/engine/engine.ts
 * @owner core-llm
 */

/**
 * Coral Agent â€” Model Adapter (Multi-Provider Abstraction)
 * Phase 3.2 â€” cho phÃ©p fallback chain + multi-provider.
 *
 * Má»—i adapter wrap 1 provider (9router, LiteLLM, Ollama, OpenAI, Anthropic...)
 * ModelRouter quáº£n lÃ½ danh sÃ¡ch adapter vÃ  fallback khi provider down.
 */

import OpenAI from 'openai';
import { ProviderRegistry, IProviderClient, ProviderInvokeParams } from './provider-registry.js';
import { ProviderConcurrencyLimiter } from './provider-concurrency-limiter.js';
import { isTransientError, calculateBackoffDelay, sleep } from './retry-backoff.js';
import { Logger } from '../logger.js';
import { withTimeout, createTimeoutController, TimeoutError } from '../util/with-timeout.js';

/**
 * Reject khi signal aborts (promise-level cancellation).
 * Dùng làm lớp chặn chung cho mọi adapter — adapter nào tự wire signal vào fetch
 * (vd Ollama) thì còn được abort ở tầng socket; adapter delegate (9router/SDK)
 * chỉ dừng ở tầng promise (network call phía remote không hủy được, nhưng
 * Coral coi call đó là cancelled — không chờ, không retry).
 */
function withSignal<T>(p: Promise<T>, signal?: AbortSignal): Promise<T> {
  if (!signal) return p;
  if (signal.aborted) return Promise.reject(new Error('Operation cancelled'));
  return new Promise<T>((resolve, reject) => {
    const onAbort = () => reject(new Error('Operation cancelled'));
    signal.addEventListener('abort', onAbort, { once: true });
    p.then(
      (v) => { signal.removeEventListener('abort', onAbort); resolve(v); },
      (e) => { signal.removeEventListener('abort', onAbort); reject(e); },
    );
  });
}
const log = new Logger({ module: 'ModelRouter' });
import { LLMProviderConfig, ModelSpec, ChatMessage } from '../types.js';
import { evolutionEngine } from '../evolution.js';
import path from 'path';
import fs from 'fs';

// â”€â”€ Thinking Content Stripper â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Some LLM providers (DeepSeek, OpenRouter) embed thinking/reasoning
// content inside the main content field. This function strips it.

const THINKING_BLOCK_PATTERNS = [
  /<thinking>[\s\S]*?<\/thinking>/gi,
  /```thinking[\s\S]*?```/gi,
  /<think>[\s\S]*?<\/think>/gi,
  /<reasoning>[\s\S]*?<\/reasoning>/gi,
  /<analysis>[\s\S]*?<\/analysis>/gi,
];

const THINKING_LINE_PATTERNS = [
  /^Tool:\s*/i,
  /^Calling:\s*/i,
  /^Executing:\s*/i,
  /^Function call:/i,
  /^Invoking tool:/i,
];

/** Classification for model response types */
export type ResponseClassification = 
  | 'FINAL_CONTENT'       // Normal text response
  | 'THINKING_ONLY'       // Only reasoning/thinking blocks, no final answer
  | 'TOOL_CALL'           // Tool calls present (with or without text)
  | 'EMPTY';              // Truly empty (no content, no reasoning, no tools)

/**
 * Classify response without mutating content.
 * Returns classification AND extracted components.
 */
export interface ClassifiedResponse {
  classification: ResponseClassification;
  content: string;          // Final user-facing content (thinking stripped)
  reasoningContent: string; // Raw reasoning/thinking (preserved)
  toolCalls: any[] | undefined;
  finishReason: string | undefined;
}

/**
 * Classify and extract response components without destroying data.
 * Preserves reasoning separately from final content.
 */
export function classifyResponse(rawContent: string, reasoningContent: string | undefined, toolCalls: any[] | undefined, finishReason: string | undefined): ClassifiedResponse {
  const hasTools = (toolCalls?.length ?? 0) > 0;
  const hasRawContent = rawContent && rawContent.trim().length > 0;
  const hasReasoning = reasoningContent && reasoningContent.trim().length > 0;

  // Tool calls take priority — even if content is empty
  if (hasTools) {
    const strippedContent = hasRawContent ? stripThinkingContent(rawContent) : '';
    return {
      classification: 'TOOL_CALL',
      content: strippedContent,
      reasoningContent: reasoningContent || '',
      toolCalls,
      finishReason,
    };
  }

  // No tool calls — check content
  if (hasRawContent) {
    const strippedContent = stripThinkingContent(rawContent);
    if (strippedContent.length >= 3) {
      return {
        classification: 'FINAL_CONTENT',
        content: strippedContent,
        reasoningContent: reasoningContent || '',
        toolCalls: undefined,
        finishReason,
      };
    }
    // Content exists but stripped to < 3 chars
    if (hasReasoning) {
      return {
        classification: 'THINKING_ONLY',
        content: '',
        reasoningContent,
        toolCalls: undefined,
        finishReason,
      };
    }
    return {
      classification: 'EMPTY',
      content: '',
      reasoningContent: reasoningContent || '',
      toolCalls: undefined,
      finishReason,
    };
  }

  // No raw content
  if (hasReasoning) {
    return {
      classification: 'THINKING_ONLY',
      content: '',
      reasoningContent,
      toolCalls: undefined,
      finishReason,
    };
  }

  return {
    classification: 'EMPTY',
    content: '',
    reasoningContent: '',
    toolCalls: undefined,
    finishReason,
  };
}

/**
 * Strip thinking content from user-facing output.
 * Pure function — does not mutate input.
 */
export function stripThinkingContent(content: string): string {
  if (!content) return content;
  let cleaned = content;
  for (const pattern of THINKING_BLOCK_PATTERNS) {
    cleaned = cleaned.replace(pattern, '');
  }
  const lines = cleaned.split('\n');
  const filtered: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    let skip = false;
    for (const pattern of THINKING_LINE_PATTERNS) {
      if (pattern.test(trimmed)) {
        skip = true;
        break;
      }
    }
    if (!skip) filtered.push(line);
  }
  return filtered.join('\n').trim();
}

// â”€â”€ Interfaces â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export interface ModelOptions {
  model?: string;
  tools?: any[];
  maxTokens?: number;
  temperature?: number;
  /** tool_choice: 'auto' (default, model decides), 'required' (force tool call), 'none' (text only) */
  toolChoice?: 'auto' | 'required' | 'none';
  /** AbortSignal — cancel lan truyền từ parent (engine/delegate) xuống model call */
  signal?: AbortSignal;
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

// â”€â”€ Token Estimator â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

// â”€â”€ Adapter 1: 9Router (legacy proxy) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export class RouterAdapter implements ModelAdapter {
  readonly name: string;
  readonly label: string;
  private registry: ProviderRegistry;
  private modelId: string = '';
  private providerName: string = '';

  constructor(registry: ProviderRegistry, preferredModel?: string, providerName: string = 'local') {
    this.registry = registry;
    this.name = providerName;
    this.label = `${providerName} Provider Gateway`;
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

    // max_tokens Æ°u tiÃªn: (1) options truyá»n tÆ°á»ng minh, (2) config providers.json, (3) fallback 2048
    const effectiveMaxTokens = options?.maxTokens ?? resolved.maxTokens ?? 2048;

    const payload: any = {
      model: modelId,
      messages,
      temperature: options?.temperature ?? 0.3,    // Lower = less reasoning tokens
      max_tokens: effectiveMaxTokens,
      stream: false,
    };
    if (options?.tools && options.tools.length > 0) {
      payload.tools = options.tools;
      payload.tool_choice = options.toolChoice === 'required' ? 'required' : 'auto';
    } else if (options?.toolChoice === 'none') {
      delete payload.tools;
      delete payload.tool_choice;
    }

    // Acquire concurrency slot for this provider before invoking
    const limiter = ProviderConcurrencyLimiter.getInstance();
    const release = await limiter.acquire(resolved.providerName);
    try {
      const response = await resolved.provider.invoke(payload);
      const rawData = (response as any).data ? (response as any).data : response;

      if (!rawData?.choices?.[0]) {
        // E1 Diagnostics: log why response is empty/invalid
        log.error('[E1] PROVIDER_EMPTY — no choices in response', {
          model: modelId,
          provider: resolved.providerName,
          stream: false,
          choice_count: rawData?.choices?.length ?? 0,
          finish_reason: undefined,
          content_length: 0,
          tool_call_count: 0,
          reason: 'Provider returned response with no choices array or empty choices',
        });
        throw new Error('9router returned empty response');
      }

      const choice = rawData.choices[0];
      const finishReason = choice.finish_reason;
      let content = choice.message?.content || '';

      // ── Reasoning content fallback ──
      // Some reasoning models (DeepSeek V4 Flash, R1, etc.) return the
      // response in reasoning_content with empty content. Use it as fallback.
      if (!content && choice.message?.reasoning_content) {
        content = choice.message.reasoning_content;
      }

      // Strip model prefix headers (e.g. "DeepSeek: ", "Assistant: ")
          content = content.replace(/^[\w\/\.-]+:\s*/m, '');

      // Strip thinking content
      content = stripThinkingContent(content);

      // Check for tool calls
      const toolCalls: any[] | undefined = choice.message?.tool_calls || undefined;

      // E1 Diagnostics: log if content is empty after normalization
      if (!content && (!toolCalls || toolCalls.length === 0)) {
        log.warn('[E1] NORMALIZATION_EMPTY — content empty after strip', {
          model: modelId,
          provider: resolved.providerName,
          stream: false,
          finish_reason: finishReason,
          content_length: 0,
          has_tool_calls: false,
          tool_call_count: 0,
          raw_content_length: (choice.message?.content || '').length,
          has_reasoning_content: !!choice.message?.reasoning_content,
          reasoning_content_length: (choice.message?.reasoning_content || '').length,
        });
      } else if (!content) {
        log.info('[E1] PARSER_EMPTY — content parsed as tool_calls only', {
          model: modelId,
          provider: resolved.providerName,
          stream: false,
          finish_reason: finishReason,
          content_length: 0,
          has_tool_calls: true,
          tool_call_count: toolCalls?.length ?? 0,
        });
      }

      return {
        content,
        modelUsed: modelId,
        providerUsed: resolved.providerName,
        raw: rawData,
        tokenUsage: rawData.usage ? { input: rawData.usage.prompt_tokens || 0, output: rawData.usage.completion_tokens || 0 } : undefined,
        toolCalls,
        finishReason,
        reasoningContent: choice.message?.reasoning_content || undefined,
      };
    } finally {
      release();
    }
  }

  // Phase 4E-B: Streaming support for reasoning_updated events
  async invokeStreaming(messages: any[], taskId: string, onStreamChunk: (chunk: string, isFinal: boolean) => void, options?: ModelOptions): Promise<ModelResponse> {
    const modelId = options?.model || this.modelId;
    const resolved = this.registry.resolve(modelId);
    if (!resolved) {
      throw new Error(`Model "${modelId}" not available`);
    }

    // max_tokens Æ°u tiÃªn: (1) options truyá»n tÆ°á»ng minh, (2) config providers.json, (3) fallback 2048
    const effectiveMaxTokens = options?.maxTokens ?? resolved.maxTokens ?? 2048;

    const payload: any = {
      model: modelId,
      messages,
      temperature: options?.temperature ?? 0.3,
      max_tokens: effectiveMaxTokens,
      stream: true,
    };
    if (options?.tools && options.tools.length > 0) {
      payload.tools = options.tools;
      payload.tool_choice = options.toolChoice === 'required' ? 'required' : 'auto';
    } else if (options?.toolChoice === 'none') {
      delete payload.tools;
      delete payload.tool_choice;
    }

    // Acquire concurrency slot for this provider before invoking
    // ponytail: hold slot for entire streaming duration, not just request initiation
    const limiter = ProviderConcurrencyLimiter.getInstance();
    const release = await limiter.acquire(resolved.providerName);
    try {
      const response = await resolved.provider.invoke(payload);
      
      if (!response || typeof response[Symbol.asyncIterator] !== 'function') {
        throw new Error('Provider did not return a streaming response');
      }

      let accumulated = '';
    let finishReason = '';
    let tokenUsage: { input: number; output: number } | undefined;
    // ponytail: accumulate tool_calls from delta chunks (OpenAI streaming format)
    const toolCallMap = new Map<number, any>();
    for await (const chunk of response) {
      const delta = chunk.choices?.[0]?.delta;
      const text = delta?.content || '';

      if (text) {
        accumulated += text;
        const startTime = Date.now();
        onStreamChunk(accumulated, false);
        const latency = Date.now() - startTime;
        if (latency > 500) {
          console.warn(`[STREAM_LATENCY] WARNING: ${latency}ms > 500ms threshold for task ${taskId}`);
        } else {
          console.log(`[STREAM_LATENCY] ${latency}ms (chunk: ${text.length} chars, accumulated: ${accumulated.length} chars)`);
        }
      }

      const fr = chunk.choices?.[0]?.finish_reason;
      if (fr != null) {
        finishReason = fr;
      }

      // Accumulate tool_calls from delta (streaming format), not message
      const deltaToolCalls = delta?.tool_calls;
      if (deltaToolCalls) {
        for (const tc of deltaToolCalls) {
          const idx = tc.index ?? 0;
          const existing = toolCallMap.get(idx);
          if (!existing) {
            toolCallMap.set(idx, {
              id: tc.id,
              type: 'function',
              function: { name: tc.function?.name || '', arguments: tc.function?.arguments || '' },
            });
          } else {
            if (tc.id) existing.id = tc.id;
            if (tc.function?.name) existing.function.name = tc.function.name;
            if (tc.function?.arguments) existing.function.arguments += tc.function.arguments;
          }
        }
      }

      if (chunk.usage) {
        tokenUsage = { input: chunk.usage.prompt_tokens || 0, output: chunk.usage.completion_tokens || 0 };
      }
    }

    // Final streaming event
        onStreamChunk(accumulated, true);
        console.log(`[STREAM_COMPLETE] task ${taskId}: ${accumulated.length} chars in final reasoning`);

        let content = accumulated.replace(/^[\w\/\.-]+:\s*/m, '');
        content = stripThinkingContent(content);

        // E1 Diagnostics: log if streaming content is empty after normalization
        const finalToolCalls = toolCallMap.size > 0 ? Array.from(toolCallMap.values()) : undefined;
        if (!content && (!finalToolCalls || finalToolCalls.length === 0)) {
          log.warn('[E1] STREAM_EMPTY — accumulated content empty after strip', {
            model: modelId,
            provider: resolved.providerName,
            stream: true,
            finish_reason: finishReason,
            content_length: 0,
            has_tool_calls: false,
            tool_call_count: 0,
            accumulated_raw_length: accumulated.length,
            chunks_received: true,
          });
        } else if (!content) {
          log.info('[E1] PARSER_EMPTY — streaming content parsed as tool_calls only', {
            model: modelId,
            provider: resolved.providerName,
            stream: true,
            finish_reason: finishReason,
            content_length: 0,
            has_tool_calls: true,
            tool_call_count: finalToolCalls?.length ?? 0,
          });
        }

        return {
      content,
      modelUsed: modelId,
      providerUsed: resolved.providerName,
      tokenUsage,
      toolCalls: toolCallMap.size > 0 ? Array.from(toolCallMap.values()) : undefined,
      finishReason,
    };
    } finally {
      release();
    }
  }
}

// â”€â”€ Adapter 2: LiteLLM Proxy â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
  private callTimeoutMs: number;

  constructor(config: LiteLLMConfig) {
    this.baseUrl = config.baseUrl;
    this.models = config.models;
    this.callTimeoutMs = config.timeout ?? 60000;
    this.client = new OpenAI({
      baseURL: config.baseUrl,
      apiKey: config.apiKey,
      timeout: this.callTimeoutMs,
      maxRetries: 0,  // ponytail: retry responsibility delegated to ModelRouter.route() with backoff
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
      temperature: options?.temperature ?? 0.3,    // Lower = less reasoning tokens
      max_tokens: options?.maxTokens ?? 2048,      // Reduced from 4096 for faster response
      stream: false,
    };
    if (options?.tools && options.tools.length > 0) {
      payload.tools = options.tools;
      payload.tool_choice = options.toolChoice === 'required' ? 'required' : 'auto';
    } else if (options?.toolChoice === 'none') {
      delete payload.tools;
      delete payload.tool_choice;
    }

    const response = await this.client.chat.completions.create(payload);
    const choice = response.choices?.[0];
    if (!choice) throw new Error('LiteLLM returned empty response');

    let content = choice.message?.content || '';
    content = content.replace(/^[\w\/\.-]+:\s*/m, '');
    content = stripThinkingContent(content);

    const toolCalls: any[] | undefined = choice.message?.tool_calls || undefined;

    return {
      content,
      modelUsed: modelId,
      providerUsed: 'litellm',
      raw: response,
      tokenUsage: response.usage ? { input: response.usage.prompt_tokens || 0, output: response.usage.completion_tokens || 0 } : undefined,
      toolCalls,
      finishReason: choice.finish_reason,
      reasoningContent: (choice.message as any)?.reasoning_content || undefined,
    };
  }
}

// â”€â”€ Adapter 3: Ollama (Local) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
  private callTimeoutMs: number;

  constructor(config?: OllamaConfig) {
    this.baseUrl = config?.baseUrl || 'http://127.0.0.1:11434';
    this.defaultModel = config?.model || 'llama3.1:8b';
    this.callTimeoutMs = config?.timeout ?? 60000;
  }

  static fromEnv(): OllamaAdapter | null {
    const baseUrl = process.env.OLLAMA_BASE_URL;
    const model = process.env.OLLAMA_MODEL;
    if (!baseUrl && !model) return null;
    return new OllamaAdapter({
      baseUrl,
      model,
      timeout: parseInt(process.env.OLLAMA_TIMEOUT || '60000', 10),
    });
  }

  isAvailable(): boolean {
    return true;
  }

  estimateTokens(messages: any[]): number {
    return messages.reduce((sum, m) => sum + estimateMessageTokens(m), 0);
  }

  async invoke(messages: any[], options?: ModelOptions): Promise<ModelResponse> {
    const model = options?.model || this.defaultModel;

    const ollamaMessages = messages.map((m: any) => ({
      role: m.role,
      content: m.content || '',
      images: m.images || undefined,
    }));

    // Create per-call timeout controller so each call has its own deadline
    const { controller: callController, clear: clearTimer } = createTimeoutController(this.callTimeoutMs);

    // If the request's AbortSignal aborts, abort the call too (cancel propagation)
    const parentSignal = options?.signal;
    const onParentAbort = () => callController.abort();
    if (parentSignal?.aborted) {
      callController.abort();
    } else {
      parentSignal?.addEventListener('abort', onParentAbort);
    }

    let res: Response;
    try {
      res = await fetch(`${this.baseUrl}/api/chat`, {
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
        signal: callController.signal,
      });
    } catch (err: any) {
      // Convert timeout to fallback-friendly error
      if (err.name === 'TimeoutError') {
        throw new Error(`Ollama timed out after ${this.callTimeoutMs}ms — model "${model}" may be unresponsive`);
      }
      throw err;
    } finally {
      clearTimer();
      parentSignal?.removeEventListener('abort', onParentAbort);
    }

    if (!res.ok) {
      throw new Error(`Ollama error (${res.status}): ${res.statusText}`);
    }

    const data = await res.json();
    let content = (data.message?.content || '').replace(/^[\w\/\.-]+:\s*/m, '');
    content = stripThinkingContent(content);

    return {
      content,
      modelUsed: model,
      providerUsed: 'ollama',
      raw: data,
      finishReason: data.done ? 'stop' : 'unknown',
    };
  }
}

// â”€â”€ ModelRouter: Fallback Chain â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export class ModelRouter {
  private adapters: ModelAdapter[] = [];
  private defaultAdapter: string = '';
  private lastError: Map<string, string> = new Map();

  use(adapter: ModelAdapter): void {
    this.adapters.push(adapter);
    if (!this.defaultAdapter && adapter.isAvailable()) {
      this.defaultAdapter = adapter.name;
    }

  }

  setDefault(name: string): void {
    if (this.adapters.some(a => a.name === name)) {
      this.defaultAdapter = name;
    }
  }

  listAdapters(): { name: string; label: string; available: boolean }[] {
    return this.adapters.map(a => ({
      name: a.name,
      label: a.label,
      available: a.isAvailable(),
    }));
  }

  getAdapter(name: string): ModelAdapter | undefined {
    return this.adapters.find(a => a.name === name);
  }

  async route(messages: any[], options?: ModelOptions): Promise<ModelResponse> {
    const candidates = this.buildCandidateList();
    if (candidates.length === 0) {
      throw new Error('No adapters registered in ModelRouter');
    }
    // Cancel trước khi gọi model — không tốn 1 call nào nếu đã bị abort
    if (options?.signal?.aborted) {
      throw new Error('Operation cancelled');
    }

    let lastError: Error | null = null;
    const perAdapterTimeout = 120_000; // 2 minutes max per adapter

    for (const adapter of candidates) {
      try {
        if (!adapter.isAvailable()) {
          continue;
        }

        // ─── DEBUG: Log tools being sent to API ───
        const toolNames = options?.tools?.map((t: any) => t.function?.name).join(', ') || 'none';

        // ponytail: Retry transient errors (429, timeout, 5xx) with exponential backoff + jitter.
        // Permanent errors (401, 404, bad request) fail immediately without retry.
        // Max 3 retries per adapter attempt; retry delay: 100ms → 200ms → 400ms (capped at 5s).
        let retryAttempt = 0;
        let invokeError: Error | null = null;

        while (true) {
          try {
            // Wrap adapter call with timeout — prevents hanging on slow/dead adapters
            const response = withSignal(
              withTimeout(
                adapter.invoke(messages, options),
                perAdapterTimeout,
              ),
              options?.signal,
            ).catch((err: any) => {
              // If timeout or error, throw to trigger fallback
              if (err instanceof TimeoutError) {
                throw new Error(`Adapter "${adapter.name}" timed out after ${perAdapterTimeout}ms`);
              }
              throw err;
            });

            const result = await response;

            evolutionEngine.recordSuccess(adapter.name, 0).catch(() => {});
            this.lastError.delete(adapter.name);

            return result;
          } catch (err: any) {
            invokeError = err;

            // Check if error is transient and we haven't exhausted retries
            if (isTransientError(err) && retryAttempt < 3) {
              const delay = calculateBackoffDelay(retryAttempt);
              log.info(
                `[RETRY] Adapter "${adapter.name}" hit transient error, retrying in ${delay}ms (attempt ${retryAttempt + 1}/3): ${err.message}`
              );
              await sleep(delay);
              retryAttempt++;
              continue; // Retry this adapter
            }

            // Permanent error or retries exhausted — move to next adapter
            break;
          }
        }

        // Adapter failed (after retries if applicable), log and move to next
        log.warn(`Adapter "${adapter.name}" failed: ${invokeError?.message}`);
        this.lastError.set(adapter.name, invokeError?.message || 'Unknown error');

        evolutionEngine.recordError({
          modelId: options?.model || adapter.name,
          errorType: 'ADAPTER_FAILED',
          errorMessage: invokeError?.message || 'Unknown error',
          sessionId: 'model-router',
          contextSnippet: messages[messages.length - 1]?.content?.substring(0, 200),
        }).catch(() => {});

        lastError = invokeError;
      } catch (err: any) {
        // Unexpected error in adapter setup (not adapter.invoke itself)
        log.warn(`Adapter "${adapter.name}" setup failed: ${err.message}`);
        this.lastError.set(adapter.name, err.message);
        lastError = err;
      }
    }

    throw new Error(`All adapters failed. Last error: ${lastError?.message}`);
  }

  estimateTokens(messages: any[]): number {
    if (this.adapters.length === 0) return 0;
    return this.adapters[0].estimateTokens(messages);
  }

  getAdapterErrors(): Map<string, string> {
    return new Map(this.lastError);
  }

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

// â”€â”€ Default Adapter Builder â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function buildDefaultRouter(registry?: ProviderRegistry): Promise<ModelRouter> {
  const router = new ModelRouter();

  const reg = registry ?? new ProviderRegistry();
  try {
    reg.loadFromConfig();
    if (reg.listModels().length > 0) {
      // Get first provider name from loaded models (respects config)
      const models = reg.listModels();
      // Resolve first model to get actual provider name from registry
      const firstModel = models[0];
      const resolved = reg.resolve(firstModel);
      const firstProviderName = resolved?.providerName || 'omniRoute';
      
      // Pass provider name to RouterAdapter so it matches setDefault
      router.use(new RouterAdapter(reg, undefined, firstProviderName));
      router.setDefault(firstProviderName);
      log.info(`✅ Provider configured with ${models.length} model(s) from config/providers.json`);
    } else {
      log.warn("⚠️ No models found in providers.json - OmniRoute must be running on localhost:3110");
    }
  } catch (err: any) {
    log.warn("⚠️ Failed to load config", { error: String(err) });
  }

  // Register LiteLLM as fallback if env variables present
  const litellm = LiteLLMAdapter.fromEnv();
  if (litellm && litellm.isAvailable()) {
    router.use(litellm);
    log.info("✅ LiteLLM adapter registered as fallback");
  }

  // Register Ollama as fallback if env variables present
  const ollama = OllamaAdapter.fromEnv();
  if (ollama && ollama.isAvailable()) {
    router.use(ollama);
    log.info("✅ Ollama adapter registered as fallback");
  }

  if (router.listAdapters().length === 0) {
    log.error("❌ CRITICAL: No adapters registered! Check config/providers.json and env variables.");
  }

  return router;
}

export default ModelRouter;

