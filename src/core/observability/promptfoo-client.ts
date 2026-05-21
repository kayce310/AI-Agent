/**
 * @file promptfoo-client — Observability module
 * @layer core
 * @depends-on src/core/types.ts
 * @imported-by src/core/engine/engine.ts
 * @owner core-observability
 */

/**
 * PromptFooClient — Dedicated client for PromptFoo evaluation
 * Phase 6.2: run red-teaming and eval tests via PromptFoo CLI
 *
 * Note: Requires `promptfoo` CLI installed globally or in project.
 * Falls back to EvalEngine when CLI is unavailable.
 */

import { execSync } from 'child_process';
import EvalEngine from './eval-engine.js';

export interface PromptFooTestConfig {
  /** Prompt to test */
  prompt: string;
  /** Expected behavior description */
  expected: string;
  /** Provider/model to test against */
  provider?: string;
  /** Test categories */
  categories?: string[];
}

export interface PromptFooResult {
  passed: boolean;
  score: number;
  vulnerabilities: string[];
  durationMs: number;
  error?: string;
}

export interface PromptFooClientConfig {
  /** Path to promptfoo binary */
  binaryPath: string;
  /** Default provider */
  defaultProvider: string;
  /** Use EvalEngine fallback when CLI unavailable */
  useEvalEngineFallback: boolean;
}

const DEFAULT_CONFIG: PromptFooClientConfig = {
  binaryPath: 'npx promptfoo',
  defaultProvider: 'openai:gpt-4',
  useEvalEngineFallback: true,
};

export class PromptFooClient {
  private config: PromptFooClientConfig;

  constructor(config?: Partial<PromptFooClientConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Run a red-teaming test.
   */
  async runTest(testConfig: PromptFooTestConfig): Promise<PromptFooResult> {
    const start = Date.now();

    try {
      // Try promptfoo CLI first
      execSync(
        `${this.config.binaryPath} eval --prompt "${testConfig.prompt}" --provider ${testConfig.provider || this.config.defaultProvider}`,
        { timeout: 30_000, encoding: 'utf-8' },
      );

      return {
        passed: true,
        score: 1,
        vulnerabilities: [],
        durationMs: Date.now() - start,
      };
    } catch (err: any) {
      // Fallback to EvalEngine assertions
      if (this.config.useEvalEngineFallback) {
        const assertResult = await EvalEngine.runAssertion(
          { type: 'contains', value: testConfig.expected },
          testConfig.prompt,
          testConfig.expected,
        );
        return {
          passed: assertResult.passed,
          score: assertResult.passed ? 1 : 0,
          vulnerabilities: assertResult.passed ? [] : [assertResult.error || 'Assertion failed'],
          durationMs: Date.now() - start,
          error: err.message,
        };
      }

      return {
        passed: false,
        score: 0,
        vulnerabilities: [],
        durationMs: Date.now() - start,
        error: `PromptFoo CLI failed: ${err.message}`,
      };
    }
  }

  /**
   * Run multiple tests.
   */
  async runSuite(tests: PromptFooTestConfig[]): Promise<PromptFooResult[]> {
    return Promise.all(tests.map(t => this.runTest(t)));
  }

  setConfig(config: Partial<PromptFooClientConfig>): void {
    Object.assign(this.config, config);
  }

  getConfig(): PromptFooClientConfig {
    return { ...this.config };
  }
}

export default PromptFooClient;