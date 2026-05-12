import { DiscordBridge } from '../modules/discord/index.js';
import Engine from '../core/engine.js';

async function start() {
  console.log("🚀 Starting Kato Discord Bot...");
  const engine = new Engine();
  await engine.init();
  
  const bridge = new DiscordBridge(engine);
  await bridge.start();
}

start().catch(err => {
  console.error("❌ Failed to start Discord bridge:", err);
  process.exit(1);
});