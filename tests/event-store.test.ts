import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import EventStore, { Event } from '../src/observability/event-store';
import { promises as fs } from 'fs';
import { resolve } from 'path';
import { tmpdir } from 'os';

describe('EventStore', () => {
  let store: EventStore;
  let testDir: string;

  beforeEach(async () => {
    testDir = resolve(tmpdir(), `event-store-test-${Date.now()}`);
    store = new EventStore(testDir);
    await store.initialize();
  });

  afterEach(async () => {
    try {
      await fs.rm(testDir, { recursive: true });
    } catch (err) {
      // ignore
    }
  });

  describe('append', () => {
    it('should append event with auto-generated id and sequence', async () => {
      const event = await store.append({
        sessionId: 'session-1',
        type: 'tool_call',
        data: { tool: 'test' },
      });

      expect(event.id).toBeDefined();
      expect(event.sequence).toBe(1);
      expect(event.timestamp).toBeLessThanOrEqual(Date.now());
    });

    it('should increment sequence per session', async () => {
      const e1 = await store.append({
        sessionId: 'session-1',
        type: 'tool_call',
        data: {},
      });
      const e2 = await store.append({
        sessionId: 'session-1',
        type: 'llm_response',
        data: {},
      });
      const e3 = await store.append({
        sessionId: 'session-2',
        type: 'tool_call',
        data: {},
      });

      expect(e1.sequence).toBe(1);
      expect(e2.sequence).toBe(2);
      expect(e3.sequence).toBe(1); // Different session, restarts at 1
    });

    it('should persist event to file', async () => {
      await store.append({
        sessionId: 'session-1',
        type: 'tool_call',
        data: { foo: 'bar' },
      });

      const logFile = resolve(testDir, 'session-session-1.jsonl');
      const content = await fs.readFile(logFile, 'utf-8');
      const parsed = JSON.parse(content.trim());

      expect(parsed.type).toBe('tool_call');
      expect(parsed.data.foo).toBe('bar');
    });
  });

  describe('query', () => {
    beforeEach(async () => {
      for (let i = 0; i < 5; i++) {
        await store.append({
          sessionId: 'session-1',
          type: i % 2 === 0 ? 'tool_call' : 'llm_response',
          data: { index: i },
        });
      }
    });

    it('should query all events', async () => {
      const { events } = await store.query('session-1', { limit: 100 });
      expect(events).toHaveLength(5);
      expect(events[0].sequence).toBe(1);
      expect(events[4].sequence).toBe(5);
    });

    it('should paginate with limit', async () => {
      const { events: page1, nextCursor } = await store.query('session-1', { limit: 2 });
      expect(page1).toHaveLength(2);
      expect(nextCursor).toBeDefined();

      const { events: page2 } = await store.query('session-1', { limit: 2, cursor: nextCursor });
      expect(page2).toHaveLength(2);
      expect(page2[0].sequence).toBe(3);
    });

    it('should filter by type', async () => {
      const { events } = await store.query('session-1', {
        limit: 100,
        type: 'tool_call',
      });
      expect(events).toHaveLength(3); // indices 0, 2, 4
      expect(events.every(e => e.type === 'tool_call')).toBe(true);
    });

    it('should filter by time range', async () => {
      const before = Date.now();
      const event = await store.append({
        sessionId: 'session-1',
        type: 'memory_update',
        data: {},
      });
      const after = Date.now();

      const { events } = await store.query('session-1', {
        limit: 100,
        startTime: before,
        endTime: after,
      });

      expect(events.some(e => e.id === event.id)).toBe(true);
    });

    it('should return empty for non-existent session', async () => {
      const { events } = await store.query('nonexistent', { limit: 100 });
      expect(events).toHaveLength(0);
    });
  });

  describe('verifyOrdering', () => {
    it('should detect valid ordering', async () => {
      for (let i = 0; i < 5; i++) {
        await store.append({
          sessionId: 'session-1',
          type: 'tool_call',
          data: {},
        });
      }

      const { isValid, gaps } = await store.verifyOrdering('session-1');
      expect(isValid).toBe(true);
      expect(gaps).toHaveLength(0);
    });

    it('should report gaps if detected', async () => {
      const logFile = resolve(testDir, 'session-session-2.jsonl');
      const events = [
        { id: '1', sequence: 1, timestamp: Date.now(), type: 'tool_call', data: {} },
        { id: '2', sequence: 2, timestamp: Date.now(), type: 'tool_call', data: {} },
        { id: '3', sequence: 4, timestamp: Date.now(), type: 'tool_call', data: {} }, // Gap!
      ];
      await fs.writeFile(logFile, events.map(e => JSON.stringify(e)).join('\n'));

      const { isValid, gaps } = await store.verifyOrdering('session-2');
      expect(isValid).toBe(false);
      expect(gaps).toContain(2);
    });
  });

  describe('snapshots', () => {
    it('should create snapshot', async () => {
      const snapshot = await store.rotateSnapshot('session-1');
      expect(snapshot.id).toBeDefined();
      expect(snapshot.sessionId).toBe('session-1');
      expect(snapshot.timestamp).toBeLessThanOrEqual(Date.now());
    });

    it('should retrieve latest snapshot', async () => {
      await store.rotateSnapshot('session-1');
      const later = await store.rotateSnapshot('session-1');

      const retrieved = await store.getLatestSnapshot('session-1');
      expect(retrieved?.id).toBe(later.id);
    });

    it('should return null for non-existent snapshot', async () => {
      const snapshot = await store.getLatestSnapshot('nonexistent');
      expect(snapshot).toBeNull();
    });
  });

  describe('archiveOldSessions', () => {
    it('should archive sessions older than threshold', async () => {
      const oldLogFile = resolve(testDir, 'session-old.jsonl');
      await fs.writeFile(oldLogFile, '{}');

      // Set modification time to 31 days ago
      const thirtyOneDaysAgo = Date.now() - 31 * 24 * 60 * 60 * 1000;
      await fs.utimes(oldLogFile, thirtyOneDaysAgo / 1000, thirtyOneDaysAgo / 1000);

      const archived = await store.archiveOldSessions(30);
      expect(archived).toContain('session-old.jsonl');

      // Verify file was moved
      const archiveDir = resolve(testDir, 'archive');
      const archivedFile = resolve(archiveDir, 'session-old.jsonl');
      const exists = await fs.readFile(archivedFile, 'utf-8').then(() => true).catch(() => false);
      expect(exists).toBe(true);
    });
  });

  describe('getMetrics', () => {
    beforeEach(async () => {
      for (let s = 1; s <= 3; s++) {
        for (let e = 0; e < 5; e++) {
          await store.append({
            sessionId: `session-${s}`,
            type: 'tool_call',
            data: { index: e },
          });
        }
      }
    });

    it('should report total sessions and events', async () => {
      const metrics = await store.getMetrics();
      expect(metrics.totalSessions).toBe(3);
      expect(metrics.totalEvents).toBe(15);
    });

    it('should include recent events', async () => {
      const metrics = await store.getMetrics();
      expect(metrics.recentEvents.length).toBeGreaterThan(0);
      expect(metrics.recentEvents[0].timestamp).toBeGreaterThanOrEqual(
        metrics.recentEvents[metrics.recentEvents.length - 1].timestamp
      );
    });
  });

  describe('export', () => {
    beforeEach(async () => {
      for (let i = 0; i < 3; i++) {
        await store.append({
          sessionId: 'session-1',
          type: 'tool_call',
          data: { index: i },
        });
      }
    });

    it('should export all events for session', async () => {
      const exported = await store.export('session-1');
      expect(exported).toHaveLength(3);
      expect(exported.map(e => e.sequence)).toEqual([1, 2, 3]);
    });
  });
});
