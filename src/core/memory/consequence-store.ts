/**
 * @file Consequence Memory — Single-writer Store (SQLite)
 * @layer core
 * @owner core-memory
 *
 * ADR-003 §4.2 — SINGLE-WRITER module. Chỉ module này được ghi/đọc bảng `consequences`.
 * Không expose nhiều writer paths. Mọi record phải đi qua `append()` (validate trước khi lưu).
 *
 * ADR-000 nguyên tắc 1: một state, một nguồn sự thật — store này là nguồn duy nhất
 * cho ConsequenceRecord.
 *
 * Backend: better-sqlite3 (đúng style events/store.ts + sqlite-storage.ts).
 * Bảng `consequences` + index (tool_name, created_at), (session_id), (task_id).
 */

import { createHash } from 'crypto';
import Database from 'better-sqlite3';
import * as path from 'path';
import * as fs from 'fs';
import { Logger } from '../logger.js';
import { getRequestContext } from '../request-context.js';
import {
  ConsequenceRecord,
  ReusePolicy,
  parseConsequenceRecord,
} from './consequence-types.js';

const log = new Logger({ module: 'ConsequenceStore' });

const DB_DIR = path.resolve(process.cwd(), 'data');
const DB_PATH = path.join(DB_DIR, 'consequences.db');

export interface ConsequenceListOptions {
  limit?: number;
  toolName?: string;
  sessionId?: string;
  taskId?: string;
  /** Q3: lọc theo userId — record cũ (không userId) tự loại (undefined !== userId). */
  userId?: string;
}

/**
 * Kết quả lookup trước tool call (Phase 2 read path).
 * Policy resolve order: block > require_hitl > suggest > record_only.
 */
export interface ConsequenceLookupResult {
  matched: ConsequenceRecord[];
  /** Policy mạnh nhất trong các record matched (block > require_hitl > suggest > record_only). */
  maxPolicy: ReusePolicy;
  /** Số record fail/rejected_by_gate cùng tool trong CÙNG session. */
  failCountSession: number;
  /** Số record fail/rejected_by_gate cùng tool trong cửa sổ thời gian (cross-session). */
  failCountWindow: number;
  /** evidenceRef của record mới nhất (để audit / HITL reason). */
  latestEvidenceRef?: ConsequenceRecord['evidenceRef'];
  /** evidenceRef ids của record matched (để HITL reason). */
  evidenceIds: string[];
}

/** Policy resolve order — mạnh → yếu. */
const POLICY_ORDER: Record<ReusePolicy, number> = {
  block: 4,
  require_hitl: 3,
  suggest: 2,
  record_only: 1,
};

/** Cửa sổ aggregation mặc định (7 ngày) — constant có tên, không magic number. */
export const DEFAULT_AGGREGATION_WINDOW_MS = 7 * 24 * 3600 * 1000;

/**
 * Ngưỡng success lặp cùng pattern (user+toolName+argsDigest) → reusePolicy 'suggest'.
 * Mirror SUGGEST_FAIL_THRESHOLD (write-path): proven = quan sát ≥ 2 lần.
 */
export const SUCCESS_SUGGEST_THRESHOLD = 2;

/**
 * Resolve policy mạnh nhất từ danh sách record.
 * block > require_hitl > suggest > record_only.
 */
export function resolveMaxPolicy(records: ConsequenceRecord[]): ReusePolicy {
  let max: ReusePolicy = 'record_only';
  for (const r of records) {
    if (POLICY_ORDER[r.reusePolicy] > POLICY_ORDER[max]) {
      max = r.reusePolicy;
    }
  }
  return max;
}

export class ConsequenceStore {
  private db: Database.Database;

  constructor(dbPath: string = DB_PATH) {
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }
    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');
    this.initSchema();
  }

  private initSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS consequences (
        id TEXT PRIMARY KEY,
        created_at INTEGER NOT NULL,
        user_id TEXT,
        session_id TEXT,
        task_id TEXT,
        agent_id TEXT,
        tool_name TEXT NOT NULL,
        outcome TEXT NOT NULL,
        reuse_policy TEXT NOT NULL DEFAULT 'record_only',
        evidence_ref TEXT NOT NULL,   -- JSON
        context_json TEXT NOT NULL,   -- JSON
        action_json TEXT NOT NULL,    -- JSON
        lesson TEXT,
        occurrence_count INTEGER,
        last_seen_at INTEGER,
        payload_json TEXT             -- full record (JSON) for flexibility
      );

      CREATE INDEX IF NOT EXISTS idx_consequences_tool_created ON consequences(tool_name, created_at);
      CREATE INDEX IF NOT EXISTS idx_consequences_session ON consequences(session_id);
      CREATE INDEX IF NOT EXISTS idx_consequences_task ON consequences(task_id);
      CREATE INDEX IF NOT EXISTS idx_consequences_user ON consequences(user_id);
      CREATE INDEX IF NOT EXISTS idx_consequences_created ON consequences(created_at);
    `);

    // Q3 migration: bảng cũ (trước userId isolation) thiếu cột user_id.
    // ALTER TABLE chỉ chạy khi cột chưa tồn tại — bảng mới đã có sẵn.
    const cols = this.db.prepare(`PRAGMA table_info(consequences)`).all() as Array<{ name: string }>;
    if (!cols.some((c) => c.name === 'user_id')) {
      this.db.exec(`ALTER TABLE consequences ADD COLUMN user_id TEXT`);
      log.info('[ConsequenceStore] migration: added user_id column (Q3 userId isolation)');
    }
  }

  /**
   * Append a consequence record. Single write path — validates then inserts.
   * Returns the stored record.
   *
   * Q3 (userId isolation): stamp `userId` TẠI append() từ request context thật
   * (rctx.userId qua AsyncLocalStorage — subagent kế thừa userId gốc, giống taskId).
   * Record thiếu userId và không có request context → throw (fail-loud), không
   * suy đoán/backfill.
   */
  append(record: ConsequenceRecord): ConsequenceRecord {
    // Stamp userId từ request context (ưu tiên record.userId nếu caller tự cung cấp).
    const rctx = getRequestContext();
    const userId = record.userId ?? rctx?.userId;
    if (!userId) {
      throw new Error(
        '[Consequence] append requires userId: record.userId hoặc request context (rctx.userId) — không backfill',
      );
    }
    const stamped = { ...record, userId };

    // Validate (single validation point) — throws on invalid.
    const parsed = parseConsequenceRecord(stamped);

    const stmt = this.db.prepare(`
      INSERT INTO consequences (
        id, created_at, user_id, session_id, task_id, agent_id,
        tool_name, outcome, reuse_policy,
        context_json, action_json, evidence_ref, lesson,
        occurrence_count, last_seen_at, payload_json
      ) VALUES (
        @id, @created_at, @user_id, @session_id, @task_id, @agent_id,
        @tool_name, @outcome, @reuse_policy,
        @context_json, @action_json, @evidence_json, @lesson,
        @occurrence_count, @last_seen_at, @payload_json
      )
    `);

    stmt.run({
      id: parsed.id,
      created_at: parsed.createdAt,
      user_id: parsed.userId,
      session_id: parsed.sessionId ?? null,
      task_id: parsed.taskId ?? null,
      agent_id: parsed.agentId ?? null,
      tool_name: parsed.action.toolName,
      outcome: parsed.outcome,
      reuse_policy: parsed.reusePolicy,
      context_json: JSON.stringify(parsed.context),
      action_json: JSON.stringify(parsed.action),
      evidence_json: JSON.stringify(parsed.evidenceRef),
      lesson: parsed.lesson ?? null,
      occurrence_count: parsed.occurrenceCount ?? null,
      last_seen_at: parsed.lastSeenAt ?? null,
      payload_json: JSON.stringify(parsed),
    });

    log.info(`[Consequence] appended id=${parsed.id} user=${parsed.userId} tool=${parsed.action.toolName} outcome=${parsed.outcome} evidence=${JSON.stringify(parsed.evidenceRef)}`);
    return parsed;
  }

  /**
   * Get a record by id.
   */
  getById(id: string): ConsequenceRecord | null {
    const row = this.db.prepare('SELECT payload_json FROM consequences WHERE id = ?').get(id) as
      | { payload_json: string }
      | undefined;
    if (!row) return null;
    return JSON.parse(row.payload_json) as ConsequenceRecord;
  }

  /**
   * Phase 5: ghi/đếm pattern success — KHÔNG ghi mọi success thành nhiều row.
   * Key: userId + toolName + argsDigest → 1 row per pattern.
   * First occurrence: INSERT (outcome success, record_only, occurrence_count=1).
   * Repeat: UPDATE occurrence_count+1, last_seen_at; count >= SUCCESS_SUGGEST_THRESHOLD
   * → reusePolicy 'suggest' (monotonic). Giữ nguyên evidenceRef gốc (audit anchor).
   * Single-writer giữ nguyên — mọi ghi qua store này; userId stamp như append().
   */
  recordSuccessOccurrence(opts: {
    userId?: string;
    toolName: string;
    argsDigest: string;
    sessionId?: string;
    taskId?: string;
    cycle?: number;
  }): ConsequenceRecord {
    const rctx = getRequestContext();
    const userId = opts.userId ?? rctx?.userId;
    if (!userId) {
      throw new Error(
        '[Consequence] recordSuccessOccurrence requires userId: opts.userId hoặc request context (rctx.userId) — không backfill',
      );
    }

    // Id deterministic theo pattern — cùng user+tool+digest luôn ra cùng id.
    const id = createHash('sha256')
      .update(`${userId}|${opts.toolName}|${opts.argsDigest}`)
      .digest('hex');
    const now = Date.now();

    const existing = this.getById(id);
    if (!existing) {
      const evidenceRef: ConsequenceRecord['evidenceRef'] = {};
      if (opts.cycle !== undefined) evidenceRef.cycle = opts.cycle;
      const taskId = opts.taskId ?? rctx?.taskId;
      if (taskId) evidenceRef.checkpointId = taskId;

      return this.append({
        id,
        createdAt: now,
        userId,
        sessionId: opts.sessionId ?? rctx?.sessionId,
        taskId,
        context: { tags: ['tool_result', 'success'] },
        action: { toolName: opts.toolName, argsDigest: opts.argsDigest },
        outcome: 'success',
        evidenceRef,
        reusePolicy: 'record_only',
        occurrenceCount: 1,
        lastSeenAt: now,
      });
    }

    // Repeat: bump count + last_seen_at, giữ evidenceRef gốc; policy escalate tại ngưỡng.
    const occurrenceCount = (existing.occurrenceCount ?? 0) + 1;
    const reusePolicy = occurrenceCount >= SUCCESS_SUGGEST_THRESHOLD
      ? 'suggest'
      : existing.reusePolicy;
    const updated: ConsequenceRecord = {
      ...existing,
      occurrenceCount,
      lastSeenAt: now,
      reusePolicy,
    };
    // payload_json phải cập nhật cùng — getById/listRecent đọc từ payload_json.
    this.db
      .prepare(
        'UPDATE consequences SET occurrence_count = ?, last_seen_at = ?, reuse_policy = ?, payload_json = ? WHERE id = ?',
      )
      .run(occurrenceCount, now, reusePolicy, JSON.stringify(updated), id);
    return updated;
  }

  /**
   * List recent records, optionally filtered by tool/session/task/user.
   */
  listRecent(options: ConsequenceListOptions = {}): ConsequenceRecord[] {
    const { limit = 50, toolName, sessionId, taskId, userId } = options;
    const clauses: string[] = [];
    const params: unknown[] = [];

    if (toolName) {
      clauses.push('tool_name = ?');
      params.push(toolName);
    }
    if (sessionId) {
      clauses.push('session_id = ?');
      params.push(sessionId);
    }
    if (taskId) {
      clauses.push('task_id = ?');
      params.push(taskId);
    }
    if (userId) {
      // Q3: lọc theo userId — record CŨ (user_id NULL, trước Q3) không bao giờ
      // khớp user cụ thể → tự loại khỏi đếm multi-user (không backfill).
      clauses.push('user_id = ?');
      params.push(userId);
    }

    const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
    const rows = this.db
      .prepare(`SELECT payload_json FROM consequences ${where} ORDER BY created_at DESC LIMIT ?`)
      .all(...params, limit) as Array<{ payload_json: string }>;

    return rows.map((r) => JSON.parse(r.payload_json) as ConsequenceRecord);
  }

  /**
   * List records by tool name (phục vụ debug + Phase 2 lookup).
   * @param userId Q3: nếu cung cấp, chỉ đếm record của user đó (record cũ tự loại).
   */
  listByTool(toolName: string, limit = 50, userId?: string): ConsequenceRecord[] {
    return this.listRecent({ toolName, limit, userId });
  }

  /**
   * Lookup consequence liên quan trước tool call (Phase 2 + Phase 3).
   * Match theo toolName (+ argsDigest nếu cung cấp); đếm fail trong session
   * và trong window (cross-session).
   *
   * Aggregation READ-TIME (không write-time counter): đơn giản, đúng,
   * không phá single-writer. Tradeoff: O(records trong window) mỗi lookup —
   * chấp nhận được với index (tool_name, created_at).
   *
   * Fail-open: nếu DB lỗi → trả về empty (không làm chết request).
   */
  findRelevantForToolCall(options: {
    toolName: string;
    argsDigest?: string;
    sessionId?: string;
    /**
     * Q3: userId của request hiện tại. Khi cung cấp, mọi đếm (window + session)
     * và matched chỉ tính record CỦA USER ĐÓ — record cũ (không userId) tự loại.
     * Không cung cấp → hành vi cũ (không lọc, cho caller/test không có userId).
     */
    userId?: string;
    windowMs?: number;
    limit?: number;
  }): ConsequenceLookupResult {
    const { toolName, argsDigest, sessionId, userId, limit = 20 } = options;
    const windowMs = options.windowMs ?? DEFAULT_AGGREGATION_WINDOW_MS;
    const windowStart = Date.now() - windowMs;

    try {
      // Records cùng tool trong window (cross-session) — nguồn cho failCountWindow.
      let windowRecords: ConsequenceRecord[] = [];
      // Records cùng session (fallback: cùng tool trong window).
      let sessionRecords: ConsequenceRecord[] = [];

      // Query thô trong window theo tool — dùng index (tool_name, created_at).
      const rows = this.db
        .prepare(`
          SELECT payload_json FROM consequences
          WHERE tool_name = ? AND created_at >= ?
          ORDER BY created_at DESC
          LIMIT ?
        `)
        .all(toolName, windowStart, limit * 4) as Array<{ payload_json: string }>;

      windowRecords = rows.map((r) => JSON.parse(r.payload_json) as ConsequenceRecord);

      // Q3: filter userId — chỉ đếm record CỦA USER hiện tại. Record cũ (không
      // userId, trước Q3) không bao giờ khớp → tự loại khỏi đếm multi-user
      // (không suy đoán/backfill). Không có userId (caller cũ) → không lọc.
      if (userId) {
        windowRecords = windowRecords.filter((r) => r.userId === userId);
      }

      // Lọc theo argsDigest nếu cung cấp (digest ổn định từ buildArgsDigest).
      if (argsDigest) {
        windowRecords = windowRecords.filter(
          (r) => r.action.argsDigest === argsDigest,
        );
      }

      // failCountWindow: fail/rejected trong window (cross-session).
      const failCountWindow = windowRecords.filter(
        (r) => r.outcome === 'fail' || r.outcome === 'rejected_by_gate',
      ).length;

      // failCountSession: fail trong CÙNG session.
      if (sessionId) {
        sessionRecords = windowRecords.filter((r) => r.sessionId === sessionId);
      }
      const failCountSession = sessionRecords.filter(
        (r) => r.outcome === 'fail' || r.outcome === 'rejected_by_gate',
      ).length;

      // matched = windowRecords (cross-session cho policy resolve),
      // ưu tiên cùng session trước nếu có.
      const matched = sessionRecords.length > 0
        ? sessionRecords
        : windowRecords.slice(0, limit);

      const latest = windowRecords[0]; // DESC theo created_at
      const evidenceIds = matched
        .map((r) => r.id)
        .filter((id): id is string => !!id);

      return {
        matched,
        maxPolicy: resolveMaxPolicy(matched),
        failCountSession,
        failCountWindow,
        latestEvidenceRef: latest?.evidenceRef,
        evidenceIds,
      };
    } catch (err) {
      // Fail-open: lookup lỗi không được làm chết request.
      log.warn(`[Consequence] lookup failed (fail-open): ${String(err)}`);
      return {
        matched: [],
        maxPolicy: 'record_only',
        failCountSession: 0,
        failCountWindow: 0,
        evidenceIds: [],
      };
    }
  }

  /**
   * Count records (observability).
   */
  count(): number {
    const row = this.db.prepare('SELECT COUNT(*) as c FROM consequences').get() as { c: number };
    return row.c;
  }

  close(): void {
    this.db.close();
  }
}

// ── Singleton ──
let _instance: ConsequenceStore | null = null;

/**
 * Get the shared ConsequenceStore singleton. Single-writer: mọi nơi ghi
 * consequence phải dùng store này (hoặc instance riêng trong test).
 */
export function getConsequenceStore(): ConsequenceStore {
  if (!_instance) {
    _instance = new ConsequenceStore();
  }
  return _instance;
}

export default ConsequenceStore;