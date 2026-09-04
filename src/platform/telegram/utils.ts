/**
 * @file utils — Telegram platform utilities
 * @layer platform/telegram
 */

/**
 * Derive channel ID from Telegram chat ID.
 * @param chatId — Telegram chat identifier
 * @returns channel ID string
 */
export function getChannelIdFromChatId(chatId: string): string {
  return chatId;
}
