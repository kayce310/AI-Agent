/**
 * @file HITL Telegram Handler — Inline keyboard for approve/reject
 * @layer modules
 *
 * Handles callback_query:data with 'hitl:' prefix:
 *   hitl:approve:<requestId>
 *   hitl:reject:<requestId>
 */

import type { Bot, Context } from 'grammy';
import type { ApprovalRequest, HITLManager } from '../../core/security/hitl.js';

/**
 * Wire HITL callback handler to a grammy Bot instance.
 * Registers 'hitl:' prefix handling for inline keyboard callbacks.
 */
export function registerHITLCallbackHandler(
  bot: Bot,
  hitlManager: HITLManager,
  botUsername?: string,
): void {
  // Register callback_query handler for HITL actions
  // We hook into the existing callback handler via a custom command registry approach
  // Since the bridge already has `callback_query:data` handler, we add a route
  bot.on('callback_query:data', async (ctx: Context) => {
    const data = ctx.callbackQuery?.data;
    if (!data || !data.startsWith('hitl:')) return; // not ours, let other handlers process

    const parts = data.split(':');
    if (parts.length < 4) {
      await ctx.answerCallbackQuery({ text: '❌ Invalid request format' });
      return;
    }

    const action = parts[1];  // 'approve' | 'reject'
    const requestId = parts.slice(2).join(':'); // reconstruct original ID with timestamps

    const fromUser = ctx.callbackQuery?.from;
    const decidedBy = String(fromUser?.id || 'unknown');
    const displayName = fromUser?.username
      ? `@${fromUser.username}`
      : fromUser?.first_name || decidedBy;

    // Resolve the request
    let success: boolean;
    if (action === 'approve') {
      success = hitlManager.resolve(requestId, 'approved', decidedBy);
    } else if (action === 'reject') {
      success = hitlManager.resolve(requestId, 'rejected', decidedBy);
    } else {
      await ctx.answerCallbackQuery({ text: '❌ Unknown action' });
      return;
    }

    if (!success) {
      await ctx.answerCallbackQuery({ text: '⚠️ Request already decided or not found' });

      // Update the message to show current status
      const request = hitlManager.getQueue().get(requestId);
      if (request && ctx.callbackQuery?.message) {
        const statusIcon = request.status === 'approved' ? '✅' : request.status === 'rejected' ? '❌' : '⏳';
        try {
          await ctx.editMessageText(
            `*HITL Approval*\n` +
            `━━━━━━━━━━━━━\n` +
            `🆔 \`${requestId}\`\n` +
            `*Action:* \`${request.action.name}\`\n` +
            `*Description:* ${request.action.description}\n` +
            `*Status:* ${getStatusEmoji(request.status)} ${request.status.toUpperCase()}\n` +
            `*Decided by:* ${request.decidedBy ? `\`${request.decidedBy}\`` : '—'}\n` +
            `*Created:* ${new Date(request.createdAt).toLocaleString('vi-VN')}\n` +
            (request.decidedAt ? `*Decided:* ${new Date(request.decidedAt).toLocaleString('vi-VN')}` : '')
          );
        } catch {}
      }
      return;
    }

    // Success — update the inline keyboard message
    const request = hitlManager.getQueue().get(requestId);
    if (request && ctx.callbackQuery?.message) {
      const verb = action === 'approve' ? 'phê duyệt' : 'từ chối';
      try {
        await ctx.editMessageText(
          `*HITL Approval*\n` +
          `━━━━━━━━━━━━━\n` +
          `🆔 \`${requestId}\`\n` +
          `*Action:* \`${request.action.name}\`\n` +
          `*Description:* ${request.action.description}\n` +
          `*Status:* ✅ **${action.toUpperCase()}**\n` +
          `*By:* ${displayName}\n` +
          `*Created:* ${new Date(request.createdAt).toLocaleString('vi-VN')}\n` +
          `*Decided:* ${new Date(request.decidedAt!).toLocaleString('vi-VN')}`
        );
      } catch {}

      await ctx.answerCallbackQuery({
        text: `✅ Đã ${verb} — \`${request.action.name}\``,
      });
    }
  });
}

function getStatusEmoji(status: string): string {
  switch (status) {
    case 'pending': return '⏳';
    case 'approved': return '✅';
    case 'rejected': return '❌';
    case 'expired': return '⏰';
    default: return '❓';
  }
}

/**
 * Build inline keyboard markup for an approval request.
 */
export function buildApprovalKeyboard(requestId: string): Record<string, any> {
  return {
    inline_keyboard: [
      [
        {
          text: '✅ Approve',
          callback_data: `hitl:approve:${requestId}`,
        },
        {
          text: '❌ Reject',
          callback_data: `hitl:reject:${requestId}`,
        },
      ],
      [
        {
          text: '🔍 View Request',
          callback_data: `hitl:view:${requestId}`,
        },
      ],
    ],
  };
}

/**
 * Format an approval request as a Telegram message.
 */
export function formatApprovalMessage(request: ApprovalRequest): string {
  return (
    `*⛔ HITL Approval Required*\n` +
    `━━━━━━━━━━━━━\n` +
    `*Action:* \`${request.action.name}\`\n` +
    `*Description:* ${request.action.description}\n` +
    `*Type:* ${request.action.type}\n` +
    `*User:* ${request.userDisplay ?? request.userId}\n` +
    `*Created:* ${new Date(request.createdAt).toLocaleString('vi-VN')}\n` +
    `*Expires:* ${new Date(request.expiresAt).toLocaleString('vi-VN')}\n` +
    `━━━━━━━━━━━━━\n` +
    `Choose *Approve* to allow or *Reject* to block:`
  );
}
