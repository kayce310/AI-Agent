/**
 * Kato ResponseCache — LRU + TTL Cache for LLM Responses
 * Phase 8.3a — Performance Optimization
 *
 * Phase 2 Updates:
 * - Side-effect detection: bypass cache for mutating operations
 * - Persona-aware key: includes CLINE.md hash in key
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
  /** Hash of persona file (CLINE.md) for cache invalidation on persona change */
  personaHash?: string;
}

// ── Side-Effect Tool Patterns ──

/**
 * Tool patterns that mutate state — cache MUST be bypassed.
 * Any request that triggers these tools should not be cached.
 */
const SIDE_EFFECT_TOOL_PATTERNS = [
  'sandbox:execute',
  'filesystem:write',
  'filesystem:delete',
  'filesystem:create',
  'filesystem:move',
  'filesystem:copy',
  'system:exec',
  'system:spawn',
  'docker:run',
  'docker:exec',
  'database:write',
  'database:update',
  'database:delete',
  'config:update',
  'config:write',
  'state:write',
  'state:update',
];

/**
 * Check if a tool name matches any side-effect pattern.
 */
export function isSideEffectTool(toolName: string): boolean {
  for (const pattern of SIDE_EFFECT_TOOL_PATTERNS) {
    if (pattern.endsWith('*')) {
      const prefix = pattern.slice(0, -1);
      if (toolName.startsWith(prefix)) return true;
    } else if (pattern === toolName) {
      return true;
    }
  }
  return false;
}

/**
 * Check if any tool in a list has side effects.
 */
export function hasSideEffectTools(toolNames: string[]): boolean {
  return toolNames.some(isSideEffectTool);
}

// ── Simple Hash (DJB2) ──

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

  // Track tools called in current request for side-effect detection
  private toolsInCurrentRequest: string[] = [];

  constructor(config: ResponseCacheConfig = {}) {
    this.cache = new Map();
    this.maxSize = config.maxSize ?? 1000;
    this.defaultTTL = config.defaultTTL ?? 5 * 60 * 1000;
    this.trackStats = config.trackStats ?? true;

    // Periodic cleanup every 60s
    setInterval(() => this.evictExpired(), 60_000).unref();
  }

  /**
   * Start tracking a new request for side-effect detection.
   * Call this at the beginning of each request.
   */
  beginRequest(): void {
    this.toolsInCurrentRequest = [];
  }

  /**
   * Record a tool call during the request.
   */
  recordToolCall(toolName: string): void {
    this.toolsInCurrentRequest.push(toolName);
  }

  /**
   * Check if current request has side effects.
   */
  hasSideEffects(): boolean {
    return hasSideEffectTools(this.toolsInCurrentRequest);
  }

  /**
   * Build a cache key from components.
   * Now includes persona hash for cache invalidation on persona change.
   */
  static buildKey(
    modelId: string,
    sessionId: string,
    prompt: string,
    personaHash?: string
  ): string {
    const hash = simpleHash(prompt);
    const personaPart = personaHash ? `::${personaHash}` : '';
    return `${modelId}::${sessionId}::${hash}${personaPart}`;
  }

  /**
   * Build a cache key from object.
   */
  static buildKeyFromObject(key: CacheKey): string {
    const personaPart = key.personaHash ? `::${key.personaHash}` : '';
    return `${key.modelId}::${key.sessionId}::${key.promptHash}${personaPart}`;
  }

  /**
   * Get a value from cache.
   * Returns undefined if not found, expired, or if side effects detected.
   */
  get(key: string): T | undefined {
    // BYPASS: if current request has side effects, don't read from cache
    if (this.hasSideEffects()) {
      if (this.trackStats) this.misses++;
      return undefined;
    }

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
   * BYPASS: if current request has side effects, don't write to cache.
   */
  set(key: string, value: T, ttl?: number): void {
    // BYPASS: if current request has side effects, don't cache
    if (this.hasSideEffects()) {
      return;
    }

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

  private evictLRU(): void {
    const oldestKey = this.cache.keys().next().value;
    if (oldestKey) {
      this.cache.delete(oldestKey);
      if (this.trackStats) this.evictions++;
    }
  }

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

export function createDefaultCache(config?: ResponseCacheConfig): ResponseCache<string> {
  return new ResponseCache<string>(config);
}

export default {
  ResponseCache,
  createDefaultCache,
  isSideEffectTool,
  hasSideEffectTools,
};
