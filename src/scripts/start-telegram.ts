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
import { fileURLToPath } from 'url';
import { execSync, spawn } from 'child_process';
import { TelegramBridge } from '../modules/telegram/index.js';
import Engine from '../core/engine/engine.js';
import { CoralGateway } from '../core/gateway/index.js';
import { DashboardServer } from '../core/events/http-server.js';
import { MemoryStore } from '../core/memory/MemoryStore.js';
import { MemoryAPI } from '../core/memory/MemoryAPI.js';
import { MemoryExtractor } from '../core/memory/MemoryExtractor.js';
import { CronScheduler, SystemMonitor } from '../core/cron/index.js';
import type { AlertCallback } from '../core/cron/index.js';
import { proactiveEngine } from '../core/proactive/proactive-engine.js';
import { worldModel } from '../core/world/model.js';

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
let memoryStore: MemoryStore | null = null;
let cronScheduler: CronScheduler | null = null;
let isShuttingDown = false;
let tunnelProcess: ReturnType<typeof spawn> | null = null;

// ── Cloudflared Tunnel (quick tunnel, auto-save URL) ──
function startTunnel(): void {
  const cloudflaredPath = process.env.CLOUDFLARED_PATH
    || (process.platform === 'win32' ? 'C:\\Users\\Kayce\\bin\\cloudflared.exe' : 'cloudflared');

  if (!fs.existsSync(cloudflaredPath)) {
    console.warn(`${ts()} ⚠️ cloudflared not found at ${cloudflaredPath}`);
    return;
  }

  const proc = spawn(cloudflaredPath, ['tunnel', '--url', 'http://localhost:8766'], {
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  });
  tunnelProcess = proc;

  const onData = (data: Buffer) => {
    const text = data.toString();
    const match = text.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);
    if (match) {
      const url = match[0];
      console.log(`${ts()} 🌐 Tunnel URL: ${url}`);

      // Save to project root (ESM-compatible path)
      const dirname = path.dirname(fileURLToPath(import.meta.url));
      const urlPath = path.resolve(dirname, '../../tunnel-url.txt');
      try {
        fs.writeFileSync(urlPath, url, 'utf8');
      } catch {}
      // ponytail: expose so /status and /dashboard commands can show it
      (globalThis as any).__coral_tunnelUrl = url;
    }
  };

  if (proc.stdout) proc.stdout.on('data', onData);
  if (proc.stderr) proc.stderr.on('data', onData);

  proc.on('error', (err) => {
    console.warn(`${ts()} ⚠️ Tunnel spawn error: ${err.message}`);
    tunnelProcess = null;
  });

  proc.on('exit', (code) => {
    if (code !== 0 && code !== null) {
      console.warn(`${ts()} ⚠️ Tunnel exited with code ${code}`);
    }
    tunnelProcess = null;
  });
}

function stopTunnel(): void {
  if (tunnelProcess) {
    try {
      const isWin = process.platform === 'win32';
      if (isWin) {
        execSync(`taskkill /F /PID ${tunnelProcess.pid}`, { stdio: 'pipe', timeout: 3000 });
      } else {
        tunnelProcess.kill('SIGTERM');
      }
    } catch {}
    tunnelProcess = null;
  }
}

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

    // 2. Stop cloudflared tunnel
    if (tunnelProcess) {
      console.log(`${ts()} 🌐 Stopping tunnel...`);
      stopTunnel();
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

    // 5. Shutdown memory store (flush to disk)
    if (memoryStore) {
      console.log(`${ts()} 💾 Saving memory store...`);
      memoryStore.shutdown();
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

  // ponytail: wire World Model to EventBus for delta events
  worldModel.setEventBus(engine.getEventBus());

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
      // Initialize Memory System
      const ms = new MemoryStore();
      memoryStore = ms; // Save for shutdown
      const memoryApi = new MemoryAPI(ms);
      const memoryExtractor = new MemoryExtractor(ms, eventBus);
      memoryExtractor.start();

      // Extract from existing history
      const recentEvents = eventBus.getRecent(200);
      const extracted = memoryExtractor.extractFromHistory(recentEvents);
      if (extracted.extracted > 0 || extracted.beliefs > 0) {
        console.log(`${ts()} 🧠 Memory extraction: ${extracted.extracted} new, ${extracted.reinforced} reinforced, ${extracted.beliefs} beliefs`);
      }

      // Expose on globalThis so /dashboard command can start them later
      (globalThis as any).__coral_eventBus = eventBus;
      (globalThis as any).__coral_memoryApi = memoryApi;
      // ponytail: expose tunnel start/stop so /dashboard command can control them
      (globalThis as any).__coral_startTunnel = startTunnel;
      (globalThis as any).__coral_stopTunnel = stopTunnel;
      console.log(`${ts()} 🧠 Memory system ready (dashboard off — use /dashboard to start)`);
    }
  } catch (e) {
    console.error(`${ts()} ⚠️ Dashboard server failed to start: ${e}`);
  }

  // ── Phase 4: Cron Scheduler + System Monitor ──
  try {
    const monitor = new SystemMonitor();
    const alertCallback: AlertCallback = async (msg) => {
      const adminChatId = process.env.TELEGRAM_ALERT_CHAT_ID;
      if (adminChatId) {
        try {
          await bridge.sendMessage(adminChatId, `⚠️ ${msg}`);
        } catch (e) {
          console.error(`${ts()} ❌ Alert delivery failed:`, e);
        }
      }
    };
    cronScheduler = new CronScheduler(alertCallback);

    // ponytail: expose scheduler via globalThis for /world command
    (globalThis as any).__coral_cronScheduler = cronScheduler;

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
    // NOTE: Uses engine.flush() NOT engine.cleanup() — cleanup closes the
    // SQLite database permanently, causing "database connection is not open"
    // errors on all subsequent requests.
    cronScheduler.register({
      name: 'memory-flush',
      intervalMs: 60 * 60 * 1000,
      timeoutMs: 60000, // 1 min max
      handler: async () => {
        try {
          await engine.flush();
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
      running: true,  // ponytail: cron tick every 30min, disable if no proactive engine
      });

      // Job: Proactive tick — evaluate time-based rules every 30 min
    const proactiveChatId = process.env.TELEGRAM_PROACTIVE_CHAT_ID || process.env.TELEGRAM_ALERT_CHAT_ID;
    if (proactiveChatId) {
      cronScheduler.register({
        name: 'proactive-tick',
        intervalMs: 30 * 60 * 1000,
        timeoutMs: 15000,
        handler: async () => {
          const signals = proactiveEngine.generateTimeSignals();
          const actions = proactiveEngine.evaluate(signals, 'system');
          for (const action of actions) {
            if (action.type === 'suggest' || action.type === 'notify' || action.type === 'remind') {
              try {
                await bridge.sendMessage(proactiveChatId, action.message);
              } catch (e) {
                return `⚠️ Proactive delivery failed: ${e}`;
              }
            }
          }
          return actions.length > 0
            ? `💡 Proactive: ${actions.length} action(s) fired`
            : null;
        },
        running: true,
      });
      console.log(`${ts()} ⏰ Proactive tick registered (30 min interval -> ${proactiveChatId})`);
    } else {
      console.warn(`${ts()} ⏸️ Proactive tick disabled — set TELEGRAM_PROACTIVE_CHAT_ID or TELEGRAM_ALERT_CHAT_ID`);
    }

    // ponytail: World Model probes every 30s — toggleable via /world command, disabled by default
    cronScheduler.register({
      name: 'world-model',
      intervalMs: 30_000,
      timeoutMs: 5000,
      handler: async () => {
        const report = await worldModel.run();
        console.log(`${ts()} 🌍 World: ${report.system.cpus}cpu ${report.system.freeMemMb}mb free | ${report.files.fileCount} files`);
        return null; // quiet
      },
      enabled: false, // toggle via /world on/off
    });

    // ponytail: Daily digest — extract knowledge to Obsidian every 24h
    const vaultPath = process.env.OBSIDIAN_VAULT_PATH || process.env.KNOWLEDGE_VAULT_PATH;
    const digestChannelId = process.env.KNOWLEDGE_CHANNEL_ID;
    if (vaultPath && digestChannelId) {
      cronScheduler.register({
        name: 'daily-digest',
        intervalMs: 24 * 60 * 60 * 1000,
        timeoutMs: 60000,
        handler: async () => {
          const { dailyDigest } = await import('../core/knowledge/daily-digest.js');
          return await dailyDigest(engine.getMemoryFacade(), vaultPath, digestChannelId);
        },
        enabled: true,
      });
    }

    cronScheduler.start();
    console.log(`${ts()} ⏰ Cron scheduler started with ${cronScheduler.listJobs().length} jobs`);
  } catch (e) {
    console.error(`${ts()} ⚠️ Cron scheduler failed to start: ${e}`);
  }

  // ── Phase 5: HITL Approval System ──
  try {
    const { HITLManager } = await import('../core/security/hitl.js');
    const { formatApprovalMessage, buildApprovalKeyboard } = await import('../modules/telegram/hitl-handler.js');
    const hitlManager = new HITLManager();
    bridge.registerHITLManager(hitlManager);

    // Wire HITL pending notification to admin chat
    const hitlAdminChatId = process.env.TELEGRAM_ALERT_CHAT_ID;
    if (hitlAdminChatId) {
      hitlManager.onPending = async (request) => {
        try {
          await bridge.sendMessageWithKeyboard(
            hitlAdminChatId as string,
            formatApprovalMessage(request),
            buildApprovalKeyboard(request.id),
          );
        } catch (e) {
          console.error(`${ts()} ❌ HITL notification failed:`, e);
        }
      };
      console.log(`${ts()} 🛡️ HITL Manager active — admin chat: ${hitlAdminChatId}`);
    } else {
      console.warn(`${ts()} ⚠️ TELEGRAM_ALERT_CHAT_ID not set — HITL approvals will not be delivered`);
    }
  } catch (e) {
    console.error(`${ts()} ⚠️ HITL system failed to initialize: ${e}`);
  }
}

start().catch(err => {
  console.error("❌ Failed to start Telegram bridge:", err);
  process.exit(1);
});
