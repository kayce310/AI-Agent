/**
 * Agentic Design Patterns — Phase 7.2c Test Suite
 *
 * Covers:
 * - Chaining: sequential tool execution with input mapping
 * - Routing: intent-based keyword/regex matching
 * - Parallel: concurrent fan-out execution
 * - Code exec: parse → validate → execute pipeline
 * - Reflection: generate → critique → refine (via ModelRouter stub)
 */

import { describe, it, expect, vi } from 'vitest';

// ── Chaining Pattern ──
describe('Chaining Pattern', () => {
  it('executes steps sequentially and returns results', async () => {
    const { executeChaining } = await import('../src/core/patterns/chaining.js');
    const mockRegistry = {
      executeToolCall: vi.fn().mockResolvedValue({ content: 'step1-output' }),
    } as any;

    const result = await executeChaining(
      [
        { toolName: 'tool_a' },
        { toolName: 'tool_b' },
      ],
      { input: 'hello' },
      mockRegistry,
    );

    expect(result.results).toHaveLength(2);
    expect(mockRegistry.executeToolCall).toHaveBeenCalledTimes(2);
  });

  it('applies input mapping between steps', async () => {
    const { executeChaining } = await import('../src/core/patterns/chaining.js');
    const mockRegistry = {
      executeToolCall: vi.fn()
        .mockResolvedValueOnce({ output: 'mapped-value' })
        .mockResolvedValueOnce({}),
    } as any;

    await executeChaining(
      [
        { toolName: 'step1', inputMapping: { output: 'query' } },
        { toolName: 'step2' },
      ],
      {},
      mockRegistry,
    );

    // Second call should have 'query' from first step's output
    const secondCall = mockRegistry.executeToolCall.mock.calls[1][0];
    const args = JSON.parse(secondCall.function.arguments);
    expect(args.query).toBe('mapped-value');
  });
});

// ── Routing Pattern ──
describe('Routing Pattern', () => {
  it('routes to matching handler by keyword', async () => {
    const { executeRouting, keywordMatch } = await import('../src/core/patterns/routing.js');

    const result = await executeRouting('help me with my account', [
      { name: 'support', match: keywordMatch(['help', 'support']), handler: async (i) => `Support: ${i}`, description: '' },
      { name: 'sales', match: keywordMatch(['buy', 'price']), handler: async (i) => `Sales: ${i}`, description: '' },
    ]);

    expect(result.matchedRoute).toBe('support');
    expect(result.output).toContain('Support:');
  });

  it('returns null when no route matches', async () => {
    const { executeRouting, keywordMatch } = await import('../src/core/patterns/routing.js');

    const result = await executeRouting('random gibberish', [
      { name: 'a', match: keywordMatch(['foo']), handler: async () => '', description: '' },
    ]);

    expect(result.matchedRoute).toBeNull();
    expect(result.confidence).toBe(0);
  });

  it('supports regex matching', async () => {
    const { executeRouting, regexMatch } = await import('../src/core/patterns/routing.js');

    const result = await executeRouting('email: test@example.com', [
      { name: 'email', match: regexMatch(/[\w.-]+@[\w.-]+\.\w+/), handler: async (i) => `Found: ${i}`, description: '' },
    ]);

    expect(result.matchedRoute).toBe('email');
  });

  it('keywordMatch returns false for non-matching input', async () => {
    const { keywordMatch } = await import('../src/core/patterns/routing.js');
    const matcher = keywordMatch(['urgent', 'critical']);

    expect(matcher('this is normal')).toBe(false);
    expect(matcher('this is urgent')).toBe(true);
    expect(matcher('CRITICAL issue')).toBe(true); // case insensitive
  });
});

// ── Parallel Pattern ──
describe('Parallel Pattern', () => {
  it('executes all steps concurrently', async () => {
    const { executeParallel } = await import('../src/core/patterns/parallel.js');
    const mockRegistry = {
      executeToolCall: vi.fn().mockResolvedValue({ ok: true }),
    } as any;

    const result = await executeParallel(
      [
        { id: 'a', toolName: 'tool1', args: { x: 1 } },
        { id: 'b', toolName: 'tool2', args: { y: 2 } },
      ],
      mockRegistry,
    );

    expect(result.results).toHaveLength(2);
    expect(result.allSucceeded).toBe(true);
  });

  it('reports partial failure correctly', async () => {
    const { executeParallel } = await import('../src/core/patterns/parallel.js');
    const mockRegistry = {
      executeToolCall: vi.fn()
        .mockResolvedValueOnce({ ok: true })
        .mockRejectedValueOnce(new Error('fail')),
    } as any;

    const result = await executeParallel(
      [
        { id: 'good', toolName: 't1', args: {} },
        { id: 'bad', toolName: 't2', args: {} },
      ],
      mockRegistry,
    );

    expect(result.allSucceeded).toBe(false);
    expect(result.results[0].success).toBe(true);
    expect(result.results[1].success).toBe(false);
    expect(result.results[1].error).toBeDefined();
  });
});

// ── Code Exec Pattern ──
describe('Code Exec Pattern', () => {
  it('detects syntax errors before execution', async () => {
    const { executeCode } = await import('../src/core/patterns/code-exec.js');

    const result = await executeCode({
      code: '```ts\nfunction broken() { \n```',
      language: 'typescript',
    });

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('handles non-JS languages gracefully', async () => {
    const { executeCode } = await import('../src/core/patterns/code-exec.js');

    const result = await executeCode({
      code: '```python\nprint("hello")\n```',
      language: 'python',
    });

    expect(result.success).toBe(true);
    expect(result.output).toContain('Language "python" detected');
  });

  it('returns parse information in result', async () => {
    const { executeCode } = await import('../src/core/patterns/code-exec.js');

    const result = await executeCode({
      code: '```ts\nimport { readFile } from "fs";\n\nexport function process(path: string) {\n  return readFile(path);\n}\n```',
      language: 'typescript',
    });

    expect(result.parseResult).toBeDefined();
    expect(result.parseResult!.functions).toHaveLength(1);
    expect(result.parseResult!.imports).toHaveLength(1);
  });
});

// ── Reflection Pattern ──
describe('Reflection Pattern', () => {
  it('executes generate-critique-refine cycles', async () => {
    const { executeReflection } = await import('../src/core/patterns/reflection.js');
    const mockRouter = {
      route: vi.fn()
        .mockResolvedValueOnce({ content: 'Initial output' })
        .mockResolvedValueOnce({ content: 'Critique: needs improvement' })
        .mockResolvedValueOnce({ content: 'Refined output' }),
    } as any;

    const result = await executeReflection('Write a poem', mockRouter, { maxCycles: 2 });

    expect(result.steps).toHaveLength(3); // generate + critique + generate
    expect(result.finalOutput).toBe('Refined output');
  });

  it('limits cycles to maxCycles', async () => {
    const { executeReflection } = await import('../src/core/patterns/reflection.js');
    const mockRouter = {
      route: vi.fn().mockResolvedValue({ content: 'output' }),
    } as any;

    const result = await executeReflection('Task', mockRouter, { maxCycles: 1 });
    expect(result.steps).toHaveLength(1);
    expect(mockRouter.route).toHaveBeenCalledTimes(1);
  });
});