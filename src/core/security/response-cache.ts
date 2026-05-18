/**
 * Kato ResponseCache — LRU + TTL Cache for LLM Responses
 * Phase 8.3a — Performance Optimization
 *
 * Provides:
 * - LRU eviction (least recently used)
 * - TTL-based expiry (time-to-live per entry)
 * - Configurable max size
 * - Stats tracking (hits, misses, evictions)
 */

// ── Types ──

export interface CacheEntry<T = string> {
  value: T;
  expiresAt: number;
  createdAt: number;
  lastAccessedAt: number;
  accessCount: number;
}

export interface ResponseCacheConfig {
  /** Max number of entries in cache */
  maxSize?: number;
  /** Default TTL in milliseconds (default: 5 minutes) */
  defaultTTL?: number;
  /** Enable stats tracking */
  trackStats?: boolean;
}

export interface CacheStats {
  size: number;
  hits: number;
  misses: number;
  evictions: number;
  hitRate: number;
  oldestEntryAge: number;
  newestEntryAge: number;
}

export interface CacheKey {
  modelId: string;
  sessionId: string;
  /** SHA-256 hash of the prompt */
  promptHash: string;
}

// ── Simple SHA-256 Hash (pure JS fallback) ──

/**
 * Simple string hash (not cryptographic, just for cache key).
 * Uses DJB2 algorithm for speed.
 */
function simpleHash(input: string): string {
  let hash = 5381;
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) + hash + input.charCodeAt(i)) & 0xffffffff;
  }
  return Math.abs(hash).toString(36);
}

// ── ResponseCache ──

export class ResponseCache<T = string> {
  private cache: Map<string, CacheEntry<T>>;
  private maxSize: number;
  private defaultTTL: number;
  private trackStats: boolean;

  // Stats
  private hits = 0;
  private misses = 0;
  private evictions = 0;

  constructor(config: ResponseCacheConfig = {}) {
    this.cache = new Map();
    this.maxSize = config.maxSize ?? 1000;
    this.defaultTTL = config.defaultTTL ?? 5 * 60 * 1000; // 5 minutes
    this.trackStats = config.trackStats ?? true;

    // Periodic cleanup every 60s
    setInterval(() => this.evictExpired(), 60_000).unref();
  }

  /**
   * Build a cache key from components.
   */
  static buildKey(modelId: string, sessionId: string, prompt: string): string {
    const hash = simpleHash(prompt);
    return `${modelId}::${sessionId}::${hash}`;
  }

  /**
   * Build a cache key from object.
   */
  static buildKeyFromObject(key: CacheKey): string {
    return `${key.modelId}::${key.sessionId}::${key.promptHash}`;
  }

  /**
   * Get a value from cache.
   * Returns undefined if not found or expired.
   */
  get(key: string): T | undefined {
    const entry = this.cache.get(key);

    if (!entry) {
      if (this.trackStats) this.misses++;
      return undefined;
    }

    // Check expiry
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      if (this.trackStats) {
        this.misses++;
        this.evictions++;
      }
      return undefined;
    }

    // Update access metadata
    entry.lastAccessedAt = Date.now();
    entry.accessCount++;

    // Move to end (most recently used)
    this.cache.delete(key);
    this.cache.set(key, entry);

    if (this.trackStats) this.hits++;
    return entry.value;
  }

  /**
   * Set a value in cache.
   */
  set(key: string, value: T, ttl?: number): void {
    const now = Date.now();
    const expiresAt = now + (ttl ?? this.defaultTTL);

    const entry: CacheEntry<T> = {
      value,
      expiresAt,
      createdAt: now,
      lastAccessedAt: now,
      accessCount: 0,
    };

    // If key exists, delete first to update order
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }

    // Evict if at capacity
    while (this.cache.size >= this.maxSize) {
      this.evictLRU();
    }

    this.cache.set(key, entry);
  }

  /**
   * Check if key exists and is not expired.
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      if (this.trackStats) this.evictions++;
      return false;
    }
    return true;
  }

  /**
   * Delete a specific key.
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear all entries.
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get current cache size.
   */
  get size(): number {
    return this.cache.size;
  }

  /**
   * Get cache statistics.
   */
  getStats(): CacheStats {
    const now = Date.now();
    let oldestAge = 0;
    let newestAge = Infinity;

    if (this.cache.size > 0) {
      for (const entry of this.cache.values()) {
        const age = now - entry.createdAt;
        if (age > oldestAge) oldestAge = age;
        if (age < newestAge) newestAge = age;
      }
    } else {
      oldestAge = 0;
      newestAge = 0;
    }

    const totalRequests = this.hits + this.misses;
    const hitRate = totalRequests > 0 ? this.hits / totalRequests : 1;

    return {
      size: this.cache.size,
      hits: this.hits,
      misses: this.misses,
      evictions: this.evictions,
      hitRate,
      oldestEntryAge: oldestAge,
      newestEntryAge: newestAge === Infinity ? 0 : newestAge,
    };
  }

  /**
   * Reset all statistics.
   */
  resetStats(): void {
    this.hits = 0;
    this.misses = 0;
    this.evictions = 0;
  }

  // ── Private Helpers ──

  /**
   * Evict the least recently used entry (first item in Map).
   */
  private evictLRU(): void {
    const oldestKey = this.cache.keys().next().value;
    if (oldestKey) {
      this.cache.delete(oldestKey);
      if (this.trackStats) this.evictions++;
    }
  }

  /**
   * Remove all expired entries.
   */
  private evictExpired(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        if (this.trackStats) this.evictions++;
      }
    }
  }
}

// ── Convenience Factory ──

/**
 * Create a default ResponseCache for string values.
 */
export function createDefaultCache(config?: ResponseCacheConfig): ResponseCache<string> {
  return new ResponseCache<string>(config);
}

export default {
  ResponseCache,
  createDefaultCache,
};