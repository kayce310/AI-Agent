/**
 * @file Error Classifier — Static mapping for tool execution errors
 * @layer core
 * @owner core-engine
 *
 * Classifies tool execution errors into categories for PlanItem.errorCategory.
 *
 * This is a static pattern-matching classifier (not LLM, not regex-guessing
 * user intent). Error messages from tool executions have fixed format — we
 * match against known patterns to decide retry/skip/abort behavior.
 *
 * Categories:
 *   transient  — timeout, network, rate-limit → retry tối đa 2 lần
 *   permanent  — not found, invalid, permission denied → skip_item tự động
 *   security   — risk-gate denied, path blocked → abort toàn bộ plan
 */

export type ErrorCategory = 'transient' | 'permanent' | 'security';

/**
 * Patterns that indicate TRANSIENT errors (retriable).
 */
const TRANSIENT_PATTERNS: RegExp[] = [
  /timeout/i,
  /timed?\s*out/i,
  /etimedout/i,
  /econnrefused/i,
  /network/i,
  /rate[-_]?limit/i,
  /too many requests/i,
  /429|503|502|504/i,
  /temporary/i,
  /retry/i,
  /eaddrinfo/i,
  /socket/i,
  /hang[ ]?up/i,
  /reset.*connection/i,
  /connection.*reset/i,
  /econnreset/i,
];

/**
 * Patterns that indicate PERMANENT errors (skip the item).
 */
const PERMANENT_PATTERNS: RegExp[] = [
  /not found/i,
  /not found/i,
  /enoent/i,
  /file.*not.*exist/i,
  /path.*not.*exist/i,
  /invalid/i,
  /permission denied/i,
  /eacces/i,
  /eperm/i,
  /bad request/i,
  /400|404|403|410/i,
  /unknown tool/i,
  /tool.*not found/i,
  /unsupported/i,
  /validation.*fail/i,
  /schema.*invalid/i,
  /argument.*invalid/i,
  /missing.*required/i,
  /cannot read property/i,
  /undefined.*is not/i,
  /null.*is not/i,
];

/**
 * Patterns that indicate SECURITY errors (abort entire plan).
 */
const SECURITY_PATTERNS: RegExp[] = [
  /blocked/i,
  /risk.gate.*denied/i,
  /security.*guard/i,
  /privilege.*denied/i,
  /tool.*blocked/i,
  /forbidden/i,
  /path.*blocked/i,
  /security.*violation/i,
  /injection.*detected/i,
  /malicious/i,
  /not allowed/i,
  /restricted.*mode/i,
];

/**
 * Classify an error message into an ErrorCategory.
 *
 * @param errorMessage - the error string from tool execution
 * @returns the classified ErrorCategory (defaults to 'permanent')
 */
export function classifyError(errorMessage: string): ErrorCategory {
  if (!errorMessage || typeof errorMessage !== 'string') return 'permanent';

  // Security takes highest priority
  for (const pattern of SECURITY_PATTERNS) {
    if (pattern.test(errorMessage)) return 'security';
  }

  // Transient (retriable)
  for (const pattern of TRANSIENT_PATTERNS) {
    if (pattern.test(errorMessage)) return 'transient';
  }

  // Permanent (default for unrecognized errors)
  for (const pattern of PERMANENT_PATTERNS) {
    if (pattern.test(errorMessage)) return 'permanent';
  }

  // Default: permanent (safe fallback — skip item rather than abort entire plan)
  return 'permanent';
}
