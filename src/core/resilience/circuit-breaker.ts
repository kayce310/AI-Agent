/**
 * @file circuit-breaker.ts — Circuit breaker pattern for resilience
 * @layer core/resilience
 * @purpose Prevent cascading failures when LLM or tools are unavailable
 */

// ─── Types ────────────────────────────────────────────────────────────────

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerConfig {
  failureThreshold: number;     // Consecutive failures before opening
  recoveryTimeoutMs: number;    // Time before attempting recovery
  halfOpenMaxCalls: number;     // Max calls in half-open state
}

export interface CircuitBreakerStats {
  state: CircuitState;
  failureCount: number;
  successCount: number;
  lastFailureTime?: number;
  halfOpenCalls: number;
}

// ─── Circuit Breaker Class ────────────────────────────────────────────────

export class CircuitBreaker {
  private state: CircuitState = 'CLOSED';
  private failureCount: number = 0;
  private successCount: number = 0;
  private lastFailureTime?: number;
  private halfOpenCalls: number = 0;
  private readonly config: CircuitBreakerConfig;

  constructor(config?: Partial<CircuitBreakerConfig>) {
    this.config = {
      failureThreshold: 5,
      recoveryTimeoutMs: 15000,
      halfOpenMaxCalls: 2,
      ...config,
    };
  }

  /**
   * Check if circuit allows the call
   */
  allowCall(): boolean {
    if (this.state === 'CLOSED') return true;

    if (this.state === 'OPEN') {
      // Check if recovery timeout has passed
      if (this.lastFailureTime && 
          Date.now() - this.lastFailureTime >= this.config.recoveryTimeoutMs) {
        this.state = 'HALF_OPEN';
        this.halfOpenCalls = 0;
        return true;
      }
      return false;
    }

    // HALF_OPEN state - allow limited calls
    return this.halfOpenCalls < this.config.halfOpenMaxCalls;
  }

  /**
   * Record a successful call
   */
  recordSuccess(): void {
    this.successCount++;
    this.failureCount = 0;

    if (this.state === 'HALF_OPEN') {
      this.state = 'CLOSED';
      this.halfOpenCalls = 0;
    }
  }

  /**
   * Record a failed call
   */
  recordFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.state === 'HALF_OPEN') {
      this.state = 'OPEN';
    } else if (this.failureCount >= this.config.failureThreshold) {
      this.state = 'OPEN';
    }
  }

  /**
   * Get current circuit state
   */
  getState(): CircuitState {
    return this.state;
  }

  /**
   * Get circuit statistics
   */
  getStats(): CircuitBreakerStats {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime,
      halfOpenCalls: this.halfOpenCalls,
    };
  }

  /**
   * Reset circuit breaker
   */
  reset(): void {
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = undefined;
    this.halfOpenCalls = 0;
  }

  /**
   * Manually open circuit
   */
  open(): void {
    this.state = 'OPEN';
    this.lastFailureTime = Date.now();
  }

  /**
   * Manually close circuit
   */
  close(): void {
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.halfOpenCalls = 0;
  }
}

// ─── Default Instance ─────────────────────────────────────────────────────

export const circuitBreaker = new CircuitBreaker({
  failureThreshold: 5,
  recoveryTimeoutMs: 15000,
});

// ─── Helper Functions ─────────────────────────────────────────────────────

/**
 * Execute function with circuit breaker protection
 */
export async function withCircuitBreaker<T>(
  breaker: CircuitBreaker,
  fn: () => Promise<T>
): Promise<T> {
  if (!breaker.allowCall()) {
    throw new Error('Circuit breaker OPEN - too many failures');
  }

  try {
    const result = await fn();
    breaker.recordSuccess();
    return result;
  } catch (error: any) {
    breaker.recordFailure();
    throw error;
  }
}
