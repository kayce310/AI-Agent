/**
 * @file gnap-queue — GNAP protocol
 * @layer core
 * @depends-on src/core/types.ts
 * @imported-by src/core/engine/engine.ts
 * @owner core-gnap
 */

/**
 * GNAP Queue — Git-Native Agent Protocol task queue
 *
 * Persists tasks as a JSON file (runtime state, not source code).
 * No git tracking — tasks.json is ephemeral runtime data.
 */

import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'fs';
import { join, resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// ── Workspace root resolution (independent of process.cwd()) ──
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const WORKSPACE_ROOT = resolve(__dirname, '../../..'); // from src/core/gnap/ up to repo root

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
  private workspaceRoot: string;

  constructor(baseDir?: string) {
    this.workspaceRoot = baseDir ? resolve(baseDir) : WORKSPACE_ROOT;
    this.taskDir = join(this.workspaceRoot, '.gnap');
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
   * Commit a task to the GNAP queue (file-based persistence only).
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

    return fullTask;
  }

  /**
   * Get task history — returns current file content (git history removed).
   */
  async getTaskHistory(): Promise<string[]> {
    try {
      const data = JSON.parse(readFileSync(this.taskFile, 'utf-8'));
      return data.tasks.map((t: GNAPTask) => `[${t.status}] ${t.name}`);
    } catch {
      return [];
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
