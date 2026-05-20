/**
 * Kato InputGuard — Configurable Prompt Injection Guard
 * Phase 8.2a — Input Security
 *
 * Wraps SecurityScanner with:
 * - Severity threshold (block/warn/log per level)
 * - Action configuration (block | warn | log)
 * - Hook integration (register as guard on agent hooks)
 */

import {
  SecurityScanner,
  SecurityBlockedError,
  createDefaultPatterns,
} from './security-scanner.js';
import type { SecurityPattern, SecuritySeverity } from '../types.js';

// ── Types ──

export type GuardAction = 'block' | 'warn' | 'log';

export interface GuardThreshold {
  severity: SecuritySeverity;
  action: GuardAction;
}

export interface InputGuardConfig {
  /** Default action when no threshold matches (stricter) */
  defaultAction?: GuardAction;
  /** Per-severity thresholds */
  thresholds?: GuardThreshold[];
  /** Custom patterns (appended to defaults) */
  patterns?: SecurityPattern[];
  /** Max input length before truncation */
  maxInputLength?: number;
}

export interface GuardResult {
  passed: boolean;
  action: GuardAction;
  findings: Array<{
    patternName: string;
    severity: SecuritySeverity;
    description: string;
    action: GuardAction;
  }>;
}

// ── Default Thresholds ──

const DEFAULT_THRESHOLDS: GuardThreshold[] = [
  { severity: 'critical', action: 'block' },
  { severity: 'high', action: 'block' },
  { severity: 'medium', action: 'warn' },
  { severity: 'low', action: 'log' },
];

// ── InputGuard ──

export class InputGuard {
  private scanner: SecurityScanner;
  private thresholds: Map<SecuritySeverity, GuardAction>;
  private defaultAction: GuardAction;

  constructor(config: InputGuardConfig = {}) {
    const patterns = config.patterns ?? createDefaultPatterns();
    this.scanner = new SecurityScanner({
      patterns,
      maxInputLength: config.maxInputLength,
    });

    this.thresholds = new Map();
    const thresholds = config.thresholds ?? DEFAULT_THRESHOLDS;
    for (const t of thresholds) {
      this.thresholds.set(t.severity, t.action);
    }

    this.defaultAction = config.defaultAction ?? 'block';
  }

  /**
   * Scan input and determine action based on severity thresholds.
   */
  check(input: string): GuardResult {
    const scanResult = this.scanner.scan(input);

    if (scanResult.passed) {
      return { passed: true, action: 'log', findings: [] };
    }

    const findings: GuardResult['findings'] = [];
    let worstAction: GuardAction = 'log';
    const actionRank: Record<GuardAction, number> = {
      block: 3,
      warn: 2,
      log: 1,
    };

    for (const f of scanResult.findings) {
      const action = this.thresholds.get(f.severity) ?? this.defaultAction;
      findings.push({
        patternName: f.patternName,
        severity: f.severity,
        description: f.description,
        action,
      });
      if (actionRank[action] > actionRank[worstAction]) {
        worstAction = action;
      }
    }

    const passed = worstAction !== 'block';

    if (worstAction === 'block') {
      throw new InputGuardBlockedError(
        `Input blocked: ${findings
          .filter((f) => f.action === 'block')
          .map((f) => `[${f.severity}] ${f.description}`)
          .join('; ')}`,
        findings,
      );
    }

    return { passed, action: worstAction, findings };
  }

  /**
   * Non-throwing check — returns result only.
   */
  checkSilent(input: string): GuardResult {
    try {
      return this.check(input);
    } catch (err) {
      if (err instanceof InputGuardBlockedError) {
        return {
          passed: false,
          action: 'block',
          findings: err.findings,
        };
      }
      throw err;
    }
  }

  /**
   * Register as a HookRegistry guard handler.
   * Returns the unsubscribe function.
   */
  attachToHooks(hooks: { before: (event: string, handler: (...args: any[]) => any) => () => void }): () => void {
    return hooks.before('tool:call', (data: Record<string, unknown>) => {
      const input = typeof data.input === 'string' ? data.input : JSON.stringify(data.input ?? '');
      const result = this.checkSilent(input);

      if (!result.passed && result.action === 'block') {
        return { allowed: false, reason: `InputGuard: blocked by ${result.findings[0]?.patternName ?? 'unknown rule'}` };
      }

      if (result.action === 'warn') {
        console.warn(`[InputGuard] ⚠️ Warn: ${result.findings.map((f) => f.description).join(', ')}`);
      }

      return { allowed: true };
    });
  }

  /**
   * Get underlying scanner for inspection.
   */
  getScanner(): SecurityScanner {
    return this.scanner;
  }
}

// ── InputGuardBlockedError ──

export class InputGuardBlockedError extends Error {
  public findings: GuardResult['findings'];

  constructor(message: string, findings: GuardResult['findings']) {
    super(message);
    this.name = 'InputGuardBlockedError';
    this.findings = findings;
  }
}

export default {
  InputGuard,
  InputGuardBlockedError,
};