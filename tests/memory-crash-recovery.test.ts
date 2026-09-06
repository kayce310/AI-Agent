/**
 * AC8 — R5 v1: Legacy Memory Crash Durability
 * Protocol:
 * 1. Spawn child process (production dist via file script).
 * 2. Child adds N blocks via MemoryStore.add().
 * 3. Child signals ADD_RETURNED via stdout.
 * 4. Parent detects ADD_RETURNED → SIGKILL child.
 * 5. Parent restarts (new MemoryStore, same path) → replay.
 * 6. Verify exactly N blocks recovered.
 */
import { describe, it, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { spawn, ChildProcess } from 'child_process';
import * as fsPromises from 'fs/promises';

const CHILD_SCRIPT = path.resolve('D:/AI-Agent/tmp/crash_child.mjs');

interface TestResult {
  success: boolean;
  blocksRecovered: number;
  expected: number;
  error?: string;
  stdout: string;
}

describe('AC8 — Legacy Memory Crash Durability (SIGKILL)', () => {
  let tmpDir: string;
  let child: ChildProcess | null = null;
  let addReturned = false;
  let childStdout = '';

  beforeEach(async () => {
    tmpDir = path.join('D:/AI-Agent/tmp_ac8', `crash_${Date.now()}`);
    await fsPromises.mkdir(tmpDir, { recursive: true });
    addReturned = false;
    childStdout = '';
  });

  afterEach(async () => {
    if (child && !child.killed) {
      child.kill('SIGKILL');
      child = null;
    }
    await fsPromises.rm(tmpDir, { recursive: true, force: true });
  });

  function spawnChild(): Promise<{ stdout: string; killed: boolean }> {
    return new Promise((resolve) => {
      let resolved = false;
      const absTmp = path.resolve(tmpDir);
      child = spawn('node', [CHILD_SCRIPT, absTmp], {
        stdio: ['pipe', 'pipe', 'pipe'],
        windowsHide: true,
        cwd: 'D:/AI-Agent',
      });

      child.stdout!.on('data', (data: Buffer) => {
        const text = data.toString();
        childStdout += text;
        if (text.includes('ADD_RETURNED:') && !addReturned) {
          addReturned = true;
          // CRITICAL: kill immediately — no fixed grace-period timer.
          // ADD_RETURNED observed → SIGKILL directly.
          if (child && !child.killed) {
            child.kill('SIGKILL');
          }
        }
      });

      child.stderr!.on('data', (data: Buffer) => {
        childStdout += data.toString();
      });

      child.on('close', (code, signal) => {
        if (!resolved) {
          resolved = true;
          resolve({ stdout: childStdout, killed: !!signal });
        }
      });

      child.on('error', (err) => {
        if (!resolved) {
          resolved = true;
          resolve({ stdout: childStdout, killed: false });
        }
      });
    });
  }

  it('AC8: recovers N=3 blocks after SIGKILL crash', async () => {
    const EXPECTED = 3;

    // Step 1-4: Spawn child, add blocks, SIGKILL
    const { stdout, killed } = await spawnChild();

    if (!killed) {
      console.log('WARN: child was not SIGKILLed — may have exited naturally');
    }

    console.log(`Child stdout: ${stdout.trim()}`);

    // Extract block IDs from child stdout
    const match = stdout.match(/ADD_RETURNED:([^\n]+)/);
    if (!match) {
      throw new Error(`ADD_RETURNED not found in child stdout: ${stdout}`);
    }
    const expectedIds = match[1].split(',');
    console.log(`Child added ${expectedIds.length} blocks (IDs: ${expectedIds.join(', ')})`);

    // Step 5: Parent restarts with same store path
    const { MemoryStore } = await import('../dist/core/memory/memory-store.js');
    const store = new MemoryStore(tmpDir);
    await store.init();

    // Step 6: Verify exactly N blocks recovered
    const allBlocks = await store.getAll('fact');
    const recovered = allBlocks.filter(b =>
      b.content.startsWith('block_') && b.content.endsWith('_test_ac8')
    );

    console.log(`Recovered ${recovered.length}/${EXPECTED} blocks`);
    for (const b of recovered) {
      console.log(`  - ${b.id}: ${b.content}`);
    }

    const recoveredIds = recovered.map(b => b.id).sort();
    const expectedSorted = [...expectedIds].sort();

    if (recoveredIds.length !== EXPECTED) {
      throw new Error(
        `AC8 FAIL: expected ${EXPECTED} blocks, recovered ${recovered.length}. ` +
        `IDs: ${recoveredIds.join(', ')}`
      );
    }

    console.log(`AC8 PASS: ${recovered.length}/${EXPECTED} blocks recovered after SIGKILL`);
  });
});
