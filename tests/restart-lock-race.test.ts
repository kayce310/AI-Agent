/**
 * Regression test: Restart lock race fix
 * Verifies the code changes are correct via source inspection
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Restart lock race — code change verification', () => {
  it('start-telegram.ts has async acquireFileLock with wait loop', () => {
    const content = fs.readFileSync(path.join('src', 'scripts', 'start-telegram.ts'), 'utf8');
    
    // Verify async function signature
    expect(content).toContain('async function acquireFileLock(): Promise<boolean>');
    
    // Verify wait loop exists
    expect(content).toContain('Wait for old process to fully exit');
    expect(content).toContain('maxWaitMs = 10_000');
    expect(content).toContain('checkIntervalMs = 200');
    expect(content).toContain('while (waited < maxWaitMs)');
    expect(content).toContain('await new Promise(r => setTimeout(r, checkIntervalMs))');
    
    // Verify abort on kill failure
    expect(content).toContain('Failed to kill PID');
    expect(content).toContain('return false');
    
    // Verify await when calling
    expect(content).toContain('if (!await acquireFileLock())');
  });

  it('start-telegram-lite.ts has async acquireFileLock with wait loop', () => {
    const content = fs.readFileSync(path.join('src', 'scripts', 'start-telegram-lite.ts'), 'utf8');
    
    // Verify async function signature
    expect(content).toContain('async function acquireFileLock(): Promise<boolean>');
    
    // Verify wait loop exists
    expect(content).toContain('Wait for old process to fully exit');
    expect(content).toContain('maxWaitMs = 10_000');
    expect(content).toContain('checkIntervalMs = 200');
    expect(content).toContain('while (waited < maxWaitMs)');
    expect(content).toContain('await new Promise(r => setTimeout(r, checkIntervalMs))');
    
    // Verify abort on kill failure
    expect(content).toContain('Failed to kill PID');
    expect(content).toContain('return false');
    
    // Verify await when calling
    expect(content).toContain('if (!await acquireFileLock())');
  });

  it('both files no longer have force-start on kill failure', () => {
    const content1 = fs.readFileSync(path.join('src', 'scripts', 'start-telegram.ts'), 'utf8');
    const content2 = fs.readFileSync(path.join('src', 'scripts', 'start-telegram-lite.ts'), 'utf8');
    
    // Old code had: "Could not kill PID ${oldPid} — trying to force-start anyway"
    expect(content1).not.toContain('force-start anyway');
    expect(content2).not.toContain('force-start anyway');
  });
});