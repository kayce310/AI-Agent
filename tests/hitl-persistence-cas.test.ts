/**
 * Tests for Phase H2: HITL Persistence, Atomic CAS & AbortSignal
 *
 * Verifies:
 * 1. Persistent storage in SQLite (hitl_requests & hitl_audit_log tables).
 * 2. Atomic Check-and-Set (CAS) prevents duplicate decisions / races.
 * 3. AbortSignal cleanly cancels pending HITL requests.
 * 4. Recovery mechanism reloads pending requests and auto-expires past ones.
 */

import { describe, it, beforeEach, afterEach, expect } from 'vitest';
import Database from 'better-sqlite3';
import { HITLStore } from '../src/core/security/hitl-store.js';
import { HITLManager } from '../src/core/security/hitl.js';

describe('Phase H2 — HITL SQLite Persistence & Atomic CAS', () => {
  let db: Database.Database;
  let store: HITLStore;

  beforeEach(() => {
    db = new Database(':memory:');
    store = new HITLStore(db);
  });

  afterEach(() => {
    db.close();
  });

  it('1. saves and retrieves approval requests from SQLite', () => {
    const now = Date.now();
    const req = {
      id: 'hitl:test:1',
      correlation: {
        requestId: 'hitl:test:1',
        correlationToken: 'token-abc-123',
        sessionId: 's1',
        taskId: 't1',
        planId: 'p1',
      },
      action: {
        type: 'tool_call' as const,
        name: 'delete_file',
        description: 'Delete important file',
        riskLevel: 'high' as const,
      },
      status: 'pending' as const,
      requesterUserId: 'user-1',
      createdAt: now,
      expiresAt: now + 60000,
      triggerReason: 'High risk action',
    };

    store.save(req);

    const retrieved = store.get('hitl:test:1');
    expect(retrieved).toBeDefined();
    expect(retrieved?.id).toBe('hitl:test:1');
    expect(retrieved?.correlation.correlationToken).toBe('token-abc-123');
    expect(retrieved?.status).toBe('pending');
    expect(retrieved?.action.name).toBe('delete_file');
    expect(retrieved?.action.riskLevel).toBe('high');
  });

  it('2. Atomic CAS update only succeeds on expected status', () => {
    const now = Date.now();
    store.save({
      id: 'hitl:test:2',
      correlation: {
        requestId: 'hitl:test:2',
        correlationToken: 'token-2',
        sessionId: 's1',
        taskId: 't1',
      },
      action: {
        type: 'tool_call' as const,
        name: 'drop_database',
        description: 'Drop database',
        riskLevel: 'critical' as const,
      },
      status: 'pending' as const,
      requesterUserId: 'user-1',
      createdAt: now,
      expiresAt: now + 60000,
      triggerReason: 'Critical operation',
    });

    // First decision: approve (from 'pending')
    const firstDecision = store.updateStatusAtomic('hitl:test:2', 'approved', 'pending', {
      decidedBy: 'admin-1',
      approverRole: 'admin',
      channel: 'telegram',
      type: 'approve',
      reason: 'Approved by admin',
    });
    expect(firstDecision.success).toBe(true);
    expect(firstDecision.changes).toBe(1);

    // Second decision (replay or concurrent race): attempt to reject from 'pending'
    const secondDecision = store.updateStatusAtomic('hitl:test:2', 'rejected', 'pending', {
      decidedBy: 'user-2',
      approverRole: 'admin',
      channel: 'telegram',
      type: 'reject',
    });
    // Must FAIL because status is no longer 'pending'
    expect(secondDecision.success).toBe(false);
    expect(secondDecision.changes).toBe(0);

    const finalReq = store.get('hitl:test:2');
    expect(finalReq?.status).toBe('approved');
    expect(finalReq?.decision?.decidedBy).toBe('admin-1');
  });

  it('3. Audit log is recorded on successful status change', () => {
    const now = Date.now();
    store.save({
      id: 'hitl:test:3',
      correlation: {
        requestId: 'hitl:test:3',
        correlationToken: 'token-3',
        sessionId: 's1',
        taskId: 't1',
      },
      action: {
        type: 'tool_call' as const,
        name: 'restart_service',
        description: 'Restart service',
        riskLevel: 'medium' as const,
      },
      status: 'pending' as const,
      requesterUserId: 'user-1',
      createdAt: now,
      expiresAt: now + 60000,
      triggerReason: 'Admin action',
    });

    store.updateStatusAtomic('hitl:test:3', 'approved', 'pending', {
      decidedBy: 'admin-1',
      approverRole: 'admin',
      channel: 'telegram',
      type: 'approve',
      reason: 'Standard maintenance',
    });

    const auditRows = db.prepare('SELECT * FROM hitl_audit_log WHERE request_id = ?').all('hitl:test:3') as any[];
    expect(auditRows).toHaveLength(1);
    expect(auditRows[0].actor_id).toBe('admin-1');
    expect(auditRows[0].decision).toBe('approve');
    expect(auditRows[0].status_before).toBe('pending');
    expect(auditRows[0].status_after).toBe('approved');
  });

  it('4. AbortSignal cleanly cancels pending checkAndRequest', async () => {
    const manager = new HITLManager({ defaultTTLMs: 60000, store });
    const controller = new AbortController();

    const requestPromise = manager.checkAndRequest(
      { type: 'tool_call', name: 'delete_file', description: 'File delete' },
      { userId: 'user-1', signal: controller.signal }
    );

    // Abort execution
    controller.abort();

    const result = await requestPromise;
    expect(result).toBe('cancelled');

    const pending = manager.getStats().cancelled;
    expect(pending).toBe(1);
  });

  it('5. recoverPending reloads valid requests and expires past requests', async () => {
    const now = Date.now();

    // 1 expired request in DB
    store.save({
      id: 'hitl:expired:1',
      correlation: {
        requestId: 'hitl:expired:1',
        correlationToken: 'token-exp',
        sessionId: 's1',
        taskId: 't1',
      },
      action: { type: 'tool_call', name: 'delete_old', description: 'Old' },
      status: 'pending',
      requesterUserId: 'user-1',
      createdAt: now - 100000,
      expiresAt: now - 50000, // already expired
      triggerReason: 'Past action',
    });

    // 1 still valid request in DB
    store.save({
      id: 'hitl:valid:1',
      correlation: {
        requestId: 'hitl:valid:1',
        correlationToken: 'token-valid',
        sessionId: 's1',
        taskId: 't1',
      },
      action: { type: 'tool_call', name: 'delete_future', description: 'Future' },
      status: 'pending',
      requesterUserId: 'user-1',
      createdAt: now,
      expiresAt: now + 50000, // valid for 50s
      triggerReason: 'Future action',
    });

    const manager = new HITLManager({ store });
    const recovered = manager.recoverPending();

    expect(recovered).toBe(1); // Only future one recovered as pending
    expect(store.get('hitl:expired:1')?.status).toBe('expired');
    expect(store.get('hitl:valid:1')?.status).toBe('pending');
  });
});
