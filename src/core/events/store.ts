/**
 * @file Event Store — SQLite WAL persistence for agent events
 * @layer core
 * @created 2026-06-20
 */

import Database from 'better-sqlite3';
import { AgentEvent } from './types.js';

export interface EventFilter {
  types?: string[];
  taskId?: string;
  startTime?: number;
  endTime?: number;
  limit?: number;
  offset?: number;
}

export class EventStore {
  private db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
  }

  /**
   * Append event to store
   */
  append(event: AgentEvent): void {
    const stmt = this.db.prepare(`
      INSERT INTO agent_events (id, timestamp, type, payload, metadata)
      VALUES (?, ?, ?, ?, ?)
    `);

    stmt.run(
      event.id,
      event.timestamp,
      event.type,
      JSON.stringify(event.payload),
      event.metadata ? JSON.stringify(event.metadata) : null
    );
  }

  /**
   * Query events with filters
   */
  query(filter: EventFilter = {}): AgentEvent[] {
    let sql = 'SELECT * FROM agent_events WHERE 1=1';
    const params: any[] = [];

    if (filter.types?.length) {
      sql += ` AND type IN (${filter.types.map(() => '?').join(',')})`;
      params.push(...filter.types);
    }

    if (filter.taskId) {
      sql += " AND json_extract(payload, '$.taskId') = ?";
      params.push(filter.taskId);
    }

    if (filter.startTime) {
      sql += ' AND timestamp >= ?';
      params.push(filter.startTime);
    }

    if (filter.endTime) {
      sql += ' AND timestamp <= ?';
      params.push(filter.endTime);
    }

    sql += ' ORDER BY timestamp DESC';

    if (filter.limit) {
      sql += ' LIMIT ?';
      params.push(filter.limit);
    }

    if (filter.offset) {
      sql += ' OFFSET ?';
      params.push(filter.offset);
    }

    const rows = this.db.prepare(sql).all(...params) as any[];

    return rows.map(row => ({
      id: row.id,
      timestamp: row.timestamp,
      type: row.type,
      payload: JSON.parse(row.payload),
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
    }));
  }

  /**
   * Get events by task ID
   */
  getByTask(taskId: string): AgentEvent[] {
    return this.query({ taskId });
  }

  /**
   * Get recent events
   */
  getRecent(limit: number = 50): AgentEvent[] {
    return this.query({ limit });
  }

  /**
   * Get event count by type
   */
  getCountByType(): Record<string, number> {
    const rows = this.db.prepare(`
      SELECT type, COUNT(*) as count
      FROM agent_events
      GROUP BY type
    `).all() as any[];

    return rows.reduce((acc: Record<string, number>, row: any) => {
      acc[row.type] = row.count;
      return acc;
    }, {} as Record<string, number>);
  }

  /**
   * Clear old events (for maintenance)
   */
  clearOld(olderThanDays: number = 30): number {
    const cutoff = Date.now() - olderThanDays * 24 * 60 * 60 * 1000;
    const result = this.db.prepare('DELETE FROM agent_events WHERE timestamp < ?').run(cutoff);
    return result.changes;
  }

  /**
   * Prune old events automatically — keeps only the most recent N events
   * plus events newer than `keepDays`. Called from periodic flush.
   */
  prune(keepDays: number = 14, maxEvents: number = 10000): { deletedOld: number; deletedOver: number } {
    const result = { deletedOld: 0, deletedOver: 0 };
    // 1. Delete events older than keepDays
    const cutoff = Date.now() - keepDays * 24 * 60 * 60 * 1000;
    result.deletedOld = this.db.prepare('DELETE FROM agent_events WHERE timestamp < ?').run(cutoff).changes;
    // 2. If still over maxEvents, delete oldest
    const count = (this.db.prepare('SELECT COUNT(*) as c FROM agent_events').get() as any).c;
    if (count > maxEvents) {
      const excess = count - maxEvents;
      this.db.prepare(
        'DELETE FROM agent_events WHERE id IN (SELECT id FROM agent_events ORDER BY timestamp ASC LIMIT ?)'
      ).run(excess);
      result.deletedOver = excess;
    }
    return result;
  }
}
