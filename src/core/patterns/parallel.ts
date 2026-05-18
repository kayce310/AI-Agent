/**
 * Parallel Pattern — Execute multiple tool calls concurrently
 * Phase 7.2c: fan-out → gather results
 */

import { ToolRegistry } from '../tools/tool-registry.js';

export interface ParallelStep {
  id: string;
  toolName: string;
  args: Record<string, unknown>;
}

export interface ParallelResult {
  id: string;
  success: boolean;
  data: unknown;
  error?: string;
}

export async function executeParallel(
  steps: ParallelStep[],
  toolRegistry: ToolRegistry,
): Promise<{ results: ParallelResult[]; allSucceeded: boolean }> {
  const promises = steps.map(async (step) => {
    try {
      const toolCall = {
        id: `parallel-${step.id}-${Date.now()}`,
        type: 'function' as const,
        function: {
          name: step.toolName,
          arguments: JSON.stringify(step.args),
        },
      };
      const data = await toolRegistry.executeToolCall(toolCall);
      return { id: step.id, success: true, data };
    } catch (err: any) {
      return { id: step.id, success: false, data: null, error: err.message };
    }
  });

  const results = await Promise.all(promises);
  const allSucceeded = results.every(r => r.success);
  return { results, allSucceeded };
}