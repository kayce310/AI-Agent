/**
 * Kato Tracer — O11y Tracing for Agent Lifecycle
 * Phase 3.6
 *
 * Tracks every LLM invocation, tool call, memory access, and skill execution
 * as structured spans. Exports as JSON for analysis and anomaly detection.
 *
 * Integrates into Agent via HookRegistry hooks.
 */

import { HookRegistry, HookContext, globalHooks } from '../hooks.js';
import { evolutionEngine } from '../evolution.js';

// ── Types ──────────────────────────────────────────────────────────────

export type SpanType = 'llm' | 'tool' | 'memory' | 'skill' | 'task';

export interface TraceSpan {
  id: string;
  parentId?: string;
  name: string;
  type: SpanType;
  startTime: number;   // Unix ms (Date.now())
  endTime?: number;     // filled on endSpan
  durationMs?: number;  // computed on endSpan
  input?: unknown;
  output?: unknown;
  tokenCount?: { input: number; output: number };
  error?: string;
  tags?: Record<string, string>;
}

export interface TracerConfig {
  /** Max spans kept in memory ring buffer */
  bufferSize?: number;
  /** Auto-attach to globalHooks when true */
  autoAttach?: boolean;
  /** Log spans to console when ended */
  verbose?: boolean;
}

export interface Anomaly {
  type: 'slow_llm' | 'slow_tool' | 'high_error_rate' | 'token_spike';
  spanId: string;
  name: string;
  value: number;
  threshold: number;
  message: string;
}

// ── Helpers ──

let spanCounter = 0;
function nextSpanId(): string {
  return `span_${Date.now()}_${++spanCounter}`;
}

// ── Tracer Class ──

export class Tracer {
  private spans: TraceSpan[] = [];
  private bufferSize: number;
  private verbose: boolean;
  private spanStack: TraceSpan[] = []; // for nested span tracking

  constructor(config?: TracerConfig) {
    this.bufferSize = config?.bufferSize ?? 200;
    this.verbose = config?.verbose ?? false;

    if (config?.autoAttach) {
      this.attachToHooks();
    }
  }

  // ── Span Lifecycle ──

  /** Start a new span, optionally as child of the current active span */
  startSpan(name: string, type: SpanType, input?: unknown, parentId?: string): TraceSpan {
    const effectiveParentId = parentId ?? this.spanStack[this.spanStack.length - 1]?.id;
    const span: TraceSpan = {
      id: nextSpanId(),
      parentId: effectiveParentId,
      name,
      type,
      startTime: Date.now(),
      input,
    };
    this.pushSpan(span);
    this.spanStack.push(span);
    return span;
  }

  /** End a span and compute duration */
  endSpan(span: TraceSpan, output?: unknown, error?: string): void {
    if (span.endTime !== undefined) return; // already ended

    span.endTime = Date.now();
    span.durationMs = span.endTime - span.startTime;
    span.output = output;
    span.error = error;

    // Pop from stack if it's the current span
    const idx = this.spanStack.lastIndexOf(span);
    if (idx >= 0) {
      this.spanStack.splice(idx, 1);
    }

    if (this.verbose) {
      const status = error ? `❌` : `✅`;
      console.log(`[Tracer] ${status} ${span.type}:${span.name} (${span.durationMs}ms)`);
    }

    // Feed performance data to evolution engine
    if (span.type === 'llm' && span.tokenCount && !error) {
      evolutionEngine.recordSuccess(span.name, span.durationMs).catch(() => {});
    }
  }

  /** Convenience: run a closure inside a span */
  async trace<T>(
    name: string,
    type: SpanType,
    fn: () => Promise<T>,
    input?: unknown,
  ): Promise<T> {
    const span = this.startSpan(name, type, input);
    try {
      const result = await fn();
      this.endSpan(span, result);
      return result;
    } catch (err: any) {
      this.endSpan(span, undefined, err.message);
      // Also record the error in evolution
      const contextSnippet = input !== undefined
        ? (typeof input === 'string' ? input.substring(0, 200) : JSON.stringify(input).substring(0, 200))
        : '';
      evolutionEngine.recordError({
        modelId: type === 'llm' ? name : 'tracer',
        errorType: type === 'tool' ? 'TOOL_EXECUTION' : type === 'llm' ? 'MODEL_ERROR' : 'TRACER_ERROR',
        errorMessage: err.message,
        stackTrace: err.stack,
        sessionId: 'tracer',
        contextSnippet,
      }).catch(() => {});
      throw err;
    }
  }

  /** Set token count on a span (typically after LLM response) */
  setTokenCount(span: TraceSpan, input: number, output: number): void {
    span.tokenCount = { input, output };
  }

  /** Add a tag to an active span */
  tagSpan(span: TraceSpan, key: string, value: string): void {
    if (!span.tags) span.tags = {};
    span.tags[key] = value;
  }

  // ── Export / Query ──

  /** Get all spans in the buffer (newest first) */
  getSpans(): TraceSpan[] {
    return [...this.spans].reverse();
  }

  /** Filter spans by type */
  getSpansByType(type: SpanType): TraceSpan[] {
    return this.spans.filter(s => s.type === type).reverse();
  }

  /** Get recent spans (last N) */
  getRecentSpans(n = 10): TraceSpan[] {
    return this.spans.slice(-n).reverse();
  }

  /** Export as JSON */
  toJSON(): TraceSpan[] {
    return this.spans;
  }

  /** Clear all spans */
  clear(): void {
    this.spans = [];
    this.spanStack = [];
  }

  /** Get summary statistics */
  getStats(): {
    totalSpans: number;
    byType: Record<SpanType, number>;
    avgDurationMs: Record<SpanType, number>;
    totalTokens: number;
    errorCount: number;
  } {
    const byType: Record<string, number> = {};
    const durations: Record<string, number[]> = {};
    let totalTokens = 0;
    let errorCount = 0;

    for (const s of this.spans) {
      byType[s.type] = (byType[s.type] || 0) + 1;
      if (!durations[s.type]) durations[s.type] = [];
      if (s.durationMs !== undefined) durations[s.type].push(s.durationMs);
      if (s.tokenCount) totalTokens += s.tokenCount.input + s.tokenCount.output;
      if (s.error) errorCount++;
    }

    const avgDurationMs: Record<string, number> = {};
    for (const [type, list] of Object.entries(durations)) {
      avgDurationMs[type] = list.reduce((a, b) => a + b, 0) / list.length;
    }

    return {
      totalSpans: this.spans.length,
      byType: byType as Record<SpanType, number>,
      avgDurationMs: avgDurationMs as Record<SpanType, number>,
      totalTokens,
      errorCount,
    };
  }

  // ── Anomaly Detection ──

  /** Detect anomalies based on collected spans */
  detectAnomalies(): Anomaly[] {
    const anomalies: Anomaly[] = [];
    const stats = this.getStats();

    // Slow LLM: duration > 3x average
    const llmAvg = stats.avgDurationMs['llm'];
    if (llmAvg && llmAvg > 0) {
      for (const s of this.spans) {
        if (s.type === 'llm' && s.durationMs && s.durationMs > llmAvg * 3) {
          anomalies.push({
            type: 'slow_llm',
            spanId: s.id,
            name: s.name,
            value: s.durationMs,
            threshold: llmAvg * 3,
            message: `LLM ${s.name} took ${s.durationMs}ms (3x avg ${llmAvg.toFixed(0)}ms)`,
          });
        }
      }
    }

    // Slow tool: duration > 5s
    for (const s of this.spans) {
      if (s.type === 'tool' && s.durationMs && s.durationMs > 5_000) {
        anomalies.push({
          type: 'slow_tool',
          spanId: s.id,
          name: s.name,
          value: s.durationMs,
          threshold: 5_000,
          message: `Tool ${s.name} took ${s.durationMs}ms (>5s)`,
        });
      }
    }

    // High error rate
    if (stats.totalSpans > 10) {
      const errorRate = stats.errorCount / stats.totalSpans;
      if (errorRate > 0.3) {
        anomalies.push({
          type: 'high_error_rate',
          spanId: 'summary',
          name: 'global',
          value: errorRate,
          threshold: 0.3,
          message: `Error rate ${(errorRate * 100).toFixed(1)}% (threshold 30%)`,
        });
      }
    }

    return anomalies;
  }

  // ── Hook Integration ──

  /**
   * Attach to a HookRegistry and automatically start/end spans
   * for model:invoke → model:response and tool:call → tool:result.
   *
   * Also records errors from task:error and model:error.
   */
  attachToHooks(hooks?: HookRegistry): void {
    const target = hooks ?? globalHooks;

    // Track active spans by session+cycle key
    const activeSpans = new Map<string, TraceSpan>();

    // ── Model invoke → response ──
    target.on('model:invoke', async (ctx: HookContext) => {
      const data = ctx.data as Record<string, unknown>;
      const key = `${data.sessionId}:model:${data.cycle}`;
      const span = this.startSpan(
        (data.modelUsed as string) || 'unknown-model',
        'llm',
        { toolCount: data.toolCount },
      );
      activeSpans.set(key, span);
    });

    target.on('model:response', async (ctx: HookContext) => {
      const data = ctx.data as Record<string, unknown>;
      const key = `${data.sessionId}:model:${data.cycle}`;
      const span = activeSpans.get(key);
      if (span) {
        this.setTokenCount(span, (data.inputTokens as number) || 0, (data.outputTokens as number) || 0);
        this.tagSpan(span, 'model', (data.modelUsed as string) || 'unknown');
        this.tagSpan(span, 'provider', (data.providerUsed as string) || 'unknown');
        this.endSpan(span, { finishReason: data.finishReason });
        activeSpans.delete(key);
      }
    });

    target.on('model:error', async (ctx: HookContext) => {
      const data = ctx.data as Record<string, unknown>;
      const key = `${data.sessionId}:model:${data.cycle}`;
      const span = activeSpans.get(key);
      if (span) {
        this.endSpan(span, undefined, data.error as string);
        activeSpans.delete(key);
      }
    });

    // ── Tool call → result ──
    // Note: this is an observer hook, not a guard.
    // Guards are registered via target.before() by the Agent.
    target.on('tool:call', async (ctx: HookContext) => {
      const data = ctx.data as Record<string, unknown>;
      const key = `${data.sessionId}:tool:${data.cycle}:${data.toolName}`;
      const span = this.startSpan(
        (data.toolName as string) || 'unknown-tool',
        'tool',
        data.toolArgs,
      );
      activeSpans.set(key, span);
    });

    target.on('tool:result', async (ctx: HookContext) => {
      const data = ctx.data as Record<string, unknown>;
      const key = `${data.sessionId}:tool:${data.cycle}:${data.toolName}`;
      const span = activeSpans.get(key);
      if (span) {
        this.endSpan(span, data.result);
        activeSpans.delete(key);
      }
    });

    // ── Task lifecycle ──
    target.on('task:start', async (ctx: HookContext) => {
      const data = ctx.data as Record<string, unknown>;
      const key = `${data.sessionId}:task`;
      const span = this.startSpan(
        'task:' + ((data.task as string)?.substring(0, 60) || (data.sessionId as string) || 'unknown'),
        'task',
        { messageCount: data.messageCount },
      );
      activeSpans.set(key, span);
    });

    target.on('task:complete', async (ctx: HookContext) => {
      const data = ctx.data as Record<string, unknown>;
      const key = `${data.sessionId}:task`;
      const span = activeSpans.get(key);
      if (span) {
        this.endSpan(span, data.result);
        activeSpans.delete(key);
      }
    });

    target.on('task:error', async (ctx: HookContext) => {
      const data = ctx.data as Record<string, unknown>;
      const key = `${data.sessionId}:task`;
      const span = activeSpans.get(key);
      if (span) {
        this.endSpan(span, undefined, data.error as string);
        activeSpans.delete(key);
      }
    });

    // ── Periodic anomaly check ──
    // Run after every tool:result
    target.on('tool:result', async (_ctx: HookContext) => {
      const anomalies = this.detectAnomalies();
      if (anomalies.length > 0 && this.verbose) {
        for (const a of anomalies) {
          console.warn(`[Tracer] ⚠ Anomaly: ${a.message}`);
        }
      }
    });
  }

  // ── Private ──

  private pushSpan(span: TraceSpan): void {
    this.spans.push(span);
    // Ring buffer: keep only the last bufferSize spans
    if (this.spans.length > this.bufferSize) {
      this.spans = this.spans.slice(-this.bufferSize);
    }
  }
}

/**
 * Create a pre-configured tracer for the agent.
 * Call once at startup.
 */
export function createAgentTracer(config?: TracerConfig): Tracer {
  const tracer = new Tracer({
    bufferSize: config?.bufferSize ?? 200,
    autoAttach: config?.autoAttach ?? false,
    verbose: config?.verbose ?? false,
  });

  // Auto-attach if requested (uses globalHooks internally)
  if (config?.autoAttach) {
    tracer.attachToHooks();
  }

  return tracer;
}

export default Tracer;