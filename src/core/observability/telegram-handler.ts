/**
 * @file telegram-handler — Telegram Bot Alert Handler
 * @layer core
 * @depends-on observability/alerting
 * @owner core-observability
 *
 * Sends formatted alerts to a Telegram chat via Bot API.
 * Registers as a handler on AlertingSystem via addHandler().
 *
 * Environment variables:
 *   CORAL_ALERT_BOT_TOKEN — Telegram bot token (required to send)
 *   CORAL_ALERT_CHAT_ID   — Target chat ID (required to send)
 *   CORAL_ALERT_MIN_LEVEL — Minimum alert level (default: 'warn')
 *
 * Features:
 *   - Rich formatted messages with emoji, timestamps, details
 *   - Per-type cooldown to prevent spam
 *   - Graceful degradation when env vars missing
 *   - No external deps — uses native fetch (Node 18+)
 */

import { Logger } from '../logger.js';

const log = new Logger({ module: 'TelegramHandler' });

// ── Types ──

export interface TelegramHandlerConfig {
  botToken?: string;
  chatId?: string;
  /** Per-type cooldown in ms (default: 5 minutes) */
  cooldownMs?: number;
  /** Parse mode for Telegram (default: 'HTML') */
  parseMode?: 'HTML' | 'Markdown';
  /** Disable for testing (log instead of sending) */
  dryRun?: boolean;
}

// ── Level emoji mapping ──

const LEVEL_EMOJI: Record<string, string> = {
  info: 'ℹ️',
  warn: '⚠️',
  error: '🚨',
  critical: '🔥',
};

// ── Telegram Handler ──

export class TelegramHandler {
  private botToken: string | undefined;
  private chatId: string | undefined;
  private cooldownMs: number;
  private parseMode: 'HTML' | 'Markdown';
  private dryRun: boolean;
  private lastSent: Map<string, number> = new Map();

  constructor(config: TelegramHandlerConfig = {}) {
    this.botToken = config.botToken || process.env.CORAL_ALERT_BOT_TOKEN;
    this.chatId = config.chatId || process.env.CORAL_ALERT_CHAT_ID;
    this.cooldownMs = config.cooldownMs ?? 300_000; // 5 minutes
    this.parseMode = config.parseMode ?? 'HTML';
    this.dryRun = config.dryRun ?? false;
  }

  /**
   * Returns true if this handler is ready to send
   */
  isReady(): boolean {
    return !!(this.botToken && this.chatId);
  }

  /**
   * Register this handler on an AlertingSystem instance
   */
  register(alertingSystem: any): void {
    if (!this.isReady()) {
      log.warn('Telegram handler NOT registered — missing BOT_TOKEN or CHAT_ID');
      return;
    }

    alertingSystem.addHandler((alert: any) => {
      this.sendAlert(alert);
    });

    log.info(`Telegram handler registered (chat: ${this.chatId})`);
  }

  /**
   * Format and send an alert to Telegram
   */
  async sendAlert(alert: any): Promise<void> {
    // Cooldown check
    const cooldownKey = `${alert.type}:${alert.userId || 'global'}`;
    const lastTime = this.lastSent.get(cooldownKey) || 0;
    if (Date.now() - lastTime < this.cooldownMs) {
      log.debug(`Alert suppressed (cooldown): ${alert.type}`);
      return;
    }
    this.lastSent.set(cooldownKey, Date.now());

    // Format message
    const text = this.formatMessage(alert);

    if (this.dryRun) {
      log.info(`[DRY RUN] Would send Telegram alert:\n${text}`);
      return;
    }

    // Send via Telegram Bot API
    try {
      const url = `https://api.telegram.org/bot${this.botToken}/sendMessage`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: this.chatId,
          text,
          parse_mode: this.parseMode,
          disable_web_page_preview: true,
        }),
      });

      if (!response.ok) {
        const errBody = await response.text();
        log.error(`Telegram API error ${response.status}: ${errBody}`);
      } else {
        log.debug(`Telegram alert sent: ${alert.type}`);
      }
    } catch (err: any) {
      log.error(`Failed to send Telegram alert: ${err.message}`);
    }
  }

  /**
   * Format alert as Telegram HTML message
   */
  private formatMessage(alert: any): string {
    const emoji = LEVEL_EMOJI[alert.level] || '📋';
    const level = (alert.level || 'info').toUpperCase();
    const timestamp = new Date(alert.timestamp || Date.now())
      .toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });

    let text = `${emoji} [${level}] <b>${escapeHtml(alert.type)}</b>\n`;
    text += `${'━'.repeat(24)}\n`;
    text += `🕐 ${timestamp}\n`;

    if (alert.sessionId) {
      text += `📎 Session: <code>${escapeHtml(alert.sessionId.slice(0, 16))}</code>\n`;
    }
    if (alert.userId) {
      text += `👤 User: ${escapeHtml(alert.userId)}\n`;
    }

    text += `\n💬 ${escapeHtml(alert.message)}\n`;

    // Details section
    if (alert.details && typeof alert.details === 'object') {
      const detailLines = Object.entries(alert.details)
        .filter(([k]) => k !== 'source') // Skip internal fields
        .slice(0, 5) // Limit to 5 details
        .map(([k, v]) => `• <b>${escapeHtml(k)}:</b> ${escapeHtml(String(v).slice(0, 100))}`)
        .join('\n');

      if (detailLines) {
        text += `\n📋 Chi tiết:\n${detailLines}`;
      }
    }

    return text;
  }
}

// ── HTML escape helper ──

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── Factory ──

let telegramHandlerInstance: TelegramHandler | null = null;

export function getTelegramHandler(config?: TelegramHandlerConfig): TelegramHandler {
  if (!telegramHandlerInstance) {
    telegramHandlerInstance = new TelegramHandler(config);
  }
  return telegramHandlerInstance;
}

export default TelegramHandler;
