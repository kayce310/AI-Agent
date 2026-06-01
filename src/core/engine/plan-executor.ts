/**
 * @file plan-executor — Core Engine component
 * @layer core
 * @depends-on src/core/tools/tool-registry.ts, src/core/llm/model-adapter.ts
 * @imported-by src/scripts/start-discord.ts
 * @owner core-engine
 */

/**
 * Kato Agent — PlanExecutor (Deterministic Task Execution)
 * Phase 5.1b — execute structured task list from Decomposer
 *
 * Phase 2: Concurrency Limit (MAX_CONCURRENT_TASKS = 3)
 * - Instead of Promise.all unlimited, we run tasks in chunks of size LIMIT.
 * - This ensures at most LIMIT tasks run concurrently (e.g., 3 sandbox instances).
 */

import { ModelAdapter, ModelResponse } from '../llm/model-adapter.js';
import { ToolRegistry } from '../tools/tool-registry.js';
import { DecompositionResult, SubTask, TaskType } from './decomposer.js';

// ── Types ──

export interface TaskResult {
  id: string;
  description: string;
  type: TaskType;
  output: string;
  error?: string;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
}

export interface ExecutionReport {
  task: string;
  results: TaskResult[];
  totalDurationMs: number;
  success: boolean;
  errorCount: number;
}

// ── PlanExecutor Class ──

export class PlanExecutor {
  private model: ModelAdapter;
  private toolRegistry: ToolRegistry;
  private debug: boolean;
  /** Max number of tasks running in parallel (e.g., sandbox instances) */
  private static readonly MAX_CONCURRENT_TASKS = 3;

  constructor(model: ModelAdapter, toolRegistry: ToolRegistry, debug = false) {
    this.model = model;
    this.toolRegistry = toolRegistry;
    this.debug = debug;
  }

  /**
   * Execute a decomposition plan.
   * Resolves dependencies via topological sort, executes in order,
   * parallel groups run with concurrency limit.
   */
  async execute(plan: DecompositionResult): Promise<ExecutionReport> {
    const startTime = Date.now();
    const results: TaskResult[] = [];
    let errorCount = 0;

    // Topological sort: group tasks by dependency depth
    const levels = this.buildLevels(plan.subTasks);

    if (this.debug) {

      for (let i = 0; i < levels.length; i++) {

      }
    }

    // Execute level by level
    for (const level of levels) {
      if (level.length === 1) {
        // Sequential
        const result = await this.executeTask(level[0]);
        results.push(result);
        if (result.error) errorCount++;
      } else {
        // Parallel with concurrency limit: run in chunks of MAX_CONCURRENT_TASKS
        for (let i = 0; i < level.length; i += PlanExecutor.MAX_CONCURRENT_TASKS) {
          const chunk = level.slice(i, i + PlanExecutor.MAX_CONCURRENT_TASKS);
          const chunkResults = await Promise.all(
            chunk.map(task => this.executeTask(task))
          );
          for (const r of chunkResults) {
            results.push(r);
            if (r.error) errorCount++;
          }
        }
      }
    }

    const totalDurationMs = Date.now() - startTime;

    return {
      task: plan.task,
      results,
      totalDurationMs,
      success: errorCount === 0,
      errorCount,
    };
  }

  // ── Private: Task Execution ──

  private async executeTask(task: SubTask): Promise<TaskResult> {
    const startTime = Date.now();
    const startedAt = new Date().toISOString();

    if (this.debug) {

    }

    try {
      let output: string;

      switch (task.type) {
        case 'llm':
          output = await this.executeLlm(task);
          break;
        case 'tool':
          output = await this.executeTool(task);
          break;
        case 'sop':
          output = await this.executeSop(task);
          break;
        case 'parallel':
          output = await this.executeLlm(task); // parallel = LLM with context from sibling tasks (handled by caller)
          break;
        default:
          output = await this.executeLlm(task);
      }

      return {
        id: task.id,
        description: task.description,
        type: task.type,
        output,
        startedAt,
        finishedAt: new Date().toISOString(),
        durationMs: Date.now() - startTime,
      };
    } catch (err: any) {
      return {
        id: task.id,
        description: task.description,
        type: task.type,
        output: '',
        error: err.message,
        startedAt,
        finishedAt: new Date().toISOString(),
        durationMs: Date.now() - startTime,
      };
    }
  }

  private async executeLlm(task: SubTask): Promise<string> {
    const response: ModelResponse = await this.model.invoke([
      {
        role: 'system',
        content: `Execute the following sub-task concisely.
Focus only on what's required. Do not perform tasks that are assigned to other sub-tasks.

Expected output: ${task.expectedOutput}`,
      },
      {
        role: 'user',
        content: task.description,
      },
    ], {
      temperature: 0.5,
      maxTokens: 2048,
    });

    return response.content;
  }

  private async executeTool(task: SubTask): Promise<string> {
    // Parse tool name: "tool_name(args)" or just "tool_name"
    const toolMatch = task.description.match(/^(\w[\w-]*)(?:\(([^)]*)\))?/);
    if (!toolMatch) {
      throw new Error(`Cannot parse tool from: ${task.description}`);
    }

    const toolName = toolMatch[1];

    // Execute via registry
    const result = await this.toolRegistry.execute(toolName, {});
    return typeof result === 'string' ? result : JSON.stringify(result, null, 2);
  }

  private async executeSop(_task: SubTask): Promise<string> {
    // SOP execution will be implemented in Phase 7.1
    return `SOP execution not yet implemented for task: ${_task.description}`;
  }

  // ── Private: Topological Sort ──

  /**
   * Build dependency levels from sub-tasks.
   * Level 0: no dependencies
   * Level N: requires at least one task from level N-1
   * Tasks in the same level with the same requires can run in parallel.
   */
  private buildLevels(subTasks: SubTask[]): SubTask[][] {
    const taskMap = new Map<string, SubTask>();
    for (const t of subTasks) {
      taskMap.set(t.id, t);
    }

    // Assign level to each task
    const levelMap = new Map<string, number>();

    const getLevel = (task: SubTask): number => {
      if (levelMap.has(task.id)) return levelMap.get(task.id)!;

      if (!task.requires || task.requires.length === 0) {
        levelMap.set(task.id, 0);
        return 0;
      }

      let maxDepLevel = -1;
      for (const depId of task.requires) {
        const dep = taskMap.get(depId);
        if (dep) {
          const depLevel = getLevel(dep);
          maxDepLevel = Math.max(maxDepLevel, depLevel);
        }
      }

      const level = maxDepLevel + 1;
      levelMap.set(task.id, level);
      return level;
    };

    for (const task of subTasks) {
      getLevel(task);
    }

    // Group by level
    const maxLevel = Math.max(...levelMap.values(), 0);
    const levels: SubTask[][] = [];

    for (let l = 0; l <= maxLevel; l++) {
      const levelTasks = subTasks.filter(t => levelMap.get(t.id) === l);
      if (levelTasks.length > 0) {
        levels.push(levelTasks);
      }
    }

    return levels;
  }
}

