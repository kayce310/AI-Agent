/**
 * Kato Agent — Event System Tests
 * Phase 3.5 — HookRegistry + Guards + Integration
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { HookRegistry, globalHooks, EventType, HookContext, GuardHandler } from '../src/core/hooks.js';

// ── Helper ──
function freshRegistry(): HookRegistry {
  return new HookRegistry();
}

// ────────────────────────────────────────────────
// 1. HookRegistry Core
// ────────────────────────────────────────────────
describe('HookRegistry — Core', () => {
  let registry: HookRegistry;

  beforeEach(() => { registry = freshRegistry(); });
  afterEach(() => { registry.clear(); });

  it('should register and emit a hook', async () => {
    const results: string[] = [];
    registry.on('tool:call', async (ctx) => { results.push('called'); });
    const ok = await registry.emit('tool:call', {});
    assert.equal(ok, true);
    assert.deepEqual(results, ['called']);
  });

  it('should emit multiple hooks in priority order', async () => {
    const order: number[] = [];
    registry.on('tool:call', async () => { order.push(10); }, 10);
    registry.on('tool:call', async () => { order.push(20); }, 20);
    registry.on('tool:call', async () => { order.push(0); }, 0);
    await registry.emit('tool:call', {});
    assert.deepEqual(order, [20, 10, 0]); // higher priority first
  });

  it('should return true when no hooks registered', async () => {
    const ok = await registry.emit('task:start', {});
    assert.equal(ok, true);
  });

  it('should handle hook errors without throwing', async () => {
    registry.on('tool:call', async () => { throw new Error('hook fail'); });
    registry.on('tool:call', async (ctx) => { ctx.data.secondRan = true; });
    const ok = await registry.emit('tool:call', { secondRan: false });
    assert.equal(ok, true); // should not be blocked
  });

  it('should unsubscribe a hook', async () => {
    const results: string[] = [];
    const unsub = registry.on('tool:call', async () => { results.push('called'); });
    unsub();
    await registry.emit('tool:call', {});
    assert.deepEqual(results, []);
  });

  it('should clear specific event type', async () => {
    registry.on('tool:call', async () => {});
    registry.on('task:start', async () => {});
    registry.clear('tool:call');
    const summary = registry.summary();
    assert.equal(summary['tool:call'], undefined);
    assert.ok(summary['task:start'] >= 1);
  });

  it('should clear all events', async () => {
    registry.on('tool:call', async () => {});
    registry.on('task:start', async () => {});
    registry.clear();
    assert.deepEqual(registry.summary(), {});
  });

  it('should provide correct summary', async () => {
    registry.on('tool:call', async () => {}, 10);
    registry.on('tool:call', async () => {});
    registry.on('task:start', async () => {});
    const summary = registry.summary();
    assert.equal(summary['tool:call'], 2);
    assert.equal(summary['task:start'], 1);
  });

  it('should populate HookContext correctly', async () => {
    let capturedCtx: HookContext | null = null;
    registry.on('tool:result', async (ctx) => { capturedCtx = ctx; });
    const data = { toolName: 'read_file', result: 'ok' };
    await registry.emit('tool:result', data);
    assert.ok(capturedCtx !== null);
    assert.equal(capturedCtx!.event, 'tool:result');
    assert.ok(capturedCtx!.timestamp);
    assert.equal(capturedCtx!.data.toolName, 'read_file');
    assert.equal(capturedCtx!.data.result, 'ok');
  });
});

// ────────────────────────────────────────────────
// 2. Guard System
// ────────────────────────────────────────────────
describe('HookRegistry — Guards', () => {
  let registry: HookRegistry;

  beforeEach(() => { registry = freshRegistry(); });
  afterEach(() => { registry.clear(); });

  it('should allow event when guard returns allowed:true', async () => {
    registry.before('tool:call', async () => ({ allowed: true }));
    const ok = await registry.emit('tool:call', {});
    assert.equal(ok, true);
  });

  it('should block event when guard returns allowed:false', async () => {
    registry.before('tool:call', async () => ({ allowed: false, reason: 'not permitted' }));
    const ok = await registry.emit('tool:call', {});
    assert.equal(ok, false);
  });

  it('should block event when guard throws', async () => {
    registry.before('tool:call', async () => { throw new Error('guard crash'); });
    const ok = await registry.emit('tool:call', {});
    assert.equal(ok, false); // fail-closed
  });

  it('should run guards before hooks', async () => {
    const order: string[] = [];
    registry.before('tool:call', async () => {
      order.push('guard');
      return { allowed: true };
    });
    registry.on('tool:call', async () => { order.push('hook'); });
    await registry.emit('tool:call', {});
    assert.deepEqual(order, ['guard', 'hook']);
  });

  it('should not run hooks when guard blocks', async () => {
    let hookRan = false;
    registry.before('tool:call', async () => ({ allowed: false }));
    registry.on('tool:call', async () => { hookRan = true; });
    await registry.emit('tool:call', {});
    assert.equal(hookRan, false);
  });

  it('should run multiple guards in priority order', async () => {
    const order: number[] = [];
    registry.before('tool:call', async () => { order.push(10); return { allowed: true }; }, 10);
    registry.before('tool:call', async () => { order.push(20); return { allowed: true }; }, 20);
    registry.before('tool:call', async () => { order.push(0); return { allowed: true }; }, 0);
    await registry.emit('tool:call', {});
    assert.deepEqual(order, [20, 10, 0]);
  });

  it('should stop guard chain on first block', async () => {
    const order: number[] = [];
    registry.before('tool:call', async () => { order.push(1); return { allowed: false }; }, 10);
    registry.before('tool:call', async () => { order.push(2); return { allowed: true }; }, 5);
    await registry.emit('tool:call', {});
    assert.deepEqual(order, [1]); // second guard never runs
  });

  it('should unsubscribe a guard', async () => {
    const unsub = registry.before('tool:call', async () => ({ allowed: false }));
    unsub();
    const ok = await registry.emit('tool:call', {});
    assert.equal(ok, true); // no longer blocked
  });
});

// ────────────────────────────────────────────────
// 3. Integration: Real-world Scenarios
// ────────────────────────────────────────────────
describe('Event System — Integration', () => {
  let registry: HookRegistry;

  beforeEach(() => { registry = freshRegistry(); });
  afterEach(() => { registry.clear(); });

  it('should support logging plugin pattern', async () => {
    const logs: string[] = [];

    // Logging plugin: log every tool call
    registry.before('tool:call', async (ctx) => {
      logs.push(`GUARD:${ctx.data.toolName as string}`);
      return { allowed: true };
    });
    registry.on('tool:result', async (ctx) => {
      logs.push(`RESULT:${ctx.data.toolName as string}=${JSON.stringify(ctx.data.result).substring(0, 30)}`);
    });

    await registry.emit('tool:call', { toolName: 'read_file' });
    await registry.emit('tool:result', { toolName: 'read_file', result: { content: 'ok' } });
    await registry.emit('tool:call', { toolName: 'execute_command' });

    assert.ok(logs.some(l => l.includes('GUARD:read_file')));
    assert.ok(logs.some(l => l.includes('RESULT:read_file')));
    assert.ok(logs.some(l => l.includes('GUARD:execute_command')));
  });

  it('should support security guard blocking dangerous tools', async () => {
    const blockedTools = new Set(['execute_command', 'delete_file', 'rm_dir']);
    const blocked: string[] = [];

    registry.before('tool:call', async (ctx) => {
      const toolName = ctx.data.toolName as string;
      if (blockedTools.has(toolName)) {
        blocked.push(toolName);
        return { allowed: false, reason: `${toolName} is not allowed` };
      }
      return { allowed: true };
    });

    const callResult1 = await registry.emit('tool:call', { toolName: 'read_file' });
    assert.equal(callResult1, true);

    const callResult2 = await registry.emit('tool:call', { toolName: 'execute_command' });
    assert.equal(callResult2, false);

    const callResult3 = await registry.emit('tool:call', { toolName: 'search_knowledge_graph' });
    assert.equal(callResult3, true);

    assert.deepEqual(blocked, ['execute_command']);
  });

  it('should support memory hook pattern', async () => {
    const memoryBlocks: string[] = [];

    // Memory hook: auto-save tool results
    registry.on('tool:result', async (ctx) => {
      const content = JSON.stringify(ctx.data.result);
      if (content && content !== 'undefined' && content !== 'null') {
        memoryBlocks.push(`Tool ${ctx.data.toolName}: ${content.substring(0, 100)}`);
      }
    });

    await registry.emit('tool:result', { toolName: 'read_file', result: { text: 'hello world' } });
    await registry.emit('tool:result', { toolName: 'write_file', result: null }); // should be skipped

    assert.equal(memoryBlocks.length, 1);
    assert.ok(memoryBlocks[0].includes('Tool read_file'));
  });

  it('should multi-guard + multi-hook compose correctly', async () => {
    const trail: string[] = [];

    guard(1, true);  guard(2, true);  guard(3, true);
    hook(1);  hook(2);

    function guard(id: number, allowed: boolean) {
      registry.before('task:start', async () => {
        trail.push(`g${id}`);
        return { allowed, reason: allowed ? undefined : `g${id} blocked` };
      }, id);
    }
    function hook(id: number) {
      registry.on('task:start', async () => { trail.push(`h${id}`); }, id);
    }

    const ok = await registry.emit('task:start', {});
    assert.equal(ok, true);
    assert.deepEqual(trail, ['g3', 'g2', 'g1', 'h2', 'h1']);
  });

  it('should block on any guard in mid-chain', async () => {
    const trail: string[] = [];

    registry.before('tool:error', async () => { trail.push('g1'); return { allowed: true }; }, 10);
    registry.before('tool:error', async () => { trail.push('g2'); return { allowed: false, reason: 'simulated' }; }, 5);
    registry.before('tool:error', async () => { trail.push('g3'); return { allowed: true }; }, 0);
    registry.on('tool:error', async () => { trail.push('h1'); });

    const ok = await registry.emit('tool:error', { msg: 'test' });
    assert.equal(ok, false);
    assert.deepEqual(trail, ['g1', 'g2']); // g3 and h1 never run
  });
});

// ────────────────────────────────────────────────
// 4. Singleton
// ────────────────────────────────────────────────
describe('globalHooks singleton', () => {
  afterEach(() => { globalHooks.clear(); });

  it('should be a HookRegistry instance', () => {
    assert.ok(globalHooks instanceof HookRegistry);
  });

  it('should maintain state across calls', async () => {
    let count = 0;
    globalHooks.on('task:complete', async () => { count++; });
    await globalHooks.emit('task:complete', {});
    await globalHooks.emit('task:complete', {});
    assert.equal(count, 2);
  });
});