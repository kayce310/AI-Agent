/**
 * @file janitor — Agent module
 * @layer core
 * @depends-on src/core/types.ts, src/core/tools/tool-registry.ts
 * @imported-by src/core/engine/engine.ts
 * @owner core-agents
 */

/**
 * Janitor — Post-execution verification step
 * Phase 5.4: run tests, lint, PII scan after tool execution
 */

import { execSync } from 'child_process';

export interface JanitorConfig {
  /** Run `npx vitest run` after critical tool calls */
  autoTest: boolean;
  /** Run linter after code generation */
  autoLint: boolean;
  /** Scan output for PII patterns */
  piiScan: boolean;
  /** Project root for running commands */
  projectRoot: string;
}

export interface JanitorResult {
  passed: boolean;
  tests?: { passed: number; failed: number; output: string };
  lint?: { passed: boolean; output: string };
  pii?: { found: number; patterns: string[] };
  errors: string[];
}

const DEFAULT_PII_PATTERNS = [
  /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/,  // email
  /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/,                     // phone
  /\b(?:\d{4}[-\s]?){3}\d{4}\b/,                        // credit card
  /(?:https?:\/\/)?(?:www\.)?github\.com\/[\w.-]+/i,    // GitHub token leak
  /sk-[A-Za-z0-9]{20,}/,                                 // OpenAI API key
  /AKIA[0-9A-Z]{16}/,                                    // AWS access key
];

export class Janitor {
  private config: JanitorConfig;

  constructor(config?: Partial<JanitorConfig>) {
    this.config = {
      autoTest: true,
      autoLint: true,
      piiScan: true,
      projectRoot: config?.projectRoot || process.cwd(),
      ...config,
    };
  }

  /**
   * Run full janitor sweep.
   */
  async sweep(options?: { skipTest?: boolean; skipLint?: boolean }): Promise<JanitorResult> {
    const result: JanitorResult = { passed: true, errors: [] };

    // Run tests
    if (this.config.autoTest && !options?.skipTest) {
      try {
        const output = execSync('npx vitest run --reporter=verbose 2>&1', {
          cwd: this.config.projectRoot,
          timeout: 60_000,
          encoding: 'utf-8',
        });
        // Parse test results from output
        const passMatch = output.match(/(\d+)\s+passed?/);
        const failMatch = output.match(/(\d+)\s+failed?/);
        result.tests = {
          passed: passMatch ? parseInt(passMatch[1]) : 0,
          failed: failMatch ? parseInt(failMatch[1]) : 0,
          output: output.substring(0, 1000),
        };
        if (result.tests.failed > 0) {
          result.passed = false;
          result.errors.push(`${result.tests.failed} test(s) failed`);
        }
      } catch (err: any) {
        result.passed = false;
        result.errors.push(`Test run failed: ${err.message}`);
        result.tests = { passed: 0, failed: 0, output: err.stdout || err.message };
      }
    }

    // Run linter
    if (this.config.autoLint && !options?.skipLint) {
      try {
        const output = execSync('npx tsc --noEmit 2>&1', {
          cwd: this.config.projectRoot,
          timeout: 30_000,
          encoding: 'utf-8',
        });
        result.lint = { passed: output.length === 0, output: output || '(clean)' };
        if (!result.lint.passed) {
          result.passed = false;
          result.errors.push('TypeScript compilation errors');
        }
      } catch (err: any) {
        result.passed = false;
        result.errors.push(`Lint/type-check failed: ${err.message}`);
        result.lint = { passed: false, output: err.stdout || err.message };
      }
    }

    // Scan for PII
    if (this.config.piiScan) {
      const findings: string[] = [];
      for (const pattern of DEFAULT_PII_PATTERNS) {
        if (pattern.test(JSON.stringify(result))) {
          findings.push(pattern.source);
        }
      }
      result.pii = { found: findings.length, patterns: findings };
      if (findings.length > 0) {
        result.passed = false;
        result.errors.push(`${findings.length} PII pattern(s) detected in output`);
      }
    }

    return result;
  }

  /**
   * Quick test-only check — returns { passed, output }.
   */
  async testOnly(): Promise<{ passed: boolean; failed: number; output: string }> {
    try {
      const output = execSync('npx vitest run --reporter=verbose 2>&1', {
        cwd: this.config.projectRoot,
        timeout: 60_000,
        encoding: 'utf-8',
      });
      const failMatch = output.match(/(\d+)\s+failed?/i);
      const failed = failMatch ? parseInt(failMatch[1], 10) : 0;
      const hasFailureIndicator = /\bfailed\b/i.test(output) || /\berror\b/i.test(output);
      if (!failMatch && hasFailureIndicator) {
        return { passed: false, failed: -1, output: output.substring(0, 2000) };
      }
      return { passed: failed === 0, failed, output: output.substring(0, 2000) };
    } catch (err: any) {
      return { passed: false, failed: -1, output: err.stdout || err.message };
    }
  }

  /**
   * Update config at runtime.
   */
  setConfig(config: Partial<JanitorConfig>): void {
    Object.assign(this.config, config);
  }

  getConfig(): JanitorConfig {
    return { ...this.config };
  }
}

export default Janitor;