/**
 * R2 Phase A smoke tests — §3 atomic write + §6 proven-completed semantics.
 * Pure logic, no LLM, no real process spawn (crash-injection suite = Phase B).
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { atomicWriteFileSync } from '../src/core/atomic-write.js';
import { CheckpointStore } from '../src/core/checkpoint.js';

function tmpDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'r2-smoke-'));
}

describe('R2 §3 — atomicWriteFileSync', () => {
  it('replaces existing destination; content always valid JSON; no tmp litter', () => {
    const dir = tmpDir();
    const dest = path.join(dir, 'cp-x.json');
    atomicWriteFileSync(dest, JSON.stringify({ v: 1 }));
    expect(JSON.parse(fs.readFileSync(dest, 'utf-8')).v).toBe(1);

    atomicWriteFileSync(dest, JSON.stringify({ v: 2 }));
    const parsed = JSON.parse(fs.readFileSync(dest, 'utf-8'));
    expect(parsed.v).toBe(2);

    const leftovers = fs.readdirSync(dir).filter((f) => f.includes('.tmp'));
    expect(leftovers).toEqual([]);
  });
});

describe('R2 §6 — proven-completed semantics', () => {
  it('completed tool is proven; pending tool is NOT; markRecovered idempotent', () => {
    const store = new CheckpointStore({ checkpointDir: tmpDir() });
    store.start('req-r2', 'sess-r2', 'smoke goal');
    store.cycle(
      'req-r2',
      1,
      'smoke goal',
      [
        { id: 'tool-a', name: 't', args: {} },
        { id: 'tool-b', name: 't', args: {} },
      ],
      [{ id: 'tool-a', result: 'ok' }],
    ); // tool-a completed, tool-b pending

    const done = store.getProvenCompletedToolIds('req-r2');
    expect(done.has('tool-a')).toBe(true);
    expect(done.has('tool-b')).toBe(false);

    store.markRecovered('req-r2', 'first');
    store.markRecovered('req-r2', 'second-call-must-not-overwrite'); // idempotent

    const snap = store.getLatestForSession('sess-r2');
    expect(snap?.recovery?.provenCompletedTools).toBe(1);
    expect(snap?.recovery?.note).toBe('first');
    expect(snap?.status).toBe('in_progress'); // still resumable, not dropped
  });
});
