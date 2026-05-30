/**
 * @file Kato Discord Bridge — PlatformAdapter for Discord
 * @layer modules
 * @depends-on src/core/engine/engine.ts, src/core/gateway/types.ts
 * @imported-by src/scripts/start-discord.ts
 * @owner discord-module
 *
 * Implements the PlatformAdapter interface for Discord.
 * Uses discord.js SDK for platform communication.
 *
 * Inspired by Hermes Agent gateway/platforms/ pattern:
 * - Converts Discord messages → AdapterMessage (normalized)
 * - Registered with Gateway via register(adapter)
 * - Gateway handles engine processing, adapter handles UI
 */

import { Client, GatewayIntentBits, Message, ChannelType } from 'discord.js';
import { PlatformAdapter, AdapterMessage, AdapterStatus } from '../../core/gateway/types.js';
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';

// ── Resolve repo root independent of process.cwd() ──
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '../../..'); // from src/modules/discord/ up to repo root

const ts = () => {
  const d = new Date();
  return `[${d.toISOString().split('T')[1].slice(0,12)}]`;
};

// ── Discord Runtime Logger ──

const LOG_DIR = path.join(REPO_ROOT, 'logs');

function ensureLogDir(): void {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
}

function getLogFileName(): string {
  const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  return `discord-${date}.log`;
}

function logDiscordMessage(
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
  } catch (err) {
    // Silent fail — logging should never break message processing
  }
}

// Cross-instance dedup: lock file per message ID in temp dir
const MSG_LOCK_DIR = path.join(os.tmpdir(), 'kato-msg-locks');
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
          console.log(`${ts()} ℹ️ Expired lock removed for message ${messageId}`);
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
      console.log(`${ts()} 🔓 Lock released for message ${messageId}`);
    }
  } catch {}
}

// Cleanup old lock files on startup (files older than 5 minutes)
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

export class DiscordBridge implements PlatformAdapter {
  public readonly platform = 'discord';
  public status: AdapterStatus = 'stopped';

  private client: Client;
  private messageHandler: ((msg: AdapterMessage) => Promise<any>) | null = null;
  private processingMessages: Set<string> = new Set();
  private statusMessage: Map<string, Message> = new Map();

  constructor() {
    cleanupOldLocks();

    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
      ]
    });

    this.registerEventHandlers();
  }

  // ──────────────────────────────────────────────
  // PlatformAdapter Implementation
  // ──────────────────────────────────────────────

  /**
   * Register the message handler (called by Gateway.register()).
   * The handler receives normalized AdapterMessage and returns KatoResponse.
   */
  onMessage(handler: (msg: AdapterMessage) => Promise<any>): void {
    this.messageHandler = handler;
  }

  /**
   * Start the Discord client.
   */
  async start(): Promise<void> {
    if (this.status === 'running') return;

    this.status = 'starting';
    const token = process.env.DISCORD_BOT_TOKEN;

    if (!token) {
      this.status = 'error';
      throw new Error('DISCORD_BOT_TOKEN không được tìm thấy trong file .env');
    }

    // ── PID lock check (already handled by start-discord.ts — this is a secondary guard) ──
    const PID_FILE = path.join(os.tmpdir(), 'kato-discord.pid');
    if (fs.existsSync(PID_FILE)) {
      try {
        const pid = parseInt(fs.readFileSync(PID_FILE, 'utf8').trim(), 10);
        if (pid !== process.pid) {
          const isWin = process.platform === 'win32';
          let alive = false;
          try {
            if (isWin) {
              require('child_process').execSync(`tasklist /FI "PID eq ${pid}" 2>nul | findstr /B "${pid}"`, { stdio: 'pipe' });
              alive = true;
            } else {
              process.kill(pid, 0);
              alive = true;
            }
          } catch {}
          if (alive) {
            console.error(`${ts()} ⚠️ Another Kato instance (PID ${pid}) already running. Exiting.`);
            process.exit(0);
          } else {
            // Stale lock — replace
            fs.writeFileSync(PID_FILE, String(process.pid), 'utf8');
          }
        }
      } catch {
        // Corrupt lock — replace
        fs.writeFileSync(PID_FILE, String(process.pid), 'utf8');
      }
    }

    await this.client.login(token);
    this.status = 'running';
    console.log(`${ts()} ✅ Kato Discord Bot đã sẵn sàng (platform: ${this.platform})`);
  }

  /**
   * Stop the Discord client and cleanup.
   */
  async stop(): Promise<void> {
    if (this.status === 'stopped') return;

    this.status = 'stopping';
    try {
      this.client.destroy();
      console.log(`${ts()} 🔌 Discord client destroyed`);
    } catch (err: any) {
      console.warn(`${ts()} ⚠️ Discord stop warning: ${err.message}`);
    }

    // Cleanup PID file
    try {
      const PID_FILE = path.join(os.tmpdir(), 'kato-discord.pid');
      if (fs.existsSync(PID_FILE)) fs.unlinkSync(PID_FILE);
    } catch {}

    this.processingMessages.clear();
    this.statusMessage.clear();
    this.status = 'stopped';
    console.log(`${ts()} ✅ Discord adapter stopped`);
  }

  /**
   * Send a text message to a Discord channel.
   * @returns The Discord message ID if sent successfully, null otherwise.
   */
  async sendMessage(channelId: string, content: string): Promise<string | null> {
    try {
      const channel = await this.client.channels.fetch(channelId);
      if (!channel || !channel.isTextBased()) {
        console.warn(`${ts()} ⚠️ Discord: cannot send to channel ${channelId} — not a text channel`);
        return null;
      }
      const sent = await (channel as any).send(content);
      return sent.id;
    } catch (err: any) {
      console.error(`${ts()} ❌ Discord sendMessage failed: ${err.message}`);
      return null;
    }
  }

  // ──────────────────────────────────────────────
  // Internal Event Handlers
  // ──────────────────────────────────────────────

  private registerEventHandlers(): void {
    this.client.once('clientReady', () => {
      console.log(`${ts()} ✅ Kato Discord Bot is ready`);
    });

    this.client.on('messageCreate', async (message: Message) => {
      if (message.author.bot) return;

      // ── Bot Commands (bypass Engine) ──
      if (message.content.toLowerCase().startsWith('/switch model:')) {
        // Model switching is handled at the gateway level
        await message.reply(`ℹ️ Model switching is managed by the gateway.`);
        return;
      }

      if (message.content.toLowerCase() === '/list models') {
        // Model listing is handled at the gateway level
        await message.reply(`ℹ️ Model listing is available through the gateway.`);
        return;
      }

      // ── Mention/Keyword Check ──
      const isMentioned = message.mentions.has(this.client.user!);
      const hasKatoKeyword = !isMentioned && message.content.toLowerCase().includes('kato');
      if (!isMentioned && !hasKatoKeyword) return;

      // ── Dedup ──
      if (this.processingMessages.has(message.id)) {
        console.log(`${ts()} ⚠️ Duplicate event for message ${message.id}, skipping`);
        return;
      }

      if (!tryAcquireMessageLock(message.id)) {
        console.log(`${ts()} ⚠️ Cross-instance duplicate for message ${message.id}, skipping`);
        return;
      }

      this.processingMessages.add(message.id);

      try {
        console.log(`${ts()} ✅ Discord -> Gateway: forwarding message (id: ${message.id})`);

        // Convert to AdapterMessage
        const adapterMsg: AdapterMessage = {
          messageId: message.id,
          userId: message.author.id,
          channelId: message.channelId,
          text: message.content,
          platform: 'discord',
          isMention: isMentioned,
          timestamp: Date.now(),
        };

        // Send an initial "processing" message
        const initialMsg = await message.reply(`⏳ Đang xử lý...`);
        this.statusMessage.set(message.channelId, initialMsg);

        // Forward to the handler (wired by Gateway.register)
        if (this.messageHandler) {
          const response = await this.messageHandler(adapterMsg);

          // Log channel messages only (skip DMs for privacy)
          if (message.channel.type !== ChannelType.DM) {
            logDiscordMessage(
              message.author.id,
              message.content,
              response?.output || null,
              response?.usage?.inputTokens,
              response?.usage?.outputTokens
            );
          }

          if (response && response.output) {
            // Edit initial message with the response
            let editSucceeded = false;
            try {
              await initialMsg.edit(response.output);
              editSucceeded = true;
            } catch (editErr) {
              console.warn(`⚠️ Failed to edit message: ${editErr instanceof Error ? editErr.message : String(editErr)}`);
              try {
                await initialMsg.delete();
              } catch {}
              try {
                await message.reply(response.output);
                editSucceeded = true;
              } catch (replyErr) {
                console.error(`❌ Failed to send response: ${replyErr instanceof Error ? replyErr.message : String(replyErr)}`);
              }
            }

            if (editSucceeded) {
              console.log(`${ts()} ✅ Discord <- Gateway: response sent`);
            }
          } else {
            // No response — update the initial message
            try {
              await initialMsg.edit(`❌ Không thể xử lý tin nhắn.`);
            } catch {}
          }
        }
      } catch (err: any) {
        console.error(`${ts()} ❌ Discord processing failed for message ${message.id}:`, err instanceof Error ? err.message : String(err));
      } finally {
        this.statusMessage.delete(message.channelId);
        this.processingMessages.delete(message.id);
        releaseMessageLock(message.id);
      }
    });
  }
}

export default DiscordBridge;
