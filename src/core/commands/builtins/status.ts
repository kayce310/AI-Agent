/**
 * @file Built-in Status Command
 * @layer core
 */

import type { Command } from '../types.js';
import { CommandRegistry } from '../registry.js';

export const statusCommand: Command = {
  name: 'status',
  description: 'Xem trạng thái hệ thống Coral',
  category: 'general',
  handler: async (ctx) => {
    const registry = CommandRegistry.getInstance();
    const modelSpecs = registry.getModelSpecs();
    const memory = process.memoryUsage();
    const uptime = process.uptime();

    const lines: string[] = [
      '🌊 **Coral Status**',
      '',
      `📱 Platform: ${ctx.platform}`,
      `👤 User: \`${ctx.userId}\``,
      `🧠 Models: \`${modelSpecs.length}\` available`,
      `💾 Memory: ${(memory.heapUsed / 1024 / 1024).toFixed(1)}MB / ${(memory.heapTotal / 1024 / 1024).toFixed(1)}MB`,
      `⏱️ Uptime: ${Math.floor(uptime / 60)}m ${Math.floor(uptime % 60)}s`,
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

    return { text: lines.join('\n') };
  },
};
