/**
 * @file trace-builder.test.ts — Phase 4C: Trace Engine
 * @test buildCognitiveTrace — constructs CognitiveTrace from event stream
 */
import { describe, expect, it } from 'vitest';
import crypto from 'crypto';
import type { AgentEvent } from '../src/core/events/types.js';

// ── Helpers ──

function makeEvent(overrides: Partial<AgentEvent> & { type: AgentEvent['type']; payload: Record<string, unknown> }): AgentEvent {
  return {
    id: crypto.randomUUID(),
    timestamp: Date.now(),
    metadata: { source: 'test', version: '1.0' },
    ...overrides,
  } as AgentEvent;
}

function makeDecision(taskId: string, decision: string, decisionId?: string): AgentEvent {
  const id = decisionId || crypto.randomUUID();
  return makeEvent({
    type: 'decision_made',
    payload: { taskId, decisionId: id, decision, reason: decision, nextAction: 'Respond' },
    timestamp: Date.now(),
  });
}

function makeToolCalled(taskId: string, decisionId: string, toolName: string, callId?: string, args?: Record<string, unknown>): AgentEvent {
  const cid = callId || crypto.randomUUID();
  return makeEvent({
    type: 'tool_called',
    payload: { taskId, decisionId, callId: cid, toolName, args: args || {} },
    timestamp: Date.now(),
  });
}

function makeToolFinished(taskId: string, decisionId: string, callId: string, toolName: string, success = true): AgentEvent {
  return makeEvent({
    type: 'tool_finished',
    payload: { taskId, decisionId, callId, toolName, success, durationMs: 100, args: {} },
    timestamp: Date.now(),
  });
}

function makeFileCreated(taskId: string, path: string): AgentEvent {
  return makeEvent({
    type: 'file_created',
    payload: { taskId, path },
    timestamp: Date.now(),
  });
}

function makeMemoryWrite(taskId: string, key: string, value: string): AgentEvent {
  return makeEvent({
    type: 'memory_write',
    payload: { key, value, scope: 'memory' },
    timestamp: Date.now(),
  });
}

function makeError(taskId: string, message: string): AgentEvent {
  return makeEvent({
    type: 'error',
    payload: { message, code: 'TEST_ERROR' },
    timestamp: Date.now(),
  });
}

// ── Tests ──

describe('buildCognitiveTrace', () => {
  const TASK = 'task-test-001';

  it('returns empty decisions for no matching events', async () => {
    const { buildCognitiveTrace } = await import('../src/core/events/trace-builder.js');
    const result = buildCognitiveTrace(TASK, []);
    expect(result).toEqual({ taskId: TASK, decisions: [] });
  });

  it('returns empty decisions for events with different taskId', async () => {
    const { buildCognitiveTrace } = await import('../src/core/events/trace-builder.js');
    const events = [makeDecision('other-task', 'Test')];
    const result = buildCognitiveTrace(TASK, events);
    expect(result).toEqual({ taskId: TASK, decisions: [] });
  });

  it('builds trace for direct response (no tools)', async () => {
    const { buildCognitiveTrace } = await import('../src/core/events/trace-builder.js');
    const ev = makeDecision(TASK, 'Respond directly');
    const result = buildCognitiveTrace(TASK, [ev]);

    expect(result.taskId).toBe(TASK);
    expect(result.decisions).toHaveLength(1);
    expect(result.decisions[0].decisionId).toBe(ev.payload.decisionId);
    expect(result.decisions[0].decision).toBe(ev);
    expect(result.decisions[0].tools).toHaveLength(0);
    expect(result.decisions[0].artifacts).toHaveLength(0);
  });

  it('builds trace for single tool call with result', async () => {
    const { buildCognitiveTrace } = await import('../src/core/events/trace-builder.js');
    const decId = crypto.randomUUID();
    const callId = crypto.randomUUID();

    const events: AgentEvent[] = [
      makeDecision(TASK, 'Call read_file', decId),
      makeToolCalled(TASK, decId, 'read_file', callId, { path: '/tmp/x' }),
      makeToolFinished(TASK, decId, callId, 'read_file'),
    ];

    const result = buildCognitiveTrace(TASK, events);

    expect(result.decisions).toHaveLength(1);
    expect(result.decisions[0].tools).toHaveLength(1);
    expect(result.decisions[0].tools[0].toolCalled).toBe(events[1]);
    expect(result.decisions[0].tools[0].toolFinished).toBe(events[2]);
  });

  it('builds trace for multi-tool decision', async () => {
    const { buildCognitiveTrace } = await import('../src/core/events/trace-builder.js');
    const decId = crypto.randomUUID();
    const callA = crypto.randomUUID();
    const callB = crypto.randomUUID();

    const events: AgentEvent[] = [
      makeDecision(TASK, 'Investigate', decId),
      makeToolCalled(TASK, decId, 'search_files', callA, { pattern: 'config' }),
      makeToolFinished(TASK, decId, callA, 'search_files'),
      makeToolCalled(TASK, decId, 'read_file', callB, { path: '/tmp/cfg' }),
      makeToolFinished(TASK, decId, callB, 'read_file'),
    ];

    const result = buildCognitiveTrace(TASK, events);

    expect(result.decisions).toHaveLength(1);
    expect(result.decisions[0].tools).toHaveLength(2);
    expect(result.decisions[0].tools[0].toolCalled?.payload.toolName).toBe('search_files');
    expect(result.decisions[0].tools[0].toolFinished).toBeDefined();
    expect(result.decisions[0].tools[1].toolCalled?.payload.toolName).toBe('read_file');
    expect(result.decisions[0].tools[1].toolFinished).toBeDefined();
  });

  it('includes file artifacts in decision trace', async () => {
    const { buildCognitiveTrace } = await import('../src/core/events/trace-builder.js');
    const decId = crypto.randomUUID();
    const callId = crypto.randomUUID();

    const events: AgentEvent[] = [
      makeDecision(TASK, 'Write file', decId),
      makeToolCalled(TASK, decId, 'write_file', callId, { path: '/tmp/out.txt' }),
      makeToolFinished(TASK, decId, callId, 'write_file'),
      makeFileCreated(TASK, '/tmp/out.txt'),
    ];

    const result = buildCognitiveTrace(TASK, events);

    expect(result.decisions).toHaveLength(1);
    expect(result.decisions[0].artifacts).toHaveLength(1);
    expect(result.decisions[0].artifacts[0].type).toBe('file_created');
    expect(result.decisions[0].artifacts[0].payload.path).toBe('/tmp/out.txt');
  });

  it('includes non-file artifacts (memory_write, error)', async () => {
    const { buildCognitiveTrace } = await import('../src/core/events/trace-builder.js');
    const decId = crypto.randomUUID();
    const callId = crypto.randomUUID();

    const events: AgentEvent[] = [
      makeDecision(TASK, 'Save memory', decId),
      makeToolCalled(TASK, decId, 'memory_write', callId, { key: 'test' }),
      makeToolFinished(TASK, decId, callId, 'memory_write'),
      makeMemoryWrite(TASK, 'test', 'value'),
      makeError(TASK, 'Something went wrong'),
    ];

    const result = buildCognitiveTrace(TASK, events);

    expect(result.decisions).toHaveLength(1);
    expect(result.decisions[0].artifacts).toHaveLength(2);
    expect(result.decisions[0].artifacts[0].type).toBe('memory_write');
    expect(result.decisions[0].artifacts[1].type).toBe('error');
  });

  it('handles corrupted stream — missing tool_finished', async () => {
    const { buildCognitiveTrace } = await import('../src/core/events/trace-builder.js');
    const decId = crypto.randomUUID();
    const callId = crypto.randomUUID();

    const events: AgentEvent[] = [
      makeDecision(TASK, 'Call tool', decId),
      makeToolCalled(TASK, decId, 'hang_tool', callId),
      // No tool_finished — the tool never returned
    ];

    const result = buildCognitiveTrace(TASK, events);

    expect(result.decisions).toHaveLength(1);
    expect(result.decisions[0].tools).toHaveLength(1);
    expect(result.decisions[0].tools[0].toolCalled).toBe(events[1]);
    expect(result.decisions[0].tools[0].toolFinished).toBeUndefined();
  });

  it('handles corrupted stream — orphan tool_finished without tool_called', async () => {
    const { buildCognitiveTrace } = await import('../src/core/events/trace-builder.js');
    const decId = crypto.randomUUID();
    const callId = crypto.randomUUID();

    const events: AgentEvent[] = [
      makeDecision(TASK, 'Orphan', decId),
      // tool_called was lost — only tool_finished remains
      makeToolFinished(TASK, decId, callId, 'ghost_tool'),
    ];

    const result = buildCognitiveTrace(TASK, events);

    expect(result.decisions).toHaveLength(1);
    expect(result.decisions[0].tools).toHaveLength(1);
    expect(result.decisions[0].tools[0].toolCalled).toBeUndefined();
    expect(result.decisions[0].tools[0].toolFinished).toBe(events[1]);
  });

  it('builds trace for multiple decisions in one task', async () => {
    const { buildCognitiveTrace } = await import('../src/core/events/trace-builder.js');
    const dec1Id = crypto.randomUUID();
    const dec2Id = crypto.randomUUID();
    const call1Id = crypto.randomUUID();
    const call2Id = crypto.randomUUID();

    const events: AgentEvent[] = [
      makeDecision(TASK, 'First answer', dec1Id),
      makeToolCalled(TASK, dec1Id, 'ping', call1Id),
      makeToolFinished(TASK, dec1Id, call1Id, 'ping'),
      makeDecision(TASK, 'Second answer', dec2Id),
      makeToolCalled(TASK, dec2Id, 'exec', call2Id, { cmd: 'ls' }),
      makeToolFinished(TASK, dec2Id, call2Id, 'exec'),
    ];

    const result = buildCognitiveTrace(TASK, events);

    expect(result.decisions).toHaveLength(2);

    expect(result.decisions[0].decisionId).toBe(dec1Id);
    expect(result.decisions[0].tools).toHaveLength(1);
    expect(result.decisions[0].tools[0].toolCalled?.payload.toolName).toBe('ping');

    expect(result.decisions[1].decisionId).toBe(dec2Id);
    expect(result.decisions[1].tools).toHaveLength(1);
    expect(result.decisions[1].tools[0].toolCalled?.payload.toolName).toBe('exec');
  });

  it('handles out-of-order events — tool_finished before tool_called', async () => {
    const { buildCognitiveTrace } = await import('../src/core/events/trace-builder.js');
    const decId = crypto.randomUUID();
    const callId = crypto.randomUUID();

    // tool_finished arrives BEFORE tool_called (async race)
    const events: AgentEvent[] = [
      makeDecision(TASK, 'Race', decId),
      makeToolFinished(TASK, decId, callId, 'fast_tool'),
      makeToolCalled(TASK, decId, 'fast_tool', callId, { x: 1 }),
    ];

    const result = buildCognitiveTrace(TASK, events);

    expect(result.decisions).toHaveLength(1);
    expect(result.decisions[0].tools).toHaveLength(1);
    expect(result.decisions[0].tools[0].toolCalled).toBe(events[2]);
    expect(result.decisions[0].tools[0].toolFinished).toBe(events[1]);
  });

  it('rejects events without taskId in payload', async () => {
    const { buildCognitiveTrace } = await import('../src/core/events/trace-builder.js');
    const events: AgentEvent[] = [
      makeEvent({
        type: 'error',
        payload: { message: 'no task' },
      }),
    ];

    const result = buildCognitiveTrace(TASK, events);
    expect(result.decisions).toHaveLength(0);
  });

  it('does not include task_started/task_finished as artifacts', async () => {
    const { buildCognitiveTrace } = await import('../src/core/events/trace-builder.js');
    const decId = crypto.randomUUID();

    const events: AgentEvent[] = [
      makeEvent({ type: 'task_started', payload: { taskId: TASK, goal: 'Test' } }),
      makeDecision(TASK, 'Go', decId),
      makeEvent({ type: 'task_finished', payload: { taskId: TASK, goal: 'Test', success: true, duration: 500 } }),
    ];

    const result = buildCognitiveTrace(TASK, events);

    expect(result.decisions).toHaveLength(1);
    // task_started came before any decision — dropped
    // task_finished came after decision — should NOT be artifact
    expect(result.decisions[0].artifacts).toHaveLength(0);
  });

  it('produces consistent output — same input = same structure', async () => {
    const { buildCognitiveTrace } = await import('../src/core/events/trace-builder.js');
    const decId = crypto.randomUUID();
    const callId = crypto.randomUUID();

    const events: AgentEvent[] = [
      makeDecision(TASK, 'Consistent', decId),
      makeToolCalled(TASK, decId, 'tool_x', callId),
      makeToolFinished(TASK, decId, callId, 'tool_x'),
    ];

    const r1 = buildCognitiveTrace(TASK, events);
    const r2 = buildCognitiveTrace(TASK, events);

    expect(r1.decisions.length).toBe(r2.decisions.length);
    expect(r1.decisions[0].tools.length).toBe(r2.decisions[0].tools.length);
    expect(r1.decisions[0].artifacts.length).toBe(r2.decisions[0].artifacts.length);
  });
});
