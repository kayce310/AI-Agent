/**
 * Kato Task Manager - Supervised Sequential Processing
 * Framework 6 Layers Claude Code - Lớp 3 Kỹ Năng
 *
 * Quản lý hàng đợi xử lý file raw với giám sát, tạm dừng, tiếp tục
 * và báo cáo tiến độ theo thời gian thực
 */
import { LLMCore } from './llm.js';
export interface Task {
    filename: string;
    status: 'pending' | 'processing' | 'done' | 'failed';
    priority: number;
}
export declare class TaskManager {
    private basePath;
    private llmCore;
    constructor(llmCore: LLMCore);
    private initializeTaskQueue;
}
