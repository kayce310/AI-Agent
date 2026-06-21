import { SessionManager, SessionState } from './session-manager';
import { ObservabilityIntegration } from '../../observability/integration';
import { Logger } from '../../core/logger';

const logger = new Logger({ module: 'TelegramHandler' });

export interface TelegramMessage {
  userId: string;
  text: string;
  chatId?: string;
  messageId?: string;
}

export interface TelegramResponse {
  text: string;
  sessionId: string;
  sentIntro: boolean;
}

/**
 * TelegramMessageHandler: Platform layer for Telegram
 * 
 * Responsibilities:
 * - Manage session state (intro deduplication)
 * - Record session events to observability
 * - Route messages to stateless Coral agent
 * - Preserve UX continuity across agent restarts
 */
export class TelegramMessageHandler {
  private sessionManager: SessionManager;
  private observability: ObservabilityIntegration | null;
  private coralAgent: any; // Will be injected

  constructor(coralAgent: any, observability?: ObservabilityIntegration) {
    this.sessionManager = new SessionManager();
    this.observability = observability || null;
    this.coralAgent = coralAgent;
  }

  /**
   * Main entry point for handling Telegram messages
   */
  async handleMessage(message: TelegramMessage): Promise<TelegramResponse> {
    const { userId, text } = message;

    try {
      // Get or create session
      const session = this.sessionManager.getOrCreateSession(userId);
      const isNewSession = !session.introSent;

      // Record session activity
      await this.recordSessionActivity(session, 'message_received', isNewSession);

      let response = '';

      // Send intro only if first time in session
      if (!session.introSent) {
        response = this.getIntroMessage();
        this.sessionManager.markIntroSent(userId);

        await this.recordIntroSent(session);
        logger.info(`[${userId}] Intro sent for new session ${session.sessionId}`);
      }

      // Route to Coral agent (stateless, doesn't know about sessions)
      const agentResponse = await this.coralAgent.handleMessage(
        session.sessionId,
        text
      );

      // Update activity timestamp
      this.sessionManager.updateLastActivity(userId);

      return {
        text: response + agentResponse,
        sessionId: session.sessionId,
        sentIntro: isNewSession,
      };
    } catch (error) {
      logger.error(`Failed to handle message from ${userId}:`, error);

      // Return error response without crashing
      return {
        text: '❌ Xin lỗi, tôi gặp lỗi. Vui lòng thử lại sau.',
        sessionId: 'error-session',
        sentIntro: false,
      };
    }
  }

  /**
   * Get intro message for new sessions
   */
  private getIntroMessage(): string {
    return `🪸 Xin chào! Tôi là Coral, trợ lý AI của bạn. Tôi sẽ giúp bạn với:
- 🌤️ Thời tiết & cảnh báo
- 📅 Lịch sử & nhắc nhở
- 🏠 Điều khiển nhà thông minh
- 💡 Tư vấn và học tập
- ...và nhiều việc khác

Bắt đầu bằng cách hỏi tôi gì đó! 

`;
  }

  /**
   * Record session activity to observability
   */
  private async recordSessionActivity(
    session: SessionState,
    action: 'message_received' | 'session_created' | 'session_expired',
    isNewSession: boolean
  ): Promise<void> {
    if (!this.observability) return;

    try {
      await this.observability.recordError({
        source: 'session',
        message: `${action}:${session.userId}:${isNewSession ? 'new' : 'existing'}`,
        context: {
          sessionId: session.sessionId,
          userId: session.userId,
          action,
          isNewSession,
        },
      });
    } catch (error) {
      logger.warn('Failed to record session activity:', error);
      // Non-blocking: don't fail message handling if observability fails
    }
  }

  /**
   * Record intro sent event
   */
  private async recordIntroSent(session: SessionState): Promise<void> {
    if (!this.observability) return;

    try {
      await this.observability.recordError({
        source: 'session_intro',
        message: `intro_sent:${session.userId}`,
        context: {
          sessionId: session.sessionId,
          userId: session.userId,
        },
      });
    } catch (error) {
      logger.warn('Failed to record intro sent:', error);
      // Non-blocking
    }
  }

  /**
   * Get session info for debugging
   */
  getSessionInfo(userId: string): SessionState | undefined {
    return this.sessionManager.getSession(userId);
  }

  /**
   * Get active session count
   */
  getActiveSessionCount(): number {
    return this.sessionManager.getActiveCount();
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.sessionManager.destroy();
    logger.info('TelegramMessageHandler destroyed');
  }
}
