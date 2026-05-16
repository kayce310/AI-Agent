/**
 * Kato Security Scanner — PromptFoo-Inspired Red Teaming & Input Guard
 * Phase 6.2 — Security Analysis
 *
 * Provides:
 * - Pattern-based prompt injection detection
 * - Jailbreak attempt detection
 * - Sensitive data leakage scanning
 * - Tool abuse protection
 * - Path traversal detection
 */

import type {
  SecurityPattern,
  SecurityFinding,
  SecurityScanResult,
  SecuritySeverity,
} from './types.js';

// ── Built-in Security Patterns ──

export function createDefaultPatterns(): SecurityPattern[] {
  return [
    // ── Prompt Injection ──
    {
      name: 'ignore-prior-instructions',
      description: 'Attempt to override system instructions',
      severity: 'high',
      category: 'prompt-injection',
      detect(input: string): SecurityFinding | null {
        const patterns = [
          /ignore\s+(all\s+)?(prior|previous|above|given)\s+(instructions|directions|commands)/i,
          /forget\s+(all\s+)?(prior|previous|above)\s+(instructions|directions)/i,
          /disregard\s+(all\s+)?(prior|previous|above)/i,
          /you\s+(don'?t|do\s+not)\s+(have\s+to|need\s+to)\s+(follow|obey)/i,
          /new\s+(instructions|task|mission|role)\s*:?\s*(you\s+are\s+now|act\s+as|your\s+new)/i,
        ];
        for (const pattern of patterns) {
          const match = input.match(pattern);
          if (match) {
            return {
              patternName: 'ignore-prior-instructions',
              severity: 'high',
              category: 'prompt-injection',
              matchedText: match[0],
              description: 'Attempt to override system instructions detected',
              position: { start: match.index!, end: match.index! + match[0].length },
            };
          }
        }
        return null;
      },
    },
    {
      name: 'role-switch-attack',
      description: 'Attempt to hijack model persona/role',
      severity: 'high',
      category: 'prompt-injection',
      detect(input: string): SecurityFinding | null {
        const patterns = [
          /you\s+are\s+(now\s+)?(a\s+)?(hacker|cracker|malicious|evil|malware)/i,
          /act\s+as\s+(a\s+)?(hacker|cracker|malicious|evil|malware)/i,
          /pretend\s+(to\s+be|you\s+are)\s+(a\s+)?(hacker|cracker|malicious)/i,
          /from\s+now\s+on\s+you\s+are\s+DAN/i,
          /do\s+anything\s+now/i,  // DAN-style jailbreak
        ];
        for (const pattern of patterns) {
          const match = input.match(pattern);
          if (match) {
            return {
              patternName: 'role-switch-attack',
              severity: 'high',
              category: 'prompt-injection',
              matchedText: match[0],
              description: 'Attempt to hijack model persona detected',
              position: { start: match.index!, end: match.index! + match[0].length },
            };
          }
        }
        return null;
      },
    },
    {
      name: 'delimiter-injection',
      description: 'Attempt to inject via special delimiters',
      severity: 'medium',
      category: 'prompt-injection',
      detect(input: string): SecurityFinding | null {
        const patterns = [
          /```\s*(system|user|assistant)\s*\n/i,
          /<\|im_start\|>/i,
          /<\|im_end\|>/i,
          /<\|system\|>/i,
          /<\|user\|>/i,
          /<\|assistant\|>/i,
          /\}\s*\n\s*"role"\s*:\s*"(system|user)"/i,
        ];
        for (const pattern of patterns) {
          const match = input.match(pattern);
          if (match) {
            return {
              patternName: 'delimiter-injection',
              severity: 'medium',
              category: 'prompt-injection',
              matchedText: match[0],
              description: 'Special delimiter injection detected — possible role/message boundary attack',
              position: { start: match.index!, end: match.index! + match[0].length },
            };
          }
        }
        return null;
      },
    },

    // ── Jailbreak ──
    {
      name: 'jailbreak-attempt',
      description: 'Known jailbreak pattern',
      severity: 'critical',
      category: 'jailbreak',
      detect(input: string): SecurityFinding | null {
        const patterns = [
          /you\s+(will|must|should)\s+now\s+(output|respond|reply|answer)\s+(without|with\s+no)\s+(restrictions|limitations|boundaries|censorship|filtering|safeguards|guardrails)/i,
          /bypass\s+(all\s+)?(safety|security|ethical|restrictions|limitations|guidelines|rules)/i,
          /remove\s+(all\s+)?(safety|security|content\s+filters|restrictions)/i,
          /you\s+(don'?t|do\s+not)\s+need\s+to\s+follow\s+(any\s+)?(ethical|moral|legal|content\s+policy)/i,
          /output\s+(raw|unfiltered|uncensored)\s+(content|data|text)/i,
          /give\s+me\s+(access\s+to\s+)?(your\s+)?(internal|system|base|core)\s+(prompt|instructions|commands|directives)/i,
          /reveal\s+(your\s+)?(system|base|core|initial)\s+(prompt|instructions|commands|directives|message)/i,
        ];
        for (const pattern of patterns) {
          const match = input.match(pattern);
          if (match) {
            return {
              patternName: 'jailbreak-attempt',
              severity: 'critical',
              category: 'jailbreak',
              matchedText: match[0],
              description: 'Known jailbreak pattern detected',
              position: { start: match.index!, end: match.index! + match[0].length },
            };
          }
        }
        return null;
      },
    },

    // ── Data Leakage ──
    {
      name: 'api-key-leak',
      description: 'Possible API key or secret in input',
      severity: 'critical',
      category: 'data-leakage',
      detect(input: string): SecurityFinding | null {
        const patterns = [
          /(?:sk|pk|api[_-]?key|secret|token)[\s_-]?(?:=|:)\s*['"]?[a-zA-Z0-9_-]{20,}/i,
          /(?:sk|pk)-[a-zA-Z0-9_-]{20,}/,
          /x(?:-|\s)?api(?:-|\s)?key\s*:\s*['"]?[a-zA-Z0-9_-]{10,}/i,
          /bearer\s+[a-zA-Z0-9._-]{20,}/i,
        ];
        for (const pattern of patterns) {
          const match = input.match(pattern);
          if (match) {
            return {
              patternName: 'api-key-leak',
              severity: 'critical',
              category: 'data-leakage',
              matchedText: match[0].substring(0, 30) + '...',
              description: 'Possible API key or secret token detected in input',
              position: { start: match.index!, end: match.index! + Math.min(match[0].length, 30) },
            };
          }
        }
        return null;
      },
    },
    {
      name: 'code-injection',
      description: 'Possible code injection attempt',
      severity: 'high',
      category: 'data-leakage',
      detect(input: string): SecurityFinding | null {
        const patterns = [
          /process\.env/i,
          /require\(['"]fs['"]\)/i,
          /import\s+.*\s+from\s+['"]fs['"]/i,
          /exec\(/i,
          /spawn\(/i,
          /child_process/i,
          /eval\s*\(/i,
          /Function\s*\(/i,
          /global\.process/i,
          /__dirname/i,
          /__filename/i,
        ];
        for (const pattern of patterns) {
          const match = input.match(pattern);
          if (match) {
            return {
              patternName: 'code-injection',
              severity: 'high',
              category: 'data-leakage',
              matchedText: match[0],
              description: 'Possible code injection attempt via Node.js runtime access',
              position: { start: match.index!, end: match.index! + match[0].length },
            };
          }
        }
        return null;
      },
    },

    // ── Tool Abuse ──
    {
      name: 'tool-abuse-exec',
      description: 'Attempt to abuse execute_command tool',
      severity: 'high',
      category: 'tool-abuse',
      detect(input: string): SecurityFinding | null {
        const patterns = [
          /execute_command\s*:?\s*(rm|del|format|fdisk|dd|mkfs|:\(\)\s*\{)/i,
          /(rm|del)\s+(-rf|--recursive|-fr|-r\s*-f)\s+(\/|\/\*|\*)/i,
          /execute_command.*sudo/i,
          /execute_command.*chmod\s+777/i,
          /:\(\)\s*\{.*:\s*\|/i,  // Fork bomb
          />(?:\/dev\/sda|\/dev\/sdb|\/dev\/mmcblk)/i,
        ];
        for (const pattern of patterns) {
          const match = input.match(pattern);
          if (match) {
            return {
              patternName: 'tool-abuse-exec',
              severity: 'high',
              category: 'tool-abuse',
              matchedText: match[0],
              description: 'Attempt to abuse execute_command with dangerous operations',
              position: { start: match.index!, end: match.index! + match[0].length },
            };
          }
        }
        return null;
      },
    },

    // ── Path Traversal ──
    {
      name: 'path-traversal',
      description: 'Attempt to read files outside allowed directories',
      severity: 'high',
      category: 'path-traversal',
      detect(input: string): SecurityFinding | null {
        const patterns = [
          /\.\.\/\.\.\//,
          /\.\.\\\.\.\\/,
          /\.\.\/[^/]*\//,
          /\.\.\\[^\\]*\\/,
          /%2e%2e%2f/i,
          /%2e%2e%5c/i,
          /\.\.%2f/i,
          /\.\.%5c/i,
          /\.\.\/etc\//i,
          /\.\.\\etc\\/i,
          /\.\.\/var\//i,
          /\.\.\/windows\/win/i,
          /\.\.\\windows\\/i,
        ];
        for (const pattern of patterns) {
          const match = input.match(pattern);
          if (match) {
            return {
              patternName: 'path-traversal',
              severity: 'high',
              category: 'path-traversal',
              matchedText: match[0],
              description: 'Path traversal attempt detected — possible directory escape',
              position: { start: match.index!, end: match.index! + match[0].length },
            };
          }
        }
        return null;
      },
    },
  ];
}

// ── Scanner ──

export interface SecurityScannerOptions {
  patterns?: SecurityPattern[];
  maxInputLength?: number;
}

export class SecurityScanner {
  private patterns: SecurityPattern[];
  private maxInputLength: number;

  constructor(options: SecurityScannerOptions = {}) {
    this.patterns = options.patterns ?? createDefaultPatterns();
    this.maxInputLength = options.maxInputLength ?? 100_000;
  }

  /**
   * Register a custom security pattern.
   */
  addPattern(pattern: SecurityPattern): void {
    this.patterns.push(pattern);
  }

  /**
   * Scan input against all registered patterns.
   */
  scan(input: string): SecurityScanResult {
    if (input.length > this.maxInputLength) {
      input = input.substring(0, this.maxInputLength);
    }

    const findings: SecurityFinding[] = [];

    for (const pattern of this.patterns) {
      try {
        const finding = pattern.detect(input);
        if (finding) {
          findings.push(finding);
        }
      } catch {
        // Skip patterns that throw
        continue;
      }
    }

    // Sort by severity (critical first)
    const severityOrder: Record<SecuritySeverity, number> = {
      critical: 0,
      high: 1,
      medium: 2,
      low: 3,
    };
    findings.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

    return {
      passed: findings.length === 0,
      findings,
      inputLength: input.length,
      scannedAt: new Date().toISOString(),
    };
  }

  /**
   * Check if input passes security scan (convenience method).
   * Throws if blocked.
   */
  guard(input: string): void {
    const result = this.scan(input);
    if (!result.passed) {
      const top = result.findings[0];
      throw new SecurityBlockedError(
        `Security blocked: [${top.severity}] ${top.category} — ${top.description}`,
        result,
      );
    }
  }
}

// ── SecurityBlockedError ──

export class SecurityBlockedError extends Error {
  public result: SecurityScanResult;

  constructor(message: string, result: SecurityScanResult) {
    super(message);
    this.name = 'SecurityBlockedError';
    this.result = result;
  }
}

// ── Default Scanner (global singleton) ──
export const globalSecurityScanner = new SecurityScanner();

export default {
  SecurityScanner,
  SecurityBlockedError,
  createDefaultPatterns,
  globalSecurityScanner,
};