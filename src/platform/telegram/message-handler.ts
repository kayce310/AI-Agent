import { SessionManager, SessionState } from './session-manager.js';
import { ObservabilityIntegration } from '../../observability/integration.js';
import { Logger } from '../../core/logger.js';
import {
  StreamingReActLoop,
  StreamEvent,
  TimeoutError,
  isComplexTask
} from '../../core/agent/react-loop.js';
import { sentimentAnalyzer, SentimentResult } from '../../core/sentiment/sentiment-analyzer.js';

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
  sentiment?: SentimentResult;
}

/** Callback for sending streaming progress messages */
export type StreamResponder = (text: string) => Promise<void>;

/**
 * TelegramMessageHandler: Platform layer for Telegram
 * 
 * Handles session management, complex task routing, and streaming progress.
 * Now includes sentiment analysis for mood-based responses and toxic filtering.
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
        // Execute a step through the engine's process method
        const result = await coralAgent.process({
          sessionId: `agent-loop-${stepLabel}`,
          messages: [{ role: 'user', content: prompt, timestamp: Date.now() }],
          modelId: 'default',
          agentName: 'Coral',
          protocol: 'agent-loop',
          mentionPrefix: '',
          task: prompt,
        });
        return result.content || '';
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
   * Now includes sentiment analysis and toxic filtering
   */
  async handleMessage(message: TelegramMessage): Promise<TelegramResponse> {
    const { userId, text, chatId } = message;

    // Get or create session
    let session = this.sessionManager.getSession(userId);

    if (!session) {
      session = this.sessionManager.createSession(userId);
    }

    // Analyze sentiment
    let sentiment: SentimentResult | null = null;
    try {
      sentiment = await sentimentAnalyzer.analyze(text);
      if (sentiment) {
      
      // Record sentiment event for observability
      if (this.observability) {
        (this.observability as any).recordEvent({
          type: 'sentiment_analysis',
          userId,
          sessionId: session.sessionId,
          text: text.substring(0, 200),
          sentiment: {
            score: sentiment.score,
            label: sentiment.label,
            toxic: sentiment.toxic,
            language: sentiment.language,
          },
          timestamp: Date.now(),
        });
      }
    } } catch (error) {
      logger.warn('Sentiment analysis failed', { error: (error as Error).message });
    }

    // Toxic message filter
    if ((sentiment as any)?.toxic && (sentiment as any).toxicity_level > 0.5) {
      logger.warn(`[${userId}] Toxic message detected`, {
        toxic_words: (sentiment as any).toxic_words,
        toxicity_level: (sentiment as any).toxicity_level,
      });
      
      // Record toxic event
      if (this.observability) {
        (this.observability as any).recordEvent({
          type: 'toxic_message',
          userId,
          sessionId: session.sessionId,
          text: text.substring(0, 200),
          sentiment: {
            toxic_words: (sentiment as any).toxic_words,
            toxicity_level: (sentiment as any).toxicity_level,
          },
          timestamp: Date.now(),
        });
      }
      
      // Return warning for highly toxic messages
      if ((sentiment as any).toxicity_level > 0.8) {
        return {
          text: '⚠️ Tin nhắn chứa nội dung không phù hợp. Vui lòng lịch sự hơn.',
          sessionId: session.sessionId,
          sentIntro: session.introSent,
          sentiment,
        };
      }
    }

    // Record observability event
    try {
      if (this.observability) {
        (this.observability as any).recordEvent({
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

    // Add mood-based response modifier
    if (sentiment) {
      agentResponse = this.applyMoodModifier(agentResponse, sentiment);
    }

    this.sessionManager.updateLastActivity(userId);

    return {
      text: agentResponse,
      sessionId: session.sessionId,
      sentIntro: session.introSent,
      sentiment,
    };
  }

  /**
   * Apply mood-based response modifiers
   */
  private applyMoodModifier(response: string, sentiment: SentimentResult): string {
    // Don't modify for negative sentiment — keep response neutral/professional
    if (sentiment.label === 'negative' && sentiment.score < -0.3) {
      // Add empathetic prefix for very negative messages
      const prefixes = [
        'Hiểu rồi, ',
        'Mình hiểu, ',
        '',
      ];
      const prefix = prefixes[Math.floor(Math.random() * (prefixes.length - 1))];
      return prefix + response;
    }

    // Add friendly touch for positive messages
    if (sentiment.label === 'positive' && sentiment.score > 0.5) {
      // 30% chance to add friendly emoji
      if (Math.random() < 0.3 && !response.includes('😊') && !response.includes('👍')) {
        return response + ' 😊';
      }
    }

    return response;
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
      case 'synthesis':
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
