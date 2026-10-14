/**
 * @file HITL Telegram Handler — Inline keyboard for approve/reject
 * @layer modules
 *
 * Handles callback_query:data with 'hitl:' prefix:
 *   hitl:approve:<token8>:<requestId>
 *   hitl:reject:<token8>:<requestId>
 */

import type { Bot, Context } from 'grammy';
import type { ApprovalRequest, HITLManager } from '../../core/security/hitl.js';

export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Handle a single HITL callback query.
 * Returns true if handled, false if not a HITL callback.
 */
export async function handleHITLCallback(
  ctx: Context,
  hitlManager: HITLManager,
): Promise<boolean> {
  const data = ctx.callbackQuery?.data;
  if (!data || !data.startsWith('hitl:')) {
    return false;
  }

  const parts = data.split(':');
  if (parts.length < 3) {
    await Promise.resolve(ctx.answerCallbackQuery({ text: '❌ Invalid request format' })).catch(() => {});
    return true;
  }

  const action = parts[1];  // 'approve' | 'reject'
  let token: string | undefined;
  let requestId: string;

  // Detect token in format: hitl:<action>:<token8>:<requestId> vs legacy hitl:<action>:<requestId>
  if (parts[2] !== 'hitl' && parts.length >= 4) {
    token = parts[2];
    requestId = parts.slice(3).join(':');
  } else {
    requestId = parts.slice(2).join(':');
  }

  const fromUser = ctx.callbackQuery?.from;
  const decidedBy = String(fromUser?.id || 'unknown');
  const username = fromUser?.username;
  const displayName = username
    ? `@${username}`
    : fromUser?.first_name || decidedBy;

  // Security Containment: Only authorized admin can decide HITL requests
  const { userManager } = await import('./user-manager.js');
  if (!userManager.isAdmin(decidedBy, username)) {
    await Promise.resolve(ctx.answerCallbackQuery({
      text: '⛔ Bạn không có quyền phê duyệt thao tác này! (Chỉ dành cho Admin)',
      show_alert: true,
    })).catch(() => {});
    return true;
  }

  // Resolve the request with correlation token verification
  let success: boolean;
  if (action === 'approve') {
    success = hitlManager.resolve(requestId, 'approved', decidedBy, {
      approverRole: 'admin',
      channel: 'telegram',
      correlationToken: token,
    });
  } else if (action === 'reject') {
    success = hitlManager.resolve(requestId, 'rejected', decidedBy, {
      approverRole: 'admin',
      channel: 'telegram',
      correlationToken: token,
    });
  } else {
    await Promise.resolve(ctx.answerCallbackQuery({ text: '❌ Unknown action' })).catch(() => {});
    return true;
  }

  if (!success) {
    await Promise.resolve(ctx.answerCallbackQuery({
      text: '⚠️ Yêu cầu đã được quyết định, đã hết hạn hoặc token không hợp lệ.',
      show_alert: true,
    })).catch(() => {});

    // Safely disable buttons so user cannot keep clicking
    try {
      await ctx.editMessageReplyMarkup({ reply_markup: { inline_keyboard: [] } });
    } catch {}
    return true;
  }

  // Success — update the message and remove buttons
  const request = hitlManager.getQueue().get(requestId);
  const verb = action === 'approve' ? 'phê duyệt' : 'từ chối';
  const statusIcon = action === 'approve' ? '✅' : '❌';

  // User experience: Delete the approval prompt message upon decision
  // so it doesn't push the main thinking/streaming response out of view.
  try {
    await ctx.deleteMessage();
  } catch {
    // Fallback: strip inline keyboard if deletion is not permitted
    try {
      await ctx.editMessageReplyMarkup({ reply_markup: { inline_keyboard: [] } });
    } catch {}
  }

  const actionName = request?.action?.name || 'thao tác';
  await Promise.resolve(ctx.answerCallbackQuery({
    text: `${statusIcon} Đã ${verb}: ${actionName}`,
  })).catch(() => {});
  return true;
}

/**
 * Wire HITL callback handler to a grammy Bot instance.
 * Registers 'hitl:' prefix handling for inline keyboard callbacks.
 */
export function registerHITLCallbackHandler(
  bot: Bot,
  hitlManager: HITLManager,
  _botUsername?: string,
): void {
  bot.on('callback_query:data', async (ctx: Context, next?: () => Promise<void>) => {
    const handled = await handleHITLCallback(ctx, hitlManager);
    if (!handled) {
      return await next?.(); // not ours, let downstream middleware process
    }
  });
}

/**
 * Build inline keyboard markup for an approval request.
 * Contains exactly 2 buttons: Approve and Reject.
 */
export function buildApprovalKeyboard(requestId: string, correlationToken?: string): Record<string, any> {
  const token = correlationToken ? correlationToken.slice(0, 8) : '';
  const approveData = token ? `hitl:approve:${token}:${requestId}` : `hitl:approve:${requestId}`;
  const rejectData = token ? `hitl:reject:${token}:${requestId}` : `hitl:reject:${requestId}`;

  return {
    inline_keyboard: [
      [
        {
          text: '✅ Approve',
          callback_data: approveData,
        },
        {
          text: '❌ Reject',
          callback_data: rejectData,
        },
      ],
    ],
  };
}

/**
 * Format an approval request as a Telegram HTML message.
 */
export function formatApprovalMessage(request: ApprovalRequest): string {
  const toolName = escapeHtml(request.action.name);
  const type = escapeHtml(request.action.type);
  const desc = escapeHtml(request.action.description || 'Không có mô tả');
  const user = escapeHtml(request.userDisplay ?? request.userId ?? 'unknown');
  const trigger = request.triggerReason ? escapeHtml(request.triggerReason) : undefined;
  const expiresAt = new Date(request.expiresAt);
  const expiresStr = `${expiresAt.toLocaleTimeString('vi-VN')} (${expiresAt.toLocaleDateString('vi-VN')})`;

  let text = `<b>⛔ YÊU CẦU PHÊ DUYỆT (HITL)</b>\n`;
  text += `━━━━━━━━━━━━━━━━━━━━━\n`;
  text += `🔧 <b>Hành động:</b> <code>${toolName}</code>\n`;
  text += `📋 <b>Loại:</b> ${type}\n`;
  text += `📝 <b>Mô tả:</b> ${desc}\n`;
  if (trigger) {
    text += `⚠️ <b>Lý do:</b> ${trigger}\n`;
  }
  text += `👤 <b>Người yêu cầu:</b> ${user}\n`;
  text += `🆔 <b>Request ID:</b> <code>${escapeHtml(request.id)}</code>\n`;
  text += `⏰ <b>Hết hạn:</b> ${expiresStr}\n`;
  text += `━━━━━━━━━━━━━━━━━━━━━\n`;
  text += `Vui lòng chọn <b>Approve</b> để duyệt hoặc <b>Reject</b> để từ chối:`;
  return text;
}
