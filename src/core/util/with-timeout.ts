/**
 * @file withTimeout — Timeout wrapper for async operations
 * @layer core
 * @imported-by src/core/llm/model-adapter.ts, src/core/engine/engine.ts
 * @owner core-engine
 *
 * Coral Agent — Timeout utility
 * Wraps any promise with a timeout. Rejects if not resolved within ms.
 * Used to prevent LLM calls from hanging indefinitely.
 */

export class TimeoutError extends Error {
  constructor(ms: number) {
    super(`Operation timed out after ${ms}ms`);
    this.name = 'TimeoutError';
  }
}

/**
 * Wrap a promise with a timeout.
 * @param promise - The promise to wrap
 * @param ms - Timeout in milliseconds
 * @param signal - Optional AbortSignal to respect
 * @rejects TimeoutError if not resolved in time
 */
export function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  signal?: AbortSignal
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    // Already aborted → reject immediately
    if (signal?.aborted) {
      reject(new Error('Operation aborted'));
      return;
    }

    const timer = setTimeout(() => {
      reject(new TimeoutError(ms));
    }, ms);

    // Clean up if signal aborts during wait
    const onAbort = () => {
      clearTimeout(timer);
      reject(new Error('Operation aborted'));
    };
    signal?.addEventListener('abort', onAbort, { once: true });

    promise
      .then((result) => {
        clearTimeout(timer);
        signal?.removeEventListener('abort', onAbort);
        resolve(result);
      })
      .catch((err) => {
        clearTimeout(timer);
        signal?.removeEventListener('abort', onAbort);
        reject(err);
      });
  });
}

/**
 * Create an AbortController that auto-aborts after ms milliseconds.
 * Useful for fetch() calls that don't have native timeout.
 */
export function createTimeoutController(ms: number): { controller: AbortController; clear: () => void } {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  const clear = () => clearTimeout(timer);
  return { controller, clear };
}
