/**
 * @file Plan state derivation — shared module for plan lifecycle
 * @layer core
 *
 * Single source of truth for plan state. All callers (agent.ts, engine.ts,
 * update-plan-tool.ts) use these functions instead of deriving locally.
 *
 * ADR-000 principle: no static flags, derive from checkpointStore each time.
 */

import type { CheckpointStore } from '../checkpoint.js';
import type { ToolCallRecord } from './types.js';

export interface PlanState {
  planExists: boolean;
  planComplete: boolean;  // completed, failed, or aborted
}

/**
 * Derive plan state from checkpointStore. Call each time you need it — never cache.
 */
export function derivePlanState(checkpointStore: CheckpointStore | null | undefined, sessionId: string | undefined): PlanState {
  if (!checkpointStore || !sessionId) return { planExists: false, planComplete: false };
  try {
    const plan = checkpointStore.getPlan(sessionId);
    if (!plan) return { planExists: false, planComplete: false };
    return {
      planExists: true,
      planComplete: plan.status === 'completed' || plan.status === 'failed' || plan.status === 'aborted',
    };
  } catch {
    return { planExists: false, planComplete: false };
  }
}

/**
 * Is the plan guard active? True when a plan exists but is not yet complete/failed/aborted.
 * Used by stall detection (agent.ts) and plan context building (engine.ts).
 */
export function isGuardActive(state: PlanState): boolean {
  return state.planExists && !state.planComplete;
}

export interface CanCompleteResult {
  ok: boolean;
  reason?: string;
}

/**
 * Validate whether an item can be marked as completed based on evidence.
 * Used by update-plan-tool.ts complete_item action.
 */
export function canCompleteItem(
  evidenceLog: Map<number, ToolCallRecord[]> | undefined | null,
  itemIndex: number,
): CanCompleteResult {
  const evidence = evidenceLog?.get(itemIndex) || [];
  if (evidence.length === 0) {
    return {
      ok: false,
      reason: `No evidence of tool execution for item ${itemIndex}. You must actually execute this item (call tools) before calling complete_item. Evidence log is empty.`,
    };
  }
  if (evidence.every(e => !e.success)) {
    return {
      ok: false,
      reason: `All tool calls for item ${itemIndex} failed. Cannot mark as completed. Consider calling skip_item instead if the task is impossible.`,
    };
  }
  return { ok: true };
}
