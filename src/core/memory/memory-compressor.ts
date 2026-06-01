/**
 * @file memory-compressor â€” Memory module
 * @layer core
 * @depends-on src/core/types.ts
 * @imported-by src/core/engine/engine.ts
 * @owner core-memory
 */

/**
 * Kato Local Memory Compressor
 * Framework 6 Layers â€” Lá»›p Bá»™ Nhá»› (Memory Layer)
 * 
 * LLM nhá» cá»¥c bá»™ chá»‰ lÃ m duy nháº¥t 1 cÃ´ng viá»‡c:
 * NÃ©n lá»‹ch sá»­ há»™i thoáº¡i thÃ nh 1 thÃ´ng bÃ¡o tÃ³m táº¯t ngáº¯n gá»n.
 * Cháº¡y hoÃ n toÃ n offline, khÃ´ng tá»‘n token cloud, khÃ´ng cáº§n internet.
 * 
 * [V5.2] KhÃ´i phá»¥c compression báº±ng Ollama LLM (giá»‘ng v4.0)
 * [V5.2] Fallback an toÃ n khi local LLM khÃ´ng kháº£ dá»¥ng
 */

import OpenAI from 'openai';
import { Message } from './memory.js';

export class MemoryCompressor {
  private client: OpenAI;
  private readonly MAX_SUMMARY_TOKENS = 500;
  private readonly MAX_HISTORY_MESSAGES = 20; // Keep only most recent N for compression

  constructor() {
    // Máº·c Ä‘á»‹nh káº¿t ná»‘i Ollama cháº¡y trÃªn cá»•ng 11434 mÃ¡y local
    this.client = new OpenAI({
      baseURL: process.env.LOCAL_LLM_URL || 'http://127.0.0.1:11434/v1',
      apiKey: 'ollama',
    });

    /* debug log removed */
  }

  /**
   * NÃ©n lá»‹ch sá»­ há»™i thoáº¡i:
   * - Náº¿u local LLM kháº£ dá»¥ng: nÃ©n 20 tin nháº¯n â†’ 1 tÃ³m táº¯t 500 token
   * - Náº¿u local LLM khÃ´ng kháº£ dá»¥ng: fallback an toÃ n (giá»¯ 5 tin gáº§n nháº¥t)
   */
  public async compressHistory(history: Message[]): Promise<string> {
    if (history.length <= 3) {
      // KhÃ´ng cáº§n nÃ©n náº¿u Ã­t hÆ¡n 3 tin nháº¯n
      return history.map(m => `${m.role}: ${m.content}`).join('\n');
    }

    // Chá»‰ láº¥y N tin gáº§n nháº¥t Ä‘á»ƒ nÃ©n
    const recentHistory = history.slice(-this.MAX_HISTORY_MESSAGES);

    try {
      /* debug log removed */

      const prompt = `
Báº¡n lÃ  bá»™ nhá»› cá»§a Kato Agent. 
Nhiá»‡m vá»¥ duy nháº¥t cá»§a báº¡n lÃ  tÃ³m táº¯t ngáº¯n gá»n toÃ n bá»™ cuá»™c há»™i thoáº¡i trÃªn thÃ nh 1 Ä‘oáº¡n vÄƒn 500 tá»«.

QUY Táº®C:
1. Chá»‰ giá»¯ láº¡i thÃ´ng tin quan trá»ng, sá»± tháº­t, yÃªu cáº§u cá»§a user
2. Bá» qua táº¥t cáº£ cÃ¡c lá»i nÃ³i lá»… phÃ©p, chÃ o há»i khÃ´ng cáº§n thiáº¿t
3. Giá»¯ nguyÃªn táº¥t cáº£ cÃ¡c thÃ´ng tin ká»¹ thuáº­t, sá»‘ liá»‡u, yÃªu cáº§u cÃ´ng viá»‡c
4. ÄÃ¡nh dáº¥u nhá»¯ng gÃ¬ user Ä‘Ã£ yÃªu cáº§u vÃ  nhá»¯ng gÃ¬ Ä‘Ã£ hoÃ n thÃ nh
5. Viáº¿t báº±ng tiáº¿ng Viá»‡t ngáº¯n gá»n, sÃºc tÃ­ch

Lá»ŠCH Sá»¬:
${recentHistory.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n\n')}

TÃ“M Táº®T:
`;

      const response = await this.client.chat.completions.create({
        model: process.env.LOCAL_LLM_MODEL || 'llama3:8b',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        max_tokens: this.MAX_SUMMARY_TOKENS,
      });

      const summary = response.choices[0].message.content || '';
      /* debug log removed */
      return summary;

    } catch (error) {
      .message}), using fallback: last ${this.MAX_HISTORY_MESSAGES} messages`);
      
      // Fallback an toÃ n: gá»­i 5 tin nháº¯n gáº§n nháº¥t
      const fallback = recentHistory.slice(-5).map(m => `${m.role}: ${m.content}`).join('\n');
      return fallback;
    }
  }
}

export default MemoryCompressor;
