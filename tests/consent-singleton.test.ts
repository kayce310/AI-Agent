/**
 * Regression test: ConsentManager must use singleton CoralStorage via getStorage()
 * Ensures no direct new CoralStorage() instantiation that would create second DB handle
 */

import { describe, it, beforeEach, afterEach, expect, vi } from 'vitest';
import { getStorage } from '../src/core/memory/sqlite-storage.js';
import { ConsentManager, getConsentManager } from '../src/core/security/consent.js';

describe('ConsentManager — singleton CoralStorage regression', () => {
  let getStorageSpy: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    // Reset modules to clear singletons
    vi.resetModules();
    
    // Re-import after reset
    const storageModule = await import('../src/core/memory/sqlite-storage.js');
    getStorageSpy = vi.spyOn(storageModule, 'getStorage');
  });

  afterEach(() => {
    getStorageSpy?.mockRestore();
  });

  it('initialize() must call getStorage() not new CoralStorage()', async () => {
    const { ConsentManager } = await import('../src/core/security/consent.js');
    const manager = new ConsentManager();
    
    // Initialize should use the singleton
    await manager.initialize();
    
    // getStorage must be called
    expect(getStorageSpy).toHaveBeenCalledTimes(1);
    
    // db should be the singleton instance
    const singleton = getStorage();
    expect(manager['db']).toEqual(singleton);
  });

  it('getConsentManager() returns singleton ConsentManager', async () => {
    const { getConsentManager } = await import('../src/core/security/consent.js');
    const m1 = getConsentManager();
    const m2 = getConsentManager();
    expect(m1).toBe(m2);
  });

  it('ConsentManager.close() exists for lifecycle symmetry', async () => {
    const { ConsentManager } = await import('../src/core/security/consent.js');
    const manager = new ConsentManager();
    await manager.initialize();
    
    // Should not throw
    expect(() => manager.close()).not.toThrow();
  });
});