import { SessionManager, SessionState } from './session-manager';
import { ObservabilityIntegration } from '../../observability/integration';
import { Logger } from '../../core/logger';
import { CoralAgentLoop } from '../../core/agent/agent-loop';

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
 * - Platform-agnostic (used by TelegramBridge and tests)
 */
export class TelegramMessageHandler {
  private sessionManager: SessionManager;
  private observability: ObservabilityIntegration | null;
  private coralAgent: any;
  private agentLoop: CoralAgentLoop;

  constructor(coralAgent: any, observability?: ObservabilityIntegration) {
    this.sessionManager = new SessionManager();
    this.observability = observability || null;
    this.coralAgent = coralAgent;
    this.agentLoop = new CoralAgentLoop(logger, async (prompt: string, context: string, stepLabel: string) => {
      // Execute a step through the coral agent's handleMessage
      return await coralAgent.handleMessage(
        'agent-loop-' + stepLabel,
        prompt
      );
    }, {
      maxSteps: 5,
      timeoutPerStepMs: 60000
    });
  }

  /**
   * Get the intro message text (static for use by TelegramBridge commands)
   */
  static getIntroMessage(): string {
    return `🪸 Xin chào! Tôi là Coral, trợ lý AI của bạn. Tôi sẽ giúp bạn với:
• 🌤️ Thời tiết & cảnh báo
• 📅 Lịch sử & nhắc nhở
• 🏠 Điều khiển nhà thông minh
• 💡 Tư vấn và học tập
• ...và nhiều việc khác

Bắt đầu bằng cách hỏi tôi gì đó!`;
  }

  /**
   * Get the session intro for a returning user
   */
  static getReturningIntroMessage(username?: string): string {
    const name = username || 'bạn';
    return `👋 Chào ${name}! Chúng ta lại gặp nhau rồi. Cần tôi giúp gì không?`;
  }

  /**
   * Get admin bootstrap intro
   */
  static getBootstrapIntroMessage(): string {
    return `🪸 Xin chào! Tôi là **Coral** — AI Agent.
Bạn là admin đầu tiên được thiết lập!

Gửi tin nhắn bất kỳ để tôi hỗ trợ.`;
  }

  /**
   * Main entry point for handling Telegram messages
   * Returns { text, sessionId, sentIntro }
   */
  async handleMessage(message: TelegramMessage): Promise<TelegramResponse> {
    const { userId, text } = message;

    try {
      // Get or create session (with TTL check)
      const session = this.sessionManager.getOrCreateSession(userId);
      const isNewSession = !session.introSent;

      // Record session activity
      await this.recordSessionActivity(session, 'message_received', isNewSession);

      let response = '';

      // Send intro only if first time in session
      if (!session.introSent) {
        response = TelegramMessageHandler.getIntroMessage() + '\n\n';
        this.sessionManager.markIntroSent(userId);

        await this.recordIntroSent(session);
        logger.info(`[${userId}] Intro sent for new session ${session.sessionId}`);
      }

      // Route to Coral agent (stateless, doesn't know about sessions)
      // But first check if this is a complex task for the agent loop
      let agentResponse: string;

      if (this.agentLoop.isComplexTask(text)) {
        logger.info(`[${userId}] Complex task detected, routing to agent loop`);
        const loopResult = await this.agentLoop.execute(
          text,
          `Session: ${session.sessionId}\nUser: ${userId}`
        );

        if (loopResult.success) {
          agentResponse = loopResult.result;
        } else {
          // Fallback to regular agent on failure
          logger.warn(`[${userId}] Agent loop failed, falling back to regular agent: ${loopResult.error}`);
          agentResponse = await this.coralAgent.handleMessage(
            session.sessionId,
            text
          );
        }
      } else {
        agentResponse = await this.coralAgent.handleMessage(
          session.sessionId,
          text
        );
      }

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
   * Check if user needs intro (for /start command)
   */
  needsIntro(userId: string): boolean {
    const session = this.sessionManager.getSession(userId);
    return !session || !session.introSent;
  }

  /**
   * Mark intro as sent for a user (for /start command)
   */
  markIntroSentForUser(userId: string): void {
    this.sessionManager.getOrCreateSession(userId);
    this.sessionManager.markIntroSent(userId);
    this.sessionManager.updateLastActivity(userId);
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
    }
  }

  /**
   * Record command event
   */
  async recordCommand(userId: string, command: string): Promise<void> {
    if (!this.observability) return;

    try {
      await this.observability.recordError({
        source: 'command',
        message: `cmd:${userId}:${command}`,
        context: { userId, command },
      });
    } catch (error) {
      logger.warn('Failed to record command:', error);
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
   * Get the underlying session manager (for bridge integration)
   */
  getSessionManager(): SessionManager {
    return this.sessionManager;
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.sessionManager.destroy();
    logger.info('TelegramMessageHandler destroyed');
  }
}
