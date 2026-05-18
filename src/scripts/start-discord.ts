import fs from 'fs';
import path from 'path';
import os from 'os';
import { execSync } from 'child_process';
import { DiscordBridge } from '../modules/discord/index.js';
import Engine from '../core/engine/engine.js';

// ── Single-Instance Lock ──
// PID file để đảm bảo chỉ 1 instance Kato Discord Bot chạy
const PID_FILE = path.join(os.tmpdir(), 'kato-discord.pid');

function checkPidLock(): void {
  // Atomic lock: only one process can create the file at a time
  try {
    const fd = fs.openSync(PID_FILE, 'wx');
    fs.writeSync(fd, String(process.pid));
    fs.closeSync(fd);
    console.log(`🔒 PID lock acquired: ${process.pid}`);
  } catch {
    // File already exists — another instance is running or crashed
    try {
      const oldPid = parseInt(fs.readFileSync(PID_FILE, 'utf8').trim(), 10);
      // Check if process actually exists
      try {
        process.kill(oldPid, 0);
        // Process alive → exit gracefully (double-click guard)
        console.log(`⚠️ Another instance running (PID ${oldPid}). Exiting.`);
        process.exit(0);
      } catch {
        // Stale PID file — overwrite it
        console.log(`♻️ Stale lock (PID ${oldPid}). Replacing...`);
        fs.writeFileSync(PID_FILE, String(process.pid), 'utf8');
        console.log(`🔒 PID lock acquired: ${process.pid}`);
      }
    } catch {
      // Can't read PID file — overwrite
      fs.writeFileSync(PID_FILE, String(process.pid), 'utf8');
      console.log(`🔒 PID lock acquired: ${process.pid}`);
    }
  }

  // Cleanup on exit
  const cleanup = () => {
    try { fs.unlinkSync(PID_FILE); } catch {}
  };
  process.on('exit', cleanup);
  process.on('SIGINT', () => { cleanup(); process.exit(0); });
  process.on('SIGTERM', () => { cleanup(); process.exit(0); });
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
