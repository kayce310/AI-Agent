/**
 * @file Kato Discord Bridge — Message adapter between Discord and Core Engine
 * @layer modules
 * @depends-on src/core/engine/engine.ts, src/core/types.ts
 * @imported-by src/scripts/start-discord.ts
 * @owner discord-module
 */

/**
 * Kato Discord Bridge Module (Adapter)
 * Framework 6 Layers — Lớp Giao diện (Adapter)
 *
 * Chỉ làm 2 việc:
 * 1. Hứng tin nhắn từ Discord
 * 2. Ném vào Core Engine → Nhận kết quả và trả về
 *
 * KHÔNG chứa logic LLM, KHÔNG chứa tool calling.
 */

import { Client, GatewayIntentBits, Message } from 'discord.js';
import Engine from '../../core/engine/engine.js';
import { EngineRequest } from '../../core/types.js';
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import os from 'os';

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
          console.log(`ℹ️ Expired lock removed for message ${messageId}`);
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
    // Lock file already exists — another instance is processing or recently processed this message
    return false;
  }
}

function releaseMessageLock(messageId: string): void {
  try {
    const lockFile = path.join(MSG_LOCK_DIR, `${messageId}.lock`);
    if (fs.existsSync(lockFile)) {
      fs.unlinkSync(lockFile);
      console.log(`🔓 Lock released for message ${messageId}`);
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

export class DiscordBridge {
  private client: Client;
  private gateway: any;
  private currentModel: string = '';
  private processingMessages: Set<string> = new Set(); // in-memory dedup guard

  constructor(gateway: any) {
    cleanupOldLocks(); // cleanup stale lock files on startup

    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
      ]
    });

    this.gateway = gateway;
    // this.currentModel = this.engine.detectFreeModel(); // TODO: Gateway model detection
    console.log(`🎯 Gateway initialized`);
    this.registerEventHandlers();
    // this.registerEngineHandlers(); // TODO: Gateway event handlers
  }

  private statusMessage: Map<string, Message> = new Map(); // channelId -> message

  private registerEngineHandlers(): void {
    this.engine.on('cascade', async (event: any) => {
      const msg = this.statusMessage.get(event.sessionId);
      if (!msg) return;

      try {
        if (event.type === 'trying') {
          await msg.edit(`⏳ [Cascade] Đang thử model: \`${event.modelId}\` (Tier ${event.tier})...`);
        } else if (event.type === 'failed') {
          console.log(`❌ Cascade failure for ${event.modelId}: ${event.errorMessage}`);
        }
      } catch (err) {
        // Ignore edit errors (rate limits, etc)
      }
    });
  }

  private registerEventHandlers(): void {
    this.client.once('clientReady', () => {
      console.log(`✅ Kato Discord Bot đã sẵn sàng`);
    });

    this.client.on('messageCreate', async (message: Message) => {
      if (message.author.bot) return;

      // Xử lý lệnh chuyển model
      if (message.content.toLowerCase().startsWith('/switch model:')) {
        const modelId = message.content.split(':')[1]?.trim();
        if (modelId) {
          this.currentModel = modelId;
          await message.reply(`✅ Đã chuyển sang model: \`${modelId}\``);
          console.log(`🔄 Discord: switched model to ${modelId}`);
        }
        return;
      }

      // Xử lý lệnh liệt kê model
      if (message.content.toLowerCase() === '/list models') {
        const models = this.engine.listModels().join('\n- ');
        await message.reply(`📋 **Models available:**\n- ${models}`);
        return;
      }

      // Phản hồi khi được tag hoặc nhắc tên (chỉ 1 trigger/1 message)
      const isMentioned = message.mentions.has(this.client.user!);
      const hasKatoKeyword = !isMentioned && message.content.toLowerCase().includes('kato');
      if (isMentioned || hasKatoKeyword) {
        if (this.processingMessages.has(message.id)) {
          console.log(`⚠️ Duplicate event for message ${message.id}, skipping`);
          return;
        }

        if (!tryAcquireMessageLock(message.id)) {
          console.log(`⚠️ Cross-instance duplicate for message ${message.id}, skipping`);
          return;
        }

        this.processingMessages.add(message.id);
        const channelId = message.channelId;

        try {
          console.log(`✅ Discord -> Engine: forwarding message (id: ${message.id})`);

          // await this.engine.saveMessage(channelId, {
          //   role: 'user',
          //   content: message.content,
          //   timestamp: Date.now()
          // });

          // const history = await this.engine.getHistory(channelId);

          const request = {
            input: message.content,
            userId: message.author.id,
            sessionId: channelId,
            platform: 'discord' as const,
          };

          const initialMsg = await message.reply(`⏳ Đang xử lý...`);
          this.statusMessage.set(channelId, initialMsg);

          const response = await this.gateway.process(request);

          // await this.engine.saveMessage(channelId, {
          //   role: 'assistant',
          //   content: response.output,
          //   timestamp: Date.now()
          // });

          let editSucceeded = false;
          try {
            await initialMsg.edit(response.output);
            editSucceeded = true;
          } catch (editErr) {
            console.warn(`⚠️ Failed to edit message: ${(editErr as Error).message}`);
            try {
              await initialMsg.delete();
            } catch {
              // ignore delete failures
            }
            try {
              await message.reply(response.output);
              editSucceeded = true;
            } catch (replyErr) {
              console.error(`❌ Failed to send response: ${(replyErr as Error).message}`);
            }
          }

          if (editSucceeded) {
            console.log(`✅ Discord <- Gateway: response sent`);
          }
        } catch (err: any) {
          console.error(`❌ Discord processing failed for message ${message.id}:`, err.message);
        } finally {
          this.statusMessage.delete(channelId);
          this.processingMessages.delete(message.id);
          releaseMessageLock(message.id);
        }
      }
    });
  }

  public async start(): Promise<void> {
    const token = process.env.DISCORD_TOKEN;

    if (!token) {
      throw new Error('DISCORD_TOKEN không được tìm thấy trong file .env');
    }

    // ── Double-check PID lock before connecting to Discord ──
    const PID_FILE = path.join(os.tmpdir(), 'kato-discord.pid');
    if (fs.existsSync(PID_FILE)) {
      try {
        const pid = parseInt(fs.readFileSync(PID_FILE, 'utf8').trim(), 10);
        if (pid !== process.pid) {
          try {
            process.kill(pid, 0);
            // Another alive process holds the lock
            console.error(`⚠️ Another Kato instance (PID ${pid}) already running. Exiting.`);
            process.exit(0);
          } catch {
            // Stale lock, replace it
            fs.writeFileSync(PID_FILE, String(process.pid), 'utf8');
          }
        }
      } catch {
        // Can't read PID file, proceed cautiously
      }
    }

    await this.client.login(token);
  }
}

export default DiscordBridge;
