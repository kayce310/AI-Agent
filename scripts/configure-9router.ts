#!/usr/bin/env ts-node
/**
 * @file Configure 9Router External Connection
 * @layer scripts
 * @depends-on config/providers.json, .env
 * @imported-by npm run config:9router
 * @owner infrastructure
 *
 * Auto-discovers 9Router external runtime, validates config,
 * writes connection env vars, and verifies handshake.
 *
 * Usage: npx tsx scripts/configure-9router.ts [path-to-9router]
 *   Default path: e:/Test/9router-runtime
 */

import * as fs from 'fs';
import * as path from 'path';
import * as http from 'http';

const DEFAULT_9ROUTER_PATH = 'e:/Test/9router-runtime';
const DEFAULT_9ROUTER_PORT = 20128;
const DEFAULT_9ROUTER_API_BASE = `http://127.0.0.1:${DEFAULT_9ROUTER_PORT}`;

// ── Task 1: Discovery ──
function discover9Router(externalPath: string): { valid: boolean; configPath: string | null; port: number } {
  console.log(`\n🔍 [Discovery] Scanning: ${externalPath}`);

  if (!fs.existsSync(externalPath)) {
    console.error(`❌ [Discovery] Path not found: ${externalPath}`);
    return { valid: false, configPath: null, port: 0 };
  }

  // Check for config files
  const envExample = path.join(externalPath, '.env.example');
  const envFile = path.join(externalPath, '.env');
  const packageJson = path.join(externalPath, 'package.json');

  const configExists = fs.existsSync(envExample) || fs.existsSync(envFile);
  const packageExists = fs.existsSync(packageJson);

  if (!configExists && !packageExists) {
    console.error(`❌ [Discovery] No config files found in ${externalPath}`);
    return { valid: false, configPath: null, port: 0 };
  }

  // Read port from .env or .env.example
  let port = DEFAULT_9ROUTER_PORT;
  for (const cfg of [envFile, envExample]) {
    if (fs.existsSync(cfg)) {
      const content = fs.readFileSync(cfg, 'utf8');
      const portMatch = content.match(/^PORT\s*=\s*(\d+)/m);
      if (portMatch) {
        port = parseInt(portMatch[1], 10);
        console.log(`✅ [Discovery] Port detected: ${port}`);
        break;
      }
    }
  }

  console.log(`✅ [Discovery] 9Router runtime found at ${externalPath}`);
  return { valid: true, configPath: envFile, port };
}

// ── Task 2: API Base URL Injection ──
function writeEnvConfig(port: number): void {
  console.log(`\n🔧 [Config] Writing 9Router connection to .env`);

  const envPath = path.join(process.cwd(), '.env');
  const apiBase = `http://127.0.0.1:${port}`;
  const externalPath = DEFAULT_9ROUTER_PATH;

  let envContent = '';
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf8');
  }

  // Update or add NINE_ROUTER variables
  const lines = envContent.split('\n');
  const newVars: Record<string, string> = {
    NINE_ROUTER_EXTERNAL_PATH: externalPath,
    NINE_ROUTER_API_BASE: `${apiBase}/v1`,
    NINE_ROUTER_PORT: String(port),
  };

  for (const [key, value] of Object.entries(newVars)) {
    const idx = lines.findIndex(l => l.startsWith(`${key}=`));
    if (idx >= 0) {
      lines[idx] = `${key}=${value}`;
    } else {
      lines.push(`${key}=${value}`);
    }
  }

  fs.writeFileSync(envPath, lines.join('\n'), 'utf8');
  console.log(`✅ [Config] .env updated:`);
  console.log(`   NINE_ROUTER_EXTERNAL_PATH=${externalPath}`);
  console.log(`   NINE_ROUTER_API_BASE=${apiBase}/v1`);
  console.log(`   NINE_ROUTER_PORT=${port}`);
}

// ── Task 3: State Synchronization ──
function updateSystemState(): void {
  console.log(`\n📝 [State] Updating system-state.md`);

  const statePath = path.join(process.cwd(), 'knowledge/system-state.md');
  if (!fs.existsSync(statePath)) {
    console.warn('⚠️ [State] system-state.md not found, skipping');
    return;
  }

  let content = fs.readFileSync(statePath, 'utf8');

  // Update 9router status in module matrix
  const oldLine = '| 9router |';
  const newLine = '| 9router (external) | e:/Test/9router-runtime | 🟢 ACTIVE (EXTERNAL_LINKED) | 2026-05-20 | External service, port 20128 |';
  if (content.includes(oldLine)) {
    content = content.replace(oldLine, newLine);
  }

  // Add changelog entry
  const changelogMarker = '| 2026-05-20 | gov-phase-6 |';
  const newChangelog = '| 2026-05-20 | gov-phase-7 | Operation External Boundary: Wired 9router as external service, created configure-9router.ts |';
  if (content.includes(changelogMarker)) {
    content = content.replace(changelogMarker, `${newChangelog}\n${changelogMarker}`);
  }

  fs.writeFileSync(statePath, content, 'utf8');
  console.log('✅ [State] system-state.md updated: 9router → ACTIVE (EXTERNAL_LINKED)');
}

// ── Task 4: Handshake Verification ──
function verifyHandshake(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    console.log(`\n🤝 [Handshake] Pinging 9Router at 127.0.0.1:${port}...`);

    const req = http.get(`http://127.0.0.1:${port}/api/health`, { timeout: 5000 }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 400) {
          console.log(`✅ [Handshake] 9Router responded: HTTP ${res.statusCode}`);
          resolve(true);
        } else {
          console.warn(`⚠️ [Handshake] Unexpected response: HTTP ${res.statusCode}`);
          resolve(false);
        }
      });
    });

    req.on('error', (err) => {
      console.warn(`⚠️ [Handshake] Connection failed: ${err.message}`);
      console.log('   Note: 9Router may not be running. Start it manually at e:/Test/9router-runtime');
      resolve(false);
    });

    req.on('timeout', () => {
      req.destroy();
      console.warn('⚠️ [Handshake] Timeout — 9Router may not be running');
      resolve(false);
    });
  });
}

// ── Main ──
async function main() {
  console.log('🏗️  9Router External Configuration Wiring');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const externalPath = process.argv[2] || DEFAULT_9ROUTER_PATH;

  // Task 1: Discovery
  const discovery = discover9Router(externalPath);
  if (!discovery.valid) {
    console.error('\n❌ ABORT: 9Router runtime not found');
    process.exit(1);
  }

  // Task 2: Write env config
  writeEnvConfig(discovery.port);

  // Task 3: Update system state
  updateSystemState();

  // Task 4: Handshake
  const handshakeOk = await verifyHandshake(discovery.port);

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  if (handshakeOk) {
    console.log('✅ 9Router wiring COMPLETE — service is live and connected');
  } else {
    console.log('⚠️ 9Router wiring COMPLETE — config written, but service not responding');
    console.log('   Run: cd e:/Test/9router-runtime && npm install && npm start');
  }
  console.log('');
}

main();
