/**
 * Coral Behavior Engine — Emotion Phase 3 Tests
 * Validates: emotion_tag parsing, mapping, stats, over-expression, consistency.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { randomUUID } from 'crypto';

// ── Parser Tests ──

import {
  parseEmotionTag,
  stripEmotionTag,
  buildEmotionInstruction,
  ParsedEmotionTag,
} from '../../src/core/behavior/emotion-tag-parser.js';

import {
  EmotionTag,
  EmotionTagSchema,
  mapEmotionToActions,
  BehaviorAction,
  VALID_EMOTION_TAGS,
} from '../../src/core/behavior/types.js';

import { BehaviorEngine } from '../../src/core/behavior/behavior-engine.js';
import { EventBus } from '../../src/core/events/bus.js';
import { EventFactory } from '../../src/core/events/factory.js';
import { AgentEvent } from '../../src/core/events/types.js';
import { HookRegistry } from '../../src/core/hooks.js';
import Database from 'better-sqlite3';

// ═══ EMOTION TAG PARSER ═══

describe('EmotionTag — Parser', () => {
  it('should parse valid emotion tags', () => {
    const cases = [
      '[EMOTION: confident]',
      '[EMOTION: uncertain]',
      '[EMOTION: apologetic]',
      '[EMOTION: neutral]',
      '[EMOTION: enthusiastic]',
      '[EMOTION: excited]',
      '[EMOTION: thoughtful]',
      '[EMOTION: urgent]',
    ];
    for (const text of cases) {
      const result = parseEmotionTag(text);
      expect(result.valid).toBe(true);
      expect(result.tag).toBeTruthy();
      expect(result.raw).toBeTruthy();
    }
  });

  it('should parse case-insensitively', () => {
    const result = parseEmotionTag('[EMOTION: Confident]');
    expect(result.valid).toBe(true);
    expect(result.tag).toBe('confident');
  });

  it('should handle flexible whitespace', () => {
    const result = parseEmotionTag('[EMOTION:  uncertain  ]');
    expect(result.valid).toBe(true);
    expect(result.tag).toBe('uncertain');
  });

  it('should handle no space after colon', () => {
    const result = parseEmotionTag('[EMOTION:apologetic]');
    expect(result.valid).toBe(true);
    expect(result.tag).toBe('apologetic');
  });

  it('should reject invalid emotion tags', () => {
    const result = parseEmotionTag('[EMOTION: furious]');
    expect(result.valid).toBe(false);
    expect(result.tag).toBeNull();
    expect(result.raw).toBe('furious');
  });

  it('should return null when no emotion tag present', () => {
    const result = parseEmotionTag('Hello, how are you?');
    expect(result.valid).toBe(false);
    expect(result.tag).toBeNull();
    expect(result.raw).toBeNull();
  });

  it('should return null for empty/null input', () => {
    expect(parseEmotionTag('').valid).toBe(false);
    expect(parseEmotionTag(null as any).valid).toBe(false);
    expect(parseEmotionTag(undefined as any).valid).toBe(false);
  });

  it('should extract tag from text with surrounding content', () => {
    const text = 'Here is my answer about React hooks.\n\n[EMOTION: confident]';
    const result = parseEmotionTag(text);
    expect(result.valid).toBe(true);
    expect(result.tag).toBe('confident');
  });

  it('should extract first tag if multiple present', () => {
    const text = '[EMOTION: uncertain] ... [EMOTION: confident]';
    const result = parseEmotionTag(text);
    expect(result.tag).toBe('uncertain'); // first match
  });
});

// ═══ STRIP EMOTION TAG ═══

describe('EmotionTag — Strip', () => {
  it('should strip emotion tag from content', () => {
    const clean = stripEmotionTag('My answer.\n\n[EMOTION: confident]');
    expect(clean).toBe('My answer.');
  });

  it('should handle content with no emotion tag', () => {
    const clean = stripEmotionTag('No emotion tag here.');
    expect(clean).toBe('No emotion tag here.');
  });

  it('should strip multiple tags', () => {
    const clean = stripEmotionTag('[EMOTION: a] text [EMOTION: b]');
    expect(clean).toBe('text');
  });

  it('should handle null/undefined input', () => {
    expect(stripEmotionTag(null as any)).toBe(null);
    expect(stripEmotionTag('')).toBe('');
  });
});

// ═══ BUILD EMOTION INSTRUCTION ═══

describe('EmotionTag — Instruction Builder', () => {
  it('should return instruction string without recent emotions', () => {
    const instruction = buildEmotionInstruction();
    expect(instruction).toContain('[EMOTION: <label>]');
    expect(instruction).toContain('confident');
    expect(instruction).toContain('uncertain');
    expect(instruction).toContain('enthusiastic');
    expect(instruction).not.toContain('Consistency Context');
  });

  it('should include consistency context when recent emotions provided', () => {
    const instruction = buildEmotionInstruction(['confident', 'neutral', 'confident'], 3);
    expect(instruction).toContain('Consistency Context');
    expect(instruction).toContain('confident, neutral, confident');
  });

  it('should limit recent emotions to window size', () => {
    const instruction = buildEmotionInstruction(
      ['a', 'b', 'c', 'd', 'e'],
      2,
    );
    expect(instruction).toContain('d, e');
  });
});

// ═══ EMOTION → ACTION MAPPING ═══

describe('EmotionTag → Action Mapping', () => {
  const ruleBasedActions: BehaviorAction[] = [
    { type: 'celebrate' },
    { type: 'speak', text: 'Done!' },
  ];

  it('should map uncertain → think + long pause, no celebrate', () => {
    const result = mapEmotionToActions('uncertain', ruleBasedActions);
    expect(result.some(a => a.type === 'think')).toBe(true);
    expect(result.some(a => a.type === 'celebrate')).toBe(false);
    const pause = result.find(a => a.type === 'pause');
    expect(pause).toBeDefined();
    expect((pause as any).ms).toBeGreaterThanOrEqual(2000);
  });

  it('should map apologetic → apologize + speak', () => {
    const result = mapEmotionToActions('apologetic', ruleBasedActions);
    expect(result.some(a => a.type === 'apologize')).toBe(true);
    expect(result.some(a => a.type === 'speak')).toBe(true);
  });

  it('should map enthusiastic → celebrate + speak', () => {
    const result = mapEmotionToActions('enthusiastic', ruleBasedActions);
    expect(result.some(a => a.type === 'celebrate')).toBe(true);
    expect(result.some(a => a.type === 'speak')).toBe(true);
  });

  it('should map confident → speak (default rule-based without celebrate)', () => {
    const result = mapEmotionToActions('confident', ruleBasedActions);
    expect(result.some(a => a.type === 'speak')).toBe(true);
    // Should remove celebrate from rule-based
    expect(result.some(a => a.type === 'celebrate')).toBe(false);
  });

  it('should map neutral → unchanged rule-based actions', () => {
    const result = mapEmotionToActions('neutral', ruleBasedActions);
    expect(result.length).toBe(ruleBasedActions.length);
    expect(result[0].type).toBe('celebrate');
  });

  it('should map excited → celebrate + speak', () => {
    const result = mapEmotionToActions('excited', ruleBasedActions);
    expect(result.some(a => a.type === 'celebrate')).toBe(true);
    expect(result.some(a => a.type === 'speak')).toBe(true);
  });

  it('should map thoughtful → think + blink', () => {
    const result = mapEmotionToActions('thoughtful', ruleBasedActions);
    expect(result.some(a => a.type === 'think')).toBe(true);
    expect(result.some(a => a.type === 'blink')).toBe(true);
  });

  it('should map urgent → look_at + speak', () => {
    const result = mapEmotionToActions('urgent', ruleBasedActions);
    expect(result.some(a => a.type === 'look_at')).toBe(true);
    expect(result.some(a => a.type === 'speak')).toBe(true);
  });
});

// ═══ BEHAVIOR ENGINE — EMOTION INTEGRATION ═══

describe('BehaviorEngine — Emotion Integration', () => {
  let bus: EventBus;
  let engine: BehaviorEngine;
  let db: Database.Database;

  beforeEach(async () => {
    const { EventStore } = await import('../../src/core/events/store.js');
    db = new Database(':memory:');
    db.exec(`
      CREATE TABLE IF NOT EXISTS agent_events (
        id TEXT PRIMARY KEY,
        timestamp INTEGER,
        type TEXT,
        payload TEXT,
        metadata TEXT
      );
    `);
    const store = new EventStore(db);
    bus = new EventBus(store);
    engine = new BehaviorEngine(bus, { validate: true, emotionMapping: true });
  });

  it('should use emotion tag when pending', () => {
    const received: AgentEvent[] = [];
    bus.subscribe('behavior_plan_generated', (e) => received.push(e));

    engine.start();

    // Inject emotion tag
    engine.setPendingEmotionTag('enthusiastic');

    // Trigger a task_finished event
    bus.publish(EventFactory.taskFinished(randomUUID(), 'goal', true, 1000));

    expect(received).toHaveLength(1);
    const plan = received[0].payload as any;
    expect(plan.emotion).toBe('enthusiastic');
    // enthusiastic → celebrate + speak
    expect(plan.actions.some((a: any) => a.type === 'celebrate')).toBe(true);
  });

  it('should fallback to rule-based when no emotion tag pending', () => {
    const received: AgentEvent[] = [];
    bus.subscribe('behavior_plan_generated', (e) => received.push(e));

    engine.start();

    // No emotion tag set — should use rule-based
    bus.publish(EventFactory.taskFinished(randomUUID(), 'goal', true, 1000));

    expect(received).toHaveLength(1);
    const plan = received[0].payload as any;
    // Rule-based: task_finished success → confident
    expect(plan.emotion).toBe('confident');
  });

  it('should consume emotion tag after use (not reuse)', () => {
    const received: AgentEvent[] = [];
    bus.subscribe('behavior_plan_generated', (e) => received.push(e));

    engine.start();
    engine.setPendingEmotionTag('apologetic');

    // First event uses the tag
    bus.publish(EventFactory.taskFinished(randomUUID(), 'goal', false, 1000));
    expect(received).toHaveLength(1);
    expect((received[0].payload as any).emotion).toBe('apologetic');

    // Second event should fallback to rule-based
    bus.publish(EventFactory.taskFinished(randomUUID(), 'goal', true, 1000));
    expect(received).toHaveLength(2);
    expect((received[1].payload as any).emotion).toBe('confident');
  });

  it('should accept emotion_annotated event via EventBus', () => {
    const received: AgentEvent[] = [];
    bus.subscribe('behavior_plan_generated', (e) => received.push(e));

    engine.start();

    // Publish emotion_annotated event (as agent.ts would via EventBus bridge)
    bus.publish({
      id: randomUUID(),
      timestamp: Date.now(),
      type: 'emotion_annotated',
      payload: { emotionTag: 'uncertain', sessionId: 'test' },
    });

    // Now trigger a behavior event
    bus.publish(EventFactory.taskStarted(randomUUID(), 'goal'));

    expect(received).toHaveLength(1);
    const plan = received[0].payload as any;
    expect(plan.emotion).toBe('uncertain');
  });

  it('should accept emotion via HookRegistry', () => {
    const hooks = new HookRegistry();
    const hookedEngine = new BehaviorEngine(bus, {
      validate: true,
      emotionMapping: true,
      hooks,
    });

    const received: AgentEvent[] = [];
    bus.subscribe('behavior_plan_generated', (e) => received.push(e));

    hookedEngine.start();

    // Simulate agent.ts emitting on hooks
    hooks.emit('emotion:annotated', { emotionTag: 'enthusiastic', sessionId: 'test' });

    // Trigger behavior event
    bus.publish(EventFactory.taskFinished(randomUUID(), 'goal', true, 1000));

    expect(received).toHaveLength(1);
    const plan = received[0].payload as any;
    expect(plan.emotion).toBe('enthusiastic');
  });

  it('should disable emotion mapping when option is false', () => {
    const noMappingEngine = new BehaviorEngine(bus, {
      validate: true,
      emotionMapping: false,
    });

    const received: AgentEvent[] = [];
    bus.subscribe('behavior_plan_generated', (e) => received.push(e));

    noMappingEngine.start();
    noMappingEngine.setPendingEmotionTag('enthusiastic');

    bus.publish(EventFactory.taskFinished(randomUUID(), 'goal', true, 1000));

    expect(received).toHaveLength(1);
    const plan = received[0].payload as any;
    // Should use rule-based, not emotion mapping
    expect(plan.emotion).toBe('confident'); // rule-based for success
  });
});

// ═══ EMOTION STATS ═══

describe('BehaviorEngine — Emotion Stats', () => {
  let bus: EventBus;
  let engine: BehaviorEngine;
  let db: Database.Database;

  beforeEach(async () => {
    const { EventStore } = await import('../../src/core/events/store.js');
    db = new Database(':memory:');
    db.exec(`
      CREATE TABLE IF NOT EXISTS agent_events (
        id TEXT PRIMARY KEY,
        timestamp INTEGER,
        type TEXT,
        payload TEXT,
        metadata TEXT
      );
    `);
    const store = new EventStore(db);
    bus = new EventBus(store);
    engine = new BehaviorEngine(bus, { validate: true, overExpressionThreshold: 0.3 });
  });

  it('should track emotion stats', () => {
    engine.start();

    // Send 5 task_finished events (all success → celebrate)
    for (let i = 0; i < 5; i++) {
      bus.publish(EventFactory.taskFinished(randomUUID(), 'goal', true, 1000));
    }

    const stats = engine.getEmotionStats();
    expect(stats.totalPlans).toBe(5);
    expect(stats.celebrateCount).toBeGreaterThan(0);
  });

  it('should detect over-expression when threshold exceeded', () => {
    engine.start();

    // Send many task_finished events → all generate celebrate
    for (let i = 0; i < 10; i++) {
      bus.publish(EventFactory.taskFinished(randomUUID(), 'goal', true, 1000));
    }

    const stats = engine.getEmotionStats();
    expect(stats.isOverExpressed).toBe(true);
    expect(stats.overExpressionRatio).toBeGreaterThan(0.3);
  });

  it('should not flag over-expression when ratio is below threshold', () => {
    engine.start();

    // Mix events: only 1 task_finished among many others
    bus.publish(EventFactory.taskStarted(randomUUID(), 'goal'));
    bus.publish(EventFactory.taskStarted(randomUUID(), 'goal'));
    bus.publish(EventFactory.taskStarted(randomUUID(), 'goal'));
    bus.publish(EventFactory.taskFinished(randomUUID(), 'goal', true, 1000));

    const stats = engine.getEmotionStats();
    expect(stats.isOverExpressed).toBe(false);
  });

  it('should publish behavior_emotion_stats event every 10 plans', () => {
    const statsEvents: AgentEvent[] = [];
    bus.subscribe('behavior_emotion_stats' as any, (e) => statsEvents.push(e));

    engine.start();

    // Send 10 events to trigger stats publish
    for (let i = 0; i < 10; i++) {
      bus.publish(EventFactory.taskStarted(randomUUID(), 'goal'));
    }

    expect(statsEvents).toHaveLength(1);
    const statsPayload = statsEvents[0].payload as any;
    expect(statsPayload.totalPlans).toBe(10);
  });
});

// ═══ EMOTION TAG VOCABULARY ═══

describe('EmotionTag — Vocabulary', () => {
  it('should have exactly the expected valid tags', () => {
    const expectedTags = [
      'neutral', 'confident', 'uncertain', 'excited',
      'enthusiastic', 'apologetic', 'thoughtful', 'urgent',
    ];
    expect(VALID_EMOTION_TAGS.size).toBe(expectedTags.length);
    for (const tag of expectedTags) {
      expect(VALID_EMOTION_TAGS.has(tag)).toBe(true);
    }
  });

  it('should have all tags representable in Zod schema', () => {
    // Check each valid tag can be parsed by the schema
    for (const tag of VALID_EMOTION_TAGS) {
      const result = EmotionTagSchema.safeParse(tag);
      expect(result.success).toBe(true);
    }
    // And reject an invalid one
    const bad = EmotionTagSchema.safeParse('furious');
    expect(bad.success).toBe(false);
  });
});

// ═══ EMOTION IN PROMPT BUILDER ═══

describe('PromptBuilder — Emotion Instruction', () => {
  it('should include emotion instruction in system prompt', async () => {
    const { PromptBuilder } = await import('../../src/core/llm/prompt-builder.js');
    const builder = new PromptBuilder();
    const prompt = builder.buildSystem({
      agentName: 'Coral',
      mentionPrefix: '@coral',
      currentRequest: 'test',
    });

    expect(prompt).toContain('Emotion Self-Annotation');
    expect(prompt).toContain('[EMOTION: <label>]');
    expect(prompt).toContain('confident');
    expect(prompt).toContain('enthusiastic');
  });

  it('should include consistency context when recent emotions provided', async () => {
    const { PromptBuilder } = await import('../../src/core/llm/prompt-builder.js');
    const builder = new PromptBuilder();
    const prompt = builder.buildSystem({
      agentName: 'Coral',
      mentionPrefix: '@coral',
      currentRequest: 'test',
      recentEmotions: ['confident', 'neutral', 'confident'],
    });

    expect(prompt).toContain('Consistency Context');
    expect(prompt).toContain('confident, neutral, confident');
  });
});
