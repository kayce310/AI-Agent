/**
 * @file Coral Telegram Bridge — PlatformAdapter for Telegram
 * @layer modules
 * @depends-on src/core/engine/engine.ts, src/core/gateway/types.ts
 * @imported-by src/scripts/start-telegram.ts
 * @owner telegram-module
 *
 * Implements the PlatformAdapter interface for Telegram.
 * Uses grammy SDK for platform communication.
 *
 * Features:
 * - Converts Telegram messages → AdapterMessage (normalized)
 * - Registered with Gateway via register(adapter)
 * - Gateway handles engine processing, adapter handles UI
 * - Handles message chunking (Telegram 4096 char limit)
 * - Supports group chats and private messages
 */

import { Bot, Context } from 'grammy';
import { PlatformAdapter, AdapterMessage, AdapterStatus, PlatformMeta } from '../../core/gateway/types.js';
import { Logger } from '../../core/logger.js';
const log = new Logger({ module: 'Telegram' });
import { ActivityReporter } from './activity-reporter.js';
import { userManager } from './user-manager.js';
import { TelegramMessageHandler } from '../../platform/telegram/message-handler.js';
import { SessionManager } from '../../platform/telegram/session-manager.js';
import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { RateLimiter } from '../../core/security/rate-limiter.js';

// Rate limiter: max 20 messages per 60s per user
const messageLimiter = new RateLimiter('telegram', {
  tokensPerInterval: 20,
  intervalMs: 60000,
});

// ── Resolve repo root independent of process.cwd() ──
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '../../..'); // from src/modules/telegram/ up to repo root

const ts = () => {
  const d = new Date();
  return `[${d.toISOString().split('T')[1].slice(0,12)}]`;
};

// ── Telegram Runtime Logger ──
const LOG_DIR = path.join(REPO_ROOT, 'logs');

function ensureLogDir(): void {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
}

function getLogFileName(): string {
  const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  return `telegram-${date}.log`;
}

function logTelegramMessage(
  userId: string,
  inText: string,
  outText: string | null,
  inputTokens?: number,
  outputTokens?: number
): void {
  try {
    ensureLogDir();
    const logFile = path.join(LOG_DIR, getLogFileName());
    const timestamp = new Date().toISOString();
    const inTrunc = inText.substring(0, 500).replace(/\n/g, '\\n');
    const outTrunc = (outText || '').substring(0, 500).replace(/\n/g, '\\n');
    const inTok = inputTokens ?? '?';
    const outTok = outputTokens ?? '?';
    const entry = `[${timestamp}] [${userId}] IN: ${inTrunc} | OUT: ${outTrunc} | tokens: ${inTok}/${outTok}\n`;
    fs.appendFileSync(logFile, entry, 'utf8');
  } catch {
    // Silent fail — logging should never break message processing
  }
}

// Cross-instance dedup: lock file per message ID in temp dir
import * as os from 'os';
const MSG_LOCK_DIR = path.join(os.tmpdir(), 'coral-tg-locks');
const MSG_LOCK_TTL_MS = 5 * 60 * 1000;

function tryAcquireMessageLock(messageId: string): boolean {
  try {
    if (!fs.existsSync(MSG_LOCK_DIR)) {
      fs.mkdirSync(MSG_LOCK_DIR, { recursive: true });
    }
    const lockFile = path.join(MSG_LOCK_DIR, `${messageId}.lock`);
    if (fs.existsSync(lockFile)) {
      try {
        const stats = fs.statSync(lockFile);
        if (Date.now() - stats.mtimeMs > MSG_LOCK_TTL_MS) {
          fs.unlinkSync(lockFile);
        } else {
          return false;
        }
      } catch {
        return false;
      }
    }
    const fd = fs.openSync(lockFile, 'wx');
    fs.writeSync(fd, String(process.pid));
    fs.closeSync(fd);
    return true;
  } catch {
    return false;
  }
}

function releaseMessageLock(messageId: string): void {
  try {
    const lockFile = path.join(MSG_LOCK_DIR, `${messageId}.lock`);
    if (fs.existsSync(lockFile)) {
      fs.unlinkSync(lockFile);
    }
  } catch {}
}

function cleanupOldLocks(): void {
  try {
    if (!fs.existsSync(MSG_LOCK_DIR)) return;
    const now = Date.now();
    const files = fs.readdirSync(MSG_LOCK_DIR);
    for (const f of files) {
      const fp = path.join(MSG_LOCK_DIR, f);
      try {
        const stat = fs.statSync(fp);
        if (now - stat.mtimeMs > 5 * 60 * 1000) {
          fs.unlinkSync(fp);
        }
      } catch {}
    }
  } catch {}
}

// ── Telegram Constants ──
const TG_MAX_MSG_LENGTH = 4096;

export class TelegramBridge implements PlatformAdapter {
  public readonly platform = 'telegram';
  public status: AdapterStatus = 'stopped';
  public readonly platformMeta: PlatformMeta = {
    maxMessageLength: 4096,     // Telegram limit
    piiSafe: false,             // Telegram is not PII-safe by default
    platformHint: 'telegram',   // For response formatting hints
    supportsMarkdown: true,     // Telegram supports Markdown
    supportsImages: true,       // Telegram supports inline images
  };

  private bot: Bot;
  private messageHandler: ((msg: AdapterMessage) => Promise<any>) | null = null;
  private processingMessages: Set<string> = new Set();
  private reporter: ActivityReporter;
  private sessionManager: SessionManager;
  private messageHandlerWrapper: TelegramMessageHandler | null = null;

  constructor() {
    cleanupOldLocks();
    this.sessionManager = new SessionManager();

    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
      throw new Error('TELEGRAM_BOT_TOKEN không được tìm thấy trong file .env');
    }

    this.bot = new Bot(token);
    this.reporter = new ActivityReporter(this.bot);
    this.registerEventHandlers();
  }

  // ──────────────────────────────────────────────
  // PlatformAdapter Implementation
  // ──────────────────────────────────────────────

  onMessage(handler: (msg: AdapterMessage) => Promise<any>): void {
    this.messageHandler = handler;
  }

  async start(): Promise<void> {
    if (this.status === 'running') return;

    this.status = 'starting';

    // Start bot with long polling
    this.bot.start({
      onStart: () => {
        log.info("Bot started successfully");
      },
    });

    this.status = 'running';
  }

  async stop(): Promise<void> {
    if (this.status === 'stopped') return;

    this.status = 'stopping';
    try {
      this.bot.stop();
    } catch {}

    this.processingMessages.clear();
    
    // Clean up session manager
    try {
      this.sessionManager.destroy();
    } catch {}

    this.status = 'stopped';
  }

  async sendMessage(chatId: string, content: string): Promise<string | null> {
    try {
      // Split long messages
      const chunks = this.splitMessage(content);
      let lastMsgId: string | null = null;

      for (const chunk of chunks) {
        const sent = await this.bot.api.sendMessage(chatId, chunk);
        lastMsgId = String(sent.message_id);
      }

      return lastMsgId;
    } catch {
      return null;
    }
  }

  // ──────────────────────────────────────────────
  // Internal Event Handlers
  // ──────────────────────────────────────────────

  private registerEventHandlers(): void {
    // Handle /start command
    this.bot.command('start', async (ctx) => {
      const userId = String(ctx.from?.id || 'unknown');
      const username = ctx.from?.username;

      // Bootstrap: first user becomes admin when no users configured
      if (!userManager.isBootstrapped()) {
        userManager.bootstrap(userId);
        // Mark intro as sent in session
        this.sessionManager.getOrCreateSession(userId);
        this.sessionManager.markIntroSent(userId);
        await ctx.reply(TelegramMessageHandler.getBootstrapIntroMessage());
        return;
      }

      if (!userManager.isAllowed(userId, username)) {
        await ctx.reply('Xin lỗi, Coral chỉ dành cho người dùng được phép. 🌊');
        return;
      }

      // Check if user needs intro (session-aware)
      const needsIntro = !this.sessionManager.getSession(userId) || 
                          !this.sessionManager.getSession(userId)?.introSent;

      if (needsIntro) {
        // Send intro and mark as sent
        await ctx.reply(TelegramMessageHandler.getIntroMessage());
        this.sessionManager.getOrCreateSession(userId);
        this.sessionManager.markIntroSent(userId);
      } else {
        // Returning user
        const role = userManager.isAdmin(userId, username) ? '👑 Admin' : '👤 User';
        await ctx.reply(
          `👋 Chào lại ${username || 'bạn'}! Role: ${role}\\n\\n` +
          `Lệnh:\\n` +
          `/status — Trạng thái Coral\\n` +
          `/models — Danh sách model\\n` +
          `/help — Trợ giúp` +
          (userManager.isAdmin(userId) ? '\\n/admin — Quản lý user' : '')
        );
      }

      // Update activity timestamp
      this.sessionManager.updateLastActivity(userId);
    });

    // Handle /help command
    this.bot.command('help', async (ctx) => {
      const userId = String(ctx.from?.id || 'unknown');
      if (!userManager.isAllowed(userId)) return;

      const help = [
        '🤖 Coral AI Agent',
        '',
        'Tôi có thể:',
        '• Trả lời câu hỏi',
        '• Thực thi code',
        '• Quản lý file',
        '• Tìm kiếm thông tin',
        '',
        'Đơn giản là gửi tin nhắn và tôi sẽ xử lý!',
        '',
        'Lệnh:',
        '/status — Trạng thái Coral',
        '/models — Danh sách model',
        '/help — Trợ giúp',
      ];
      if (userManager.isAdmin(userId)) {
        help.push('', '/allow <userId> — Thêm user');
      }
      await ctx.reply(help.join('\n'));
    });

    // Handle /models command
    this.bot.command('models', async (ctx) => {
      await ctx.reply('ℹ️ Model switching được quản lý bởi gateway.');
    });

    // Handle /status command — show Coral's current state
    this.bot.command('status', async (ctx) => {
      const userId = String(ctx.from?.id || 'unknown');
      if (!userManager.isAllowed(userId)) return;

      const status = [
        '🌊 **Coral Status**',
        '',
        `• Platform: Telegram`,
        `• Role: ${userManager.isAdmin(userId) ? '👑 Admin' : '👤 User'}`,
        `• Memory: Active`,
        `• Uptime: ${Math.floor(process.uptime() / 60)}m`,
      ].join('\n');
      await ctx.reply(status);
    });

    // Handle /allow command — admin only
    this.bot.command('allow', async (ctx) => {
      const userId = String(ctx.from?.id || 'unknown');
      if (!userManager.isAdmin(userId)) {
        await ctx.reply('⛔ Chỉ admin mới có quyền quản lý user.');
        return;
      }

      const args = ctx.match?.toString().trim().split(/\s+/);
      if (!args || args.length < 1) {
        await ctx.reply(
          '📝 Cách dùng:\n' +
          '/allow <userId> — Thêm user\n' +
          '/allow <userId> admin — Thêm admin'
        );
        return;
      }

      const targetUserId = args[0];
      const role = args[1] === 'admin' ? 'admin' : 'user';
      userManager.registerUser(targetUserId, role);
      await ctx.reply(`✅ Đã thêm user ${targetUserId} với role ${role}`);
    });

    // Handle /disallow command — admin only
    this.bot.command('disallow', async (ctx) => {
      const userId = String(ctx.from?.id || 'unknown');
      if (!userManager.isAdmin(userId)) {
        await ctx.reply('⛔ Chỉ admin mới có quyền quản lý user.');
        return;
      }

      const args = ctx.match?.toString().trim().split(/\s+/);
      if (!args || args.length < 1) {
        await ctx.reply('📝 Cách dùng: /disallow <userId>');
        return;
      }

      userManager.unregisterUser(args[0]);
      await ctx.reply(`✅ Đã xóa user ${args[0]}`);
    });

    // Handle /users command — admin only
    this.bot.command('users', async (ctx) => {
      const userId = String(ctx.from?.id || 'unknown');
      if (!userManager.isAdmin(userId)) {
        await ctx.reply('⛔ Chỉ admin mới có quyền xem danh sách user.');
        return;
      }

      const userIds = userManager.getUserIds();
      const adminIds = userManager.getAdminIds();
      const lines = ['👥 **Danh sách Users**\n'];
      lines.push('👑 **Admin:**');
      adminIds.forEach((id: string) => lines.push(`  • ${id}`));
      if (userIds.length > 0) {
        lines.push('\n👤 **Users:**');
        userIds.forEach((id: string) => lines.push(`  • ${id}`));
      }
      await ctx.reply(lines.join('\n'));
    });

    // Handle /admin command — show admin panel
    this.bot.command('admin', async (ctx) => {
      const userId = String(ctx.from?.id || 'unknown');
      if (!userManager.isAdmin(userId)) {
        await ctx.reply('⛔ Chỉ admin mới có quyền truy cập.');
        return;
      }

      await ctx.reply(
        '👑 **Admin Panel**\n\n' +
        '/status — Trạng thái\n' +
        '/allow <userId> — Thêm user\n' +
        '/allow <userId> admin — Thêm admin\n\n' +
        'Để cấu hình user ban đầu, set env CORAL_TELEGRAM_USERS.'
      );
    });

    // Handle all text messages
    this.bot.on('message:text', async (ctx) => {
      const message = ctx.message;
      const chatId = String(message.chat.id);
      const userId = String(message.from?.id || 'unknown');
      const messageId = String(message.message_id);
      const text = message.text;
      const chatType = message.chat.type; // 'private', 'group', 'supergroup', 'channel'

      // Skip bot's own messages
      if (message.from?.is_bot) return;

      // ── ACCESS CONTROL ──
      // Bootstrap: first user becomes admin
      if (!userManager.isBootstrapped()) {
        userManager.bootstrap(userId);
        this.sessionManager.getOrCreateSession(userId);
        this.sessionManager.markIntroSent(userId);
        await ctx.reply(TelegramMessageHandler.getBootstrapIntroMessage());
        return;
      }

      const username = message.from?.username;

      if (!userManager.isAllowed(userId, username)) {
        try {
          await ctx.reply('Xin lỗi, Coral chỉ dành cho người dùng được phép. 🌊');
        } catch {}
        log.warn('Unauthorized user attempted access', { userId, username: message.from?.username });
        return;
      }

      // Rate limiting
      if (!messageLimiter.tryConsume(1)) {
        try {
          await ctx.reply('⏳ Bot đang bận. Vui lòng thử lại sau.');
        } catch {}
        return;
      }

      // In groups: only respond when mentioned or replied to
      if (chatType === 'group' || chatType === 'supergroup') {
        const botInfo = this.bot.botInfo;
        const isMentioned = message.entities?.some(
          e => e.type === 'mention' && text.substring(e.offset, e.offset + e.length).includes(`@${botInfo.username}`)
        );
        const isReplyToBot = message.reply_to_message?.from?.id === botInfo.id;
        
        if (!isMentioned && !isReplyToBot) return;
      }

      // ── DEDUPLICATION (cross-instance + session-aware) ──
      if (this.processingMessages.has(messageId)) return;
      if (!tryAcquireMessageLock(messageId)) return;

      this.processingMessages.add(messageId);

      // Get or create session (TTL-based)
      const session = this.sessionManager.getOrCreateSession(userId);
      const isNewSession = !session.introSent;

      // Start activity reporter
      this.reporter.start(chatId, messageId);

      try {
        // Convert to AdapterMessage
        const adapterMsg: AdapterMessage = {
          messageId,
          userId,
          channelId: chatId,
          text,
          platform: 'telegram',
          isMention: true,
          timestamp: Date.now(),
        };

        // Forward to the handler (wired by Gateway.register)
        if (this.messageHandler) {
          // Send "processing" indicator
          let processingMsgId: number | null = null;
          try {
            const processingMsg = await this.bot.api.sendMessage(chatId, '⏳ Đang xử lý...');
            processingMsgId = processingMsg.message_id;
          } catch {}

          // If new session, send intro before agent response
          let response = '';
          if (isNewSession) {
            response = TelegramMessageHandler.getIntroMessage() + '\n\n';
            this.sessionManager.markIntroSent(userId);
          }

          // Get agent response
          const agentResponse = await this.messageHandler(adapterMsg);

          // Update activity timestamp
          this.sessionManager.updateLastActivity(userId);

          // Try to edit the processing message with the actual response
          if (agentResponse && agentResponse.output) {
            const fullResponse = response + agentResponse.output;
            try {
              if (processingMsgId) {
                await this.bot.api.editMessageText(chatId, processingMsgId, fullResponse.slice(0, 4096));
                // If response is longer than 4096, send remaining chunks
                if (fullResponse.length > 4096) {
                  const remaining = this.splitMessage(fullResponse.slice(4096));
                  for (const chunk of remaining) {
                    await ctx.reply(chunk);
                  }
                }
              } else {
                const chunks = this.splitMessage(fullResponse);
                for (const chunk of chunks) { await ctx.reply(chunk); }
              }
            } catch {
              // Edit failed, send new messages
              const chunks = this.splitMessage(fullResponse);
              for (const chunk of chunks) { await ctx.reply(chunk); }
            }

            // Log
            logTelegramMessage(
              userId,
              text,
              fullResponse,
              agentResponse.metadata?.inputTokens as number | undefined,
              agentResponse.metadata?.outputTokens as number | undefined
            );
          } else {
            // Delete "processing" message if no response
            if (processingMsgId) {
              try { await this.bot.api.deleteMessage(chatId, processingMsgId); } catch {}
            }
            await ctx.reply('❌ Không thể xử lý tin nhắn.');
          }
        }
      } catch (err: any) {
        log.error("Error processing message", { error: String(err) });
        try {
          await ctx.reply(`❌ Lỗi: ${err.message}`);
        } catch {}
      } finally {
        this.processingMessages.delete(messageId);
        this.reporter.stop(chatId, messageId);
        releaseMessageLock(messageId);
      }
    });

    // ── Handle channel posts (channels send channel_post, not message) ──
    this.bot.on('channel_post:text', async (ctx) => {
      const message = ctx.channelPost;
      const chatId = String(message.chat.id);
      // Channel posts: sender_chat is the channel itself, no 'from' user
      const userId = String(message.sender_chat?.id || message.chat.id);
      const messageId = String(message.message_id);
      const text = message.text;

      const chatType = message.chat.type; // 'channel'

      // In channels: only respond when mentioned or replied to bot
      const botInfo = this.bot.botInfo;
      const isMentioned = message.entities?.some(
        e => e.type === 'mention' && text.substring(e.offset, e.offset + e.length).includes(`@${botInfo.username}`)
      );
      const isReplyToBot = message.reply_to_message?.sender_chat?.id === botInfo.id;

      if (!isMentioned && !isReplyToBot) return;

      // Dedup
      if (this.processingMessages.has(messageId)) return;
      if (!tryAcquireMessageLock(messageId)) return;

      this.processingMessages.add(messageId);

      // Get or create session (TTL-based, channel-scoped)
      const session = this.sessionManager.getOrCreateSession(userId);
      const isNewSession = !session.introSent;

      // Start activity reporter
      this.reporter.start(chatId, messageId);

      try {
        // Convert to AdapterMessage
        const adapterMsg: AdapterMessage = {
          messageId,
          userId,
          channelId: chatId,
          text,
          platform: 'telegram',
          isMention: true,
          timestamp: Date.now(),
        };

        // Forward to the handler (wired by Gateway.register)
        if (this.messageHandler) {
          // Send "processing" indicator
          let processingMsgId: number | null = null;
          try {
            const processingMsg = await this.bot.api.sendMessage(chatId, '⏳ Đang xử lý...');
            processingMsgId = processingMsg.message_id;
          } catch {}

          // If new session, send intro before agent response
          let response = '';
          if (isNewSession) {
            response = TelegramMessageHandler.getIntroMessage() + '\n\n';
            this.sessionManager.markIntroSent(userId);
          }

          // Get agent response
          const agentResponse = await this.messageHandler(adapterMsg);

          // Update activity timestamp
          this.sessionManager.updateLastActivity(userId);

          // Try to edit the processing message with the actual response
          if (agentResponse && agentResponse.output) {
            const fullResponse = response + agentResponse.output;
            try {
              if (processingMsgId) {
                await this.bot.api.editMessageText(chatId, processingMsgId, fullResponse.slice(0, 4096));
                if (fullResponse.length > 4096) {
                  const remaining = this.splitMessage(fullResponse.slice(4096));
                  for (const chunk of remaining) { await ctx.reply(chunk); }
                }
              } else {
                const chunks = this.splitMessage(fullResponse);
                for (const chunk of chunks) { await ctx.reply(chunk); }
              }
            } catch {
              const chunks = this.splitMessage(fullResponse);
              for (const chunk of chunks) { await ctx.reply(chunk); }
            }

            logTelegramMessage(
              userId,
              text,
              fullResponse,
              agentResponse.metadata?.inputTokens as number | undefined,
              agentResponse.metadata?.outputTokens as number | undefined
            );
          } else {
            if (processingMsgId) {
              try { await this.bot.api.deleteMessage(chatId, processingMsgId); } catch {}
            }
            await ctx.reply('❌ Không thể xử lý tin nhắn.');
          }
        }
      } catch (err: any) {
        log.error("Error processing channel post", { error: String(err) });
        try {
          await ctx.reply(`❌ Lỗi: ${err.message}`);
        } catch {}
      } finally {
        this.processingMessages.delete(messageId);
        this.reporter.stop(chatId, messageId);
        releaseMessageLock(messageId);
      }
    });
  }

  // ──────────────────────────────────────────────
  // Utilities
  // ──────────────────────────────────────────────

  /**
   * Split message into chunks respecting Telegram's 4096 char limit.
   * Tries to split at newlines for readability.
   */
  private splitMessage(content: string): string[] {
    if (content.length <= TG_MAX_MSG_LENGTH) {
      return [content];
    }

    const chunks: string[] = [];
    let remaining = content;

    while (remaining.length > 0) {
      if (remaining.length <= TG_MAX_MSG_LENGTH) {
        chunks.push(remaining);
        break;
      }

      // Find last newline within limit
      let splitAt = remaining.lastIndexOf('\n', TG_MAX_MSG_LENGTH);
      if (splitAt <= 0) splitAt = TG_MAX_MSG_LENGTH; // no newline — hard cut

      chunks.push(remaining.slice(0, splitAt));
      remaining = remaining.slice(splitAt).trimStart();
    }

    return chunks;
  }
}

export default TelegramBridge;
