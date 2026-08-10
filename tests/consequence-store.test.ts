/**
 * Coral Agent — Consequence Memory Store Tests (ADR-003 Phase 0/1)
 */

import { describe, it, beforeEach, afterEach, expect } from 'vitest';
import { randomUUID } from 'node:crypto';
import Database from 'better-sqlite3';
import { ConsequenceStore } from '../src/core/memory/consequence-store.js';
import {
  ConsequenceRecord,
  ReusePolicy,
} from '../src/core/memory/consequence-types.js';

function makeRecord(overrides: Partial<ConsequenceRecord> = {}): ConsequenceRecord {
  return {
    id: randomUUID(),
    createdAt: Date.now(),
    // Q3: userId bắt buộc — test mặc định gán user-1
    userId: 'user-1',
    sessionId: 's1',
    taskId: 't1',
    context: {},
    action: { toolName: 'default_tool' },
    outcome: 'fail',
    evidenceRef: { checkpointId: 't1' },
    reusePolicy: 'record_only',
    ...overrides,
  };
}

describe('ConsequenceStore', () => {
  let db: Database.Database;
  let store: ConsequenceStore;

  beforeEach(() => {
    db = new Database(':memory:');
    // ConsequenceStore mở DB riêng; để test isolated, ta dùng constructor tùy chỉnh.
    // Vì ConsequenceStore tự tạo schema, ta dùng path tạm trong memory qua
    // một instance riêng (constructor nhận dbPath).
    store = new ConsequenceStore(':memory:');
  });

  afterEach(() => {
    store.close();
    db.close();
  });

  it('should append and getById a record', () => {
    const rec = makeRecord({ outcome: 'fail', action: { toolName: 'browser_tool' } });
    const stored = store.append(rec);
    expect(stored.id).toBe(rec.id);
    const fetched = store.getById(rec.id);
    expect(fetched).not.toBeNull();
    expect(fetched!.action.toolName).toBe('browser_tool');
    expect(fetched!.outcome).toBe('fail');
  });

  it('should list recent records (limit + order DESC)', () => {
    const r1 = makeRecord({ createdAt: 100, action: { toolName: 'a' } });
    const r2 = makeRecord({ createdAt: 200, action: { toolName: 'b' } });
    store.append(r1);
    store.append(r2);
    const recent = store.listRecent({ limit: 1 });
    expect(recent).toHaveLength(1);
    expect(recent[0].id).toBe(r2.id); // newest first
  });

  it('should list by tool name', () => {
    store.append(makeRecord({ action: { toolName: 'execute_command' }, outcome: 'fail' }));
    store.append(makeRecord({ action: { toolName: 'execute_command' }, outcome: 'fail' }));
    store.append(makeRecord({ action: { toolName: 'read_file' }, outcome: 'success' }));
    const byTool = store.listByTool('execute_command');
    expect(byTool).toHaveLength(2);
    const other = store.listByTool('read_file');
    expect(other).toHaveLength(1);
  });

  it('should filter by session and task', () => {
    store.append(makeRecord({ sessionId: 's1', taskId: 't1' }));
    store.append(makeRecord({ sessionId: 's2', taskId: 't2' }));
    const s1 = store.listRecent({ sessionId: 's1' });
    expect(s1).toHaveLength(1);
    const t2 = store.listRecent({ taskId: 't2' });
    expect(t2).toHaveLength(1);
  });

  it('should store reusePolicy enum (no boolean)', () => {
    const rec = makeRecord({ reusePolicy: 'require_hitl' });
    store.append(rec);
    const fetched = store.getById(rec.id)!;
    expect(fetched.reusePolicy).toBe('require_hitl');
    const validPolicies: ReusePolicy[] = ['suggest', 'require_hitl', 'block', 'record_only'];
    expect(validPolicies).toContain(fetched.reusePolicy);
  });

  it('should reject invalid records (zod validation)', () => {
    const bad = makeRecord({ action: { toolName: 123 as unknown as string } });
    expect(() => store.append(bad as unknown as ConsequenceRecord)).toThrow();
  });

  it('should reject records with invalid outcome', () => {
    const bad = makeRecord({ outcome: 'unknown' as ConsequenceRecord['outcome'] });
    expect(() => store.append(bad)).toThrow();
  });
});