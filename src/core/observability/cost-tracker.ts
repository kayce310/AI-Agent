/**
 * @file cost-tracker — Observability module
 * @layer core
 * @depends-on src/core/types.ts
 * @imported-by src/core/engine/engine.ts
 * @owner core-observability
 */

/**
 * CostTracker — Per-span token cost tracking
 * Phase 6.4a: read Langfuse spans, compute token cost
 */

export interface CostRecord {
  modelId: string;
  provider: string;
  inputTokens: number;
  outputTokens: number;
  inputCost: number;
  outputCost: number;
  totalCost: number;
  timestamp: number;
  sessionId?: string;
}

export interface CostTrackerConfig {
  /** Cost per 1K input tokens (USD) */
  inputRate: number;
  /** Cost per 1K output tokens (USD) */
  outputRate: number;
  /** Max records to retain in memory */
  maxRecords: number;
}

const DEFAULT_CONFIG: CostTrackerConfig = {
  inputRate: 0.00015,   // ~DeepSeek pricing
  outputRate: 0.00060,
  maxRecords: 1000,
};

export class CostTracker {
  private records: CostRecord[] = [];
  private config: CostTrackerConfig;
  private modelRates: Map<string, { inputRate: number; outputRate: number }> = new Map();

  constructor(config?: Partial<CostTrackerConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Set custom rates for a specific model.
   */
  setModelRate(modelId: string, inputRate: number, outputRate: number): void {
    this.modelRates.set(modelId, { inputRate, outputRate });
  }

  /**
   * Record a cost entry.
   */
  record(entry: Omit<CostRecord, 'inputCost' | 'outputCost' | 'totalCost' | 'timestamp'>): CostRecord {
    const rates = this.modelRates.get(entry.modelId) || this.config;
    const inputCost = (entry.inputTokens / 1000) * rates.inputRate;
    const outputCost = (entry.outputTokens / 1000) * rates.outputRate;

    const record: CostRecord = {
      ...entry,
      inputCost,
      outputCost,
      totalCost: inputCost + outputCost,
      timestamp: Date.now(),
    };

    this.records.push(record);

    // Trim oldest if over limit
    if (this.records.length > this.config.maxRecords) {
      this.records = this.records.slice(-this.config.maxRecords);
    }

    return record;
  }

  /**
   * Get total cost across all records.
   */
  getTotalCost(): number {
    return this.records.reduce((sum, r) => sum + r.totalCost, 0);
  }

  /**
   * Get cost summary grouped by model.
   */
  getCostByModel(): Record<string, { calls: number; totalTokens: number; totalCost: number }> {
    const summary: Record<string, { calls: number; totalTokens: number; totalCost: number }> = {};
    for (const r of this.records) {
      if (!summary[r.modelId]) {
        summary[r.modelId] = { calls: 0, totalTokens: 0, totalCost: 0 };
      }
      summary[r.modelId].calls++;
      summary[r.modelId].totalTokens += r.inputTokens + r.outputTokens;
      summary[r.modelId].totalCost += r.totalCost;
    }
    return summary;
  }

  /**
   * Get all records for a session.
   */
  getSessionCost(sessionId: string): CostRecord[] {
    return this.records.filter(r => r.sessionId === sessionId);
  }

  /**
   * Get latest N records.
   */
  getRecent(n: number = 10): CostRecord[] {
    return this.records.slice(-n);
  }

  /**
   * Get total token usage.
   */
  getTotalTokens(): { input: number; output: number } {
    return {
      input: this.records.reduce((sum, r) => sum + r.inputTokens, 0),
      output: this.records.reduce((sum, r) => sum + r.outputTokens, 0),
    };
  }

  /**
   * Reset all records.
   */
  reset(): void {
    this.records = [];
  }

  /**
   * Get config.
   */
  getConfig(): CostTrackerConfig {
    return { ...this.config };
  }

  /**
   * Update rates at runtime.
   */
  setConfig(config: Partial<CostTrackerConfig>): void {
    Object.assign(this.config, config);
  }
}

export default CostTracker;