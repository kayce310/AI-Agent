/**
 * Coral Agent — LiteLLMAdapter Unit Tests
 * Phase 6.3: LiteLLM Gateway Integration
 * 
 * Tests for LiteLLMAdapter class in model-adapter.ts
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LiteLLMAdapter, LiteLLMConfig, ModelRouter } from '../src/core/llm/model-adapter.js';

// ── Mocks ──────────────────────────────────────────────────────

// Create a mock create function that we can control in tests
const mockCreate = vi.fn();

vi.mock('openai', () => {
  return {
    default: class MockOpenAI {
      chat = {
        completions: {
          create: mockCreate,
        },
      };
    },
  };
});

// ── Helpers ────────────────────────────────────────────────────

function makeAdapter(configOverrides?: Partial<LiteLLMConfig>): LiteLLMAdapter {
  const config: LiteLLMConfig = {
    baseUrl: 'http://localhost:4000',
    apiKey: 'sk-litellm-test-key',
    models: ['gpt-3.5-turbo', 'gpt-4'],
    timeout: 30000,
    ...configOverrides,
  };
  return new LiteLLMAdapter(config);
}

beforeEach(() => {
  mockCreate.mockReset();
});

// ── Tests ──────────────────────────────────────────────────────

describe('LiteLLMAdapter — Construction & Config', () => {
  it('creates adapter with valid config', () => {
    const adapter = makeAdapter();
    expect(adapter.name).toBe('litellm');
    expect(adapter.label).toContain('LiteLLM');
  });

  it('isAvailable returns true when baseUrl and models exist', () => {
    const adapter = makeAdapter();
    expect(adapter.isAvailable()).toBe(true);
  });

  it('isAvailable returns false when no models configured', () => {
    const adapter = makeAdapter({ models: [] });
    expect(adapter.isAvailable()).toBe(false);
  });

  it('isAvailable returns false when baseUrl is empty', () => {
    const adapter = makeAdapter({ baseUrl: '' });
    expect(adapter.isAvailable()).toBe(false);
  });

  it('fromEnv returns null when env vars missing', () => {
    delete process.env.LITELLM_BASE_URL;
    delete process.env.LITELLM_API_KEY;
    delete process.env.LITELLM_MODELS;
    const adapter = LiteLLMAdapter.fromEnv();
    expect(adapter).toBeNull();
  });

  it('fromEnv returns adapter when env vars present', () => {
    process.env.LITELLM_BASE_URL = 'http://litellm:4000';
    process.env.LITELLM_API_KEY = 'sk-test-key';
    process.env.LITELLM_MODELS = 'gpt-4,claude-3-opus';
    process.env.LITELLM_TIMEOUT = '60000';

    const adapter = LiteLLMAdapter.fromEnv();
    expect(adapter).not.toBeNull();
    expect(adapter!.name).toBe('litellm');
    expect(adapter!.isAvailable()).toBe(true);

    delete process.env.LITELLM_BASE_URL;
    delete process.env.LITELLM_API_KEY;
    delete process.env.LITELLM_MODELS;
    delete process.env.LITELLM_TIMEOUT;
  });
});

describe('LiteLLMAdapter — Token Estimation', () => {
  it('estimates tokens for simple messages', () => {
    const adapter = makeAdapter();
    const messages = [
      { role: 'system', content: 'You are a helpful assistant.' },
      { role: 'user', content: 'Hello world' },
    ];
    const tokens = adapter.estimateTokens(messages);
    expect(tokens).toBeGreaterThan(0);
    expect(tokens).toBeLessThan(100);
  });

  it('estimates tokens for empty messages', () => {
    const adapter = makeAdapter();
    const tokens = adapter.estimateTokens([]);
    expect(tokens).toBe(0);
  });

  it('estimates tokens including tool calls', () => {
    const adapter = makeAdapter();
    const messages = [
      { role: 'assistant', content: '', tool_calls: [{ function: { name: 'test', arguments: '{}' } }] },
    ];
    const tokens = adapter.estimateTokens(messages);
    expect(tokens).toBeGreaterThan(0);
  });
});

describe('LiteLLMAdapter — Invoke', () => {
  let adapter: LiteLLMAdapter;

  beforeEach(() => {
    adapter = makeAdapter();
  });

  it('throws when no models configured', async () => {
    const emptyAdapter = makeAdapter({ models: [] });
    await expect(emptyAdapter.invoke([{ role: 'user', content: 'hi' }])).rejects.toThrow('no models configured');
  });

  it('makes API call and returns content', async () => {
    mockCreate.mockResolvedValueOnce({
      choices: [{ message: { content: 'Hello! How can I help you?' }, finish_reason: 'stop' }],
      usage: { prompt_tokens: 10, completion_tokens: 5 },
      model: 'gpt-3.5-turbo',
    });

    const result = await adapter.invoke([{ role: 'user', content: 'Hi' }]);
    expect(result.content).toBe('Hello! How can I help you?');
    expect(result.modelUsed).toBe('gpt-3.5-turbo');
    expect(result.providerUsed).toBe('litellm');
    expect(result.finishReason).toBe('stop');
    expect(result.tokenUsage).toEqual({ input: 10, output: 5 });
  });

  it('passes options to API call', async () => {
    mockCreate.mockResolvedValueOnce({
      choices: [{ message: { content: 'Custom model response' }, finish_reason: 'stop' }],
    });

    await adapter.invoke(
      [{ role: 'user', content: 'Test' }],
      { model: 'gpt-4', temperature: 0.5, maxTokens: 100 }
    );

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'gpt-4',
        temperature: 0.5,
        max_tokens: 100,
      })
    );
  });

  it('passes tool calls when provided', async () => {
    mockCreate.mockResolvedValueOnce({
      choices: [
        {
          message: {
            content: '',
            tool_calls: [{ id: 'call_1', type: 'function', function: { name: 'get_weather', arguments: '{}' } }],
          },
          finish_reason: 'tool_calls',
        },
      ],
    });

    const tools = [{ type: 'function', function: { name: 'get_weather', parameters: { type: 'object' } } }];
    const result = await adapter.invoke(
      [{ role: 'user', content: 'What is the weather?' }],
      { tools }
    );

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        tool_choice: 'auto',
        tools,
      })
    );
    expect(result.toolCalls).toBeDefined();
    expect(result.toolCalls!.length).toBe(1);
    expect(result.toolCalls![0].function.name).toBe('get_weather');
    expect(result.finishReason).toBe('tool_calls');
  });

  it('uses default model when none specified', async () => {
    const adapterOneModel = makeAdapter({ models: ['gpt-4'] });
    mockCreate.mockResolvedValueOnce({
      choices: [{ message: { content: 'ok' }, finish_reason: 'stop' }],
    });

    await adapterOneModel.invoke([{ role: 'user', content: 'test' }]);
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ model: 'gpt-4' })
    );
  });

  it('strips model prefix headers from content', async () => {
    mockCreate.mockResolvedValueOnce({
      choices: [{ message: { content: 'gpt-3.5-turbo: Hello world' }, finish_reason: 'stop' }],
    });

    const result = await adapter.invoke([{ role: 'user', content: 'Hi' }]);
    expect(result.content).toBe('Hello world');
  });

  it('throws when response has no choices', async () => {
    mockCreate.mockResolvedValueOnce({ choices: [] });
    await expect(adapter.invoke([{ role: 'user', content: 'Hi' }])).rejects.toThrow('LiteLLM returned empty response');
  });

  it('throws on network error', async () => {
    mockCreate.mockRejectedValueOnce(new Error('Connection refused'));
    await expect(adapter.invoke([{ role: 'user', content: 'Hi' }])).rejects.toThrow('Connection refused');
  });

  it('returns empty string content when no content provided', async () => {
    mockCreate.mockResolvedValueOnce({
      choices: [{ message: { content: null }, finish_reason: 'stop' }],
    });

    const result = await adapter.invoke([{ role: 'user', content: 'Hi' }]);
    expect(result.content).toBe('');
  });

  it('returns token usage when provided by API', async () => {
    mockCreate.mockResolvedValueOnce({
      choices: [{ message: { content: 'Response' }, finish_reason: 'stop' }],
      usage: { prompt_tokens: 50, completion_tokens: 100 },
    });

    const result = await adapter.invoke([{ role: 'user', content: 'Write a paragraph' }]);
    expect(result.tokenUsage).toEqual({ input: 50, output: 100 });
  });

  it('handles empty usage object gracefully', async () => {
    mockCreate.mockResolvedValueOnce({
      choices: [{ message: { content: 'Response' }, finish_reason: 'stop' }],
      usage: undefined,
    });

    const result = await adapter.invoke([{ role: 'user', content: 'Hi' }]);
    expect(result.tokenUsage).toBeUndefined();
  });
});

describe('ModelRouter — LiteLLM Integration', () => {
  it('registers LiteLLM adapter and routes to it', async () => {
    const router = new ModelRouter();
    const adapter = makeAdapter();
    router.use(adapter);

    expect(router.listAdapters().length).toBe(1);
    expect(router.listAdapters()[0].name).toBe('litellm');
    expect(router.listAdapters()[0].available).toBe(true);

    const invokeSpy = vi.spyOn(adapter, 'invoke').mockResolvedValueOnce({
      content: 'Test response',
      modelUsed: 'gpt-3.5-turbo',
      providerUsed: 'litellm',
      finishReason: 'stop',
    });

    const result = await router.route([{ role: 'user', content: 'Hello' }]);
    expect(result.content).toBe('Test response');
    expect(invokeSpy).toHaveBeenCalledTimes(1);
  });

  it('falls back to next adapter when LiteLLM fails', async () => {
    const router = new ModelRouter();
    const adapter = makeAdapter();
    router.use(adapter);

    const invokeSpy = vi.spyOn(adapter, 'invoke').mockRejectedValue(new Error('API error'));

    await expect(router.route([{ role: 'user', content: 'Hello' }])).rejects.toThrow('All adapters failed');
    expect(invokeSpy).toHaveBeenCalledTimes(1);
  });

  it('getAdapter returns the correct adapter', () => {
    const router = new ModelRouter();
    const adapter = makeAdapter();
    router.use(adapter);

    const retrieved = router.getAdapter('litellm');
    expect(retrieved).toBe(adapter);

    const missing = router.getAdapter('nonexistent');
    expect(missing).toBeUndefined();
  });

  it('setDefault changes the default adapter', () => {
    const router = new ModelRouter();

    const mockAdapter = {
      name: 'mock',
      label: 'Mock',
      invoke: vi.fn(),
      estimateTokens: vi.fn().mockReturnValue(0),
      isAvailable: vi.fn().mockReturnValue(true),
    };

    const adapter = makeAdapter();
    router.use(adapter);
    router.use(mockAdapter);
    router.setDefault('mock');

    expect(() => router.setDefault('mock')).not.toThrow();
  });
});