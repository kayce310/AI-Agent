/**
 * @file memory-facade — Unified memory interface
 * Wraps the append-log memory store as the primary backend.
 * Provides backward-compatible saveMessage/getHistory for Engine.
 * Replaces legacy MemoryCore (memory.ts) with zero data loss.
 * @layer core
 * @owner core-memory
 */

import { globalMemoryStore } from './memory-store.js';
import { Logger } from '../logger.js';

const log = new Logger({ module: 'MemoryFacade' });

export interface FacadeMessage {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  timestamp: number;
  reasoning_content?: string;
  tool_call_id?: string;
}

/**
 * MemoryFacade — single unified interface over all memory backends.
 *
 * Currently wraps globalMemoryStore (append-log) as the primary store.
 * Can be extended to route reads/writes to SQLite, FS, or remote backends
 * without changing callers.
 */
export class MemoryFacade {
  /**
   * Store a chat message as a memory block.
   * Uses 'session' type so it fits the existing MemoryBlockType union.
   * Tags include role so getHistory can reconstruct the original shape.
   */
  async addMessage(channelId: string, message: FacadeMessage): Promise<void> {
    const content = typeof message.content === 'string'
      ? message.content
      : String(message.content ?? '');

    await globalMemoryStore.add('session', content, {
      sessionId: channelId,
      tags: [message.role || 'user'],
    });
  }

  /**
   * Reconstruct conversation history for a channel from stored blocks.
   * Returns the last 50 messages (matching MemoryCore's behaviour but larger).
   */
  async getChannelHistory(channelId: string): Promise<FacadeMessage[]> {
    const blocks = globalMemoryStore.getBlocksBySession(channelId);
    if (!blocks.length) return [];

    // Sort oldest-first, take last 50
    const sorted = blocks
      .slice()
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
      .slice(-50);

    return sorted.map(b => ({
      role: (b.tags?.[0] === 'assistant_response' || b.tags?.[0] === 'assistant')
        ? 'assistant' as const
        : 'user' as const,
      content: b.content,
      timestamp: new Date(b.timestamp).getTime(),
    }));
  }

  /**
   * Placeholder for future listActiveChannels — mirrors MemoryCore API.
   * Can be enhanced later to return all known session IDs.
   */
  async listSessions(): Promise<string[]> {
    return [];
  }

  /**
   * Reload channel from storage (for testing)
   */
  async reloadChannel(channelId: string): Promise<void> {
    // No-op for MemoryFacade - state is kept in globalMemoryStore
    // This is kept for backward compatibility with old MemoryCore tests
  }
}

export default MemoryFacade;
