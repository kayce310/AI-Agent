/**
 * Kato Multi-Layer Memory Core
 * Framework 6 Layers Claude Code - Lớp 2 Bộ Nhớ
 *
 * Kiến trúc bộ nhớ 3 lớp:
 * 🔹 Lớp 0: RAM Cache - 20 tin nhắn gần nhất (Hot Path)
 * 🔹 Lớp 1: File System - Lịch sử đầy đủ trên đĩa cứng
 * 🔹 Lớp 2: Knowledge Wiki - Tóm tắt thông tin quan trọng dài hạn
 */
import 'dotenv/config';
export interface Message {
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: number;
}
export declare class MemoryCore {
    private memoryPath;
    private readonly MAX_RAM_MESSAGES;
    private channelCache;
    constructor();
    private initializeStorage;
    private getChannelFilePath;
    /**
     * Lấy lịch sử hội thoại của kênh
     * Tự động nạp từ đĩa nếu chưa có trong cache RAM
     */
    getChannelHistory(channelId: string): Promise<Message[]>;
    /**
     * Thêm tin nhắn vào lịch sử
     * Lưu đồng thời vào RAM và đĩa cứng
     */
    addMessage(channelId: string, message: Message): Promise<void>;
    /**
     * Xóa cache RAM và load lại từ đĩa
     */
    reloadChannel(channelId: string): Promise<void>;
    /**
     * Lấy danh sách tất cả kênh đang có bộ nhớ
     */
    listActiveChannels(): Promise<string[]>;
}
export default MemoryCore;
