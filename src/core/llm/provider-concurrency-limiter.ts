/**
 * @file Provider Concurrency Limiter — Control concurrent requests per provider
 * @layer core
 * @depends-on nothing (standalone utility)
 * @imported-by src/core/llm/model-adapter.ts
 * @owner core-llm
 *
 * Prevents multiple agents from overwhelming a provider's rate limits by
 * enforcing a per-provider concurrency limit. All requests must acquire
 * a slot before calling the provider; slots are always released in finally.
 */

import { Logger } from '../logger.js';

const log = new Logger({ module: 'ProviderConcurrencyLimiter' });

export interface ConcurrencyLimiterConfig {
  /**
   * Max concurrent requests per provider.
   * Default: 5 (conservative; adjust based on actual provider quota).
   * ponytail: This is a runtime operational limit, not the official provider quota.
   * Adjust when you have actual RPM/TPM specs from provider.
   */
  maxConcurrent: number;
}

/**
 * Semaphore implementation using async queue (no external dependency).
 * Tracks waiting requests and active slots.
 */
class Semaphore {
  private active = 0;
  private waiters: Array<() => void> = [];

  constructor(private max: number) {}

  /**
   * Acquire a slot. Blocks until a slot becomes available.
   * Returns an unlock function that MUST be called in finally.
   */
  async acquire(): Promise<() => void> {
    if (this.active < this.max) {
      this.active++;
      return () => this.release();
    }

    // Wait for a slot to become available
    return new Promise<() => void>((resolve) => {
      this.waiters.push(() => {
        this.active++;
        resolve(() => this.release());
      });
    });
  }

  private release(): void {
    this.active--;
    const waiter = this.waiters.shift();
    if (waiter) waiter();
  }

  getStatus(): { active: number; waiting: number; max: number } {
    return {
      active: this.active,
      waiting: this.waiters.length,
      max: this.max,
    };
  }
}

/**
 * Singleton per-provider concurrency limiter.
 * All agents and adapters share the same limiter for a given provider.
 */
export class ProviderConcurrencyLimiter {
  private static instance: ProviderConcurrencyLimiter;
  private semaphores: Map<string, Semaphore> = new Map();
  private config: ConcurrencyLimiterConfig;

  private constructor(config?: Partial<ConcurrencyLimiterConfig>) {
    this.config = {
      maxConcurrent: 5, // Conservative default; respects env override
      ...config,
    };

    // Check env var for override (useful for testing / tuning)
    const envLimit = process.env.PROVIDER_CONCURRENCY_LIMIT;
    if (envLimit) {
      const parsed = parseInt(envLimit, 10);
      if (parsed > 0) {
        this.config.maxConcurrent = parsed;
        log.info(
          `ProviderConcurrencyLimiter: max concurrent set to ${parsed} (from env)`
        );
      }
    }

    log.info(
      `ProviderConcurrencyLimiter initialized with max ${this.config.maxConcurrent} concurrent requests per provider`
    );
  }

  static getInstance(
    config?: Partial<ConcurrencyLimiterConfig>
  ): ProviderConcurrencyLimiter {
    if (!ProviderConcurrencyLimiter.instance) {
      ProviderConcurrencyLimiter.instance = new ProviderConcurrencyLimiter(
        config
      );
    }
    return ProviderConcurrencyLimiter.instance;
  }

  /**
   * Acquire a slot for a provider. Must be called before invoking provider.
   * Returns an unlock function that MUST be called in finally block.
   *
   * Usage:
   *   const unlock = await limiter.acquire('9router');
   *   try {
   *     return await adapter.invoke(...);
   *   } finally {
   *     unlock();
   *   }
   */
  async acquire(providerName: string): Promise<() => void> {
    let semaphore = this.semaphores.get(providerName);
    if (!semaphore) {
      semaphore = new Semaphore(this.config.maxConcurrent);
      this.semaphores.set(providerName, semaphore);
    }

    const status = semaphore.getStatus();
    if (status.waiting > 0) {
      log.info(
        `[CONCURRENCY] Provider "${providerName}": ${status.active}/${status.max} active, ${status.waiting} waiting`
      );
    }

    const unlock = await semaphore.acquire();

    const newStatus = semaphore.getStatus();
    if (newStatus.active > 1) {
      log.debug(
        `[CONCURRENCY] Provider "${providerName}": acquired slot (${newStatus.active}/${newStatus.max} now active)`
      );
    }

    return () => {
      unlock();
      const afterStatus = semaphore!.getStatus();
      log.debug(
        `[CONCURRENCY] Provider "${providerName}": released slot (${afterStatus.active}/${afterStatus.max} now active)`
      );
    };
  }

  /**
   * Get current status for a provider (for observability).
   */
  getStatus(providerName: string): {
    active: number;
    waiting: number;
    max: number;
  } | null {
    const semaphore = this.semaphores.get(providerName);
    return semaphore ? semaphore.getStatus() : null;
  }

  /**
   * Reset all semaphores (mainly for testing).
   */
  reset(): void {
    this.semaphores.clear();
    log.info('ProviderConcurrencyLimiter: reset all semaphores');
  }
}
