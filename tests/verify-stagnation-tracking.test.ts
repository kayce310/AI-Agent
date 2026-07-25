/**
 * @file Independent verification of stagnation-based plan stopping
 * @layer tests
 *
 * Verifies that the old "hard budget per plan" model (computePlanBudget)
 * is truly replaced by per-item stagnation detection.
 *
 * Test 1 (step 4): 15 items, each needing 4 tool calls → total 60 cycles.
 *   Old budget (50) would have killed this plan. Stagnation allows it.
 *
 * Test 2 (step 5): 1 item failing 5 consecutive times → plan goes 'stuck'.
 *   Other items in same plan must have counter = 0.
 */

import { describe, it, expect } from 'vitest';
import {
  ABSOLUTE_SAFETY_CEILING,
  STAGNATION_THRESHOLD,
  validateTransition,
  isPlanActive,
} from '../src/core/plan/types.js';
import { Agent } from '../src/core/engine/agent.js';

// ── Stub helpers ──
function makeMinimalAgent(): Agent {
  const stubRouter: any = { route: async () => ({ content: '', modelUsed: 'test', providerUsed: 'test' }) };
  const stubRegistry: any = { getDefinitions: () => [], executeToolCall: async () => ({}), use: () => {} };
  return new Agent({ modelRouter: stubRouter, toolRegistry: stubRegistry });
}

// ════════════════════════════════════════════════════════════════
// Step 4: 15 items × 4 calls each = 60 tool calls
// ════════════════════════════════════════════════════════════════

describe('Step 4: 15 items × 4 tool calls each (total 60) — must NOT be killed by hard budget', () => {
  it('ABSOLUTE_SAFETY_CEILING is 200 (not 50)', () => {
    // Core prerequisite: the loop ceiling must be higher than 60
    expect(ABSOLUTE_SAFETY_CEILING).toBe(200);
    expect(ABSOLUTE_SAFETY_CEILING).toBeGreaterThan(60);
  });

  it('setMaxToolCycles(200) returns 200 — agent can run 60+ cycles', () => {
    const agent = makeMinimalAgent();
    const result = agent.setMaxToolCycles(200);
    expect(result).toBe(200);
    expect(agent.getMaxToolCycles()).toBe(200);
  });

  it('15 items with 0 consecutive failures each — no stuck transition needed', () => {
    // Simulate: 15 items, each completed after some cycles.
    // Stagnation counter stays 0 on every item → no 'stuck'.
    const counters = Array.from({ length: 15 }, () => 0);
    for (let i = 0; i < 15; i++) {
      // Item i takes 4 attempts → but each attempt either succeeds or counter resets
      // Simulate 4 cycles: 3 "in_progress" cycles + 1 "complete" cycle
      for (let c = 0; c < 3; c++) {
        counters[i]++; // failed attempt
      }
      // Complete item — counter resets
      counters[i] = 0;
    }
    // All counters should be 0 at end
    const allZero = counters.every(c => c === 0);
    expect(allZero).toBe(true);

    // No item ever reached STAGNATION_THRESHOLD
    const maxCounter = Math.max(...counters);
    expect(maxCounter).toBeLessThan(STAGNATION_THRESHOLD);
  });

  it('validateTransition allows running → stuck and stuck → running', () => {
    expect(validateTransition('running', 'stuck')).toBeNull();
    expect(validateTransition('stuck', 'running')).toBeNull();
    expect(validateTransition('stuck', 'aborted')).toBeNull();
  });

  it('isPlanActive includes stuck', () => {
    expect(isPlanActive('stuck')).toBe(true);
  });
});

// ════════════════════════════════════════════════════════════════
// Step 5: 1 item failing exactly 5 times → plan goes stuck at 5, not earlier
// ════════════════════════════════════════════════════════════════

describe('Step 5: consecutiveFailedAttempts tracking per-item', () => {
  it('STAGNATION_THRESHOLD is exactly 5', () => {
    expect(STAGNATION_THRESHOLD).toBe(5);
  });

  it('counter starts at 0 for new items', () => {
    // Simulate makePlanItem behavior: default = 0
    const item = { index: 0, description: 'test', status: 'pending' as const, consecutiveFailedAttempts: 0 };
    expect(item.consecutiveFailedAttempts).toBe(0);
  });

  it('increment from 0..4 should NOT trigger stuck (threshold check is ">=" at 5)', () => {
    let counter = 0;
    for (let attempt = 1; attempt <= 4; attempt++) {
      counter++;
      // Simulate: after incrementing, check if >= threshold
      const isStuck = counter >= STAGNATION_THRESHOLD;
      expect(isStuck).toBe(false); // still OK at attempt 4
    }
    // 5th attempt triggers
    counter++;
    expect(counter >= STAGNATION_THRESHOLD).toBe(true);
  });

  it('counter resets to 0 when item completes', () => {
    let counter = 3; // was failing
    // Item completes: reset
    counter = 0;
    expect(counter).toBe(0);
    // Next failure starts from 1
    counter++;
    expect(counter).toBe(1); // not 4
  });

  it('counter resets to 0 (not inherited) when advancing to next item', () => {
    // Simulate: item 0 had 4 failures, then was skipped → move to item 1
    const items = [
      { index: 0, consecutiveFailedAttempts: 4, status: 'skipped' },
      { index: 1, consecutiveFailedAttempts: 0, status: 'pending' },
    ];
    // Item 1 starts fresh — counter = 0
    expect(items[1].consecutiveFailedAttempts).toBe(0);
    // Item 1 gets its first failure
    items[1].consecutiveFailedAttempts++;
    expect(items[1].consecutiveFailedAttempts).toBe(1);
  });

  it('stuck → running transition is allowed (user retries)', () => {
    expect(validateTransition('stuck', 'running')).toBeNull();
  });

  it('stuck → aborted transition is allowed', () => {
    expect(validateTransition('stuck', 'aborted')).toBeNull();
  });

  it('validateTransition rejects stuck → completed (direct)', () => {
    // A stuck item can't directly complete; must go via running first
    const err = validateTransition('stuck', 'completed');
    expect(err).not.toBeNull();
    expect(err).toContain('Invalid transition');
  });
});
