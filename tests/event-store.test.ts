/**
 * @file EventStore Tests
 * @layer tests
 */
import { describe, it, expect, beforeEach } from 'vitest';
import Database from 'better-sqlite3';

let eventCounter = 0;
function nextUuid(): string {
  eventCounter++;
  return `00000000-0000-4000-8000-${String(eventCounter).padStart(12, '0')}`;
}

describe('EventStore', () => {
  let db: any;
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
  });

  it('should append events', () => {
    store.append({
      id: nextUuid(),
      timestamp: Date.now(),
      type: 'task_created',
      payload: { goal: 'test' },
    });
    expect(store.getRecent()).toHaveLength(1);
  });

  it('should query by type', () => {
    store.append({ id: nextUuid(), timestamp: Date.now(), type: 'task_created', payload: { goal: 'a' } });
    store.append({ id: nextUuid(), timestamp: Date.now(), type: 'tool_called', payload: {} });
    const counts = store.getCountByType();
    expect(counts['task_created']).toBe(1);
  });
});
