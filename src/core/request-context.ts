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

export interface RequestContext {
  sessionId: string;
  taskId: string;
  evidenceLog: EvidenceLog;
  onPlanCreated: (itemCount: number) => void;
  /** AbortSignal của request — cancel lan truyền từ parent xuống subagent (delegate_task) */
  signal?: AbortSignal;
}

export const requestContext = new AsyncLocalStorage<RequestContext>();

/**
 * Get the current request's context. Safe to call outside a request — returns null.
 * Use this instead of this.currentTaskId / this.updatePlanCtx / checkpointStore.evidenceLog.
 */
export function getRequestContext(): RequestContext | null {
  return requestContext.getStore() ?? null;
}
