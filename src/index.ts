/**
 * @file index — Entry point
 * @layer core
 * @depends-on (all core modules)
 * @imported-by (none — top-level)
 * @owner core
 */

/**
 * Kato Agent Main Entry Point
 * Framework 6 Layers — Kiến trúc Module hóa
 * 
 * Adapter (Discord/CLI/Telegram) + Core Engine + Provider Registry
 */

import Engine from './core/engine/engine.js';
import { KatoGateway } from './core/gateway/index.js';
import DiscordBridge from './modules/discord/index.js';

console.log(`🚀 Kato Agent System v5.0 starting...`);

async function main() {
  try {
    // 1. Khởi tạo Core Engine (platform-agnostic)
    const engine = new Engine();
    await engine.init();

    // 2. Khởi tạo Gateway Layer
    const gateway = new KatoGateway(engine);

    // 3. Khởi tạo Discord Adapter (platform-specific)
    const discord = new DiscordBridge();
    gateway.register(discord);

    // 4. Start all adapters
    const { success, failed } = await gateway.startAll();
    console.log(`✅ Platform adapters started: ${success.join(', ') || '(none)'}`);
    if (failed.length > 0) {
      console.warn(`⚠️ Failed adapters: ${failed.map(f => `${f.platform}: ${f.error}`).join('; ')}`);
    }

    console.log(`✅ All modules initialized successfully`);
    console.log(`📋 Models available: ${engine['registry'].listModels().length}`);
  } catch (error) {
    console.error(`❌ Failed to start Kato Agent:`, error);
    process.exit(1);
  }
}

main();