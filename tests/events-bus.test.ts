/**
 * @file EventBus Tests
 * @layer tests
 * @owner events
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EventBus } from '../src/core/events/bus.js';
import { AgentEvent, EventType } from '../src/core/events/types.js';
import Database from 'better-sqlite3';

let eventCounter = 0;
function nextUuid(): string {
  eventCounter++;
  return `00000000-0000-4000-8000-${String(eventCounter).padStart(12, '0')}`;
}

function createTestEvent(): AgentEvent {
  return {
    id: nextUuid(),
    timestamp: Date.now(),
    type: EventType.TASK_CREATED,
    payload: { goal: 'test task' },
  };
}

describe('EventBus', () => {
  let bus: EventBus;
  let db: Database.Database;
  let store: any;

  beforeEach(async () => {
    const { EventStore } = await import('../src/core/events/store.js');
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
    store = new EventStore(db);
    bus = new EventBus(store);
  });

  describe('publish', () => {
    it('should store event in store', () => {
      bus.publish(createTestEvent());
      expect(bus.getRecent()).toHaveLength(1);
    });

    it('should notify type-specific handlers', () => {
      const handler = vi.fn();
      bus.subscribe(EventType.TASK_CREATED, handler);
      bus.publish(createTestEvent());
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should notify global handlers for all events', () => {
      const handler = vi.fn();
      bus.subscribeAll(handler);
      bus.publish(createTestEvent());
      bus.publish(createTestEvent());
      expect(handler).toHaveBeenCalledTimes(2);
    });

    it('should not call other type handlers', () => {
      const handler = vi.fn();
      bus.subscribe(EventType.TOOL_CALLED, handler);
      bus.publish(createTestEvent());
      expect(handler).not.toHaveBeenCalled();
    });

    it('should reject invalid uuid', () => {
      const invalid = {
        id: 'not-a-uuid',
        timestamp: Date.now(),
        type: EventType.TASK_CREATED,
        payload: { goal: 'test' },
      } as AgentEvent;
      bus.publish(invalid);
      expect(bus.getRecent()).toHaveLength(0);
    });
  });

  describe('subscribe', () => {
    it('should support multiple handlers', () => {
      const h1 = vi.fn();
      const h2 = vi.fn();
      bus.subscribe(EventType.TASK_CREATED, h1);
      bus.subscribe(EventType.TASK_CREATED, h2);
      bus.publish(createTestEvent());
      expect(h1).toHaveBeenCalledTimes(1);
      expect(h2).toHaveBeenCalledTimes(1);
    });

    it('should unsubscribe correctly', () => {
      const handler = vi.fn();
      const unsub = bus.subscribe(EventType.TASK_CREATED, handler);
      bus.publish(createTestEvent());
      expect(handler).toHaveBeenCalledTimes(1);
      unsub();
      bus.publish(createTestEvent());
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should return unsubscribe function', () => {
      expect(typeof bus.subscribe(EventType.TASK_CREATED, () => {})).toBe('function');
    });
  });

  describe('subscribeAll', () => {
    it('should unsubscribe global handlers', () => {
      const handler = vi.fn();
      const unsub = bus.subscribeAll(handler);
      bus.publish(createTestEvent());
      expect(handler).toHaveBeenCalledTimes(1);
      unsub();
      bus.publish(createTestEvent());
      expect(handler).toHaveBeenCalledTimes(1);
    });
  });

  describe('error handling', () => {
    it('should not crash on handler error', () => {
      const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
      bus.subscribe(EventType.TASK_CREATED, () => { throw new Error('boom'); });
      expect(() => bus.publish(createTestEvent())).not.toThrow();
      spy.mockRestore();
    });
  });

  describe('query', () => {
    it('should get count by type', () => {
      bus.publish(createTestEvent());
      bus.publish(createTestEvent());
      const counts = bus.getCountByType();
      expect(counts[EventType.TASK_CREATED]).toBe(2);
    });
  });
});
