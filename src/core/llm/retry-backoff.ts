/**
 * @file Retry utilities with exponential backoff and jitter
 * @layer core
 * @depends-on nothing (standalone utility)
 * @imported-by src/core/llm/model-adapter.ts
 * @owner core-llm
 *
 * Provides exponential backoff with jitter for retrying transient errors.
 * Used by ModelRouter fallback chain to avoid thundering herd when provider
 * is recovering from rate limit or temporary outage.
 */

import { Logger } from '../logger.js';

const log = new Logger({ module: 'RetryBackoff' });

export interface RetryConfig {
  /**
   * Initial delay in milliseconds before first retry.
   * Default: 100ms.
   */
  initialDelayMs: number;

  /**
   * Maximum delay between retries in milliseconds.
   * Default: 5000ms (5 seconds).
   */
  maxDelayMs: number;

  /**
   * Exponential backoff multiplier (e.g., 2 = double each retry).
   * Default: 2.
   */
  backoffMultiplier: number;

  /**
   * Jitter factor (0-1). Multiplies delay by random value in [1-jitter, 1+jitter].
   * Default: 0.1 (±10% randomness).
   * ponytail: Prevents synchronized retries from multiple agents (thundering herd).
   */
  jitterFactor: number;

  /**
   * Maximum number of retry attempts (not including initial try).
   * Default: 3 (total 4 attempts).
   */
  maxAttempts: number;
}

const DEFAULT_CONFIG: RetryConfig = {
  initialDelayMs: 100,
  maxDelayMs: 5000,
  backoffMultiplier: 2,
  jitterFactor: 0.1,
  maxAttempts: 3,
};

/**
 * Determine if an error is transient and should be retried.
 * Transient errors: timeout, connection reset, service unavailable (5xx), rate limit (429).
 * Permanent errors: auth (401), forbidden (403), not found (404), bad request (400).
 */
export function isTransientError(error: any): boolean {
  const msg = String(error?.message || '');

  // Status codes that are transient
  if (msg.includes('429') || msg.includes('rate limit')) return true;
  if (msg.includes('503') || msg.includes('service unavailable')) return true;
  if (msg.includes('502') || msg.includes('bad gateway')) return true;
  if (msg.includes('504') || msg.includes('gateway timeout')) return true;
  if (msg.includes('408') || msg.includes('request timeout')) return true;
  if (msg.includes('timeout') || msg.includes('ETIMEDOUT')) return true;
  if (msg.includes('ECONNRESET') || msg.includes('connection reset')) return true;
  if (msg.includes('ECONNREFUSED') || msg.includes('connection refused')) return true;
  if (msg.includes('EHOSTUNREACH') || msg.includes('host unreachable')) return true;

  // Permanent errors that should NOT retry
  if (msg.includes('401') || msg.includes('unauthorized')) return false;
  if (msg.includes('403') || msg.includes('forbidden')) return false;
  if (msg.includes('404') || msg.includes('not found')) return false;
  if (msg.includes('400') || msg.includes('bad request')) return false;

  // Unknown errors: don't retry (safer than retrying everything)
  return false;
}

/**
 * Calculate delay for a retry attempt with exponential backoff and jitter.
 *
 * @param attemptIndex 0-based index of retry (0 = first retry after initial failure)
 * @param config Retry configuration
 * @returns Delay in milliseconds
 */
export function calculateBackoffDelay(
  attemptIndex: number,
  config: Partial<RetryConfig> = {}
): number {
  const cfg = { ...DEFAULT_CONFIG, ...config };

  // Exponential: initialDelay * (multiplier ^ attemptIndex)
  const exponentialDelay = cfg.initialDelayMs * Math.pow(cfg.backoffMultiplier, attemptIndex);

  // Cap at max
  const cappedDelay = Math.min(exponentialDelay, cfg.maxDelayMs);

  // Add jitter: multiply by random value in [1 - jitterFactor, 1 + jitterFactor]
  const jitterRange = cappedDelay * cfg.jitterFactor;
  const jitterMin = cappedDelay - jitterRange;
  const jitterMax = cappedDelay + jitterRange;
  const finalDelay = Math.random() * (jitterMax - jitterMin) + jitterMin;

  return Math.round(finalDelay);
}

/**
 * Sleep for a given number of milliseconds.
 * Used for implementing backoff delays in retries.
 */
export async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry a function with exponential backoff.
 * Useful for wrapping adapter.invoke() calls to retry on transient errors.
 *
 * Usage:
 *   const result = await retryWithBackoff(
 *     () => adapter.invoke(messages, options),
 *     { maxAttempts: 3, initialDelayMs: 100 }
 *   );
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  config?: Partial<RetryConfig>
): Promise<T> {
  const cfg = { ...DEFAULT_CONFIG, ...config };

  let lastError: Error | null = null;

  // Initial attempt (not counted as retry)
  try {
    return await fn();
  } catch (err) {
    lastError = err as Error;
    if (!isTransientError(err)) {
      // Permanent error, don't retry
      throw err;
    }
  }

  // Retry attempts
  for (let attempt = 0; attempt < cfg.maxAttempts; attempt++) {
    const delay = calculateBackoffDelay(attempt, cfg);
    log.info(
      `[RETRY] Transient error, retrying in ${delay}ms (attempt ${attempt + 1}/${cfg.maxAttempts}): ${lastError?.message}`
    );
    await sleep(delay);

    try {
      return await fn();
    } catch (err) {
      lastError = err as Error;
      if (!isTransientError(err)) {
        // Permanent error on retry, give up
        throw err;
      }
    }
  }

  // All retries exhausted
  log.warn(
    `[RETRY] Max retries (${cfg.maxAttempts}) exhausted, giving up: ${lastError?.message}`
  );
  throw lastError;
}
