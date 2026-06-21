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
import { CronScheduler, SystemMonitor } from '../core/cron/index.js';

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
let cronScheduler: CronScheduler | null = null;
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

    // 3. Stop cron scheduler
    if (cronScheduler) {
      console.log(`${ts()} ⏰ Stopping cron scheduler...`);
      cronScheduler.stop();
    }

    // 4. Flush memory
    if (engineInstance) {
      console.log(`${ts()} 💾 Flushing memory...`);
      await engineInstance.cleanup().catch(e => console.error(`Memory cleanup error: ${e}`));
    }

    // 3. Stop dashboard server
    if (dashboardServer) {
      console.log(`${ts()} 📊 Stopping dashboard server...`);
      await dashboardServer.stop().catch(e => console.error(`Dashboard server error: ${e}`));
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

  // Initialize message handler wrapper with streaming support (Phase 2)
  bridge.initializeMessageHandlerWrapper(engine);

  // Start adapter (connects to Telegram)
  await gateway.startAdapter('telegram');

  console.log(`${ts()} ✅ Gateway running with ${gateway.adapterCount} adapter(s): ${gateway.registeredPlatforms.join(', ')}`);

  // Start Dashboard HTTP/WS server
  try {
    const eventBus = engine.getEventBus();
    if (eventBus) {
      dashboardServer = new DashboardServer(eventBus, { port: 8766 });
      await dashboardServer.start();
      console.log(`${ts()} 📊 Dashboard server running on port 8766`);
    }
  } catch (e) {
    console.error(`${ts()} ⚠️ Dashboard server failed to start: ${e}`);
  }

  // ── Phase 4: Cron Scheduler + System Monitor ──
  try {
    const monitor = new SystemMonitor();
    cronScheduler = new CronScheduler();

    // Job: Health check every 6 hours (21600000ms)
    cronScheduler.register({
      name: 'health-check',
      intervalMs: 6 * 60 * 60 * 1000,
      timeoutMs: 30000, // 30s max
      handler: async () => {
        const report = await monitor.runHealthCheck();
        return report; // null if healthy, string if alert needed
      },
      running: false,
    });

    // Job: Memory flush every hour (3600000ms)
    cronScheduler.register({
      name: 'memory-flush',
      intervalMs: 60 * 60 * 1000,
      timeoutMs: 60000, // 1 min max
      handler: async () => {
        try {
          await engine.cleanup();
          return null; // no notification needed
        } catch (err: any) {
          return `⚠️ Memory flush failed: ${err.message}`;
        }
      },
      running: false,
    });

    // Job: MemoryStore cleanup every 30 min — evict expired blocks
    cronScheduler.register({
      name: 'memory-cleanup',
      intervalMs: 30 * 60 * 1000,
      timeoutMs: 30000,
      handler: async () => {
        try {
          const { globalMemoryStore } = await import('../core/memory/memory-store.js');
          const removed = await globalMemoryStore.cleanupExpired();
          if (removed > 0) {
            return `🧹 MemoryStore cleanup: ${removed} expired blocks evicted`;
          }
          return null; // quiet if nothing removed
        } catch (err: any) {
          return `⚠️ Memory cleanup failed: ${err.message}`;
        }
      },
      running: false,
    });

    cronScheduler.start();
    console.log(`${ts()} ⏰ Cron scheduler started with ${cronScheduler.listJobs().length} jobs`);
  } catch (e) {
    console.error(`${ts()} ⚠️ Cron scheduler failed to start: ${e}`);
  }
}

start().catch(err => {
  console.error("❌ Failed to start Telegram bridge:", err);
  process.exit(1);
});
