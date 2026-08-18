/**
 * PHASE 10 — Consequence persistence across REAL process restart.
 *
 * - Process A: subprocess mở REAL SQLite file → ghi fail consequence + success
 *   pattern (×2) → close() → terminate.
 * - Process B: subprocess MỚI mở CÙNG file → verify restore + chạy read path
 *   (tool:call → decision/hint) + user isolation + evidenceRef.
 *
 * Không dùng :memory: — file thật trên disk, hai V8 isolate riêng biệt,
 * module state mới hoàn toàn (singleton được tạo lại từ đầu).
 */
import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import { execFileSync } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

const REPO = path.resolve(__dirname, '..');
const HELPER = path.join(REPO, 'tests', 'consequence-restart-helper.ts');
const DB_FILE = path.join(REPO, 'data', 'consequences-restart-test.db');

interface AidJson {
  ok: boolean;
  failId?: string;
  success?: { id: string; count: number; policy: string };
  failureRestored?: { count: number; outcome?: string; policy?: string; evidence?: { checkpointId?: string; cycle?: number }; latestEvidence?: { checkpointId?: string; cycle?: number } };
  successRestored?: { count: number; occurrenceCount?: number; policy?: string };
  decisions?: {
    fail?: { allowed: boolean; hint?: { policy?: string; failCountSession?: number; failCountWindow?: number } | null };
    success?: { allowed: boolean; hint?: { successCount?: number } | null };
  };
  isolation?: { aliceFailWindow: number; bobFailWindow: number; bobMatched: number };
}

function runChild(mode: 'write' | 'verify', dbPath: string): AidJson {
  const stdout = execFileSync(
    process.execPath,
    [path.join(REPO, 'node_modules', 'tsx', 'dist', 'cli.mjs'), HELPER, mode, dbPath],
    { cwd: REPO, encoding: 'utf8', timeout: 60_000, stdio: ['ignore', 'pipe', 'pipe'] },
  );
  return JSON.parse(stdout.trim().split('\n').pop() ?? '{}') as AidJson;
}

describe('PHASE 10 — persistence across process restart', () => {
  let writeOut: AidJson;
  let readOut: AidJson;

  beforeAll(() => {
    for (const suffix of ['', '-wal', '-shm']) {
      try { fs.unlinkSync(DB_FILE + suffix); } catch { /* not exists */ }
    }
    // PROCESS A (ghi + terminate) → PROCESS B (mở lại + verify), tuần tự.
    writeOut = runChild('write', DB_FILE);
    readOut = runChild('verify', DB_FILE);
  });

  afterAll(() => {
    for (const suffix of ['', '-wal', '-shm']) {
      try { fs.unlinkSync(DB_FILE + suffix); } catch { /* not exists */ }
    }
  });

  it('Process A ghi thành công (fail + success pattern + evidenceRef)', () => {
    expect(writeOut.ok).toBe(true);
    expect(writeOut.success?.count).toBe(2);
    expect(writeOut.success?.policy).toBe('suggest');
  });

  it('Process B mở CÙNG file: records được restore từ disk', () => {
    expect(readOut.failureRestored?.count).toBe(1);
    expect(readOut.failureRestored?.outcome).toBe('fail');
    expect(readOut.successRestored?.count).toBe(1);
    expect(readOut.successRestored?.occurrenceCount).toBe(2);
    expect(readOut.successRestored?.policy).toBe('suggest');
  });

  it('evidenceRef nguyên vẹn sau restart (getById + latestEvidence)', () => {
    expect(readOut.failureRestored?.evidence).toEqual({ checkpointId: 'cp-restart-1', cycle: 2 });
    expect(readOut.failureRestored?.latestEvidence).toEqual({ checkpointId: 'cp-restart-1', cycle: 2 });
  });

  it('Read path sau restart: fail vẫn cho decision/hint đúng; success successCount=2', () => {
    const failDecision = readOut.decisions?.fail;
    expect(failDecision?.allowed).toBe(true); // suggest — không block
    expect(failDecision?.hint?.policy).toBe('suggest');
    expect(failDecision?.hint?.failCountWindow).toBe(1);
    expect(failDecision?.hint?.failCountSession).toBe(0); // session B mới
    const successDecision = readOut.decisions?.success;
    expect(successDecision?.allowed).toBe(true);
    expect(successDecision?.hint?.successCount).toBe(2);
  });

  it('User isolation nguyên vẹn sau restart: bob không thấy record của alice', () => {
    expect(readOut.isolation?.aliceFailWindow).toBe(1);
    expect(readOut.isolation?.bobFailWindow).toBe(0);
    expect(readOut.isolation?.bobMatched).toBe(0);
  });
});