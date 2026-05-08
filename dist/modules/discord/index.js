/**
 * Kato Discord Bridge Module
 * Framework 6 Layers Claude Code - Module độc lập
 */
import { Client, GatewayIntentBits } from 'discord.js';
import LLMCore from '../../core/llm.js';
import MemoryCore from '../../core/memory.js';
import 'dotenv/config';
export class DiscordBridge {
    client;
    llm;
    memory;
    constructor() {
        this.client = new Client({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.MessageContent,
            ]
        });
        this.llm = new LLMCore();
        this.memory = new MemoryCore();
        this.registerEventHandlers();
    }
    registerEventHandlers() {
        this.client.on('ready', () => {
            console.log(`✅ Kato Discord Bot đã sẵn sàng`);
        });
        this.client.on('messageCreate', async (message) => {
            console.log(`📩 Received message: ${message.content} from ${message.author.tag}`);
            if (message.author.bot) {
                console.log(`⚠️ Ignoring bot message`);
                return;
            }
            // Phản hồi cả khi viết chữ Kato hoặc khi tag mention @Kato
            if (message.content.toLowerCase().includes('kato') ||
                message.mentions.has(this.client.user)) {
                console.log(`✅ Matched keyword or mention, forwarding to LLM...`);
                const channelId = message.channelId;
                // Thêm tin nhắn người dùng vào bộ nhớ đa lớp
                await this.memory.addMessage(channelId, {
                    role: 'user',
                    content: message.content,
                    timestamp: Date.now()
                });
                // Lấy toàn bộ lịch sử từ MemoryCore
                const history = await this.memory.getChannelHistory(channelId);
                // Gửi toàn bộ lịch sử vào Lõi LLM
                const response = await this.llm.chatCompletion(history, {
                    agentName: 'Kato',
                    protocol: 'Discord',
                    mentionPrefix: '@Kato'
                });
                // Lưu phản hồi của Agent vào bộ nhớ đa lớp
                await this.memory.addMessage(channelId, {
                    role: 'assistant',
                    content: response,
                    timestamp: Date.now()
                });
                // Trả về cho người dùng
                message.reply(response);
            }
        });
    }
    async start() {
        const token = process.env.DISCORD_TOKEN;
        if (!token) {
            throw new Error('DISCORD_TOKEN không được tìm thấy trong file .env');
        }
        await this.client.login(token);
    }
}
export default DiscordBridge;
//# sourceMappingURL=index.js.map