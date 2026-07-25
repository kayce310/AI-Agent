/**
 * @file Behavior Engine — Rule-based event → BehaviorPlan pipeline
 * @layer core/behavior
 * @created 2026-07-22
 * @phase Phase 1 — MVP rule-based, zero LLM cost
 *
 * Subscribes to existing EventBus events.
 * Generates BehaviorPlan published as `behavior_plan_generated`.
 * Does NOT modify EventBus.publish() — only adds a subscriber.
 */

import { randomUUID } from 'crypto';
import {
  BehaviorPlan,
  BehaviorPlanSchema,
  BehaviorAction,
  BehaviorRule,
  EmotionTag,
  mapEmotionToActions,
} from './types.js';
import { EventBus } from '../events/bus.js';
import { EventFactory } from '../events/factory.js';
import { Logger } from '../logger.js';
import type { HookRegistry } from '../hooks.js';
import { EventType } from '../events/types.js';

const log = new Logger({ module: 'BehaviorEngine' });

// ═══ DEFAULT RULES ═══
// Rule-based mapping: event type → BehaviorPlan actions.
// Phase 3 replaces this with LLM-annotated emotion signal.

function createDefaultRules(): BehaviorRule[] {
  return [
    // ── Task lifecycle ──
    {
      eventType: 'task_started',
      name: 'thinking on task start',
      priority: 10,
      generate(event) {
        return {
          id: randomUUID(),
          timestamp: Date.now(),
          sourceEventId: event.id,
          sourceEventType: event.type,
          taskId: (event.payload as Record<string, unknown>)?.taskId as string,
          actions: [
            { type: 'think' },
            { type: 'look_at', target: 'user' },
          ],
          emotion: 'thoughtful',
          confidence: 0.8,
        };
      },
    },
    {
      eventType: 'task_finished',
      name: 'celebrate or apologize on task finish',
      priority: 10,
      generate(event) {
        const payload = event.payload as Record<string, unknown>;
        const success = payload.success as boolean;
        const actions: BehaviorAction[] = [];

        if (success) {
          actions.push({ type: 'celebrate' });
          actions.push({ type: 'speak', text: 'Task completed successfully.' });
        } else {
          actions.push({ type: 'apologize' });
          actions.push({ type: 'speak', text: 'Task encountered an issue.' });
        }

        return {
          id: randomUUID(),
          timestamp: Date.now(),
          sourceEventId: event.id,
          sourceEventType: event.type,
          taskId: payload.taskId as string,
          actions,
          emotion: success ? 'confident' : 'apologetic',
          confidence: 0.7,
        };
      },
    },

    // ── Tool calls ──
    {
      eventType: 'tool_called',
      name: 'thinking on tool call',
      priority: 5,
      generate(event) {
        const payload = event.payload as Record<string, unknown>;
        return {
          id: randomUUID(),
          timestamp: Date.now(),
          sourceEventId: event.id,
          sourceEventType: event.type,
          taskId: payload.taskId as string,
          actions: [
            { type: 'think' },
            { type: 'blink' },
          ],
          emotion: 'thoughtful',
          confidence: 0.6,
        };
      },
    },

    // ── Errors ──
    {
      eventType: 'error',
      name: 'apologize on error',
      priority: 20, // higher priority — errors should always trigger
      generate(event) {
        const payload = event.payload as Record<string, unknown>;
        const message = (payload.message as string) || 'An error occurred.';
        return {
          id: randomUUID(),
          timestamp: Date.now(),
          sourceEventId: event.id,
          sourceEventType: event.type,
          actions: [
            { type: 'apologize' },
            { type: 'speak', text: message.length > 100 ? message.slice(0, 100) + '...' : message },
          ],
          emotion: 'apologetic',
          confidence: 0.9,
        };
      },
    },

    // ── HITL (Human-in-the-loop) ──
    {
      eventType: 'decision_made',
      name: 'confirm needed for HITL decisions',
      priority: 15,
      generate(event) {
        const payload = event.payload as Record<string, unknown>;
        return {
          id: randomUUID(),
          timestamp: Date.now(),
          sourceEventId: event.id,
          sourceEventType: event.type,
          taskId: payload.taskId as string,
          actions: [
            { type: 'confirm_needed' },
            { type: 'look_at', target: 'user' },
          ],
          emotion: 'uncertain',
          confidence: 0.5,
        };
      },
    },

    // ── Memory writes ──
    {
      eventType: 'memory_write',
      name: 'brief think on memory write',
      priority: 1,
      generate(event) {
        return {
          id: randomUUID(),
          timestamp: Date.now(),
          sourceEventId: event.id,
          sourceEventType: event.type,
          actions: [
            { type: 'blink' },
          ],
          emotion: 'neutral',
          confidence: 0.4,
        };
      },
    },
  ];
}

// ═══ BEHAVIOR ENGINE ═══

export interface BehaviorEngineOptions {
  /** Custom rules override defaults */
  rules?: BehaviorRule[];
  /** Minimum ms between emitting behavior plans (debounce) */
  debounceMs?: number;
  /** Whether to validate plans against schema before publishing */
  validate?: boolean;
  /** Over-expression threshold (0-1, default 0.3) — if celebrate+apologize > this ratio, flag */
  overExpressionThreshold?: number;
  /** Enable emotion-based action mapping (Phase 3) */
  emotionMapping?: boolean;
  /** Optional HookRegistry to receive emotion annotations from agent.ts */
  hooks?: HookRegistry;
}

// ═══ EMOTION STATS ═══

export interface EmotionStats {
  totalPlans: number;
  byTag: Record<string, number>;
  celebrateCount: number;
  apologizeCount: number;
  overExpressionRatio: number;
  isOverExpressed: boolean;
  lastUpdated: number;
}

function createEmptyStats(): EmotionStats {
  return {
    totalPlans: 0,
    byTag: {},
    celebrateCount: 0,
    apologizeCount: 0,
    overExpressionRatio: 0,
    isOverExpressed: false,
    lastUpdated: Date.now(),
  };
}

export class BehaviorEngine {
  private bus: EventBus;
  private rules: BehaviorRule[];
  private debounceMs: number;
  private validate: boolean;
  private lastEmit = 0;
  private unsubscribers: (() => void)[] = [];
  // Phase 3: emotion tracking
  private emotionMapping: boolean;
  private overExpressionThreshold: number;
  private emotionStats: EmotionStats;
  private pendingEmotionTag: EmotionTag | null = null;
  private hookUnsubscribers: (() => void)[] = [];

  constructor(bus: EventBus, options: BehaviorEngineOptions = {}) {
    this.bus = bus;
    this.rules = (options.rules ?? createDefaultRules())
      .sort((a, b) => b.priority - a.priority);
    this.debounceMs = options.debounceMs ?? 0;
    this.validate = options.validate ?? true;
    this.emotionMapping = options.emotionMapping ?? true;
    this.overExpressionThreshold = options.overExpressionThreshold ?? 0.3;
    this.emotionStats = createEmptyStats();

    // Phase 3: If HookRegistry provided, subscribe to emotion:annotated hook
    if (options.hooks) {
      const unsub = options.hooks.on('emotion:annotated' as any, async (ctx: any) => {
        const tag = ctx?.data?.emotionTag as string;
        if (tag && typeof tag === 'string') {
          this.pendingEmotionTag = tag as EmotionTag;
        }
      });
      this.hookUnsubscribers.push(unsub);
    }
  }

  /**
   * Start listening to EventBus events.
   * Call once during application bootstrap.
   */
  start(): void {
    const eventTypes = [...new Set(this.rules.map(r => r.eventType))];

    for (const eventType of eventTypes) {
      const unsub = this.bus.subscribe(eventType, (event) => {
        this.handleEvent(event);
      });
      this.unsubscribers.push(unsub);
    }

    // Phase 3: Subscribe to emotion_annotated events from agent.ts
    const unsubEmotion = this.bus.subscribe('emotion_annotated', (event) => {
      const payload = event.payload as Record<string, unknown>;
      const tag = payload.emotionTag as string;
      if (tag && typeof tag === 'string') {
        this.pendingEmotionTag = tag as EmotionTag;
      }
    });
    this.unsubscribers.push(unsubEmotion);
  }

  /**
   * Stop listening and clean up.
   */
  stop(): void {
    for (const unsub of this.unsubscribers) {
      unsub();
    }
    this.unsubscribers = [];
    for (const unsub of this.hookUnsubscribers) {
      unsub();
    }
    this.hookUnsubscribers = [];
  }

  /**
   * Get count of active subscriptions.
   */
  get subscriptionCount(): number {
    return this.unsubscribers.length;
  }

  // ── Internal ──

  private handleEvent(event: { id: string; type: string; payload: Record<string, unknown> }): void {
    // Ignore emotion_annotated events (handled separately in start())
    if (event.type === 'emotion_annotated') return;

    // Debounce check
    const now = Date.now();
    if (this.debounceMs > 0 && now - this.lastEmit < this.debounceMs) {
      return;
    }

    // Find highest priority matching rule
    const rule = this.rules.find(r => r.eventType === event.type);
    if (!rule) return;

    try {
      let plan = rule.generate(event);

      // Phase 3: Apply emotion-based action mapping if enabled and tag available
      if (this.emotionMapping && this.pendingEmotionTag) {
        const emotionTag = this.pendingEmotionTag;
        this.pendingEmotionTag = null; // consume the tag

        const remappedActions = mapEmotionToActions(emotionTag, plan.actions);
        plan = {
          ...plan,
          actions: remappedActions,
          emotion: emotionTag,
          confidence: Math.min(1.0, (plan.confidence || 0.5) + 0.2),
        };

        log.info(`[BehaviorEngine] Emotion override: ${emotionTag} → ${remappedActions.map(a => a.type).join(', ')}`);
      }

      // Optional schema validation
      if (this.validate) {
        const result = BehaviorPlanSchema.safeParse(plan);
        if (!result.success) {
          console.error(`[BehaviorEngine] Invalid plan from rule '${rule.name}':`, result.error.issues);
          return;
        }
        plan = result.data;
      }

      // Phase 3: Track emotion stats
      this.updateEmotionStats(plan);

      this.lastEmit = now;

      // Publish as behavior_plan_generated event via EventFactory
      const behaviorEvent = EventFactory.behaviorPlanGenerated(plan);
      this.bus.publish(behaviorEvent);
    } catch (error) {
      console.error(`[BehaviorEngine] Rule '${rule.name}' failed:`, error);
    }
  }

  // ── Phase 3: Emotion Stats ──

  /**
   * Get current emotion statistics for monitoring.
   */
  getEmotionStats(): EmotionStats {
    return { ...this.emotionStats };
  }

  /**
   * Manually inject an emotion tag (for testing or external annotation).
   */
  setPendingEmotionTag(tag: EmotionTag | null): void {
    this.pendingEmotionTag = tag;
  }

  private updateEmotionStats(plan: BehaviorPlan): void {
    const stats = this.emotionStats;
    stats.totalPlans++;
    stats.lastUpdated = Date.now();

    // Count by tag
    const tag = plan.emotion || 'neutral';
    stats.byTag[tag] = (stats.byTag[tag] || 0) + 1;

    // Count celebrate/apologize actions for over-expression check
    for (const action of plan.actions) {
      if (action.type === 'celebrate') stats.celebrateCount++;
      if (action.type === 'apologize') stats.apologizeCount++;
    }

    // Calculate over-expression ratio
    if (stats.totalPlans > 0) {
      const expressiveCount = stats.celebrateCount + stats.apologizeCount;
      stats.overExpressionRatio = expressiveCount / stats.totalPlans;
      stats.isOverExpressed = stats.overExpressionRatio > this.overExpressionThreshold;
    }

    // Publish stats event every 10 plans
    if (stats.totalPlans % 10 === 0) {
      this.publishEmotionStats(stats);
    }
  }

  private publishEmotionStats(stats: EmotionStats): void {
    try {
      const event = {
        id: randomUUID(),
        timestamp: Date.now(),
        type: 'behavior_emotion_stats',
        payload: { ...stats },
        metadata: { source: 'behavior-engine', version: '3.0' },
      };
      this.bus.publish(event as any);
    } catch {
      // Stats publishing is best-effort
    }
  }
}
