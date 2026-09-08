/**
 * @file Built-in Session Commands
 * @layer core
 */

import type { Command } from '../types.js';
import { getCheckpoint } from '../../checkpoint.js';

/**
 * Format timestamp to human-readable age string.
 */
function formatAge(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (minutes < 1) return 'vừa xong';
  if (minutes < 60) return `${minutes} phút trước`;
  if (hours < 24) return `${hours} giờ trước`;
  return `${days} ngày trước`;
}

export const sessionsCommand: Command = {
  name: 'sessions',
  description: 'Xem danh sách tất cả session',
  category: 'session',
  handler: async (ctx) => {
    const checkpoint = getCheckpoint();
    const plan = checkpoint.getPlan(ctx.userId);

    const lines: string[] = ['📋 **Danh sách Sessions**', ''];

    if (plan) {
      const age = formatAge(plan.createdAt);
      lines.push(`🟢 **Đang active:**`);
      lines.push(`  🆔 \`${plan.id.slice(0, 8)}\`...`);
      lines.push(`  🎯 ${plan.goal.slice(0, 50)}`);
      lines.push(`  📊 ${plan.status} — ${plan.items.filter((i: any) => i.status === 'completed').length}/${plan.items.length} items`);
      lines.push(`  ⏱️ ${age}`);
      lines.push('');
    }

    lines.push('📚 Xem chi tiết plan hiện tại qua system prompt hoặc dùng /status.');
    return { text: lines.join('\n') };
  },
};
