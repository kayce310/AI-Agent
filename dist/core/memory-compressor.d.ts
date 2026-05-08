/**
 * Kato Local Memory Compressor
 * Framework 6 Layers Claude Code - Lớp Bộ Nhớ
 *
 * LLM nhỏ cục bộ chỉ làm duy nhất 1 công việc:
 * Nén 20 tin nhắn lịch sử thành 1 thông báo tóm tắt 500 token
 * Chạy hoàn toàn offline, không tốn token, không cần internet
 */
import { Message } from './memory.js';
export declare class MemoryCompressor {
    private client;
    private readonly MAX_SUMMARY_TOKENS;
    constructor();
    /**
     * Nén toàn bộ lịch sử hội thoại thành 1 thông báo tóm tắt ngắn gọn
     * Chỉ giữ lại thông tin quan trọng, bỏ qua các chi tiết không liên quan
     */
    compressHistory(history: Message[]): Promise<string>;
}
export default MemoryCompressor;
