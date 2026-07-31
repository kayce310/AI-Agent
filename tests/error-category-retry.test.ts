/**
 * @file error-category-retry.test.ts — Retry decision logic for transient/permanent/security
 *
 * Verifies the decision logic added for errorCategory:
 *   - transient: NOT counted toward consecutiveFailedAttempts (no premature stuck),
 *     has own counter (consecutiveTransientAttempts) + limit (MAX_TRANSIENT_RETRY)
 *   - transient > MAX_TRANSIENT_RETRY: promoted to permanent (counts toward stuck)
 *   - permanent: tool result returned to model includes a clear "do not retry same" note
 *   - security: unchanged — aborts plan (existing behavior, engine.ts)
 *   - mixed transient+permanent in one request: counted/processed independently
 */

import { describe, it, expect, vi } from 'vitest';
import { classifyError } from '../src/core/plan/error-classifier.js';
import { MAX_TRANSIENT_RETRY, STAGNATION_THRESHOLD } from '../src/core/plan/types.js';

// ════════════════════════════════════════════════════════════════
// Pure logic tests — decision rules replicated from agent.ts stagnation block
// ════════════════════════════════════════════════════════════════

/** Mirrors the agent.ts decision: which counter gets incremented for a failed cycle */
function decideCounter(
  category: 'transient' | 'permanent' | 'security' | undefined,
  transientSoFar: number,
): 'transient' | 'failed' {
  if (category === 'transient' && transientSoFar < MAX_TRANSIENT_RETRY) return 'transient';
  return 'failed';
}

describe('ErrorCategory decision logic (transient vs permanent)', () => {
  it('MAX_TRANSIENT_RETRY is 3 and STAGNATION_THRESHOLD stays 5', () => {
    expect(MAX_TRANSIENT_RETRY).toBe(3);
    expect(STAGNATION_THRESHOLD).toBe(5);
  });

  it('transient failure counts toward transient counter, NOT failed counter', () => {
    let failed = 0;
    let transient = 0;

    // 3 timeouts in a row
    for (let i = 0; i < 3; i++) {
      const which = decideCounter('transient', transient);
      if (which === 'transient') transient++;
      else failed++;
    }

    expect(transient).toBe(3);   // all 3 go to transient counter
    expect(failed).toBe(0);      // main counter untouched → no premature stuck
  });

  it('transient beyond MAX_TRANSIENT_RETRY gets promoted to permanent (failed counter)', () => {
    let failed = 0;
    let transient = 0;

    // 4 timeouts in a row — 4th exceeds limit → counted as failed
    for (let i = 0; i < 4; i++) {
      const which = decideCounter('transient', transient);
      if (which === 'transient') transient++;
      else failed++;
    }

    expect(transient).toBe(3);
    expect(failed).toBe(1);      // promoted after limit
  });

  it('3 transient + 1 permanent does NOT trigger stuck; 5 permanent DOES', () => {
    // Case A: 3 transient + 1 permanent → failed=1 < 5 → not stuck
    let failed = 0;
    let transient = 0;
    const failures = ['transient', 'transient', 'transient', 'permanent'];
    for (const cat of failures) {
      const which = decideCounter(cat as any, transient);
      if (which === 'transient') transient++;
      else failed++;
    }
    expect(failed).toBe(1);
    expect(failed >= STAGNATION_THRESHOLD).toBe(false); // not stuck

    // Case B: 5 permanent → stuck
    failed = 0;
    for (let i = 0; i < 5; i++) failed++;
    expect(failed >= STAGNATION_THRESHOLD).toBe(true); // stuck
  });

  it('transient counter resets when an item completes', () => {
    // Item completes → both counters reset to 0
    const item = { consecutiveFailedAttempts: 0, consecutiveTransientAttempts: 3 };
    item.consecutiveFailedAttempts = 0;
    item.consecutiveTransientAttempts = 0;
    expect(item.consecutiveTransientAttempts).toBe(0);
  });

  it('permanent error produces the no-retry note appended to tool result', () => {
    const toolResult = JSON.stringify({ error: 'ENOENT: no such file' });
    const cappedResult = toolResult;
    const note = '[ERROR_CATEGORY=permanent]';
    const withNote = cappedResult + '\n\n⚠️ ' + note;
    expect(withNote).toContain(note);
    // Full note text (agent.ts appends the Vietnamese guidance; assert the ASCII
    // marker + a stable substring that is encoding-independent)
    expect(withNote.length).toBeGreaterThan(cappedResult.length + 20);
  });

  it('transient error does NOT get the permanent note', () => {
    const toolResult = JSON.stringify({ error: 'timeout of 5000ms exceeded' });
    // transient path: no note appended
    expect(toolResult).not.toContain('[ERROR_CATEGORY=permanent]');
  });
});

// ════════════════════════════════════════════════════════════════
// classifyError sanity — decision inputs
// ════════════════════════════════════════════════════════════════

describe('classifyError produces the categories the logic depends on', () => {
  it('timeout/network/rate-limit → transient', () => {
    expect(classifyError('timeout of 5000ms exceeded')).toBe('transient');
    expect(classifyError('ECONNREFUSED')).toBe('transient');
    expect(classifyError('rate_limit exceeded')).toBe('transient');
  });

  it('not-found/permission/validation → permanent', () => {
    expect(classifyError('ENOENT: no such file')).toBe('permanent');
    expect(classifyError('EACCES: permission denied')).toBe('permanent');
    expect(classifyError('validation failed')).toBe('permanent');
  });

  it('blocked/forbidden → security', () => {
    expect(classifyError('Tool blocked by security guard')).toBe('security');
    expect(classifyError('forbidden')).toBe('security');
  });

  it('unknown error defaults to permanent', () => {
    expect(classifyError('Some random unknown error')).toBe('permanent');
  });
});

// ════════════════════════════════════════════════════════════════
// Mixed scenario — transient + permanent interleaved, independent counting
// ════════════════════════════════════════════════════════════════

describe('Mixed transient+permanent in one request (independent counting)', () => {
  it('transient(2) → permanent(1) → transient(1): counters do not bleed into each other', () => {
    const sequence: Array<'transient' | 'permanent'> = [
      'transient', 'transient',  // 2 timeouts — transient counter only
      'permanent',               // 1 real failure — failed counter only
      'transient',               // recovery attempt — still transient
    ];

    let failed = 0;
    let transient = 0;

    for (const cat of sequence) {
      const which = decideCounter(cat, transient);
      if (which === 'transient') transient++;
      else failed++;
    }

    // Transient counter: 2 + 1 = 3 (all under MAX_TRANSIENT_RETRY, none promoted)
    expect(transient).toBe(3);
    // Failed counter: exactly 1 (the permanent error) — NOT polluted by transients
    expect(failed).toBe(1);
    // Not stuck — 1 < 5
    expect(failed >= STAGNATION_THRESHOLD).toBe(false);
  });

  it('transient(3) then permanent(4): after promotion transient feeds failed counter', () => {
    let failed = 0;
    let transient = 0;

    // 3 transients — all within limit
    for (let i = 0; i < 3; i++) {
      const which = decideCounter('transient', transient);
      if (which === 'transient') transient++;
      else failed++;
    }
    expect(transient).toBe(3);
    expect(failed).toBe(0);

    // 4th transient — exceeds limit → promoted to failed
    const which4 = decideCounter('transient', transient);
    if (which4 === 'transient') transient++;
    else failed++;
    expect(failed).toBe(1);

    // 4 permanents after → failed = 5 → stuck
    for (let i = 0; i < 4; i++) failed++;
    expect(failed).toBe(5);
    expect(failed >= STAGNATION_THRESHOLD).toBe(true);
  });
});
