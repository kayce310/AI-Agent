/**
 * @file start-discord — Startup script
 * @layer scripts
 * @depends-on src/core/index.ts, src/modules/discord/index.ts
 * @owner infrastructure
 */

import net from 'net';
import { DiscordBridge } from '../modules/discord/index.js';
import Engine from '../core/engine/engine.js';
import { KatoGateway } from '../core/gateway/index.js';

// ── Timestamp Helper ──
const ts = () => {
  const d = new Date();
  return `[${d.toISOString().split('T')[1].slice(0,12)}]`;
};

// ── Single-Instance Lock via Port Binding ──
// Port binding is atomic on all OS — no race condition like PID files.
const LOCK_PORT = 47832;

function acquirePortLock(): Promise<net.Server> {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`${ts()} ⚠️ Another Kato instance is already running (port ${LOCK_PORT} in use). Exiting.`);
        process.exit(0);
      } else {
        reject(err);
      }
    });
    server.listen(LOCK_PORT, '127.0.0.1', () => {
      console.log(`${ts()} 🔒 Instance lock acquired (port ${LOCK_PORT})`);
      resolve(server);
    });
  });
}

async function start() {
  // Acquire port lock before anything else
  const lockServer = await acquirePortLock();

  console.log(`${ts()} 🚀 Starting Kato Discord Bot...`);
  const engine = new Engine();
  await engine.init();

  const gateway = new KatoGateway(engine);
  const bridge = new DiscordBridge();

  // Register adapter → wires message handler
  gateway.register(bridge);

  // Start adapter (connects to Discord)
  await gateway.startAdapter('discord');

  console.log(`${ts()} ✅ Gateway running with ${gateway.adapterCount} adapter(s): ${gateway.registeredPlatforms.join(', ')}`);

  // Keep lock server alive for the lifetime of the process
  process.on('exit', () => { try { lockServer.close(); } catch {} });
  process.on('SIGINT', () => { try { lockServer.close(); } catch {}; process.exit(0); });
  process.on('SIGTERM', () => { try { lockServer.close(); } catch {}; process.exit(0); });
}

start().catch(err => {
  console.error("❌ Failed to start Discord bridge:", err);
  process.exit(1);
});
