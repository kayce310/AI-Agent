/**
 * @file request-context — Per-request state via AsyncLocalStorage
 * @layer core
 *
 * Solves concurrency bugs #1/#2/#3: shared mutable state (currentTaskId,
 * updatePlanCtx, evidenceLog) on Engine singleton / CheckpointStore causes
 * data corruption when requests run concurrently.
 *
 * Fix: wrap each request in requestContext.run(). All readers (event handlers,
 * agent loop, update_plan tool) read from the store — automatic async context
 * propagation, no threading required.
 */

import { AsyncLocalStorage } from 'node:async_hooks';
import type { EvidenceLog } from './plan/types.js';

/**
 * Hint có cấu trúc cho model khi policy consequence là suggest/require_hitl
 * (ADR-003 Phase 3b). Chỉ MÔ TẢ vận hành + counts + evidence ids — không bao
 * giờ là điều kiện block/HITL (quyết định vẫn ở read-path guard).
 */
export interface ConsequenceHint {
  toolName: string;
  policy: 'suggest' | 'require_hitl' | 'block' | 'record_only';
  failCountSession: number;
  failCountWindow: number;
  /** Phase 5: số lần success của pattern (chỉ set khi suggest đến từ success proven). */
  successCount?: number;
  evidenceRef?: { checkpointId?: string; cycle?: number };
  /** Optional, ngắn (≤120 chars), đã redact, chỉ "tham khảo" — không phải proof. */
  lesson?: string;
  reasonCode?: string;
}

export interface RequestContext {
  sessionId: string;
  taskId: string;
  evidenceLog: EvidenceLog;
  onPlanCreated: (itemCount: number) => void;
  /**
   * userId thật của request (permanent identity, KHÔNG phải sessionId — sessionId
   * đổi mỗi /new). Nguồn: EngineRequest.userId (engine.ts). Dùng cho cách ly
   * multi-user của Consequence Memory (ADR-003 Q3): subagent kế thừa qua
   * AsyncLocalStorage giống taskId (engine.ts requestContext.run).
   */
  userId: string;
  /** AbortSignal của request — cancel lan truyền từ parent xuống subagent (delegate_task) */
  signal?: AbortSignal;
  /** Consequence hint cho model (Phase 3b) — set bởi read-path guard khi suggest. */
  consequenceHint?: ConsequenceHint;
}

export const requestContext = new AsyncLocalStorage<RequestContext>();

/**
 * Get the current request's context. Safe to call outside a request — returns null.
 * Use this instead of this.currentTaskId / this.updatePlanCtx / checkpointStore.evidenceLog.
 */
export function getRequestContext(): RequestContext | null {
  return requestContext.getStore() ?? null;
}
