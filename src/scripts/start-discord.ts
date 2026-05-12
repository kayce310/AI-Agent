import fs from 'fs';
import path from 'path';
import os from 'os';
import { execSync } from 'child_process';
import { DiscordBridge } from '../modules/discord/index.js';
import Engine from '../core/engine.js';

// ── Single-Instance Lock ──
// PID file để đảm bảo chỉ 1 instance Kato Discord Bot chạy
const PID_FILE = path.join(os.tmpdir(), 'kato-discord.pid');

function checkPidLock(): void {
  if (fs.existsSync(PID_FILE)) {
    const oldPid = parseInt(fs.readFileSync(PID_FILE, 'utf8').trim(), 10);
    if (!isNaN(oldPid)) {
      try {
        // Windows: taskkill ngay lập tức (SIGTERM không hoạt động tốt trên Windows)
        console.log(`🔄 Kill instance cũ (PID ${oldPid})`);
        execSync(`taskkill /F /PID ${oldPid} 2>nul || true`, { stdio: 'ignore', timeout: 5000 });
      } catch {
        // Process không còn tồn tại, bỏ qua
      }
    }
  }

  fs.writeFileSync(PID_FILE, String(process.pid), 'utf8');
  console.log(`🔒 PID lock acquired: ${process.pid}`);

  // Xoá PID file khi process tắt
  process.on('exit', () => {
    try { fs.unlinkSync(PID_FILE); } catch {}
  });
  process.on('SIGINT', () => {
    try { fs.unlinkSync(PID_FILE); } catch {}
    process.exit(0);
  });
  process.on('SIGTERM', () => {
    try { fs.unlinkSync(PID_FILE); } catch {}
    process.exit(0);
  });
}

async function start() {
  // Lock instance trước
  checkPidLock();

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
