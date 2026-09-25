/**
 * Simple lifecycle verification for coral.db integrity
 * Process 1: init + write (fresh DB)
 * Process 2: verify integrity (same DB)
 */

import { execFileSync } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import * as sqlite3 from 'better-sqlite3';

const REPO = path.resolve(__dirname, '..');
const SCRIPT = path.join(REPO, 'tests', 'coral-lifecycle-script.ts');
const DB_FILE = path.join(REPO, 'data', 'coral-lifecycle-test.db');

function runChild(mode: 'init' | 'verify', dbPath: string): { ok: boolean; pid?: number; rows?: number; integrity?: string; error?: string } {
  const stdout = execFileSync(
    process.execPath,
    [path.join(REPO, 'node_modules', 'tsx', 'dist', 'cli.mjs'), SCRIPT, mode, dbPath],
    { cwd: REPO, encoding: 'utf8', timeout: 60_000, stdio: ['ignore', 'pipe', 'pipe'] }
  );
  return JSON.parse(stdout.trim().split('\n').pop() ?? '{}');
}

console.log('[LIFECYCLE] Running Phase 1: init + write');
const initResult = runChild('init', DB_FILE);
if (!initResult.ok) {
  console.error('Phase 1 failed:', initResult.error);
  process.exit(1);
}
console.log(`[LIFECYCLE] Phase 1 complete: PID ${initResult.pid}, ${initResult.rows} rows written`);

console.log('[LIFECYCLE] Running Phase 2: verify integrity');
const verifyResult = runChild('verify', DB_FILE);
if (!verifyResult.ok) {
  console.error('Phase 2 failed:', verifyResult.error);
  process.exit(1);
}
console.log(`[LIFECYCLE] Phase 2 complete: integrity=${verifyResult.integrity}, rows=${verifyResult.rows}`);

if (verifyResult.integrity === 'ok') {
  console.log('[LIFECYCLE] SUCCESS: coral.db integrity maintained across process restarts');
  process.exit(0);
} else {
  console.error('[LIFECYCLE] FAILURE: coral.db corrupted across restarts');
  process.exit(1);
}