/**
 * @file rate-limiter — Security module
 * @layer core
 * @depends-on (none — standalone)
 * @imported-by src/core/engine/engine.ts
 * @owner core-security
 */

/**
 * RateLimiter — Token-bucket rate limiter for API calls
 * Phase 6.4b: token/minute, request/minute limits
 */

export interface RateLimiterConfig {
  /** Max tokens per interval */
  tokensPerInterval: number;
  /** Interval in ms */
  intervalMs: number;
  /** Max burst size (default = tokensPerInterval) */
  maxBurst?: number;
}

export interface RateLimitState {
  /** Current token count (refills over time) */
  tokens: number;
  /** Last refill timestamp */
  lastRefill: number;
  /** Total requests allowed */
  allowed: number;
  /** Total requests denied */
  denied: number;
}

export class RateLimiter {
  private tokens: number;
  private maxTokens: number;
  private tokensPerInterval: number;
  private intervalMs: number;
  private lastRefill: number;
  private allowed: number = 0;
  private denied: number = 0;
  private name: string;

  constructor(name: string, config: RateLimiterConfig) {
    this.name = name;
    this.tokensPerInterval = config.tokensPerInterval;
    this.intervalMs = config.intervalMs;
    this.maxTokens = config.maxBurst ?? config.tokensPerInterval;
    this.tokens = this.maxTokens;
    this.lastRefill = Date.now();
  }

  /**
   * Refill tokens based on elapsed time.
   */
  private refill(): void {
    const now = Date.now();
    const elapsed = now - this.lastRefill;
    if (elapsed >= this.intervalMs) {
      const refillCount = Math.floor(elapsed / this.intervalMs) * this.tokensPerInterval;
      this.tokens = Math.min(this.maxTokens, this.tokens + refillCount);
      this.lastRefill = now;
    }
  }

  /**
   * Try to consume 1 token. Returns true if allowed.
   */
  tryConsume(count: number = 1): boolean {
    this.refill();
    if (this.tokens >= count) {
      this.tokens -= count;
      this.allowed++;
      return true;
    }
    this.denied++;
    return false;
  }

  /**
   * Wait until token available, then consume.
   * Returns wait time in ms (0 = immediate).
   */
  async consume(count: number = 1): Promise<number> {
    this.refill();
    if (this.tokens >= count) {
      this.tokens -= count;
      this.allowed++;
      return 0;
    }

    // Calculate wait time
    const deficit = count - this.tokens;
    const refillsNeeded = Math.ceil(deficit / this.tokensPerInterval);
    const waitMs = refillsNeeded * this.intervalMs;
    // Partial refill after wait
    const startWait = Date.now();
    await new Promise(resolve => setTimeout(resolve, Math.min(waitMs, 10_000)));
    this.refill();
    // Consume whatever is available after wait (may still be denied if burst exhausted)
    if (this.tokens >= count) {
      this.tokens -= count;
      this.allowed++;
      return Date.now() - startWait;
    }
    this.denied++;
    return -1; // timed out waiting
  }

  /**
   * Get current state.
   */
  getState(): RateLimitState {
    this.refill();
    return {
      tokens: this.tokens,
      lastRefill: this.lastRefill,
      allowed: this.allowed,
      denied: this.denied,
    };
  }

  /**
   * Reset counters.
   */
  reset(): void {
    this.tokens = this.maxTokens;
    this.lastRefill = Date.now();
    this.allowed = 0;
    this.denied = 0;
  }

  /**
   * Update config at runtime.
   */
  setConfig(config: Partial<RateLimiterConfig>): void {
    // Refill before recalculating so accumulated time isn't lost
    this.refill();
    if (config.tokensPerInterval !== undefined) {
      this.tokensPerInterval = config.tokensPerInterval;
    }
    if (config.intervalMs !== undefined) {
      this.intervalMs = config.intervalMs;
    }
    if (config.maxBurst !== undefined) {
      this.maxTokens = config.maxBurst;
    }
    // Recalculate current tokens relative to new max
    this.tokens = Math.min(this.tokens, this.maxTokens);
  }
}

/**
 * Create a composite rate limiter group.
 * Eg: 10 req/min + 100k tokens/min
 */
export class RateLimiterGroup {
  private limiters: Map<string, RateLimiter> = new Map();

  add(name: string, config: RateLimiterConfig): RateLimiter {
    const limiter = new RateLimiter(name, config);
    this.limiters.set(name, limiter);
    return limiter;
  }

  get(name: string): RateLimiter | undefined {
    return this.limiters.get(name);
  }

  /**
   * Try all limiters — returns true only if ALL allow.
   */
  tryAll(count: number = 1): boolean {
    for (const limiter of this.limiters.values()) {
      if (!limiter.tryConsume(count)) return false;
    }
    return true;
  }

  /**
   * Get state for all limiters.
   */
  getAllStates(): Record<string, RateLimitState> {
    const states: Record<string, RateLimitState> = {};
    for (const [name, limiter] of this.limiters) {
      states[name] = limiter.getState();
    }
    return states;
  }

  /**
   * Reset all.
   */
  resetAll(): void {
    for (const limiter of this.limiters.values()) {
      limiter.reset();
    }
  }
}

export default RateLimiter;

/**
 * Per-User Rate Limiter — tracks separate limits per userId.
 * Auto-creates limiters for new users, cleans up stale ones.
 */
export class PerUserRateLimiter {
  private users: Map<string, RateLimiter> = new Map();
  private config: RateLimiterConfig;
  private maxUsers: number;
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  constructor(config: RateLimiterConfig, maxUsers = 100) {
    this.config = config;
    this.maxUsers = maxUsers;

    // Cleanup stale users every 5 minutes
    this.cleanupInterval = setInterval(() => this.cleanup(), 5 * 60_000);
  }

  /**
   * Try to consume 1 token for a specific user.
   * Returns true if allowed.
   */
  tryConsume(userId: string, count: number = 1): boolean {
    let limiter = this.users.get(userId);
    if (!limiter) {
      // Evict oldest if at capacity
      if (this.users.size >= this.maxUsers) {
        const oldest = this.users.keys().next().value;
        if (oldest) this.users.delete(oldest);
      }
      limiter = new RateLimiter(`user:${userId}`, this.config);
      this.users.set(userId, limiter);
    }
    return limiter.tryConsume(count);
  }

  /**
   * Get state for a specific user.
   */
  getState(userId: string): RateLimitState | undefined {
    return this.users.get(userId)?.getState();
  }

  /**
   * Get total denied count across all users.
   */
  getTotalDenied(): number {
    let total = 0;
    for (const limiter of this.users.values()) {
      total += limiter.getState().denied;
    }
    return total;
  }

  /**
   * Remove users with no recent activity.
   */
  private cleanup(): void {
    const now = Date.now();
    const staleThreshold = 10 * 60_000; // 10 minutes
    for (const [userId, limiter] of this.users) {
      const state = limiter.getState();
      if (now - state.lastRefill > staleThreshold) {
        this.users.delete(userId);
      }
    }
  }

  /**
   * Destroy cleanup interval.
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
}