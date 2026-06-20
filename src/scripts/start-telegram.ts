/**
 * @file start-telegram — Startup script for Telegram bot
 * @layer scripts
 * @depends-on src/modules/telegram/index.ts, src/core/engine/engine.ts, src/core/gateway/index.ts
 * @owner infrastructure
 *
 * v2.0 — Auto-kill old instances before starting
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { execSync } from 'child_process';
import { TelegramBridge } from '../modules/telegram/index.js';
import Engine from '../core/engine/engine.js';
import { CoralGateway } from '../core/gateway/index.js';
import { DashboardServer } from '../core/events/http-server.js';

// ── Timestamp Helper ──
const ts = () => {
  const d = new Date();
  return `[${d.toISOString().split('T')[1].slice(0,12)}]`;
};

// ── Single-Instance Lock via File ──
const LOCK_FILE = path.join(os.tmpdir(), 'coral-telegram.lock');

/**
 * Kill a process by PID. Works on both Windows and Unix.
 */
function killProcess(pid: number): boolean {
  try {
    const isWin = process.platform === 'win32';
    if (isWin) {
      execSync(`taskkill /F /PID ${pid}`, { stdio: 'pipe', timeout: 5000 });
    } else {
      execSync(`kill -9 ${pid}`, { stdio: 'pipe', timeout: 5000 });
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if a PID is still alive.
 */
function isProcessAlive(pid: number): boolean {
  try {
    if (process.platform === 'win32') {
      execSync(`tasklist /FI "PID eq ${pid}" /NH`, { stdio: 'pipe', timeout: 3000 });
      return true;
    } else {
      // Unix: kill -0 sends no signal but checks existence
      execSync(`kill -0 ${pid}`, { stdio: 'pipe', timeout: 3000 });
      return true;
    }
  } catch {
    return false;
  }
}

function acquireFileLock(): boolean {
  try {
    if (fs.existsSync(LOCK_FILE)) {
      const pidStr = fs.readFileSync(LOCK_FILE, 'utf8').trim();
      const oldPid = parseInt(pidStr, 10);

      if (!isNaN(oldPid) && oldPid > 0 && oldPid !== process.pid) {
        // Check if old process is still alive
        if (isProcessAlive(oldPid)) {
          console.log(`${ts()} 🔴 Found old Coral instance (PID ${oldPid}). Killing...`);
          const killed = killProcess(oldPid);
          if (killed) {
            console.log(`${ts()} ✅ Killed old instance (PID ${oldPid})`);
          } else {
            console.warn(`${ts()} ⚠️ Could not kill PID ${oldPid} — trying to force-start anyway`);
          }
          // Wait briefly for cleanup
          try { execSync('sleep 1', { timeout: 2000 }); } catch {}
        } else {
          console.log(`${ts()} 🗑️ Stale lock (PID ${oldPid} no longer running)`);
        }
      }

      // Remove old lock
      try { fs.unlinkSync(LOCK_FILE); } catch {}
    }
  } catch { /* proceed to acquire */ }

  try {
    fs.writeFileSync(LOCK_FILE, String(process.pid), { flag: 'wx' });
    console.log(`${ts()} 🔒 Lock acquired (PID ${process.pid})`);
    return true;
  } catch {
    console.error(`${ts()} ❌ Cannot acquire lock — another instance started simultaneously`);
    return false;
  }
}

function releaseFileLock(): void {
  try {
    if (fs.existsSync(LOCK_FILE)) {
      const pid = fs.readFileSync(LOCK_FILE, 'utf8').trim();
      if (pid === String(process.pid)) {
        fs.unlinkSync(LOCK_FILE);
        console.log(`${ts()} 🔓 Lock released`);
      }
    }
  } catch {}
}

let engineInstance: Engine | null = null;
let gatewayInstance: CoralGateway | null = null;
let dashboardServer: DashboardServer | null = null;
let isShuttingDown = false;

const SHUTDOWN_TIMEOUT_MS = 30_000;

async function gracefulShutdown(signal: string) {
  if (isShuttingDown) return;
  isShuttingDown = true;

  console.log(`${ts()} ⚡ ${signal} received — graceful shutdown starting...`);

  // Force exit after timeout
  const forceExit = setTimeout(() => {
    console.error(`${ts()} ⏰ Shutdown timeout — forcing exit`);
    process.exit(1);
  }, SHUTDOWN_TIMEOUT_MS);
  forceExit.unref();

  try {
    // 1. Stop gateway (stop accepting new messages)
    if (gatewayInstance) {
      console.log(`${ts()} 📴 Stopping gateway...`);
      await gatewayInstance.stopAll().catch(e => console.error(`Gateway stop error: ${e}`));
    }

    // 2. Flush memory
    if (engineInstance) {
      console.log(`${ts()} 💾 Flushing memory...`);
      await engineInstance.cleanup().catch(e => console.error(`Memory cleanup error: ${e}`));
    }

    console.log(`${ts()} ✅ Graceful shutdown complete`);
  } catch (err) {
    console.error(`${ts()} ❌ Error during shutdown: ${err}`);
  } finally {
    releaseFileLock();
    process.exit(0);
  }
}

async function start() {
  // Acquire file lock — auto-kills old instance if needed
  if (!acquireFileLock()) {
    console.error(`${ts()} ❌ Another Coral instance is still running. Exiting.`);
    process.exit(1);
  }

  // Register graceful shutdown handlers
  process.on('exit', releaseFileLock);
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

  console.log(`${ts()} 🚀 Starting Coral Telegram Bot...`);
  const engine = new Engine();
  await engine.init();
  engineInstance = engine;

  const gateway = new CoralGateway(engine);
  gatewayInstance = gateway;
  const bridge = new TelegramBridge();

  // Register adapter → wires message handler
  gateway.register(bridge);

  // Start adapter (connects to Telegram)
  await gateway.startAdapter('telegram');

  console.log(`${ts()} ✅ Gateway running with ${gateway.adapterCount} adapter(s): ${gateway.registeredPlatforms.join(', ')}`);
}

start().catch(err => {
  console.error("❌ Failed to start Telegram bridge:", err);
  process.exit(1);
});
