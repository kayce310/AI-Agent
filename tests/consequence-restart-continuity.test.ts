/**
 * R6-C — Consequence restart read-path continuity test.
 *
 * Verifies the invariant:
 *   write consequence record (Process A)
 *     → restart
 *     → fresh Engine init (Process B)
 *     → read-path registered
 *     → persisted record is read
 *     → guard decision reflects persisted data
 *
 * Uses separate OS processes (execFileSync + tsx + helper) following
 * the existing pattern in tests/consequence-restart.test.ts.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execFileSync } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

const REPO = path.resolve(__dirname, '..');
const HELPER = path.join(REPO, 'tests', 'consequence-restart-continuity-helper.ts');
const DB_FILE = path.join(REPO, 'data', 'consequences-r6c-test.db');

interface WriteResult {
  ok: boolean;
  toolName: string;
  outcome: string;
  userId: string;
}

interface VerifyResult {
  allowed: boolean;
  action: string;
  reasonCode: string;
}

function runChild(mode: 'write' | 'verify', dbPath: string): WriteResult | VerifyResult {
  const stdout = execFileSync(
    process.execPath,
    [path.join(REPO, 'node_modules', 'tsx', 'dist', 'cli.mjs'), HELPER, mode, dbPath],
    { cwd: REPO, encoding: 'utf8', timeout: 60_000, stdio: ['ignore', 'pipe', 'pipe'] },
  );
  return JSON.parse(stdout.trim().split('\n').pop() ?? '{}') as WriteResult | VerifyResult;
}

describe('R6-C — restart read-path continuity', () => {
  let writeResult: WriteResult;
  let verifyResult: VerifyResult;

  beforeAll(() => {
    // Clean up any stale DB files
    for (const suffix of ['', '-wal', '-shm']) {
      try { fs.unlinkSync(DB_FILE + suffix); } catch { /* not exists */ }
    }

    // Process A: write consequence to file-backed SQLite → exit
    writeResult = runChild('write', DB_FILE) as WriteResult;

    // Process B: fresh Engine bootstrap → read-path registered → guard decision
    verifyResult = runChild('verify', DB_FILE) as VerifyResult;
  });

  afterAll(() => {
    // Clean up temp DB
    for (const suffix of ['', '-wal', '-shm']) {
      try { fs.unlinkSync(DB_FILE + suffix); } catch { /* not exists */ }
    }
  });

  it('Process A: write succeeds', () => {
    expect(writeResult.ok).toBe(true);
    expect((writeResult as WriteResult).toolName).toBe('dangerous_tool');
    expect((writeResult as WriteResult).outcome).toBe('fail');
  });

  it('Process B: guard decision reflects persisted block policy after restart', () => {
    // Process B is a fresh Node.js process — engine.init() was called,
    // read-path was registered, persisted record was read.
    // With block policy + tool in allowlist + enforceBlock = true,
    // decision should be 'block'.
    expect(verifyResult.action).toBe('block');
    expect(verifyResult.reasonCode).toBe('consequence_block_allowlist');
    // 'allowed' is false when action is 'block'
    expect(verifyResult.allowed).toBe(false);
  });
});
