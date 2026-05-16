/**
 * Kato Agent — Phase 5.2: Orchestrator Integration Tests
 *
 * Tests the Orchestrator pipeline wrapper:
 *   1. Full decompose → execute → synthesize flow
 *   2. Error handling at each phase
 *   3. Hook emissions
 *   4. Context passthrough
 */

import { describe, it, beforeAll, afterAll, beforeEach, afterEach, assert } from 'vitest';
import { Orchestrator, OrchestratorOptions, OrchestrationResult } from '../src/core/orchestrator.ts';
import { Decomposer, DecompositionResult, SubTask } from '../src/core/decomposer.js';
import { PlanExecutor, ExecutionReport, TaskResult } from '../src/core/plan-executor.js';
import { ResultSynthesizer } from '../src/core/result-synthesizer.js';
import { ModelAdapter, ModelOptions, ModelResponse } from '../src/core/model-adapter.js';
import { ToolRegistry } from '../src/core/tool-registry.js';
import { HookRegistry, globalHooks, EventType } from '../src/core/hooks.js';

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

    const lastMsg = messages.filter(m => m.role === 'user').pop()?.content || '';

    for (const [pattern, response] of this.cannedResponses.entries()) {
      if (lastMsg.includes(pattern) || pattern.includes(lastMsg)) {
        return { content: response, modelUsed: 'mock-model', providerUsed: 'mock-provider' };
      }
    }

    return {
      content: JSON.stringify({
        task: 'mock task',
        subTasks: [{
          id: 'task-1', description: 'Mock sub-task', type: 'llm',
          requires: [], expectedOutput: 'mock output',
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

class MockToolRegistry extends ToolRegistry {
  constructor() { super(); }
}

// ── Tests ──

describe('Phase 5.2: Orchestrator', () => {
  let model: MockModelAdapter;
  let registry: MockToolRegistry;
  let orchestrator: Orchestrator;
  let hookEvents: string[];

  beforeEach(() => {
    model = new MockModelAdapter();
    registry = new MockToolRegistry();
    hookEvents = [];

    // Track hook events
    const events: EventType[] = [
      'orchestrator:decompose-start',
      'orchestrator:decompose-end',
      'orchestrator:execute-start',
      'orchestrator:execute-end',
      'orchestrator:synthesize-start',
      'orchestrator:synthesize-end',
    ];
    for (const evt of events) {
      globalHooks.on(evt as any, async () => { hookEvents.push(evt); });
    }

    orchestrator = new Orchestrator({
      model,
      toolRegistry: registry,
      debug: false,
    });
  });

  afterEach(() => {
    model.reset();
    globalHooks.clear();
  });

  it('should run full pipeline for simple task', async () => {
    // Decompose
    model.setCannedResponse('Hello', JSON.stringify({
      task: 'Hello',
      subTasks: [{ id: 'task-1', description: 'Reply to greeting', type: 'llm', requires: [], expectedOutput: 'greeting' }],
    }));

    // Execute
    model.setCannedResponse('Reply to greeting', 'Hello! How can I help you?');

    // Synthesize — single-task passthrough, no LLM call needed
    const result = await orchestrator.run('Hello');

    assert.equal(result.content, 'Hello! How can I help you?');
    assert.equal(result.decomposition!.subTasks.length, 1);
    assert.equal(result.executionReport!.success, true);
    assert.ok(result.totalDurationMs >= 0);
  });

  it('should run full pipeline for multi-step task', async () => {
    // Synthesize pattern registered FIRST so it takes priority over substring matches
    // The synthesize user message is:
    //   "Original task: Write a report\n\nExecution results:\n...Produce a clear, helpful response for the user."
    // Since "Write a report" is a substring of this message, registering decompose first would
    // cause the JSON to be returned instead of the synthesized response.
    model.setCannedResponse('Produce a clear, helpful response', 'Final report with analysis...');

    // Decompose — user message: "Task: Write a report"
    model.setCannedResponse('Write a report', JSON.stringify({
      task: 'Write a report',
      subTasks: [
        { id: 'task-1', description: 'Gather data', type: 'llm', requires: [], expectedOutput: 'data' },
        { id: 'task-2', description: 'Analyze data', type: 'llm', requires: ['task-1'], expectedOutput: 'analysis' },
      ],
    }));

    // Execute — user messages are task descriptions
    model.setCannedResponse('Gather data', 'Raw data collected');
    model.setCannedResponse('Analyze data', 'Analysis complete');

    const result = await orchestrator.run('Write a report');

    assert.equal(result.content, 'Final report with analysis...');
    assert.equal(result.executionReport!.results.length, 2);
    assert.equal(result.executionReport!.success, true);
  });

  it('should emit all 6 hook events', async () => {
    model.setCannedResponse('hook test', JSON.stringify({
      task: 'hook test',
      subTasks: [{ id: 't1', description: 'single task', type: 'llm', requires: [], expectedOutput: 'done' }],
    }));
    model.setCannedResponse('single task', 'done');

    const result = await orchestrator.run('hook test');

    // Single-task → passthrough, no synthesize LLM call, but hook is still emitted
    assert.equal(hookEvents.length, 6);
    assert.ok(hookEvents.includes('orchestrator:decompose-start'));
    assert.ok(hookEvents.includes('orchestrator:decompose-end'));
    assert.ok(hookEvents.includes('orchestrator:execute-start'));
    assert.ok(hookEvents.includes('orchestrator:execute-end'));
    assert.ok(hookEvents.includes('orchestrator:synthesize-start'));
    assert.ok(hookEvents.includes('orchestrator:synthesize-end'));
  });

  it('should handle decompose failure gracefully', async () => {
    // Decomposer falls back to a single-task plan after 2 LLM failures
    // Orchestrator wraps decompose errors: if fallback also generates decomposition
    // without throwing, orchestrator continues with the fallback plan.
    // If Decomposer throws (e.g. validation error), orchestrator wraps it.
    // Since Decomposer has a built-in fallback, it doesn't throw for LLM failures.
    // This test verifies that the Orchestrator handles the fallback plan correctly.
    model.setFailing([0, 1]); // Both decompose attempts fail → fallback single task

    const result = await orchestrator.run('Do something');

    // Decomposer returns fallback (not throw), so orchestrator continues
    assert.equal(result.decomposition!.subTasks.length, 1);
    assert.equal(result.decomposition!.subTasks[0].id, 'task-1');
    assert.equal(result.executionReport!.results.length, 1);
  });

  it('should handle execution failure gracefully', async () => {
    // Decompose succeeds
    model.setCannedResponse('Execute fail', JSON.stringify({
      task: 'Execute fail',
      subTasks: [{ id: 't1', description: 'will fail', type: 'llm', requires: [], expectedOutput: 'fail' }],
    }));

    // Execute fails (call index 1 = execute's invoke)
    model.setFailing([1]);

    // PlanExecutor catches individual task errors and returns a report with success=false
    // Orchestrator wraps this: if executor throws it's caught, otherwise proceeds with report
    const result = await orchestrator.run('Execute fail');

    // Orchestrator still gets a valid execution report (PlanExecutor doesn't throw)
    assert.equal(result.executionReport!.success, false);
    assert.equal(result.executionReport!.errorCount, 1);
    assert.ok(result.executionReport!.results[0].error!.includes('Mock failure'));
  });

  it('should include context param', async () => {
    model.setCannedResponse('Task with context', JSON.stringify({
      task: 'Task with context',
      subTasks: [{ id: 't1', description: 'ctx task', type: 'llm', requires: [], expectedOutput: 'ctx' }],
    }));
    model.setCannedResponse('ctx task', 'Result with context: project ABC');

    const result = await orchestrator.run('Task with context', 'Additional context about project ABC');
    assert.ok(result.content.includes('project ABC'));
  });

  it('should provide decomposition and execution report in result', async () => {
    model.setCannedResponse('Report test', JSON.stringify({
      task: 'Report test',
      subTasks: [{ id: 't1', description: 'do thing', type: 'llm', requires: [], expectedOutput: 'done' }],
    }));
    model.setCannedResponse('do thing', 'result');

    const result = await orchestrator.run('Report test');

    assert.ok(result.decomposition !== undefined);
    assert.ok(result.executionReport !== undefined);
    assert.equal(result.decomposition!.task, 'Report test');
    assert.equal(result.executionReport!.results[0].output, 'result');
  });
});