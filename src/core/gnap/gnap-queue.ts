/**
 * GNAP Queue — Git-Native Agent Protocol task queue
 * 
 * Uses actual git commands via child_process to persist tasks.
 * Heartbeat loop: git pull → check task → execute → git push
 * Audit log = Git history
 * 
 * Error handling:
 * - Merge conflicts detected and resolved with git merge --abort
 * - All git errors are surfaced with descriptive system errors
 */

import { execSync } from 'child_process';
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'fs';
import { join } from 'path';

// ── Error Types ──

/** Git conflict detected during merge/pull */
export class GNAPConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GNAPConflictError';
  }
}

/** Git operation failed */
export class GNAPGitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GNAPGitError';
  }
}

// ── Task Interface ──

export interface GNAPTask {
  id: string;
  name: string;
  sessionId: string;
  timestamp: number;
  status: 'pending' | 'running' | 'completed' | 'failed';
}

// ── GNAPQueue Class ──

export class GNAPQueue {
  private taskDir: string;
  private taskFile: string;

  constructor(baseDir: string = '.') {
    this.taskDir = join(baseDir, '.gnap');
    this.taskFile = join(this.taskDir, 'tasks.json');
    this.ensureTaskDir();
  }

  private ensureTaskDir(): void {
    if (!existsSync(this.taskDir)) {
      mkdirSync(this.taskDir, { recursive: true });
    }
    if (!existsSync(this.taskFile)) {
      writeFileSync(this.taskFile, JSON.stringify({ tasks: [], lastSync: 0 }, null, 2));
    }
  }

  /**
   * Run a git command, detect conflicts, and abort if merge conflict detected.
   * Throws GNAPConflictError or GNAPGitError on failure.
   */
  private runGit(cmd: string, description: string): void {
    try {
      execSync(cmd, { cwd: this.taskDir, stdio: 'pipe' });
    } catch (err: any) {
      const stderr = err.stderr?.toString() || '';
      const stdout = err.stdout?.toString() || '';
      const combined = stderr + stdout;

      // Detect merge conflict patterns
      const conflictPatterns = [
        'CONFLICT',
        'merge conflict',
        'Merge conflict',
        'CONFLICT (content)',
        'Auto-merging failed',
        'merge failed',
        'conflict in',
        '<<<<<<<',
        '>>>>>>>',
        '=======',
        'error: cannot merge with differences',
      ];

      for (const pattern of conflictPatterns) {
        if (combined.includes(pattern)) {
          // Attempt to abort the merge to clean up working tree
          try {
            execSync('git merge --abort', { cwd: this.taskDir, stdio: 'pipe' });
          } catch {
            // Abort failed — working tree may be dirty, but we surface conflict anyway
          }
          throw new GNAPConflictError(
            `Git ${description} detected merge conflict: ${combined.substring(0, 200)}`
          );
        }
      }

      // For non-conflict errors (no remote, not a repo, etc.), re-throw as GitError
      throw new GNAPGitError(
        `Git ${description} failed: ${combined.substring(0, 200) || err.message}`
      );
    }
  }

  /**
   * Commit a task to the GNAP queue and persist via git commit.
   */
  async commitTask(task: Omit<GNAPTask, 'id' | 'status'>): Promise<GNAPTask> {
    const fullTask: GNAPTask = {
      ...task,
      id: `gnap-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
      status: 'pending',
    };

    // Load existing tasks
    const data = JSON.parse(readFileSync(this.taskFile, 'utf-8'));
    data.tasks.push(fullTask);
    data.lastSync = Date.now();
    writeFileSync(this.taskFile, JSON.stringify(data, null, 2));

    // Git add + commit
    this.runGit(`git add "${this.taskFile}"`, 'add');
    this.runGit(
      `git commit -m "GNAP: [${fullTask.status}] ${fullTask.name}"`,
      'commit'
    );

    return fullTask;
  }

  /**
   * Get task history from git log.
   */
  async getTaskHistory(): Promise<string[]> {
    try {
      const log = execSync(`git log --oneline --all`, {
        cwd: this.taskDir,
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
      });
      return log.split('\n').filter(line => line.trim().length > 0);
    } catch {
      // No git history yet — return empty
      return [];
    }
  }

  /**
   * Pull latest tasks from remote.
   * Throws GNAPConflictError if merge conflict detected.
   */
  async pull(): Promise<void> {
    this.runGit('git pull', 'pull');
  }

  /**
   * Push local task commits to remote.
   * Throws GNAPConflictError or GNAPGitError on failure.
   */
  async push(): Promise<void> {
    this.runGit('git push', 'push');
  }

  /**
   * Get all pending tasks.
   */
  getPendingTasks(): GNAPTask[] {
    const data = JSON.parse(readFileSync(this.taskFile, 'utf-8'));
    return data.tasks.filter((t: GNAPTask) => t.status === 'pending');
  }

  /**
   * Update task status.
   */
  updateTaskStatus(taskId: string, status: GNAPTask['status']): void {
    const data = JSON.parse(readFileSync(this.taskFile, 'utf-8'));
    const task = data.tasks.find((t: GNAPTask) => t.id === taskId);
    if (task) {
      task.status = status;
      writeFileSync(this.taskFile, JSON.stringify(data, null, 2));
    }
  }
}

export default GNAPQueue;
