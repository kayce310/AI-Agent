/**
 * @file Cron Scheduler Service
 * @layer core
 * @owner cron
 *
 * Simple setInterval-based scheduler for proactive tasks.
 * Publishes events to EventBus for monitoring/logging.
 */

import { Logger } from '../logger.js';
import { CronStore, getCronStore } from './cron-store.js';
const log = new Logger({ module: 'Cron' });

/**
 * Callback for cron alert notifications.
 * Called when a job returns a non-null string (alert needed).
 */
export type AlertCallback = (message: string) => Promise<void>;

export interface CronJob {
  name: string;
  intervalMs: number;
  handler: () => Promise<string | null>; // null = no notification, string = notification content
  lastRun?: number;
  lastResult?: string;
  running?: boolean;
  /** Max execution time in ms. If exceeded, the job is considered failed. */
  timeoutMs?: number;
  enabled?: boolean;
}

/**
 * CronScheduler — Manages periodic tasks.
 * Each job runs on its own interval. Results are collected for notification.
 */
export class CronScheduler {
  private jobs: Map<string, CronJob> = new Map();
  private timers: Map<string, ReturnType<typeof setInterval>> = new Map();
  private isStarted = false;
  private onAlert: AlertCallback | null = null;
  private store: CronStore;

  constructor(onAlert?: AlertCallback) {
    this.onAlert = onAlert || null;
    this.store = getCronStore();
  }

  /**
   * Register a cron job.
   * Jobs are NOT started until start() is called.
   */
  register(job: CronJob): void {
    if (this.jobs.has(job.name)) {
      log.warn(`Cron job "${job.name}" already registered, overwriting`);
    }
    this.jobs.set(job.name, { ...job, running: false, enabled: job.enabled ?? true });

    // Persist job definition
    this.store.saveJob({
      name: job.name,
      interval_ms: job.intervalMs,
      timeout_ms: job.timeoutMs ?? 0,
      enabled: 1,
      last_run: null,
      last_result: null,
    });

    log.info(`Registered cron job: ${job.name} (every ${job.intervalMs / 1000}s)`);
  }

  /**
   * Start all registered cron jobs.
   */
  start(): void {
    if (this.isStarted) return;
    this.isStarted = true;

    Array.from(this.jobs.entries()).forEach(([name, job]) => {
      if (!job.enabled) return;
      const timer = setInterval(() => this.runJob(name), job.intervalMs);
      this.timers.set(name, timer);
      log.info(`Started cron job: ${name}`);
    });
  }

  /**
   * Stop all cron jobs.
   */
  stop(): void {
    Array.from(this.timers.entries()).forEach(([name, timer]) => {
      clearInterval(timer);
      log.info(`Stopped cron job: ${name}`);
    });
    this.timers.clear();
    this.isStarted = false;
    log.info('Cron scheduler stopped');
  }

  /**
   * Run a specific job immediately (triggered manually or on first run).
   */
  async runJob(name: string, notifyOnSuccess = false): Promise<string | null> {
    const job = this.jobs.get(name);
    if (!job) {
      log.warn(`Cron job "${name}" not found`);
      return null;
    }
    if (job.running) {
      log.warn(`Cron job "${name}" already running, skipping`);
      return null;
    }
    if (!job.enabled) {
      log.debug(`Cron job "${name}" is disabled, skipping`);
      return null;
    }

    job.running = true;
    job.lastRun = Date.now();
    const runId = this.store.startRun(job.name);

    try {
      // Wrap handler with optional timeout
      let result: string | null;
      if (job.timeoutMs && job.timeoutMs > 0) {
        result = await Promise.race([
          job.handler(),
          new Promise<string | null>((_, reject) =>
            setTimeout(() => reject(new Error(`Job \"${name}\" timed out after ${job.timeoutMs}ms`)), job.timeoutMs)
          ),
        ]);
      } else {
        result = await job.handler();
      }
      job.lastResult = result || 'ok';

      // Persist job state and run result
      this.store.saveJob({
        name: job.name,
        last_run: job.lastRun,
        last_result: job.lastResult,
        interval_ms: job.intervalMs,
        timeout_ms: job.timeoutMs ?? 0,
      });
      this.store.completeRun(runId, result);
      if (result) {
        // Fire alert callback if set
        if (this.onAlert) {
          this.onAlert(`*${job.name}*: ${result}`).catch(e => log.error(`Alert callback failed: ${e}`));
        }
        if (notifyOnSuccess) {
          return result;
        }
      }
      return result; // null = no notification needed
    } catch (err: any) {
      const errorMsg = `Cron job "${name}" failed: ${err.message}`;
      log.error(errorMsg);
      job.lastResult = errorMsg;
      // Persist failure
      this.store.failRun(runId, errorMsg);
      this.store.saveJob({
        name: job.name,
        last_run: job.lastRun,
        last_result: errorMsg,
        interval_ms: job.intervalMs,
        timeout_ms: job.timeoutMs ?? 0,
      });
      // Fire alert callback for errors too
      if (this.onAlert) {
        this.onAlert(`*${job.name}*: ${errorMsg}`).catch(e => log.error(`Alert callback failed: ${e}`));
      }
      return errorMsg; // Error always returns notification
    } finally {
      job.running = false;
    }
  }

  enableJob(name: string): void {
    const job = this.jobs.get(name);
    if (job) {
      job.enabled = true;
      log.info(`Enabled cron job: ${name}`);
      // If scheduler is running but no timer for this job, start one
      if (this.isStarted && !this.timers.has(name)) {
        const timer = setInterval(() => this.runJob(name), job.intervalMs);
        this.timers.set(name, timer);
      }
    }
  }

  disableJob(name: string): void {
    const job = this.jobs.get(name);
    if (job) {
      job.enabled = false;
      log.info(`Disabled cron job: ${name}`);
      // Stop timer if running
      const timer = this.timers.get(name);
      if (timer) {
        clearInterval(timer);
        this.timers.delete(name);
      }
    }
  }

  /**
   * List all registered jobs with their status.
   */
  listJobs(): Array<{ name: string; lastRun: number | null; lastResult: string | null; running: boolean; enabled: boolean; intervalMs: number }> {
    return Array.from(this.jobs.values()).map(j => ({
      name: j.name,
      lastRun: j.lastRun ?? null,
      lastResult: j.lastResult ?? null,
      running: j.running ?? false,
      enabled: j.enabled ?? true,
      intervalMs: j.intervalMs,
    }));
  }

  /**
   * Run all jobs once (for initial startup sync).
   */
  async runAll(): Promise<Map<string, string | null>> {
    const results = new Map<string, string | null>();
    Array.from(this.jobs.keys()).forEach(async (name) => {
      const result = await this.runJob(name, true);
      results.set(name, result);
    });
    return results;
  }
}

export default CronScheduler;
