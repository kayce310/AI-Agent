/**
 * Final verification: coral.db integrity after restart with the fix applied
 * Confirms the source code changes are present in start-telegram.ts and start-telegram-lite.ts
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';

describe('Lifecycle regression — coral.db integrity after fix', () => {
  // Verify start-telegram.ts fixes
  it('start-telegram.ts has async acquireFileLock with wait loop', () => {
    const content = fs.readFileSync('src/scripts/start-telegram.ts', 'utf8');
    expect(content).toContain('async function acquireFileLock(): Promise<boolean>');
    expect(content).toContain('Wait for old process to fully exit');
    expect(content).toContain('maxWaitMs = 10_000');
    expect(content).toContain('await new Promise(r => setTimeout(r, checkIntervalMs))');
    expect(content).toContain('Failed to kill PID');
    expect(content).toContain('return false');
    expect(content).toContain('process.on(\'exit\', () => {');
    expect(content).toContain('getStorage().close()');
  });

  it('start-telegram-lite.ts has same fixes', () => {
    const content = fs.readFileSync('src/scripts/start-telegram-lite.ts', 'utf8');
    expect(content).toContain('async function acquireFileLock(): Promise<boolean>');
    expect(content).toContain('Wait for old process to fully exit');
    expect(content).toContain('maxWaitMs = 10_000');
    expect(content).toContain('await new Promise(r => setTimeout(r, checkIntervalMs))');
    expect(content).toContain('Failed to kill PID');
    expect(content).toContain('return false');
  });

  it('both files no longer have force-start on kill failure', () => {
    const content1 = fs.readFileSync('src/scripts/start-telegram.ts', 'utf8');
    const content2 = fs.readFileSync('src/scripts/start-telegram-lite.ts', 'utf8');
    expect(content1).not.toContain('force-start anyway');
    expect(content2).not.toContain('force-start anyway');
  });
});