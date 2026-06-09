/**
 * @file output-guard â€” Security module
 * @layer core
 * @depends-on (none â€” standalone)
 * @imported-by src/core/engine/engine.ts
 * @owner core-security
 */

/**
 * Kato OutputGuard â€” Response Validation & Sanitization
 * Phase 8.2b â€” Output Security
 *
 * Validates LLM output before returning to caller:
 * - PII/secret leakage detection
 * - Content policy compliance
 * - Format validation
 * - Sanitization (strip dangerous content)
 */

import type { SecuritySeverity } from '../types.js';

// â”€â”€ Types â”€â”€

export type OutputCheckSeverity = 'error' | 'warn' | 'info';

export interface OutputCheckResult {
  name: string;
  severity: OutputCheckSeverity;
  passed: boolean;
  message: string;
  /** If sanitizable, the sanitized position range */
  sanitizeRange?: { start: number; end: number };
}

export interface OutputValidationReport {
  passed: boolean;
  checks: OutputCheckResult[];
  sanitized?: string;
}

export interface OutputGuardConfig {
  /** Enable PII leak detection */
  piiDetection?: boolean;
  /** Enable API key leak detection */
  apiKeyDetection?: boolean;
  /** Enable dangerous HTML/script detection */
  dangerousContentDetection?: boolean;
  /** Custom patterns as regex strings */
  customPatterns?: Array<{ name: string; pattern: RegExp; severity: OutputCheckSeverity }>;
  /** Whether to auto-sanitize (strip) flagged content */
  autoSanitize?: boolean;
}

// â”€â”€ Patterns â”€â”€

const API_KEY_PATTERN = /(?:sk|pk|api[_-]?key|secret|token)[\s_-]?(?:=|:)\s*['"]?[a-zA-Z0-9_-]{20,}|(?:sk|pk)-[a-zA-Z0-9_-]{20,}/gi;
const BEARER_PATTERN = /bearer\s+[a-zA-Z0-9._-]{20,}/gi;
const EMAIL_PATTERN = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const IP_PATTERN = /\b(?:\d{1,3}\.){3}\d{1,3}\b/g;
const SCRIPT_PATTERN = /<script[\s>]/gi;
const PROCESS_ENV_PATTERN = /process\.env\.[a-zA-Z_][a-zA-Z0-9_]*/g;

// â”€â”€ OutputGuard â”€â”€

export class OutputGuard {
  private config: Required<OutputGuardConfig>;
  private customChecks: Array<{ name: string; check: (output: string) => OutputCheckResult | null }>;

  constructor(config: OutputGuardConfig = {}) {
    this.config = {
      piiDetection: config.piiDetection ?? true,
      apiKeyDetection: config.apiKeyDetection ?? true,
      dangerousContentDetection: config.dangerousContentDetection ?? true,
      customPatterns: config.customPatterns ?? [],
      autoSanitize: config.autoSanitize ?? false,
    };
    this.customChecks = [];
  }

  /**
   * Add a custom output check function.
   */
  addCheck(name: string, check: (output: string) => OutputCheckResult | null): void {
    this.customChecks.push({ name, check });
  }

  /**
   * Validate LLM output.
   */
  validate(output: string): OutputValidationReport {
    const checks: OutputCheckResult[] = [];
    const sanitizeRanges: Array<{ start: number; end: number }> = [];

    this.detectPII(output, checks, sanitizeRanges);
    this.detectAPIKeys(output, checks, sanitizeRanges);
    this.detectDangerousContent(output, checks, sanitizeRanges);
    this.runCustomPatterns(output, checks, sanitizeRanges);
    this.runCustomChecks(output, checks, sanitizeRanges);

    // â”€â”€ Sanitization â”€â”€
    let sanitized: string | undefined;
    if (this.config.autoSanitize && sanitizeRanges.length > 0) {
      sanitized = this.sanitize(output, sanitizeRanges);
    }

    const passed = checks.filter((c) => c.severity === 'error').length === 0;

    return { passed, checks, sanitized };
  }

  private detectPII(output: string, checks: OutputCheckResult[], ranges: Array<{ start: number; end: number }>): void {
    if (!this.config.piiDetection) return;

    const emailRegex = new RegExp(EMAIL_PATTERN.source, 'g');
    let m: RegExpExecArray | null;
    while ((m = emailRegex.exec(output)) !== null) {
      if (m[0].endsWith('.example.com') || m[0].endsWith('.test')) continue;
      checks.push({
        name: 'pii-email',
        severity: 'warn',
        passed: false,
        message: `Possible email address detected: ${maskString(m[0])}`,
        sanitizeRange: { start: m.index, end: m.index + m[0].length },
      });
      ranges.push({ start: m.index, end: m.index + m[0].length });
      break;
    }

    const ipRegex = new RegExp(IP_PATTERN.source, 'g');
    while ((m = ipRegex.exec(output)) !== null) {
      if (m[0] === '0.0.0.0' || m[0].startsWith('127.')) continue;
      checks.push({
        name: 'pii-ip',
        severity: 'warn',
        passed: false,
        message: `Possible IP address detected: ${m[0]}`,
        sanitizeRange: { start: m.index, end: m.index + m[0].length },
      });
      ranges.push({ start: m.index, end: m.index + m[0].length });
      break;
    }
  }

  private detectAPIKeys(output: string, checks: OutputCheckResult[], ranges: Array<{ start: number; end: number }>): void {
    if (!this.config.apiKeyDetection) return;

    let m: RegExpExecArray | null;
    const apiRegex = new RegExp(API_KEY_PATTERN.source, 'gi');
    while ((m = apiRegex.exec(output)) !== null) {
      checks.push({
        name: 'api-key-leak',
        severity: 'error',
        passed: false,
        message: 'Possible API key or secret leaked in output',
        sanitizeRange: { start: m.index, end: m.index + m[0].length },
      });
      ranges.push({ start: m.index, end: m.index + m[0].length });
      break;
    }

    const bearerRegex = new RegExp(BEARER_PATTERN.source, 'gi');
    while ((m = bearerRegex.exec(output)) !== null) {
      checks.push({
        name: 'bearer-token-leak',
        severity: 'error',
        passed: false,
        message: 'Bearer token leaked in output',
        sanitizeRange: { start: m.index, end: m.index + m[0].length },
      });
      ranges.push({ start: m.index, end: m.index + m[0].length });
      break;
    }
  }

  private detectDangerousContent(output: string, checks: OutputCheckResult[], ranges: Array<{ start: number; end: number }>): void {
    if (!this.config.dangerousContentDetection) return;

    let m: RegExpExecArray | null;
    const scriptRegex = new RegExp(SCRIPT_PATTERN.source, 'gi');
    while ((m = scriptRegex.exec(output)) !== null) {
      checks.push({
        name: 'dangerous-html',
        severity: 'error',
        passed: false,
        message: 'Dangerous HTML/script tag detected in output',
        sanitizeRange: { start: m.index, end: m.index + m[0].length },
      });
      ranges.push({ start: m.index, end: m.index + m[0].length });
      break;
    }

    const procRegex = new RegExp(PROCESS_ENV_PATTERN.source, 'g');
    while ((m = procRegex.exec(output)) !== null) {
      checks.push({
        name: 'process-env-leak',
        severity: 'error',
        passed: false,
        message: `Environment variable reference leaked: ${m[0]}`,
        sanitizeRange: { start: m.index, end: m.index + m[0].length },
      });
      ranges.push({ start: m.index, end: m.index + m[0].length });
      break;
    }
  }

  private runCustomPatterns(output: string, checks: OutputCheckResult[], ranges: Array<{ start: number; end: number }>): void {
    for (const cp of this.config.customPatterns) {
      const flags = cp.pattern.flags.includes('g') ? cp.pattern.flags : cp.pattern.flags + 'g';
      const regex = new RegExp(cp.pattern.source, flags);
      let m: RegExpExecArray | null;
      while ((m = regex.exec(output)) !== null) {
        checks.push({
          name: cp.name,
          severity: cp.severity,
          passed: false,
          message: `Custom check "${cp.name}" triggered`,
          sanitizeRange: { start: m.index, end: m.index + m[0].length },
        });
        ranges.push({ start: m.index, end: m.index + m[0].length });
        break;
      }
    }
  }

  private runCustomChecks(output: string, checks: OutputCheckResult[], ranges: Array<{ start: number; end: number }>): void {
    for (const c of this.customChecks) {
      const result = c.check(output);
      if (result) {
        checks.push(result);
        if (result.sanitizeRange) {
          ranges.push(result.sanitizeRange);
        }
      }
    }
  }

  /**
   * Sanitize output by removing/replacing flagged ranges.
   */
  sanitize(output: string, ranges: Array<{ start: number; end: number }>): string {
    const sorted = [...ranges].sort((a, b) => b.start - a.start);
    let result = output;
    for (const r of sorted) {
      result = result.substring(0, r.start) + '[REDACTED]' + result.substring(r.end);
    }
    return result;
  }

  /**
   * Attach to agent hooks.
   */
  attachToHooks(hooks: {
    on: (event: string, handler: (data: Record<string, unknown>) => Promise<void>) => () => void;
  }): () => void {
    return hooks.on('model:response', async (data: Record<string, unknown>) => {
      const output = typeof data.output === 'string' ? data.output : '';
      const report = this.validate(output);

      if (!report.passed) {
        const errors = report.checks.filter((c) => c.severity === 'error');
        for (const e of errors) {
          console.warn(`[OutputGuard] Blocked: ${e.rule} - ${e.message}`);
        }

        if (report.sanitized) {
          data.output = report.sanitized;
          console.log('[OutputGuard] Output sanitized');
        }
      }
    });
  }
}

// â”€â”€ Helpers â”€â”€

function maskString(s: string): string {
  if (s.length <= 4) return '****';
  return s.substring(0, 2) + '****' + s.substring(s.length - 2);
}

export default {
  OutputGuard,
};
