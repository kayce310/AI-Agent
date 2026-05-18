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
} from '../core/types.js';

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
          /do\s+anything\s+now/i,
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
        ];
        for (const pattern of patterns) {
          const match = input.match(pattern);
          if (match) {
            return {
              patternName: 'delimiter-injection',
              severity: 'medium',
              category: 'prompt-injection',
              matchedText: match[0],
              description: 'Special delimiter injection detected',
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
          /%2e%2e%2f/i,
        ];
        for (const pattern of patterns) {
          const match = input.match(pattern);
          if (match) {
            return {
              patternName: 'path-traversal',
              severity: 'high',
              category: 'path-traversal',
              matchedText: match[0],
              description: 'Path traversal attempt detected',
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
      description: 'API key detected in input',
      severity: 'critical',
      category: 'data-leakage',
      detect(input: string): SecurityFinding | null {
        const patterns = [
          /sk-[a-zA-Z0-9\-_]{20,}/i,
          /api[_-]?key\s*[:=]\s*[a-zA-Z0-9\-_]{16,}/i,
          /secret[_-]?key\s*[:=]\s*[a-zA-Z0-9\-_]{16,}/i,
        ];
        for (const pattern of patterns) {
          const match = input.match(pattern);
          if (match) {
            return {
              patternName: 'api-key-leak',
              severity: 'critical',
              category: 'data-leakage',
              matchedText: match[0],
              description: 'API key or secret detected in input',
              position: { start: match.index!, end: match.index! + match[0].length },
            };
          }
        }
        return null;
      },
    },
    {
      name: 'bearer-token-leak',
      description: 'Bearer token detected in input',
      severity: 'critical',
      category: 'data-leakage',
      detect(input: string): SecurityFinding | null {
        const patterns = [
          /Bearer\s+[A-Za-z0-9\-._~+\/]+=*/,
          /authorization\s*:\s*bearer\s+/i,
        ];
        for (const pattern of patterns) {
          const match = input.match(pattern);
          if (match) {
            return {
              patternName: 'bearer-token-leak',
              severity: 'critical',
              category: 'data-leakage',
              matchedText: match[0],
              description: 'Bearer token detected in input',
              position: { start: match.index!, end: match.index! + match[0].length },
            };
          }
        }
        return null;
      },
    },
    // ── Tool Abuse ──
    {
      name: 'dangerous-command',
      description: 'Dangerous system command detected',
      severity: 'high',
      category: 'tool-abuse',
      detect(input: string): SecurityFinding | null {
        const patterns = [
          /rm\s+-rf\s+\//,
          /execute_command.*rm\s+-rf/i,
          /:\(\)\s*\{\s*:\|:&\s*\};:/,
          /fork\s*bomb/i,
        ];
        for (const pattern of patterns) {
          const match = input.match(pattern);
          if (match) {
            return {
              patternName: 'dangerous-command',
              severity: 'high',
              category: 'tool-abuse',
              matchedText: match[0],
              description: 'Dangerous command or fork bomb detected',
              position: { start: match.index!, end: match.index! + match[0].length },
            };
          }
        }
        return null;
      },
    },
    {
      name: 'code-injection',
      description: 'Code injection attempt detected',
      severity: 'high',
      category: 'tool-abuse',
      detect(input: string): SecurityFinding | null {
        const patterns = [
          /process\.env/,
          /exec\s*\(\s*["'`]/,
          /eval\s*\(\s*["'`]/,
          /child_process/,
          /require\s*\(\s*["'`]child_process["'`]\s*\)/,
        ];
        for (const pattern of patterns) {
          const match = input.match(pattern);
          if (match) {
            return {
              patternName: 'code-injection',
              severity: 'high',
              category: 'tool-abuse',
              matchedText: match[0],
              description: 'Code injection attempt detected',
              position: { start: match.index!, end: match.index! + match[0].length },
            };
          }
        }
        return null;
      },
    },
    // ── System Prompt Extraction (Jailbreak) ──
    {
      name: 'system-prompt-extraction',
      description: 'Attempt to extract system prompt',
      severity: 'critical',
      category: 'jailbreak',
      detect(input: string): SecurityFinding | null {
        const patterns = [
          /reveal\s+(your\s+)?(system\s+)?(prompt|instructions)/i,
          /show\s+(me\s+)?(your\s+)?(system\s+)?(prompt|instructions)/i,
          /what\s+(are|is)\s+(your\s+)?(system\s+)?(prompt|instructions)/i,
          /print\s+(your\s+)?(system\s+)?(prompt|instructions)/i,
          /output\s+(your\s+)?(system\s+)?(prompt|instructions)/i,
          /disclose\s+(your\s+)?(system\s+)?(prompt|instructions)/i,
        ];
        for (const pattern of patterns) {
          const match = input.match(pattern);
          if (match) {
            return {
              patternName: 'system-prompt-extraction',
              severity: 'critical',
              category: 'jailbreak',
              matchedText: match[0],
              description: 'System prompt extraction attempt detected',
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

  addPattern(pattern: SecurityPattern): void {
    this.patterns.push(pattern);
  }

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
        continue;
      }
    }

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

export const globalSecurityScanner = new SecurityScanner();

export default {
  SecurityScanner,
  SecurityBlockedError,
  createDefaultPatterns,
  globalSecurityScanner,
};