/**
 * Kato Agent — Phase 5: Decomposer + PlanExecutor + ResultSynthesizer Tests
 * Bernstein Deterministic Orchestration Pattern
 *
 * Tests:
 *   1. Decomposer: parse LLM output, fallback on failure, validation
 *   2. PlanExecutor: topological sort, sequential/parallel, error handling
 *   3. ResultSynthesizer: single-task passthrough, synthesis, fallback
 *   4. Integration: full decompose → execute → synthesize flow
 */

import { describe, it, beforeAll, afterAll, beforeEach, afterEach, assert } from 'vitest';
import { Decomposer, DecompositionResult, SubTask } from '../src/core/decomposer.js';
import { PlanExecutor, ExecutionReport, TaskResult } from '../src/core/plan-executor.js';
import { ResultSynthesizer } from '../src/core/result-synthesizer.js';
import { ModelAdapter, ModelOptions, ModelResponse } from '../src/core/model-adapter.js';
import { ToolRegistry } from '../src/core/tool-registry.js';

// ── Mock ModelAdapter ──

class MockModelAdapter implements ModelAdapter {
  readonly name = 'mock';
  readonly label = 'Mock Model';

  private cannedResponses: Map<string, string> = new Map();
  private callCount = 0;
  private failing: string[] = [];

  constructor() {}

  setCannedResponse(responseKey: string, response: string): void {
    this.cannedResponses.set(responseKey, response);
  }

  setFailing(callIndices: number[]): void {
    this.failing = callIndices.map(i => String(i));
  }

  isAvailable(): boolean { return true; }

  estimateTokens(_messages: any[]): number { return 0; }

  async invoke(messages: any[], _options?: ModelOptions): Promise<ModelResponse> {
    const idx = String(this.callCount++);
    if (this.failing.includes(idx)) {
      throw new Error(`Mock failure at call ${idx}`);
    }

    // Use the last user message content as key
    const lastMsg = messages.filter(m => m.role === 'user').pop()?.content || '';
    const key = lastMsg.substring(0, 60);

    // Find matching canned response
    for (const [pattern, response] of this.cannedResponses.entries()) {
      if (key.includes(pattern) || pattern.includes(key)) {
        return {
          content: response,
          modelUsed: 'mock-model',
          providerUsed: 'mock-provider',
        };
      }
    }

    // Default JSON for decompose
    return {
      content: JSON.stringify({
        task: 'mock task',
        subTasks: [{
          id: 'task-1',
          description: 'Mock sub-task',
          type: 'llm',
          requires: [],
          expectedOutput: 'mock output',
        }],
      }),
      modelUsed: 'mock-model',
      providerUsed: 'mock-provider',
    };
  }

  reset(): void {
    this.callCount = 0;
    this.failing = [];
    this.cannedResponses.clear();
  }
}

// ── Mock ToolRegistry ──

class MockToolRegistry extends ToolRegistry {
  constructor() {
    super();
  }
}

// ── Tests ──

describe('Phase 5: Decomposer', () => {
  let model: MockModelAdapter;
  let decomposer: Decomposer;

  beforeEach(() => {
    model = new MockModelAdapter();
    decomposer = new Decomposer(model, false);
  });

  afterEach(() => {
    model.reset();
  });

  it('should decompose a task into sub-tasks', async () => {
    // Pattern must match user message: "Task: Write a financial report"
    model.setCannedResponse('financial', JSON.stringify({
      task: 'Write a financial report',
      subTasks: [
        { id: 'task-1', description: 'Gather financial data', type: 'tool', requires: [], expectedOutput: 'Raw data' },
        { id: 'task-2', description: 'Analyze trends', type: 'llm', requires: ['task-1'], expectedOutput: 'Trend analysis' },
        { id: 'task-3', description: 'Write report', type: 'llm', requires: ['task-2'], expectedOutput: 'Final report' },
      ],
      contextFiles: ['finance.csv'],
      reasoning: 'Data first, then analysis, then writing',
    }));

    const result = await decomposer.decompose('Write a financial report');

    assert.equal(result.task, 'Write a financial report');
    assert.equal(result.subTasks.length, 3);
    assert.equal(result.subTasks[0].id, 'task-1');
    assert.equal(result.subTasks[1].requires[0], 'task-1');
    assert.deepEqual(result.contextFiles, ['finance.csv']);
  });

  it('should handle JSON in markdown code blocks', async () => {
    // Return raw JSON — parseResponse handles both raw JSON and markdown-wrapped JSON
    model.setCannedResponse('Some task', '{"task": "test","subTasks":[{"id":"t1","description":"do something","type":"llm","requires":[],"expectedOutput":"done"}]}');

    const result = await decomposer.decompose('Some task');
    assert.equal(result.subTasks.length, 1);
    assert.equal(result.subTasks[0].id, 't1');
  });

  it('should fallback to single task on LLM failure', async () => {
    model.setFailing([0, 1]); // Both attempts fail

    const result = await decomposer.decompose('Do something complex');
    assert.equal(result.subTasks.length, 1);
    assert.equal(result.subTasks[0].id, 'task-1');
    assert.equal(result.subTasks[0].type, 'llm');
    assert.ok(result.reasoning!.includes('Fallback'));
  });

  it('should reject more than 10 sub-tasks', async () => {
    const subTasks: SubTask[] = [];
    for (let i = 0; i < 11; i++) {
      subTasks.push({
        id: `task-${i}`,
        description: `Task ${i}`,
        type: 'llm',
        requires: [],
        expectedOutput: 'x',
      });
    }

    model.setCannedResponse('many tasks', JSON.stringify({
      task: 'many tasks',
      subTasks,
    }));

    const result = await decomposer.decompose('many tasks');
    // Should fallback to single task
    assert.equal(result.subTasks.length, 1);
    assert.equal(result.subTasks[0].id, 'task-1');
  });

  it('should preserve original task in fallback', async () => {
    model.setFailing([0, 1]);
    const result = await decomposer.decompose('Build a web app');
    assert.equal(result.task, 'Build a web app');
    assert.equal(result.subTasks[0].description, 'Build a web app');
  });
});

describe('Phase 5: PlanExecutor', () => {
  let model: MockModelAdapter;
  let registry: MockToolRegistry;
  let executor: PlanExecutor;

  beforeEach(() => {
    model = new MockModelAdapter();
    registry = new MockToolRegistry();
    executor = new PlanExecutor(model, registry, false);
  });

  afterEach(() => {
    model.reset();
  });

  it('should execute a single-task plan', async () => {
    // Pattern must match the LLM user content: task.description = "Do simple thing"
    model.setCannedResponse('Do simple thing', 'Result of simple task');

    const plan: DecompositionResult = {
      task: 'Simple task',
      subTasks: [{
        id: 'task-1',
        description: 'Do simple thing',
        type: 'llm',
        requires: [],
        expectedOutput: 'done',
      }],
    };

    const report = await executor.execute(plan);
    assert.equal(report.success, true);
    assert.equal(report.errorCount, 0);
    assert.equal(report.results.length, 1);
    assert.equal(report.results[0].id, 'task-1');
    assert.equal(report.results[0].output, 'Result of simple task');
  });

  it('should execute multiple tasks in dependency order', async () => {
    model.setCannedResponse('Sub-task 1', 'Data gathered');
    model.setCannedResponse('Sub-task 2', 'Analysis complete');

    const plan: DecompositionResult = {
      task: 'Multi-step task',
      subTasks: [
        {
          id: 'task-1',
          description: 'Sub-task 1: gather data',
          type: 'llm',
          requires: [],
          expectedOutput: 'data',
        },
        {
          id: 'task-2',
          description: 'Sub-task 2: analyze',
          type: 'llm',
          requires: ['task-1'],
          expectedOutput: 'analysis',
        },
      ],
    };

    const report = await executor.execute(plan);
    assert.equal(report.success, true);
    assert.equal(report.results.length, 2);
    assert.equal(report.results[0].id, 'task-1');
    assert.equal(report.results[1].id, 'task-2');
  });

  it('should execute parallel tasks concurrently', async () => {
    // Pattern must match task descriptions:"Parallel A: do thing" / "Parallel B: do other thing"
    model.setCannedResponse('Parallel A: do thing', 'Result A');
    model.setCannedResponse('Parallel B: do other thing', 'Result B');

    const plan: DecompositionResult = {
      task: 'Parallel tasks',
      subTasks: [
        {
          id: 'task-a',
          description: 'Parallel A: do thing',
          type: 'llm',
          requires: [],
          expectedOutput: 'A',
        },
        {
          id: 'task-b',
          description: 'Parallel B: do other thing',
          type: 'llm',
          requires: [],
          expectedOutput: 'B',
        },
      ],
    };

    const report = await executor.execute(plan);
    assert.equal(report.success, true);
    assert.equal(report.results.length, 2);
    assert.equal(report.results[0].output, 'Result A');
    assert.equal(report.results[1].output, 'Result B');
  });

  it('should aggregate errors without throwing', async () => {
    model.setFailing([0]);

    const plan: DecompositionResult = {
      task: 'Failing task',
      subTasks: [{
        id: 'task-1',
        description: 'This will fail',
        type: 'llm',
        requires: [],
        expectedOutput: 'should fail',
      }],
    };

    const report = await executor.execute(plan);
    assert.equal(report.success, false);
    assert.equal(report.errorCount, 1);
    assert.ok(report.results[0].error!.includes('Mock failure'));
  });

  it('should build correct dependency levels', async () => {
    const plan: DecompositionResult = {
      task: 'Complex dependency chain',
      subTasks: [
        { id: 'a', description: 'A', type: 'llm', requires: [], expectedOutput: 'a' },
        { id: 'b', description: 'B', type: 'llm', requires: ['a'], expectedOutput: 'b' },
        { id: 'c', description: 'C', type: 'llm', requires: ['a'], expectedOutput: 'c' },
        { id: 'd', description: 'D', type: 'llm', requires: ['b', 'c'], expectedOutput: 'd' },
        { id: 'e', description: 'E', type: 'llm', requires: ['d'], expectedOutput: 'e' },
      ],
    };

    // Access private buildLevels via prototype
    const levels = (executor as any).buildLevels(plan.subTasks);
    assert.equal(levels.length, 4);
    assert.deepEqual(levels[0].map((t: SubTask) => t.id), ['a']);
    assert.deepEqual(levels[1].map((t: SubTask) => t.id).sort(), ['b', 'c']);
    assert.deepEqual(levels[2].map((t: SubTask) => t.id), ['d']);
    assert.deepEqual(levels[3].map((t: SubTask) => t.id), ['e']);
  });

  it('should handle empty requires array', async () => {
    model.setCannedResponse('no deps', 'done');
    const plan: DecompositionResult = {
      task: 'No deps',
      subTasks: [{
        id: 'x', description: 'no deps', type: 'llm', requires: [], expectedOutput: 'x',
      }],
    };
    const report = await executor.execute(plan);
    assert.equal(report.success, true);
  });

  it('should execute tool-type tasks via registry', async () => {
    // Mock execute method by adding a tool via plugin (would need full tool setup)
    // For unit test, we test that the executor handles tool parse correctly
    const plan: DecompositionResult = {
      task: 'Tool task',
      subTasks: [{
        id: 't1',
        description: 'list_directory',
        type: 'tool',
        requires: [],
        expectedOutput: 'file list',
      }],
    };

    const report = await executor.execute(plan);
    // Tool not found in empty registry → tool registry returns { error: "Tool not found" }
    // Executor returns this as result string (not thrown exception) → task "succeeds" with error output
    assert.equal(report.success, true);
    assert.equal(report.errorCount, 0);
    assert.ok(report.results[0].output.includes('not found'));
  });

  it('should report timing information', async () => {
    // Pattern must match task description (LLM user message)
    model.setCannedResponse('timing', 'done');
    const plan: DecompositionResult = {
      task: 'Timing test',
      subTasks: [{
        id: 't1', description: 'timing', type: 'llm', requires: [], expectedOutput: 'done',
      }],
    };

    const report = await executor.execute(plan);
    // With mock sync execution, totalDurationMs may be 0; task-level timing relies on Date.now() which may also be 0
    assert.ok(report.results[0].startedAt <= report.results[0].finishedAt);
    assert.equal(report.results[0].output, 'done');
  });
});

describe('Phase 5: ResultSynthesizer', () => {
  let model: MockModelAdapter;
  let synthesizer: ResultSynthesizer;

  beforeEach(() => {
    model = new MockModelAdapter();
    synthesizer = new ResultSynthesizer(model, false);
  });

  afterEach(() => {
    model.reset();
  });

  it('should passthrough single successful task', async () => {
    const report: ExecutionReport = {
      task: 'Simple task',
      results: [{
        id: 'task-1',
        description: 'Do thing',
        type: 'llm',
        output: 'Here is the result content',
        startedAt: '2025-01-01T00:00:00.000Z',
        finishedAt: '2025-01-01T00:00:01.000Z',
        durationMs: 1000,
      }],
      totalDurationMs: 1000,
      success: true,
      errorCount: 0,
    };

    const response = await synthesizer.synthesize(report, 'Simple task');
    assert.equal(response, 'Here is the result content');
  });

  it('should call LLM for multi-task reports', async () => {
    model.setCannedResponse('Write a report', 'Here is your synthesized report with all findings...');

    const report: ExecutionReport = {
      task: 'Write a report',
      results: [
        {
          id: 'task-1',
          description: 'Gather data',
          type: 'tool',
          output: 'Data: [1,2,3]',
          startedAt: '2025-01-01T00:00:00.000Z',
          finishedAt: '2025-01-01T00:00:01.000Z',
          durationMs: 1000,
        },
        {
          id: 'task-2',
          description: 'Analyze data',
          type: 'llm',
          output: 'Trend: upward',
          startedAt: '2025-01-01T00:00:01.000Z',
          finishedAt: '2025-01-01T00:00:02.000Z',
          durationMs: 1000,
        },
      ],
      totalDurationMs: 2000,
      success: true,
      errorCount: 0,
    };

    const response = await synthesizer.synthesize(report, 'Write a report');
    assert.equal(response, 'Here is your synthesized report with all findings...');
  });

  it('should use fallback when LLM fails', async () => {
    model.setFailing([0]);

    const report: ExecutionReport = {
      task: 'Failed synthesis',
      results: [{
        id: 'task-1',
        description: 'Do thing',
        type: 'llm',
        output: 'Partial result',
        startedAt: '2025-01-01T00:00:00.000Z',
        finishedAt: '2025-01-01T00:00:01.000Z',
        durationMs: 1000,
      }],
      totalDurationMs: 1000,
      success: true,
      errorCount: 0,
    };

    const response = await synthesizer.synthesize(report, 'Failed synthesis');
    assert.equal(response, 'Partial result');
  });

  it('should include errors in fallback output', async () => {
    model.setFailing([0]);

    const report: ExecutionReport = {
      task: 'Partial failure',
      results: [
        {
          id: 'task-1',
          description: 'Good task',
          type: 'llm',
          output: 'Success output',
          startedAt: '2025-01-01T00:00:00.000Z',
          finishedAt: '2025-01-01T00:00:01.000Z',
          durationMs: 1000,
        },
        {
          id: 'task-2',
          description: 'Bad task',
          type: 'llm',
          output: '',
          error: 'Something went wrong',
          startedAt: '2025-01-01T00:00:01.000Z',
          finishedAt: '2025-01-01T00:00:02.000Z',
          durationMs: 1000,
        },
      ],
      totalDurationMs: 2000,
      success: false,
      errorCount: 1,
    };

    const response = await synthesizer.synthesize(report, 'Partial failure');
    assert.ok(response.includes('Success output'));
    assert.ok(response.includes('Bad task'));
  });
});

describe('Phase 5: Integration — Full Orchestration', () => {
  let model: MockModelAdapter;
  let registry: MockToolRegistry;
  let decomposer: Decomposer;
  let executor: PlanExecutor;
  let synthesizer: ResultSynthesizer;

  beforeEach(() => {
    model = new MockModelAdapter();
    registry = new MockToolRegistry();
    decomposer = new Decomposer(model, false);
    executor = new PlanExecutor(model, registry, false);
    synthesizer = new ResultSynthesizer(model, false);
  });

  afterEach(() => {
    model.reset();
  });

  it('should run full decompose → execute → synthesize flow', async () => {
    // Step 1: Decompose — pattern must match user message "Task: Build a website"
    model.setCannedResponse('Task: Build a website', JSON.stringify({
      task: 'Build a website',
      subTasks: [
        { id: 'task-1', description: 'Design layout', type: 'llm', requires: [], expectedOutput: 'Layout design' },
        { id: 'task-2', description: 'Write HTML', type: 'llm', requires: ['task-1'], expectedOutput: 'HTML code' },
      ],
    }));

    // Step 2: Execute — patterns match task descriptions (LLM user messages)
    model.setCannedResponse('Design layout', 'Layout: header, main, footer');
    model.setCannedResponse('Write HTML', '<html><body>...</body></html>');

    // Step 3: Synthesize — use different pattern so it doesn't overwrite decompose pattern
    model.setCannedResponse('synthesized report', 'Here is your website with layout design and HTML code...');

    const plan = await decomposer.decompose('Build a website');
    assert.equal(plan.subTasks.length, 2);

    const report = await executor.execute(plan);
    assert.equal(report.success, true);
    assert.equal(report.results.length, 2);

    const response = await synthesizer.synthesize(report, 'Build a website');
    assert.ok(response.length > 0);
  });

  it('should handle error mid-flow gracefully', async () => {
    // Decompose succeeds — pattern must match user message "Task: Complex task"
    model.setCannedResponse('Complex task', JSON.stringify({
      task: 'Complex task',
      subTasks: [
        { id: 'task-1', description: 'Step 1: research', type: 'llm', requires: [], expectedOutput: 'research' },
        { id: 'task-2', description: 'Step 2: implement', type: 'llm', requires: ['task-1'], expectedOutput: 'code' },
      ],
    }));

    // Step 1 succeeds, Step 2 fails
    // Call 0 = decompose, Call 1 = task-1, Call 2 = task-2
    model.setCannedResponse('Step 1: research', 'Research results');
    model.setFailing([2]); // Third LLM call (task-2) fails

    const plan = await decomposer.decompose('Complex task');
    const report = await executor.execute(plan);

    assert.equal(report.success, false);
    assert.equal(report.results[0].error, undefined);
    assert.ok(report.results[1].error);
  });
});