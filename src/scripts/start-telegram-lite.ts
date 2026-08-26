/**
 * @file start-telegram-lite — Lightweight startup (skip DB init)
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { fileURLToPath } from 'url';
import { execSync, spawn } from 'child_process';
import { TelegramBridge } from '../modules/telegram/index.js';
import Engine from '../core/engine/engine.js';
import { CoralGateway } from '../core/gateway/index.js';
import { DashboardServer } from '../core/events/http-server.js';
import { installCrashHandler } from '../core/crash-handler.js'; // R2 §A

const ts = () => {
  const d = new Date();
  return `[${d.toISOString().split('T')[1].slice(0,12)}]`;
};

const LOCK_FILE = path.join(os.tmpdir(), 'coral-telegram.lock');

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

function isProcessAlive(pid: number): boolean {
  try {
    if (process.platform === 'win32') {
      execSync(`tasklist /FI "PID eq ${pid}" /NH`, { stdio: 'pipe', timeout: 3000 });
      return true;
    } else {
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
        if (isProcessAlive(oldPid)) {
          console.log(`${ts()} 🔴 Found old Coral instance (PID ${oldPid}). Killing...`);
          const killed = killProcess(oldPid);
          if (killed) {
            console.log(`${ts()} ✅ Killed old instance (PID ${oldPid})`);
          }
          try { execSync('sleep 1', { timeout: 2000 }); } catch {}
        }
      }

      try { fs.unlinkSync(LOCK_FILE); } catch {}
    }
  } catch { }

  try {
    fs.writeFileSync(LOCK_FILE, String(process.pid), { flag: 'wx' });
    console.log(`${ts()} 🔒 Lock acquired (PID ${process.pid})`);
    return true;
  } catch {
    console.error(`${ts()} ❌ Cannot acquire lock`);
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

async function gracefulShutdown(signal: string) {
  if (isShuttingDown) return;
  isShuttingDown = true;

  console.log(`${ts()} ⚡ ${signal} received — graceful shutdown starting...`);

  const forceExit = setTimeout(() => {
    console.error(`${ts()} ⏰ Shutdown timeout — forcing exit`);
    process.exit(1);
  }, 30000);
  forceExit.unref();

  try {
    if (gatewayInstance) {
      console.log(`${ts()} 📴 Stopping gateway...`);
      await gatewayInstance.stopAll().catch(e => console.error(`Gateway stop error: ${e}`));
    }

    if (engineInstance) {
      console.log(`${ts()} 💾 Flushing memory...`);
      await engineInstance.cleanup().catch(e => console.error(`Memory cleanup error: ${e}`));
    }

    if (dashboardServer) {
      console.log(`${ts()} 📊 Stopping dashboard server...`);
      await dashboardServer.stop().catch(e => console.error(`Dashboard stop error: ${e}`));
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
  if (!acquireFileLock()) {
    console.error(`${ts()} ❌ Another Coral instance is still running.`);
    process.exit(1);
  }

  process.on('exit', releaseFileLock);
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

  console.log(`${ts()} 🚀 Starting Coral Telegram Bot (Lite)...`);
  
  try {
    const engine = new Engine();
    console.log(`${ts()} ⏳ Initializing engine (with timeout)...`);
    
    // Timeout engine.init() after 20 seconds
    const initPromise = engine.init();
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Engine init timeout')), 20000)
    );
    
    try {
      await Promise.race([initPromise, timeoutPromise]);
      console.log(`${ts()} ✅ Engine initialized`);
    } catch (err) {
      console.warn(`${ts()} ⚠️ Engine init timeout/error: ${err} — continuing with limited features`);
    }
    
    engineInstance = engine;

    const gateway = new CoralGateway(engine);
    gatewayInstance = gateway;
    const bridge = new TelegramBridge();

    gateway.register(bridge);
    bridge.initializeMessageHandlerWrapper(engine);

    await gateway.startAdapter('telegram');
    console.log(`${ts()} ✅ Gateway running with ${gateway.adapterCount} adapter(s): ${gateway.registeredPlatforms.join(', ')}`);

    // Start Dashboard (lightweight)
    try {
      const eventBus = engine.getEventBus();
      if (eventBus) {
        dashboardServer = new DashboardServer(eventBus, { port: 8766 });
        await dashboardServer.start();
        console.log(`${ts()} 📊 Dashboard server running on port 8766`);
      }
    } catch (e) {
      console.warn(`${ts()} ⚠️ Dashboard failed: ${e}`);
    }

    console.log(`${ts()} 🌊 Coral Telegram Bridge ready!`);
  } catch (err) {
    console.error("❌ Failed to start:", err);
    process.exit(1);
  }
}

start().catch(err => {
  console.error("❌ Fatal error:", err);
  process.exit(1);
});
