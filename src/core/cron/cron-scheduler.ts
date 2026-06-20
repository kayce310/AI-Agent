/**
 * @file Cron Scheduler Service
 * @layer core
 * @owner cron
 *
 * Simple setInterval-based scheduler for proactive tasks.
 * Publishes events to EventBus for monitoring/logging.
 */

import { Logger } from '../logger.js';
const log = new Logger({ module: 'Cron' });

export interface CronJob {
  name: string;
  intervalMs: number;
  handler: () => Promise<string | null>; // null = no notification, string = notification content
  lastRun?: number;
  lastResult?: string;
  running: boolean;
}

/**
 * CronScheduler — Manages periodic tasks.
 * Each job runs on its own interval. Results are collected for notification.
 */
export class CronScheduler {
  private jobs: Map<string, CronJob> = new Map();
  private timers: Map<string, ReturnType<typeof setInterval>> = new Map();
  private isStarted = false;

  /**
   * Register a cron job.
   * Jobs are NOT started until start() is called.
   */
  register(job: CronJob): void {
    if (this.jobs.has(job.name)) {
      log.warn(`Cron job "${job.name}" already registered, overwriting`);
    }
    this.jobs.set(job.name, { ...job, running: false });
    log.info(`Registered cron job: ${job.name} (every ${job.intervalMs / 1000}s)`);
  }

  /**
   * Start all registered cron jobs.
   */
  start(): void {
    if (this.isStarted) return;
    this.isStarted = true;

    Array.from(this.jobs.entries()).forEach(([name, job]) => {
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

    job.running = true;
    job.lastRun = Date.now();

    try {
      const result = await job.handler();
      job.lastResult = result || 'ok';
      if (result && notifyOnSuccess) {
        return result;
      }
      return result; // null = no notification needed
    } catch (err: any) {
      const errorMsg = `Cron job "${name}" failed: ${err.message}`;
      log.error(errorMsg);
      job.lastResult = errorMsg;
      return errorMsg; // Error always returns notification
    } finally {
      job.running = false;
    }
  }

  /**
   * List all registered jobs with their status.
   */
  listJobs(): Array<{ name: string; lastRun: number | null; lastResult: string | null; running: boolean; intervalMs: number }> {
    return Array.from(this.jobs.values()).map(j => ({
      name: j.name,
      lastRun: j.lastRun ?? null,
      lastResult: j.lastResult ?? null,
      running: j.running,
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
