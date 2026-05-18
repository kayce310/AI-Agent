/**
 * Kato Agent — Decomposer (Bernstein Deterministic Orchestration)
 * Phase 5.1a — 1 LLM call → structured task list
 *
 * Wraps any ModelAdapter to decompose a complex user task into
 * a deterministic, ordered list of sub-tasks.
 *
 * Each sub-task has:
 *   - id: unique within the decomposition
 *   - description: what to do
 *   - type: 'llm' | 'tool' | 'sop' | 'parallel'
 *   - requires: ids of sub-tasks that must complete first
 *   - expectedOutput: brief description of expected result
 */

import { ModelAdapter, ModelResponse } from '../llm/model-adapter.js';

// ── Types ──

export type TaskType = 'llm' | 'tool' | 'sop' | 'parallel';

export interface SubTask {
  id: string;
  description: string;
  type: TaskType;
  requires: string[];
  expectedOutput: string;
}

export interface DecompositionResult {
  task: string;
  subTasks: SubTask[];
  contextFiles?: string[];
  reasoning?: string;
}

// ── System Prompt ──

const DECOMPOSE_SYSTEM_PROMPT = `You are a task decomposition engine.
Given a complex user task, break it down into a structured list of sub-tasks.

Each sub-task must include:
  - id: unique identifier (e.g. "task-1", "task-2")
  - description: clear, actionable description
  - type: one of "llm" (needs LLM reasoning), "tool" (needs tool execution), "sop" (follow standard procedure), "parallel" (can run in parallel with sibling tasks)
  - requires: list of task IDs that must complete before this one (empty array if no dependency)
  - expectedOutput: what this sub-task should produce

Rules:
1. Order tasks by dependency — prerequisites come first
2. Parallel tasks share the same "requires" array and can run simultaneously
3. Keep descriptions concrete and actionable (max 200 chars each)
4. Include contextFiles if the task references specific files
5. Max 10 sub-tasks per decomposition

Respond ONLY with a valid JSON object:
{
  "task": "original task description",
  "subTasks": [...],
  "contextFiles": ["optional-file-paths"],
  "reasoning": "brief explanation of decomposition strategy"
}`;

// ── Decomposer Class ──

export class Decomposer {
  private model: ModelAdapter;
  private debug: boolean;

  constructor(model: ModelAdapter, debug = false) {
    this.model = model;
    this.debug = debug;
  }

  /**
   * Decompose a task into structured sub-tasks.
   * Makes 1 LLM call with a system prompt requesting JSON output.
   * Retries once on parse failure.
   */
  async decompose(task: string, context?: string): Promise<DecompositionResult> {
    const messages = this.buildMessages(task, context);

    if (this.debug) {
      console.log(`📋 Decomposer: decomposing "${task.substring(0, 60)}..."`);
    }

    let lastError: string | null = null;

    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const response: ModelResponse = await this.model.invoke(messages, {
          temperature: 0.3, // low temp for deterministic output
          maxTokens: 2048,
        });

        const parsed = this.parseResponse(response.content);
        if (!parsed) {
          lastError = 'Failed to parse LLM response as JSON';
          continue;
        }

        this.validate(parsed, task);

        if (this.debug) {
          console.log(`📋 Decomposer: ${parsed.subTasks.length} sub-tasks created`);
        }

        return parsed;
      } catch (err: any) {
        lastError = err.message;
        if (this.debug) {
          console.warn(`⚠️ Decomposer attempt ${attempt + 1} failed: ${err.message}`);
        }
      }
    }

    // Fallback: return a single "do it" task
    if (this.debug) {
      console.warn(`⚠️ Decomposer: using fallback (single task) after error: ${lastError}`);
    }

    return {
      task,
      subTasks: [{
        id: 'task-1',
        description: task,
        type: 'llm',
        requires: [],
        expectedOutput: 'Complete the task as described',
      }],
      reasoning: `Fallback: failed to decompose (${lastError})`,
    };
  }

  // ── Private Helpers ──

  private buildMessages(task: string, context?: string): any[] {
    const messages: any[] = [
      { role: 'system', content: DECOMPOSE_SYSTEM_PROMPT },
    ];

    const userContent = context
      ? `Task: ${task}\n\nContext:\n${context}`
      : `Task: ${task}`;

    messages.push({ role: 'user', content: userContent });

    return messages;
  }

  private parseResponse(content: string): DecompositionResult | null {
    // Try direct JSON parse
    const trimmed = content.trim();
    if (trimmed.startsWith('{')) {
      // Extract JSON from markdown code blocks if present
      const jsonMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
      const jsonStr = jsonMatch ? jsonMatch[1].trim() : trimmed;
      try {
        const parsed = JSON.parse(jsonStr);
        if (parsed.subTasks && Array.isArray(parsed.subTasks)) {
          return parsed as DecompositionResult;
        }
      } catch {
        // Not valid JSON, try to fix
        return null;
      }
    }
    return null;
  }

  private validate(result: DecompositionResult, originalTask: string): void {
    if (!result.task || result.task.trim().length === 0) {
      result.task = originalTask;
    }

    if (!result.subTasks || result.subTasks.length === 0) {
      throw new Error('Decomposition must have at least 1 sub-task');
    }

    if (result.subTasks.length > 10) {
      throw new Error(`Too many sub-tasks (${result.subTasks.length}), max 10`);
    }

    // Ensure each sub-task has required fields
    for (const st of result.subTasks) {
      if (!st.id || !st.description || !st.type) {
        throw new Error(`Invalid sub-task: ${JSON.stringify(st)}`);
      }
      if (!['llm', 'tool', 'sop', 'parallel'].includes(st.type)) {
        throw new Error(`Invalid task type: ${st.type}`);
      }
      st.requires = st.requires || [];
    }
  }
}