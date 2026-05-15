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
import Engine from '../../core/engine.js';
import { EngineRequest } from '../../core/types.js';
import 'dotenv/config';

export class DiscordBridge {
  private client: Client;
  private engine: Engine;
  private currentModel: string = '';
  private processingMessages: Set<string> = new Set(); // messageId dedup guard

  constructor(engine?: Engine) {
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
      ]
    });

    this.engine = engine ?? new Engine();
    this.currentModel = this.engine.detectFreeModel();
    console.log(`🎯 Default model (auto-detected): ${this.currentModel}`);
    this.registerEventHandlers();
    this.registerEngineHandlers();
  }

  private statusMessage: Map<string, Message> = new Map(); // channelId -> message

  private registerEngineHandlers(): void {
    this.engine.on('cascade', async (event) => {
      const msg = this.statusMessage.get(event.sessionId);
      if (!msg) return;

      try {
        if (event.type === 'trying') {
          await msg.edit(`⏳ [Cascade] Đang thử model: \`${event.modelId}\` (Tier ${event.tier})...`);
        } else if (event.type === 'failed') {
          // Optional: log failure to UI if needed, but usually we just wait for the next 'trying'
          console.log(`❌ Cascade failure for ${event.modelId}: ${event.errorMessage}`);
        }
      } catch (err) {
        // Ignore edit errors (rate limits, etc)
      }
    });
  }

  private registerEventHandlers(): void {
    // NOTE: 'ready' đã deprecated trong discord.js v14, dùng 'clientReady' thay thế
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
        // Dedup guard: chống multiple instance hoặc rapid-fire duplicate events
        if (this.processingMessages.has(message.id)) {
          console.log(`⚠️ Duplicate event for message ${message.id}, skipping`);
          return;
        }
        this.processingMessages.add(message.id);

        console.log(`✅ Discord -> Engine: forwarding message (id: ${message.id})`);

        const channelId = message.channelId;

        // Lưu tin nhắn user
        await this.engine.saveMessage(channelId, {
          role: 'user',
          content: message.content,
          timestamp: Date.now()
        });

        // Lấy history
        const history = await this.engine.getHistory(channelId);

        // Tạo request chuẩn hóa
        const request: EngineRequest = {
          sessionId: channelId,
          messages: history,
          modelId: this.currentModel,
          agentName: 'Kato',
          protocol: 'Discord',
          mentionPrefix: '@Kato',
        };

        // Send initial "processing" message
        const initialMsg = await message.reply(`⏳ Đang xử lý...`);
        this.statusMessage.set(channelId, initialMsg);

        // Gọi Engine (platform-agnostic) với cascade
        const response = await this.engine.process(request);

        // Lưu response
        await this.engine.saveMessage(channelId, {
          role: 'assistant',
          content: response.content,
          timestamp: Date.now()
        });

        // Edit final response — trust engine output, no hardcode regex
        try {
          await initialMsg.edit(response.content);
        } catch {}

        // Cleanup status tracking
        this.statusMessage.delete(channelId);
        this.processingMessages.delete(message.id); // cleanup dedup guard
        console.log(`✅ Discord <- Engine: response sent (model: ${response.modelUsed})`);
      }
    });
  }

  public async start(): Promise<void> {
    const token = process.env.DISCORD_TOKEN;

    if (!token) {
      throw new Error('DISCORD_TOKEN không được tìm thấy trong file .env');
    }

    await this.client.login(token);
  }
}

export default DiscordBridge;
