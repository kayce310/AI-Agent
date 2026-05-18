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
import { HookRegistry, globalHooks } from '../core/hooks.js';
import { evolutionEngine } from '../core/evolution.js';

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
   * Run the full orchestration pipeline: decompose → execute → synthesize.
   * Emits hook events at each phase for observability.
   */
  async run(task: string, context?: string): Promise<OrchestrationResult> {
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