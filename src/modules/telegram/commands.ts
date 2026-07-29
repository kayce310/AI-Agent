/**
 * @file Coral Telegram Command Adapter
 * @layer modules
 * @depends-on src/core/commands/registry.ts
 * @imported-by src/modules/telegram/index.ts
 * @owner telegram-module
 *
 * Telegram-specific command adapter.
 * - Delegates generic commands (help, status) to core CommandRegistry
 * - Keeps Telegram-specific UI (InlineKeyboard for /model)
 * - Keeps admin/user management (Telegram-specific auth flow)
 */

import { Context } from 'grammy';
import { ProviderRegistry } from '../../core/llm/provider-registry.js';
import { SessionManager } from '../../core/session-manager.js';
import { CommandRegistry as CoreRegistry } from '../../core/commands/registry.js';
import type { CommandContext } from '../../core/commands/types.js';
import { Logger } from '../../core/logger.js';
import { DashboardServer } from '../../core/events/http-server.js';
import { getTaskQueue } from '../../core/task-queue.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn, execSync } from 'child_process';

const log = new Logger({ module: 'Commands' });

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

interface ModelInfo {
  id: string;
  label?: string;
  tier?: number;
  maxTokens?: number;
}

interface ProviderInfo {
  name: string;
  models: ModelInfo[];
}

interface ModelPickerState {
  providers: ProviderInfo[];
  currentModel: string;
  selectedProvider?: string;
  modelList?: ModelInfo[];
  modelPage?: number;
}

// ──────────────────────────────────────────────
// InlineKeyboard Builder
// ──────────────────────────────────────────────

function inlineKeyboard(
  rows: Array<Array<{ text: string; callback_data: string }>>
): { inline_keyboard: Array<Array<{ text: string; callback_data: string }>> } {
  return { inline_keyboard: rows };
}

// ──────────────────────────────────────────────
// Telegram Command Bridge
// ──────────────────────────────────────────────

/**
 * Build a core CommandContext from a Telegram context.
 */
function buildCoreContext(ctx: Context, args: string[]): CommandContext {
  return {
    platform: 'telegram',
    userId: String(ctx.from?.id || 'unknown'),
    channelId: String(ctx.chat?.id || 'unknown'),
    isAdmin: false, // Will be checked in handler
    isAllowed: false, // Will be checked in handler
    args,
    platformContext: { tgCtx: ctx },
  };
}

export class CommandRegistry {
  private commands: Map<string, { name: string; description: string; handler: (ctx: Context, args: string[]) => Promise<void> }> = new Map();
  private sessionManager: SessionManager;
  private userSessions: Map<string, { selectedModel: string }>;
  private modelPickerState: Map<string, ModelPickerState> = new Map();

  constructor(
    sessionManager: SessionManager,
    userSessions: Map<string, { selectedModel: string }>
  ) {
    this.sessionManager = sessionManager;
    this.userSessions = userSessions;
    this.registerDefaultCommands();
  }

  // ──────────────────────────────────────────────
  // Command Registration (Telegram-local, for platform-specific commands)
  // ──────────────────────────────────────────────

  private registerDefaultCommands(): void {
    // ── Start ──
    this.register({
      name: 'start',
      description: 'Bắt đầu / chào mừng',
      handler: async (ctx, _args) => {
        const userId = String(ctx.from?.id || 'unknown');
        const { userManager } = await import('./user-manager.js');
        if (!userManager.isBootstrapped()) {
          userManager.bootstrap(userId);
        }
        const allowed = userManager.isAllowed(userId);
        if (!allowed) {
          await ctx.reply('❌ Bạn chưa được phép sử dụng Coral. Liên hệ admin.');
          return;
        }
        await ctx.reply(
          '🌊 **Chào mừng bạn đến với Coral!**\n\n' +
          'Tôi là AI Agent có thể giúp bạn:\n' +
          '• Trả lời câu hỏi, thực thi code, quản lý file\n' +
          '• Tìm kiếm thông tin, phân tích dữ liệu\n\n' +
          'Gửi tin nhắn bất kỳ để bắt đầu, hoặc dùng /help để xem danh sách lệnh.'
        );
      },
    });

    // ── Help: core commands + Telegram-specific commands ──
    this.register({
      name: 'help',
      description: 'Xem danh sách tất cả lệnh',
      handler: async (ctx, args) => {
        const { userManager } = await import('./user-manager.js');
        const userId = String(ctx.from?.id || 'unknown');
        if (!userManager.isAllowed(userId)) return;
        const isAdmin = userManager.isAdmin(userId);

        // Get core commands help text
        const coreCtx = buildCoreContext(ctx, args);
        coreCtx.isAdmin = isAdmin;
        coreCtx.isAllowed = true;
        const coreResult = await CoreRegistry.getInstance().execute('help', coreCtx);

        // Append Telegram-specific commands (not in core registry)
        const lines: string[] = [coreResult.text];

        // Check which local commands exist but aren't in core
        const coreCmdNames = CoreRegistry.getInstance().getCommands('telegram').map(c => c.name);
        const localCmds = this.getAll().filter(c => !coreCmdNames.includes(c.name));
        if (localCmds.length > 0) {
          lines.push('', '*Telegram:*');
          for (const cmd of localCmds) {
            lines.push(`• /${cmd.name} — ${cmd.description}`);
          }
        }

        // Admin commands (always added by Telegram layer)
        if (isAdmin) {
          lines.push('', '*Quản trị:*');
          lines.push('• /allow <userId> — Thêm user');
          lines.push('• /allow <userId> admin — Thêm admin');
          lines.push('• /disallow <userId> — Xóa user');
          lines.push('• /users — Danh sách user');
          lines.push('• /admin — Bảng điều khiển admin');
        }

        await ctx.reply(lines.join('\n'), { parse_mode: 'Markdown' });
      },
    });

    // ── Status: system info + task detail + dashboard ──
    this.register({
      name: 'status',
      description: 'Xem trạng thái hệ thống Coral',
      handler: async (ctx, args) => {
        const { userManager } = await import('./user-manager.js');
        const userId = String(ctx.from?.id || 'unknown');
        if (!userManager.isAllowed(userId)) return;

        // ── Task detail mode (backward compat) ──
        if (args.length > 0) {
          const taskId = args[0];
          const taskQueue = getTaskQueue();
          const task = taskQueue.getStatus(taskId);
          if (!task) {
            await ctx.reply(`❌ Không tìm thấy tác vụ \`${taskId}\``);
            return;
          }
          const statusIcons: Record<string, string> = {
            queued: '⏳', running: '🔄', completed: '✅', failed: '❌', cancelled: '🚫',
          };
          const icon = statusIcons[task.status] || '❓';
          const lines = [
            `${icon} **Task: \`${taskId}\`**`,
            '',
            `📋 Trạng thái: **${task.status}**`,
            `📝 Mô tả: ${task.request.task || 'không rõ'}`,
            `⏱ Tạo: ${new Date(task.createdAt).toLocaleString('vi-VN')}`,
          ];
          if (task.startedAt) lines.push(`🔄 Bắt đầu: ${new Date(task.startedAt).toLocaleString('vi-VN')}`);
          if (task.completedAt) lines.push(`✅ Kết thúc: ${new Date(task.completedAt).toLocaleString('vi-VN')}`);
          if (task.progress) lines.push(`📊 Tiến độ: ${task.progress}`);
          if (task.error) lines.push(`⚠️ Lỗi: ${task.error.slice(0, 200)}`);
          await ctx.reply(lines.join('\n'));
          return;
        }

        // ── System status ──
        const role = userManager.isAdmin(userId) ? '👑 Admin' : '👤 User';
        const currentSession = this.userSessions.get(userId);
        const modelSpecs = new ProviderRegistry();
        modelSpecs.loadFromConfig();
        const specs = modelSpecs.getModelSpecs();
        const currentModel = currentSession?.selectedModel || (specs.length > 0 ? specs[0].id : 'auto/best-free');
        const memory = process.memoryUsage();
        const uptime = process.uptime();

        const lines: string[] = [
          '🌊 **Coral Status**',
          '',
          `📱 Platform: Telegram`,
          `👤 Role: ${role}`,
          `🧠 Model hiện tại: \`${currentModel}\``,
          `📊 Models available: \`${specs.length}\``,
          `💾 Memory: ${(memory.heapUsed / 1024 / 1024).toFixed(1)}MB / ${(memory.heapTotal / 1024 / 1024).toFixed(1)}MB`,
          `⏱️ Uptime: ${Math.floor(uptime / 60)}m ${Math.floor(uptime % 60)}s`,
          `🗄️ Memories: Active`,
        ];

        // Dashboard status — check globalThis for runtime state
        try {
          const dashboardServer = (globalThis as any).__coral_dashboardServer;
          const tunnelUrl = (globalThis as any).__coral_tunnelUrl;
          if (dashboardServer) {
            lines.push(`📊 **Dashboard:** 🟢 **đang chạy** tại \`http://localhost:8766\``);
            if (tunnelUrl) {
              lines.push(`🌐 **Tunnel:** \`${tunnelUrl}\``);
            } else {
              lines.push(`🌐 **Tunnel:** đang chờ tạo...`);
            }
          } else {
            lines.push(`📊 **Dashboard:** ⚪ **đang tắt** — dùng \`/dashboard\` để bật`);
          }
        } catch {
          lines.push(`📊 **Dashboard:** ⚪ không xác định`);
        }

        await ctx.reply(lines.join('\n'));
      },
    });

    // ── Telegram-specific commands ──
    this.register({
      name: 'model',
      description: 'Chọn model AI — hiển thị nút bấm chọn trực tiếp',
      handler: this.handleModel.bind(this),
    });

    this.register({
      name: 'dashboard',
      description: 'Bật/tắt Dashboard Web — http://localhost:8766',
      handler: this.handleDashboard.bind(this),
    });

    this.register({
      name: 'world',
      description: 'Bật/tắt World Model probes (system/file monitoring)',
      handler: this.handleWorld.bind(this),
    });

    this.register({
      name: 'list',
      description: 'Danh sách tác vụ nền đang chạy',
      handler: this.handleListTask.bind(this),
    });

    this.register({
      name: 'cancel',
      description: 'Hủy tác vụ nền — /cancel <taskId>',
      handler: this.handleCancelTask.bind(this),
    });

    this.register({
      name: 'restart',
      description: 'Khởi động lại Coral',
      handler: this.handleRestart.bind(this),
    });

    // ── Session Commands (will be moved to core in future) ──
    this.register({
      name: 'new',
      description: 'Tạo session mới — lưu session cũ vào lịch sử',
      handler: this.handleNew.bind(this),
    });

    this.register({
      name: 'sessions',
      description: 'Xem danh sách tất cả session',
      handler: this.handleSessions.bind(this),
    });

    this.register({
      name: 'switch',
      description: 'Chuyển sang session cũ — /switch <sessionId>',
      handler: this.handleSwitch.bind(this),
    });

    // ── Trace / Activity Log ──
    this.register({
      name: 'trace',
      description: 'Xem log hoạt động gần đây của Coral từ EventBus',
      handler: async (ctx, args) => {
        const { userManager } = await import('./user-manager.js');
        const userId = String(ctx.from?.id || 'unknown');
        if (!userManager.isAllowed(userId)) return;

        const limit = args.length > 0 ? Math.min(parseInt(args[0], 10) || 10, 50) : 10;

        try {
          const eventBus = (globalThis as any).__coral_eventBus;
          if (!eventBus) {
            await ctx.reply('❌ EventBus chưa sẵn sàng.');
            return;
          }

          const events = eventBus.getRecent(limit);
          if (!events || events.length === 0) {
            await ctx.reply('📭 Chưa có sự kiện nào trong EventBus.');
            return;
          }

          const lines: string[] = ['📜 **Hoạt động gần đây**', ''];
          for (const ev of events) {
            const time = new Date(ev.timestamp).toLocaleTimeString('vi-VN');
            switch (ev.type) {
              case 'task_started':
                lines.push(`🟢 ${time} **Task:** ${ev.payload.goal?.slice(0, 60) || ''}`);
                break;
              case 'task_finished':
                const statusIcon = ev.payload.success ? '✅' : '❌';
                const statusText = ev.payload.success ? 'Hoàn thành' : 'Thất bại';
                lines.push(`${statusIcon} ${time} **${statusText}:** ${ev.payload.goal?.slice(0, 40) || ''}`);
                break;
              case 'tool_called':
                lines.push(`🔧 ${time} \`/${ev.payload.toolName}\``);
                break;
              case 'tool_finished':
                lines.push(`   ⏱️ ${ev.payload.durationMs || '?'}ms → ${ev.payload.success ? '✅' : '❌'}`);
                break;
              case 'decision_made':
                lines.push(`🧠 ${time} Quyết định: ${ev.payload.decision?.slice(0, 50) || ''}`);
                break;
              case 'file_created':
                lines.push(`📄 ${time} Tạo: \`${ev.payload.path?.split('/').pop() || ''}\``);
                break;
              case 'file_modified':
                lines.push(`✏️ ${time} Sửa: \`${ev.payload.path?.split('/').pop() || ''}\``);
                break;
              default:
                lines.push(`📌 ${time} ${ev.type}: ${JSON.stringify(ev.payload).slice(0, 60)}`);
            }
          }
          lines.push('', `Dùng \`/trace <số lượng>\` để xem nhiều hơn (tối đa 50).`);

          await ctx.reply(lines.join('\n'));
        } catch (err: any) {
          await ctx.reply(`❌ Lỗi đọc EventBus: ${err.message}`);
        }
      },
    });
  }

  register(command: { name: string; description: string; handler: (ctx: Context, args: string[]) => Promise<void> }): void {
    this.commands.set(command.name, command);
  }

  get(name: string): { name: string; description: string; handler: (ctx: Context, args: string[]) => Promise<void> } | undefined {
    return this.commands.get(name);
  }

  getAll(): { name: string; description: string; handler: (ctx: Context, args: string[]) => Promise<void> }[] {
    return Array.from(this.commands.values());
  }
  // Command Handlers
  // ──────────────────────────────────────────────

  private async handleModel(ctx: Context, args: string[]): Promise<void> {
    const userId = String(ctx.from?.id || 'unknown');
    const chatId = String(ctx.chat?.id || 'unknown');

    const { userManager } = await import('./user-manager.js');
    if (!userManager.isAllowed(userId)) return;

    const registry = new ProviderRegistry();
    registry.loadFromConfig();

    const modelSpecs = registry.getModelSpecs();
    const currentSession = this.userSessions.get(userId);
    const currentModel = currentSession?.selectedModel || (modelSpecs.length > 0 ? modelSpecs[0].id : 'auto/best-free');

    if (args.length === 0) {
      await this.showModelPicker(ctx, chatId, modelSpecs, currentModel);
      return;
    }

    const modelName = args[0];
    this.userSessions.set(userId, { selectedModel: modelName });
    await ctx.reply(`✅ Đã chọn model: *${modelName}*\n\nModel này sẽ được dùng cho tin nhắn tiếp theo.`);
  }

  // ── Dashboard Command ──
  private async handleDashboard(ctx: Context): Promise<void> {
    const userId = String(ctx.from?.id || 'unknown');
    const { userManager } = await import('./user-manager.js');
    if (!userManager.isAllowed(userId)) return;

    const existing = (globalThis as any).__coral_dashboardServer;
    if (existing) {
      try { await (globalThis as any).__coral_stopTunnel(); } catch {}
      await existing.stop();
      (globalThis as any).__coral_dashboardServer = null;
      (globalThis as any).__coral_tunnelUrl = undefined;
      await ctx.reply('📊 Dashboard đã tắt.');
      return;
    }

    const eventBus = (globalThis as any).__coral_eventBus || (globalThis as any).__coral_dashboardReady?.eventBus;
    const memoryApi = (globalThis as any).__coral_memoryApi || (globalThis as any).__coral_dashboardReady?.memoryApi;
    if (!eventBus) {
      await ctx.reply('❌ EventBus chưa sẵn sàng — thử khởi động lại Coral.');
      return;
    }

    try {
      const server = new DashboardServer(eventBus, { port: 8766, memoryApi });
      await server.start();
      (globalThis as any).__coral_dashboardServer = server;
      // Start tunnel — always start fresh, ignore stale URL from file
      const startTunnel = (globalThis as any).__coral_startTunnel;
      if (startTunnel) startTunnel();
      const tunnelMsg = startTunnel ? '\n🌐 Tunnel sẽ được tạo trong vài giây.' : '';
      await ctx.reply(`📊 Dashboard đang chạy tại http://localhost:8766${tunnelMsg}\n\nGửi /dashboard để tắt.`);
    } catch (e: any) {
      await ctx.reply(`❌ Không thể khởi động dashboard: ${e.message || e}`);
    }
  }

  private async handleWorld(ctx: Context): Promise<void> {
    const userId = String(ctx.from?.id || 'unknown');
    const { userManager } = await import('./user-manager.js');
    if (!userManager.isAllowed(userId)) return;

    try {
      const { CronScheduler } = await import('../../core/cron/index.js');
      // ponytail: Access scheduler via globalThis to toggle job
      const cronScheduler = (globalThis as any).__coral_cronScheduler;
      if (!cronScheduler) {
        await ctx.reply('❌ Cron scheduler không khả dụng.');
        return;
      }

      const jobs = cronScheduler.listJobs();
      const job = jobs.find((j: any) => j.name === 'world-model');
      if (!job) {
        await ctx.reply('❌ World Model job không tìm thấy.');
        return;
      }

      const newState = !job.enabled;
      if (newState) {
        cronScheduler.enableJob('world-model');
      } else {
        cronScheduler.disableJob('world-model');
      }
      await ctx.reply(`🌍 World Model probes: ${newState ? '✅ Bật' : '❌ Tắt'}`);
    } catch (e: any) {
      await ctx.reply(`⚠️ Lỗi: ${e.message || e}`);
    }
  }

  // ──────────────────────────────────────────────
  // Task Command Handlers (Phase 3)
  // ──────────────────────────────────────────────

  private async handleListTask(ctx: Context, _args: string[]): Promise<void> {
    const userId = String(ctx.from?.id || 'unknown');
    const { userManager } = await import('./user-manager.js');
    if (!userManager.isAllowed(userId)) return;

    const taskQueue = getTaskQueue();
    // Try to get tasks for this user's session (by their userId as sessionId)
    const chatId = String(ctx.chat?.id || 'unknown');
    const tasks = taskQueue.listTasks(chatId).filter(t => t.status === 'queued' || t.status === 'running');
    const allActive = taskQueue.listActiveTasks();

    const lines: string[] = ['📋 **Tác vụ nền**', ''];

    if (allActive.length === 0) {
      lines.push('Không có tác vụ nào đang chạy.');
    } else {
      lines.push(`Tổng số: **${allActive.length}** tác vụ đang hoạt động`);
      lines.push('');
      for (const task of allActive) {
        const statusIcons: Record<string, string> = {
          queued: '⏳', running: '🔄', completed: '✅', failed: '❌', cancelled: '🚫',
        };
        const icon = statusIcons[task.status] || '❓';
        const desc = (task.request.task || '').slice(0, 50);
        lines.push(`${icon} \`${task.id}\` — ${desc}`);
      }
    }

    lines.push('', 'Dùng /status <taskId> để xem chi tiết.');
    await ctx.reply(lines.join('\n'));
  }

  private async handleCancelTask(ctx: Context, args: string[]): Promise<void> {
    const userId = String(ctx.from?.id || 'unknown');
    const { userManager } = await import('./user-manager.js');
    if (!userManager.isAllowed(userId)) return;

    if (args.length < 1) {
      await ctx.reply('📝 Cách dùng: /cancel <taskId>');
      return;
    }

    const taskId = args[0];
    const taskQueue = getTaskQueue();
    const success = taskQueue.cancel(taskId);

    if (success) {
      await ctx.reply(`🚫 Đã hủy tác vụ \`${taskId}\``);
    } else {
      await ctx.reply(`❌ Không thể hủy tác vụ \`${taskId}\` — không tồn tại hoặc đã hoàn thành.`);
    }
  }

  private async handleRestart(ctx: Context, _args: string[]): Promise<void> {
    const chatId = String(ctx.chat?.id || '');
    const userId = String(ctx.from?.id || 'unknown');
    const { userManager } = await import('./user-manager.js');
    if (!userManager.isAllowed(userId)) return;

    // Write marker so startup can send "restart done" notification
    if (chatId) {
      const { writeRestartMarker } = await import('../../scripts/restart-notify.js');
      writeRestartMarker(chatId);
    }

    await ctx.reply('🔄 Đang khởi động lại Coral...');

    // Give Telegram time to deliver the message before exiting
    setTimeout(() => {
      log.info('Restart requested by user via /restart');
      try {
        // ponytail: build before restart so dist/ reflects latest source
        execSync('npm run build', { cwd: process.cwd(), stdio: 'ignore' });
        const scriptPath = path.resolve(process.argv[1] || 'dist/scripts/start-telegram.js');
        const child = spawn(process.execPath, ['--max-old-space-size=4096', scriptPath], {
          cwd: process.cwd(),
          stdio: 'ignore',
          detached: true,
          windowsHide: true,
        });
        child.unref();
        process.exit(0);
      } catch (err: any) {
        log.error(`Restart spawn failed: ${err.message}`);
      }
    }, 1500);
  }

  // ──────────────────────────────────────────────
  // Session Commands
  // ──────────────────────────────────────────────

  private async handleNew(ctx: Context, _args: string[]): Promise<void> {
    const userId = String(ctx.from?.id || 'unknown');
    const { userManager } = await import('./user-manager.js');
    if (!userManager.isAllowed(userId)) return;

    const newSession = await this.sessionManager.archiveSession(userId);
    this.userSessions.delete(userId);

    await ctx.reply(
      `✅ **Session mới đã tạo!**\n\n` +
      `🆔 \`${newSession.sessionId.slice(0, 8)}\`...\n` +
      `📅 ${new Date(newSession.createdAt).toLocaleString('vi-VN')}\n\n` +
      `Session cũ đã được lưu vào lịch sử. Dùng /sessions để xem danh sách.`
    );
  }

  private async handleSessions(ctx: Context, _args: string[]): Promise<void> {
    const userId = String(ctx.from?.id || 'unknown');
    const { userManager } = await import('./user-manager.js');
    if (!userManager.isAllowed(userId)) return;

    const { active, history } = this.sessionManager.listSessions(userId);

    const lines: string[] = ['📋 **Danh sách Sessions**', ''];

    if (active) {
      const model = active.model || 'default';
      const title = active.title || 'Chưa có tin nhắn';
      const age = this.formatAge(active.createdAt);
      lines.push(`🟢 **Đang active:**`);
      lines.push(`  🆔 \`${active.sessionId.slice(0, 8)}\`...`);
      lines.push(`  📝 ${title}`);
      lines.push(`  🧠 Model: \`${model}\``);
      lines.push(`  ⏱️ Tạo: ${age}`);
      lines.push('');
    }

    if (history.length === 0) {
      lines.push('📚 Không có session nào trong lịch sử.');
    } else {
      lines.push(`📚 **Lịch sử (${history.length} session):**`);
      lines.push('');
      for (let i = 0; i < Math.min(history.length, 10); i++) {
        const s = history[i];
        const model = s.model || 'default';
        const title = s.title || 'Chưa có tin nhắn';
        const age = this.formatAge(s.createdAt);
        const shortId = s.sessionId.slice(0, 8);
        lines.push(`${i + 1}. \`${shortId}\` — ${title}`);
        lines.push(`   🧠 ${model} | ⏱️ ${age}`);
      }
      if (history.length > 10) {
        lines.push(`   ... và ${history.length - 10} session nữa`);
      }
      lines.push('');
      lines.push('Dùng /switch <sessionId> để chuyển session.');
    }

    await ctx.reply(lines.join('\n'));
  }

  private async handleSwitch(ctx: Context, args: string[]): Promise<void> {
    const userId = String(ctx.from?.id || 'unknown');
    const { userManager } = await import('./user-manager.js');
    if (!userManager.isAllowed(userId)) return;

    if (args.length < 1) {
      await ctx.reply('📝 Cách dùng: /switch <sessionId>\n\nDùng /sessions để xem danh sách session.');
      return;
    }

    const sessionId = args[0];
    const switched = await this.sessionManager.switchSession(userId, sessionId);

    if (!switched) {
      await ctx.reply(`❌ Không tìm thấy session \`${sessionId}\`.\n\nDùng /sessions để xem danh sách.`);
      return;
    }

    if (switched.model) {
      this.userSessions.set(userId, { selectedModel: switched.model });
    }

    const title = switched.title || 'Chưa có tin nhắn';
    await ctx.reply(
      `✅ **Đã chuyển session!**\n\n` +
      `🆔 \`${switched.sessionId.slice(0, 8)}\`...\n` +
      `📝 ${title}\n` +
      `🧠 Model: \`${switched.model || 'default'}\`\n\n` +
      `Tiếp tục trò chuyện từ session cũ!`
    );
  }

  /**
   * Format timestamp to human-readable age string
   */
  private formatAge(timestamp: number): string {
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'vừa xong';
    if (minutes < 60) return `${minutes} phút trước`;
    if (hours < 24) return `${hours} giờ trước`;
    return `${days} ngày trước`;
  }

  // ──────────────────────────────────────────────
  // Model Picker (InlineKeyboard)
  // ──────────────────────────────────────────────

  /**
   * Group model specs by provider (first segment of model ID).
   * Example: "openrouter/openrouter/owl-alpha" → provider "openrouter"
   */
  private groupModelsByProvider(
    modelSpecs: ModelInfo[]
  ): Map<string, ModelInfo[]> {
    const providerMap = new Map<string, ModelInfo[]>();

    for (const spec of modelSpecs) {
      const parts = spec.id.split('/');
      const provider = parts.length >= 2 ? parts[0] : 'default';

      if (!providerMap.has(provider)) {
        providerMap.set(provider, []);
      }
      providerMap.get(provider)!.push(spec);
    }

    return providerMap;
  }

  private async showModelPicker(
    ctx: Context,
    chatId: string,
    modelSpecs: ModelInfo[],
    currentModel: string
  ): Promise<void> {
    const providerMap = this.groupModelsByProvider(modelSpecs);

    // Build provider list
    const providers: ProviderInfo[] = [];
    const providerButtons: Array<{ text: string; callback_data: string }> = [];

    // Use Array.from() to iterate Map (ES5 compatible)
    const providerEntries = Array.from(providerMap.entries());
    for (const entry of providerEntries) {
      const name = entry[0];
      const models = entry[1];
      providers.push({ name, models });
      providerButtons.push({
        text: `${name} (${models.length})`,
        callback_data: `mp:${name}`,
      });
    }

    // Add cancel button
    providerButtons.push({
      text: '✗ Hủy',
      callback_data: 'mx',
    });

    // 2 buttons per row
    const rows: Array<Array<{ text: string; callback_data: string }>> = [];
    for (let i = 0; i < providerButtons.length; i += 2) {
      rows.push(providerButtons.slice(i, i + 2));
    }

    const keyboard = inlineKeyboard(rows);

    const text = [
      '⚙ *Model Configuration*',
      '',
      `Current model: \`${currentModel}\``,
      '',
      'Chọn provider:',
    ].join('\n');

    try {
      const msg = await ctx.reply(text, {
        reply_markup: keyboard,
      });

      // Store picker state (keyed by chatId for callback routing)
      this.modelPickerState.set(chatId, {
        providers,
        currentModel,
      });
    } catch (err) {
      log.error('Failed to send model picker', { error: String(err) });
      await ctx.reply('❌ Không thể hiển thị bộ chọn model.');
    }
  }

  /**
   * Handle callback query from inline keyboard model picker.
   * Called by the TelegramBridge when a callback_query event arrives.
   */
  async handleCallbackQuery(ctx: any, data: string, chatId: string): Promise<void> {
    const query = ctx.callbackQuery;
    const state = this.modelPickerState.get(chatId);
    if (!state) {
      await ctx.answerCallbackQuery({ text: 'Bộ chọn đã hết hạn — dùng /model lại.' }).catch(() => {});
      return;
    }

    try {
      // ── Provider selected → show model buttons ──
      if (data.startsWith('mp:')) {
        const providerName = data.substring(3);
        const provider = state.providers.find(p => p.name === providerName);

        if (!provider) {
          await ctx.answerCallbackQuery({ text: 'Provider not found.' }).catch(() => {});
          return;
        }

        state.selectedProvider = providerName;
        state.modelList = provider.models;
        state.modelPage = 0;

        const keyboard = this.buildModelKeyboard(provider.models, 0);

        const text = [
          '⚙ *Model Configuration*',
          '',
          `Provider: *${providerName}*`,
          '',
          'Chọn model:',
        ].join('\n');

        await ctx.editMessageText(text, {
          reply_markup: keyboard,
        }).catch(() => {});
        await ctx.answerCallbackQuery().catch(() => {});
        return;
      }

      // ── Page navigation ──
      if (data.startsWith('mg:')) {
        const page = parseInt(data.substring(3), 10);
        if (isNaN(page)) {
          await ctx.answerCallbackQuery({ text: 'Invalid page.' }).catch(() => {});
          return;
        }

        const models = state.modelList || [];
        state.modelPage = page;

        const keyboard = this.buildModelKeyboard(models, page);

        const text = [
          '⚙ *Model Configuration*',
          '',
          `Provider: *${state.selectedProvider || ''}*`,
          '',
          'Chọn model:',
        ].join('\n');

        await ctx.editMessageText(text, {
          reply_markup: keyboard,
        }).catch(() => {});
        await ctx.answerCallbackQuery().catch(() => {});
        return;
      }

      // ── Model selected → perform switch ──
      if (data.startsWith('mm:')) {
        const idx = parseInt(data.substring(3), 10);
        if (isNaN(idx)) {
          await ctx.answerCallbackQuery({ text: 'Invalid selection.' }).catch(() => {});
          return;
        }

        const modelList = state.modelList || [];
        if (idx < 0 || idx >= modelList.length) {
          await ctx.answerCallbackQuery({ text: 'Invalid model index.' }).catch(() => {});
          return;
        }

        const selectedModel = modelList[idx];

        // Store in user sessions for next message
        const userId = String(ctx.from?.id || 'unknown');
        this.userSessions.set(userId, { selectedModel: selectedModel.id });

        // Edit message to show confirmation, remove buttons
        const confirmText = [
          '✅ *Model đã được chọn!*',
          '',
          `Model: \`${selectedModel.id}\``,
          `Label: ${selectedModel.label || selectedModel.id}`,
          '',
          'Model này sẽ được dùng cho tin nhắn tiếp theo.',
        ].join('\n');

        await ctx.editMessageText(confirmText, {}).catch(() => {});
        await ctx.answerCallbackQuery({ text: 'Model switched!' }).catch(() => {});

        // Clean up state
        this.modelPickerState.delete(chatId);
        return;
      }

      // ── Back to providers ──
      if (data === 'mb') {
        const providerButtons: Array<{ text: string; callback_data: string }> = [];

        for (const provider of state.providers) {
          providerButtons.push({
            text: `${provider.name} (${provider.models.length})`,
            callback_data: `mp:${provider.name}`,
          });
        }

        providerButtons.push({
          text: '✗ Hủy',
          callback_data: 'mx',
        });

        const rows: Array<Array<{ text: string; callback_data: string }>> = [];
        for (let i = 0; i < providerButtons.length; i += 2) {
          rows.push(providerButtons.slice(i, i + 2));
        }

        const keyboard = inlineKeyboard(rows);

        const text = [
          '⚙ *Model Configuration*',
          '',
          `Current model: \`${state.currentModel}\``,
          '',
          'Chọn provider:',
        ].join('\n');

        await ctx.editMessageText(text, {
          reply_markup: keyboard,
        }).catch(() => {});
        await ctx.answerCallbackQuery().catch(() => {});
        return;
      }

      // ── Cancel ──
      if (data === 'mx') {
        await ctx.editMessageText('❌ Đã hủy chọn model.', {}).catch(() => {});
        await ctx.answerCallbackQuery().catch(() => {});
        this.modelPickerState.delete(chatId);
        return;
      }
    } catch (err) {
      log.error('Callback query error', { error: String(err), data, chatId });
      try {
        await ctx.answerCallbackQuery({ text: 'Lỗi xử lý.' }).catch(() => {});
      } catch {}
    }
  }

  /**
   * Build paginated model selection keyboard.
   * Uses callback_data format: mm:<index> for model select, mg:<page> for pagination.
   */
  private buildModelKeyboard(
    models: ModelInfo[],
    page: number
  ): { inline_keyboard: Array<Array<{ text: string; callback_data: string }>> } {
    const PAGE_SIZE = 8;
    const total = models.length;
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    page = Math.max(0, Math.min(page, totalPages - 1));

    const start = page * PAGE_SIZE;
    const end = Math.min(start + PAGE_SIZE, total);

    const buttons: Array<{ text: string; callback_data: string }> = [];

    for (let i = start; i < end; i++) {
      const model = models[i];
      const short = model.label || model.id.split('/').pop() || model.id;
      buttons.push({
        text: short.length > 38 ? short.substring(0, 35) + '...' : short,
        callback_data: `mm:${i}`,
      });
    }

    const rows: Array<Array<{ text: string; callback_data: string }>> = [];
    for (let i = 0; i < buttons.length; i += 2) {
      rows.push(buttons.slice(i, i + 2));
    }

    // Pagination row (if needed)
    if (totalPages > 1) {
      const nav: Array<{ text: string; callback_data: string }> = [];
      if (page > 0) {
        nav.push({ text: '◀ Prev', callback_data: `mg:${page - 1}` });
      }
      nav.push({ text: `${page + 1}/${totalPages}`, callback_data: 'mx:noop' });
      if (page < totalPages - 1) {
        nav.push({ text: 'Next ▶', callback_data: `mg:${page + 1}` });
      }
      rows.push(nav);
    }

    // Back + Cancel row
    rows.push([
      { text: '◀ Back', callback_data: 'mb' },
      { text: '✗ Hủy', callback_data: 'mx' },
    ]);

    return inlineKeyboard(rows);
  }
}
