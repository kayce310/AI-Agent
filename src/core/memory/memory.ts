/**
 * @file memory â€” Memory module
 * @layer core
 * @depends-on src/core/types.ts
 * @imported-by src/core/engine/engine.ts
 * @owner core-memory
 */

/**
 * Kato Multi-Layer Memory Core
 * Framework 6 Layers Claude Code - Lá»›p 2 Bá»™ Nhá»›
 * 
 * Kiáº¿n trÃºc bá»™ nhá»› 3 lá»›p:
 * ðŸ”¹ Lá»›p 0: RAM Cache - 20 tin nháº¯n gáº§n nháº¥t (Hot Path)
 * ðŸ”¹ Lá»›p 1: File System - Lá»‹ch sá»­ Ä‘áº§y Ä‘á»§ trÃªn Ä‘Ä©a cá»©ng
 * ðŸ”¹ Lá»›p 2: Knowledge Wiki - TÃ³m táº¯t thÃ´ng tin quan trá»ng dÃ i háº¡n
 */

import fs from 'fs/promises';
import path from 'path';
import 'dotenv/config';

export interface Message {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  timestamp: number;
  /** DeepSeek thinking mode: reasoning_content pháº£i Ä‘Æ°á»£c preserve */
  reasoning_content?: string;
  /** Tool call ID (cho tool messages) */
  tool_call_id?: string;
}

export class MemoryCore {
  private memoryPath: string;
  private readonly MAX_RAM_MESSAGES = 20;
  private channelCache: Map<string, Message[]>;

  constructor() {
    this.memoryPath = process.env.MEMORY_PATH || './knowledge/memory';
    this.channelCache = new Map();
    this.initializeStorage();
  }

  private async initializeStorage(): Promise<void> {
    try {
      await fs.mkdir(this.memoryPath, { recursive: true });
      console.log(`[Memory] Storage initialized at ${this.memoryPath}`);
    } catch (error) {
      console.error(`[Memory] Failed to create storage directory: ${error}`);
    }
  }

  private getChannelFilePath(channelId: string): string {
    return path.join(this.memoryPath, `${channelId}.json`);
  }

  /**
   * Láº¥y lá»‹ch sá»­ há»™i thoáº¡i cá»§a kÃªnh
   * Tá»± Ä‘á»™ng náº¡p tá»« Ä‘Ä©a náº¿u chÆ°a cÃ³ trong cache RAM
   */
  public async getChannelHistory(channelId: string): Promise<Message[]> {
    if (this.channelCache.has(channelId)) {
      return [...this.channelCache.get(channelId)!];
    }

    try {
      const filePath = this.getChannelFilePath(channelId);
      const data = await fs.readFile(filePath, 'utf8');
      const history = JSON.parse(data) as Message[];
      
      // Chá»‰ giá»¯ 20 tin gáº§n nháº¥t trong RAM
      const trimmedHistory = history.slice(-this.MAX_RAM_MESSAGES);
      this.channelCache.set(channelId, [...trimmedHistory]);
      
      console.log(`[Memory] Loaded ${history.length} message(s) for channel ${channelId}`);
      return [...trimmedHistory];

    } catch (error) {
      // File chÆ°a tá»“n táº¡i => kÃªnh má»›i
      const emptyHistory: Message[] = [];
      this.channelCache.set(channelId, [...emptyHistory]);
      return [...emptyHistory];
    }
  }

  /**
   * ThÃªm tin nháº¯n vÃ o lá»‹ch sá»­
   * LÆ°u Ä‘á»“ng thá»i vÃ o RAM vÃ  Ä‘Ä©a cá»©ng
   */
  public async addMessage(channelId: string, message: Message): Promise<void> {
    const history = await this.getChannelHistory(channelId);
    
    history.push({
      ...message,
      timestamp: Date.now()
    });

    // Giá»›i háº¡n RAM cache
    while (history.length > this.MAX_RAM_MESSAGES) {
      history.shift();
    }

    this.channelCache.set(channelId, history);

    // LÆ°u xuá»‘ng Ä‘Ä©a báº¥t Ä‘á»“ng bá»™
    setImmediate(async () => {
      try {
        const filePath = this.getChannelFilePath(channelId);
        await fs.writeFile(filePath, JSON.stringify(history, null, 2));
      } catch (error) {
        console.error(`[Memory] Failed to persist channel ${channelId}: ${error}`);
      }
    });
  }

  /**
   * XÃ³a cache RAM vÃ  load láº¡i tá»« Ä‘Ä©a
   */
  public async reloadChannel(channelId: string): Promise<void> {
    this.channelCache.delete(channelId);
    await this.getChannelHistory(channelId);
  }

  /**
   * Láº¥y danh sÃ¡ch táº¥t cáº£ kÃªnh Ä‘ang cÃ³ bá»™ nhá»›
   */
  public async listActiveChannels(): Promise<string[]> {
    const files = await fs.readdir(this.memoryPath);
    return files.filter(f => f.endsWith('.json')).map(f => f.replace('.json', ''));
  }
}

export default MemoryCore;