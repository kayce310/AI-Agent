/**
 * @file CircuitBreaker — Prevents infinite retry loops (Zombie Protection)
 * @layer core
 * @depends-on nothing (standalone utility)
 * @imported-by src/core/engine/agent.ts
 * @owner core-engine
 *
 * Standard circuit breaker pattern:
 *   CLOSED → (failures ≥ threshold) → OPEN → (cooldown) → HALF_OPEN → (success) → CLOSED
 *                                                    └→ (failure) → OPEN
 *
 * Protects Coral from spamming external services (e.g., Tor/Hermes Agent)
 * when LLM providers are down or rate-limited.
 */

import { Logger } from './logger.js';

const log = new Logger({ module: 'CircuitBreaker' });

export type CircuitState = 'closed' | 'open' | 'half-open';

export interface CircuitBreakerConfig {
  /** Number of consecutive failures before opening the circuit */
  failureThreshold: number;
  /** Time (ms) to wait before trying again from OPEN → HALF_OPEN */
  recoveryTimeoutMs: number;
  /** Max test requests allowed in HALF_OPEN state */
  halfOpenMaxAttempts: number;
}

const DEFAULT_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5,  // Increased from 3 to allow more retries before opening
  recoveryTimeoutMs: 15_000, // Reduced from 60s to 15s for faster recovery
  halfOpenMaxAttempts: 2,  // Increased from 1 to 2 for more test attempts
};

/**
 * CircuitBreaker: Prevents cascading failures by stopping requests
 * when a downstream dependency is unhealthy.
 *
 * Usage:
 *   const cb = new CircuitBreaker({ failureThreshold: 3 });
 *   try {
 *     const result = await cb.execute(() => riskyOperation());
 *   } catch (err) {
 *     if (err.message.includes('Circuit breaker OPEN')) {
 *       // Service is degraded — return fallback
 *     }
 *   }
 */
export class CircuitBreaker {
  private state: CircuitState = 'closed';
  private failureCount = 0;
  private lastFailureTime = 0;
  private halfOpenAttempts = 0;
  private config: CircuitBreakerConfig;

  constructor(config?: Partial<CircuitBreakerConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Execute a function through the circuit breaker.
   * Throws if circuit is OPEN.
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // Check if we should transition from OPEN to HALF_OPEN
    if (this.state === 'open') {
      const elapsed = Date.now() - this.lastFailureTime;
      if (elapsed >= this.config.recoveryTimeoutMs) {
        this.state = 'half-open';
        this.halfOpenAttempts = 0;
        log.info(`Circuit breaker: OPEN → HALF_OPEN (after ${elapsed}ms cooldown)`);
      } else {
        const remaining = this.config.recoveryTimeoutMs - elapsed;
        throw new Error(
          `Circuit breaker OPEN — service degraded. Retry in ${Math.ceil(remaining / 1000)}s`
        );
      }
    }

    // Check half-open limit
    if (this.state === 'half-open') {
      if (this.halfOpenAttempts >= this.config.halfOpenMaxAttempts) {
        throw new Error(
          `Circuit breaker HALF_OPEN — max test attempts reached. Retry in ${Math.ceil((this.config.recoveryTimeoutMs - (Date.now() - this.lastFailureTime)) / 1000)}s`
        );
      }
      this.halfOpenAttempts++;
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (err) {
      this.onFailure();
      throw err;
    }
  }

  /** Reset circuit breaker to closed state */
  reset(): void {
    this.state = 'closed';
    this.failureCount = 0;
    this.lastFailureTime = 0;
    this.halfOpenAttempts = 0;
  }

  /** Get current circuit state */
  getState(): CircuitState {
    return this.state;
  }

  /** Get current consecutive failure count */
  getFailureCount(): number {
    return this.failureCount;
  }

  /** Check if circuit is allowing requests */
  isHealthy(): boolean {
    return this.state !== 'open';
  }

  // ── Private ──

  private onSuccess(): void {
    if (this.state === 'half-open') {
      log.info(`Circuit breaker: HALF_OPEN → CLOSED (healthy again)`);
      this.state = 'closed';
    }
    this.failureCount = 0;
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.state === 'half-open') {
      this.state = 'open';
      log.warn(`Circuit breaker: HALF_OPEN → OPEN (still failing)`);
    } else if (this.failureCount >= this.config.failureThreshold) {
      this.state = 'open';
      log.warn(
        `Circuit breaker: CLOSED → OPEN after ${this.failureCount} consecutive failures`
      );
    }
  }
}

/**
 * Global engine circuit breaker — shared across all requests.
 * Prevents Coral from spamming external services when providers are down.
 */
export const engineCircuitBreaker = new CircuitBreaker({
  failureThreshold: 3,        // 3 consecutive failures
  recoveryTimeoutMs: 60_000,  // 1 minute cooldown
  halfOpenMaxAttempts: 1,     // 1 test request before deciding
});
