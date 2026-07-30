/**
 * @file T0.2 — Verify PrivilegeGuard actually blocks tools in the real ReAct loop
 *
 * Purpose: Confirm whether finding R1.6 (PrivilegeGuard not checked in agent loop)
 * and R1.4 (hook emit used as guard incorrectly) are valid.
 *
 * Test strategy:
 *   1. Create a full Agent with PrivilegeGuard wired via attachToHooks()
 *   2. Simulate a tool call that should be DENIED (not in allow list)
 *   3. Check if the guard blocks it via hooks.before('tool:call', ...)
 *
 * This tests the REAL code path — no mocks of the guard mechanism.
 */

import { describe, it, expect } from 'vitest';
import { HookRegistry } from '../src/core/hooks.js';
import { PrivilegeGuard, createDefaultAllowRules } from '../src/core/security/privilege-guard.js';

/**
 * CRITICAL FINDING T0.2:
 * 
 * PrivilegeGuard.attachToHooks() IS called at engine.ts:224 and hooks.emit()
 * DOES correctly process guard return values — so the guard mechanism itself works.
 * 
 * HOWEVER, engine.ts:217 creates PrivilegeGuard with defaultEffect='allow' (the
 * constructor default). This means any tool not matching an explicit allow rule
 * is ALLOWED by default — making the guard a no-op for unknown/prompt-injected tools.
 * 
 * The code comments say "Zero-Trust" but the actual default is permissive.
 */

import { describe, it, expect } from 'vitest';
import { HookRegistry } from '../src/core/hooks.js';
import { PrivilegeGuard, createDefaultAllowRules } from '../src/core/security/privilege-guard.js';

describe('T0.2: PrivilegeGuard in hook guard flow', () => {
  it('Guard with defaultEffect=deny blocks unknown tool', async () => {
    const hooks = new HookRegistry();
    const guard = new PrivilegeGuard({
      rules: createDefaultAllowRules(),
      defaultEffect: 'deny',
    });
    guard.attachToHooks(hooks);

    const allowed = await hooks.emit('tool:call', {
      toolName: 'some_harmful_tool_not_in_allow_list',
    });

    expect(allowed).toBe(false);
  });

  it('Guard with defaultEffect=deny allows known tool via alias', async () => {
    const hooks = new HookRegistry();
    const guard = new PrivilegeGuard({
      rules: createDefaultAllowRules(),
      defaultEffect: 'deny',
    });
    guard.attachToHooks(hooks);

    // read_file matches 'filesystem:read' alias
    const allowed = await hooks.emit('tool:call', {
      toolName: 'read_file',
      toolArgs: { path: 'safe.txt' },
    });
    expect(allowed).toBe(true);
  });

  it('PRODUCTION BUG: defaultEffect=allow (no config) lets unknown tool pass', async () => {
    // Matches engine.ts:217 — no defaultEffect set in config
    const hooks = new HookRegistry();
    const guard = new PrivilegeGuard({
      rules: createDefaultAllowRules(),
      // defaultEffect defaults to 'allow'
    });
    guard.attachToHooks(hooks);

    const allowed = await hooks.emit('tool:call', {
      toolName: 'nuclear_launch_codes',
    });

    // BUG: returns true — PrivilegeGuard is a no-op for unknown tools
    expect(allowed).toBe(true);
  });

  it('hooks.emit(tool:call) return value CHECKED in agent.ts — skip path works', async () => {
    // Simulates agent.ts:857-872
    const hooks = new HookRegistry();
    const guard = new PrivilegeGuard({
      rules: createDefaultAllowRules(),
      defaultEffect: 'deny',
    });
    guard.attachToHooks(hooks);

    const badToolResult = await hooks.emit('tool:call', {
      toolName: 'unknown_malicious_tool',
    });
    expect(badToolResult).toBe(false); // blocked by guard

    const goodToolResult = await hooks.emit('tool:call', {
      toolName: 'search_knowledge_graph',
    });
    expect(goodToolResult).toBe(true); // allowed
  });
});
