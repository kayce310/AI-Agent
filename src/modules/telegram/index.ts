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
 * - Slash commands: /model, /help, /status, /start
 * - InlineKeyboard for model selection
 */

import { Bot, Context } from 'grammy';
import { PlatformAdapter, AdapterMessage, AdapterStatus, PlatformMeta } from '../../core/gateway/types.js';
import { Logger } from '../../core/logger.js';
const log = new Logger({ module: 'Telegram' });
import { ActivityReporter } from './activity-reporter.js';
import { userManager } from './user-manager.js';
import { TelegramMessageHandler } from '../../platform/telegram/message-handler.js';
import { SessionManager } from '../../core/session-manager.js';
import { CommandRegistry } from './commands.js';
import { ProactiveEngine } from '../../core/proactive/proactive-engine.js';
import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { RateLimiter } from '../../core/security/rate-limiter.js';
import { R } from '../../core/runtime-instrumentation.js';

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

import type { HITLManager } from '../../core/security/hitl.js';
import { registerHITLCallbackHandler } from './hitl-handler.js';
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
  private userSessions: Map<string, { selectedModel: string }> = new Map();
  private commandRegistry: CommandRegistry;
  private proactiveEngine: ProactiveEngine | null = null;

  constructor() {
    cleanupOldLocks();
    this.sessionManager = new SessionManager();
    this.commandRegistry = new CommandRegistry(this.sessionManager, this.userSessions);

    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
      throw new Error('TELEGRAM_BOT_TOKEN không được tìm thấy trong file .env');
    }

    this.bot = new Bot(token);
    this.reporter = new ActivityReporter(this.bot);
    this.registerEventHandlers();
  }

  /**
   * Initialize the message handler wrapper (with streaming support)
   * Called after gateway registration to wire up TelegramMessageHandler
   */
  initializeMessageHandlerWrapper(coralAgent: any): void {
    this.messageHandlerWrapper = new TelegramMessageHandler(coralAgent);
  }

  /**
   * Set the proactive engine instance for auto-suggestions
   */
  setProactiveEngine(engine: ProactiveEngine): void {
    this.proactiveEngine = engine;
  }

  /**
   * Register HITL manager for handling inline keyboard approve/reject callbacks.
   */
  registerHITLManager(manager: HITLManager): void {
    registerHITLCallbackHandler(this.bot, manager);
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

      // Register slash commands in Telegram menu (shows when user types /)
      console.log(`${ts()} 📝 Registering Telegram bot commands...`);
      await this.bot.api.setMyCommands([
        { command: 'start', description: 'Chào mừng / bắt đầu' },
        { command: 'help', description: 'Hướng dẫn sử dụng' },
        { command: 'status', description: 'Trạng thái bot' },
        { command: 'new', description: 'Tạo session mới' },
        { command: 'sessions', description: 'Danh sách sessions' },
        { command: 'switch', description: 'Chuyển session' },
        { command: 'model', description: 'Chọn model AI' },
        { command: 'list', description: 'Danh sách task đang chạy' },
        { command: 'cancel', description: 'Hủy task' },
        { command: 'dashboard', description: 'Bật/tắt dashboard' },
        { command: 'restart', description: 'Khởi động lại bot' },
        { command: 'world', description: 'Bật/tắt world model probes' },
      ]);
      console.log(`${ts()} ✅ Telegram bot commands registered`);

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

  /**
   * Send a message with an optional inline keyboard (e.g., for HITL approvals).
   */
  async sendMessageWithKeyboard(chatId: string, content: string, keyboard?: Record<string, any>): Promise<string | null> {
    try {
      const options: Record<string, any> = {};
      if (keyboard && keyboard.inline_keyboard) {
        options.reply_markup = keyboard;
      }
      const sent = await this.bot.api.sendMessage(chatId, content, options);
      return String(sent.message_id);
    } catch {
      return null;
    }
  }

  // ──────────────────────────────────────────────
  // Internal Event Handlers
  // ──────────────────────────────────────────────

  private registerEventHandlers(): void {
    // ── Handle all slash commands via CommandRegistry ──
    this.bot.command('start', async (ctx) => {
      await this.commandRegistry.get('start')?.handler(ctx, []);
    });

    this.bot.command('model', async (ctx) => {
      const args = (ctx.match?.toString().trim().split(/\s+/) || []).filter(a => a.length > 0);
      await this.commandRegistry.get('model')?.handler(ctx, args);
    });

    this.bot.command('help', async (ctx) => {
      await this.commandRegistry.get('help')?.handler(ctx, []);
    });

    this.bot.command('status', async (ctx) => {
      const args = (ctx.match?.toString().trim().split(/\s+/) || []).filter(a => a.length > 0);
      await this.commandRegistry.get('status')?.handler(ctx, args);
    });

    this.bot.command('dashboard', async (ctx) => {
      await this.commandRegistry.get('dashboard')?.handler(ctx, []);
    });

    this.bot.command('restart', async (ctx) => {
      await this.commandRegistry.get('restart')?.handler(ctx, []);
    });

    this.bot.command('world', async (ctx) => {
      await this.commandRegistry.get('world')?.handler(ctx, []);
    });

    // ── Task Commands (Phase 3) ──
    this.bot.command('list', async (ctx) => {
      await this.commandRegistry.get('list')?.handler(ctx, []);
    });

    this.bot.command('cancel', async (ctx) => {
      const args = (ctx.match?.toString().trim().split(/\s+/) || []).filter(a => a.length > 0);
      await this.commandRegistry.get('cancel')?.handler(ctx, args);
    });

    // ── Session Commands ──
    this.bot.command('new', async (ctx) => {
      await this.commandRegistry.get('new')?.handler(ctx, []);
    });

    this.bot.command('sessions', async (ctx) => {
      await this.commandRegistry.get('sessions')?.handler(ctx, []);
    });

    this.bot.command('switch', async (ctx) => {
      const args = (ctx.match?.toString().trim().split(/\s+/) || []).filter(a => a.length > 0);
      await this.commandRegistry.get('switch')?.handler(ctx, args);
    });

    // Handle legacy commands (backward compatibility)
    this.bot.command('models', async (ctx) => {
    const userId = String(ctx.from?.id || 'unknown');
    if (!userManager.isAllowed(userId)) return;

    // Redirect to /model
    await this.commandRegistry.get('model')?.handler(ctx, []);
    });

    this.bot.command('allow', async (ctx) => {
      const userId = String(ctx.from?.id || 'unknown');
      if (!userManager.isAdmin(userId)) {
        await ctx.reply('⛔ Chỉ admin mới có quyền quản lý user.');
        return;
      }

      const args = ctx.match?.toString().trim().split(/\s+/) || [];
      if (args.length < 1) {
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

    this.bot.command('disallow', async (ctx) => {
      const userId = String(ctx.from?.id || 'unknown');
      if (!userManager.isAdmin(userId)) {
        await ctx.reply('⛔ Chỉ admin mới có quyền quản lý user.');
        return;
      }

      const args = ctx.match?.toString().trim().split(/\s+/) || [];
      if (args.length < 1) {
        await ctx.reply('📝 Cách dùng: /disallow <userId>');
        return;
      }

      userManager.unregisterUser(args[0]);
      await ctx.reply(`✅ Đã xóa user ${args[0]}`);
    });

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

    // ── Handle callback queries (inline keyboard) ──
    this.bot.on('callback_query:data', async (ctx) => {
      try {
        const query = ctx.callbackQuery;
        const data = query.data;
        const chatId = String(query.message?.chat?.id || 'unknown');

        log.info(`[CB] callback_query data=${data} chatId=${chatId}`);

        // Route to command registry handler
        if (data && (
          data.startsWith('mp:') ||
          data.startsWith('mm:') ||
          data.startsWith('mg:') ||
          data === 'mb' ||
          data === 'mx'
        )) {
          await this.commandRegistry.handleCallbackQuery(ctx, data, chatId);
        } else {
          // Always answer unmatched callbacks to prevent loading spinner
          await ctx.answerCallbackQuery().catch(() => {});
        }
      } catch (err) {
        log.error(`[CB] callback_query error: ${err}`);
        try { await ctx.answerCallbackQuery({ text: '⚠️ Error' }).catch(() => {}); } catch {}
      }
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

      // ── Skip commands — let bot.command() handlers process them ──
      if (text.startsWith('/')) return;

      // ── ACCESS CONTROL ──
      // Bootstrap: first user becomes admin (no intro message)
      if (!userManager.isBootstrapped()) {
        userManager.bootstrap(userId);
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
      // (unless channel is in always-reply list)
      if (chatType === 'group' || chatType === 'supergroup') {
        const alwaysReplyChannels = (process.env.TELEGRAM_ALWAYS_REPLY_CHANNELS || '')
          .split(',')
          .map(id => id.trim())
          .filter(id => id.length > 0);
        if (!alwaysReplyChannels.includes(chatId)) {
          const botInfo = this.bot.botInfo;
          const isMentioned = message.entities?.some(
            e => e.type === 'mention' && text.substring(e.offset, e.offset + e.length).includes(`@${botInfo.username}`)
          );
          const isReplyToBot = message.reply_to_message?.from?.id === botInfo.id;
          
          if (!isMentioned && !isReplyToBot) return;
        }
      }

      // ── DEDUPLICATION (cross-instance + session-aware) ──
      if (this.processingMessages.has(messageId)) return;
      if (!tryAcquireMessageLock(messageId)) return;

      this.processingMessages.add(messageId);

      // Get or create session (TTL-based)
      const session = await this.sessionManager.getOrCreateSession(userId);

      // Start activity reporter
      this.reporter.start(chatId, messageId);

      try {
        // Convert to AdapterMessage
        const userSession = this.userSessions.get(userId);
        
        // Get actual model from registry if not set
        let selectedModel = userSession?.selectedModel;
        if (!selectedModel || selectedModel === 'all') {
          const { ProviderRegistry } = await import('../../core/llm/provider-registry.js');
          const registry = new ProviderRegistry();
          registry.loadFromConfig();
          const models = registry.listModels();
          selectedModel = models.length > 0 ? models[0] : 'auto/best-free';
        }

        // Track model and title for session management
        this.sessionManager.setSessionModel(userId, selectedModel);
        // Set session title from first message (if not set yet)
        if (text && text.length > 0) {
          this.sessionManager.setSessionTitle(userId, text.slice(0, 100));
        }

        const adapterMsg: AdapterMessage = {
          messageId,
          userId,
          channelId: chatId,
          text,
          platform: 'telegram',
          isMention: true,
          timestamp: Date.now(),
          metadata: {
            model: selectedModel,  // Pass selected model
          },
        };

        // Forward to the handler (wired by Gateway.register)
        if (this.messageHandler) {
          // Send "processing" indicator
          let processingMsgId: number | null = null;
          let lastThinkingTime = 0;
          let processingMsgText = '⏳ Đang xử lý...';
          try {
            const processingMsg = await this.bot.api.sendMessage(chatId, processingMsgText);
            processingMsgId = processingMsg.message_id;
          } catch {}

          // No intro — process directly from the first message
          let response = '';

          // Attach onThinking callback to edit the processing message with updates
          adapterMsg.metadata = adapterMsg.metadata || {};
          adapterMsg.metadata.onThinking = async (thinking: string) => {
            const now = Date.now();
            if (processingMsgId && now - lastThinkingTime > 2000) {
              lastThinkingTime = now;
              try {
                await this.bot.api.editMessageText(
                  chatId,
                  processingMsgId,
                  `🤔 *Đang xử lý...*\n\n${thinking.slice(0, 200)}`
                );
              } catch { /* ignore edit failures */ }
            }
          };

          // Hermes-style: AI nhận mọi tin nhắn, không pre-filter
          const requestId = `${userId}:${messageId}`;
          R.state({ event: 'RECEIVED', requestId });
          R.waitBegin({ requestId, label: 'gateway.messageHandler', callerFile: 'modules/telegram/index.ts', callerLine: 551 });
          let agentResponse = await this.messageHandler(adapterMsg);
          R.waitEnd({ requestId, label: 'gateway.messageHandler', callerFile: 'modules/telegram/index.ts', callerLine: 554 });

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

          // ── Proactive Engine: check for keyword triggers in user message ──
          if (this.proactiveEngine) {
            try {
              const proactiveActions = this.proactiveEngine.suggestFromMessage(text, userId);
              for (const action of proactiveActions) {
                if (action.type === 'suggest' || action.type === 'notify' || action.type === 'remind') {
                  // Fire & forget — send proactive suggestion to same chat
                  const proactiveMsg = action.message.replace('{keyword}', text);
                  log.info(`Proactive suggestion: ${proactiveMsg}`);
                  this.bot.api.sendMessage(chatId, proactiveMsg).catch(() => {});
                }
              }
            } catch(err) { log.error('Proactive engine error', { error: String(err) }); }
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
        // NOTE: releaseMessageLock intentionally REMOVED here.
        // File lock persists for its 5-min TTL to prevent Telegram's
        // duplicate update delivery from re-processing the same message.
        // Stale locks are cleaned by cleanupOldLocks() on startup and
        // by the TTL check in tryAcquireMessageLock().
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

      // Skip bot's own messages
      if (message.sender_chat?.id === this.bot.botInfo?.id) return;

      // ── MENTION FILTER FOR CHANNELS ──
      // In channels: only respond when bot is @mentioned, unless channel is in always-reply list
      const alwaysReplyChannels = (process.env.TELEGRAM_ALWAYS_REPLY_CHANNELS || '')
        .split(',')
        .map(id => id.trim())
        .filter(id => id.length > 0);
      const isAlwaysReply = alwaysReplyChannels.includes(chatId);

      if (!isAlwaysReply) {
        const botInfo = this.bot.botInfo;
        const isMentioned = message.entities?.some(
          e => e.type === 'mention' && text.substring(e.offset, e.offset + e.length).includes(`@${botInfo.username}`)
        );
        const isReplyToBot = message.reply_to_message?.sender_chat?.id === botInfo.id;

        if (!isMentioned && !isReplyToBot) return;
      }

      // Dedup
      if (this.processingMessages.has(messageId)) return;
      if (!tryAcquireMessageLock(messageId)) return;

      this.processingMessages.add(messageId);

      // Get or create session (TTL-based, channel-scoped)
      const session = await this.sessionManager.getOrCreateSession(userId);

      // Start activity reporter
      this.reporter.start(chatId, messageId);

      try {
        // Convert to AdapterMessage
        const userSession = this.userSessions.get(userId);
        const selectedModel = userSession?.selectedModel || 'all';
        
        const adapterMsg: AdapterMessage = {
          messageId,
          userId,
          channelId: chatId,
          text,
          platform: 'telegram',
          isMention: true,
          timestamp: Date.now(),
          metadata: {
            model: selectedModel,  // Pass selected model
          },
        };

        // Forward to the handler (wired by Gateway.register)
        if (this.messageHandler) {
          // Send "processing" indicator
          let processingMsgId: number | null = null;
          let lastThinkingTime = 0;
          let processingMsgText = '⏳ Đang xử lý...';
          try {
            const processingMsg = await this.bot.api.sendMessage(chatId, processingMsgText);
            processingMsgId = processingMsg.message_id;
          } catch {}

          // No intro — process directly from the first message
          let response = '';

          // Attach onThinking callback to edit the processing message with updates
          adapterMsg.metadata = adapterMsg.metadata || {};
          adapterMsg.metadata.onThinking = async (thinking: string) => {
            const now = Date.now();
            if (processingMsgId && now - lastThinkingTime > 2000) {
              lastThinkingTime = now;
              try {
                await this.bot.api.editMessageText(
                  chatId,
                  processingMsgId,
                  `🤔 *Đang xử lý...*\n\n${thinking.slice(0, 200)}`
                );
              } catch { /* ignore edit failures */ }
            }
          };

          // Hermes-style: AI nhận mọi tin nhắn, không pre-filter
          const requestId = `${userId}:${messageId}`;
          R.state({ event: 'RECEIVED', requestId });
          R.waitBegin({ requestId, label: 'gateway.messageHandler', callerFile: 'modules/telegram/index.ts', callerLine: 551 });
          let agentResponse = await this.messageHandler(adapterMsg);
          R.waitEnd({ requestId, label: 'gateway.messageHandler', callerFile: 'modules/telegram/index.ts', callerLine: 554 });

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
        // NOTE: releaseMessageLock intentionally REMOVED here — same rationale
        // as message:text handler: file lock persists for 5-min TTL.
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
