/**
 * @file CronScheduler Tests
 * @layer tests
 * @owner cron
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CronScheduler, CronJob } from '../src/core/cron/cron-scheduler.js';

describe('CronScheduler', () => {
  let scheduler: CronScheduler;

  beforeEach(() => {
    scheduler = new CronScheduler();
    vi.useFakeTimers();
  });

  afterEach(() => {
    scheduler.stop();
    vi.useRealTimers();
  });

  describe('register', () => {
    it('should register a job', () => {
      scheduler.register({
        name: 'test-job',
        intervalMs: 60000,
        handler: async () => null,
        running: false,
      });
      const jobs = scheduler.listJobs();
      expect(jobs).toHaveLength(1);
      expect(jobs[0].name).toBe('test-job');
    });

    it('should overwrite duplicate job names', () => {
      scheduler.register({ name: 'dup', intervalMs: 1000, handler: async () => 'first', running: false });
      scheduler.register({ name: 'dup', intervalMs: 2000, handler: async () => 'second', running: false });
      const jobs = scheduler.listJobs();
      expect(jobs).toHaveLength(1);
      expect(jobs[0].intervalMs).toBe(2000);
    });
  });

  describe('start + stop', () => {
    it('should start all registered jobs', () => {
      const handler = vi.fn(async () => null);
      scheduler.register({ name: 'job1', intervalMs: 1000, handler, running: false });
      scheduler.register({ name: 'job2', intervalMs: 2000, handler, running: false });

      scheduler.start();
      vi.advanceTimersByTime(1000);

      expect(handler).toHaveBeenCalled();
    });

    it('should not start twice', () => {
      const handler = vi.fn(async () => null);
      scheduler.register({ name: 'job1', intervalMs: 1000, handler, running: false });
      scheduler.start();
      scheduler.start(); // second start should be no-op

      vi.advanceTimersByTime(1000);
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should stop all jobs', () => {
      const handler = vi.fn(async () => null);
      scheduler.register({ name: 'job1', intervalMs: 1000, handler, running: false });
      scheduler.start();
      scheduler.stop();

      vi.advanceTimersByTime(1000);
      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('runJob', () => {
    it('should run a job and return null when no notification', async () => {
      scheduler.register({
        name: 'silent',
        intervalMs: 60000,
        handler: async () => null,
        running: false,
      });

      const result = await scheduler.runJob('silent');
      expect(result).toBeNull();
    });

    it('should return handler result when notification requested', async () => {
      scheduler.register({
        name: 'notifier',
        intervalMs: 60000,
        handler: async () => 'Health OK',
        running: false,
      });

      const result = await scheduler.runJob('notifier', true);
      expect(result).toBe('Health OK');
    });

    it('should return error message when handler throws', async () => {
      scheduler.register({
        name: 'failing',
        intervalMs: 60000,
        handler: async () => { throw new Error('boom'); },
        running: false,
      });

      const result = await scheduler.runJob('failing');
      expect(result).toContain('failed');
      expect(result).toContain('boom');
    });

    it('should skip job if already running', async () => {
      let resolve: () => void;
      const blocker = new Promise<void>(r => { resolve = r; });

      scheduler.register({
        name: 'slow',
        intervalMs: 60000,
        handler: async () => { await blocker; return 'done'; },
        running: false,
      });

      // Start first run
      const p1 = scheduler.runJob('slow');
      // Try second run while first is running
      const p2 = await scheduler.runJob('slow');
      expect(p2).toBeNull(); // skipped

      resolve!();
      await p1;
    });

    it('should return null for unknown job', async () => {
      const result = await scheduler.runJob('nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('listJobs', () => {
    it('should list all registered jobs', () => {
      scheduler.register({ name: 'a', intervalMs: 1000, handler: async () => null, running: false });
      scheduler.register({ name: 'b', intervalMs: 2000, handler: async () => null, running: false });

      const jobs = scheduler.listJobs();
      expect(jobs).toHaveLength(2);
      expect(jobs.map(j => j.name)).toContain('a');
      expect(jobs.map(j => j.name)).toContain('b');
    });

    it('should show correct status fields', () => {
      scheduler.register({ name: 'x', intervalMs: 1000, handler: async () => null, running: false });
      const job = scheduler.listJobs()[0];
      expect(job.lastRun).toBeNull();
      expect(job.lastResult).toBeNull();
      expect(job.running).toBe(false);
    });
  });
});
