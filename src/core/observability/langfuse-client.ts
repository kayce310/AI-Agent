/**
 * @file langfuse-client — Observability module
 * @layer core
 * @depends-on src/core/types.ts
 * @imported-by src/core/engine/engine.ts
 * @owner core-observability
 */

/**
 * Kato Agent — LangfuseClient
 * Phase 6.1a: Observability with Langfuse
 *
 * Bridges Kato's internal Tracer + HookRegistry with Langfuse SDK
 * for external observability, tracing, and evaluation.
 *
 * Usage:
 *   const client = new LangfuseClient({ secretKey, publicKey, baseUrl });
 *   client.attachToHooks(hooks);
 *   // ... run agent ...
 *   await client.flush();
 */

import Langfuse from 'langfuse';
import { type LangfuseTraceClient, type LangfuseSpanClient, type LangfuseGenerationClient } from 'langfuse-core';
import { HookRegistry } from '../hooks.js';

// ── Types ──

export interface LangfuseClientConfig {
  /** Langfuse secret key (required) */
  secretKey?: string;
  /** Langfuse public key (required) */
  publicKey?: string;
  /** Self-hosted base URL (optional, defaults to Langfuse cloud) */
  baseUrl?: string;
  /** Release version tag */
  release?: string;
  /** Session tags */
  tags?: string[];
  /** Flush interval in ms (default 5000) */
  flushIntervalMs?: number;
  /** Enable/disable (default true) */
  enabled?: boolean;
}

export interface LangfuseGenerationInput {
  name: string;
  model: string;
  provider?: string;
  input: unknown;
  output?: unknown;
  startTime?: Date;
  endTime?: Date;
  completionStartTime?: Date;
  tokens?: {
    input?: number;
    output?: number;
    total?: number;
  };
  level?: 'DEBUG' | 'WARNING' | 'ERROR';
  metadata?: Record<string, unknown>;
}

export interface LangfuseEventInput {
  name: string;
  input?: unknown;
  output?: unknown;
  metadata?: Record<string, unknown>;
  level?: 'DEBUG' | 'WARNING' | 'ERROR';
  startTime?: Date;
  endTime?: Date;
}

// ── Constants ──

const DEFAULT_FLUSH_INTERVAL = 5_000;
const MAX_FLUSH_WAIT = 10_000;

// ── LangfuseClient ──

export class LangfuseClient {
  private client: Langfuse | null = null;
  private enabled: boolean;
  private activeTraces = new Map<string, LangfuseTraceClient>();
  private activeSpans = new Map<string, LangfuseSpanClient>();
  private activeGenerations = new Map<string, LangfuseGenerationClient>();
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private config: LangfuseClientConfig;

  constructor(config: LangfuseClientConfig = {}) {
    this.config = config;
    this.enabled = config.enabled ?? true;

    if (this.enabled && config.secretKey && config.publicKey) {
      this.client = new Langfuse({
        secretKey: config.secretKey,
        publicKey: config.publicKey,
        baseUrl: config.baseUrl,
        release: config.release,
        flushAt: 1, // flush immediately for now; we manage our own flush timer
        flushInterval: 1,
      });

      // Start periodic flush timer
      const interval = config.flushIntervalMs ?? DEFAULT_FLUSH_INTERVAL;
      this.flushTimer = setInterval(() => {
        this.flush().catch((err) => console.error('[LangfuseClient] Periodic flush failed:', err));
      }, interval);
    }
  }

  // ── Public API ──

  /** Check if the Langfuse client is active */
  get isEnabled(): boolean {
    return this.enabled && this.client !== null;
  }

  /** Create or resume a trace */
  getTrace(traceId: string, name?: string, metadata?: Record<string, unknown>): LangfuseTraceClient | null {
    if (!this.isEnabled || !this.client) return null;

    let trace = this.activeTraces.get(traceId);
    if (!trace) {
      trace = this.client.trace({
        id: traceId,
        name: name ?? `kato-${traceId}`,
        metadata,
        tags: this.config.tags,
      });
      this.activeTraces.set(traceId, trace);
    }
    return trace;
  }

  /** Create a span under a trace */
  createSpan(traceId: string, spanId: string, name: string, input?: unknown): LangfuseSpanClient | null {
    if (!this.isEnabled) return null;

    const trace = this.getTrace(traceId, name, { spanCount: this.activeSpans.size + 1 });
    if (!trace) return null;

    const span = trace.span({
      id: spanId,
      name,
      input,
      startTime: new Date(),
    });
    this.activeSpans.set(spanId, span);
    return span;
  }

  /** End a span */
  endSpan(spanId: string, output?: unknown, error?: string, metadata?: Record<string, unknown>): void {
    if (!this.isEnabled) return;

    const span = this.activeSpans.get(spanId);
    if (span) {
      span.end({
        output,
        metadata: { ...metadata, ...(error ? { error } : {}) },
      });
      this.activeSpans.delete(spanId);
    }
  }

  /** Create a generation (LLM call) under a trace */
  createGeneration(
    traceId: string,
    genId: string,
    input: LangfuseGenerationInput,
  ): LangfuseGenerationClient | null {
    if (!this.isEnabled || !this.client) return null;

    const trace = this.getTrace(traceId, `generation-${input.name}`, {
      model: input.model,
    });
    if (!trace) return null;

    const generation = trace.generation({
      id: genId,
      name: input.name,
      model: input.model,
      modelParameters: input.provider ? { provider: input.provider } : undefined,
      input: input.input,
      output: input.output,
      startTime: input.startTime ?? new Date(),
      endTime: input.endTime,
      completionStartTime: input.completionStartTime,
      usage: input.tokens
        ? {
            input: input.tokens.input,
            output: input.tokens.output,
            total: input.tokens.total ?? (input.tokens.input ?? 0) + (input.tokens.output ?? 0),
            unit: 'TOKENS' as const,
          }
        : undefined,
      level: input.level,
      metadata: input.metadata,
    });
    this.activeGenerations.set(genId, generation);
    return generation;
  }

  /** End a generation */
  endGeneration(genId: string, output?: unknown, tokens?: { input?: number; output?: number }): void {
    if (!this.isEnabled) return;

    const gen = this.activeGenerations.get(genId);
    if (gen) {
      gen.end({
        output,
        usage: tokens
          ? {
              input: tokens.input,
              output: tokens.output,
              total: (tokens.input ?? 0) + (tokens.output ?? 0),
              unit: 'TOKENS' as const,
            }
          : undefined,
      });
      this.activeGenerations.delete(genId);
    }
  }

  /** Create an event (tool call, task milestone) under a trace */
  createEvent(traceId: string, input: LangfuseEventInput): void {
    if (!this.isEnabled) return;

    const trace = this.getTrace(traceId, input.name);
    if (!trace) return;

    trace.event({
      name: input.name,
      input: input.input,
      output: input.output,
      metadata: input.metadata,
      level: input.level,
      startTime: input.startTime ?? new Date(),
    });
  }

  /** Score a trace with evaluation feedback */
  async score(
    traceId: string,
    name: string,
    value: number,
    comment?: string,
  ): Promise<void> {
    if (!this.isEnabled || !this.client) return;

    await this.client.score({
      traceId,
      name,
      value,
      comment,
    });
  }

  // ── Hook Integration ──

  /**
   * Attach to Kato's HookRegistry to automatically
   * create traces/spans/generations from agent events.
   */
  attachToHooks(hooks: HookRegistry): void {
    if (!this.enabled) return;

    // Map sessionId → traceId
    const sessionToTrace = new Map<string, string>();

    // ── Task lifecycle → Trace ──
    hooks.on('task:start', async (ctx) => {
      const data = ctx.data as Record<string, unknown>;
      const sessionId = (data.sessionId as string) || 'unknown';
      const traceId = `kato-${sessionId}`;
      sessionToTrace.set(sessionId, traceId);

      this.getTrace(traceId, `task-${String(data.task)?.substring(0, 60) || sessionId}`, {
        sessionId,
        messageCount: data.messageCount,
      });

      this.createEvent(traceId, {
        name: 'task:start',
        input: { task: data.task, messageCount: data.messageCount },
      });
    });

    hooks.on('task:complete', async (ctx) => {
      const data = ctx.data as Record<string, unknown>;
      const sessionId = (data.sessionId as string) || 'unknown';
      const traceId = `kato-${sessionId}`;

      this.createEvent(traceId, {
        name: 'task:complete',
        output: data.result,
      });

      // Score the trace on completion
      if (data.metrics) {
        const metrics = data.metrics as Record<string, number>;
        for (const [key, value] of Object.entries(metrics)) {
          await this.score(traceId, key, value).catch(() => {});
        }
      }

      // Cleanup after a delay
      setTimeout(() => sessionToTrace.delete(sessionId), 10_000);
    });

    hooks.on('task:error', async (ctx) => {
      const data = ctx.data as Record<string, unknown>;
      const sessionId = (data.sessionId as string) || 'unknown';
      const traceId = `kato-${sessionId}`;

      this.createEvent(traceId, {
        name: 'task:error',
        output: { error: data.error },
        level: 'ERROR',
      });

      await this.score(traceId, 'error_rate', 1, String(data.error)).catch(() => {});
    });

    // ── Model invoke → Generation ──
    hooks.on('model:invoke', async (ctx) => {
      const data = ctx.data as Record<string, unknown>;
      const sessionId = (data.sessionId as string) || 'unknown';
      const traceId = `kato-${sessionId}`;
      const genId = `gen-${sessionId}-${data.cycle}`;

      this.createGeneration(traceId, genId, {
        name: `llm-call-${data.cycle}`,
        model: (data.modelUsed as string) || 'unknown-model',
        provider: data.providerUsed as string,
        input: { messages: data.messages, toolCount: data.toolCount },
        tokens: data.tokens as { input?: number; output?: number },
      });
    });

    hooks.on('model:response', async (ctx) => {
      const data = ctx.data as Record<string, unknown>;
      const genId = `gen-${data.sessionId}-${data.cycle}`;

      this.endGeneration(genId, { response: data.responseContent }, {
        input: data.inputTokens as number,
        output: data.outputTokens as number,
      });
    });

    hooks.on('model:error', async (ctx) => {
      const data = ctx.data as Record<string, unknown>;
      const genId = `gen-${data.sessionId}-${data.cycle}`;

      // End generation with error metadata
      const gen = this.activeGenerations.get(genId);
      if (gen) {
        gen.end({
          output: { error: data.error },
          level: 'ERROR',
          metadata: { error: data.error },
        });
        this.activeGenerations.delete(genId);
      }
    });

    // ── Tool call → Event ──
    hooks.on('tool:call', async (ctx) => {
      const data = ctx.data as Record<string, unknown>;
      const sessionId = (data.sessionId as string) || 'unknown';
      const traceId = `kato-${sessionId}`;
      const spanId = `tool-${sessionId}-${data.cycle}-${data.toolName}`;

      this.createSpan(traceId, spanId, String(data.toolName), data.toolArgs);
    });

    hooks.on('tool:result', async (ctx) => {
      const data = ctx.data as Record<string, unknown>;
      const spanId = `tool-${data.sessionId}-${data.cycle}-${data.toolName}`;

      this.endSpan(spanId, data.result);
    });
  }

  // ── Lifecycle ──

  /** Flush all pending events to Langfuse */
  async flush(): Promise<void> {
    if (!this.client) return;
    await Promise.race([
      this.client.flushAsync(),
      new Promise<void>((_, reject) =>
        setTimeout(() => reject(new Error('Langfuse flush timeout')), MAX_FLUSH_WAIT),
      ),
    ]);
  }

  /** Shutdown: flush and clean up */
  async shutdown(): Promise<void> {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    await this.flush();
    this.activeTraces.clear();
    this.activeSpans.clear();
    this.activeGenerations.clear();
  }

  /** Get count of active spans (for monitoring) */
  getActiveCount(): { traces: number; spans: number; generations: number } {
    return {
      traces: this.activeTraces.size,
      spans: this.activeSpans.size,
      generations: this.activeGenerations.size,
    };
  }
}

/**
 * Factory: create a LangfuseClient from environment variables.
 * Reads LANGFUSE_SECRET_KEY, LANGFUSE_PUBLIC_KEY, LANGFUSE_BASE_URL.
 * Safe to call even if env vars are missing (returns disabled client).
 */
export function createLangfuseClient(config?: Partial<LangfuseClientConfig>): LangfuseClient {
  const secretKey = config?.secretKey ?? process.env.LANGFUSE_SECRET_KEY ?? '';
  const publicKey = config?.publicKey ?? process.env.LANGFUSE_PUBLIC_KEY ?? '';
  const baseUrl = config?.baseUrl ?? process.env.LANGFUSE_BASE_URL;

  if (!secretKey || !publicKey) {
    console.warn('[LangfuseClient] Missing Langfuse API keys — observability disabled');
    return new LangfuseClient({ enabled: false });
  }

  return new LangfuseClient({
    secretKey,
    publicKey,
    baseUrl,
    release: config?.release,
    tags: config?.tags ?? ['kato-agent'],
    flushIntervalMs: config?.flushIntervalMs,
    enabled: true,
  });
}

export default LangfuseClient;