/**
 * @file secret-rotation — Secret Rotation Policy
 * @layer core
 * @depends-on security/sqlite-storage
 * @owner core-security
 *
 * Warns when secrets haven't been rotated past a threshold.
 * Policy: Secrets should be rotated every 90 days.
 */

import { Logger } from '../logger.js';

const log = new Logger({ module: 'SecretRotation' });

// ── Types ──

export interface SecretMetadata {
  name: string;
  lastRotated: number;    // Unix timestamp ms
  description?: string;
}

export interface RotationWarning {
  secret: string;
  lastRotated: number;
  daysOld: number;
  severity: 'info' | 'warn' | 'critical';
  message: string;
}

export interface RotationPolicy {
  /** Days before warning is triggered */
  warningThreshold?: number;
  /** Days before critical alert */
  criticalThreshold?: number;
}

// ── Defaults ──

const DEFAULT_POLICY: Required<RotationPolicy> = {
  warningThreshold: 60,
  criticalThreshold: 90,
};

// ── Secret Rotation Checker ──

export class SecretRotationChecker {
  private policy: Required<RotationPolicy>;
  private warnings: RotationWarning[] = [];

  constructor(policy: RotationPolicy = {}) {
    this.policy = { ...DEFAULT_POLICY, ...policy };
  }

  /**
   * Check a single secret
   */
  checkSecret(metadata: SecretMetadata): RotationWarning | null {
    // [USAGE-TRACE] orphan module — instrumented 2026-07-31, chờ quan sát trước khi xóa.
    log.info(`[USAGE-TRACE] secret-rotation.checkSecret called`, { timestamp: Date.now() });
    const now = Date.now();
    const daysOld = (now - metadata.lastRotated) / (1000 * 60 * 60 * 24);

    if (daysOld < this.policy.warningThreshold) return null;

    const severity = daysOld >= this.policy.criticalThreshold ? 'critical' : 'warn';
    const warning: RotationWarning = {
      secret: metadata.name,
      lastRotated: metadata.lastRotated,
      daysOld: Math.floor(daysOld),
      severity,
      message: daysOld >= this.policy.criticalThreshold
        ? `🚨 Secret "${metadata.name}" is ${Math.floor(daysOld)} days old — rotate IMMEDIATELY (>${this.policy.criticalThreshold} day limit)`
        : `⚠️ Secret "${metadata.name}" is ${Math.floor(daysOld)} days old — rotation recommended (>${this.policy.warningThreshold} days)`,
    };

    this.warnings.push(warning);
    log.warn(warning.message);
    return warning;
  }

  /**
   * Check multiple secrets at once (e.g., on startup)
   */
  checkAll(secrets: SecretMetadata[]): RotationWarning[] {
    // [USAGE-TRACE] orphan module — instrumented 2026-07-31.
    log.info(`[USAGE-TRACE] secret-rotation.checkAll called`, { timestamp: Date.now(), count: secrets?.length ?? 0 });
    const results: RotationWarning[] = [];
    for (const secret of secrets) {
      const warning = this.checkSecret(secret);
      if (warning) results.push(warning);
    }
    return results;
  }

  /**
   * Get all accumulated warnings
   */
  getWarnings(): RotationWarning[] {
    // [USAGE-TRACE] orphan module — instrumented 2026-07-31.
    log.info(`[USAGE-TRACE] secret-rotation.getWarnings called`, { timestamp: Date.now() });
    return this.warnings;
  }

  /**
   * Generate a startup report
   */
  generateReport(secrets: SecretMetadata[]): string {
    const warnings = this.checkAll(secrets);
    if (warnings.length === 0) {
      return '✅ All secrets are within rotation policy.';
    }

    const lines = [
      '═══ Secret Rotation Report ═══',
      `Total secrets checked: ${secrets.length}`,
      `Warnings: ${warnings.length}`,
      '',
    ];

    for (const w of warnings.sort((a, b) => b.daysOld - a.daysOld)) {
      lines.push(`  ${w.severity === 'critical' ? '🚨' : '⚠️'} ${w.secret}: ${w.daysOld} days old`);
    }

    lines.push('');
    lines.push('Action: Rotate secrets immediately to maintain security compliance.');
    return lines.join('\n');
  }
}

// ── Singleton ──

let rotationCheckerInstance: SecretRotationChecker | null = null;

export function getSecretRotationChecker(policy?: RotationPolicy): SecretRotationChecker {
  // [USAGE-TRACE] orphan module — instrumented 2026-07-31.
  log.info(`[USAGE-TRACE] secret-rotation.getSecretRotationChecker called`, { timestamp: Date.now() });
  if (!rotationCheckerInstance) {
    rotationCheckerInstance = new SecretRotationChecker(policy);
  }
  return rotationCheckerInstance;
}

export default SecretRotationChecker;
