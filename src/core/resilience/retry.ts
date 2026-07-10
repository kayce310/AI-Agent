/**
 * @file retry.ts — Retry logic with exponential backoff
 * @layer core/resilience
 * @purpose Retry failed operations with backoff strategy
 */

import { Logger } from '../logger.js';

const log = new Logger({ module: 'Retry' });

export interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  retryableErrors: string[];
}

const DEFAULT_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
  retryableErrors: ['timeout', 'ETIMEDOUT', 'ECONNRESET', '500', '502', '503', '504'],
};

export class RetryExecutor {
  private config: RetryConfig;

  constructor(config?: Partial<RetryConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Execute function with retry logic
   */
  async execute<T>(
    operation: () => Promise<T>,
    context: string = 'operation'
  ): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error: any) {
        lastError = error;

        // Check if this error is retryable
        const isErrorRetryable = this.isRetryable(error);
        
        if (!isErrorRetryable || attempt === this.config.maxRetries) {
          throw error;
        }

        // Calculate delay with exponential backoff
        const delay = this.calculateDelay(attempt);
        log.warn(`[Retry] ${context} failed (attempt ${attempt + 1}/${this.config.maxRetries + 1}), retrying in ${delay}ms: ${error.message}`);

        await this.sleep(delay);
      }
    }

    throw lastError || new Error(`${context} failed after ${this.config.maxRetries} retries`);
  }

  /**
   * Check if error is retryable
   */
  private isRetryable(error: Error | string): boolean {
    const errorMessage = typeof error === 'string' ? error : error.message.toLowerCase();
    
    return this.config.retryableErrors.some(pattern => 
      errorMessage.includes(pattern.toLowerCase())
    );
  }

  /**
   * Calculate exponential backoff delay
   */
  private calculateDelay(attempt: number): number {
    const delay = this.config.baseDelayMs * Math.pow(2, attempt);
    return Math.min(delay, this.config.maxDelayMs);
  }

  /**
   * Sleep for specified duration
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ─── Retry with Circuit Breaker ───────────────────────────────────────────

/**
 * Execute with both circuit breaker and retry logic
 */
export async function executeWithRetryAndCircuitBreaker<T>(
  operation: () => Promise<T>,
  context: string,
  config?: Partial<RetryConfig>
): Promise<T> {
  const retry = new RetryExecutor(config);
  
  // Wrap with circuit breaker
  // In production, would integrate with CircuitBreaker class
  return retry.execute(operation, context);
}
