/**
 * @file Consequence Memory — Write Path Instrumentation
 * @layer core
 * @owner core-memory
 *
 * ADR-003 Phase 1 — write path ONLY. Không retrieval/block/HITL.
 *
 * Đăng ký logic trên `globalHooks` MỘT LẦN — áp cho cả parent loop (agent.ts)
 * lẫn subagent loop (delegate.ts), vì cả hai đều emit 'tool:result' qua globalHooks.
 *
 * Ghi khi (Phase 1):
 *   - tool result thất bại (fail rõ)        → outcome 'fail'
 *   - gate/privilege/risk reject (nếu bắt được) → outcome 'rejected_by_gate'
 *   - plan terminal: failed / aborted        → outcome 'fail' (toolName '__plan__')
 *   - stagnation / hết retry dẫn tới dừng    → outcome 'fail' (nếu bắt được event rõ)
 *
 * Không ghi khi:
 *   - chat thường, không hành động
 *   - success tầm thường không giá trị vận hành
 *   - thiếu evidenceRef tối thiểu (phải có eventId hoặc checkpointId/cycle)
 *
 * ADR-000 nguyên tắc 5: `lesson` KHÔNG BAO GIỜ là điều kiện block. Ở đây lesson
 * chỉ là optional description; reusePolicy Phase 1 luôn 'record_only' (hoặc
 * 'suggest' cho fail lặp — chỉ nhãn, chưa enforce).
 */

import { randomUUID } from 'crypto';
import { Logger } from '../logger.js';
import { globalHooks } from '../hooks.js';
import { getRequestContext } from '../request-context.js';
import {
  ConsequenceOutcome,
  ConsequenceRecord,
  ReusePolicy,
} from './consequence-types.js';
import { ConsequenceStore, getConsequenceStore } from './consequence-store.js';
import { buildArgsDigest } from './consequence-redact.js';

const log = new Logger({ module: 'Consequence' });

// ToolName đặc biệt cho record mức plan (không phải tool thật).
export const PLAN_TERMINAL_TOOL = '__plan__';

// Ngưỡng fail lặp cùng tool trong cùng session → gán nhãn 'suggest' (chưa enforce).
const SUGGEST_FAIL_THRESHOLD = 2;

/**
 * Interface cho data truyền vào tool:result hook (xem agent.ts emit site).
 */
interface ToolResultHookData {
  sessionId?: string;
  toolName?: string;
  args?: unknown;
  result?: unknown;
  cycle?: number;
  [key: string]: unknown;
}

/**
 * Xác định outcome từ tool result.
 * Tool result thất bại theo convention: object chứa key 'error'.
 */
function outcomeFromToolResult(result: unknown): ConsequenceOutcome {
  if (result && typeof result === 'object' && 'error' in (result as Record<string, unknown>)) {
    return 'fail';
  }
  return 'success';
}

/**
 * Trích error message ngắn từ tool result (để làm lesson mô tả, KHÔNG làm điều kiện).
 */
function extractError(result: unknown): string | undefined {
  if (result && typeof result === 'object' && 'error' in (result as Record<string, unknown>)) {
    const err = (result as Record<string, unknown>).error;
    if (typeof err === 'string') return err.slice(0, 300);
    if (err) return JSON.stringify(err).slice(0, 300);
  }
  return undefined;
}

/**
 * Build a ConsequenceRecord from tool result data.
 * Redact args digest; không lưu value nhạy cảm.
 */
function buildToolRecord(
  data: ToolResultHookData,
  outcome: ConsequenceOutcome,
  opts: { store?: ConsequenceStore } = {},
): ConsequenceRecord | null {
  const toolName = data.toolName;
  if (!toolName || toolName === PLAN_TERMINAL_TOOL) return null;

  const rctx = getRequestContext();
  const sessionId = data.sessionId || rctx?.sessionId;
  const taskId = rctx?.taskId;
  // Q3: userId thật từ request context (subagent kế thừa qua AsyncLocalStorage).
  const userId = rctx?.userId;

  // evidenceRef tối thiểu: cần ít nhất sessionId+taskId hoặc cycle.
  // Nếu không có gì để neo → bỏ qua (tránh record rác không audit được).
  const evidenceRef: ConsequenceRecord['evidenceRef'] = {};
  if (data.cycle !== undefined) evidenceRef.cycle = data.cycle;
  if (taskId) evidenceRef.checkpointId = taskId;
  if (Object.keys(evidenceRef).length === 0 && !sessionId) {
    log.warn(`[Consequence] skip record: no evidence anchor (tool=${toolName})`);
    return null;
  }

  // argsDigest: chỉ key names, không value (redact).
  const rawArgs = data.args;
  const argsDigest = buildArgsDigest(
    typeof rawArgs === 'object' && rawArgs !== null
      ? (rawArgs as Record<string, unknown>)
      : undefined,
  );

  // Lesson = error message mô tả (optional). KHÔNG làm điều kiện an ninh.
  const errorMsg = outcome === 'fail' ? extractError(data.result) : undefined;

  // reusePolicy Phase 1: record_only mặc định; suggest cho fail lặp (nhãn thôi).
  // Q3: đếm fail lặp CHỈ trong phạm vi user hiện tại — fail của user khác (và
  // record cũ không userId) không ảnh hưởng nhãn của user này.
  let reusePolicy: ReusePolicy = 'record_only';
  if (outcome === 'fail' && opts.store) {
    const recentFails = opts.store.listByTool(toolName, 20, userId).filter(
      (r) => r.outcome === 'fail' && (r.sessionId === sessionId || !r.sessionId),
    );
    if (recentFails.length >= SUGGEST_FAIL_THRESHOLD) {
      reusePolicy = 'suggest';
    }
  }

  return {
    id: randomUUID(),
    createdAt: Date.now(),
    // Q3: userId từ request context (rỗng nếu ngoài rctx — append() fail-loud).
    userId: userId ?? '',
    sessionId,
    taskId,
    context: {
      planStatus: undefined,
      tags: ['tool_result'],
    },
    action: {
      toolName,
      argsDigest,
    },
    outcome,
    evidenceRef,
    lesson: errorMsg,
    reusePolicy,
  };
}

/**
 * Register the write path on globalHooks.
 * Idempotent — gọi nhiều lần không tạo duplicate handler (unsubscribe previous).
 */
let unsubscribed: (() => void) | null = null;

export function registerConsequenceWritePath(opts: { store?: ConsequenceStore } = {}): () => void {
  if (unsubscribed) {
    unsubscribed();
    unsubscribed = null;
  }

  const store = opts.store ?? getConsequenceStore();

  const handler = async (data: Record<string, unknown>): Promise<void> => {
    try {
      const toolData = data as ToolResultHookData;
      const outcome = outcomeFromToolResult(toolData.result);
      if (outcome === 'success') return; // Phase 1: chỉ ghi fail (tránh spam)

      const record = buildToolRecord(toolData, outcome, { store });
      if (!record) return;

      store.append(record);
    } catch (err) {
      // Không bao giờ làm crash agent loop vì lỗi ghi consequence.
      log.error(`[Consequence] write failed: ${String(err)}`);
    }
  };

  unsubscribed = globalHooks.on('tool:result', (ctx) => handler(ctx.data), 80);
  log.info('[Consequence] write path registered on globalHooks (tool:result)');
  return () => {
    if (unsubscribed) {
      unsubscribed();
      unsubscribed = null;
    }
  };
}

/**
 * Ghi record mức plan terminal (failed / aborted).
 * toolName = '__plan__'. outcome = 'fail'.
 * evidenceRef: checkpointId = plan.id (stable per session+plan).
 */
export function recordPlanTerminal(opts: {
  store?: ConsequenceStore;
  sessionId?: string;
  taskId?: string;
  planId: string;
  planStatus: 'failed' | 'aborted';
  stopReason?: string;
  cycle?: number;
  goalSummary?: string;
}): ConsequenceRecord | null {
  const store = opts.store ?? getConsequenceStore();
  const rctx = getRequestContext();

  const evidenceRef: ConsequenceRecord['evidenceRef'] = {
    checkpointId: opts.planId,
  };
  if (opts.cycle !== undefined) evidenceRef.cycle = opts.cycle;

  const record: ConsequenceRecord = {
    id: randomUUID(),
    createdAt: Date.now(),
    // Q3: userId từ request context — recordPlanTerminal luôn chạy trong request.
    userId: rctx?.userId ?? '',
    sessionId: opts.sessionId ?? rctx?.sessionId,
    taskId: opts.taskId ?? rctx?.taskId,
    context: {
      goalSummary: opts.goalSummary,
      planStatus: opts.planStatus,
      tags: ['plan_terminal'],
    },
    action: {
      toolName: PLAN_TERMINAL_TOOL,
    },
    outcome: 'fail',
    evidenceRef,
    lesson: opts.stopReason ? `Plan ${opts.planStatus}: ${opts.stopReason}`.slice(0, 300) : undefined,
    reusePolicy: 'record_only',
  };

  try {
    return store.append(record);
  } catch (err) {
    log.error(`[Consequence] plan terminal write failed: ${String(err)}`);
    return null;
  }
}

/**
 * Ghi record gate reject (outcome 'rejected_by_gate').
 * Được gọi khi guard chain chặn một tool call.
 */
export function recordGateReject(opts: {
  store?: ConsequenceStore;
  sessionId?: string;
  taskId?: string;
  toolName: string;
  reason?: string;
  cycle?: number;
}): ConsequenceRecord | null {
  const store = opts.store ?? getConsequenceStore();
  const rctx = getRequestContext();

  const evidenceRef: ConsequenceRecord['evidenceRef'] = {};
  if (opts.cycle !== undefined) evidenceRef.cycle = opts.cycle;
  if (opts.taskId) evidenceRef.checkpointId = opts.taskId;

  const record: ConsequenceRecord = {
    id: randomUUID(),
    createdAt: Date.now(),
    // Q3: userId từ request context — recordGateReject luôn chạy trong request.
    userId: rctx?.userId ?? '',
    sessionId: opts.sessionId ?? rctx?.sessionId,
    taskId: opts.taskId ?? rctx?.taskId,
    context: {
      tags: ['gate_reject'],
    },
    action: {
      toolName: opts.toolName,
    },
    outcome: 'rejected_by_gate',
    evidenceRef,
    lesson: opts.reason ? opts.reason.slice(0, 300) : undefined,
    reusePolicy: 'require_hitl', // nhãn cho Phase 2 — CHƯA enforce
  };

  try {
    return store.append(record);
  } catch (err) {
    log.error(`[Consequence] gate reject write failed: ${String(err)}`);
    return null;
  }
}