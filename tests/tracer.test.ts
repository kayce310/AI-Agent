/**
 * Kato Tracer — O11y Tracing Tests
 * Phase 3.6
 *
 * Tests: span lifecycle, nested spans, ring buffer, exports, anomaly detection, hook integration.
 */

import { describe, it, beforeAll, afterAll, assert } from 'vitest';
import { Tracer, TraceSpan, Anomaly, createAgentTracer } from '../src/core/tracer.js';
import { HookRegistry, HookContext } from '../src/core/hooks.js';

// ── Helpers ──

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ── Tests ──

describe('Tracer — Span Lifecycle', () => {
  it('should create and end a span', async () => {
    const tracer = new Tracer();
    const span = tracer.startSpan('test-span', 'llm', { prompt: 'hello' });
    assert.ok(span.id, 'span should have an id');
    assert.equal(span.name, 'test-span');
    assert.equal(span.type, 'llm');
    assert.deepEqual(span.input, { prompt: 'hello' });
    assert.equal(span.endTime, undefined);

    await sleep(5);
    tracer.endSpan(span, { text: 'world' });

    assert.ok(span.endTime! > span.startTime, 'endTime > startTime');
    assert.ok(span.durationMs! >= 5, `durationMs (${span.durationMs}) >= 5`);
    assert.deepEqual(span.output, { text: 'world' });
    assert.equal(span.error, undefined);
  });

  it('should set error on a span', () => {
    const tracer = new Tracer();
    const span = tracer.startSpan('failing-tool', 'tool');
    tracer.endSpan(span, undefined, 'Something went wrong');

    assert.equal(span.error, 'Something went wrong');
    assert.equal(span.output, undefined);
  });

  it('should not double-end a span', () => {
    const tracer = new Tracer();
    const span = tracer.startSpan('once', 'memory');

    tracer.endSpan(span, 'first');
    const firstDuration = span.durationMs;
    const firstEnd = span.endTime;

    tracer.endSpan(span, 'second');

    assert.equal(span.output, 'first', 'output stays first');
    assert.equal(span.durationMs, firstDuration, 'duration unchanged');
    assert.equal(span.endTime, firstEnd, 'endTime unchanged');
  });

  it('should track token counts', () => {
    const tracer = new Tracer();
    const span = tracer.startSpan('gpt-4', 'llm');
    tracer.setTokenCount(span, 100, 50);
    tracer.endSpan(span, 'done');

    assert.deepEqual(span.tokenCount, { input: 100, output: 50 });
  });

  it('should add tags to a span', () => {
    const tracer = new Tracer();
    const span = tracer.startSpan('tagged', 'skill');
    tracer.tagSpan(span, 'version', '1.0');
    tracer.tagSpan(span, 'env', 'test');
    tracer.endSpan(span, 'ok');

    assert.deepEqual(span.tags, { version: '1.0', env: 'test' });
  });
});

describe('Tracer — Nested Spans', () => {
  it('should auto-parent nested spans', () => {
    const tracer = new Tracer();
    const parent = tracer.startSpan('parent', 'task');
    const child = tracer.startSpan('child', 'tool', { action: 'read' });

    assert.equal(child.parentId, parent.id, 'child parentId = parent.id');

    tracer.endSpan(child);
    tracer.endSpan(parent);
  });

  it('should handle sibling spans independently', () => {
    const tracer = new Tracer();
    const a = tracer.startSpan('a', 'tool');
    const b = tracer.startSpan('b', 'tool');

    // a is still open, b's parent should be a since we're in stack mode
    assert.equal(b.parentId, a.id);

    tracer.endSpan(b);
    tracer.endSpan(a);
  });

  it('should trace a closure and record success', async () => {
    const tracer = new Tracer();
    const result = await tracer.trace('compute', 'tool', async () => {
      await sleep(2);
      return 42;
    });

    assert.equal(result, 42);

    const spans = tracer.getSpansByType('tool');
    assert.equal(spans.length, 1);
    assert.equal(spans[0].name, 'compute');
    assert.equal(spans[0].output, 42);
    assert.ok(spans[0].durationMs! >= 2);
  });

  it('should trace a closure and record error', async () => {
    const tracer = new Tracer();
    let thrown = false;
    try {
      await tracer.trace('fail', 'tool', async () => {
        throw new Error('boom');
      });
    } catch (err: any) {
      thrown = true;
      assert.ok(err.message.includes('boom'));
    }
    assert.ok(thrown, 'Expected error to be thrown');

    const spans = tracer.getSpansByType('tool');
    assert.equal(spans.length, 1);
    assert.equal(spans[0].error, 'boom');
  });
});

describe('Tracer — Export & Query', () => {
  it('should return empty spans initially', () => {
    const tracer = new Tracer();
    assert.equal(tracer.getSpans().length, 0);
    assert.equal(tracer.toJSON().length, 0);
  });

  it('should return spans newest first', () => {
    const tracer = new Tracer();
    const s1 = tracer.startSpan('first', 'tool'); tracer.endSpan(s1);
    const s2 = tracer.startSpan('second', 'tool'); tracer.endSpan(s2);

    const all = tracer.getSpans();
    assert.equal(all.length, 2);
    assert.equal(all[0].name, 'second');
    assert.equal(all[1].name, 'first');
  });

  it('should filter spans by type', () => {
    const tracer = new Tracer();
    const s1 = tracer.startSpan('llm-call', 'llm'); tracer.endSpan(s1);
    const s2 = tracer.startSpan('tool-call', 'tool'); tracer.endSpan(s2);
    const s3 = tracer.startSpan('mem-read', 'memory'); tracer.endSpan(s3);

    assert.equal(tracer.getSpansByType('llm').length, 1);
    assert.equal(tracer.getSpansByType('tool').length, 1);
    assert.equal(tracer.getSpansByType('memory').length, 1);
    assert.equal(tracer.getSpansByType('skill').length, 0);
  });

  it('should return recent N spans', () => {
    const tracer = new Tracer();
    for (let i = 0; i < 10; i++) {
      const s = tracer.startSpan(`s${i}`, 'tool'); tracer.endSpan(s);
    }

    const recent = tracer.getRecentSpans(3);
    assert.equal(recent.length, 3);
    assert.equal(recent[0].name, 's9');
    assert.equal(recent[2].name, 's7');
  });

  it('should clear all spans', () => {
    const tracer = new Tracer();
    const s = tracer.startSpan('x', 'llm'); tracer.endSpan(s);
    assert.equal(tracer.getSpans().length, 1);

    tracer.clear();
    assert.equal(tracer.getSpans().length, 0);
  });

  it('should compute stats correctly', () => {
    const tracer = new Tracer();

    const s1 = tracer.startSpan('a', 'llm', { tokens: 10 });
    tracer.setTokenCount(s1, 10, 5);
    tracer.endSpan(s1);

    const s2 = tracer.startSpan('b', 'tool'); tracer.endSpan(s2);

    // Manually set duration for deterministic test
    s1.durationMs = 100;
    s2.durationMs = 50;

    const stats = tracer.getStats();
    assert.equal(stats.totalSpans, 2);
    assert.equal(stats.byType.llm, 1);
    assert.equal(stats.byType.tool, 1);
    assert.equal(stats.totalTokens, 15);
    assert.equal(stats.errorCount, 0);
    assert.ok(stats.avgDurationMs.llm > 0);
    assert.ok(stats.avgDurationMs.tool > 0);
  });
});

describe('Tracer — Ring Buffer', () => {
  it('should cap spans at bufferSize (default 200)', () => {
    const tracer = new Tracer({ bufferSize: 5 });
    for (let i = 0; i < 10; i++) {
      const s = tracer.startSpan(`s${i}`, 'llm'); tracer.endSpan(s);
    }

    assert.equal(tracer.getSpans().length, 5);
    // Should have the last 5: s5..s9
    assert.equal(tracer.getSpans()[4].name, 's5');
    assert.equal(tracer.getSpans()[0].name, 's9');
  });
});

describe('Tracer — Anomaly Detection', () => {
  it('should detect slow LLM (3x average)', () => {
    const tracer = new Tracer();

    // Create baseline — set durationMs after endSpan to avoid overwrite
    for (let i = 0; i < 5; i++) {
      const s = tracer.startSpan('fast-llm', 'llm');
      tracer.endSpan(s);
      s.durationMs = 200;
    }

    // 8x baseline
    const slow = tracer.startSpan('slow-llm', 'llm');
    tracer.endSpan(slow);
    slow.durationMs = 1600;

    const anomalies = tracer.detectAnomalies();
    const llmAnomalies = anomalies.filter(a => a.type === 'slow_llm');
    assert.equal(llmAnomalies.length, 1);
    assert.ok(llmAnomalies[0].message.includes('slow-llm'));
  });

  it('should detect slow tool (>5s)', () => {
    const tracer = new Tracer();
    const s = tracer.startSpan('slow-tool', 'tool');
    tracer.endSpan(s);
    s.durationMs = 6_000;

    const anomalies = tracer.detectAnomalies();
    const toolAnomalies = anomalies.filter(a => a.type === 'slow_tool');
    assert.equal(toolAnomalies.length, 1);
    assert.ok(toolAnomalies[0].message.includes('slow-tool'));
  });

  it('should not flag normal spans', () => {
    const tracer = new Tracer();

    for (let i = 0; i < 5; i++) {
      const s = tracer.startSpan('fast', 'llm');
      tracer.endSpan(s);
      s.durationMs = 100;
    }

    for (let i = 0; i < 5; i++) {
      const s = tracer.startSpan('quick', 'tool');
      tracer.endSpan(s);
      s.durationMs = 50;
    }

    assert.equal(tracer.detectAnomalies().length, 0);
  });

  it('should detect high error rate (>30%)', () => {
    const tracer = new Tracer();

    // Need >10 total spans for the high_error_rate check
    // 4 successes + 6 errors = 60% error rate, but we also need >10 total
    // Add 5 more success spans to reach 15 total
    for (let i = 0; i < 4; i++) {
      const s = tracer.startSpan('ok', 'llm'); tracer.endSpan(s, 'ok');
    }
    for (let i = 0; i < 6; i++) {
      const s = tracer.startSpan('fail', 'llm'); tracer.endSpan(s, undefined, 'error');
    }
    // Extra successes to get >10 total spans
    for (let i = 0; i < 5; i++) {
      const s = tracer.startSpan('extra', 'llm'); tracer.endSpan(s, 'ok');
    }

    const anomalies = tracer.detectAnomalies();
    const errorRateAnomalies = anomalies.filter(a => a.type === 'high_error_rate');
    assert.equal(errorRateAnomalies.length, 1);
    assert.ok(errorRateAnomalies[0].message.includes('40.0%')); // 6/15 = 40%
  });
});

describe('Tracer — Hook Integration', () => {
  it('should attach to hooks and trace model:invoke → model:response', async () => {
    const hooks = new HookRegistry();
    const tracer = new Tracer({ verbose: false });

    tracer.attachToHooks(hooks);

    // Simulate a model invoke + response cycle
    await hooks.emit('model:invoke', {
      sessionId: 'test-1',
      modelUsed: 'gpt-4',
      cycle: 0,
      toolCount: 3,
    });

    await sleep(2);

    await hooks.emit('model:response', {
      sessionId: 'test-1',
      modelUsed: 'gpt-4',
      providerUsed: 'openai',
      finishReason: 'stop',
      cycle: 0,
      inputTokens: 50,
      outputTokens: 30,
    });

    const llmSpans = tracer.getSpansByType('llm');
    assert.equal(llmSpans.length, 1);
    assert.equal(llmSpans[0].name, 'gpt-4');
    assert.ok(llmSpans[0].durationMs! >= 2, 'duration recorded');
    assert.deepEqual(llmSpans[0].tokenCount, { input: 50, output: 30 });
    assert.equal(llmSpans[0].tags?.model, 'gpt-4');
    assert.equal(llmSpans[0].tags?.provider, 'openai');
  });

  it('should trace tool:call → tool:result', async () => {
    const hooks = new HookRegistry();
    const tracer = new Tracer({ verbose: false });

    tracer.attachToHooks(hooks);

    await hooks.emit('tool:call', {
      sessionId: 'test-1',
      toolName: 'read_file',
      toolArgs: { path: '/test.txt' },
      cycle: 1,
    });

    await sleep(1);

    await hooks.emit('tool:result', {
      sessionId: 'test-1',
      toolName: 'read_file',
      result: { content: 'hello' },
      cycle: 1,
    });

    const toolSpans = tracer.getSpansByType('tool');
    assert.equal(toolSpans.length, 1);
    assert.equal(toolSpans[0].name, 'read_file');
    assert.deepEqual(toolSpans[0].output, { content: 'hello' });
  });

  it('should trace task lifecycle', async () => {
    const hooks = new HookRegistry();
    const tracer = new Tracer({ verbose: false });

    tracer.attachToHooks(hooks);

    await hooks.emit('task:start', {
      sessionId: 'task-1',
      task: 'Write a poem',
      messageCount: 5,
    });

    await sleep(2);

    await hooks.emit('task:complete', {
      sessionId: 'task-1',
      result: 'Roses are red...',
    });

    const taskSpans = tracer.getSpansByType('task');
    assert.equal(taskSpans.length, 1);
    assert.ok(taskSpans[0].name.includes('Write a poem'));
    assert.ok(taskSpans[0].durationMs! >= 2);
    assert.equal(taskSpans[0].output, 'Roses are red...');
  });

  it('should handle model:error tracing', async () => {
    const hooks = new HookRegistry();
    const tracer = new Tracer({ verbose: false });

    tracer.attachToHooks(hooks);

    await hooks.emit('model:invoke', {
      sessionId: 'err-1',
      modelUsed: 'gpt-4',
      cycle: 0,
    });

    await hooks.emit('model:error', {
      sessionId: 'err-1',
      error: 'Rate limit exceeded',
      cycle: 0,
    });

    const llmSpans = tracer.getSpansByType('llm');
    assert.equal(llmSpans.length, 1);
    assert.equal(llmSpans[0].error, 'Rate limit exceeded');
  });

  it('should handle task:error tracing', async () => {
    const hooks = new HookRegistry();
    const tracer = new Tracer({ verbose: false });

    tracer.attachToHooks(hooks);

    await hooks.emit('task:start', {
      sessionId: 'fail-task',
      task: 'Do something',
      messageCount: 1,
    });

    await hooks.emit('task:error', {
      sessionId: 'fail-task',
      error: 'Something broke',
    });

    const taskSpans = tracer.getSpansByType('task');
    assert.equal(taskSpans.length, 1);
    assert.equal(taskSpans[0].error, 'Something broke');
  });

  it('should handle multiple overlapping sessions independently', async () => {
    const hooks = new HookRegistry();
    const tracer = new Tracer({ verbose: false });

    tracer.attachToHooks(hooks);

    // Two independent sessions interleaved
    await hooks.emit('model:invoke', { sessionId: 'sess-a', cycle: 0, modelUsed: 'gpt4' });
    await hooks.emit('model:invoke', { sessionId: 'sess-b', cycle: 0, modelUsed: 'claude' });

    await hooks.emit('model:response', { sessionId: 'sess-a', cycle: 0, modelUsed: 'gpt4', providerUsed: 'openai', finishReason: 'stop' });
    await hooks.emit('model:response', { sessionId: 'sess-b', cycle: 0, modelUsed: 'claude', providerUsed: 'anthropic', finishReason: 'stop' });

    const spans = tracer.getSpansByType('llm');
    assert.equal(spans.length, 2);
    assert.equal(spans[0].name, 'claude');
    assert.equal(spans[1].name, 'gpt4');
  });
});

describe('createAgentTracer', () => {
  it('should create a tracer via factory function', () => {
    const tracer = createAgentTracer({ bufferSize: 50, verbose: false });
    assert.ok(tracer instanceof Tracer);
    assert.equal((tracer as any).bufferSize, 50);
  });
});