/**
 * @file Task Tracker — Coral's Success/Failure Recorder
 * @layer core
 * @owner evolution
 *
 * Wraps tool calls and agent actions to automatically record outcomes.
 * Used by the Engine to track what works and what doesn't.
 */

import { Logger } from '../logger.js';
import { ExperienceStore, ExperienceOutcome } from './experience-store.js';

const log = new Logger({ module: 'TaskTracker' });

export interface TaskRecord {
  id: string;
  task: string;
  tool?: string;
  outcome: ExperienceOutcome;
  startTime: number;
  endTime: number;
  error?: string;
  tags: string[];
}

/**
 * TaskTracker — Lightweight wrapper for recording tool call outcomes.
 * 
 * Usage in Engine:
 *   const tracker = new TaskTracker(experienceStore);
 *   const record = tracker.start('install npm package');
 *   try {
 *     await tool.execute();
 *     record.success('pnpm installed');
 *   } catch (err) {
 *     record.failure(err.message);
 *   }
 */
export class TaskTracker {
  private store: ExperienceStore;
  private activeTasks: Map<string, TaskRecord> = new Map();
  private taskCounter = 0;

  constructor(store: ExperienceStore) {
    this.store = store;
  }

  /**
   * Start tracking a task.
   * Returns a task handle with success/failure methods.
   */
  start(task: string, options?: { tool?: string; tags?: string[] }): TaskHandle {
    const id = `task_${Date.now()}_${++this.taskCounter}`;
    const record: TaskRecord = {
      id,
      task,
      tool: options?.tool,
      outcome: 'partial',
      startTime: Date.now(),
      endTime: 0,
      tags: options?.tags ?? [],
    };
    this.activeTasks.set(id, record);

    return new TaskHandle(
      id,
      record,
      this.store,
      this.activeTasks
    );
  }

  /**
   * Get stats about tracked tasks.
   */
  async getStats(): Promise<{ tracked: number; active: number; records: number }> {
    return {
      tracked: this.taskCounter,
      active: this.activeTasks.size,
      records: await this.store.getStats().then(s => s.total),
    };
  }
}

/**
 * Task Handle — Returned by TaskTracker.start().
 * Provides success/failure methods that auto-record.
 */
export class TaskHandle {
  private id: string;
  private record: TaskRecord;
  private store: ExperienceStore;
  private activeTasks: Map<string, TaskRecord>;
  private resolved = false;

  constructor(
    id: string,
    record: TaskRecord,
    store: ExperienceStore,
    activeTasks: Map<string, TaskRecord>
  ) {
    this.id = id;
    this.record = record;
    this.store = store;
    this.activeTasks = activeTasks;
  }

  /** Mark task as successful */
  success(result: string, durationMs?: number): void {
    if (this.resolved) return;
    this.resolved = true;

    this.record.outcome = 'success';
    this.record.endTime = Date.now();
    this.activeTasks.delete(this.id);

    this.store.recordSuccess(
      this.record.task,
      `${this.record.tool ? `[${this.record.tool}] ` : ''}${result}`,
      this.record.tags,
      {
        durationMs: durationMs ?? this.record.endTime - this.record.startTime,
        sessionId: undefined, // Engine should set this
      }
    );
  }

  /** Mark task as failed */
  failure(error: string, durationMs?: number): void {
    if (this.resolved) return;
    this.resolved = true;

    this.record.outcome = 'failure';
    this.record.endTime = Date.now();
    this.record.error = error;
    this.activeTasks.delete(this.id);

    this.store.recordFailure(
      this.record.task,
      `${this.record.tool ? `[${this.record.tool}] ` : ''}Failed`,
      error,
      this.record.tags,
      {
        durationMs: durationMs ?? this.record.endTime - this.record.startTime,
      }
    );
  }

  /** Mark task as partially completed */
  partial(result: string, durationMs?: number): void {
    if (this.resolved) return;
    this.resolved = true;

    this.record.outcome = 'partial';
    this.record.endTime = Date.now();
    this.activeTasks.delete(this.id);

    this.store.record(
      this.record.task,
      `${this.record.tool ? `[${this.record.tool}] ` : ''}${result}`,
      'partial',
      this.record.tags,
      {
        durationMs: durationMs ?? this.record.endTime - this.record.startTime,
        result,
      }
    );
  }

  /** Get task ID */
  getId(): string {
    return this.id;
  }

  /** Check if already resolved */
  isResolved(): boolean {
    return this.resolved;
  }
}

export default TaskTracker;
