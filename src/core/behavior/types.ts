/**
 * @file Behavior Engine — Types & Zod Schemas
 * @layer core/behavior
 * @created 2026-07-22
 * @phase Phase 0 — Schema definition (no runtime logic)
 *
 * Virtual-first, platform-agnostic behavior plan schema.
 * Renderer (dashboard, Telegram, physical) consumes this output.
 * Behavior Engine never knows which platform it runs on.
 */

import { z } from 'zod';

// ═══ BEHAVIOR ACTIONS ═══
// Minimal v0 vocabulary — extend as Phase 1-3 validate each action.

export const LookAtSchema = z.object({
  type: z.literal('look_at'),
  target: z.enum(['user', 'context']),
});

export const PauseSchema = z.object({
  type: z.literal('pause'),
  ms: z.number().int().min(0).max(30_000),
});

export const SpeakSchema = z.object({
  type: z.literal('speak'),
  text: z.string().min(1).max(2000),
});

export const BlinkSchema = z.object({
  type: z.literal('blink'),
});

export const ThinkSchema = z.object({
  type: z.literal('think'),
});

export const ConfirmNeededSchema = z.object({
  type: z.literal('confirm_needed'),
});

export const CelebrateSchema = z.object({
  type: z.literal('celebrate'),
});

export const ApologizeSchema = z.object({
  type: z.literal('apologize'),
});

export const BehaviorActionSchema = z.discriminatedUnion('type', [
  LookAtSchema,
  PauseSchema,
  SpeakSchema,
  BlinkSchema,
  ThinkSchema,
  ConfirmNeededSchema,
  CelebrateSchema,
  ApologizeSchema,
]);

export type BehaviorAction = z.infer<typeof BehaviorActionSchema>;

// ═══ EMOTION TAG ═══
// Phase 3: LLM self-annotation populates this.
// Phase 0-1: optional, rule-based leaves it undefined.
// Vocabulary v0 (fixed before coding, see roadmap):
//   confident, uncertain, apologetic, neutral, enthusiastic, excited, thoughtful, urgent

export const EmotionTagSchema = z.enum([
  'neutral',
  'confident',
  'uncertain',
  'excited',
  'enthusiastic',  // Phase 3: celebrate + speak
  'apologetic',
  'thoughtful',
  'urgent',
]);

export type EmotionTag = z.infer<typeof EmotionTagSchema>;

// All valid emotion tag values for quick lookup (used by parser)
export const VALID_EMOTION_TAGS = new Set<string>(EmotionTagSchema.options);

// ═══ EMOTION → ACTION MAPPING (Phase 3) ═══
// Maps LLM emotion_tag to BehaviorAction overrides.
// Falls back to rule-based (Phase 1) if emotion_tag is missing/invalid.
// Backlog Phase 3.1: "confused" vs "uncertain" distinction — not in v0.

export interface EmotionActionMapping {
  actions: BehaviorAction[];
  confidence: number;
}

export function mapEmotionToActions(
  emotion: EmotionTag,
  ruleBasedActions: BehaviorAction[],
): BehaviorAction[] {
  switch (emotion) {
    case 'uncertain':
      // Longer think, no celebrate — even if rule says celebrate
      return [
        { type: 'think' },
        { type: 'pause', ms: 2000 },
        ...ruleBasedActions.filter(a => a.type !== 'celebrate'),
      ];

    case 'apologetic':
      return [
        { type: 'apologize' },
        { type: 'speak', text: 'I apologize for the inconvenience.' },
      ];

    case 'enthusiastic':
      return [
        { type: 'celebrate' },
        { type: 'speak', text: 'Great news!' },
      ];

    case 'confident':
      return [
        { type: 'speak', text: '' },
        ...ruleBasedActions.filter(a => a.type !== 'celebrate'),
      ];

    case 'neutral':
      // Default — use rule-based actions unchanged
      return ruleBasedActions;

    case 'excited':
      return [
        { type: 'celebrate' },
        { type: 'speak', text: '' },
      ];

    case 'thoughtful':
      return [
        { type: 'think' },
        { type: 'blink' },
      ];

    case 'urgent':
      return [
        { type: 'look_at', target: 'user' },
        { type: 'speak', text: '' },
      ];

    default:
      return ruleBasedActions;
  }
}

// ═══ BEHAVIOR PLAN ═══
// The single output type — platform-agnostic, serializable (JSON/YAML).

export const BehaviorPlanSchema = z.object({
  id: z.string().uuid(),
  timestamp: z.number().positive(),
  sourceEventId: z.string().uuid(),
  sourceEventType: z.string(),
  taskId: z.string().optional(),
  actions: z.array(BehaviorActionSchema).min(1),
  emotion: EmotionTagSchema.optional(),
  confidence: z.number().min(0).max(1).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type BehaviorPlan = z.infer<typeof BehaviorPlanSchema>;

// ═══ RULE DEFINITION ═══
// Maps an incoming event type to a BehaviorPlan generator.
// Used by BehaviorEngine in Phase 1 (rule-based).

export interface BehaviorRule {
  /** Event type to match (e.g. 'task_finished', 'error') */
  eventType: string;
  /** Human-readable rule name for logging */
  name: string;
  /** Priority — higher = evaluated first when multiple rules match */
  priority: number;
  /** Generate BehaviorPlan from the source event */
  generate(event: { id: string; type: string; payload: Record<string, unknown> }): BehaviorPlan;
}
