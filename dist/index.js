/**
 * Kato Agent Main Entry Point
 * Framework 6 Layers Claude Code
 */
import DiscordBridge from './modules/discord/index.js';
console.log(`🚀 Kato Agent System starting...`);
const discord = new DiscordBridge();
// Khởi động các module
async function main() {
    try {
        await discord.start();
        console.log(`✅ All modules initialized successfully`);
    }
    catch (error) {
        console.error(`❌ Failed to start Kato Agent:`, error);
        process.exit(1);
    }
}
main();
//# sourceMappingURL=index.js.map