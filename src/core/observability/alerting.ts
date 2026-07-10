/**
 * @file alerting — Alert System (Event-based, decoupled from Engine)
 * @layer core
 * @depends-on src/core/engine/engine.ts
 * @owner core-observability
 *
 * Subscribes to Engine events and dispatches alerts when failures occur.
 * Event-based: Engine emits → Alerting subscribes. No coupling.
 *
 * Alert triggers:
 *   - rate_limit: Global or per-user rate limit hit
 *   - circuit_breaker_open: Circuit breaker opened
 *   - agent_error: Agent.run() failed
 *   - timeout: Request timed out
 *   - stale_cleanup: PendingRequest force-cleaned (LLM hung)
 */

import { EventEmitter } from 'events';
import { Logger } from '../logger.js';

const log = new Logger({ module: 'Alerting' });

// ── Types ──

export type AlertLevel = 'info' | 'warn' | 'error' | 'critical';

export type AlertType =
  | 'rate_limit'
  | 'circuit_breaker_open'
  | 'agent_error'
  | 'timeout'
  | 'stale_cleanup'
  | 'prompt_truncated';

export interface AlertData {
  level: AlertLevel;
  type: AlertType;
  message: string;
  timestamp: number;
  sessionId?: string;
  userId?: string;
  details?: Record<string, unknown>;
}

export type AlertHandler = (alert: AlertData) => void;

export interface AlertingConfig {
  /** Custom handlers (e.g., Telegram, Slack) */
  handlers?: AlertHandler[];
  /** Minimum level to process */
  minLevel?: AlertLevel;
  /** Cooldown ms for same alert type (prevent spam) */
  cooldownMs?: number;
}

// ── Level priority ──

const LEVEL_PRIORITY: Record<AlertLevel, number> = {
  info: 0,
  warn: 1,
  error: 2,
  critical: 3,
};

// ── Alerting Class ──

export class AlertingSystem {
  private handlers: AlertHandler[] = [];
  private minLevel: AlertLevel = 'warn';
  private cooldownMs: number = 60_000; // 1 minute default
  private lastAlertTime: Map<string, number> = new Map();

  constructor(config: AlertingConfig = {}) {
    if (config.handlers) this.handlers = config.handlers;
    if (config.minLevel) this.minLevel = config.minLevel;
    if (config.cooldownMs) this.cooldownMs = config.cooldownMs;
  }

  /**
   * Register a custom alert handler (e.g., Telegram bot send)
   */
  addHandler(handler: AlertHandler): void {
    this.handlers.push(handler);
  }

  /**
   * Process an alert event. Called by Engine event subscribers.
   */
  handleAlert(alert: AlertData): void {
    // Filter by min level
    if (LEVEL_PRIORITY[alert.level] < LEVEL_PRIORITY[this.minLevel]) return;

    // Cooldown check
    const cooldownKey = `${alert.type}:${alert.userId || 'global'}`;
    const lastTime = this.lastAlertTime.get(cooldownKey) || 0;
    if (Date.now() - lastTime < this.cooldownMs) return;
    this.lastAlertTime.set(cooldownKey, Date.now());

    // Dispatch to all handlers
    for (const handler of this.handlers) {
      try {
        handler(alert);
      } catch (err: any) {
        log.error(`Alert handler failed: ${err.message}`);
      }
    }

    // Default: log the alert
    const logFn = alert.level === 'critical' || alert.level === 'error'
      ? log.error.bind(log)
      : log.warn.bind(log);
    logFn(`[ALERT:${alert.type}] ${alert.message}`, {
      level: alert.level,
      sessionId: alert.sessionId,
      userId: alert.userId,
    });
  }

  /**
   * Subscribe to an Engine instance's events
   */
  subscribeToEngine(engine: EventEmitter): void {
    engine.on('alert:rate_limit', (data: any) => {
      this.handleAlert({
        level: 'warn',
        type: 'rate_limit',
        message: `Rate limit exceeded${data?.userId ? ` for user ${data.userId}` : ' (global)'}`,
        timestamp: Date.now(),
        userId: data?.userId,
        details: data,
      });
    });

    engine.on('alert:circuit_breaker', (data: any) => {
      this.handleAlert({
        level: 'error',
        type: 'circuit_breaker_open',
        message: 'Circuit breaker opened — requests rejected',
        timestamp: Date.now(),
        details: data,
      });
    });

    engine.on('alert:agent_error', (data: any) => {
      this.handleAlert({
        level: 'error',
        type: 'agent_error',
        message: `Agent failed: ${data?.message || 'unknown error'}`,
        timestamp: Date.now(),
        sessionId: data?.sessionId,
        details: data,
      });
    });

    engine.on('alert:timeout', (data: any) => {
      this.handleAlert({
        level: 'warn',
        type: 'timeout',
        message: 'Request timed out',
        timestamp: Date.now(),
        sessionId: data?.sessionId,
        details: data,
      });
    });

    engine.on('alert:stale_cleanup', (data: any) => {
      this.handleAlert({
        level: 'warn',
        type: 'stale_cleanup',
        message: `Stale pending request cleaned: ${data?.key?.slice(0, 40)}`,
        timestamp: Date.now(),
        details: data,
      });
    });

    engine.on('alert:prompt_truncated', (data: any) => {
      this.handleAlert({
        level: 'info',
        type: 'prompt_truncated',
        message: `Prompt truncated: ${data?.originalTokens} → ${data?.maxTokens} tokens`,
        timestamp: Date.now(),
        details: data,
      });
    });

    log.info('Alerting system subscribed to engine events');
  }
}

// ── Singleton ──

let alertingInstance: AlertingSystem | null = null;

export function getAlertingSystem(config?: AlertingConfig): AlertingSystem {
  if (!alertingInstance) {
    alertingInstance = new AlertingSystem(config);
  }
  return alertingInstance;
}

export default AlertingSystem;
