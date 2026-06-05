/**
 * @file IterationBudget — Per-agent iteration tracking
 * @layer core
 * @depends-on (none — standalone)
 * @imported-by src/core/engine/engine.ts
 * @owner core-engine
 *
 * Thread-safe iteration budget — adapted from Hermes IterationBudget.
 * Each agent (parent or subagent) gets its own budget.
 * Parent cap: 90 iterations (default)
 * Subagent cap: 50 iterations (default per delegation)
 *
 * Read-only tool calls (execute_code, knowledge lookup) are refunded
 * so they don't consume budget.
 */

import { Worker } from 'worker_threads';

/** Tools that don't mutate state — refund their iterations */
const READ_ONLY_TOOLS = new Set([
  'read_file',
  'list_dir',
  'search',
  'knowledge_lookup',
  'execute_code',
  'get_context',
  'inspect_symbol',
]);

export interface IterationBudgetConfig {
  maxTotal: number;
  refundReadOnly?: boolean;
}

/**
 * Thread-safe iteration budget counter for an agent.
 */
export class IterationBudget {
  private maxTotal: number;
  private used = 0;
  private lock = new Promise<void>((resolve) => resolve());
  private refundReadOnly: boolean;

  constructor(config: IterationBudgetConfig) {
    this.maxTotal = config.maxTotal;
    this.refundReadOnly = config.refundReadOnly ?? true;
  }

  /** Try to consume one iteration. Returns true if allowed. */
  async consume(): Promise<boolean> {
    await this.lock;
    if (this.used >= this.maxTotal) return false;
    this.used++;
    return true;
  }

  /** Give back one iteration (e.g. for read-only tool turns). */
  async refund(): Promise<void> {
    await this.lock;
    if (this.used > 0) this.used--;
  }

  /** Refund if the tool is read-only (doesn't modify state). */
  async refundIfReadOnly(toolName: string): Promise<void> {
    if (!this.refundReadOnly) return;
    if (READ_ONLY_TOOLS.has(toolName)) {
      await this.refund();
    }
  }

  get remaining(): number {
    return Math.max(0, this.maxTotal - this.used);
  }

  get isExhausted(): boolean {
    return this.used >= this.maxTotal;
  }

  get usedCount(): number {
    return this.used;
  }

  get maxIterations(): number {
    return this.maxTotal;
  }
}

export default IterationBudget;
