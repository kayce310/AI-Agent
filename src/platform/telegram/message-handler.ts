import { SessionManager, SessionState } from './session-manager';
import { ObservabilityIntegration } from '../../observability/integration';
import { Logger } from '../../core/logger';
import {
  StreamingReActLoop,
  StreamEvent,
  TimeoutError,
  isComplexTask
} from '../../core/agent/react-loop';

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

/** Callback for sending streaming progress messages */
export type StreamResponder = (text: string) => Promise<void>;

/**
 * TelegramMessageHandler: Platform layer for Telegram
 * 
 * Handles session management, complex task routing, and streaming progress.
 */
export class TelegramMessageHandler {
  private sessionManager: SessionManager;
  private observability: ObservabilityIntegration | null;
  private coralAgent: any;
  private reactLoop: StreamingReActLoop;
  private streamResponder: StreamResponder | null = null;

  constructor(coralAgent: any, observability?: ObservabilityIntegration) {
    this.sessionManager = new SessionManager();
    this.observability = observability || null;
    this.coralAgent = coralAgent;

    // Create the streaming React loop with handleMessage as task runner
    this.reactLoop = new StreamingReActLoop(
      logger,
      async (prompt: string, context: string, stepLabel: string) => {
        // Execute a step through the coral agent's handleMessage
        return await coralAgent.handleMessage(
          'agent-loop-' + stepLabel,
          prompt
        );
      },
      // Stream callback translates events to Telegram messages
      async (event: StreamEvent) => {
        if (this.streamResponder) {
          const message = this.formatStreamEvent(event);
          if (message) {
            try {
              await this.streamResponder(message);
            } catch {
              // Ignore streaming failures (non-critical)
            }
          }
        }
      },
      {
        maxIterations: 15,
        timeoutPerIterationMs: 30000,
        errorBudget: 3,
        circuitBreakerThreshold: 3
      }
    );
  }

  /**
   * Set the stream responder for Telegram progress updates
   */
  setStreamResponder(responder: StreamResponder): void {
    this.streamResponder = responder;
  }

  /**
   * Clear the stream responder
   */
  clearStreamResponder(): void {
    this.streamResponder = null;
  }

  /**
   * Handle an incoming Telegram message
   */
  async handleMessage(message: TelegramMessage): Promise<TelegramResponse> {
    const { userId, text, chatId } = message;

    // Get or create session
    let session = this.sessionManager.getSession(userId);

    if (!session) {
      session = this.sessionManager.createSession(userId);
    }

    // Record observability event
    try {
      if (this.observability) {
        this.observability.recordEvent({
          type: 'telegram_message',
          userId,
          sessionId: session.sessionId,
          text: text.substring(0, 200),
          timestamp: Date.now(),
        });
      }
    } catch {
      // Observability is non-critical
    }

    // Check if this is a complex task for the agent loop
    let agentResponse: string;

    if (isComplexTask(text)) {
      logger.info(`[${userId}] Complex task detected, routing to streaming loop`);

      const loopResult = await this.reactLoop.execute(
        text,
        `Session: ${session.sessionId}\nUser: ${userId}`
      );

      if (loopResult.success) {
        agentResponse = loopResult.result;

        // Include guardrail info in response
        const guardrailNotes: string[] = [];
        if (loopResult.circuitBroken) {
          guardrailNotes.push('⚠️ Dừng sớm do quá nhiều lỗi');
        }
        if (loopResult.timedOut) {
          guardrailNotes.push('⏰ Một số bước không kịp hoàn thành');
        }
        if (loopResult.errorsEncountered > 0) {
          guardrailNotes.push(`⚠️ ${loopResult.errorsEncountered} bước gặp lỗi (đã bỏ qua)`);
        }
        if (guardrailNotes.length > 0) {
          agentResponse += '\n\n' + guardrailNotes.join('\n');
        }
      } else {
        // Fallback to direct agent call
        logger.warn(`[${userId}] Agent loop failed, falling back to direct handler`, {
          error: loopResult.error
        });
        try {
          agentResponse = await this.coralAgent.handleMessage(
            session.sessionId,
            text
          );
        } catch (err: any) {
          logger.error(`[${userId}] Fallback agent error: ${err.message}`);
          agentResponse = `❌ Lỗi khi xử lý: ${err.message}`;
        }
      }
    } else {
      // Simple request — route directly to the stateless Coral agent
      try {
        agentResponse = await this.coralAgent.handleMessage(
          session.sessionId,
          text
        );
      } catch (err: any) {
        logger.error(`[${userId}] Agent error: ${err.message}`);
        agentResponse = `❌ Lỗi khi xử lý: ${err.message}`;
      }
    }

    this.sessionManager.updateLastActivity(userId);

    return {
      text: agentResponse,
      sessionId: session.sessionId,
      sentIntro: session.introSent,
    };
  }

  /**
   * Format a StreamEvent into a user-friendly Telegram message
   * Returns null if the event should be skipped (e.g., too verbose)
   */
  private formatStreamEvent(event: StreamEvent): string | null {
    switch (event.type) {
      case 'decompose':
        return `🔍 ${event.message}`;
      case 'step_start':
        return event.message; // Already includes emoji + step count
      case 'step_complete':
        return event.message; // Already includes emoji + step description
      case 'step_skip':
        return `⏩ ${event.message}`;
      case 'tool_call':
        return `🛠️ ${event.message}`;
      case 'tool_result':
        return `✅ ${event.message}`;
      case 'synthesize':
        return `📝 ${event.message}`;
      case 'error':
        return `⚠️ ${event.message}`;
      case 'complete':
        return null; // Don't send "complete" as a separate message
      default:
        return null;
    }
  }

  // ── Lifecycle ──

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
    if (!session) return undefined;
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
    this.clearStreamResponder();
  }

  /**
   * Get the intro message for new sessions
   */
  static getIntroMessage(): string {
    return '🌊 *Chào mừng bạn đến với Coral!*\n\n'
      + 'Mình là Coral, trợ lý AI thông minh. Mình có thể:\n'
      + '• Trả lời câu hỏi, phân tích dữ liệu\n'
      + '• Thực hiện nghiên cứu nhiều bước\n'
      + '• Tương tác với nhà thông minh (IoT)\n'
      + '• Ghi nhớ ngữ cảnh cuộc trò chuyện\n\n'
      + 'Hãy gửi tin nhắn bất kỳ để bắt đầu! 🌊';
  }

  /**
   * Get the bootstrap intro message for the first admin
   */
  static getBootstrapIntroMessage(): string {
    return '🌊 *Coral — Thiết lập ban đầu*\n\n'
      + 'Chào admin đầu tiên! Bạn đã được thiết lập làm quản trị viên.\n'
      + 'Sử dụng /help để xem các lệnh có sẵn.\n\n'
      + 'Hãy bắt đầu bằng cách gửi tin nhắn bất kỳ! 🌊';
  }
}
