/**
 * @file Built-in Help Command
 * @layer core
 */

import type { Command } from '../types.js';
import { CommandRegistry } from '../registry.js';

export const helpCommand: Command = {
  name: 'help',
  description: 'Xem danh sách tất cả lệnh',
  category: 'general',
  handler: async (ctx) => {
    const helpText = CommandRegistry.getInstance().buildHelpText(ctx.platform, ctx.isAdmin);
    return { text: helpText };
  },
};
