import { SessionManager, SessionState } from './session-manager.js';
import { Logger } from '../../core/logger.js';
import { AgentConfig } from '../../core/engine/agent.js';
import { ToolRegistry } from '../../core/tools/tool-registry.js';
import { AgentRegistry } from '../../core/agents/delegate.js';

const logger = new Logger({ module: 'TelegramHandler' });

export interface TelegramMessage {
  userId: string;
  text: string;
  chatId: string; // Make chatId required
  messageId?: string;
}

export interface TelegramResponse {
  text: string;
  sessionId: string;
  sentIntro: boolean;
}

/** Callback for sending streaming progress messages */
export type StreamResponder = (text: string) => Promise<void>;

/**
 * TelegramMessageHandler: Platform layer for Telegram
 * 
 * Handles session management and routes all messages to Coral AI agent.
 * Hermes-style: no pre-filter, AI decides how to handle each message.
 */
export class TelegramMessageHandler {
  private sessionManager: SessionManager;
  private coralAgent: any;
  private observability?: any;

  constructor(coralAgent: any, observability?: any) {
    this.sessionManager = new SessionManager();
    this.coralAgent = coralAgent;
    this.observability = observability;
  }

  /**
   * Static intro message for first-time users
   */
  static getIntroMessage(): string {
    return `🌊 Welcome to Coral!\n\nI'm Coral, your AI companion. I can help you with:\n• Information retrieval\n• Task automation\n• Learning and knowledge sharing\n\nJust send me a message to get started!`;
  }

  /**
   * Static bootstrap intro message for admin setup
   */
  static getBootstrapIntroMessage(): string {
    return `🌊 Coral Bootstrap Mode\n\nYou are the admin. I can help you with:\n• User management\n• System configuration\n• Monitoring and alerts\n\nUse /admin to manage users and settings.`;
  }

  /**
   * Handle an incoming Telegram message — Hermes-style.
   * AI nhận mọi tin nhắn, tự quyết định cách xử lý (tool calling, research, etc.)
   */
  async handleMessage(message: TelegramMessage & { modelId?: string }): Promise<TelegramResponse> {
    const { userId, text, chatId, modelId } = message;

    // Get or create session — SessionManager is per-user, channelId is transport metadata only
    let session = this.sessionManager.getSession(userId);

    if (!session) {
      session = this.sessionManager.createSession(userId);
    }

    let agentResponse: string;

    // Hermes-style: AI nhận mọi tin nhắn, tự quyết định cách xử lý
    try {
      const result = await this.coralAgent.process({
        sessionId: session.sessionId,
        messages: [{ role: 'user', content: text, timestamp: Date.now() }],
        modelId: modelId || 'default',
        agentName: 'Coral',
        protocol: 'telegram',
        mentionPrefix: '',
        task: text,
      });
      agentResponse = result.content || '';
    } catch (err: any) {
      logger.error(`[${userId}] Agent error: ${err.message}`);
      agentResponse = `❌ Lỗi khi xử lý: ${err.message}`;
    }

    this.sessionManager.updateLastActivity(userId);

    return {
      text: agentResponse,
      sessionId: session.sessionId,
      sentIntro: session.introSent,
    };
  }

  // ── Lifecycle ──

  /**
   * Set the stream responder (kept for backward compatibility)
   */
  setStreamResponder(responder: StreamResponder): void {
    // No longer used — DelegationOrchestrator handles streaming progress natively
  }

  /**
   * Clear the stream responder (kept for backward compatibility)
   */
  clearStreamResponder(): void {
    // No longer used — DelegationOrchestrator handles streaming progress natively
  }

  /**
   * Get active session count (for monitoring)
   */
  getActiveSessionCount(): number {
    return this.sessionManager.getActiveCount();
  }

  /**
     * Get session info for a user
     */
    getSessionInfo(userId: string): { userId: string; introSent: boolean; sessionId: string } | undefined {
      const session = this.sessionManager.getSession(userId);
      if (!session) {
        return undefined;
      }
      return {
        userId: session.userId,
        introSent: session.introSent,
        sessionId: session.sessionId,
      };
    }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.sessionManager.destroy();
  }
}
