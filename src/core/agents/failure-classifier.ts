/**
 * @file failure-classifier — Agent module
 * @layer core
 * @depends-on src/core/types.ts, src/core/tools/tool-registry.ts
 * @imported-by src/core/engine/engine.ts
 * @owner core-agents
 */

/**
 * FailureClassifier — Classify and categorize execution failures
 * Phase 5.x: analyze errors → classify type → suggest recovery
 */

export type FailureCategory =
  | 'model_error'
  | 'tool_error'
  | 'timeout'
  | 'rate_limit'
  | 'permission_denied'
  | 'invalid_input'
  | 'unknown';

export interface ClassifiedFailure {
  category: FailureCategory;
  originalError: string;
  recoverable: boolean;
  suggestedAction?: string;
}

const RECOVERABLE_CATEGORIES: Set<FailureCategory> = new Set([
  'timeout',
  'rate_limit',
  'tool_error',
]);

export class FailureClassifier {
  /**
   * Classify an error into a failure category.
   */
  classify(error: Error | string): ClassifiedFailure {
    const message = typeof error === 'string' ? error : error.message;
    const lower = message.toLowerCase();

    let category: FailureCategory = 'unknown';

    if (lower.includes('rate limit') || lower.includes('too many requests') || lower.includes('429')) {
      category = 'rate_limit';
    } else if (lower.includes('timeout') || lower.includes('timed out')) {
      category = 'timeout';
    } else if (lower.includes('permission') || lower.includes('forbidden') || lower.includes('denied') || lower.includes('403')) {
      category = 'permission_denied';
    } else if (lower.includes('model') || lower.includes('provider') || lower.includes('api key')) {
      category = 'model_error';
    } else if (lower.includes('tool') || lower.includes('not found')) {
      category = 'tool_error';
    } else if (lower.includes('invalid') || lower.includes('bad request') || lower.includes('400')) {
      category = 'invalid_input';
    }

    return {
      category,
      originalError: message,
      recoverable: RECOVERABLE_CATEGORIES.has(category),
      suggestedAction: this.getSuggestion(category),
    };
  }

  private getSuggestion(category: FailureCategory): string | undefined {
    switch (category) {
      case 'rate_limit': return 'Retry with exponential backoff';
      case 'timeout': return 'Increase timeout or reduce request complexity';
      case 'model_error': return 'Check API key or fallback to alternative model';
      case 'tool_error': return 'Verify tool exists and arguments are correct';
      case 'permission_denied': return 'Request elevated privileges';
      case 'invalid_input': return 'Validate and sanitize input before retry';
    }
  }
}

export default FailureClassifier;