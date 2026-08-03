/**
 * @file checkpoint — Durable Agent State Checkpoint
 * @layer core
 * @owner core-engine
 *
 * Coral Agent Checkpoint System — Phase 1 (Revised)
 *
 * Architecture:
 * ┌─────────────┐
 * │ Engine      │  processInner() → checkpoint.start()
 * │             │  cycle end      → checkpoint.cycle()
 * │             │  success        → checkpoint.complete()
 * │             │  error          → checkpoint.failed()
 * └──────┬──────┘
 *        │
 * ┌──────▼────────────────────────────────────────┐
 * │ CheckpointStore                               │
 * │  .start()   — first entry, request metadata    │
 * │  .cycle()   — each ReAct turn, minimal data     │
 * │  .complete()— mark success                     │
 * │  .failed()  — mark error + save context        │
 * │  .restore() — rebuild from checkpoint on crash  │
 * │  .flush()   — periodic sync to disk             │
 * └───────────────────────────────────────────────┘
 *
 * ToolStatus tracking prevents duplicate side effects:
 *   toolStatus[toolCallId] = 'pending' | 'running' | 'completed'
 */

import * as fs from 'fs';
import * as path from 'path';
import { Logger } from './logger.js';
import type { TaskPlan } from './plan/types.js';

const log = new Logger({ module: 'Checkpoint' });

// ── Types ──

export interface CycleData {
  cycle: number;
  currentGoal: string;
  pendingActions: ToolCallSnapshot[];
  completedActions: ToolCallSnapshot[];
  toolResultsSummary: string;
  toolStatus: Record<string, ToolStatus>;
}

export type ToolStatus = 'pending' | 'running' | 'completed';

export interface ToolCallSnapshot {
  id: string;
  name: string;
  args: Record<string, unknown>;
  status: ToolStatus;
}

export interface CheckpointSnapshot {
  requestId: string;
  sessionId: string;
  status: 'started' | 'in_progress' | 'completed' | 'failed';
  startedAt: string;
  cycles: CycleData[];
  /** MỚI — State-Driven Task Plan, replaces old heuristic intent detection */
  plan?: TaskPlan;
  error?: {
    message: string;
    stack?: string;
  };
  result?: {
    content: string;
    modelUsed: string;
    providerUsed: string;
  };
}

// ── Config ──

export interface CheckpointConfig {
  checkpointDir?: string;
  autoFlushIntervalMs?: number;
  maxFiles?: number;
}

const DEFAULT_CONFIG: Required<CheckpointConfig> = {
  checkpointDir: path.join(process.cwd(), 'knowledge', 'checkpoints'),
  autoFlushIntervalMs: 60_000,
  maxFiles: 100,
};

// ── Checkpoint Store ──

export class CheckpointStore {
  private config: Required<CheckpointConfig>;
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private snapshots: Map<string, CheckpointSnapshot> = new Map();
  private dirty = false;
  // ponytail: plan storage decoupled from request snapshot lifecycle (ADR-001)
  private plans: Map<string, TaskPlan> = new Map();

  constructor(config?: CheckpointConfig) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // ── Lifecycle ──

  async init(): Promise<void> {
    fs.mkdirSync(this.config.checkpointDir, { recursive: true });
    await this.loadFromDisk();
    this.flushTimer = setInterval(() => this.flush(), this.config.autoFlushIntervalMs);
    if (typeof this.flushTimer === 'object' && 'unref' in this.flushTimer) {
      (this.flushTimer as NodeJS.Timeout).unref();
    }
    log.info(`CheckpointStore initialized: ${this.config.checkpointDir}`);
  }

  async shutdown(): Promise<void> {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    await this.flush();
    log.info('CheckpointStore shut down');
  }

  // ── Write Operations ──

  /**
   * Start a new request checkpoint.
   * Called when Engine.processInner() begins.
   */
  start(requestId: string, sessionId: string, currentGoal: string): void {
    this.snapshots.set(requestId, {
      requestId,
      sessionId,
      status: 'started',
      startedAt: new Date().toISOString(),
      cycles: [],
    });
    this.dirty = true;
    log.info(`[CP] start: ${requestId} — "${currentGoal.slice(0, 60)}"`);
  }

  /**
   * Record a completed ReAct cycle.
   * Called after tool execution finishes in Agent.executeReActLoop().
   */
  cycle(
    requestId: string,
    cycle: number,
    currentGoal: string,
    toolCalls: { id: string; name: string; args: Record<string, unknown> }[],
    toolResults: { id: string; result: unknown }[],
  ): void {
    const snapshot = this.snapshots.get(requestId);
    if (!snapshot) return;

    const pending: ToolCallSnapshot[] = [];
    const completed: ToolCallSnapshot[] = [];
    const toolStatus: Record<string, ToolStatus> = {};

    for (const tc of toolCalls) {
      const done = toolResults.find(r => r.id === tc.id);
      if (done) {
        completed.push({ ...tc, status: 'completed' });
        toolStatus[tc.id] = 'completed';
      } else {
        pending.push({ ...tc, status: 'pending' });
        toolStatus[tc.id] = 'pending';
      }
    }

    const toolResultsSummary = toolResults
      .map(r => {
        const raw = String(r.result ?? '');
        return raw.length > 200 ? raw.slice(0, 200) + '...' : raw;
      })
      .join(' | ');

    snapshot.cycles.push({
      cycle,
      currentGoal,
      pendingActions: pending,
      completedActions: completed,
      toolResultsSummary: toolResultsSummary.slice(0, 500),
      toolStatus,
    });
    snapshot.status = 'in_progress';
    this.dirty = true;
  }

  /**
   * Mark a tool call as 'running' before execution.
   * If crash happens mid-tool, restore will see 'running' → skip re-execution.
   */
  markToolRunning(requestId: string, toolCallId: string): void {
    const snapshot = this.snapshots.get(requestId);
    if (!snapshot) return;
    const lastCycle = snapshot.cycles[snapshot.cycles.length - 1];
    if (!lastCycle) return;
    lastCycle.toolStatus[toolCallId] = 'running';
    this.dirty = true;
  }

  /**
   * Mark request as completed successfully.
   */
  complete(requestId: string, result: { content: string; modelUsed: string; providerUsed: string }): void {
    const snapshot = this.snapshots.get(requestId);
    if (!snapshot) return;
    snapshot.status = 'completed';
    snapshot.result = result;
    this.dirty = true;
    log.info(`[CP] complete: ${requestId} — ${result.modelUsed}`);
  }

  /**
   * Mark request as failed.
   */
  failed(requestId: string, error: { message: string; stack?: string }): void {
    const snapshot = this.snapshots.get(requestId);
    if (!snapshot) return;
    snapshot.status = 'failed';
    snapshot.error = error;
    this.dirty = true;
    log.info(`[CP] failed: ${requestId} — ${error.message.slice(0, 100)}`);
  }

  // ── Plan Management (State-Driven Task Plan) ──

  /**
   * Save or update a TaskPlan for a session's checkpoint.
   */
  setPlan(sessionId: string, plan: TaskPlan): void {
    this.plans.set(sessionId, plan);
    // also mirror onto active snapshot for persistence/restore
    const snapshot = this.getLatestForSession(sessionId);
    if (snapshot) snapshot.plan = plan;
    this.dirty = true;
    log.info(`[CP] setPlan: session=${sessionId} plan=${plan.id} status=${plan.status} items=${plan.items.length}`);
  }

  /**
   * Get the active TaskPlan for a session, if any.
   */
  getPlan(sessionId: string): TaskPlan | null {
    return this.plans.get(sessionId) ?? this.getLatestForSession(sessionId)?.plan ?? null;
  }

  /**
   * Check whether a session has an active plan (status ∈ {pending, running, paused_limit, waiting_user}).
   * Used by Engine routing to decide whether to enter Planning Phase or inject existing plan.
   */
  hasActivePlan(sessionId: string): boolean {
    const plan = this.getPlan(sessionId);
    if (!plan) return false;
    return plan.status === 'pending'
      || plan.status === 'running'
      || plan.status === 'paused_limit'
      || plan.status === 'waiting_user';
  }

  /**
   * Remove a plan from a session's checkpoint.
   */
  clearPlan(sessionId: string): void {
    this.plans.delete(sessionId);
    const snapshot = this.getLatestForSession(sessionId);
    if (snapshot) {
      delete snapshot.plan;
      this.dirty = true;
    }
  }

  // ── Read / Restore ──

  /**
   * Get the latest checkpoint for a session.
   * Used on startup to check for in-progress work.
   */
  getLatestForSession(sessionId: string): CheckpointSnapshot | null {
    let latest: CheckpointSnapshot | null = null;
    for (const snapshot of this.snapshots.values()) {
      if (snapshot.sessionId !== sessionId) continue;
      if (snapshot.status === 'completed' || snapshot.status === 'failed') continue;
      if (!latest || snapshot.startedAt > latest.startedAt) {
        latest = snapshot;
      }
    }
    return latest;
  }

  /**
   * Get all in-progress checkpoints.
   * Used on startup to list tasks that need attention.
   */
  getAllInProgress(): CheckpointSnapshot[] {
    const result: CheckpointSnapshot[] = [];
    for (const snapshot of this.snapshots.values()) {
      if (snapshot.status === 'in_progress' || snapshot.status === 'started') {
        result.push(snapshot);
      }
    }
    return result.sort((a, b) => a.startedAt.localeCompare(b.startedAt));
  }

  // ── Persistence ──

  private async loadFromDisk(): Promise<void> {
    try {
      const allFiles = fs.readdirSync(this.config.checkpointDir)
        .filter(f => f.startsWith('cp-') && f.endsWith('.json'))
        .sort();

      // Load only the newest maxFiles
      const loadFiles = allFiles.slice(-this.config.maxFiles);
      for (const file of loadFiles) {
        try {
          const content = fs.readFileSync(path.join(this.config.checkpointDir, file), 'utf-8');
          const data = JSON.parse(content);
          if (data.requestId && data.sessionId) {
            this.snapshots.set(data.requestId, data as CheckpointSnapshot);
          }
        } catch { /* skip corrupt files */ }
      }

      // Delete excess files from disk (oldest first, beyond maxFiles)
      const excessCount = allFiles.length - this.config.maxFiles;
      if (excessCount > 0) {
        let deleted = 0;
        for (const file of allFiles.slice(0, excessCount)) {
          try {
            fs.unlinkSync(path.join(this.config.checkpointDir, file));
            deleted++;
          } catch { /* skip locked/in-use files */ }
        }
        if (deleted > 0) {
          log.info(`[CP] loadFromDisk: cleaned ${deleted} excess checkpoint file(s) from disk`);
        }
      }

      log.info(`Loaded ${this.snapshots.size} checkpoint(s) from disk`);

      // Log in-progress tasks found
      const inProgress = this.getAllInProgress();
      if (inProgress.length > 0) {
        log.warn(`⚠️ Found ${inProgress.length} in-progress task(s) from previous run:`);
        for (const cp of inProgress) {
          log.warn(`   ${cp.requestId} (${cp.sessionId}) — ${cp.cycles.length} cycle(s) recorded`);
        }
      }
    } catch (err: any) {
      log.warn(`No checkpoints to load: ${err.message}`);
    }
  }

  async flush(): Promise<void> {
    if (!this.dirty) return;

    try {
      const now = Date.now();
      // Only flush non-completed snapshots; completed ones are already done
      let count = 0;
      for (const [requestId, snapshot] of this.snapshots) {
        if (snapshot.status === 'completed') continue; // no need to persist completed
        const filePath = path.join(this.config.checkpointDir, `cp-${requestId}-${now}.json`);
        fs.writeFileSync(filePath, JSON.stringify(snapshot, null, 2), 'utf-8');
        count++;
      }

      // Cleanup old checkpoint files but KEEP in-progress ones
      const files = fs.readdirSync(this.config.checkpointDir)
        .filter(f => f.startsWith('cp-'))
        .sort()
        .reverse();

      // Keep track of which requestIds are still in-progress
      const inProgressIds = new Set<string>();
      for (const [rid, snap] of Array.from(this.snapshots.entries())) {
        if (snap.status !== 'completed') inProgressIds.add(rid);
      }

      // Index-based iteration: files[0..maxFiles-1] are newest → keep
      // files[maxFiles..] are oldest → safe to delete (unless in-progress)
      let deletedCount = 0;
      for (let i = this.config.maxFiles; i < files.length; i++) {
        const file = files[i];
        // Skip files for in-progress checkpoints
        if (inProgressIds.size > 0) {
          let isInProgress = false;
          for (const rid of inProgressIds) {
            if (file.includes(`cp-${rid}-`)) {
              isInProgress = true;
              break;
            }
          }
          if (isInProgress) continue;
        }

        try {
          fs.unlinkSync(path.join(this.config.checkpointDir, file));
          deletedCount++;
        } catch { /* skip */ }
      }

      // ── TTL cleanup for plans ──
      // Plans in {paused_limit, waiting_user} that exceed abandonAfterMs → auto-abort
      const nowMs = Date.now();
      for (const [, snapshot] of this.snapshots) {
        const plan = snapshot.plan;
        if (!plan) continue;
        if (plan.status !== 'paused_limit' && plan.status !== 'waiting_user') continue;
        if (nowMs - plan.createdAt <= plan.abandonAfterMs) continue;
        plan.status = 'aborted';
        plan.stopReason = 'ttl_expired';
        log.info(`[CP] TTL abort: plan ${plan.id} — expired after ${((nowMs - plan.createdAt) / 1000 / 60).toFixed(1)} min`);
      }

      this.dirty = false;
      if (count > 0 || deletedCount > 0) {
        log.info(`[CP] flush: ${count} checkpoint(s) written, ${deletedCount} old file(s) cleaned`);
      }
    } catch (err: any) {
      log.error(`[CP] flush failed: ${err.message}`);
    }
  }

  /**
   * Remove a completed/failed checkpoint from active tracking.
   */
  clear(requestId: string): void {
    this.snapshots.delete(requestId);
    this.dirty = true;
  }
}

// ── Singleton ──

let globalCheckpoint: CheckpointStore | null = null;

export function getCheckpoint(): CheckpointStore {
  if (!globalCheckpoint) {
    globalCheckpoint = new CheckpointStore();
  }
  return globalCheckpoint;
}

export default CheckpointStore;
