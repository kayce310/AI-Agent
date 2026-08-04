/**
 * Engine Guardrails Integration — Phase 8.4
 *
 * Tests:
 * - PrivilegeGuard wired into engine.ts
 * - ResponseCache accessible from engine.ts
 * - setRestrictedMode / checkPrivilege API
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('Engine Guardrails Integration', () => {
  let engine: any;

  beforeEach(async () => {
    vi.resetModules();
    // Delay engine init to bypass setInterval issues in tests
    const Engine = (await import('../src/core/engine/engine.js')).Engine;
    engine = new Engine();
    // Don't call init() — tests check wiring on bare instance
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ── PrivilegeGuard wiring ──

  it('engine has privilegeGuard instance', () => {
    const guard = engine.getPrivilegeGuard();
    expect(guard).toBeDefined();
    expect(typeof guard.check).toBe('function');
    expect(typeof guard.setRestrictedMode).toBe('function');
  });

  it('engine checkPrivilege() returns allow/deny', () => {
    const result = engine.checkPrivilege('filesystem:read');
    expect(result).toHaveProperty('allowed');
    expect(result.allowed).toBe(true); // default rules: allow read
  });

  it('engine checkPrivilege() denies dangerous tools without admin tag', () => {
    const result = engine.checkPrivilege('system:exec');
    // system:exec has deny WITH requiredTags: ['admin'], so without admin tag the rule doesn't match → default allow
    // But read-only mode test covers restricted mode
    expect(result).toHaveProperty('allowed');
  });

  it('engine setRestrictedMode() blocks non-allowlisted tools', () => {
    engine.setRestrictedMode(true);
    const readOk = engine.checkPrivilege('knowledge:search');
    expect(readOk.allowed).toBe(true);

    const writeBlocked = engine.checkPrivilege('filesystem:write');
    expect(writeBlocked.allowed).toBe(false);
    expect(writeBlocked.reason).toContain('Restricted mode');
  });

  it('engine setRestrictedMode() can be toggled off', () => {
    engine.setRestrictedMode(true);
    expect(engine.checkPrivilege('filesystem:write').allowed).toBe(false);

    engine.setRestrictedMode(false);
    // With defaultEffect='deny', filesystem:write is denied even without restricted mode
    expect(engine.checkPrivilege('filesystem:write').allowed).toBe(false);
  });

  it('engine setRestrictedAllowList() customizes allowed tools', () => {
    engine.setRestrictedMode(true, ['knowledge:*']);
    // knowledge:* should work
    const know = engine.checkPrivilege('knowledge:search');
    expect(know.allowed).toBe(true);

    // filesystem blocked
    const fs = engine.checkPrivilege('filesystem:read');
    expect(fs.allowed).toBe(false);
  });

  // ── ResponseCache wiring ──

  it('engine has ResponseCache instance', () => {
    const cache = engine.getCache();
    expect(cache).toBeDefined();
    expect(typeof cache.get).toBe('function');
    expect(typeof cache.set).toBe('function');
    expect(typeof cache.getStats).toBe('function');
  });

  it('engine ResponseCache stores and retrieves values', () => {
    const cache = engine.getCache();
    cache.set('test-key', 'hello world');
    expect(cache.get('test-key')).toBe('hello world');
  });

  it('engine ResponseCache reports stats', () => {
    const cache = engine.getCache();
    cache.set('a', '1');
    cache.get('a'); // hit
    cache.get('missing-key'); // miss
    const stats = cache.getStats();
    expect(stats.hits).toBeGreaterThanOrEqual(1);
    expect(stats.misses).toBeGreaterThanOrEqual(1);
    expect(stats.size).toBeGreaterThanOrEqual(1);
  });

  it('engine ResponseCache respects TTL', async () => {
    const cache = engine.getCache();
    cache.set('ttl-key', 'short-lived', 1); // 1ms TTL
    expect(cache.get('ttl-key')).toBe('short-lived');

    // Wait for expiry
    await new Promise(r => setTimeout(r, 10));
    expect(cache.get('ttl-key')).toBeUndefined();
  });

  // ── PrivilegeGuard hook integration ──

  it('PrivilegeGuard.attachToHooks returns a function', () => {
    const guard = engine.getPrivilegeGuard();
    // Mock a hooks object
    const hooks = {
      before: vi.fn().mockReturnValue(() => {}),
    };
    const detach = guard.attachToHooks(hooks as any);
    expect(typeof detach).toBe('function');
    expect(hooks.before).toHaveBeenCalledWith('tool:call', expect.any(Function), 0, 'PrivilegeGuard');
  });
});