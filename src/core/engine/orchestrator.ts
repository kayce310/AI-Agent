/**
 * @file orchestrator — Core Engine component
 * @layer core
 * @depends-on src/core/tools/tool-registry.ts, src/core/llm/model-adapter.ts
 * @imported-by src/scripts/start-discord.ts
 * @owner core-engine
 */

/**
 * Kato Agent — Orchestrator (Bernstein Deterministic Orchestration Pipeline)
 * Phase 5.2 — Integrate Decomposer + PlanExecutor + ResultSynthesizer
 *
 * Wraps the 3-phase pipeline into a single entry point:
 *   decompose → execute → synthesize
 *
 * Can be used standalone or via Engine.process() when a task is provided.
 */

import { ModelAdapter } from '../llm/model-adapter.js';
import { ToolRegistry } from '../tools/tool-registry.js';
import { Decomposer, DecompositionResult } from './decomposer.js';
import { PlanExecutor, ExecutionReport } from './plan-executor.js';
import { ResultSynthesizer } from './result-synthesizer.js';
import { HookRegistry, globalHooks } from '../hooks.js';
import { evolutionEngine } from '../evolution.js';
import { executeBootSequence } from './boot.js';

// ── Types ──

export interface OrchestratorOptions {
  model: ModelAdapter;
  toolRegistry: ToolRegistry;
  hooks?: HookRegistry;
  debug?: boolean;
}

export interface OrchestrationResult {
  content: string;
  decomposition?: DecompositionResult;
  executionReport?: ExecutionReport;
  totalDurationMs: number;
}

// ── Orchestrator Class ──

export class Orchestrator {
  private decomposer: Decomposer;
  private executor: PlanExecutor;
  private synthesizer: ResultSynthesizer;
  private hooks: HookRegistry;
  private debug: boolean;

  constructor(options: OrchestratorOptions) {
    this.decomposer = new Decomposer(options.model, options.debug ?? false);
    this.executor = new PlanExecutor(options.model, options.toolRegistry, options.debug ?? false);
    this.synthesizer = new ResultSynthesizer(options.model, options.debug ?? false);
    this.hooks = options.hooks ?? globalHooks;
    this.debug = options.debug ?? false;
  }

  /**
   * Detect cycles in the task dependency graph using DFS.
   * Returns error message if cycle found, null if no cycle.
   */
  private detectCycle(tasks: { id: string; requires: string[] }[]): string | null {
    const graph = new Map<string, string[]>();
    const visited = new Set<string>();
    const recStack = new Set<string>();

    // Build adjacency list
    for (const task of tasks) {
      graph.set(task.id, task.requires);
    }

    // DFS cycle detection
    const dfs = (node: string): boolean => {
      if (!visited.has(node)) {
        visited.add(node);
        recStack.add(node);

        const neighbors = graph.get(node) || [];
        for (const neighbor of neighbors) {
          if (!visited.has(neighbor)) {
            if (dfs(neighbor)) return true;
          } else if (recStack.has(neighbor)) {
            return true; // Cycle detected
          }
        }
      }
      recStack.delete(node);
      return false;
    };

    // Check each node
    for (const node of graph.keys()) {
      if (!visited.has(node)) {
        if (dfs(node)) {
          // Find the cycle path for better error message
          const cyclePath = this.findCyclePath(graph, node);
          return `Circular dependency detected: ${cyclePath.join(' → ')}`;
        }
      }
    }

    return null;
  }

  /**
   * Helper to find the actual cycle path for better error reporting.
   */
  private findCyclePath(graph: Map<string, string[]>, start: string): string[] {
    const visited = new Set<string>();
    const path: string[] = [];
    const stack: string[] = [start];

    while (stack.length > 0) {
      const node = stack.pop()!;
      if (visited.has(node)) {
        // Found cycle, return path from first occurrence of node to end
        const idx = path.indexOf(node);
        if (idx !== -1) {
          return [...path.slice(idx), node];
        }
        continue;
      }
      visited.add(node);
      path.push(node);
      const neighbors = graph.get(node) || [];
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          stack.push(neighbor);
        }
      }
    }

    return [start]; // fallback
  }

  /**
   * Run the full orchestration pipeline: decompose → execute → synthesize.
   * Emits hook events at each phase for observability.
   */
  async run(task: string, context?: string): Promise<OrchestrationResult> {
    // ── Boot sequence check ──
    const boot = await executeBootSequence(process.cwd());
    if (boot.blocked) {
      const msg = `Boot sequence blocked: ${boot.reason}`;
      console.error(`❌ ${msg}`);
      if (boot.p0Items) {
        console.error(`   P0 items: ${boot.p0Items.map(i => `[${i.id}] ${i.description}`).join('; ')}`);
      }
      throw new Error(msg);
    }

    const startTime = Date.now();

    if (this.debug) {
      console.log(`🎬 Orchestrator: running pipeline for "${task.substring(0, 60)}..."`);
    }

    // ── Phase 1: Decompose ──
    await this.hooks.emit('orchestrator:decompose-start', { task });

    let decomposition: DecompositionResult;
    try {
      decomposition = await this.decomposer.decompose(task, context);
    } catch (err: any) {
      evolutionEngine.recordError({
        modelId: 'orchestrator',
        errorType: 'ORCHESTRATOR_DECOMPOSE_FAILED',
        errorMessage: err.message,
        contextSnippet: task.substring(0, 200),
        sessionId: 'orchestrator',
      }).catch(() => {});
      throw new Error(`Decomposition failed: ${err.message}`);
    }

    await this.hooks.emit('orchestrator:decompose-end', {
      task,
      subTaskCount: decomposition.subTasks.length,
    });

    // ── DAG Cycle Detection ──
    const cycleError = this.detectCycle(decomposition.subTasks.map(st => ({
      id: st.id,
      requires: st.requires || []
    })));
    if (cycleError) {
      console.error(`❌ DAG Cycle Detected: ${cycleError}`);
      evolutionEngine.recordError({
        modelId: 'orchestrator',
        errorType: 'ORCHESTRATOR_DAG_CYCLE',
        errorMessage: cycleError,
        contextSnippet: task.substring(0, 200),
        sessionId: 'orchestrator',
      }).catch(() => {});
      throw new Error(`DAG Cycle Detected: ${cycleError}`);
    }

    // ── Phase 2: Execute ──
    await this.hooks.emit('orchestrator:execute-start', {
      task,
      subTaskCount: decomposition.subTasks.length,
    });

    let report: ExecutionReport;
    try {
      report = await this.executor.execute(decomposition);
    } catch (err: any) {
      evolutionEngine.recordError({
        modelId: 'orchestrator',
        errorType: 'ORCHESTRATOR_EXECUTE_FAILED',
        errorMessage: err.message,
        contextSnippet: task.substring(0, 200),
        sessionId: 'orchestrator',
      }).catch(() => {});
      throw new Error(`Execution failed: ${err.message}`);
    }

    await this.hooks.emit('orchestrator:execute-end', {
      task,
      success: report.success,
      errorCount: report.errorCount,
      totalDurationMs: report.totalDurationMs,
    });

    // ── Phase 3: Synthesize ──
    await this.hooks.emit('orchestrator:synthesize-start', { task });

    let content: string;
    try {
      content = await this.synthesizer.synthesize(report, task);
    } catch (err: any) {
      // Synthesizer has its own fallback, but just in case
      content = report.results
        .filter(r => !r.error)
        .map(r => r.output)
        .join('\n\n');
    }

    await this.hooks.emit('orchestrator:synthesize-end', {
      task,
      contentLength: content.length,
    });

    const totalDurationMs = Date.now() - startTime;

    if (this.debug) {
      console.log(`🎬 Orchestrator: done in ${totalDurationMs}ms (${decomposition.subTasks.length} tasks, ${report.errorCount} errors)`);
    }

    return {
      content,
      decomposition,
      executionReport: report,
      totalDurationMs,
    };
  }
}