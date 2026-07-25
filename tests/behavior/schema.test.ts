/**
 * Coral Behavior Engine — Schema Tests (Phase 0)
 * Validates BehaviorAction, BehaviorPlan, and BehaviorRule Zod schemas.
 */

import { describe, it, assert } from 'vitest';
import {
  BehaviorActionSchema,
  BehaviorPlanSchema,
  EmotionTagSchema,
  BehaviorRule,
  BehaviorPlan,
} from '../../src/core/behavior/types.js';
import { randomUUID } from 'crypto';

// ── Helpers ──

function basePlan(overrides: Partial<BehaviorPlan> = {}): BehaviorPlan {
  return {
    id: randomUUID(),
    timestamp: Date.now(),
    sourceEventId: randomUUID(),
    sourceEventType: 'task_finished',
    taskId: randomUUID(),
    actions: [{ type: 'celebrate' }],
    ...overrides,
  };
}

// ═══ BehaviorAction Schema ═══

describe('BehaviorAction — Schema', () => {
  it('should validate all 8 action types', () => {
    const actions = [
      { type: 'look_at', target: 'user' },
      { type: 'look_at', target: 'context' },
      { type: 'pause', ms: 500 },
      { type: 'speak', text: 'Hello world' },
      { type: 'blink' },
      { type: 'think' },
      { type: 'confirm_needed' },
      { type: 'celebrate' },
      { type: 'apologize' },
    ];

    for (const action of actions) {
      const result = BehaviorActionSchema.safeParse(action);
      assert.ok(result.success, `Action '${action.type}' should be valid`);
    }
  });

  it('should reject unknown action types', () => {
    const result = BehaviorActionSchema.safeParse({ type: 'dance' });
    assert.ok(!result.success);
  });

  it('should reject speak with empty text', () => {
    const result = BehaviorActionSchema.safeParse({ type: 'speak', text: '' });
    assert.ok(!result.success);
  });

  it('should reject pause with negative ms', () => {
    const result = BehaviorActionSchema.safeParse({ type: 'pause', ms: -100 });
    assert.ok(!result.success);
  });

  it('should reject pause with ms over 30s', () => {
    const result = BehaviorActionSchema.safeParse({ type: 'pause', ms: 31_000 });
    assert.ok(!result.success);
  });

  it('should reject look_at with invalid target', () => {
    const result = BehaviorActionSchema.safeParse({ type: 'look_at', target: 'wall' });
    assert.ok(!result.success);
  });

  it('should reject action with missing required fields', () => {
    const result = BehaviorActionSchema.safeParse({ type: 'pause' });
    assert.ok(!result.success);
  });
});

// ═══ EmotionTag Schema ═══

describe('EmotionTag — Schema', () => {
  it('should accept all 7 emotion tags', () => {
    const tags = ['neutral', 'confident', 'uncertain', 'excited', 'apologetic', 'thoughtful', 'urgent'];
    for (const tag of tags) {
      const result = EmotionTagSchema.safeParse(tag);
      assert.ok(result.success, `Emotion tag '${tag}' should be valid`);
    }
  });

  it('should reject unknown emotion tags', () => {
    const result = EmotionTagSchema.safeParse('furious');
    assert.ok(!result.success);
  });
});

// ═══ BehaviorPlan Schema ═══

describe('BehaviorPlan — Schema', () => {
  it('should validate a minimal valid plan', () => {
    const plan = basePlan();
    const result = BehaviorPlanSchema.safeParse(plan);
    assert.ok(result.success, `Plan should be valid: ${JSON.stringify(result.error)}`);
  });

  it('should validate a plan with all optional fields', () => {
    const plan = basePlan({
      emotion: 'confident',
      confidence: 0.85,
      metadata: { source: 'rule-based', version: 'v0' },
    });
    const result = BehaviorPlanSchema.safeParse(plan);
    assert.ok(result.success);
  });

  it('should validate plan with multiple actions', () => {
    const plan = basePlan({
      actions: [
        { type: 'think' },
        { type: 'pause', ms: 300 },
        { type: 'speak', text: 'Done!' },
        { type: 'celebrate' },
      ],
    });
    const result = BehaviorPlanSchema.safeParse(plan);
    assert.ok(result.success);
  });

  it('should reject plan with empty actions array', () => {
    const plan = basePlan({ actions: [] });
    const result = BehaviorPlanSchema.safeParse(plan);
    assert.ok(!result.success);
  });

  it('should reject plan with invalid action in array', () => {
    const plan = basePlan({
      actions: [{ type: 'celebrate' }, { type: 'unknown_action' } as any],
    });
    const result = BehaviorPlanSchema.safeParse(plan);
    assert.ok(!result.success);
  });

  it('should reject plan without required fields', () => {
    const result = BehaviorPlanSchema.safeParse({
      actions: [{ type: 'blink' }],
    });
    assert.ok(!result.success);
  });

  it('should reject plan with confidence > 1', () => {
    const plan = basePlan({ confidence: 1.5 });
    const result = BehaviorPlanSchema.safeParse(plan);
    assert.ok(!result.success);
  });

  it('should reject plan with negative confidence', () => {
    const plan = basePlan({ confidence: -0.1 });
    const result = BehaviorPlanSchema.safeParse(plan);
    assert.ok(!result.success);
  });

  it('should reject plan without sourceEventId', () => {
    const plan = basePlan();
    const { sourceEventId: _, ...planWithoutSourceEventId } = plan;
    const result = BehaviorPlanSchema.safeParse(planWithoutSourceEventId);
    assert.ok(!result.success);
  });

  it('should reject plan without sourceEventType', () => {
    const plan = basePlan();
    const { sourceEventType: _, ...planWithoutSourceEventType } = plan;
    const result = BehaviorPlanSchema.safeParse(planWithoutSourceEventType);
    assert.ok(!result.success);
  });
});

// ═══ BehaviorRule Interface ═══

describe('BehaviorRule — Interface', () => {
  it('should generate valid BehaviorPlan from rule', () => {
    const rule: BehaviorRule = {
      eventType: 'task_finished',
      name: 'celebrate on success',
      priority: 10,
      generate(event) {
        return basePlan({
          sourceEventId: event.id,
          sourceEventType: event.type,
          actions: [{ type: 'celebrate' }],
        });
      },
    };

    const plan = rule.generate({
      id: randomUUID(),
      type: 'task_finished',
      payload: { taskId: '123', success: true },
    });

    const result = BehaviorPlanSchema.safeParse(plan);
    assert.ok(result.success, 'Rule-generated plan should pass schema validation');
    assert.equal(result.data.actions[0].type, 'celebrate');
  });
});

// ═══ Serialization ═══

describe('BehaviorPlan — Serialization', () => {
  it('should round-trip through JSON', () => {
    const plan = basePlan({
      emotion: 'excited',
      confidence: 0.9,
      actions: [
        { type: 'think' },
        { type: 'speak', text: 'Let me check that...' },
      ],
    });

    const json = JSON.stringify(plan);
    const parsed = JSON.parse(json);
    const result = BehaviorPlanSchema.safeParse(parsed);
    assert.ok(result.success, 'Deserialized plan should be valid');
    assert.equal(result.data.actions.length, 2);
    assert.equal(result.data.emotion, 'excited');
  });
});
