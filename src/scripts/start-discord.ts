/**
 * @file start-discord — Startup script
 * @layer scripts
 * @depends-on src/core/index.ts, src/modules/discord/index.ts
 * @owner infrastructure
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import { execSync } from 'child_process';
import { DiscordBridge } from '../modules/discord/index.js';
import Engine from '../core/engine/engine.js';
import { KatoGateway } from '../core/gateway/index.js';

// ── Timestamp Helper ──
const ts = () => {
  const d = new Date();
  return `[${d.toISOString().split('T')[1].slice(0,12)}]`;
};

// ── Single-Instance Lock ──
const PID_FILE = path.join(os.tmpdir(), 'kato-discord.pid');

function checkPidLock(): void {
  // Cleanup stale PID file on startup
  try {
    if (fs.existsSync(PID_FILE)) {
      const oldPid = parseInt(fs.readFileSync(PID_FILE, 'utf8').trim(), 10);
      try {
        process.kill(oldPid, 0);
        // Process alive — kill it and wait for full disconnect
        console.log(`${ts()} ⚠️ Stale process ${oldPid} still running. Killing...`);
        process.kill(oldPid, 'SIGTERM');
        // Wait up to 3s for process to die and Discord gateway to disconnect
        const deadline = Date.now() + 3000;
        while (Date.now() < deadline) {
          try {
            process.kill(oldPid, 0);
            // Still alive, wait 200ms
            const start = Date.now();
            while (Date.now() - start < 200) { /* busy wait */ }
          } catch {
            // Process dead
            console.log(`${ts()} ✅ Killed stale process ${oldPid}`);
            break;
          }
        }
      } catch {
        // Stale PID file, no process
        console.log(`♻️ Stale lock (PID ${oldPid}). Cleaning...`);
      }
      // Remove stale PID file
      try { fs.unlinkSync(PID_FILE); } catch {}
    }
  } catch {
    // Ignore cleanup errors
  }

  // Small delay to let Discord gateway fully disconnect
  const delayStart = Date.now();
  while (Date.now() - delayStart < 1000) { /* busy wait 1s */ }

  // Acquire lock
  try {
    const fd = fs.openSync(PID_FILE, 'wx');
    fs.writeSync(fd, String(process.pid));
    fs.closeSync(fd);
    console.log(`${ts()} 🔒 PID lock acquired: ${process.pid}`);
  } catch {
    // File exists — another instance grabbed it between cleanup and now
    try {
      const oldPid = parseInt(fs.readFileSync(PID_FILE, 'utf8').trim(), 10);
      process.kill(oldPid, 0);
      console.log(`⚠️ Another instance running (PID ${oldPid}). Exiting.`);
      process.exit(0);
    } catch {
      // File exists but process dead — shouldn't happen after cleanup
      console.log(`♻️ Corrupt lock. Replacing...`);
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

  // Crash cleanup
  process.on('uncaughtException', () => {
    cleanup();
    process.exit(1);
  });
  process.on('unhandledRejection', () => {
    cleanup();
    process.exit(1);
  });
}

async function start() {
  checkPidLock();

  console.log(`${ts()} 🚀 Starting Kato Discord Bot...`);
  const engine = new Engine();
  await engine.init();

  const gateway = new KatoGateway(engine);
  const bridge = new DiscordBridge(gateway);
  await bridge.start();
}

start().catch(err => {
  console.error("❌ Failed to start Discord bridge:", err);
  // Ensure PID cleanup on startup failure
  try { fs.unlinkSync(PID_FILE); } catch {}
  process.exit(1);
});
