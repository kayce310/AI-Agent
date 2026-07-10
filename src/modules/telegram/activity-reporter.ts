/**
 * @file Activity Reporter — Typing + Emoji + Heartbeat
 * @layer modules
 * @depends-on grammy Bot
 * @imported-by src/modules/telegram/index.ts
 */

import { Bot } from 'grammy';

export class ActivityReporter {
  private bot: Bot;
  private typingIntervals: Map<string, NodeJS.Timeout> = new Map();
  private heartbeatTimeouts: Map<string, NodeJS.Timeout> = new Map();
  private reactionMessageIds: Map<string, number> = new Map();

  constructor(bot: Bot) {
    this.bot = bot;
  }

  /**
   * Start activity reporting for a message.
   * 1. Typing loop (every 3s)
   * 2. Emoji reaction: eyes (after 500ms)
   * 3. Heartbeat message (after 15s if still processing)
   */
  start(chatId: string, messageId: string): void {
    const key = `${chatId}:${messageId}`;

    // 1. Typing loop — sendChatAction every 3s
    //    Telegram typing expires after ~5s, so we refresh every 3s
    const typingInterval = setInterval(async () => {
      try {
        await this.bot.api.sendChatAction(Number(chatId), 'typing');
      } catch {
        // Silent fail — typing errors are non-fatal (e.g., bot kicked from channel)
      }
    }, 3000);
    this.typingIntervals.set(key, typingInterval);

    // 2. Emoji reaction: 👀 after 500ms
    setTimeout(async () => {
      try {
        await this.bot.api.setMessageReaction(Number(chatId), Number(messageId), [
          { type: 'emoji', emoji: '\u{1F440}' }  // 👀
        ]);
      } catch {
        // Silent fail — reactions may not be supported
      }
    }, 500);

    // Remove deprecated heartbeat — onThinking provides live updates now
    // (old heartbeat used to send '⏳ Đang xử lý...' after 15s; redundant with streaming thinking)

    // Cleanup check: store for stop() to clear resources
    this.heartbeatTimeouts.set(key, null as any);
  }

  /**
   * Stop activity reporting and send final reaction.
   */
  async stop(chatId: string, messageId: string): Promise<void> {
    const key = `${chatId}:${messageId}`;

    // Clear typing loop
    const typingInterval = this.typingIntervals.get(key);
    if (typingInterval) {
      clearInterval(typingInterval);
      this.typingIntervals.delete(key);
    }

    // Clear heartbeat timeout
    const heartbeatTimeout = this.heartbeatTimeouts.get(key);
    if (heartbeatTimeout) {
      clearTimeout(heartbeatTimeout);
      this.heartbeatTimeouts.delete(key);
    }

    // Delete heartbeat message if sent (no longer sent — kept for backward compat)
    const heartbeatMsgId = this.reactionMessageIds.get(key);
    if (heartbeatMsgId) {
      try {
        await this.bot.api.deleteMessage(Number(chatId), heartbeatMsgId);
      } catch (err: any) {
        // Silent fail — bot may be kicked from channel
      }
      this.reactionMessageIds.delete(key);
    }

    // Clear the null placeholder set by start()
    if (this.heartbeatTimeouts.has(key)) {
      this.heartbeatTimeouts.delete(key);
    }

    // Final reaction: 👍
    try {
      await this.bot.api.setMessageReaction(Number(chatId), Number(messageId), [
        { type: 'emoji', emoji: '👍' }  // 👍
      ]);
    } catch (err: any) {
      // Silent fail — bot may be kicked from channel
    }
  }
}
