/**
 * Final verification tests for the lifecycle fixes
 * Verifies:
 * 1. ConsentManager uses singleton CoralStorage via getStorage() (no direct new CoralStorage())
 * 2. start-telegram.ts and start-telegram-lite.ts have async acquireFileLock with wait loop
 * 3. No force-start on kill failure anywhere
 * 4. getStorage().close() is called on process exit
 * 5. getStorage().close() is called in crash handler
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';

describe('Lifecycle fixes verification', () => {
  // Test 1: Verify ConsentManager uses getStorage() singleton
  it('ConsentManager uses singleton CoralStorage via getStorage()', () => {
    const content = fs.readFileSync('src/core/security/consent.ts', 'utf8');
    // Should NOT have direct new CoralStorage() in ConsentManager
    expect(content).not.toContain('new CoralStorage(dbPath)');
    // Should import getStorage
    expect(content).toContain('import { getStorage } from');
    // Should use getStorage() in initialize()
    expect(content).toContain('this.db = getStorage();');
    // Should have close() method for lifecycle symmetry
    expect(content).toContain('close(): void');
  });

  // Test 2: Verify start-telegram.ts has async acquireFileLock with wait loop
  it('start-telegram.ts has async acquireFileLock with wait loop', () => {
    const content = fs.readFileSync('src/scripts/start-telegram.ts', 'utf8');
    // Verify async signature
    expect(content).toContain('async function acquireFileLock(): Promise<boolean>');
    // Verify wait loop exists
    expect(content).toContain('Wait for old process to fully exit');
    expect(content).toContain('maxWaitMs = 10_000');
    expect(content).toContain('checkIntervalMs = 200');
    expect(content).toContain('await new Promise(r => setTimeout(r, checkIntervalMs))');
    // Verify abort on kill failure
    expect(content).toContain('Failed to kill PID');
    expect(content).toContain('return false');
    // Verify getStorage().close() on process exit
    expect(content).toContain('process.on(\'exit\', () => {');
    expect(content).toContain('getStorage().close()');
  });

  // Test 3: Verify start-telegram-lite.ts has same fixes
  it('start-telegram-lite.ts has async acquireFileLock with wait loop', () => {
    const content = fs.readFileSync('src/scripts/start-telegram-lite.ts', 'utf8');
    expect(content).toContain('async function acquireFileLock(): Promise<boolean>');
    expect(content).toContain('Wait for old process to fully exit');
    expect(content).toContain('maxWaitMs = 10_000');
    expect(content).toContain('checkIntervalMs = 200');
    expect(content).toContain('await new Promise(r => setTimeout(r, checkIntervalMs))');
    expect(content).toContain('Failed to kill PID');
    expect(content).toContain('return false');
  });

  // Test 4: Verify both files no longer have force-start on kill failure
  it('both files no longer have force-start on kill failure', () => {
    const content1 = fs.readFileSync('src/scripts/start-telegram.ts', 'utf8');
    const content2 = fs.readFileSync('src/scripts/start-telegram-lite.ts', 'utf8');
    // Old code had: "Could not kill PID X — trying to force-start anyway"
    expect(content1).not.toContain('force-start anyway');
    expect(content2).not.toContain('force-start anyway');
  });

  // Test 5: Verify crash-handler.ts has getStorage().close()
  it('crash-handler.ts calls getStorage().close() on crash', () => {
    const content = fs.readFileSync('src/core/crash-handler.ts', 'utf8');
    expect(content).toContain('getStorage().close()');
  });
});