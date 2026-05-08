import { EventEmitter } from 'events';
import { randomUUID } from 'crypto';
export var TaskStatus;
(function (TaskStatus) {
    TaskStatus["PENDING"] = "pending";
    TaskStatus["RUNNING"] = "running";
    TaskStatus["PAUSED"] = "paused";
    TaskStatus["COMPLETED"] = "completed";
    TaskStatus["FAILED"] = "failed";
    TaskStatus["CANCELLED"] = "cancelled";
})(TaskStatus || (TaskStatus = {}));
export class TaskQueue extends EventEmitter {
    queue = [];
    history = [];
    currentTask = null;
    isRunning = false;
    shouldPause = false;
    constructor() {
        super();
    }
    /**
     * Thêm task vào cuối hàng đợi
     */
    enqueue(taskInput) {
        const task = {
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
    start() {
        if (this.isRunning)
            return;
        this.isRunning = true;
        this.shouldPause = false;
        this.processQueue();
    }
    /**
     * Yêu cầu tạm dừng SAU KHI task hiện tại hoàn thành
     */
    pause() {
        this.shouldPause = true;
    }
    /**
     * Tiếp tục xử lý hàng đợi
     */
    resume() {
        if (!this.shouldPause)
            return;
        this.shouldPause = false;
        this.emit('resumed');
        if (!this.currentTask) {
            this.processQueue();
        }
    }
    /**
     * Hủy task cụ thể khỏi hàng đợi
     */
    cancel(taskId) {
        const index = this.queue.findIndex(t => t.id === taskId);
        if (index === -1)
            return false;
        const task = this.queue[index];
        task.status = TaskStatus.CANCELLED;
        this.history.push(task);
        this.queue.splice(index, 1);
        return true;
    }
    /**
     * Xóa toàn bộ hàng đợi (không ảnh hưởng task đang chạy)
     */
    clear() {
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
    async processQueue() {
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
        const task = this.queue.shift();
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
        }
        catch (error) {
            task.status = TaskStatus.FAILED;
            task.error = error instanceof Error ? error.message : String(error);
            this.emit('taskFail', task, error);
        }
        finally {
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
    getHistory() {
        return [...this.history];
    }
    /**
     * Lấy danh sách task đang chờ
     */
    getPendingTasks() {
        return [...this.queue];
    }
}
export default TaskQueue;
//# sourceMappingURL=task-queue.js.map