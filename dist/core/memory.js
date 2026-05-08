/**
 * Kato Multi-Layer Memory Core
 * Framework 6 Layers Claude Code - Lớp 2 Bộ Nhớ
 *
 * Kiến trúc bộ nhớ 3 lớp:
 * 🔹 Lớp 0: RAM Cache - 20 tin nhắn gần nhất (Hot Path)
 * 🔹 Lớp 1: File System - Lịch sử đầy đủ trên đĩa cứng
 * 🔹 Lớp 2: Knowledge Wiki - Tóm tắt thông tin quan trọng dài hạn
 */
import fs from 'fs/promises';
import path from 'path';
import 'dotenv/config';
export class MemoryCore {
    memoryPath;
    MAX_RAM_MESSAGES = 20;
    channelCache;
    constructor() {
        this.memoryPath = process.env.MEMORY_PATH || './knowledge/memory';
        this.channelCache = new Map();
        this.initializeStorage();
    }
    async initializeStorage() {
        try {
            await fs.mkdir(this.memoryPath, { recursive: true });
            console.log(`✅ MemoryCore initialized at: ${this.memoryPath}`);
        }
        catch (error) {
            console.error(`❌ Failed to initialize memory storage:`, error);
        }
    }
    getChannelFilePath(channelId) {
        return path.join(this.memoryPath, `${channelId}.json`);
    }
    /**
     * Lấy lịch sử hội thoại của kênh
     * Tự động nạp từ đĩa nếu chưa có trong cache RAM
     */
    async getChannelHistory(channelId) {
        if (this.channelCache.has(channelId)) {
            return [...this.channelCache.get(channelId)];
        }
        try {
            const filePath = this.getChannelFilePath(channelId);
            const data = await fs.readFile(filePath, 'utf8');
            const history = JSON.parse(data);
            // Chỉ giữ 20 tin gần nhất trong RAM
            const trimmedHistory = history.slice(-this.MAX_RAM_MESSAGES);
            this.channelCache.set(channelId, [...trimmedHistory]);
            console.log(`📥 Loaded ${trimmedHistory.length} messages for channel ${channelId}`);
            return [...trimmedHistory];
        }
        catch (error) {
            // File chưa tồn tại => kênh mới
            const emptyHistory = [];
            this.channelCache.set(channelId, [...emptyHistory]);
            return [...emptyHistory];
        }
    }
    /**
     * Thêm tin nhắn vào lịch sử
     * Lưu đồng thời vào RAM và đĩa cứng
     */
    async addMessage(channelId, message) {
        const history = await this.getChannelHistory(channelId);
        history.push({
            ...message,
            timestamp: Date.now()
        });
        // Giới hạn RAM cache
        while (history.length > this.MAX_RAM_MESSAGES) {
            history.shift();
        }
        this.channelCache.set(channelId, history);
        // Lưu xuống đĩa bất đồng bộ
        setImmediate(async () => {
            try {
                const filePath = this.getChannelFilePath(channelId);
                await fs.writeFile(filePath, JSON.stringify(history, null, 2));
            }
            catch (error) {
                console.error(`❌ Failed to save channel history:`, error);
            }
        });
    }
    /**
     * Xóa cache RAM và load lại từ đĩa
     */
    async reloadChannel(channelId) {
        this.channelCache.delete(channelId);
        await this.getChannelHistory(channelId);
    }
    /**
     * Lấy danh sách tất cả kênh đang có bộ nhớ
     */
    async listActiveChannels() {
        const files = await fs.readdir(this.memoryPath);
        return files.filter(f => f.endsWith('.json')).map(f => f.replace('.json', ''));
    }
}
export default MemoryCore;
//# sourceMappingURL=memory.js.map