#!/usr/bin/env node
/**
 * @file kato-emergency-snapshot.mjs — Emergency Snapshot Script
 * @layer scripts (standalone, no imports from src/)
 *
 * Captures a point-in-time snapshot of runtime state files.
 * Usage: node scripts/kato-emergency-snapshot.mjs
 *
 * Output: /.kato/snapshots/snapshot_<timestamp>.json
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');

// ── Helpers ──

function safeReadJson(relativePath) {
  const fullPath = path.join(PROJECT_ROOT, relativePath);
  try {
    if (fs.existsSync(fullPath)) {
      const raw = fs.readFileSync(fullPath, 'utf8');
      return JSON.parse(raw);
    }
  } catch (err) {
    return { _error: `Failed to read ${relativePath}: ${err.message}` };
  }
  return null;
}

// ── Main ──

function main() {
  const state = safeReadJson('knowledge/workspace/state.json');
  const checkpoint = safeReadJson('knowledge/workspace/checkpoint.json');
  const processedFiles = safeReadJson('knowledge/workspace/processed-files.json');

  const timestamp = new Date().toISOString();
  const snapshot = {
    timestamp,
    state,
    checkpoint,
    processedFiles,
  };

  // Create snapshot directory
  const snapshotsDir = path.join(PROJECT_ROOT, '.kato', 'snapshots');
  fs.mkdirSync(snapshotsDir, { recursive: true });

  // Write snapshot file
  const safeTs = timestamp.replace(/[:.]/g, '-');
  const snapshotPath = path.join(snapshotsDir, `snapshot_${safeTs}.json`);
  fs.writeFileSync(snapshotPath, `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8');

  console.log(`EMERGENCY SNAPSHOT SAVED: ${snapshotPath}`);
  process.exit(0);
}

main();
