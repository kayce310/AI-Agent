import { EventEmitter } from 'events';
export declare enum TaskStatus {
    PENDING = "pending",
    RUNNING = "running",
    PAUSED = "paused",
    COMPLETED = "completed",
    FAILED = "failed",
    CANCELLED = "cancelled"
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
export declare class TaskQueue extends EventEmitter {
    private queue;
    private history;
    private currentTask;
    private isRunning;
    private shouldPause;
    constructor();
    /**
     * Thêm task vào cuối hàng đợi
     */
    enqueue(taskInput: TaskInput): string;
    /**
     * Bắt đầu xử lý hàng đợi
     */
    start(): void;
    /**
     * Yêu cầu tạm dừng SAU KHI task hiện tại hoàn thành
     */
    pause(): void;
    /**
     * Tiếp tục xử lý hàng đợi
     */
    resume(): void;
    /**
     * Hủy task cụ thể khỏi hàng đợi
     */
    cancel(taskId: string): boolean;
    /**
     * Xóa toàn bộ hàng đợi (không ảnh hưởng task đang chạy)
     */
    clear(): void;
    /**
     * Lấy trạng thái hiện tại của hệ thống
     */
    getStatus(): {
        isRunning: boolean;
        isPaused: boolean;
        pendingCount: number;
        currentTask: Task<any> | null;
        historyCount: number;
    };
    /**
     * Xử lý hàng đợi tuần tự
     * ✅ LUÔN CHẠY MỘT TASK MỖI LẦN
     * ✅ KHÔNG BLOCK EVENT LOOP
     * ✅ HỖ TRỢ PAUSE GIỮA CÁC TASK
     */
    private processQueue;
    /**
     * Lấy lịch sử tất cả task đã xử lý
     */
    getHistory(): Task[];
    /**
     * Lấy danh sách task đang chờ
     */
    getPendingTasks(): Task[];
}
export default TaskQueue;
