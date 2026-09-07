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
import { atomicWriteFileSync } from './atomic-write.js';

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
  /** R2 §B: set once by engine boot recovery — this task survived a crash */
  recovery?: {
    recoveredAtBoot: string;
    provenCompletedTools: number;
    note: string;
  };
  /** Phase 4: tools marked 'running' at crash — UNCERTAIN classification */
  uncertainTools?: string[];
  /** Phase 4: classification timestamp (when snapshot was classified) */
  classifiedAt?: string;
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
  // Fix C: single source of truth — active requestId per session
  private activeTaskBySession: Map<string, string> = new Map();

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
    // Fix C: this requestId is now the active task for the session
    this.activeTaskBySession.set(sessionId, requestId);
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
   * Phase 4A: Classify an in-progress snapshot after restart.
   * Identifies tools with status 'pending' or 'running' → UNCERTAIN classification.
   * Does NOT re-execute or resume anything. Annotates snapshot in place.
   *
   * Both 'pending' and 'running' are UNCERTAIN after restart:
   * - pending: tool was requested but markToolRunning() may or may not have been called
   * - running: markToolRunning() was called, execution status unknown
   * Neither has completion proof via checkpoint.cycle().
   */
  classifySnapshot(requestId: string): void {
    const snapshot = this.snapshots.get(requestId);
    if (!snapshot || (snapshot.status !== 'in_progress' && snapshot.status !== 'started')) return;
    const uncertain: string[] = [];
    for (const cycle of snapshot.cycles) {
      for (const [toolCallId, status] of Object.entries(cycle.toolStatus)) {
        if (status === 'pending' || status === 'running') {
          uncertain.push(toolCallId);
        }
      }
    }
    if (uncertain.length > 0) {
      snapshot.uncertainTools = uncertain;
      snapshot.classifiedAt = new Date().toISOString();
      this.dirty = true;
      log.warn(`[CP] classifySnapshot: ${requestId} — ${uncertain.length} UNCERTAIN tool(s): ${uncertain.join(', ')}`);
    } else {
      // No uncertain tools, but snapshot is non-terminal — mark as classified (clean)
      snapshot.classifiedAt = new Date().toISOString();
      this.dirty = true;
    }
  }

  /**
   * Phase 4A: Get all UNCERTAIN tools (status 'pending' or 'running') for a session
   * across all checkpoints. Used for recovery classification after restart.
   * Returns Map<requestId, toolCallId[]> for all snapshots in the session.
   */
  getRunningToolsForSession(sessionId: string): Map<string, string[]> {
    const result = new Map<string, string[]>();
    for (const snapshot of this.snapshots.values()) {
      if (snapshot.sessionId !== sessionId) continue;
      const uncertain: string[] = [];
      for (const cycle of snapshot.cycles) {
        for (const [toolCallId, status] of Object.entries(cycle.toolStatus)) {
          if (status === 'pending' || status === 'running') uncertain.push(toolCallId);
        }
      }
      if (uncertain.length > 0) {
        result.set(snapshot.requestId, uncertain);
      }
    }
    return result;
  }

  /**
   * R2 §6 — proven-completed tool call IDs for an in-progress snapshot.
   * P0: persist terminal state IMMEDIATELY (not waiting for periodic flush) —
   * otherwise disk keeps the last in_progress file and restart resurrects the task.
   */
  complete(requestId: string, result: { content: string; modelUsed: string; providerUsed: string }): void {
    const snapshot = this.snapshots.get(requestId);
    if (!snapshot) return;
    snapshot.status = 'completed';
    snapshot.result = result;
    // Fix C: task done — clear active mapping for this session
    if (this.activeTaskBySession.get(snapshot.sessionId) === requestId) {
      this.activeTaskBySession.delete(snapshot.sessionId);
    }
    this.dirty = true;
    this.persistTerminal(requestId);
    log.info(`[CP] complete: ${requestId} — ${result.modelUsed}`);
  }

  /**
   * Mark request as failed.
   * P0: same immediate-persist guarantee as complete().
   */
  failed(requestId: string, error: { message: string; stack?: string }): void {
    const snapshot = this.snapshots.get(requestId);
    if (!snapshot) return;
    snapshot.status = 'failed';
    snapshot.error = error;
    // Fix C: task done — clear active mapping for this session
    if (this.activeTaskBySession.get(snapshot.sessionId) === requestId) {
      this.activeTaskBySession.delete(snapshot.sessionId);
    }
    this.dirty = true;
    this.persistTerminal(requestId);
    log.info(`[CP] failed: ${requestId} — ${error.message.slice(0, 100)}`);
  }

  // ── P0/P1: terminal-state durable write ──
  // Ghi snapshot terminal (completed/failed) xuống disk NGAY, rồi xóa toàn bộ
  // chain cp-{requestId}-*.json cũ — disk giữ đúng 1 file terminal mới nhất.
  // Thứ tự ghi-trước-xóa-sau: crash giữa chừng không làm mất terminal state.
  private persistTerminal(requestId: string): void {
    const snapshot = this.snapshots.get(requestId);
    if (!snapshot) return;
    const now = Date.now();
    const filePath = path.join(this.config.checkpointDir, `cp-${requestId}-${now}.json`);
    const prefix = `cp-${requestId}-`;
    // R2 §3: tmp+rename — bare writeFileSync can tear on crash mid-write
    atomicWriteFileSync(filePath, JSON.stringify(snapshot, null, 2));
    const basename = path.basename(filePath);
    for (const f of fs.readdirSync(this.config.checkpointDir)) {
      if (f.startsWith(prefix) && f !== basename) {
        try { fs.unlinkSync(path.join(this.config.checkpointDir, f)); } catch { /* locked/in-use */ }
      }
    }
    log.info(`[CP] terminal persist: ${requestId} → ${basename} (${snapshot.status}), cleaned ${prefix}* chain`);
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

  // ── Read / Restore ──

  /**
   * Fix C: get the active requestId for a session, if any.
   */
  getActiveTaskForSession(sessionId: string): string | null {
    return this.activeTaskBySession.get(sessionId) ?? null;
  }

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

      // Fix B: dedup in-progress per session BEFORE building activeTaskBySession.
      // >1 in_progress for same session (restart race) → keep newest by startedAt,
      // mark the rest failed:duplicate_on_resume so the active map stays unambiguous.
      const dupBySession = new Map<string, CheckpointSnapshot[]>();
      for (const snap of this.snapshots.values()) {
        if (snap.status !== 'in_progress' && snap.status !== 'started') continue;
        const list = dupBySession.get(snap.sessionId) ?? [];
        list.push(snap);
        dupBySession.set(snap.sessionId, list);
      }
      for (const [sessId, list] of dupBySession) {
        if (list.length <= 1) continue;
        list.sort((a, b) => b.startedAt.localeCompare(a.startedAt));
        log.error(`[CP] Fix B: session ${sessId} has ${list.length} in_progress snapshots — keeping ${list[0].requestId}`);
        for (const stale of list.slice(1)) {
          stale.status = 'failed';
          stale.error = { message: 'duplicate_on_resume: superseded by newer task in same session' };
          this.dirty = true;
          log.warn(`[CP] Fix B: ${stale.requestId} → failed:duplicate_on_resume`);
        }
      }

      // Fix C: build activeTaskBySession from clean (post-dedup) state.
      this.activeTaskBySession.clear();
      const inProgress = this.getAllInProgress();
      if (inProgress.length > 0) {
        log.warn(`⚠️ Found ${inProgress.length} in-progress task(s) from previous run:`);
        for (const cp of inProgress) {
          log.warn(`   ${cp.requestId} (${cp.sessionId}) — ${cp.cycles.length} cycle(s) recorded`);
          this.activeTaskBySession.set(cp.sessionId, cp.requestId);
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
        // R2 §3: tmp+rename (atomic) — crash mid-write must not tear the file
        atomicWriteFileSync(filePath, JSON.stringify(snapshot, null, 2));
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

  // ── R2 Recovery (§A/§B/§C) ──

  /**
   * R2 §6 — proven-completed tool call IDs for an in-progress snapshot.
   * A tool is PROVEN done only if a finished cycle recorded it completed.
   */
  getProvenCompletedToolIds(requestId: string): Set<string> {
    const snapshot = this.snapshots.get(requestId);
    if (!snapshot) return new Set();
    const done = new Set<string>();
    for (const cycle of snapshot.cycles) {
      for (const [toolCallId, st] of Object.entries(cycle.toolStatus)) {
        if (st === 'completed') done.add(toolCallId);
      }
      for (const a of cycle.completedActions) done.add(a.id);
    }
    return done;
  }

  /** R2 §B: annotate a snapshot as recovered-at-boot (once, idempotent). */
  markRecovered(requestId: string, note: string): void {
    const snapshot = this.snapshots.get(requestId);
    if (!snapshot || snapshot.recovery) return;
    const proven = this.getProvenCompletedToolIds(requestId).size;
    snapshot.recovery = {
      recoveredAtBoot: new Date().toISOString(),
      provenCompletedTools: proven,
      note,
    };
    this.dirty = true;
    log.warn(
      `[CP] R2 recovery: ${requestId} marked recovered — ${proven} proven-completed tool(s), ` +
      `running/pending tools have NO completion proof and may re-execute if the task resumes`,
    );
  }

  /**
   * R2 §A: synchronous best-effort flush for the crash handler.
   * Uses fs.writeFileSync directly (no async) so it can run before process.exit().
   * Best-effort only — cannot help with SIGKILL/power loss or if this throws.
   */
  flushSync(): void {
    try {
      const now = Date.now();
      let count = 0;
      for (const [requestId, snapshot] of Array.from(this.snapshots.entries())) {
        if (snapshot.status === 'completed') continue; // terminal state already on disk
        const filePath = path.join(this.config.checkpointDir, `cp-${requestId}-${now}.json`);
        atomicWriteFileSync(filePath, JSON.stringify(snapshot, null, 2));
        count++;
      }
      log.info(`[CP] flushSync (crash path): ${count} checkpoint(s) written`);
    } catch (err: any) {
      // Never let the crash handler throw — exit code comes from the handler
      log.error(`[CP] flushSync failed: ${err.message}`);
    }
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
