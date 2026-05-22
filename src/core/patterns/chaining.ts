/**
 * @file chaining — Agent pattern
 * @layer core
 * @depends-on (none — standalone)
 * @imported-by src/core/patterns/index.ts
 * @owner core-patterns
 */

/**
 * Chaining Pattern — Sequentially chain tool calls
 * Phase 7.2c: each step passes output as input to next
 */

import { ToolRegistry } from '../tools/tool-registry.js';

export interface ChainingStep {
  toolName: string;
  inputMapping?: Record<string, string>; // step output field → next step input field
}

export async function executeChaining(
  steps: ChainingStep[],
  initialInput: Record<string, unknown>,
  toolRegistry: ToolRegistry,
): Promise<{ results: unknown[]; finalOutput: Record<string, unknown> }> {
  const results: unknown[] = [];
  let currentInput = initialInput;

  for (const step of steps) {
    const toolCall = {
      id: `chain-${Date.now()}`,
      type: 'function' as const,
      function: {
        name: step.toolName,
        arguments: JSON.stringify(currentInput),
      },
    };
    const result = await toolRegistry.executeToolCall(toolCall);
    results.push(result);

    if (step.inputMapping && typeof result === 'object' && result !== null) {
      const nextInput: Record<string, unknown> = {};
      for (const [fromKey, toKey] of Object.entries(step.inputMapping)) {
        nextInput[toKey] = (result as Record<string, unknown>)[fromKey];
      }
      currentInput = nextInput;
    }
  }

  return { results, finalOutput: currentInput };
}