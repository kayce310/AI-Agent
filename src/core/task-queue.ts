import { EventEmitter } from 'events';
import { randomUUID } from 'crypto';

export enum TaskStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

export interface Task<T = any> {
  id: string;
  name?: string;
  payload?: T;
  status: TaskStatus;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  error?: string;
  result?: any;
  execute: () => Promise<any>;
}

export type TaskInput<T = any> = Partial<Pick<Task<T>, 'name' | 'payload'>> & {
  execute: () => Promise<any>;
};

export declare interface TaskQueue {
  on(event: 'taskStart', listener: (task: Task) => void): this;
  on(event: 'taskComplete', listener: (task: Task, result: any) => void): this;
  on(event: 'taskFail', listener: (task: Task, error: Error) => void): this;
  on(event: 'queueEmpty', listener: () => void): this;
  on(event: 'paused', listener: () => void): this;
  on(event: 'resumed', listener: () => void): this;
}

export class TaskQueue extends EventEmitter {
  private queue: Task[] = [];
  private history: Task[] = [];
  private currentTask: Task | null = null;
  private isRunning = false;
  private shouldPause = false;

  constructor() {
    super();
  }

  /**
   * Thêm task vào cuối hàng đợi
   */
  enqueue(taskInput: TaskInput): string {
    const task: Task = {
      id: randomUUID(),
      status: TaskStatus.PENDING,
      createdAt: Date.now(),
      ...taskInput
    };

    this.queue.push(task);

    // Nếu hàng đợi đang chạy và không có task nào đang xử lý thì chạy ngay
    if (this.isRunning && !this.currentTask) {
      setImmediate(() => this.processQueue());
    }

    return task.id;
  }

  /**
   * Bắt đầu xử lý hàng đợi
   */
  start(): void {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.shouldPause = false;
    this.processQueue();
  }

  /**
   * Yêu cầu tạm dừng SAU KHI task hiện tại hoàn thành
   */
  pause(): void {
    this.shouldPause = true;
  }

  /**
   * Tiếp tục xử lý hàng đợi
   */
  resume(): void {
    if (!this.shouldPause) return;
    
    this.shouldPause = false;
    this.emit('resumed');
    
    if (!this.currentTask) {
      this.processQueue();
    }
  }

  /**
   * Hủy task cụ thể khỏi hàng đợi
   */
  cancel(taskId: string): boolean {
    const index = this.queue.findIndex(t => t.id === taskId);
    if (index === -1) return false;

    const task = this.queue[index];
    task.status = TaskStatus.CANCELLED;
    this.history.push(task);
    this.queue.splice(index, 1);
    
    return true;
  }

  /**
   * Xóa toàn bộ hàng đợi (không ảnh hưởng task đang chạy)
   */
  clear(): void {
    this.queue.forEach(task => {
      task.status = TaskStatus.CANCELLED;
      this.history.push(task);
    });
    this.queue = [];
  }

  /**
   * Lấy trạng thái hiện tại của hệ thống
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      isPaused: this.shouldPause,
      pendingCount: this.queue.length,
      currentTask: this.currentTask,
      historyCount: this.history.length
    };
  }

  /**
   * Xử lý hàng đợi tuần tự
   * ✅ LUÔN CHẠY MỘT TASK MỖI LẦN
   * ✅ KHÔNG BLOCK EVENT LOOP
   * ✅ HỖ TRỢ PAUSE GIỮA CÁC TASK
   */
  private async processQueue(): Promise<void> {
    if (this.shouldPause) {
      this.isRunning = false;
      this.emit('paused');
      return;
    }

    if (this.queue.length === 0) {
      this.isRunning = false;
      this.emit('queueEmpty');
      return;
    }

    // Lấy task đầu tiên theo FIFO
    const task = this.queue.shift()!;
    this.currentTask = task;

    try {
      task.status = TaskStatus.RUNNING;
      task.startedAt = Date.now();
      this.emit('taskStart', task);

      // Thực thi task
      const result = await task.execute();

      task.status = TaskStatus.COMPLETED;
      task.result = result;
      this.emit('taskComplete', task, result);

    } catch (error) {
      task.status = TaskStatus.FAILED;
      task.error = error instanceof Error ? error.message : String(error);
      this.emit('taskFail', task, error as Error);

    } finally {
      task.completedAt = Date.now();
      this.history.push(task);
      this.currentTask = null;

      // Chuyển sang task tiếp theo sau khi giải phóng event loop
      setImmediate(() => this.processQueue());
    }
  }

  /**
   * Lấy lịch sử tất cả task đã xử lý
   */
  getHistory(): Task[] {
    return [...this.history];
  }

  /**
   * Lấy danh sách task đang chờ
   */
  getPendingTasks(): Task[] {
    return [...this.queue];
  }
}

export default TaskQueue;