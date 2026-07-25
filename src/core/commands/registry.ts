/**
 * @file Command Registry — Cross-platform Command Management
 * @layer core
 * @owner core-commands
 *
 * Inspired by Hermes Agent's ToolRegistry (tools/registry.py).
 * Platform-agnostic command registry that any platform can query.
 *
 * Features:
 * - Register commands with platform gating + availability checks
 * - Filter commands by platform (telegram, discord, cli...)
 * - Built-in /help generation
 * - JSON Schema output for LLM tool integration
 */

import type { Command, CommandContext, CommandResult } from './types.js';
import { Logger } from '../logger.js';
import { ProviderRegistry } from '../llm/provider-registry.js';
import { helpCommand } from './builtins/help.js';
import { statusCommand } from './builtins/status.js';
import { modelCommand } from './builtins/model.js';
import { sessionsCommand } from './builtins/sessions.js';

const log = new Logger({ module: 'CommandRegistry' });

/**
 * CommandRegistry — singleton, platform-agnostic.
 * Platforms register their adapter, then call registry.execute().
 *
 * Builtin commands (help, status, model, sessions) are auto-registered
 * on first access via getInstance().
 */
export class CommandRegistry {
  private commands = new Map<string, Command>();
  private static instance: CommandRegistry;
  private static initialized = false;

  static getInstance(): CommandRegistry {
    if (!CommandRegistry.instance) {
      CommandRegistry.instance = new CommandRegistry();
    }
    if (!CommandRegistry.initialized) {
      CommandRegistry.initialized = true;
      CommandRegistry.instance.registerBuiltins();
    }
    return CommandRegistry.instance;
  }

  /**
   * Register all core builtin commands.
   */
  private registerBuiltins(): void {
    this.register(helpCommand);
    this.register(statusCommand);
    this.register(modelCommand);
    this.register(sessionsCommand);
  }

  /**
   * Register a command. Idempotent on subsequent register calls.
   */
  register(cmd: Command): void {
    if (this.commands.has(cmd.name)) {
      log.debug(`Command "${cmd.name}" already registered — skipping`);
      return;
    }
    this.commands.set(cmd.name, cmd);
    log.info(`Command registered: /${cmd.name} (${cmd.category || 'general'})`);
  }

  /**
   * Get all commands, optionally filtered by platform.
   */
  getCommands(platform?: string): Command[] {
    const all = Array.from(this.commands.values());
    if (!platform) return all;
    return all.filter(cmd => {
      // If platforms not specified, available on all
      if (!cmd.platforms || cmd.platforms.length === 0) return true;
      return cmd.platforms.includes(platform);
    });
  }

  /**
   * Get a specific command by name.
   */
  get(name: string): Command | undefined {
    return this.commands.get(name);
  }

  /**
   * Execute a command by name.
   * Returns a CommandResult (platform-agnostic text + optional extra).
   */
  async execute(name: string, ctx: CommandContext): Promise<CommandResult> {
    const cmd = this.commands.get(name);
    if (!cmd) {
      return { text: `❌ Lệnh \`/${name}\` không tồn tại. Dùng /help để xem danh sách.` };
    }

    // Platform gate
    if (cmd.platforms && cmd.platforms.length > 0 && !cmd.platforms.includes(ctx.platform)) {
      return { text: `❌ Lệnh \`/${name}\` không khả dụng trên nền tảng ${ctx.platform}.` };
    }

    // Availability check (like Hermes check_fn)
    if (cmd.checkFn) {
      try {
        const available = await Promise.resolve(cmd.checkFn());
        if (!available) {
          return { text: `❌ Lệnh \`/${name}\` hiện không khả dụng (thiếu cấu hình hoặc token).` };
        }
      } catch {
        return { text: `❌ Lệnh \`/${name}\` hiện không khả dụng.` };
      }
    }

    try {
      return await cmd.handler(ctx);
    } catch (err: any) {
      log.error(`Command /${name} failed`, { error: err.message });
      return { text: `❌ Lỗi khi chạy lệnh \`/${name}\`: ${err.message}` };
    }
  }

  /**
   * Build help text, optionally filtered by platform.
   */
  buildHelpText(platform?: string, isAdmin?: boolean): string {
    const commands = this.getCommands(platform);
    const lines: string[] = [
      '🤖 **Coral AI Agent — Lệnh**',
      '',
      'Tôi có thể: • Trả lời câu hỏi, thực thi code, quản lý file, tìm kiếm thông tin.',
      'Đơn giản là gửi tin nhắn và tôi sẽ xử lý!',
      '',
      '**Lệnh:**',
    ];

    // Group by category
    const categories = new Map<string, Command[]>();
    for (const cmd of commands) {
      const cat = cmd.category || 'general';
      if (!categories.has(cat)) categories.set(cat, []);
      categories.get(cat)!.push(cmd);
    }

    for (const [category, cmds] of categories) {
      const catNames: Record<string, string> = {
        general: 'Chung',
        session: 'Phiên làm việc',
        admin: 'Quản trị',
        task: 'Tác vụ',
        developer: 'Phát triển',
      };
      lines.push(`\n*${catNames[category] || category}:*`);
      for (const cmd of cmds) {
        if (category === 'admin' && !isAdmin) continue;
        lines.push(`• /${cmd.name} — ${cmd.description}`);
      }
    }

    if (isAdmin) {
      lines.push('', '**Admin:**');
      lines.push('• /allow <userId> — Thêm user');
      lines.push('• /disallow <userId> — Xóa user');
      lines.push('• /users — Danh sách user');
    }

    return lines.join('\n');
  }

  /**
   * Get model specs from ProviderRegistry for model picker.
   */
  getModelSpecs(): Array<{ id: string; label?: string; tier?: number; maxTokens?: number }> {
    const registry = new ProviderRegistry();
    registry.loadFromConfig();
    return registry.getModelSpecs();
  }
}

export default CommandRegistry;
