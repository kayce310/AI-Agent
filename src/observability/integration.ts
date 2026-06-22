/**
 * Observability Integration: Bridge between Engine and Phase 2.1 EventStore
 * - Wire MetricsCollector into engine operations
 * - Hook tool calls, LLM responses, memory updates
 * - Track performance metrics
 */

import EventStore from './event-store.js';
import MetricsCollector from './metrics-collector.js';
import { Logger } from '../core/logger.js';

const log = new Logger({ module: 'ObservabilityIntegration' });

export interface ObservabilityConfig {
  enabled: boolean;
  eventStoreDir?: string;
  sessionId: string;
  flushIntervalMs?: number;
}

export class ObservabilityIntegration {
  private eventStore: EventStore;
  private metricsCollector: MetricsCollector;
  private sessionId: string;
  private enabled: boolean;

  constructor(config: ObservabilityConfig) {
    this.enabled = config.enabled;
    this.sessionId = config.sessionId;

    if (this.enabled) {
      this.eventStore = new EventStore(config.eventStoreDir || './data/events');
      this.metricsCollector = new MetricsCollector(this.eventStore, this.sessionId);
      log.info(`Observability initialized for session: ${this.sessionId}`);
    } else {
      // Create dummy instances for type safety
      this.eventStore = new EventStore('./data/events');
      this.metricsCollector = new MetricsCollector(this.eventStore, this.sessionId);
    }
  }

  /**
   * Initialize observability (create directories, start auto-flush)
   */
  async initialize(): Promise<void> {
    if (!this.enabled) return;

    try {
      await this.eventStore.initialize();
      this.metricsCollector.startAutoFlush();
      log.info('Observability initialized successfully');
    } catch (err) {
      log.error(`Failed to initialize observability: ${(err as Error).message}`);
      throw err;
    }
  }

  /**
   * Record tool call execution
   */
  async recordToolCall(data: {
    tool: string;
    input: Record<string, unknown>;
    duration: number;
    success: boolean;
    output?: unknown;
    error?: string;
  }): Promise<void> {
    if (!this.enabled) return;

    try {
      await this.metricsCollector.recordToolCall(data);
    } catch (err) {
      log.error(`Failed to record tool call: ${(err as Error).message}`);
    }
  }

  /**
   * Record LLM response
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
  }): Promise<void> {
    if (!this.enabled) return;

    try {
      await this.metricsCollector.recordLLMResponse(data);
    } catch (err) {
      log.error(`Failed to record LLM response: ${(err as Error).message}`);
    }
  }

  /**
   * Record memory operation
   */
  async recordMemoryUpdate(data: {
    operation: 'store' | 'retrieve' | 'update' | 'delete';
    key: string;
    duration: number;
    success: boolean;
    itemCount?: number;
    error?: string;
  }): Promise<void> {
    if (!this.enabled) return;

    try {
      await this.metricsCollector.recordMemoryUpdate(data);
    } catch (err) {
      log.error(`Failed to record memory update: ${(err as Error).message}`);
    }
  }

  /**
   * Record error event
   */
  async recordError(data: {
    source: string;
    message: string;
    stack?: string;
    context?: Record<string, unknown>;
  }): Promise<void> {
    if (!this.enabled) return;

    try {
      await this.metricsCollector.recordError(data);
    } catch (err) {
      log.error(`Failed to record error: ${(err as Error).message}`);
    }
  }

  /**
   * Record health check
   */
  async recordHealthCheck(data: {
    status: 'healthy' | 'degraded' | 'unhealthy';
    checks: Record<string, boolean>;
    memory?: {
      used: number;
      total: number;
    };
    uptime: number;
  }): Promise<void> {
    if (!this.enabled) return;

    try {
      await this.metricsCollector.recordHealthCheck(data);
    } catch (err) {
      log.error(`Failed to record health check: ${(err as Error).message}`);
    }
  }

  /**
   * Get metrics snapshot
   */
  async getMetrics() {
    if (!this.enabled) return null;

    try {
      return await this.metricsCollector.getSnapshot();
    } catch (err) {
      log.error(`Failed to get metrics: ${(err as Error).message}`);
      return null;
    }
  }

  /**
   * Get events for session
   */
  async getEvents(options: {
    limit?: number;
    cursor?: string;
    type?: string;
  } = {}) {
    if (!this.enabled) return { events: [], nextCursor: undefined };

    try {
      return await this.eventStore.query(this.sessionId, {
        limit: options.limit || 100,
        cursor: options.cursor,
        type: options.type as any,
      });
    } catch (err) {
      log.error(`Failed to get events: ${(err as Error).message}`);
      return { events: [], nextCursor: undefined };
    }
  }

  /**
   * Verify event ordering
   */
  async verifyOrdering() {
    if (!this.enabled) return { isValid: true, gaps: [] };

    try {
      return await this.eventStore.verifyOrdering(this.sessionId);
    } catch (err) {
      log.error(`Failed to verify ordering: ${(err as Error).message}`);
      return { isValid: false, gaps: [] };
    }
  }

  /**
   * Shutdown observability (flush pending metrics, cleanup)
   */
  async shutdown(): Promise<void> {
    if (!this.enabled) return;

    try {
      this.metricsCollector.stopAutoFlush();
      log.info('Observability shutdown complete');
    } catch (err) {
      log.error(`Failed to shutdown observability: ${(err as Error).message}`);
    }
  }

  /**
   * Check if observability is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Get session ID
   */
  getSessionId(): string {
    return this.sessionId;
  }
}

export default ObservabilityIntegration;
