/**
 * @file Tests for retry-backoff utilities
 * Verifies: transient error detection, backoff calculation, jitter, retry logic
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  isTransientError,
  calculateBackoffDelay,
  sleep,
  retryWithBackoff,
} from '../src/core/llm/retry-backoff.js';

describe('Retry Backoff', () => {
  describe('isTransientError', () => {
    it('should identify HTTP 429 (rate limit) as transient', () => {
      const err = new Error('HTTP 429: rate limit exceeded');
      expect(isTransientError(err)).toBe(true);
    });

    it('should identify timeout as transient', () => {
      const err = new Error('Request timeout after 5000ms');
      expect(isTransientError(err)).toBe(true);
    });

    it('should identify 503 (service unavailable) as transient', () => {
      const err = new Error('HTTP 503: Service Unavailable');
      expect(isTransientError(err)).toBe(true);
    });

    it('should identify connection reset as transient', () => {
      const err = new Error('ECONNRESET: connection reset by peer');
      expect(isTransientError(err)).toBe(true);
    });

    it('should identify 401 (unauthorized) as permanent', () => {
      const err = new Error('HTTP 401: Unauthorized');
      expect(isTransientError(err)).toBe(false);
    });

    it('should identify 403 (forbidden) as permanent', () => {
      const err = new Error('HTTP 403: Forbidden');
      expect(isTransientError(err)).toBe(false);
    });

    it('should identify 404 (not found) as permanent', () => {
      const err = new Error('HTTP 404: Not Found');
      expect(isTransientError(err)).toBe(false);
    });

    it('should identify 400 (bad request) as permanent', () => {
      const err = new Error('HTTP 400: Bad Request');
      expect(isTransientError(err)).toBe(false);
    });

    it('should treat unknown errors as permanent (safe default)', () => {
      const err = new Error('Some random error');
      expect(isTransientError(err)).toBe(false);
    });
  });

  describe('calculateBackoffDelay', () => {
    it('should calculate exponential backoff: attempt 0 = ~100ms', () => {
      const delay = calculateBackoffDelay(0, { initialDelayMs: 100, backoffMultiplier: 2, jitterFactor: 0 });
      expect(delay).toBe(100);
    });

    it('should calculate exponential backoff: attempt 1 = ~200ms', () => {
      const delay = calculateBackoffDelay(1, { initialDelayMs: 100, backoffMultiplier: 2, jitterFactor: 0 });
      expect(delay).toBe(200);
    });

    it('should calculate exponential backoff: attempt 2 = ~400ms', () => {
      const delay = calculateBackoffDelay(2, { initialDelayMs: 100, backoffMultiplier: 2, jitterFactor: 0 });
      expect(delay).toBe(400);
    });

    it('should cap delay at maxDelayMs', () => {
      const delay = calculateBackoffDelay(10, {
        initialDelayMs: 100,
        backoffMultiplier: 2,
        maxDelayMs: 5000,
        jitterFactor: 0,
      });
      expect(delay).toBeLessThanOrEqual(5000);
    });

    it('should apply jitter (±10% by default)', () => {
      const delays = Array.from({ length: 10 }, (_, i) => 
        calculateBackoffDelay(0, { initialDelayMs: 100, jitterFactor: 0.1 })
      );

      // All should be within ±10% of 100ms (90-110)
      delays.forEach((d) => {
        expect(d).toBeGreaterThanOrEqual(90);
        expect(d).toBeLessThanOrEqual(110);
      });

      // Should have variance (not all identical)
      const unique = new Set(delays).size;
      expect(unique).toBeGreaterThan(1);
    });

    it('should return consistent results without jitter', () => {
      const delay1 = calculateBackoffDelay(1, { initialDelayMs: 100, backoffMultiplier: 2, jitterFactor: 0 });
      const delay2 = calculateBackoffDelay(1, { initialDelayMs: 100, backoffMultiplier: 2, jitterFactor: 0 });
      expect(delay1).toBe(delay2);
    });
  });

  describe('sleep', () => {
    it('should delay execution', async () => {
      const start = Date.now();
      await sleep(50);
      const elapsed = Date.now() - start;
      
      expect(elapsed).toBeGreaterThanOrEqual(40); // Allow ±10ms variance
      expect(elapsed).toBeLessThan(200); // But not too long
    });
  });

  describe('retryWithBackoff', () => {
    it('should succeed on first try without retry', async () => {
      let attempts = 0;
      const fn = async () => {
        attempts++;
        return 'success';
      };

      const result = await retryWithBackoff(fn);
      
      expect(result).toBe('success');
      expect(attempts).toBe(1);
    });

    it('should retry on transient error', async () => {
      let attempts = 0;
      const fn = async () => {
        attempts++;
        if (attempts < 2) {
          throw new Error('HTTP 503: Service Unavailable');
        }
        return 'success';
      };

      const result = await retryWithBackoff(fn, { maxAttempts: 3, initialDelayMs: 10, maxDelayMs: 50 });
      
      expect(result).toBe('success');
      expect(attempts).toBe(2); // Failed once, succeeded on retry
    });

    it('should not retry permanent errors', async () => {
      let attempts = 0;
      const fn = async () => {
        attempts++;
        throw new Error('HTTP 401: Unauthorized');
      };

      await expect(retryWithBackoff(fn, { maxAttempts: 3 })).rejects.toThrow('Unauthorized');
      expect(attempts).toBe(1); // No retry for permanent errors
    });

    it('should exhaust max retries and fail', async () => {
      let attempts = 0;
      const fn = async () => {
        attempts++;
        throw new Error('HTTP 503: Service Unavailable');
      };

      await expect(retryWithBackoff(fn, { maxAttempts: 2, initialDelayMs: 10 })).rejects.toThrow('Service Unavailable');
      expect(attempts).toBe(3); // Initial + 2 retries
    });

    it('should apply backoff delay between retries', async () => {
      let attempts = 0;
      const timestamps: number[] = [];
      
      const fn = async () => {
        attempts++;
        timestamps.push(Date.now());
        if (attempts < 2) {
          throw new Error('HTTP 503: Service Unavailable');
        }
        return 'success';
      };

      await retryWithBackoff(fn, { maxAttempts: 2, initialDelayMs: 100, jitterFactor: 0 });
      
      // Check delay between attempts
      const delay = timestamps[1] - timestamps[0];
      expect(delay).toBeGreaterThanOrEqual(90); // ~100ms with tolerance
    });

    it('should respect maxAttempts configuration', async () => {
      let attempts = 0;
      const fn = async () => {
        attempts++;
        throw new Error('HTTP 503: Service Unavailable');
      };

      await expect(retryWithBackoff(fn, { maxAttempts: 1, initialDelayMs: 5 })).rejects.toThrow();
      expect(attempts).toBe(2); // Initial + 1 retry
    });

    it('should succeed after multiple retries', async () => {
      let attempts = 0;
      const fn = async () => {
        attempts++;
        if (attempts < 3) {
          throw new Error('HTTP 503: Service Unavailable');
        }
        return 'success';
      };

      const result = await retryWithBackoff(fn, { maxAttempts: 3, initialDelayMs: 10 });
      
      expect(result).toBe('success');
      expect(attempts).toBe(3);
    });

    it('should work with custom config', async () => {
      let attempts = 0;
      const fn = async () => {
        attempts++;
        if (attempts < 2) {
          throw new Error('HTTP 429: rate limit');
        }
        return 'success';
      };

      const result = await retryWithBackoff(fn, {
        maxAttempts: 5,
        initialDelayMs: 50,
        maxDelayMs: 1000,
        backoffMultiplier: 3,
        jitterFactor: 0.2,
      });

      expect(result).toBe('success');
      expect(attempts).toBe(2);
    });
  });
});
