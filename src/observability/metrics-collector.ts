/**
 * Metrics Collector: Wire EventStore into engine operations
 * - Automatically emit events on tool calls, LLM responses, memory updates
 * - Track performance metrics (duration, tokens, errors)
 * - Aggregate metrics for dashboard (throughput, latency, error rates)
 */

import EventStore, { Event } from './event-store.js';

export interface Metric {
  name: string;
  value: number;
  timestamp: number;
  tags: Record<string, string>;
}

export interface MetricsSnapshot {
  timestamp: number;
  metrics: Metric[];
  summary: {
    totalToolCalls: number;
    totalLLMResponses: number;
    totalMemoryUpdates: number;
    totalErrors: number;
    avgToolDuration: number;
    avgLLMLatency: number;
    tokensConsumed: number;
  };
}

export class MetricsCollector {
  private eventStore: EventStore;
  private sessionId: string;
  private metricsBuffer: Metric[] = [];
  private flushInterval: number = 5000; // Flush every 5s
  private flushTimer?: NodeJS.Timeout;

  constructor(eventStore: EventStore, sessionId: string) {
    this.eventStore = eventStore;
    this.sessionId = sessionId;
  }

  /**
   * Record tool call event
   */
  async recordToolCall(data: {
    tool: string;
    input: Record<string, unknown>;
    duration: number;
    success: boolean;
    output?: unknown;
    error?: string;
  }): Promise<Event> {
    const event = await this.eventStore.append({
      sessionId: this.sessionId,
      type: 'tool_call',
      data,
      metadata: {
        duration: data.duration,
      },
    });

    this.recordMetric('tool_call_duration', data.duration, { tool: data.tool });
    this.recordMetric('tool_call_success', data.success ? 1 : 0, { tool: data.tool });

    return event;
  }

  /**
   * Record LLM response event
   */
  async recordLLMResponse(data: {
    model: string;
    prompt: string;
    response: string;
    tokens: {
      input: number;
      output: number;
      total: number;
    };
    duration: number;
    temperature?: number;
    stopReason?: string;
  }): Promise<Event> {
    const event = await this.eventStore.append({
      sessionId: this.sessionId,
      type: 'llm_response',
      data,
      metadata: {
        duration: data.duration,
        tokens: data.tokens.total,
      },
    });

    this.recordMetric('llm_latency', data.duration, { model: data.model });
    this.recordMetric('llm_tokens_input', data.tokens.input, { model: data.model });
    this.recordMetric('llm_tokens_output', data.tokens.output, { model: data.model });

    return event;
  }

  /**
   * Record memory update event
   */
  async recordMemoryUpdate(data: {
    operation: 'store' | 'retrieve' | 'update' | 'delete';
    key: string;
    duration: number;
    success: boolean;
    itemCount?: number;
    error?: string;
  }): Promise<Event> {
    const event = await this.eventStore.append({
      sessionId: this.sessionId,
      type: 'memory_update',
      data,
      metadata: {
        duration: data.duration,
      },
    });

    this.recordMetric('memory_operation_duration', data.duration, {
      operation: data.operation,
    });
    this.recordMetric('memory_operation_success', data.success ? 1 : 0, {
      operation: data.operation,
    });

    return event;
  }

  /**
   * Record error event
   */
  async recordError(data: {
    source: string;
    message: string;
    stack?: string;
    context?: Record<string, unknown>;
  }): Promise<Event> {
    const event = await this.eventStore.append({
      sessionId: this.sessionId,
      type: 'error',
      data,
    });

    this.recordMetric('errors_total', 1, { source: data.source });

    return event;
  }

  /**
   * Record health check event
   */
  async recordHealthCheck(data: {
    status: 'healthy' | 'degraded' | 'unhealthy';
    checks: Record<string, boolean>;
    memory?: {
      used: number;
      total: number;
    };
    uptime: number;
  }): Promise<Event> {
    const event = await this.eventStore.append({
      sessionId: this.sessionId,
      type: 'health_check',
      data,
    });

    this.recordMetric('health_status', data.status === 'healthy' ? 1 : 0);
    if (data.memory) {
      this.recordMetric('memory_used_percent', (data.memory.used / data.memory.total) * 100);
    }
    this.recordMetric('uptime_seconds', data.uptime);

    return event;
  }

  /**
   * Record a single metric to buffer
   */
  private recordMetric(name: string, value: number, tags: Record<string, string> = {}): void {
    this.metricsBuffer.push({
      name,
      value,
      timestamp: Date.now(),
      tags,
    });

    // Auto-flush if buffer gets large
    if (this.metricsBuffer.length >= 100) {
      this.flush();
    }
  }

  /**
   * Get current metrics snapshot
   */
  async getSnapshot(): Promise<MetricsSnapshot> {
    const { events } = await this.eventStore.query(this.sessionId, { limit: 100000 });

    const summary = {
      totalToolCalls: events.filter(e => e.type === 'tool_call').length,
      totalLLMResponses: events.filter(e => e.type === 'llm_response').length,
      totalMemoryUpdates: events.filter(e => e.type === 'memory_update').length,
      totalErrors: events.filter(e => e.type === 'error').length,
      avgToolDuration: this.calculateAvgDuration(events, 'tool_call'),
      avgLLMLatency: this.calculateAvgDuration(events, 'llm_response'),
      tokensConsumed: this.calculateTotalTokens(events),
    };

    return {
      timestamp: Date.now(),
      metrics: this.metricsBuffer,
      summary,
    };
  }

  /**
   * Start auto-flushing metrics
   */
  startAutoFlush(): void {
    if (this.flushTimer) return;

    this.flushTimer = setInterval(() => {
      this.flush();
    }, this.flushInterval);
  }

  /**
   * Stop auto-flushing
   */
  stopAutoFlush(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = undefined;
    }
    // Final flush
    this.flush();
  }

  /**
   * Flush buffered metrics (in real implementation, send to dashboard)
   */
  private flush(): void {
    if (this.metricsBuffer.length === 0) return;

    // TODO: Send to metrics endpoint/database
    // console.log(`[Metrics] Flushed ${this.metricsBuffer.length} metrics`);

    this.metricsBuffer = [];
  }

  /**
   * Calculate average duration for event type
   */
  private calculateAvgDuration(events: Event[], type: Event['type']): number {
    const filtered = events.filter(e => e.type === type && e.metadata?.duration);
    if (!filtered.length) return 0;

    const sum = filtered.reduce((acc, e) => acc + (e.metadata?.duration ?? 0), 0);
    return sum / filtered.length;
  }

  /**
   * Calculate total tokens consumed
   */
  private calculateTotalTokens(events: Event[]): number {
    return events
      .filter(e => e.type === 'llm_response')
      .reduce((acc, e) => acc + (e.metadata?.tokens ?? 0), 0);
  }

  /**
   * Get metrics for specific time window
   */
  async getMetricsWindow(startTime: number, endTime: number): Promise<Metric[]> {
    const { events } = await this.eventStore.query(this.sessionId, {
      limit: 100000,
      startTime,
      endTime,
    });

    const metrics: Metric[] = [];

    for (const event of events) {
      if (event.type === 'tool_call') {
        metrics.push({
          name: 'tool_call_duration',
          value: event.metadata?.duration ?? 0,
          timestamp: event.timestamp,
          tags: { tool: (event.data as any).tool ?? 'unknown' },
        });
      } else if (event.type === 'llm_response') {
        metrics.push({
          name: 'llm_latency',
          value: event.metadata?.duration ?? 0,
          timestamp: event.timestamp,
          tags: { model: (event.data as any).model ?? 'unknown' },
        });
      }
    }

    return metrics;
  }

  /**
   * Export all metrics for analysis
   */
  async export(): Promise<Array<{ event: Event; metrics: Metric[] }>> {
    const events = await this.eventStore.export(this.sessionId);

    return events.map(event => ({
      event,
      metrics: [
        {
          name: `${event.type}_timestamp`,
          value: event.timestamp,
          timestamp: event.timestamp,
          tags: {},
        },
      ],
    }));
  }
}

export default MetricsCollector;
