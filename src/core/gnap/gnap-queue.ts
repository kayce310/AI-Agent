/**
 * GNAP Queue — Git-Native Agent Protocol task queue
 * 
 * Uses actual git commands via child_process to persist tasks.
 * Heartbeat loop: git pull → check task → execute → git push
 * Audit log = Git history
 */

import { execSync } from 'child_process';
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'fs';
import { join } from 'path';

export interface GNAPTask {
  id: string;
  name: string;
  sessionId: string;
  timestamp: number;
  status: 'pending' | 'running' | 'completed' | 'failed';
}

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

    // Git commit the task
    try {
      execSync(`git add "${this.taskFile}"`, { cwd: this.taskDir, stdio: 'pipe' });
      execSync(`git commit -m "GNAP: [${fullTask.status}] ${fullTask.name}"`, {
        cwd: this.taskDir,
        stdio: 'pipe',
      });
    } catch {
      // Git may not be initialized or no changes — silent fail
    }

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
      return [];
    }
  }

  /**
   * Pull latest tasks from remote (if configured).
   */
  async pull(): Promise<void> {
    try {
      execSync('git pull', { cwd: this.taskDir, stdio: 'pipe' });
    } catch {
      // No remote configured — silent fail
    }
  }

  /**
   * Push local task commits to remote.
   */
  async push(): Promise<void> {
    try {
      execSync('git push', { cwd: this.taskDir, stdio: 'pipe' });
    } catch {
      // No remote configured — silent fail
    }
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