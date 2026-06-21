/**
 * Event Store: Immutable append-log for all Coral operations
 * - Append-only log of events (tool calls, LLM responses, memory updates)
 * - Snapshot rotation every N events to prevent log bloat
 * - Session isolation via sessionId
 * - Sequence numbering for ordering verification
 */

import { promises as fs } from 'fs';
import { resolve } from 'path';
import { randomUUID } from 'crypto';

export interface Event {
  id: string;
  sessionId: string;
  timestamp: number;
  sequence: number;
  type: 'tool_call' | 'llm_response' | 'memory_update' | 'error' | 'health_check' | 'snapshot';
  data: Record<string, unknown>;
  metadata?: {
    userId?: string;
    platform?: string;
    duration?: number;
    tokens?: number;
  };
}

export interface Snapshot {
  id: string;
  sessionId: string;
  timestamp: number;
  eventCount: number;
  state: Record<string, unknown>;
}

export class EventStore {
  private logDir: string;
  private snapshotThreshold: number = 1000;
  private eventSequences: Map<string, number> = new Map();

  constructor(logDir: string = './data/events') {
    this.logDir = logDir;
  }

  async initialize(): Promise<void> {
    await fs.mkdir(this.logDir, { recursive: true });
    await fs.mkdir(resolve(this.logDir, 'snapshots'), { recursive: true });
  }

  /**
   * Append event to log
   */
  async append(event: Omit<Event, 'id' | 'sequence' | 'timestamp'>): Promise<Event> {
    const sequence = (this.eventSequences.get(event.sessionId) ?? 0) + 1;
    this.eventSequences.set(event.sessionId, sequence);

    const fullEvent: Event = {
      ...event,
      id: randomUUID(),
      sequence,
      timestamp: Date.now(),
    };

    const logFile = resolve(this.logDir, `session-${event.sessionId}.jsonl`);
    await fs.appendFile(logFile, JSON.stringify(fullEvent) + '\n');

    if (sequence % this.snapshotThreshold === 0) {
      await this.rotateSnapshot(event.sessionId);
    }

    return fullEvent;
  }

  /**
   * Query events for a session (cursor-based pagination)
   */
  async query(
    sessionId: string,
    options: {
      limit?: number;
      cursor?: string;
      type?: Event['type'];
      startTime?: number;
      endTime?: number;
    } = {}
  ): Promise<{ events: Event[]; nextCursor?: string }> {
    const { limit = 100, cursor, type, startTime, endTime } = options;

    const logFile = resolve(this.logDir, `session-${sessionId}.jsonl`);
    let events: Event[] = [];

    try {
      const content = await fs.readFile(logFile, 'utf-8');
      events = content
        .split('\n')
        .filter(Boolean)
        .map(line => JSON.parse(line));
    } catch (err) {
      return { events: [] };
    }

    let startIdx = 0;
    if (cursor) {
      const cursorIdx = events.findIndex(e => e.id === cursor);
      startIdx = cursorIdx >= 0 ? cursorIdx + 1 : 0;
    }

    let filtered = events.slice(startIdx);
    if (type) {
      filtered = filtered.filter(e => e.type === type);
    }
    if (startTime) {
      filtered = filtered.filter(e => e.timestamp >= startTime);
    }
    if (endTime) {
      filtered = filtered.filter(e => e.timestamp <= endTime);
    }

    const page = filtered.slice(0, limit);
    const nextCursor = page.length === limit && filtered.length > limit
      ? page[page.length - 1]?.id
      : undefined;

    return { events: page, nextCursor };
  }

  /**
   * Create snapshot for session
   */
  async rotateSnapshot(sessionId: string): Promise<Snapshot> {
    const snapshot: Snapshot = {
      id: randomUUID(),
      sessionId,
      timestamp: Date.now(),
      eventCount: this.eventSequences.get(sessionId) ?? 0,
      state: {},
    };

    const snapshotFile = resolve(
      this.logDir,
      'snapshots',
      `session-${sessionId}-${snapshot.eventCount}.json`
    );
    await fs.writeFile(snapshotFile, JSON.stringify(snapshot, null, 2));

    return snapshot;
  }

  /**
   * Get latest snapshot for session
   */
  async getLatestSnapshot(sessionId: string): Promise<Snapshot | null> {
    const snapshotDir = resolve(this.logDir, 'snapshots');
    const files = await fs.readdir(snapshotDir);

    const sessionSnapshots = files
      .filter(f => f.startsWith(`session-${sessionId}-`))
      .sort()
      .reverse();

    if (!sessionSnapshots.length) return null;

    const snapshotFile = resolve(snapshotDir, sessionSnapshots[0]);
    const content = await fs.readFile(snapshotFile, 'utf-8');
    return JSON.parse(content);
  }

  /**
   * Verify event ordering
   */
  async verifyOrdering(sessionId: string): Promise<{ isValid: boolean; gaps: number[] }> {
    const { events } = await this.query(sessionId, { limit: 10000 });

    const gaps: number[] = [];
    for (let i = 1; i < events.length; i++) {
      if (events[i].sequence !== events[i - 1].sequence + 1) {
        gaps.push(events[i - 1].sequence);
      }
    }

    return {
      isValid: gaps.length === 0,
      gaps,
    };
  }

  /**
   * Archive old sessions (>30 days)
   */
  async archiveOldSessions(daysThreshold: number = 30): Promise<string[]> {
    const cutoff = Date.now() - daysThreshold * 24 * 60 * 60 * 1000;
    const archived: string[] = [];

    const files = await fs.readdir(this.logDir);
    for (const file of files) {
      if (!file.startsWith('session-') || file.endsWith('.json')) continue;

      const filePath = resolve(this.logDir, file);
      const stat = await fs.stat(filePath);
      if (stat.mtime.getTime() < cutoff) {
        const archiveDir = resolve(this.logDir, 'archive');
        await fs.mkdir(archiveDir, { recursive: true });
        await fs.rename(filePath, resolve(archiveDir, file));
        archived.push(file);
      }
    }

    return archived;
  }

  /**
   * Export events as JSON
   */
  async export(sessionId: string): Promise<Event[]> {
    const { events } = await this.query(sessionId, { limit: 100000 });
    return events;
  }

  /**
   * Get metrics for dashboard
   */
  async getMetrics(): Promise<{
    totalSessions: number;
    totalEvents: number;
    recentEvents: Event[];
  }> {
    const files = await fs.readdir(this.logDir);
    const sessionFiles = files.filter(f => f.startsWith('session-') && f.endsWith('.jsonl'));

    let totalEvents = 0;
    const recentEvents: Event[] = [];

    for (const file of sessionFiles) {
      const filePath = resolve(this.logDir, file);
      const content = await fs.readFile(filePath, 'utf-8');
      const events = content.split('\n').filter(Boolean).map(l => JSON.parse(l));
      totalEvents += events.length;
      recentEvents.push(...events.slice(-10));
    }

    return {
      totalSessions: sessionFiles.length,
      totalEvents,
      recentEvents: recentEvents.sort((a, b) => b.timestamp - a.timestamp).slice(0, 20),
    };
  }
}

export default EventStore;
