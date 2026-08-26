/**
 * @file task-queue — Background Task Queue
 * @layer core
 * @owner core-engine
 *
 * Phase 2: Explicit task model (interactive vs background).
 * Interactive tasks run synchronously with REQUEST_TIMEOUT_MS.
 * Background tasks run in a separate worker with no timeout.
 *
 * Architecture:
 * ┌─────────────┐     interactive    ┌──────────────────┐
 * │   Gateway    │ ──────────────────→│ Engine.process() │
 * │  .process()  │                    └──────────────────┘
 * │              │     background     ┌──────────────────┐
 * │              │ ──────────────────→│ TaskQueue         │
 * └─────────────┘                    │  .enqueue(task)   │
 *                                     │  ↓                │
 *                                     │  Worker loop      │
 *                                     │  .processNext()   │
 *                                     │  → Engine (inner) │
 *                                     └──────────────────┘
 */

import * as fs from 'fs';
import * as path from 'path';
import { Logger } from './logger.js';
import { EngineRequest } from './types.js';
import { getCheckpoint } from './checkpoint.js';
import { atomicWriteFileSync } from './atomic-write.js';

const log = new Logger({ module: 'TaskQueue' });

// ── Types ──

export type TaskType = 'interactive' | 'background';
// R2 §C: 'interrupted' = was running at an unexpected crash AND checkpoint data
// shows proven partial completion → NOT auto-requeued; requires explicit re-enqueue.
export type TaskStatus = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled' | 'interrupted';

export interface BackgroundTask {
  id: string;
  sessionId: string;
  request: EngineRequest;
  status: TaskStatus;
  progress: string;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  result?: string;
  error?: string;
}

export interface TaskQueueConfig {
  dataDir?: string;
  pollIntervalMs?: number;
  /** Callback fired when a task's progress updates */
  onProgress?: (taskId: string, sessionId: string, progress: string) => void;
  /** Callback fired when a task completes */
  onComplete?: (taskId: string, sessionId: string, result: string) => void;
  /** Callback fired when a task fails */
  onError?: (taskId: string, sessionId: string, error: string) => void;
  /** Function to execute a background task — usually Engine.processInner() equivalent */
  executor?: (request: EngineRequest) => Promise<{ content: string; modelUsed: string; providerUsed: string }>;
}

const DEFAULT_CONFIG: Required<TaskQueueConfig> = {
  dataDir: path.join(process.cwd(), 'knowledge', 'tasks'),
  pollIntervalMs: 2_000,
  onProgress: () => {},
  onComplete: () => {},
  onError: () => {},
  executor: async () => ({ content: '', modelUsed: 'none', providerUsed: 'none' }),
};

// ── Task Queue ──

export class TaskQueue {
  private config: Required<TaskQueueConfig>;
  private tasks: Map<string, BackgroundTask> = new Map();
  private workerTimer: ReturnType<typeof setInterval> | null = null;
  private running = false;
  private activeTaskId: string | null = null;

  constructor(config?: TaskQueueConfig) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // ── Lifecycle ──

  async init(): Promise<void> {
    fs.mkdirSync(this.config.dataDir, { recursive: true });
    await this.loadFromDisk();
    log.info(`TaskQueue initialized (${this.tasks.size} task(s) loaded)`);
  }

  start(): void {
    if (this.workerTimer) return;
    this.workerTimer = setInterval(() => this.tick(), this.config.pollIntervalMs);
    if (typeof this.workerTimer === 'object' && 'unref' in this.workerTimer) {
      (this.workerTimer as NodeJS.Timeout).unref();
    }
    log.info(`TaskQueue worker started (poll interval: ${this.config.pollIntervalMs}ms)`);
  }

  async stop(): Promise<void> {
    if (this.workerTimer) {
      clearInterval(this.workerTimer);
      this.workerTimer = null;
    }
    await this.flush();
    log.info('TaskQueue worker stopped');
  }

  // ── Queue Operations ──

  /**
   * Enqueue a background task.
   * Returns the task ID.
   */
  enqueue(request: EngineRequest): string {
    const taskId = `bg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const task: BackgroundTask = {
      id: taskId,
      sessionId: request.sessionId,
      request,
      status: 'queued',
      progress: 'Task queued, waiting for worker...',
      createdAt: Date.now(),
    };
    this.tasks.set(taskId, task);
    this.saveToDisk(taskId);
    log.info(`[TQ] enqueue: ${taskId} — "${(request.task || '').slice(0, 50)}"`);
    return taskId;
  }

  /**
   * Get task status.
   */
  getStatus(taskId: string): BackgroundTask | null {
    return this.tasks.get(taskId) || null;
  }

  /**
   * List all tasks for a session.
   */
  listTasks(sessionId: string): BackgroundTask[] {
    const result: BackgroundTask[] = [];
    for (const task of this.tasks.values()) {
      if (task.sessionId === sessionId) {
        result.push(task);
      }
    }
    return result.sort((a, b) => b.createdAt - a.createdAt);
  }

  /**
   * List all active tasks (queued or running).
   */
  listActiveTasks(): BackgroundTask[] {
    const result: BackgroundTask[] = [];
    for (const task of this.tasks.values()) {
      if (task.status === 'queued' || task.status === 'running') {
        result.push(task);
      }
    }
    return result.sort((a, b) => a.createdAt - b.createdAt);
  }

  /**
   * Cancel a task.
   */
  cancel(taskId: string): boolean {
    const task = this.tasks.get(taskId);
    if (!task) return false;
    if (task.status === 'completed' || task.status === 'cancelled') return false;

    task.status = 'cancelled';
    task.progress = 'Cancelled by user';
    task.completedAt = Date.now();
    this.saveToDisk(taskId);
    log.info(`[TQ] cancel: ${taskId}`);
    return true;
  }

  // ── Worker ──

  private async tick(): Promise<void> {
    if (this.running || !this.config.executor) return;

    // Don't pick up a new task if already processing one
    if (this.activeTaskId) {
      const active = this.tasks.get(this.activeTaskId);
      if (active && (active.status === 'running' || active.status === 'queued')) {
        return; // Still running
      }
      this.activeTaskId = null;
    }

    // Find next queued task
    const nextTask = this.listActiveTasks().find(t => t.status === 'queued');
    if (!nextTask) return;

    this.running = true;
    this.activeTaskId = nextTask.id;

    try {
      await this.executeTask(nextTask);
    } catch (err: any) {
      // Mark failed if executor throws
      nextTask.status = 'failed';
      nextTask.error = err.message;
      nextTask.completedAt = Date.now();
      this.saveToDisk(nextTask.id);
      this.config.onError(nextTask.id, nextTask.sessionId, err.message);
      log.error(`[TQ] task ${nextTask.id} crashed: ${err.message}`);
    } finally {
      this.running = false;
      this.activeTaskId = null;
    }
  }

  private async executeTask(task: BackgroundTask): Promise<void> {
    task.status = 'running';
    task.startedAt = Date.now();
    task.progress = 'Task started...';
    this.saveToDisk(task.id);
    log.info(`[TQ] execute: ${task.id}`);

    try {
      // Use checkpoint to track this background execution
      const checkpoint = getCheckpoint();
      const checkId = `bg-${task.id}`;
      checkpoint.start(checkId, task.sessionId, task.request.task || 'Background task');

      const result = await this.config.executor(task.request);

      task.status = 'completed';
      task.result = result.content;
      task.progress = 'Completed';
      task.completedAt = Date.now();

      checkpoint.complete(checkId, result);
      this.saveToDisk(task.id);

      this.config.onComplete(task.id, task.sessionId, result.content);
      log.info(`[TQ] completed: ${task.id}`);
    } catch (err: any) {
      task.status = 'failed';
      task.error = err.message;
      task.progress = `Failed: ${err.message.slice(0, 100)}`;
      task.completedAt = Date.now();
      this.saveToDisk(task.id);

      this.config.onError(task.id, task.sessionId, err.message);
      log.error(`[TQ] failed: ${task.id} — ${err.message}`);
    }
  }

  // ── Persistence ──

  private saveToDisk(taskId: string): void {
    const task = this.tasks.get(taskId);
    if (!task) return;
    try {
      const filePath = path.join(this.config.dataDir, `task-${taskId}.json`);
      // R2 §3: tmp+rename — same torn-write class as checkpoints
      atomicWriteFileSync(filePath, JSON.stringify(task, null, 2));
    } catch (err: any) {
      log.warn(`[TQ] save failed for ${taskId}: ${err.message}`);
    }
  }

  private async loadFromDisk(): Promise<void> {
    try {
      const files = fs.readdirSync(this.config.dataDir)
        .filter(f => f.startsWith('task-') && f.endsWith('.json'))
        .sort();

      for (const file of files) {
        try {
          const content = fs.readFileSync(path.join(this.config.dataDir, file), 'utf-8');
          const task = JSON.parse(content) as BackgroundTask;
          // Only load non-terminal tasks into active memory
          if (task.status === 'queued' || task.status === 'running') {
            if (task.status === 'running') {
              // R2 §C: was running at an unexpected crash. Consult checkpoint data
              // for this task's sessionId — if it shows proven-completed tools, the
              // task had partial real work done; a blind full-rerun would redo that
              // work and claim completed side effects were re-executed safely.
              // → mark 'interrupted', require explicit re-enqueue instead.
              // (No live-PID assumptions: any process/session state from before the
              //  restart is treated as dead; in-memory Maps did not survive.)
              let provenCompleted = 0;
              try {
                const cp = getCheckpoint().getLatestForSession(task.sessionId);
                provenCompleted = cp
                  ? getCheckpoint().getProvenCompletedToolIds(cp.requestId).size
                  : 0;
              } catch { /* checkpoint store not initialized yet → treat as no proof */ }
              if (provenCompleted > 0) {
                task.status = 'interrupted';
                task.progress =
                  `Interrupted by unexpected shutdown — prior partial completion detected ` +
                  `(${provenCompleted} tool(s) already executed). NOT auto-requeued; ` +
                  `re-enqueue explicitly to rerun the whole task.`;
                log.warn(
                  `[TQ] R2 §C: ${task.id} was running at crash with ${provenCompleted} proven-completed ` +
                  `tool(s) in checkpoint → status 'interrupted' (no auto-rerun)`,
                );
              } else {
                task.status = 'queued';
                task.progress = 'Re-queued after restart (was running)';
              }
            }
            this.tasks.set(task.id, task);
          }
        } catch { /* skip corrupt */ }
      }

      const activeCount = this.listActiveTasks().length;
      if (activeCount > 0) {
        log.info(`[TQ] Loaded ${activeCount} active task(s) from disk`);
      }
    } catch (err: any) {
      log.info(`[TQ] No saved tasks to load: ${err.message}`);
    }
  }

  async flush(): Promise<void> {
    for (const taskId of this.tasks.keys()) {
      this.saveToDisk(taskId);
    }
  }
}

// ── Singleton ──

let globalTaskQueue: TaskQueue | null = null;

export function getTaskQueue(): TaskQueue {
  if (!globalTaskQueue) {
    globalTaskQueue = new TaskQueue();
  }
  return globalTaskQueue;
}

export default TaskQueue;
