/**
 * Kato Universal LLM Core with Agent Loop & Tool Calling
 * Framework 6 Layers Claude Code - Lớp Lõi
 *
 * Tương thích 100%: OpenAI, Claude, Gemini, DeepSeek, Llama, Local AI
 * Hoạt động qua bất kỳ Proxy nào: LiteLLM, OpenRouter, Ollama, Local Server
 */
import { Message } from './memory.js';
import 'dotenv/config';
export declare class LLMCore {
    private client;
    private modelIndex;
    private memoryCompressor;
    private basePath;
    private readonly FALLBACK_MODELS;
    constructor();
    /**
     * Kiểm tra đường dẫn an toàn, không cho phép đi ra ngoài thư mục dự án
     */
    private isPathSafe;
    /**
     * Lấy danh sách file đã được xử lý
     */
    private getProcessedFiles;
    /**
     * Đánh dấu file đã được xử lý xong
     */
    private markFileProcessed;
    /**
     * Thực thi công cụ được yêu cầu bởi LLM
     */
    private isFunctionToolCall;
    private executeToolCall;
    /**
     * Gọi LLM với Agent Loop và Tool Calling
     * Không bao giờ crash hệ thống dù bất kỳ lỗi gì xảy ra
     */
    chatCompletion(history: Message[], context: {
        agentName: string;
        protocol: string;
        mentionPrefix: string;
    }): Promise<string>;
}
export default LLMCore;
