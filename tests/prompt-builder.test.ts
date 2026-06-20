/**
 * @file PromptBuilder Tests
 * @layer tests
 */
import { describe, it, expect } from 'vitest';

describe('PromptBuilder', () => {
  it('should be importable', async () => {
    const mod = await import('../src/core/llm/prompt-builder.js');
    expect(mod).toBeDefined();
  });

  it('should have PromptBuilder class', async () => {
    const { PromptBuilder } = await import('../src/core/llm/prompt-builder.js');
    expect(typeof PromptBuilder).toBe('function');
  });
});
