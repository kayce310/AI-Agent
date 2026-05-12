/**
 * Kato Agent Main Entry Point
 * Framework 6 Layers — Kiến trúc Module hóa
 * 
 * Adapter (Discord/CLI/Telegram) + Core Engine + Provider Registry
 */

import Engine from './core/engine.js';
import DiscordBridge from './modules/discord/index.js';

console.log(`🚀 Kato Agent System v5.0 starting...`);

async function main() {
  try {
    // 1. Khởi tạo Core Engine (platform-agnostic)
    const engine = new Engine();
    await engine.init();

    // 2. Khởi tạo Discord Adapter (platform-specific)
    const discord = new DiscordBridge(engine);
    await discord.start();

    console.log(`✅ All modules initialized successfully`);
    console.log(`📋 Models available: ${engine['registry'].listModels().length}`);
  } catch (error) {
    console.error(`❌ Failed to start Kato Agent:`, error);
    process.exit(1);
  }
}

main();