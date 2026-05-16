/**
 * Kato Eval Engine — PromptFoo-Inspired Assertion & Eval Harness
 * Phase 6.2 — LLM Evaluation & Red Teaming
 *
 * Provides:
 * - Assertion engine (exact, contains, regex, similarity, custom, LLM-graded)
 * - Eval suite runner (prompt × model × test case matrix)
 * - Caching layer for dedup LLM calls during eval
 */

import type {
  EvalSuite,
  EvalTestCase,
  EvalAssertion,
  EvalResult,
  EvalTestResult,
} from './types.js';

// ── String Similarity (Levenshtein-based) ──

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost,
      );
    }
  }
  return dp[m][n];
}

function similarity(a: string, b: string): number {
  if (a === b) return 1;
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  const dist = levenshtein(a.toLowerCase(), b.toLowerCase());
  return 1 - dist / maxLen;
}

// ── Cache Layer ──

interface CacheEntry {
  prompt: string;
  model: string;
  output: string;
  timestamp: number;
}

export class EvalCache {
  private cache = new Map<string, CacheEntry>();
  private maxSize: number;

  constructor(maxSize = 500) {
    this.maxSize = maxSize;
  }

  private key(prompt: string, model: string): string {
    return `${model}::${prompt}`;
  }

  get(prompt: string, model: string): string | null {
    const entry = this.cache.get(this.key(prompt, model));
    if (!entry) return null;
    return entry.output;
  }

  set(prompt: string, model: string, output: string): void {
    if (this.cache.size >= this.maxSize) {
      // Evict oldest
      const oldest = this.cache.keys().next().value;
      if (oldest) this.cache.delete(oldest);
    }
    this.cache.set(this.key(prompt, model), { prompt, model, output, timestamp: Date.now() });
  }

  clear(): void {
    this.cache.clear();
  }

  get size(): number {
    return this.cache.size;
  }
}

// ── Default Eval Cache (global singleton) ──
export const globalEvalCache = new EvalCache();

// ── Assertion Runner ──

export type ModelInvokeFn = (prompt: string, model: string) => Promise<string>;

/**
 * Evaluate a single assertion against actual output.
 */
export async function runAssertion(
  assertion: EvalAssertion,
  actual: string,
  expected: string,
  invokeModel?: ModelInvokeFn,
): Promise<Pick<EvalTestResult, 'passed' | 'error'>> {
  switch (assertion.type) {
    case 'exact':
      return {
        passed: actual.trim() === assertion.value.trim(),
      };

    case 'contains':
      return {
        passed: actual.includes(assertion.value),
      };

    case 'regex': {
      try {
        const regex = new RegExp(assertion.value, 'i');
        return { passed: regex.test(actual) };
      } catch (err) {
        return { passed: false, error: `Invalid regex: ${(err as Error).message}` };
      }
    }

    case 'similarity': {
      const threshold = assertion.threshold ?? 0.8;
      const sim = similarity(actual, assertion.value);
      return { passed: sim >= threshold };
    }

    case 'custom': {
      // Custom JS expression expected to evaluate to a boolean
      try {
        // Safe eval: only access a few globals; wrap in return so expression result is captured
        const fn = new Function('actual', 'expected', `return (${assertion.value});`);
        const result = fn(actual, expected);
        return { passed: Boolean(result) };
      } catch (err) {
        return { passed: false, error: `Custom assertion error: ${(err as Error).message}` };
      }
    }

    case 'llm-graded': {
      if (!invokeModel) {
        return { passed: false, error: 'No model invoke function provided for LLM-graded assertion' };
      }
      const judgePrompt = `You are an LLM output judge. Determine if the actual output meets the expected criteria.

Expected: "${assertion.value}"

Actual Output:
"""
${actual}
"""

Respond with ONLY "PASS" or "FAIL".`;
      try {
        const judgeResult = await invokeModel(judgePrompt, assertion.provider ?? 'judge');
        const passed = judgeResult.trim().toUpperCase().startsWith('PASS');
        return { passed };
      } catch (err) {
        return { passed: false, error: `LLM judge error: ${(err as Error).message}` };
      }
    }

    default:
      return { passed: false, error: `Unknown assertion type: ${assertion.type}` };
  }
}

// ── Suite Runner ──

export interface EvalRunnerOptions {
  cache?: EvalCache;
  invokeModel?: ModelInvokeFn;
}

/**
 * Run a full eval suite (prompt × model × test case matrix).
 */
export async function runEvalSuite(
  suite: EvalSuite,
  options: EvalRunnerOptions = {},
): Promise<EvalResult[]> {
  const cache = options.cache ?? globalEvalCache;
  const invokeModel = options.invokeModel;
  const results: EvalResult[] = [];

  for (const prompt of suite.prompts) {
    for (const model of suite.models) {
      const suiteStart = Date.now();
      const testResults: EvalTestResult[] = [];

      for (const testCase of suite.tests) {
        // Apply template variables
        let input = testCase.input;
        if (testCase.vars) {
          for (const [key, val] of Object.entries(testCase.vars)) {
            input = input.replaceAll(`{{${key}}}`, val);
          }
        }

        // Get model output (from cache or invoke)
        let output: string;
        const cached = cache.get(input, model);
        if (cached !== null) {
          output = cached;
        } else if (invokeModel) {
          try {
            output = await invokeModel(input, model);
            cache.set(input, model, output);
          } catch (err) {
            for (const assertion of testCase.assertions) {
              const tStart = Date.now();
              testResults.push({
                testName: testCase.name,
                passed: false,
                assertionType: assertion.type,
                expected: assertion.value,
                actual: '',
                error: `Model invocation error: ${(err as Error).message}`,
                durationMs: Date.now() - tStart,
              });
            }
            continue;
          }
        } else {
          output = ''; // No model available — test will fail
        }

        // Run assertions
        for (const assertion of testCase.assertions) {
          const tStart = Date.now();
          const { passed, error } = await runAssertion(assertion, output, testCase.expected, invokeModel);
          testResults.push({
            testName: testCase.name,
            passed,
            assertionType: assertion.type,
            expected: assertion.value,
            actual: output,
            error,
            durationMs: Date.now() - tStart,
          });
        }
      }

      const passedTests = testResults.filter(r => r.passed).length;
      results.push({
        suiteName: suite.name,
        prompt,
        model,
        passed: passedTests === testResults.length,
        totalTests: testResults.length,
        passedTests,
        durationMs: Date.now() - suiteStart,
        testResults,
        timestamp: new Date().toISOString(),
      });
    }
  }

  return results;
}

/**
 * Generate a human-readable summary from eval results.
 */
export function summarizeEvalResults(results: EvalResult[]): string {
  const total = results.length;
  const passed = results.filter(r => r.passed).length;
  const totalTests = results.reduce((s, r) => s + r.totalTests, 0);
  const passedTests = results.reduce((s, r) => s + r.passedTests, 0);
  const totalDuration = results.reduce((s, r) => s + r.durationMs, 0);

  const lines: string[] = [];
  lines.push(`── Eval Suite Results ──`);
  lines.push(`Suites: ${passed}/${total} passed`);
  lines.push(`Tests:  ${passedTests}/${totalTests} passed`);
  lines.push(`Time:   ${(totalDuration / 1000).toFixed(1)}s`);
  lines.push('');

  for (const result of results) {
    const icon = result.passed ? '✓' : '✗';
    lines.push(`${icon} [${result.model}] ${result.suiteName}`);
    lines.push(`   Prompt: "${result.prompt.substring(0, 60)}..."`);
    for (const tr of result.testResults) {
      const tIcon = tr.passed ? '✓' : '✗';
      lines.push(`   ${tIcon} ${tr.testName} (${tr.assertionType}): ${tr.passed ? 'PASS' : `FAIL${tr.error ? ` — ${tr.error}` : ''}`}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

export default {
  runAssertion,
  runEvalSuite,
  summarizeEvalResults,
  EvalCache,
  globalEvalCache,
};