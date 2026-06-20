/**
 * @file evolution — Evolution engine (simplified)
 * @layer core
 * @depends-on src/core/types.ts
 * @imported-by src/core/engine/engine.ts
 * @owner core-evolution
 *
 * Simplified evolution engine:
 * - Error tracking: Records errors with fingerprint dedup
 * - Model performance: Tracks success/failure rates per model
 * - Auto-skip: Skips models with >50% failure rate after 5+ calls
 * - Console logging: Logs errors to console (no disk I/O)
 *
 * Removed: Rule system (half-implemented, overkill for current needs)
 */

import { createHash } from 'node:crypto';
import { HookRegistry, HookContext } from './hooks.js';
import { Logger } from './logger.js';
const log = new Logger({ module: 'Evolution' });

// ─── Types ────────────────────────────────────────────────────────────

export interface ErrorRecord {
  /** MD5 hash of error message for dedup */
  fingerprint: string;
  /** Model that caused the error */
  modelId: string;
  /** Error type (e.g., 'RATE_LIMIT', 'TOOL_EXECUTION', 'PROVIDER_DOWN') */
  errorType: string;
  /** Original error message */
  errorMessage: string;
  /** Full stack trace if available */
  stackTrace?: string;
  /** Timestamp */
  timestamp: string;
  /** Session ID */
  sessionId: string;
  /** Context: request snippet that caused the error (truncated 200 chars) */
  contextSnippet?: string;
}

export interface EvolutionState {
  version: '1.0';
  /** Error history (max 500 records) */
  errors: ErrorRecord[];
  /** Model performance tracking */
  modelPerformance: Record<string, {
    totalCalls: number;
    failedCalls: number;
    lastFailure: string | null;
    avgResponseTime: number;
    /** Error type stats for this model */
    errorTypes: Record<string, number>;
  }>;
  /** Metadata */
  meta: {
    lastUpdated: string;
    totalErrorsTracked: number;
  };
}

// ─── Evolution Engine ─────────────────────────────────────────────────

export class EvolutionEngine {
  private state: EvolutionState;

  constructor() {
    this.state = this.getDefaultState();
  }

  async init(): Promise<void> {
    // No disk persistence — just console logging
    this.state = this.getDefaultState();
  }

  /** Record a new error */
  async recordError(record: Omit<ErrorRecord, 'fingerprint' | 'timestamp'>): Promise<void> {
    const errorFingerprint = createHash('md5')
      .update(`${record.modelId}:${record.errorMessage}`)
      .digest('hex')
      .slice(0, 12);

    // Skip duplicate errors
    const existing = this.state.errors.find(e => e.fingerprint === errorFingerprint);
    if (existing) {
      return;
    }

    const fullRecord: ErrorRecord = {
      ...record,
      fingerprint: errorFingerprint,
      timestamp: new Date().toISOString(),
    };
    this.state.errors.push(fullRecord);

    // Limit to 500 records
    if (this.state.errors.length > 500) {
      this.state.errors = this.state.errors.slice(-500);
    }

    // Update model performance
    const perf = this.state.modelPerformance[record.modelId] || {
      totalCalls: 0,
      failedCalls: 0,
      lastFailure: null,
      avgResponseTime: 0,
      errorTypes: {},
    };
    perf.failedCalls++;
    perf.lastFailure = fullRecord.timestamp;
    perf.errorTypes[record.errorType] = (perf.errorTypes[record.errorType] || 0) + 1;
    this.state.modelPerformance[record.modelId] = perf;

    this.state.meta.totalErrorsTracked++;
    this.state.meta.lastUpdated = fullRecord.timestamp;

    // Log to console (no disk I/O)
    log.error(`Error recorded: ${record.modelId} - ${record.errorType}`, { message: record.errorMessage.slice(0, 100) });
  }

  /** Record a successful model call */
  async recordSuccess(modelId: string, responseTimeMs: number): Promise<void> {
    const perf = this.state.modelPerformance[modelId] || {
      totalCalls: 0,
      failedCalls: 0,
      lastFailure: null,
      avgResponseTime: 0,
      errorTypes: {},
    };
    perf.totalCalls++;
    perf.avgResponseTime = perf.totalCalls === 1
      ? responseTimeMs
      : (perf.avgResponseTime * (perf.totalCalls - 1) + responseTimeMs) / perf.totalCalls;
    this.state.modelPerformance[modelId] = perf;
  }

  /** Check if a model should be skipped based on history */
  shouldSkipModel(modelId: string): boolean {
    const perf = this.state.modelPerformance[modelId];
    if (!perf || perf.totalCalls === 0) return false;

    // Skip if failure rate > 50% after 5+ calls
    const failureRate = perf.failedCalls / perf.totalCalls;
    if (perf.totalCalls >= 5 && failureRate > 0.5) {
      return true;
    }

    return false;
  }

  /** Get routing advice based on evolution */
  getRoutingAdvice(): { preferredModel: string; reason: string } | null {
    const entries = Object.entries(this.state.modelPerformance);
    if (entries.length === 0) return null;

    // Find model with highest success rate
    let best: { modelId: string; score: number } = { modelId: '', score: 0 };
    for (const [modelId, perf] of entries) {
      if (perf.totalCalls < 3) continue; // Not enough data
      const successRate = 1 - (perf.failedCalls / perf.totalCalls);
      if (successRate > best.score) {
        best = { modelId, score: successRate };
      }
    }

    if (best.score > 0.7) {
      return {
        preferredModel: best.modelId,
        reason: `Success rate ${(best.score * 100).toFixed(0)}% across ${this.state.modelPerformance[best.modelId].totalCalls} calls`,
      };
    }
    return null;
  }

  /**
   * Attach to HookRegistry — auto-record errors from lifecycle events.
   * Registers hooks for tool:error, model:error, task:error.
   */
  attachToHooks(hooks: HookRegistry): void {
    hooks.on('tool:error', async (ctx: HookContext) => {
      await this.recordError({
        modelId: 'tool',
        errorType: 'TOOL_EXECUTION',
        errorMessage: (ctx.data.error as string) ?? JSON.stringify(ctx.data),
        sessionId: (ctx.data.sessionId as string) ?? 'unknown',
        contextSnippet: JSON.stringify(ctx.data).slice(0, 200),
      });
    });

    hooks.on('model:error', async (ctx: HookContext) => {
      await this.recordError({
        modelId: (ctx.data.modelUsed as string) ?? 'unknown',
        errorType: 'MODEL_ERROR',
        errorMessage: (ctx.data.error as string) ?? JSON.stringify(ctx.data),
        sessionId: (ctx.data.sessionId as string) ?? 'unknown',
        contextSnippet: JSON.stringify(ctx.data).slice(0, 200),
      });
    });

    hooks.on('task:error', async (ctx: HookContext) => {
      await this.recordError({
        modelId: 'task',
        errorType: 'TASK_ERROR',
        errorMessage: (ctx.data.error as string) ?? JSON.stringify(ctx.data),
        sessionId: (ctx.data.sessionId as string) ?? 'unknown',
        contextSnippet: JSON.stringify(ctx.data).slice(0, 200),
      });
    });
  }

  /** Get recent errors */
  getRecentErrors(limit = 10): ErrorRecord[] {
    return this.state.errors.slice(-limit).reverse();
  }

  /** Get evolution stats */
  getStats(): EvolutionState['meta'] & { modelCount: number } {
    return {
      ...this.state.meta,
      modelCount: Object.keys(this.state.modelPerformance).length,
    };
  }

  private getDefaultState(): EvolutionState {
    return {
      version: '1.0',
      errors: [],
      modelPerformance: {},
      meta: {
        lastUpdated: new Date().toISOString(),
        totalErrorsTracked: 0,
      },
    };
  }
}

/** Singleton */
export const evolutionEngine = new EvolutionEngine();
export default EvolutionEngine;
