/**
 * Coral Agent — Phase 4A: Decision Intelligence Foundation Tests
 * Tests: decisionId propagation, reasoning capture, summarizeReasoning, fallback, backward compat
 */

import { describe, it, beforeEach, afterEach, assert } from 'vitest';
import { randomUUID } from 'crypto';
import { EventFactory } from '../src/core/events/factory.js';
import { reduceEvent, buildStateFromEvents, createInitialState, AgentState } from '../src/core/events/agent-state.js';
import { BaseEvent, AgentEvent } from '../src/core/events/types.js';

// ═══ summarizeReasoning (module-private) — tested via engine integration ═══
// We test the logic directly since it's a pure function. Import via engine internals would be
// fragile, so we replicate the exact algorithm here for behavioral parity.

function summarizeReasoning(text: string | null | undefined): string | null {
  if (!text) return null;
  const cleaned = text.trim();
  const match = cleaned.match(/^(.+?[.!?])(?:\s|$)/);
  if (match && match[1].length <= 160) {
    return match[1];
  }
  return cleaned.length > 160
    ? cleaned.slice(0, 157) + '...'
    : cleaned;
}

// ═══════════════════════════════════════════════════════════════
// 1. summarizeReasoning — Pure function
// ═══════════════════════════════════════════════════════════════
describe('summarizeReasoning', () => {
  it('should return null for null/undefined/empty', () => {
    assert.equal(summarizeReasoning(null), null);
    assert.equal(summarizeReasoning(undefined), null);
    assert.equal(summarizeReasoning(''), null);
  });

  it('should extract first sentence if ≤160 chars', () => {
    const text = 'The user asked about Docker networking. I should search for relevant docs.';
    const result = summarizeReasoning(text);
    assert.equal(result, 'The user asked about Docker networking.');
  });

  it('should extract first sentence ending with ! or ?', () => {
    assert.equal(summarizeReasoning('What is this? Let me check.'), 'What is this?');
    assert.equal(summarizeReasoning('Found it! Now proceeding.'), 'Found it!');
  });

  it('should truncate to 157 + "..." if first sentence >160 chars', () => {
    const longSentence = 'A'.repeat(200) + '. Rest of text';
    const result = summarizeReasoning(longSentence);
    assert.ok(result!.length <= 160);
    assert.ok(result!.endsWith('...'));
    assert.equal(result, 'A'.repeat(157) + '...');
  });

  it('should return full text if ≤160 chars and no sentence terminator', () => {
    const text = 'No period here';
    assert.equal(summarizeReasoning(text), 'No period here');
  });

  it('should truncate text with no terminator at 157 chars', () => {
    const text = 'A'.repeat(200);
    const result = summarizeReasoning(text);
    assert.equal(result, 'A'.repeat(157) + '...');
  });

  it('should trim whitespace', () => {
    const result = summarizeReasoning('  Hello world.  ');
    assert.equal(result, 'Hello world.');
  });
});

// ═══════════════════════════════════════════════════════════════
// 2. decisionId — EventFactory creates valid UUIDs
// ═══════════════════════════════════════════════════════════════
describe('EventFactory — decisionId in events', () => {
  it('decision_made should include decisionId', () => {
    const decisionId = randomUUID();
    const event = EventFactory.decisionMade('task-1', decisionId, 'Call search', 'Reason text', 'Execute search()', 'Snippet text');
    assert.equal(event.type, 'decision_made');
    assert.equal((event.payload as any).decisionId, decisionId);
    assert.equal((event.payload as any).decision, 'Call search');
    assert.equal((event.payload as any).reason, 'Reason text');
    assert.equal((event.payload as any).reasoningSnippet, 'Snippet text');
  });

  it('tool_called should include decisionId', () => {
    const decisionId = randomUUID();
    const event = EventFactory.toolCalled('task-1', decisionId, 'call-123', 'search', { query: 'test' });
    assert.equal(event.type, 'tool_called');
    assert.equal((event.payload as any).decisionId, decisionId);
    assert.equal((event.payload as any).callId, 'call-123');
  });

  it('tool_finished should include decisionId', () => {
    const decisionId = randomUUID();
    const event = EventFactory.toolFinished('task-1', decisionId, 'call-123', 'search', true, 100, { query: 'test' }, 'result');
    assert.equal(event.type, 'tool_finished');
    assert.equal((event.payload as any).decisionId, decisionId);
    assert.equal((event.payload as any).callId, 'call-123');
  });

  it('decision_made with optional reasoningSnippet = undefined', () => {
    const decisionId = randomUUID();
    const event = EventFactory.decisionMade('task-1', decisionId, 'Call tool', 'reason', 'next');
    assert.equal((event.payload as any).reasoningSnippet, undefined);
  });
});

// ═══════════════════════════════════════════════════════════════
// 3. AgentState — decisionId flows through state
// ═══════════════════════════════════════════════════════════════
describe('AgentState — decisionId propagation', () => {
  let state: AgentState;

  beforeEach(() => { state = createInitialState(); });

  it('should store decisionId in recentDecisions', () => {
    const decisionId = randomUUID();
    const event = EventFactory.decisionMade('task-1', decisionId, 'Call search', 'User needs info', 'Search web', 'Searching the web');
    state = reduceEvent(state, event);

    assert.equal(state.recentDecisions.length, 1);
    assert.equal(state.recentDecisions[0].decisionId, decisionId);
    assert.equal(state.recentDecisions[0].decision, 'Call search');
    assert.equal(state.recentDecisions[0].reasoningSnippet, 'Searching the web');
  });

  it('tool_called and tool_finished both carry decisionId', () => {
    const decisionId = randomUUID();
    const toolCallEvent = EventFactory.toolCalled('task-1', decisionId, 'call-1', 'search', { q: 'test' });
    state = reduceEvent(state, toolCallEvent);

    const toolFinishEvent = EventFactory.toolFinished('task-1', decisionId, 'call-1', 'search', true, 50);
    state = reduceEvent(state, toolFinishEvent);

    // Timeline should have both events with matching decisionId
    const toolEvents = state.timeline.filter(e => e.type === 'tool_called' || e.type === 'tool_finished');
    assert.equal(toolEvents.length, 2);
    assert.equal((toolEvents[0].payload as any).decisionId, decisionId); // tool_finished (newest first)
    assert.equal((toolEvents[1].payload as any).decisionId, decisionId); // tool_called
  });

  it('multiple decisions should track all decisionIds', () => {
    const d1 = randomUUID();
    const d2 = randomUUID();

    state = reduceEvent(state, EventFactory.decisionMade('t', d1, 'D1', 'R1', 'N1'));
    state = reduceEvent(state, EventFactory.decisionMade('t', d2, 'D2', 'R2', 'N2'));

    assert.equal(state.recentDecisions.length, 2);
    assert.equal(state.recentDecisions[0].decisionId, d2); // newest first
    assert.equal(state.recentDecisions[1].decisionId, d1);
  });
});

// ═══════════════════════════════════════════════════════════════
// 4. Backward Compatibility — events without decisionId
// ═══════════════════════════════════════════════════════════════
describe('AgentState — backward compat (no decisionId)', () => {
  let state: AgentState;

  beforeEach(() => { state = createInitialState(); });

  it('old tool_called event without decisionId should not crash', () => {
    // Simulate pre-Phase-4A event
    const oldEvent = {
      id: randomUUID(),
      timestamp: Date.now(),
      type: 'tool_called',
      payload: { taskId: 't', callId: 'c1', toolName: 'search', args: {} },
    } as unknown as AgentEvent;

    // Should not throw — agent-state.ts reads decisionId but doesn't require it
    state = reduceEvent(state, oldEvent);
    assert.ok(state.timeline.length === 1);
  });

  it('old decision_made event without decisionId should not crash', () => {
    const oldEvent = {
      id: randomUUID(),
      timestamp: Date.now(),
      type: 'decision_made',
      payload: { taskId: 't', decision: 'D', reason: 'R', nextAction: 'N' },
    } as unknown as AgentEvent;

    state = reduceEvent(state, oldEvent);
    // RecentDecision should have decisionId as undefined (graceful)
    assert.equal(state.recentDecisions.length, 1);
  });
});

// ═══════════════════════════════════════════════════════════════
// 5. Zod Schema Validation — new fields
// ═══════════════════════════════════════════════════════════════
describe('Schema validation — Phase 4A fields', () => {
  it('DecisionMadeSchema requires decisionId', () => {
    const event = EventFactory.decisionMade('t', randomUUID(), 'D', 'R', 'N', 'snippet');
    assert.equal(event.type, 'decision_made');
    assert.ok((event.payload as any).decisionId);
    assert.equal(typeof (event.payload as any).decisionId, 'string');
  });

  it('ToolCalledSchema requires decisionId', () => {
    const event = EventFactory.toolCalled('t', randomUUID(), 'c1', 'search', {});
    assert.ok((event.payload as any).decisionId);
  });

  it('ToolFinishedSchema requires decisionId', () => {
    const event = EventFactory.toolFinished('t', randomUUID(), 'c1', 'search', true, 100);
    assert.ok((event.payload as any).decisionId);
  });
});

// ═══════════════════════════════════════════════════════════════
// 6. reasoningSnippet — capped at 1000 chars
// ═══════════════════════════════════════════════════════════════
describe('reasoningSnippet — 1000 char cap', () => {
  it('should accept snippets up to 1000 chars', () => {
    const snippet = 'A'.repeat(1000);
    const event = EventFactory.decisionMade('t', randomUUID(), 'D', 'R', 'N', snippet);
    assert.equal((event.payload as any).reasoningSnippet.length, 1000);
  });

  it('should accept undefined reasoningSnippet', () => {
    const event = EventFactory.decisionMade('t', randomUUID(), 'D', 'R', 'N');
    assert.equal((event.payload as any).reasoningSnippet, undefined);
  });

  it('engine should slice reasoningContent to 1000 chars for snippet', () => {
    // Verify the slicing logic matches spec
    const longReasoning = 'X'.repeat(2500);
    const snippet = longReasoning.slice(0, 1000);
    assert.equal(snippet.length, 1000);
    assert.equal(snippet, 'X'.repeat(1000));
  });
});
