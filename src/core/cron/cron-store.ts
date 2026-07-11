/**
 * @file cron-store — Durable SQLite-backed storage for cron jobs and run history
 * @layer core
 * @owner cron
 *
 * Phase 4: Persistence for cron scheduler.
 * Two tables:
 * - cron_jobs: job definitions (name, intervalMs, enabled, lastRun, lastResult)
 * - cron_runs: execution history (jobId, timestamp, status, result, error)
 */

import Database from 'better-sqlite3';
import * as path from 'path';
import * as fs from 'fs';
import { Logger } from '../logger.js';

const log = new Logger({ module: 'CronStore' });

export interface CronJobRow {
  name: string;
  interval_ms: number;
  timeout_ms: number;
  enabled: number;
  last_run: number | null;
  last_result: string | null;
  updated_at: number;
}

export interface CronRunRow {
  id: number;
  job_name: string;
  started_at: number;
  completed_at: number | null;
  status: 'running' | 'completed' | 'failed';
  result: string | null;
  error: string | null;
}

export class CronStore {
  private db: Database.Database;

  constructor(dbPath?: string) {
    const resolvedPath = dbPath || path.join(process.cwd(), 'data', 'cron.db');
    fs.mkdirSync(path.dirname(resolvedPath), { recursive: true });
    this.db = new Database(resolvedPath);
    this.db.pragma('journal_mode = WAL');
    this.ensureTables();
    log.info(`CronStore opened at ${resolvedPath}`);
  }

  private ensureTables(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS cron_jobs (
        name TEXT PRIMARY KEY,
        interval_ms INTEGER NOT NULL,
        timeout_ms INTEGER DEFAULT 0,
        enabled INTEGER DEFAULT 1,
        last_run INTEGER,
        last_result TEXT,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS cron_runs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        job_name TEXT NOT NULL,
        started_at INTEGER NOT NULL,
        completed_at INTEGER,
        status TEXT NOT NULL DEFAULT 'running',
        result TEXT,
        error TEXT,
        FOREIGN KEY (job_name) REFERENCES cron_jobs(name)
      );

      CREATE INDEX IF NOT EXISTS idx_cron_runs_job
        ON cron_runs(job_name, started_at DESC);

      -- Prune old runs: keep last 100 per job
      CREATE TRIGGER IF NOT EXISTS trg_cron_runs_prune
        AFTER INSERT ON cron_runs
        BEGIN
          DELETE FROM cron_runs
          WHERE job_name = NEW.job_name
          AND id NOT IN (
            SELECT id FROM cron_runs
            WHERE job_name = NEW.job_name
            ORDER BY id DESC LIMIT 100
          );
        END;
    `);
  }

  // ── Job CRUD ──

  saveJob(job: Partial<CronJobRow> & { name: string }): void {
    const existing = this.db.prepare('SELECT * FROM cron_jobs WHERE name = ?').get(job.name) as CronJobRow | undefined;
    if (existing) {
      this.db.prepare(`
        UPDATE cron_jobs SET
          interval_ms = ?,
          timeout_ms = ?,
          enabled = ?,
          last_run = ?,
          last_result = ?,
          updated_at = ?
        WHERE name = ?
      `).run(
        job.interval_ms ?? existing.interval_ms,
        job.timeout_ms ?? existing.timeout_ms,
        job.enabled ?? existing.enabled,
        job.last_run ?? existing.last_run,
        job.last_result ?? existing.last_result,
        Date.now(),
        job.name,
      );
    } else {
      this.db.prepare(`
        INSERT INTO cron_jobs (name, interval_ms, timeout_ms, enabled, last_run, last_result, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        job.name,
        job.interval_ms ?? 60000,
        job.timeout_ms ?? 0,
        job.enabled ?? 1,
        job.last_run ?? null,
        job.last_result ?? null,
        Date.now(),
      );
    }
  }

  getJob(name: string): CronJobRow | undefined {
    return this.db.prepare('SELECT * FROM cron_jobs WHERE name = ?').get(name) as CronJobRow | undefined;
  }

  getAllJobs(): CronJobRow[] {
    return this.db.prepare('SELECT * FROM cron_jobs ORDER BY name').all() as CronJobRow[];
  }

  deleteJob(name: string): void {
    this.db.prepare('DELETE FROM cron_jobs WHERE name = ?').run(name);
  }

  // ── Run History ──

  startRun(jobName: string): number {
    const result = this.db.prepare(`
      INSERT INTO cron_runs (job_name, started_at, status)
      VALUES (?, ?, 'running')
    `).run(jobName, Date.now());
    return Number(result.lastInsertRowid);
  }

  completeRun(runId: number, result: string | null): void {
    this.db.prepare(`
      UPDATE cron_runs SET status = 'completed', completed_at = ?, result = ?
      WHERE id = ?
    `).run(Date.now(), result, runId);
  }

  failRun(runId: number, error: string): void {
    this.db.prepare(`
      UPDATE cron_runs SET status = 'failed', completed_at = ?, error = ?
      WHERE id = ?
    `).run(Date.now(), error, runId);
  }

  getRecentRuns(jobName: string, limit = 10): CronRunRow[] {
    return this.db.prepare(`
      SELECT * FROM cron_runs WHERE job_name = ? ORDER BY started_at DESC LIMIT ?
    `).all(jobName, limit) as CronRunRow[];
  }

  // ── Proactive cooldown persistence ──
  // ponytail: in-memory only — survives same session, not restart.
  // Upgrade to SQLite table if restart persistence matters.
  private proactiveCooldowns = new Map<string, number>();

  setProactiveLastTriggered(ruleId: string, timestamp: number): void {
    this.proactiveCooldowns.set(ruleId, timestamp);
  }

  getProactiveLastTriggered(ruleId: string): number | null {
    return this.proactiveCooldowns.get(ruleId) ?? null;
  }

  // ── Utility ──

  pruneOldRuns(): void {
    const result = this.db.prepare(`
      DELETE FROM cron_runs WHERE id NOT IN (
        SELECT id FROM cron_runs r2 WHERE r2.job_name = cron_runs.job_name
        ORDER BY id DESC LIMIT 100
      )
    `).run();
    if (result.changes > 0) {
      log.info(`Pruned ${result.changes} old cron run records`);
    }
  }

  close(): void {
    this.db.close();
  }
}

// ── Singleton ──

let globalCronStore: CronStore | null = null;

export function getCronStore(): CronStore {
  if (!globalCronStore) {
    globalCronStore = new CronStore();
  }
  return globalCronStore;
}

export default CronStore;
