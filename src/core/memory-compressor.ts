/**
 * Kato Local Memory Compressor
 * Framework 6 Layers — Lớp Bộ Nhớ (Memory Layer)
 * 
 * LLM nhỏ cục bộ chỉ làm duy nhất 1 công việc:
 * Nén lịch sử hội thoại thành 1 thông báo tóm tắt ngắn gọn.
 * Chạy hoàn toàn offline, không tốn token cloud, không cần internet.
 * 
 * [V5.2] Khôi phục compression bằng Ollama LLM (giống v4.0)
 * [V5.2] Fallback an toàn khi local LLM không khả dụng
 */

import OpenAI from 'openai';
import { Message } from './memory.js';

export class MemoryCompressor {
  private client: OpenAI;
  private readonly MAX_SUMMARY_TOKENS = 500;
  private readonly MAX_HISTORY_MESSAGES = 20; // Keep only most recent N for compression

  constructor() {
    // Mặc định kết nối Ollama chạy trên cổng 11434 máy local
    this.client = new OpenAI({
      baseURL: process.env.LOCAL_LLM_URL || 'http://127.0.0.1:11434/v1',
      apiKey: 'ollama',
    });

    console.log(`✅ MemoryCompressor initialized with local LLM endpoint`);
  }

  /**
   * Nén lịch sử hội thoại:
   * - Nếu local LLM khả dụng: nén 20 tin nhắn → 1 tóm tắt 500 token
   * - Nếu local LLM không khả dụng: fallback an toàn (giữ 5 tin gần nhất)
   */
  public async compressHistory(history: Message[]): Promise<string> {
    if (history.length <= 3) {
      // Không cần nén nếu ít hơn 3 tin nhắn
      return history.map(m => `${m.role}: ${m.content}`).join('\n');
    }

    // Chỉ lấy N tin gần nhất để nén
    const recentHistory = history.slice(-this.MAX_HISTORY_MESSAGES);

    try {
      console.log(`🔄 Compressing ${recentHistory.length} messages via local LLM...`);

      const prompt = `
Bạn là bộ nhớ của Kato Agent. 
Nhiệm vụ duy nhất của bạn là tóm tắt ngắn gọn toàn bộ cuộc hội thoại trên thành 1 đoạn văn 500 từ.

QUY TẮC:
1. Chỉ giữ lại thông tin quan trọng, sự thật, yêu cầu của user
2. Bỏ qua tất cả các lời nói lễ phép, chào hỏi không cần thiết
3. Giữ nguyên tất cả các thông tin kỹ thuật, số liệu, yêu cầu công việc
4. Đánh dấu những gì user đã yêu cầu và những gì đã hoàn thành
5. Viết bằng tiếng Việt ngắn gọn, súc tích

LỊCH SỬ:
${recentHistory.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n\n')}

TÓM TẮT:
`;

      const response = await this.client.chat.completions.create({
        model: process.env.LOCAL_LLM_MODEL || 'llama3:8b',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        max_tokens: this.MAX_SUMMARY_TOKENS,
      });

      const summary = response.choices[0].message.content || '';
      console.log(`✅ Memory compressed: ${summary.length} chars → ${recentHistory.length} messages`);
      return summary;

    } catch (error) {
      console.warn(`⚠️ Local LLM not available (${(error as Error).message}), using fallback: last ${this.MAX_HISTORY_MESSAGES} messages`);
      
      // Fallback an toàn: gửi 5 tin nhắn gần nhất
      const fallback = recentHistory.slice(-5).map(m => `${m.role}: ${m.content}`).join('\n');
      return fallback;
    }
  }
}

export default MemoryCompressor;