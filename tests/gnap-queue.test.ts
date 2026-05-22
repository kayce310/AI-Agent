/**
 * GNAP Queue — Merge Conflict Detection Tests
 * Verifies that silent fail is replaced with proper conflict detection + abort
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { execSync } from 'child_process';
import { GNAPQueue, GNAPConflictError, GNAPGitError } from '../src/core/gnap/gnap-queue.js';

// Mock execSync to simulate git errors
vi.mock('child_process', () => ({
  execSync: vi.fn(),
}));

const mockExecSync = vi.mocked(execSync);

describe('GNAPQueue — Conflict Detection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── commitTask ──

  describe('commitTask', () => {
    it('should throw GNAPConflictError when git commit detects conflict', async () => {
      // First call (git add) succeeds, second (git commit) throws conflict
      mockExecSync
        .mockReturnValueOnce(Buffer.from('')) // git add succeeds
        .mockImplementationOnce(() => {
          const err: any = new Error('CONFLICT (content): Merge conflict in tasks.json');
          err.stderr = Buffer.from('CONFLICT (content): Merge conflict in tasks.json');
          err.stdout = Buffer.from('');
          throw err;
        })
        .mockReturnValueOnce(Buffer.from('')); // git merge --abort succeeds

      const queue = new GNAPQueue();

      await expect(
        queue.commitTask({ name: 'test-task', sessionId: 's1', timestamp: Date.now() })
      ).rejects.toThrow(GNAPConflictError);

      // Verify merge --abort was called
      expect(mockExecSync).toHaveBeenCalledTimes(3);
      expect(mockExecSync).toHaveBeenLastCalledWith('git merge --abort', expect.any(Object));
    });

    it('should throw GNAPGitError for non-conflict git errors', async () => {
      mockExecSync
        .mockReturnValueOnce(Buffer.from('')) // git add succeeds
        .mockImplementationOnce(() => {
          const err: any = new Error('fatal: not a git repository');
          err.stderr = Buffer.from('fatal: not a git repository');
          err.stdout = Buffer.from('');
          throw err;
        });

      const queue = new GNAPQueue();

      await expect(
        queue.commitTask({ name: 'test-task', sessionId: 's1', timestamp: Date.now() })
      ).rejects.toThrow(GNAPGitError);
    });
  });

  // ── pull ──

  describe('pull', () => {
    it('should throw GNAPConflictError when git pull detects conflict', async () => {
      mockExecSync
        .mockImplementationOnce(() => {
          const err: any = new Error('Automatic merge failed');
          err.stderr = Buffer.from('CONFLICT (content): Merge conflict in tasks.json\nAutomatic merge failed');
          err.stdout = Buffer.from('');
          throw err;
        })
        .mockReturnValueOnce(Buffer.from('')); // git merge --abort

      const queue = new GNAPQueue();

      await expect(queue.pull()).rejects.toThrow(GNAPConflictError);
      expect(mockExecSync).toHaveBeenLastCalledWith('git merge --abort', expect.any(Object));
    });

    it('should throw GNAPGitError for non-conflict pull errors', async () => {
      mockExecSync.mockImplementationOnce(() => {
        const err: any = new Error('fatal: No remote configured');
        err.stderr = Buffer.from('fatal: No remote configured');
        err.stdout = Buffer.from('');
        throw err;
      });

      const queue = new GNAPQueue();

      await expect(queue.pull()).rejects.toThrow(GNAPGitError);
    });
  });

  // ── push ──

  describe('push', () => {
    it('should throw GNAPGitError when git push fails', async () => {
      mockExecSync.mockImplementationOnce(() => {
        const err: any = new Error('fatal: No remote configured');
        err.stderr = Buffer.from('fatal: No remote configured');
        err.stdout = Buffer.from('');
        throw err;
      });

      const queue = new GNAPQueue();

      await expect(queue.push()).rejects.toThrow(GNAPGitError);
    });
  });

  // ── Error Types ──

  describe('Error types', () => {
    it('GNAPConflictError should have correct name', () => {
      const err = new GNAPConflictError('test conflict');
      expect(err.name).toBe('GNAPConflictError');
      expect(err.message).toBe('test conflict');
    });

    it('GNAPGitError should have correct name', () => {
      const err = new GNAPGitError('test git error');
      expect(err.name).toBe('GNAPGitError');
      expect(err.message).toBe('test git error');
    });
  });
});
