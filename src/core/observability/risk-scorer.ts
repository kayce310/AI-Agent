/**
 * @file risk-scorer — Risk Assessment for Tool Calls
 * @layer core
 * @depends-on none
 * @owner core-observability
 *
 * Evaluates risk level of tool calls to determine if HITL approval is needed.
 * Used by HITL Manager (B2) to decide auto-approve vs escalate to human.
 *
 * Risk levels:
 *   - low: Read-only, safe operations → auto-approve
 *   - medium: Write operations → auto-approve with audit
 *   - high: Destructive or external ops → require HITL approval
 *   - critical: System-level or data loss risk → require HITL + second approver
 */

// ── Risk Classification ──

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface RiskEvaluation {
  score: number;       // 0.0 (safe) to 1.0 (critical)
  level: RiskLevel;
  reasons: string[];
  requiresApproval: boolean;
  requiresSecondApprover: boolean;
}

export interface RiskScorerConfig {
  /** Threshold above which HITL approval is required */
  approvalThreshold?: number;
  /** Threshold above which second approver is required */
  criticalThreshold?: number;
  /** Custom rules */
  customRules?: RiskRule[];
}

export interface RiskRule {
  pattern: RegExp;
  level: RiskLevel;
  reason: string;
}

// ── Tool Risk Registry ──

const TOOL_RISK: Record<string, { base: RiskLevel; reason: string }> = {
  web_search: { base: 'low', reason: 'Read-only external query' },
  web_fetch: { base: 'low', reason: 'Read-only fetch' },
  read_file: { base: 'low', reason: 'Read-only file access' },
  list_dir: { base: 'low', reason: 'List directory contents' },
  write_file: { base: 'medium', reason: 'File system modification' },
  send_message: { base: 'medium', reason: 'External communication' },
  execute_command: { base: 'medium', reason: 'Command execution' },
};

// ── Destructive Command Patterns ──

const DESTRUCTIVE_PATTERNS: RiskRule[] = [
  { pattern: /\brm\b.*-[rf]|--recursive|--force/i, level: 'critical', reason: 'Recursive/force file deletion' },
  { pattern: /\brmrf\b|\brm\s+\//i, level: 'critical', reason: 'Root-level recursive delete' },
  { pattern: /\bdf\s|--format\b|mkfs/i, level: 'critical', reason: 'Disk format/wipe' },
  { pattern: /\bchmod\b|chown\b/i, level: 'high', reason: 'Permission modification' },
  { pattern: /\bsudo\b|\bdoas\b/i, level: 'high', reason: 'Privilege escalation' },
  { pattern: /\bcurl\b.*\|.*\bsh\b|\bwget\b.*\|.*\bsh\b/i, level: 'critical', reason: 'Pipe to shell (supply chain risk)' },
  { pattern: />\s*\/dev\//i, level: 'critical', reason: 'Direct device write' },
  { pattern: /\btruncate\b|>:?\s*/i, level: 'high', reason: 'File truncation' },
  { pattern: /\bkill\s+-9\b|\bkillall\b/i, level: 'high', reason: 'Force kill process' },
  { pattern: /\bgit\s+push\s+--force\b/i, level: 'high', reason: 'Force push to remote' },
  { pattern: /\bgit\s+reset\s+--hard\b/i, level: 'high', reason: 'Hard reset local changes' },
  { pattern: /\bdrop\s+table|\bdrop\s+database/i, level: 'critical', reason: 'Database destruction' },
];

const SAFE_COMMAND_PATTERNS = [
  /\bls\b|\bcat\b|\bgrep\b|\bfind\b|\bhead\b|\btail\b|\bwc\b/,
  /\bwhoami\b|\bdate\b|\buname\b|\bwhich\b|\becho\b/,
  /\bpwd\b|\benv\b|\bprintenv\b/,
];

// ── Risk Scorer Class ──

export class RiskScorer {
  private approvalThreshold: number;
  private criticalThreshold: number;
  private customRules: RiskRule[];

  constructor(config: RiskScorerConfig = {}) {
    this.approvalThreshold = config.approvalThreshold ?? 0.5;
    this.criticalThreshold = config.criticalThreshold ?? 0.8;
    this.customRules = config.customRules ?? [];
  }

  /**
   * Evaluate risk of a tool call
   */
  evaluate(toolName: string, toolArgs?: Record<string, any>): RiskEvaluation {
    const reasons: string[] = [];
    let score = 0;

    // 1. Check custom rules first (highest priority)
    const argsStr = JSON.stringify(toolArgs || {});
    for (const rule of this.customRules) {
      if (rule.pattern.test(`${toolName} ${argsStr}`)) {
        return this.toEvaluation(rule.level, [rule.reason]);
      }
    }

    // 2. Base tool risk
    const toolConfig = TOOL_RISK[toolName];
    if (!toolConfig) {
      // Unknown tool — medium risk by default
      score = 0.4;
      reasons.push(`Unknown tool "${toolName}"`);
    } else {
      score = this.levelToScore(toolConfig.base);
      reasons.push(toolConfig.reason);
    }

    // 3. For execute_command, check args for destructive patterns
    if (toolName === 'execute_command') {
      const command = toolArgs?.command || toolArgs?.cmd || '';
      const cmdStr = typeof command ? command : String(command);

      // Check safe patterns first
      for (const pattern of SAFE_COMMAND_PATTERNS) {
        if (pattern.test(cmdStr)) {
          // Downgrade to low if only safe commands
          score = Math.min(score, this.levelToScore('low'));
          reasons.push('Safe read-only command pattern');
          break;
        }
      }

      // Check destructive patterns
      for (const rule of DESTRUCTIVE_PATTERNS) {
        if (rule.pattern.test(cmdStr)) {
          score = Math.max(score, this.levelToScore(rule.level));
          reasons.push(rule.reason);
        }
      }
    }

    // Clamp score
    score = Math.max(0, Math.min(1, score));

    return this.toEvaluation(this.scoreToLevel(score), reasons);
  }

  /**
   * Quick check: should this action require HITL approval?
   */
  requiresApproval(toolName: string, toolArgs?: Record<string, any>): boolean {
    const evaluation = this.evaluate(toolName, toolArgs);
    return evaluation.requiresApproval;
  }

  /**
   * Batch evaluate multiple tool calls, return highest risk
   */
  evaluateBatch(toolCalls: Array<{ toolName: string; args?: Record<string, any> }>): RiskEvaluation {
    let highest: RiskEvaluation | null = null;
    for (const call of toolCalls) {
      const evalResult = this.evaluate(call.toolName, call.args);
      if (!highest || evalResult.score > highest.score) {
        highest = evalResult;
      }
    }
    return highest || { score: 0, level: 'low', reasons: [], requiresApproval: false, requiresSecondApprover: false };
  }

  // ── Private Helpers ──

  private levelToScore(level: RiskLevel): number {
    switch (level) {
      case 'low': return 0.2;
      case 'medium': return 0.4;
      case 'high': return 0.7;
      case 'critical': return 0.95;
    }
  }

  private scoreToLevel(score: number): RiskLevel {
    if (score >= this.criticalThreshold) return 'critical';
    if (score >= this.approvalThreshold) return 'high';
    if (score >= 0.3) return 'medium';
    return 'low';
  }

  private toEvaluation(level: RiskLevel, reasons: string[]): RiskEvaluation {
    const score = this.levelToScore(level);
    return {
      score,
      level,
      reasons,
      requiresApproval: score >= this.approvalThreshold,
      requiresSecondApprover: score >= this.criticalThreshold,
    };
  }
}

// ── Singleton ──

let riskScorerInstance: RiskScorer | null = null;

export function getRiskScorer(config?: RiskScorerConfig): RiskScorer {
  if (!riskScorerInstance) {
    riskScorerInstance = new RiskScorer(config);
  }
  return riskScorerInstance;
}

export default RiskScorer;
