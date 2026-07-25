/**
 * @file Independent verification of setMaxToolCycles ABSOLUTE_SAFETY_CEILING
 * @layer tests
 *
 * THIS TEST IS WRITTEN BY THE INDEPENDENT REVIEWER (Round 3/4 audit).
 * It calls the REAL Agent::setMaxToolCycles() and asserts the
 * effective cap is ABSOLUTE_SAFETY_CEILING = 200 (stagnation is primary signal).
 */

import { describe, it, expect } from 'vitest';
import { Agent } from '../src/core/engine/agent.js';
import { ABSOLUTE_SAFETY_CEILING } from '../src/core/plan/types.js';

function makeMinimalAgent(): Agent {
  const stubRouter: any = { route: async () => ({ content: '', modelUsed: 'test', providerUsed: 'test' }) };
  const stubRegistry: any = { getDefinitions: () => [], executeToolCall: async () => ({}), use: () => {} };
  return new Agent({ modelRouter: stubRouter, toolRegistry: stubRegistry });
}

describe('setMaxToolCycles absolute ceiling', () => {
  it('should accept 50 and return 50 (not cap at 25)', () => {
    const agent = makeMinimalAgent();
    const result = agent.setMaxToolCycles(50);
    expect(result).toBe(50);
    expect(agent.getMaxToolCycles()).toBe(50);
  });

  it('should accept values far above old 50 cap', () => {
    const agent = makeMinimalAgent();

    expect(agent.setMaxToolCycles(100)).toBe(100);
    expect(agent.getMaxToolCycles()).toBe(100);

    expect(agent.setMaxToolCycles(150)).toBe(150);
    expect(agent.getMaxToolCycles()).toBe(150);
  });

  it(`should cap at ABSOLUTE_SAFETY_CEILING (${ABSOLUTE_SAFETY_CEILING})`, () => {
    const agent = makeMinimalAgent();

    const result = agent.setMaxToolCycles(ABSOLUTE_SAFETY_CEILING + 100);
    expect(result).toBe(ABSOLUTE_SAFETY_CEILING);
    expect(agent.getMaxToolCycles()).toBe(ABSOLUTE_SAFETY_CEILING);
  });

  it('should floor at 1', () => {
    const agent = makeMinimalAgent();
    expect(agent.setMaxToolCycles(0)).toBe(1);
    expect(agent.setMaxToolCycles(-5)).toBe(1);
  });

  it('should raise to ABSOLUTE_SAFETY_CEILING from any lower value', () => {
    const agent = makeMinimalAgent();
    agent.setMaxToolCycles(25);
    const raised = agent.setMaxToolCycles(ABSOLUTE_SAFETY_CEILING);
    expect(raised).toBe(ABSOLUTE_SAFETY_CEILING);
    expect(agent.getMaxToolCycles()).toBe(ABSOLUTE_SAFETY_CEILING);
  });
});
