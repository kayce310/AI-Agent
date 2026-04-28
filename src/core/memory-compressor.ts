/**
 * Kato Local Memory Compressor
 * Framework 6 Layers Claude Code - Lớp Bộ Nhớ
 * 
 * LLM nhỏ cục bộ chỉ làm duy nhất 1 công việc:
 * Nén 20 tin nhắn lịch sử thành 1 thông báo tóm tắt 500 token
 * Chạy hoàn toàn offline, không tốn token, không cần internet
 */

import OpenAI from 'openai';
import { Message } from './memory.js';

export class MemoryCompressor {
  private client: OpenAI;
  private readonly MAX_SUMMARY_TOKENS = 500;

  constructor() {
    // Mặc định kết nối Ollama chạy trên cổng 11434 máy local
    this.client = new OpenAI({
      baseURL: process.env.LOCAL_LLM_URL || 'http://127.0.0.1:11434/v1',
      apiKey: 'ollama',
    });

    console.log(`✅ MemoryCompressor initialized with local LLM endpoint`);
  }

  /**
   * Nén toàn bộ lịch sử hội thoại thành 1 thông báo tóm tắt ngắn gọn
   * Chỉ giữ lại thông tin quan trọng, bỏ qua các chi tiết không liên quan
   */
  public async compressHistory(history: Message[]): Promise<string> {
    if (history.length <= 3) {
      // Không cần nén nếu ít hơn 3 tin nhắn
      return history.map(m => `${m.role}: ${m.content}`).join('\n');
    }

    try {
      console.log(`🔄 Compressing ${history.length} messages history...`);

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
${history.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n\n')}

TÓM TẮT:
`;

      const response = await this.client.chat.completions.create({
        model: process.env.LOCAL_LLM_MODEL || 'llama3:8b',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        max_tokens: this.MAX_SUMMARY_TOKENS,
      });

      const summary = response.choices[0].message.content || '';
      console.log(`✅ History compressed: ${summary.length} characters`);

      return summary;

    } catch (error) {
      console.warn(`⚠️ Local LLM not available, falling back to raw history`);
      
      // Fallback: chỉ gửi 5 tin nhắn gần nhất
      return history.slice(-5).map(m => `${m.role}: ${m.content}`).join('\n');
    }
  }
}

export default MemoryCompressor;