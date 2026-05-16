/**
 * Tests for Eval Engine (Phase 6.2 — PromptFoo-inspired)
 */

import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import {
  runAssertion,
  runEvalSuite,
  summarizeEvalResults,
  EvalCache,
  globalEvalCache,
} from '../src/core/eval-engine.js';
import type { EvalSuite, EvalAssertion } from '../src/core/types.js';

// ── Cleanup ──
afterEach(() => {
  globalEvalCache.clear();
});

// ════════════════════════════════
//  EvalCache
// ════════════════════════════════

describe('EvalCache', () => {
  let cache: EvalCache;

  beforeEach(() => {
    cache = new EvalCache(10);
  });

  test('set and get', () => {
    cache.set('hello', 'gpt-4', 'world');
    expect(cache.get('hello', 'gpt-4')).toBe('world');
  });

  test('miss on different model', () => {
    cache.set('hello', 'gpt-4', 'world');
    expect(cache.get('hello', 'claude-3')).toBeNull();
  });

  test('miss on different prompt', () => {
    cache.set('hello', 'gpt-4', 'world');
    expect(cache.get('bye', 'gpt-4')).toBeNull();
  });

  test('eviction when over capacity', () => {
    for (let i = 0; i < 15; i++) {
      cache.set(`prompt-${i}`, 'gpt-4', `output-${i}`);
    }
    expect(cache.size).toBeLessThanOrEqual(10);
  });

  test('clear removes everything', () => {
    cache.set('a', 'm1', 'x');
    cache.set('b', 'm2', 'y');
    cache.clear();
    expect(cache.size).toBe(0);
    expect(cache.get('a', 'm1')).toBeNull();
  });

  test('globalEvalCache is a singleton', () => {
    expect(globalEvalCache).toBeInstanceOf(EvalCache);
    expect(globalEvalCache.size).toBe(0);
  });
});

// ════════════════════════════════
//  runAssertion
// ════════════════════════════════

describe('runAssertion', () => {
  test('exact match passes', async () => {
    const a: EvalAssertion = { type: 'exact', value: 'Hello World' };
    const { passed } = await runAssertion(a, 'Hello World', 'Hello World');
    expect(passed).toBe(true);
  });

  test('exact match fails on case difference', async () => {
    const a: EvalAssertion = { type: 'exact', value: 'Hello World' };
    const { passed } = await runAssertion(a, 'hello world', 'hello world');
    expect(passed).toBe(false);
  });

  test('exact match trims whitespace', async () => {
    const a: EvalAssertion = { type: 'exact', value: 'hello' };
    const { passed } = await runAssertion(a, '  hello  ', 'hello');
    expect(passed).toBe(true);
  });

  test('contains passes when substring present', async () => {
    const a: EvalAssertion = { type: 'contains', value: 'world' };
    const { passed } = await runAssertion(a, 'hello world!', '');
    expect(passed).toBe(true);
  });

  test('contains fails when substring absent', async () => {
    const a: EvalAssertion = { type: 'contains', value: 'xyz' };
    const { passed } = await runAssertion(a, 'hello world', '');
    expect(passed).toBe(false);
  });

  test('regex passes on match', async () => {
    const a: EvalAssertion = { type: 'regex', value: '\\d{3}-\\d{4}' };
    const { passed } = await runAssertion(a, 'Call 555-1234 now', '');
    expect(passed).toBe(true);
  });

  test('regex fails on no match', async () => {
    const a: EvalAssertion = { type: 'regex', value: '\\d{5}' };
    const { passed } = await runAssertion(a, 'hello', '');
    expect(passed).toBe(false);
  });

  test('regex returns error on invalid pattern', async () => {
    const a: EvalAssertion = { type: 'regex', value: '[invalid' };
    const result = await runAssertion(a, 'hello', '');
    expect(result.passed).toBe(false);
    expect(result.error).toContain('Invalid regex');
  });

  test('similarity passes above threshold', async () => {
    const a: EvalAssertion = { type: 'similarity', value: 'Hello World', threshold: 0.5 };
    const { passed } = await runAssertion(a, 'Hello World!', '');
    expect(passed).toBe(true);
  });

  test('similarity fails below threshold', async () => {
    const a: EvalAssertion = { type: 'similarity', value: 'The quick brown fox', threshold: 0.9 };
    const { passed } = await runAssertion(a, 'Completely different text here', '');
    expect(passed).toBe(false);
  });

  test('similarity default threshold is 0.8', async () => {
    const a: EvalAssertion = { type: 'similarity', value: 'Hello' };
    const { passed } = await runAssertion(a, 'Hello', '');
    expect(passed).toBe(true);
  });

  test('custom passes when expression returns true', async () => {
    const a: EvalAssertion = { type: 'custom', value: 'actual.length > expected.length' };
    const { passed } = await runAssertion(a, 'longer text here', 'short');
    expect(passed).toBe(true);
  });

  test('custom fails when expression returns false', async () => {
    const a: EvalAssertion = { type: 'custom', value: 'actual === expected' };
    const { passed } = await runAssertion(a, 'hello', 'world');
    expect(passed).toBe(false);
  });

  test('custom returns error on runtime exception', async () => {
    const a: EvalAssertion = { type: 'custom', value: 'null.bad()' };
    const result = await runAssertion(a, 'hello', '');
    expect(result.passed).toBe(false);
    expect(result.error).toContain('Custom assertion error');
  });

  test('llm-graded passes when judge returns PASS', async () => {
    const a: EvalAssertion = { type: 'llm-graded', value: 'should be friendly' };
    const mockInvoke = async () => 'PASS';
    const { passed } = await runAssertion(a, 'Hello! How can I help?', '', mockInvoke);
    expect(passed).toBe(true);
  });

  test('llm-graded fails when judge returns FAIL', async () => {
    const a: EvalAssertion = { type: 'llm-graded', value: 'should be friendly' };
    const mockInvoke = async () => 'FAIL';
    const { passed } = await runAssertion(a, 'Go away.', '', mockInvoke);
    expect(passed).toBe(false);
  });

  test('llm-graded errors without invokeModel', async () => {
    const a: EvalAssertion = { type: 'llm-graded', value: 'test' };
    const result = await runAssertion(a, 'actual', 'expected');
    expect(result.passed).toBe(false);
    expect(result.error).toContain('No model invoke function');
  });

  test('llm-graded returns error on model failure', async () => {
    const a: EvalAssertion = { type: 'llm-graded', value: 'test' };
    const mockInvoke = async () => { throw new Error('Model down'); };
    const result = await runAssertion(a, 'actual', 'expected', mockInvoke);
    expect(result.passed).toBe(false);
    expect(result.error).toContain('LLM judge error');
  });

  test('unknown assertion type returns error', async () => {
    const a = { type: 'invalid' as any, value: 'test' };
    const result = await runAssertion(a, 'actual', 'expected');
    expect(result.passed).toBe(false);
    expect(result.error).toContain('Unknown assertion type');
  });
});

// ════════════════════════════════
//  runEvalSuite
// ════════════════════════════════

describe('runEvalSuite', () => {
  const mockInvoke = async (_prompt: string, _model: string): Promise<string> => {
    // Return different outputs based on prompt content
    if (_prompt.includes('hello')) return 'Hello World!';
    if (_prompt.includes('bye')) return 'Goodbye!';
    if (_prompt.includes('Kato')) return 'Hello, I am Kato!';
    return 'Default response!';
  };

  test('runs prompt × model matrix', async () => {
    const suite: EvalSuite = {
      name: 'test-suite',
      prompts: ['hello', 'bye'],
      models: ['gpt-4', 'claude-3'],
      tests: [
        {
          name: 'contains-test',
          input: '{{prompt}}',
          expected: 'output',
          assertions: [{ type: 'contains', value: '!' }],
          vars: { prompt: '{{prompt}}' },
        },
      ],
    };

    const results = await runEvalSuite(suite, { invokeModel: mockInvoke });
    expect(results).toHaveLength(4); // 2 prompts × 2 models
    results.forEach(r => {
      expect(r.suiteName).toBe('test-suite');
      expect(r.passed).toBe(true);
    });
  });

  test('uses cache to avoid duplicate calls', async () => {
    let callCount = 0;
    const countingInvoke = async (p: string, _m: string) => {
      callCount++;
      return `response-${p}`;
    };

    const cache = new EvalCache();
    const suite: EvalSuite = {
      name: 'cache-test',
      prompts: ['hello'],
      models: ['gpt-4'],
      tests: [
        { name: 't1', input: 'hello', expected: 'x', assertions: [{ type: 'contains', value: 'response' }] },
        { name: 't2', input: 'hello', expected: 'x', assertions: [{ type: 'contains', value: 'response' }] },
      ],
    };

    await runEvalSuite(suite, { cache, invokeModel: countingInvoke });
    // model should only be called once despite 2 test cases
    expect(callCount).toBe(1);
  });

  test('reports model invocation errors', async () => {
    const failInvoke = async () => { throw new Error('API timeout'); };

    const suite: EvalSuite = {
      name: 'fail-suite',
      prompts: ['test'],
      models: ['broken-model'],
      tests: [
        { name: 'fail-test', input: 'test', expected: 'x', assertions: [{ type: 'contains', value: 'x' }] },
      ],
    };

    const results = await runEvalSuite(suite, { invokeModel: failInvoke });
    expect(results).toHaveLength(1);
    expect(results[0].passed).toBe(false);
    expect(results[0].testResults[0].error).toContain('Model invocation error');
  });

  test('handles empty suite gracefully', async () => {
    const suite: EvalSuite = {
      name: 'empty',
      prompts: [],
      models: [],
      tests: [],
    };
    const results = await runEvalSuite(suite, { invokeModel: mockInvoke });
    expect(results).toHaveLength(0);
  });

  test('handles template variable substitution', async () => {
    const suite: EvalSuite = {
      name: 'template-test',
      prompts: ['default'],
      models: ['gpt-4'],
      tests: [
        {
          name: 'var-test',
          input: 'My name is {{name}} and I am {{age}} years old',
          expected: 'output',
          assertions: [{ type: 'contains', value: 'Kato' }],
          vars: { name: 'Kato', age: '1' },
        },
      ],
    };

    const results = await runEvalSuite(suite, { invokeModel: mockInvoke });
    expect(results).toHaveLength(1);
    expect(results[0].passed).toBe(true);
  });
});

// ════════════════════════════════
//  summarizeEvalResults
// ════════════════════════════════

describe('summarizeEvalResults', () => {
  test('returns expected format for passed suite', () => {
    const results = [{
      suiteName: 'basic',
      prompt: 'hello',
      model: 'gpt-4',
      passed: true,
      totalTests: 2,
      passedTests: 2,
      durationMs: 100,
      testResults: [
        { testName: 't1', passed: true, assertionType: 'contains' as const, expected: 'x', actual: 'hello', durationMs: 10 },
        { testName: 't2', passed: true, assertionType: 'exact' as const, expected: 'y', actual: 'hello', durationMs: 5 },
      ],
      timestamp: new Date().toISOString(),
    }];

    const summary = summarizeEvalResults(results);
    expect(summary).toContain('Eval Suite Results');
    expect(summary).toContain('Suites: 1/1 passed');
    expect(summary).toContain('Tests:  2/2 passed');
    expect(summary).toContain('[gpt-4]');
  });

  test('shows failures correctly', () => {
    const results = [{
      suiteName: 'failing',
      prompt: 'test',
      model: 'claude',
      passed: false,
      totalTests: 1,
      passedTests: 0,
      durationMs: 50,
      testResults: [
        { testName: 'bad-test', passed: false, assertionType: 'contains' as const, expected: 'x', actual: 'y', error: 'Expected x but got y', durationMs: 10 },
      ],
      timestamp: new Date().toISOString(),
    }];

    const summary = summarizeEvalResults(results);
    expect(summary).toContain('Suites: 0/1 passed');
    expect(summary).toContain('Tests:  0/1 passed');
    expect(summary).toContain('FAIL');
    expect(summary).toContain('Expected x but got y');
  });

  test('handles empty results', () => {
    const summary = summarizeEvalResults([]);
    expect(summary).toContain('Eval Suite Results');
    expect(summary).toContain('Suites: 0/0 passed');
  });
});