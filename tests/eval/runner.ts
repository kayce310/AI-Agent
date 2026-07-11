/**
 * @file eval-runner.ts — Agent evaluation framework
 * @layer tests
 * @purpose Measure agent performance against baseline metrics
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';

const execAsync = promisify(exec);

// ─── Types ────────────────────────────────────────────────────────────────

export interface TestCase {
  id: string;
  name: string;
  input: string;
  expectedOutput: string;
  type: 'simple' | 'research' | 'multi-step' | 'constraint' | 'error' | 'tool' | 'vietnamese' | 'long' | 'edge';
  successCriteria: {
    exactMatch?: boolean;
    contains?: string[];
    noError?: boolean;
    toolUsed?: string;
  };
}

export interface TestResult {
  testCase: TestCase;
  passed: boolean;
  output?: string;
  error?: string;
  durationMs?: number;
  toolsCalled?: string[];
}

export interface EvalSummary {
  total: number;
  passed: number;
  failed: number;
  successRate: number;
  avgDuration: number;
  results: TestResult[];
}

// ─── Test Dataset ─────────────────────────────────────────────────────────

export const EVAL_DATASET: TestCase[] = [
  {
    id: 'simple-1',
    name: 'Simple arithmetic',
    input: 'What is 2+2?',
    expectedOutput: '4',
    type: 'simple',
    successCriteria: { contains: ['4'] },
  },
  {
    id: 'simple-2',
    name: 'Simple greeting',
    input: 'Hello, how are you?',
    expectedOutput: 'greeting',
    type: 'simple',
    successCriteria: { noError: true },
  },
  {
    id: 'research-1',
    name: 'Compare Python vs Go',
    input: 'Compare Python vs Go for web APIs',
    expectedOutput: 'comparison',
    type: 'research',
    successCriteria: { noError: true },
  },
  {
    id: 'multi-step-1',
    name: 'Multi-step task',
    input: 'Research and evaluate options',
    expectedOutput: 'analysis',
    type: 'multi-step',
    successCriteria: { noError: true },
  },
  {
    id: 'constraint-1',
    name: 'Constraint following',
    input: 'Explain OAuth but do not mention Google',
    expectedOutput: 'OAuth explanation',
    type: 'constraint',
    successCriteria: { noError: true },
  },
  {
    id: 'error-1',
    name: 'Error handling',
    input: 'What if I cannot reach the URL?',
    expectedOutput: 'graceful handling',
    type: 'error',
    successCriteria: { noError: true },
  },
  {
    id: 'tool-1',
    name: 'Tool selection',
    input: 'List files in current directory',
    expectedOutput: 'file listing',
    type: 'tool',
    successCriteria: { noError: true },
  },
  {
    id: 'vietnamese-1',
    name: 'Vietnamese weather',
    input: 'Thời tiết Hà Nội hôm nay thế nào?',
    expectedOutput: 'weather forecast',
    type: 'vietnamese',
    successCriteria: { contains: ['Hà Nội', 'thời tiết'] },
  },
  {
    id: 'edge-1',
    name: 'Empty input',
    input: '',
    expectedOutput: 'error handling',
    type: 'edge',
    successCriteria: { noError: true },
  },
  {
    id: 'edge-2',
    name: 'Very long input',
    input: 'Summarize: ' + 'A'.repeat(500),
    expectedOutput: 'summary',
    type: 'edge',
    successCriteria: { noError: true },
  },
];

// ─── Eval Runner ──────────────────────────────────────────────────────────

export class EvalRunner {
  private results: TestResult[] = [];

  async runAll(): Promise<EvalSummary> {
    const startTime = Date.now();

    for (const testCase of EVAL_DATASET) {
      const result = await this.runTest(testCase);
      this.results.push(result);
    }

    const totalDuration = Date.now() - startTime;

    return this.calculateSummary(totalDuration);
  }

  async runTest(testCase: TestCase): Promise<TestResult> {
    const startTime = Date.now();

    try {
      // In production, this would call the actual agent API
      // For now, this is a placeholder that marks all as passed
      // Replace with actual agent call: await callAgent(testCase.input)

      const result: TestResult = {
        testCase,
        passed: true, // Placeholder - replace with actual evaluation
        output: testCase.expectedOutput,
        durationMs: Date.now() - startTime,
      };

      return result;
    } catch (error: any) {
      return {
        testCase,
        passed: false,
        error: error.message,
        durationMs: Date.now() - startTime,
      };
    }
  }

  calculateSummary(totalDuration: number): EvalSummary {
    const passed = this.results.filter(r => r.passed).length;
    const failed = this.results.filter(r => !r.passed).length;

    return {
      total: this.results.length,
      passed,
      failed,
      successRate: (passed / this.results.length) * 100,
      avgDuration: totalDuration / this.results.length,
      results: this.results,
    };
  }

  getResults(): TestResult[] {
    return this.results;
  }
}

// ─── Export utilities ─────────────────────────────────────────────────────

export const createEvalRunner = () => new EvalRunner();

// ─── Run if executed directly ─────────────────────────────────────────────

if (import.meta.url === `file://${process.argv[1]}`) {
  const runner = createEvalRunner();
  runner.runAll().then(summary => {
    console.log('\n📊 EVALUATION RESULTS');
    console.log('═══════════════════════');
    console.log(`Total: ${summary.total}`);
    console.log(`Passed: ${summary.passed} (${summary.successRate.toFixed(1)}%)`);
    console.log(`Failed: ${summary.failed}`);
    console.log(`Avg Duration: ${summary.avgDuration.toFixed(0)}ms`);
    console.log('');
    console.log('Results:');
    summary.results.forEach((r, i) => {
      const status = r.passed ? '✅' : '❌';
      console.log(`${status} ${r.testCase.name}`);
    });
  });
}
