#!/usr/bin/env node
/**
 * @file kato-resume.mjs — Resume from Emergency Snapshot
 * @layer scripts (standalone, no imports from src/)
 *
 * Usage:
 *   node scripts/kato-resume.mjs            # dry-run: show latest snapshot info
 *   node scripts/kato-resume.mjs --apply     # restore state from latest snapshot
 *
 * Restores: knowledge/workspace/state.json
 *           knowledge/workspace/checkpoint.json
 *           knowledge/workspace/processed-files.json
 *
 * On success, renames snapshot to *_resumed.json to mark as processed.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');

const SNAPSHOTS_DIR = path.join(PROJECT_ROOT, '.kato', 'snapshots');

// ── Helpers ──

function safeReadJson(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
  } catch (err) {
    return { _error: err.message };
  }
  return null;
}

function safeWriteJson(filePath, data) {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

/**
 * Find the latest (most recent by timestamp) snapshot file
 * that has NOT been resumed yet (does not end with _resumed.json).
 */
function findLatestPendingSnapshot() {
  if (!fs.existsSync(SNAPSHOTS_DIR)) return null;

  const files = fs.readdirSync(SNAPSHOTS_DIR)
    .filter(f => f.startsWith('snapshot_') && f.endsWith('.json') && !f.endsWith('_resumed.json'))
    .sort()
    .reverse(); // lexicographic sort = chronological for ISO timestamps

  return files.length > 0 ? path.join(SNAPSHOTS_DIR, files[0]) : null;
}

// ── Main ──

function main() {
  const args = process.argv.slice(2);
  const isApply = args.includes('--apply');

  const snapshotPath = findLatestPendingSnapshot();
  if (!snapshotPath) {
    console.log('No pending snapshot found in .kato/snapshots/.');
    process.exit(1);
  }

  const snapshotData = safeReadJson(snapshotPath);
  if (!snapshotData) {
    console.log(`ERROR: Could not read snapshot: ${snapshotPath}`);
    process.exit(1);
  }

  const stateDir = path.join(PROJECT_ROOT, 'knowledge/workspace');
  const filesToRestore = [
    { key: 'state', target: path.join(stateDir, 'state.json') },
    { key: 'checkpoint', target: path.join(stateDir, 'checkpoint.json') },
    { key: 'processedFiles', target: path.join(stateDir, 'processed-files.json') },
  ];

  if (!isApply) {
    // Dry-run mode — just show info
    const stateId = snapshotData.state?.session?.id || 'unknown';
    const ts = snapshotData.timestamp || 'unknown';
    const desc = snapshotData.checkpoint?.techDebt?.openItems?.length
      ? `${snapshotData.checkpoint.techDebt.openItems.length} open tech debt items`
      : 'no tech debt items';

    console.log(`📋 Latest snapshot: ${path.basename(snapshotPath)}`);
    console.log(`   Timestamp: ${ts}`);
    console.log(`   Session:   ${stateId}`);
    console.log(`   Content:   ${desc}`);
    console.log(`   Files:     ${filesToRestore.map(f => f.key).join(', ')}`);
    console.log('');
    console.log('To restore, run: node scripts/kato-resume.mjs --apply');
    process.exit(0);
  }

  // ── Apply mode: restore files ──
  for (const { key, target } of filesToRestore) {
    const data = snapshotData[key];
    if (!data || (typeof data === 'object' && data._error)) {
      console.warn(`⚠️  Skipping ${key} — not present in snapshot or unreadable`);
      continue;
    }
    safeWriteJson(target, data);
  }

  // Rename snapshot to mark as resumed
  const resumedPath = snapshotPath.replace(/\.json$/, '_resumed.json');
  fs.renameSync(snapshotPath, resumedPath);

  console.log(`Resumed from snapshot: ${snapshotPath}`);
  process.exit(0);
}

main();
