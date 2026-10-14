/**
 * @file hitl-store.ts — SQLite Persistent Storage for HITL Requests & Audit Log
 * @layer core
 * @owner core-security
 *
 * Architecture Reference: docs/adr/ADR-000-state-principles.md
 * Design Reference: HITL_ADMIN_AUTHORIZATION_DESIGN_H1.md
 *
 * Implements Single Source of Truth for HITL requests with Atomic CAS updates.
 */

import type Database from 'better-sqlite3';
import { getStorage } from '../memory/sqlite-storage.js';
import { Logger } from '../logger.js';
import type {
  HITLApprovalRequest,
  HITLRequestState,
  HITLDecisionChannel,
  HITLDecisionType,
} from './hitl-types.js';

const log = new Logger({ module: 'HITLStore' });

export class HITLStore {
  private db: Database.Database;

  constructor(db?: Database.Database) {
    this.db = db ?? getStorage().getDb();
    this.initSchema();
  }

  /**
   * Khởi tạo schema bảng SQLite cho HITL requests và audit log.
   */
  initSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS hitl_requests (
        id TEXT PRIMARY KEY,
        correlation_token TEXT NOT NULL,
        session_id TEXT NOT NULL,
        task_id TEXT NOT NULL,
        plan_id TEXT,
        checkpoint_request_id TEXT,
        tool_call_id TEXT,
        action_type TEXT NOT NULL,
        action_name TEXT NOT NULL,
        action_description TEXT NOT NULL,
        action_args_json TEXT,
        risk_level TEXT NOT NULL,
        status TEXT NOT NULL CHECK(status IN ('pending', 'approved', 'rejected', 'expired', 'cancelled')),
        requester_user_id TEXT NOT NULL,
        requester_display TEXT,
        created_at INTEGER NOT NULL,
        expires_at INTEGER NOT NULL,
        decided_at INTEGER,
        decided_by TEXT,
        approver_role TEXT,
        decision_channel TEXT,
        decision_type TEXT,
        decision_reason TEXT,
        trigger_reason TEXT NOT NULL,
        evidence_ids_json TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_hitl_status ON hitl_requests(status);
      CREATE INDEX IF NOT EXISTS idx_hitl_session ON hitl_requests(session_id);

      CREATE TABLE IF NOT EXISTS hitl_audit_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        request_id TEXT NOT NULL,
        actor_id TEXT NOT NULL,
        actor_role TEXT NOT NULL,
        channel TEXT NOT NULL,
        decision TEXT NOT NULL,
        reason TEXT,
        timestamp INTEGER NOT NULL,
        status_before TEXT NOT NULL,
        status_after TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_hitl_audit_req ON hitl_audit_log(request_id);
    `);
  }

  /**
   * Lưu hoặc cập nhật một HITLApprovalRequest vào SQLite.
   */
  save(req: HITLApprovalRequest): void {
    const stmt = this.db.prepare(`
      INSERT INTO hitl_requests (
        id, correlation_token, session_id, task_id, plan_id, checkpoint_request_id, tool_call_id,
        action_type, action_name, action_description, action_args_json, risk_level, status,
        requester_user_id, requester_display, created_at, expires_at,
        decided_at, decided_by, approver_role, decision_channel, decision_type, decision_reason,
        trigger_reason, evidence_ids_json
      ) VALUES (
        @id, @correlationToken, @sessionId, @taskId, @planId, @checkpointRequestId, @toolCallId,
        @actionType, @actionName, @actionDescription, @actionArgsJson, @riskLevel, @status,
        @requesterUserId, @requesterDisplay, @createdAt, @expiresAt,
        @decidedAt, @decidedBy, @approverRole, @decisionChannel, @decisionType, @decisionReason,
        @triggerReason, @evidenceIdsJson
      )
      ON CONFLICT(id) DO UPDATE SET
        status = excluded.status,
        decided_at = excluded.decided_at,
        decided_by = excluded.decided_by,
        approver_role = excluded.approver_role,
        decision_channel = excluded.decision_channel,
        decision_type = excluded.decision_type,
        decision_reason = excluded.decision_reason
    `);

    stmt.run({
      id: req.id,
      correlationToken: req.correlation.correlationToken,
      sessionId: req.correlation.sessionId,
      taskId: req.correlation.taskId,
      planId: req.correlation.planId || null,
      checkpointRequestId: req.correlation.checkpointRequestId || null,
      toolCallId: req.correlation.toolCallId || null,
      actionType: req.action.type,
      actionName: req.action.name,
      actionDescription: req.action.description,
      actionArgsJson: req.action.args ? JSON.stringify(req.action.args) : null,
      riskLevel: req.action.riskLevel || 'medium',
      status: req.status,
      requesterUserId: req.requesterUserId,
      requesterDisplay: req.requesterDisplay || null,
      createdAt: req.createdAt,
      expiresAt: req.expiresAt,
      decidedAt: req.decision?.decidedAt || null,
      decidedBy: req.decision?.decidedBy || null,
      approverRole: req.decision?.approverRole || null,
      decisionChannel: req.decision?.channel || null,
      decisionType: req.decision?.type || null,
      decisionReason: req.decision?.reason || null,
      triggerReason: req.triggerReason,
      evidenceIdsJson: req.evidenceIds ? JSON.stringify(req.evidenceIds) : null,
    });
  }

  /**
   * Lấy một request theo ID.
   */
  get(id: string): HITLApprovalRequest | null {
    const row = this.db.prepare('SELECT * FROM hitl_requests WHERE id = ?').get(id) as any;
    if (!row) return null;
    return this._mapRowToRequest(row);
  }

  /**
   * Lấy danh sách tất cả các request đang ở trạng thái 'pending'.
   */
  getPending(): HITLApprovalRequest[] {
    const rows = this.db.prepare('SELECT * FROM hitl_requests WHERE status = ? ORDER BY created_at ASC').all('pending') as any[];
    return rows.map(r => this._mapRowToRequest(r));
  }

  /**
   * Cập nhật trạng thái nguyên tử (Atomic Check-and-Set — CAS).
   * Chỉ cập nhật nếu bản ghi đang ở trạng thái `expectedStatus` (mặc định: 'pending').
   * Đảm bảo tính lũy đẳng: chỉ có 1 quyết định được chấp thuận.
   */
  updateStatusAtomic(
    id: string,
    newStatus: HITLRequestState,
    expectedStatus: HITLRequestState = 'pending',
    decisionMeta?: {
      decidedBy: string;
      approverRole: 'admin' | 'owner' | 'system';
      channel: HITLDecisionChannel;
      type: HITLDecisionType;
      reason?: string;
    }
  ): { success: boolean; changes: number } {
    const now = Date.now();
    const stmt = this.db.prepare(`
      UPDATE hitl_requests
      SET
        status = @newStatus,
        decided_at = @decidedAt,
        decided_by = @decidedBy,
        approver_role = @approverRole,
        decision_channel = @decisionChannel,
        decision_type = @decisionType,
        decision_reason = @decisionReason
      WHERE id = @id AND status = @expectedStatus
    `);

    const result = stmt.run({
      id,
      newStatus,
      expectedStatus,
      decidedAt: decisionMeta ? now : (newStatus === 'expired' || newStatus === 'cancelled' ? now : null),
      decidedBy: decisionMeta?.decidedBy || (newStatus === 'expired' ? 'system_ttl' : newStatus === 'cancelled' ? 'system_abort' : null),
      approverRole: decisionMeta?.approverRole || 'system',
      decisionChannel: decisionMeta?.channel || 'system_policy',
      decisionType: decisionMeta?.type || (newStatus === 'approved' ? 'approve' : 'reject'),
      decisionReason: decisionMeta?.reason || null,
    });

    const success = result.changes === 1;

    if (success) {
      // Ghi audit log bất biến
      this.audit(
        id,
        decisionMeta?.decidedBy || 'system',
        decisionMeta?.approverRole || 'system',
        decisionMeta?.channel || 'system_policy',
        decisionMeta?.type || (newStatus === 'approved' ? 'approve' : 'reject'),
        decisionMeta?.reason,
        expectedStatus,
        newStatus
      );
    }

    return { success, changes: result.changes };
  }

  /**
   * Ghi nhận audit log cho quyết định.
   */
  audit(
    requestId: string,
    actorId: string,
    actorRole: string,
    channel: string,
    decision: string,
    reason: string | undefined,
    statusBefore: string,
    statusAfter: string
  ): void {
    try {
      this.db.prepare(`
        INSERT INTO hitl_audit_log (
          request_id, actor_id, actor_role, channel, decision, reason, timestamp, status_before, status_after
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        requestId,
        actorId,
        actorRole,
        channel,
        decision,
        reason || null,
        Date.now(),
        statusBefore,
        statusAfter
      );
    } catch (err) {
      log.error(`Failed to write HITL audit log: ${err}`);
    }
  }

  /**
   * Xóa bớt các request cũ đã kết thúc (dọn dẹp định kỳ).
   */
  cleanup(maxAgeMs: number = 30 * 24 * 3600 * 1000): number {
    const cutoff = Date.now() - maxAgeMs;
    const result = this.db.prepare(`
      DELETE FROM hitl_requests
      WHERE status != 'pending' AND created_at < ?
    `).run(cutoff);
    return result.changes;
  }

  private _mapRowToRequest(row: any): HITLApprovalRequest {
    let args: Record<string, unknown> | undefined;
    if (row.action_args_json) {
      try { args = JSON.parse(row.action_args_json); } catch {}
    }

    let evidenceIds: string[] | undefined;
    if (row.evidence_ids_json) {
      try { evidenceIds = JSON.parse(row.evidence_ids_json); } catch {}
    }

    return {
      id: row.id,
      correlation: {
        requestId: row.id,
        correlationToken: row.correlation_token,
        sessionId: row.session_id,
        taskId: row.task_id,
        planId: row.plan_id || undefined,
        checkpointRequestId: row.checkpoint_request_id || undefined,
        toolCallId: row.tool_call_id || undefined,
      },
      action: {
        type: row.action_type,
        name: row.action_name,
        description: row.action_description,
        args,
        riskLevel: row.risk_level,
      },
      status: row.status,
      requesterUserId: row.requester_user_id,
      requesterDisplay: row.requester_display || undefined,
      createdAt: row.created_at,
      expiresAt: row.expires_at,
      decision: row.decided_at ? {
        decidedAt: row.decided_at,
        decidedBy: row.decided_by,
        approverRole: row.approver_role,
        channel: row.decision_channel,
        type: row.decision_type,
        reason: row.decision_reason || undefined,
      } : undefined,
      triggerReason: row.trigger_reason,
      evidenceIds,
    };
  }
}

let _hitlStoreInstance: HITLStore | null = null;

export function getHITLStore(db?: Database.Database): HITLStore {
  if (!_hitlStoreInstance) {
    _hitlStoreInstance = new HITLStore(db);
  }
  return _hitlStoreInstance;
}

export function resetHITLStore(): void {
  _hitlStoreInstance = null;
}
