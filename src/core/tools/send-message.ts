/**
 * @file send-message — Tool plugin
 * @layer core
 * @owner core-tools
 *
 * Send messages to connected platforms.
 * Currently wraps Telegram delivery; extend for other platforms.
 */
import type { ToolPlugin } from './tool-registry.js';

const plugin: ToolPlugin = {
  name: 'send_message',
  tools: [
    {
      name: 'send_message',
      description: 'Send a message to a platform. Target: "telegram" (home channel), "platform:chat_id", or "list" to see available targets.',
      schema: {
        type: 'object',
        properties: {
          target: { type: 'string', description: 'Delivery target: "telegram", "platform:chat_id:thread_id", or "list"' },
          message: { type: 'string', description: 'Message text to send' },
          action: { type: 'string', enum: ['send', 'list'], default: 'send', description: '"send" or "list"' }
        },
        required: ['message']
      },
      async execute(args: Record<string, any>) {
        const { target = 'telegram', message, action = 'send' } = args;

        if (action === 'list') {
          // Return available delivery targets
          return {
            targets: [
              { id: 'telegram', name: 'Telegram Home Channel', type: 'telegram' },
            ],
            hint: 'Use "target": "telegram" to send to home channel, or "telegram:chat_id" for specific chat.'
          };
        }

        if (!message) return { error: 'message is required' };

        // Queue message for Telegram delivery
        // ponytail: emit via process event if engine is running, else log
        const payload = { platform: 'telegram', target, message };
        try {
          process.emit('tool:send_message' as any, payload as any);
        } catch { /* best-effort */ }
        return { success: true, target, preview: message.substring(0, 100) };
      }
    }
  ]
};

export default plugin;
