/**
 * Coral Behavior Engine — Engine Tests (Phase 1)
 * Validates Event → BehaviorPlan → Event pipeline.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BehaviorEngine } from '../../src/core/behavior/behavior-engine.js';
import { BehaviorPlan, BehaviorPlanSchema } from '../../src/core/behavior/types.js';
import { EventBus } from '../../src/core/events/bus.js';
import { EventFactory } from '../../src/core/events/factory.js';
import { AgentEvent, EventType } from '../../src/core/events/types.js';
import Database from 'better-sqlite3';

// ── Test Setup ──

let eventCounter = 0;
function nextUuid(): string {
  eventCounter++;
  return `00000000-0000-4000-8000-${String(eventCounter).padStart(12, '0')}`;
}

describe('BehaviorEngine', () => {
  let bus: EventBus;
  let engine: BehaviorEngine;
  let db: Database.Database;

  beforeEach(async () => {
    eventCounter = 0;
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
    engine = new BehaviorEngine(bus, { validate: true });
  });

  // ═══ Subscription ═══

  describe('subscription', () => {
    it('should subscribe to all default event types', () => {
      engine.start();
      // Default rules cover: task_started, task_finished, tool_called, error, decision_made, memory_write
      // Plus 1 emotion:annotated subscription (Phase 3)
      expect(engine.subscriptionCount).toBe(7);
    });

    it('should unsubscribe all on stop', () => {
      engine.start();
      expect(engine.subscriptionCount).toBe(7);
      engine.stop();
      expect(engine.subscriptionCount).toBe(0);
    });

    it('should handle multiple start/stop cycles', () => {
      engine.start();
      engine.stop();
      engine.start();
      expect(engine.subscriptionCount).toBe(7);
      engine.stop();
      expect(engine.subscriptionCount).toBe(0);
    });
  });

  // ═══ Rule Mapping ═══

  describe('rule mapping', () => {
    it('should generate plan on task_started', () => {
      const received: AgentEvent[] = [];
      bus.subscribe(EventType.BEHAVIOR_PLAN_GENERATED, (e) => received.push(e));

      engine.start();
      bus.publish(EventFactory.taskStarted(nextUuid(), 'test goal'));

      expect(received).toHaveLength(1);
      const plan = received[0].payload as Record<string, unknown>;
      expect(plan.sourceEventType).toBe('task_started');
      expect(Array.isArray(plan.actions)).toBe(true);
      expect((plan.actions as any[])[0].type).toBe('think');
    });

    it('should generate celebrate on task_finished success', () => {
      const received: AgentEvent[] = [];
      bus.subscribe(EventType.BEHAVIOR_PLAN_GENERATED, (e) => received.push(e));

      engine.start();
      bus.publish(EventFactory.taskFinished(nextUuid(), 'test goal', true, 1000, 'done'));

      expect(received).toHaveLength(1);
      const plan = received[0].payload as Record<string, unknown>;
      expect(plan.sourceEventType).toBe('task_finished');
      expect(plan.emotion).toBe('confident');
      const actions = plan.actions as any[];
      expect(actions.some((a: any) => a.type === 'celebrate')).toBe(true);
    });

    it('should generate apologize on task_finished failure', () => {
      const received: AgentEvent[] = [];
      bus.subscribe(EventType.BEHAVIOR_PLAN_GENERATED, (e) => received.push(e));

      engine.start();
      bus.publish(EventFactory.taskFinished(nextUuid(), 'test goal', false, 1000));

      expect(received).toHaveLength(1);
      const plan = received[0].payload as Record<string, unknown>;
      expect(plan.emotion).toBe('apologetic');
      const actions = plan.actions as any[];
      expect(actions.some((a: any) => a.type === 'apologize')).toBe(true);
    });

    it('should generate apologize on error', () => {
      const received: AgentEvent[] = [];
      bus.subscribe(EventType.BEHAVIOR_PLAN_GENERATED, (e) => received.push(e));

      engine.start();
      bus.publish(EventFactory.error('Something went wrong'));

      expect(received).toHaveLength(1);
      const plan = received[0].payload as Record<string, unknown>;
      expect(plan.emotion).toBe('apologetic');
      const actions = plan.actions as any[];
      expect(actions.some((a: any) => a.type === 'apologize')).toBe(true);
    });

    it('should generate confirm_needed on decision_made', () => {
      const received: AgentEvent[] = [];
      bus.subscribe(EventType.BEHAVIOR_PLAN_GENERATED, (e) => received.push(e));

      engine.start();
      const taskId = nextUuid();
      bus.publish(EventFactory.taskStarted(taskId, 'goal'));
      bus.publish(EventFactory.decisionMade(taskId, nextUuid(), 'approve', 'needed', 'confirm'));

      // task_started generates 1, decision_made generates 1
      expect(received.length).toBeGreaterThanOrEqual(2);
      const decisionPlan = received.find(
        e => (e.payload as any).sourceEventType === 'decision_made'
      );
      expect(decisionPlan).toBeDefined();
      const actions = (decisionPlan!.payload as any).actions as any[];
      expect(actions.some((a: any) => a.type === 'confirm_needed')).toBe(true);
    });

    it('should generate think on tool_called', () => {
      const received: AgentEvent[] = [];
      bus.subscribe(EventType.BEHAVIOR_PLAN_GENERATED, (e) => received.push(e));

      engine.start();
      const taskId = nextUuid();
      bus.publish(EventFactory.taskStarted(taskId, 'goal'));
      bus.publish(EventFactory.toolCalled(taskId, nextUuid(), nextUuid(), 'web_search', { query: 'test' }));

      const toolPlan = received.find(
        e => (e.payload as any).sourceEventType === 'tool_called'
      );
      expect(toolPlan).toBeDefined();
      const actions = (toolPlan!.payload as any).actions as any[];
      expect(actions.some((a: any) => a.type === 'think')).toBe(true);
    });
  });

  // ═══ Schema Validation ═══

  describe('schema validation', () => {
    it('should produce valid BehaviorPlan from every rule', () => {
      const received: AgentEvent[] = [];
      bus.subscribe(EventType.BEHAVIOR_PLAN_GENERATED, (e) => received.push(e));

      engine.start();

      const testEvents: AgentEvent[] = [
        EventFactory.taskStarted(nextUuid(), 'goal'),
        EventFactory.taskFinished(nextUuid(), 'goal', true, 1000),
        EventFactory.taskFinished(nextUuid(), 'goal', false, 1000),
        EventFactory.error('test error'),
        EventFactory.decisionMade(nextUuid(), nextUuid(), 'yes', 'because', 'next'),
        EventFactory.toolCalled(nextUuid(), nextUuid(), nextUuid(), 'tool', {}),
        EventFactory.memoryWrite('key', 'value', 'session'),
      ];

      for (const evt of testEvents) {
        bus.publish(evt);
      }

      // Each event should produce exactly one behavior plan
      expect(received).toHaveLength(testEvents.length);

      // Validate each plan payload against schema
      for (const evt of received) {
        const payload = evt.payload as Record<string, unknown>;
        expect(payload.planId).toBeDefined();
        expect(payload.sourceEventId).toBeDefined();
        expect(payload.sourceEventType).toBeDefined();
        expect(Array.isArray(payload.actions)).toBe(true);
        expect((payload.actions as any[]).length).toBeGreaterThanOrEqual(1);
      }
    });
  });

  // ═══ Debounce ═══

  describe('debounce', () => {
    it('should debounce rapid events', () => {
      const debouncedEngine = new BehaviorEngine(bus, { debounceMs: 100 });
      const received: AgentEvent[] = [];
      bus.subscribe(EventType.BEHAVIOR_PLAN_GENERATED, (e) => received.push(e));

      debouncedEngine.start();

      // Publish two task_started events rapidly
      bus.publish(EventFactory.taskStarted(nextUuid(), 'goal 1'));
      bus.publish(EventFactory.taskStarted(nextUuid(), 'goal 2'));

      // Only first should produce a plan (second is debounced)
      expect(received).toHaveLength(1);
    });
  });

  // ═══ Custom Rules ═══

  describe('custom rules', () => {
    it('should use custom rules when provided', () => {
      const customEngine = new BehaviorEngine(bus, {
        rules: [
          {
            eventType: 'task_finished',
            name: 'custom rule',
            priority: 10,
            generate(event) {
              return {
                id: nextUuid(),
                timestamp: Date.now(),
                sourceEventId: event.id,
                sourceEventType: event.type,
                actions: [{ type: 'blink' }],
              };
            },
          },
        ],
      });

      const received: AgentEvent[] = [];
      bus.subscribe(EventType.BEHAVIOR_PLAN_GENERATED, (e) => received.push(e));

      customEngine.start();
      bus.publish(EventFactory.taskFinished(nextUuid(), 'goal', true, 1000));

      expect(received).toHaveLength(1);
      const actions = (received[0].payload as any).actions as any[];
      expect(actions[0].type).toBe('blink');
    });
  });

  // ═══ Error Handling ═══

  describe('error handling', () => {
    it('should not throw on rule errors', () => {
      const brokenEngine = new BehaviorEngine(bus, {
        rules: [
          {
            eventType: 'task_started',
            name: 'broken rule',
            priority: 10,
            generate() {
              throw new Error('rule is broken');
            },
          },
        ],
      });

      brokenEngine.start();

      // Should not throw
      expect(() => {
        bus.publish(EventFactory.taskStarted(nextUuid(), 'goal'));
      }).not.toThrow();
    });

    it('should skip invalid plans (validation enabled)', () => {
      const brokenEngine = new BehaviorEngine(bus, {
        validate: true,
        rules: [
          {
            eventType: 'task_started',
            name: 'invalid plan rule',
            priority: 10,
            generate(event) {
              return {
                // Missing required fields
                id: 'not-a-uuid',
                actions: [],
              } as any;
            },
          },
        ],
      });

      const received: AgentEvent[] = [];
      bus.subscribe(EventType.BEHAVIOR_PLAN_GENERATED, (e) => received.push(e));

      brokenEngine.start();
      bus.publish(EventFactory.taskStarted(nextUuid(), 'goal'));

      // Invalid plan should be skipped, no behavior_plan_generated published
      expect(received).toHaveLength(0);
    });
  });

  // ═══ Latency Budget ═══

  describe('latency', () => {
    it('should generate plan in < 5ms (rule-based)', () => {
      engine.start();

      const start = performance.now();
      bus.publish(EventFactory.taskFinished(nextUuid(), 'goal', true, 1000));
      const elapsed = performance.now() - start;

      expect(elapsed).toBeLessThan(5);
    });
  });
});
