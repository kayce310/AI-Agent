/**
 * @file Cost Tracker — Token usage aggregation and cost calculation
 * @layer core/events
 * @created 2026-06-21
 * @description Tracks token usage per task, per session, per model.
 *   Calculates estimated cost using known pricing.
 *   Provides budget alerts and historical cost data.
 */

import { EventBus } from './bus.js';

// ═══ TYPES ═══

export interface TokenUsage {
  input: number;
  output: number;
}

export interface CostRecord {
  timestamp: number;
  taskId?: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  estimatedCostUsd: number;
}

export interface TaskCost {
  taskId: string;
  totalInput: number;
  totalOutput: number;
  totalCostUsd: number;
  callCount: number;
  model: string;
  firstCallAt: number;
  lastCallAt: number;
}

export interface SessionCost {
  totalInput: number;
  totalOutput: number;
  totalCostUsd: number;
  totalCalls: number;
  byModel: Record<string, { input: number; output: number; cost: number; calls: number }>;
  byTask: Record<string, TaskCost>;
}

export interface CostAlert {
  type: 'budget_threshold' | 'high_single_call' | 'budget_exceeded';
  message: string;
  timestamp: number;
  severity: 'info' | 'warning' | 'critical';
}

export interface CostTrackerConfig {
  /** Max budget in USD (default $10) */
  budgetUsd?: number;
  /** Warn at this % of budget (default 70%) */
  warnThresholdPct?: number;
  /** Critical at this % (default 90%) */
  criticalThresholdPct?: number;
  /** Max cost per single LLM call before alert (default $0.50) */
  maxSingleCallUsd?: number;
  /** Max records to keep in memory */
  maxRecords?: number;
}

// ═══ PRICING ═══

/** Approximate pricing per 1K tokens (USD) — covers common models */
const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  'deepseek-v4-flash': { input: 0.00027, output: 0.0011 },
  'deepseek-chat': { input: 0.00027, output: 0.0011 },
  'claude-3.5-sonnet': { input: 0.003, output: 0.015 },
  'claude-3-opus': { input: 0.015, output: 0.075 },
  'gpt-4o': { input: 0.0025, output: 0.01 },
  'gpt-4-turbo': { input: 0.01, output: 0.03 },
  'gpt-3.5-turbo': { input: 0.0005, output: 0.0015 },
  'gemini-pro': { input: 0.00025, output: 0.0005 },
  // Free tier
  'kiro': { input: 0, output: 0 },
  'free': { input: 0, output: 0 },
  // Default fallback
  'default': { input: 0.001, output: 0.003 },
};

function getModelPricing(model: string): { input: number; output: number } {
  const normalized = model.toLowerCase().replace(/^(kr|openrouter)\//, '');
  if (MODEL_PRICING[normalized]) return MODEL_PRICING[normalized];
  // Partial match
  for (const [key, val] of Object.entries(MODEL_PRICING)) {
    if (normalized.includes(key) || key.includes(normalized)) return val;
  }
  return MODEL_PRICING.default;
}

// ═══ COST TRACKER ═══

export class CostTracker {
  private bus: EventBus;
  private records: CostRecord[] = [];
  private alerts: CostAlert[] = [];
  private budgetUsd: number;
  private warnThresholdPct: number;
  private criticalThresholdPct: number;
  private maxSingleCallUsd: number;
  private maxRecords: number;

  // Running session totals
  private sessionInput = 0;
  private sessionOutput = 0;
  private sessionCostUsd = 0;
  private sessionCalls = 0;
  private byModel: Record<string, { input: number; output: number; cost: number; calls: number }> = {};
  private byTask: Record<string, TaskCost> = {};

  constructor(bus: EventBus, config?: CostTrackerConfig) {
    this.bus = bus;
    this.budgetUsd = config?.budgetUsd ?? 10;
    this.warnThresholdPct = config?.warnThresholdPct ?? 70;
    this.criticalThresholdPct = config?.criticalThresholdPct ?? 90;
    this.maxSingleCallUsd = config?.maxSingleCallUsd ?? 0.50;
    this.maxRecords = config?.maxRecords ?? 10000;

    this.subscribeToEvents();
  }

  private subscribeToEvents(): void {
    // Listen for tool_finished events that carry tokenUsage (from model adapter)
    this.bus.subscribe('tool_finished', (event) => {
      const p = event.payload as Record<string, unknown>;
      // Some tool calls may carry token usage metadata
      const tokenUsage = p.tokenUsage as TokenUsage | undefined;
      const model = (p.model as string) || 'unknown';
      if (tokenUsage && (tokenUsage.input > 0 || tokenUsage.output > 0)) {
        this.recordUsage(model, tokenUsage, p.taskId as string | undefined);
      }
    });

    // Listen for task_started/task_finished to track per-task costs
    this.bus.subscribe('task_started', (event) => {
      const p = event.payload as Record<string, unknown>;
      const taskId = p.taskId as string;
      if (taskId && !this.byTask[taskId]) {
        this.byTask[taskId] = {
          taskId,
          totalInput: 0,
          totalOutput: 0,
          totalCostUsd: 0,
          callCount: 0,
          model: 'unknown',
          firstCallAt: event.timestamp,
          lastCallAt: event.timestamp,
        };
      }
    });

    this.bus.subscribe('task_finished', (event) => {
      const p = event.payload as Record<string, unknown>;
      const taskId = p.taskId as string;
      if (taskId && this.byTask[taskId]) {
        this.byTask[taskId].lastCallAt = event.timestamp;
      }
    });
  }

  /**
   * Manually record token usage (called by engine/model-adapter)
   */
  recordUsage(model: string, usage: TokenUsage, taskId?: string): void {
    const pricing = getModelPricing(model);
    const inputCost = (usage.input / 1000) * pricing.input;
    const outputCost = (usage.output / 1000) * pricing.output;
    const totalCost = inputCost + outputCost;

    const record: CostRecord = {
      timestamp: Date.now(),
      taskId,
      model,
      inputTokens: usage.input,
      outputTokens: usage.output,
      estimatedCostUsd: totalCost,
    };

    // Append (trim if over limit)
    this.records.push(record);
    if (this.records.length > this.maxRecords) {
      this.records = this.records.slice(-this.maxRecords / 2);
    }

    // Update session totals
    this.sessionInput += usage.input;
    this.sessionOutput += usage.output;
    this.sessionCostUsd += totalCost;
    this.sessionCalls++;

    // Per-model breakdown
    if (!this.byModel[model]) {
      this.byModel[model] = { input: 0, output: 0, cost: 0, calls: 0 };
    }
    this.byModel[model].input += usage.input;
    this.byModel[model].output += usage.output;
    this.byModel[model].cost += totalCost;
    this.byModel[model].calls++;

    // Per-task breakdown
    if (taskId) {
      if (!this.byTask[taskId]) {
        this.byTask[taskId] = {
          taskId,
          totalInput: 0,
          totalOutput: 0,
          totalCostUsd: 0,
          callCount: 0,
          model,
          firstCallAt: record.timestamp,
          lastCallAt: record.timestamp,
        };
      }
      const t = this.byTask[taskId];
      t.totalInput += usage.input;
      t.totalOutput += usage.output;
      t.totalCostUsd += totalCost;
      t.callCount++;
      t.lastCallAt = record.timestamp;
    }

    // Check alerts
    this.checkAlerts(totalCost, model);
  }

  private checkAlerts(callCost: number, model: string): void {
    const now = Date.now();

    // High single-call cost
    if (callCost > this.maxSingleCallUsd) {
      this.alerts.push({
        type: 'high_single_call',
        message: `High-cost call: $${callCost.toFixed(4)} (${model})`,
        timestamp: now,
        severity: 'warning',
      });
    }

    // Budget thresholds
    const pct = (this.sessionCostUsd / this.budgetUsd) * 100;
    if (pct >= this.criticalThresholdPct) {
      // Only add if not already in critical state
      const existingCritical = this.alerts.find(a =>
        a.type === 'budget_exceeded' && (now - a.timestamp) < 60000
      );
      if (!existingCritical) {
        this.alerts.push({
          type: 'budget_exceeded',
          message: `Budget at ${pct.toFixed(1)}% ($${this.sessionCostUsd.toFixed(4)} / $${this.budgetUsd})`,
          timestamp: now,
          severity: 'critical',
        });
      }
    } else if (pct >= this.warnThresholdPct) {
      const existingWarn = this.alerts.find(a =>
        a.type === 'budget_threshold' && (now - a.timestamp) < 60000
      );
      if (!existingWarn) {
        this.alerts.push({
          type: 'budget_threshold',
          message: `Budget at ${pct.toFixed(1)}% ($${this.sessionCostUsd.toFixed(4)} / $${this.budgetUsd})`,
          timestamp: now,
          severity: 'warning',
        });
      }
    }
  }

  // ═══ QUERIES ═══

  getSessionCost(): SessionCost {
    return {
      totalInput: this.sessionInput,
      totalOutput: this.sessionOutput,
      totalCostUsd: this.sessionCostUsd,
      totalCalls: this.sessionCalls,
      byModel: { ...this.byModel },
      byTask: { ...this.byTask },
    };
  }

  getAlerts(limit: number = 20): CostAlert[] {
    return this.alerts.slice(-limit);
  }

  getRecentRecords(limit: number = 50): CostRecord[] {
    return this.records.slice(-limit);
  }

  getBudgetStatus(): { budgetUsd: number; spentUsd: number; pct: number; remainingUsd: number } {
    return {
      budgetUsd: this.budgetUsd,
      spentUsd: this.sessionCostUsd,
      pct: (this.sessionCostUsd / this.budgetUsd) * 100,
      remainingUsd: this.budgetUsd - this.sessionCostUsd,
    };
  }
}
