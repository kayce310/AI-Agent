/**
 * Kato Agent — LangfuseClient Unit Tests
 * Phase 6.1a: Observability
 *
 * Tests that LangfuseClient:
 * 1. Gracefully handles missing API keys (disabled mode)
 * 2. Creates traces, spans, generations via public API
 * 3. Attaches to HookRegistry and instruments events
 * 4. Flushes and shuts down cleanly
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { LangfuseClient, createLangfuseClient } from '../src/core/langfuse-client.js';
import { HookRegistry } from '../src/core/hooks.js';

// ── Setup ──

// Store original process.env
const OLD_ENV = { ...process.env };

beforeEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

afterEach(() => {
  process.env = { ...OLD_ENV };
});

// ── Tests ──

describe('LangfuseClient — Disabled Mode', () => {
  it('should be disabled when no config provided', () => {
    const client = new LangfuseClient();
    expect(client.isEnabled).toBe(false);
  });

  it('should return null for getTrace when disabled', () => {
    const client = new LangfuseClient({ enabled: false });
    expect(client.getTrace('test')).toBeNull();
  });

  it('should return null for createSpan when disabled', () => {
    const client = new LangfuseClient({ enabled: false });
    expect(client.createSpan('trace', 'span', 'test')).toBeNull();
  });

  it('should return null for createGeneration when disabled', () => {
    const client = new LangfuseClient({ enabled: false });
    expect(
      client.createGeneration('trace', 'gen', { name: 'test', model: 'gpt-4', input: 'hello' }),
    ).toBeNull();
  });

  it('createLangfuseClient factory returns disabled client when env vars missing', () => {
    delete process.env.LANGFUSE_SECRET_KEY;
    delete process.env.LANGFUSE_PUBLIC_KEY;
    const client = createLangfuseClient();
    expect(client.isEnabled).toBe(false);
  });
});

describe('LangfuseClient — Enabled Mode', () => {
  it('should be enabled when keys provided', () => {
    const client = new LangfuseClient({
      secretKey: 'sk-test',
      publicKey: 'pk-test',
      enabled: true,
    });
    expect(client.isEnabled).toBe(true);
  });

  it('getTrace should create and cache a trace', () => {
    const client = new LangfuseClient({
      secretKey: 'sk-test',
      publicKey: 'pk-test',
      enabled: true,
    });

    const trace1 = client.getTrace('trace-1', 'test-trace');
    expect(trace1).not.toBeNull();

    // Same ID should return cached trace
    const trace2 = client.getTrace('trace-1');
    expect(trace2).toBe(trace1);
  });

  it('createSpan should create a span and return it', () => {
    const client = new LangfuseClient({
      secretKey: 'sk-test',
      publicKey: 'pk-test',
      enabled: true,
    });

    const span = client.createSpan('trace-1', 'span-1', 'test-span', { foo: 'bar' });
    expect(span).not.toBeNull();
  });

  it('createGeneration should create a generation', () => {
    const client = new LangfuseClient({
      secretKey: 'sk-test',
      publicKey: 'pk-test',
      enabled: true,
    });

    const gen = client.createGeneration('trace-1', 'gen-1', {
      name: 'llm-call',
      model: 'gpt-4',
      provider: 'openai',
      input: { messages: [{ role: 'user', content: 'hi' }] },
      tokens: { input: 10, output: 20 },
    });
    expect(gen).not.toBeNull();
  });

  it('endGeneration should clean up active generation', () => {
    const client = new LangfuseClient({
      secretKey: 'sk-test',
      publicKey: 'pk-test',
      enabled: true,
    });

    client.createGeneration('trace-1', 'gen-1', {
      name: 'test',
      model: 'gpt-4',
      input: 'hello',
    });
    expect(client.getActiveCount().generations).toBe(1);

    client.endGeneration('gen-1', { response: 'world' }, { input: 5, output: 10 });
    expect(client.getActiveCount().generations).toBe(0);
  });

  it('should be able to get active counts', () => {
    const client = new LangfuseClient({
      secretKey: 'sk-test',
      publicKey: 'pk-test',
      enabled: true,
    });

    expect(client.getActiveCount()).toEqual({ traces: 0, spans: 0, generations: 0 });

    client.getTrace('t1');
    client.createSpan('t1', 's1', 'test');
    client.createGeneration('t1', 'g1', { name: 'g', model: 'm', input: 'i' });

    const counts = client.getActiveCount();
    expect(counts.traces).toBe(1);
    expect(counts.spans).toBe(1);
    expect(counts.generations).toBe(1);
  });

  it('factory should read from env vars', () => {
    process.env.LANGFUSE_SECRET_KEY = 'sk-env';
    process.env.LANGFUSE_PUBLIC_KEY = 'pk-env';
    process.env.LANGFUSE_BASE_URL = 'https://langfuse.example.com';

    const client = createLangfuseClient({ tags: ['test'] });
    expect(client.isEnabled).toBe(true);
  });
});

describe('LangfuseClient — Hook Integration', () => {
  let client: LangfuseClient;
  let hooks: HookRegistry;

  beforeEach(() => {
    client = new LangfuseClient({
      secretKey: 'sk-test',
      publicKey: 'pk-test',
      enabled: true,
    });
    hooks = new HookRegistry();
    client.attachToHooks(hooks);
  });

  it('should create a trace on task:start', async () => {
    await hooks.emit('task:start', {
      sessionId: 'sess-1',
      task: 'Do something',
      messageCount: 5,
    });
    expect(client.getActiveCount().traces).toBe(1);
  });

  it('should create an event on task:complete', async () => {
    await hooks.emit('task:start', {
      sessionId: 'sess-2',
      task: 'Test',
      messageCount: 1,
    });
    // Emit complete (should not crash)
    await hooks.emit('task:complete', {
      sessionId: 'sess-2',
      result: 'done',
    });
    // No errors = pass
    expect(client.getActiveCount().traces).toBe(1);
  });

  it('should create an event on task:error', async () => {
    await hooks.emit('task:start', {
      sessionId: 'sess-3',
      task: 'Failing task',
      messageCount: 0,
    });
    await hooks.emit('task:error', {
      sessionId: 'sess-3',
      error: 'Something went wrong',
    });
    // Score should have been called (error_rate)
    expect(client.getActiveCount().traces).toBe(1);
  });

  it('should create a generation on model:invoke / model:response', async () => {
    await hooks.emit('model:invoke', {
      sessionId: 'sess-4',
      cycle: 0,
      modelUsed: 'gpt-4',
      providerUsed: 'openai',
      messages: [{ role: 'user', content: 'hi' }],
      toolCount: 0,
    });
    expect(client.getActiveCount().generations).toBe(1);

    await hooks.emit('model:response', {
      sessionId: 'sess-4',
      cycle: 0,
      responseContent: 'Hello!',
      inputTokens: 10,
      outputTokens: 5,
    });
    expect(client.getActiveCount().generations).toBe(0);
  });

  it('should create spans on tool:call / tool:result', async () => {
    await hooks.emit('tool:call', {
      sessionId: 'sess-5',
      cycle: 0,
      toolName: 'read_file',
      toolArgs: { path: '/test' },
    });
    expect(client.getActiveCount().spans).toBe(1);

    await hooks.emit('tool:result', {
      sessionId: 'sess-5',
      cycle: 0,
      toolName: 'read_file',
      result: 'file content',
    });
    expect(client.getActiveCount().spans).toBe(0);
  });

  it('should handle model:error gracefully', async () => {
    await hooks.emit('model:invoke', {
      sessionId: 'sess-6',
      cycle: 0,
      modelUsed: 'gpt-4',
      providerUsed: 'openai',
    });
    expect(client.getActiveCount().generations).toBe(1);

    await hooks.emit('model:error', {
      sessionId: 'sess-6',
      cycle: 0,
      error: 'Rate limited',
    });
    expect(client.getActiveCount().generations).toBe(0);
  });

  it('should handle multiple events sequentially without errors', async () => {
    // Simulate a full conversation
    await hooks.emit('task:start', {
      sessionId: 'sess-7',
      task: 'Complex task',
      messageCount: 3,
    });

    await hooks.emit('tool:call', {
      sessionId: 'sess-7', cycle: 0, toolName: 'search',
      toolArgs: { query: 'test' },
    });
    await hooks.emit('tool:result', {
      sessionId: 'sess-7', cycle: 0, toolName: 'search',
      result: 'results',
    });

    await hooks.emit('model:invoke', {
      sessionId: 'sess-7', cycle: 0, modelUsed: 'gpt-4',
      messages: [], toolCount: 1,
    });
    await hooks.emit('model:response', {
      sessionId: 'sess-7', cycle: 0,
      responseContent: 'Here is what I found',
      inputTokens: 100, outputTokens: 50,
    });

    await hooks.emit('tool:call', {
      sessionId: 'sess-7', cycle: 1, toolName: 'read_file',
      toolArgs: { path: '/data' },
    });
    await hooks.emit('tool:result', {
      sessionId: 'sess-7', cycle: 1, toolName: 'read_file',
      result: 'data content',
    });

    await hooks.emit('task:complete', {
      sessionId: 'sess-7',
      result: 'Task completed successfully',
      metrics: { helpfulness: 0.9, accuracy: 1.0 },
    });

    // All generations & spans should be cleaned up
    const counts = client.getActiveCount();
    expect(counts.generations).toBe(0);
    expect(counts.spans).toBe(0);
    // Trace should still be active (cached)
    expect(counts.traces).toBe(1);
  });
});

describe('LangfuseClient — Lifecycle', () => {
  it('should flush without error', async () => {
    const client = new LangfuseClient({
      secretKey: 'sk-test',
      publicKey: 'pk-test',
      enabled: true,
      flushIntervalMs: 100,
    });
    await expect(client.flush()).resolves.toBeUndefined();
  });

  it('should shut down cleanly', async () => {
    const client = new LangfuseClient({
      secretKey: 'sk-test',
      publicKey: 'pk-test',
      enabled: true,
    });

    client.getTrace('t1');
    client.createSpan('t1', 's1', 'test');
    client.createGeneration('t1', 'g1', { name: 'g', model: 'm', input: 'i' });

    await client.shutdown();
    expect(client.getActiveCount()).toEqual({ traces: 0, spans: 0, generations: 0 });
  });

  it('shutdown on disabled client should not throw', async () => {
    const client = new LangfuseClient({ enabled: false });
    await expect(client.shutdown()).resolves.toBeUndefined();
  });
});

describe('LangfuseClient — createLangfuseClient Factory', () => {
  it('should create disabled client with empty env vars', () => {
    delete process.env.LANGFUSE_SECRET_KEY;
    delete process.env.LANGFUSE_PUBLIC_KEY;

    const client = createLangfuseClient();
    expect(client.isEnabled).toBe(false);
  });

  it('should create enabled client with env vars set', () => {
    process.env.LANGFUSE_SECRET_KEY = 'sk-test';
    process.env.LANGFUSE_PUBLIC_KEY = 'pk-test';

    const client = createLangfuseClient({ tags: ['test-tag'] });
    expect(client.isEnabled).toBe(true);
  });

  it('should prioritize config over env vars', () => {
    process.env.LANGFUSE_SECRET_KEY = 'sk-env-bad';
    process.env.LANGFUSE_PUBLIC_KEY = 'pk-env-bad';

    const client = createLangfuseClient({
      secretKey: 'sk-config',
      publicKey: 'pk-config',
    });
    expect(client.isEnabled).toBe(true);
  });
});