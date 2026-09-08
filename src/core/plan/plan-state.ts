/**
 * @file Plan state derivation — shared module for plan lifecycle
 * @layer core
 *
 * ADR-000 §2原则1: 单一真相源 — 所有计划状态推导集中于此模块。
 * ADR-001: PlanState 为判别联合类型 (discriminated union)，
 *          禁止使用布尔标志 (hasCreatedPlan) 编码多阶段生命周期。
 *
 * agent.ts / engine.ts / update-plan-tool.ts 必须调用此模块的函数，
 * 不得在本地重新实现推导逻辑。
 */

import type { CheckpointStore } from '../checkpoint.js';
import type { ToolCallRecord, EvidenceLog } from './types.js';

// ── ADR-001: PlanState union type ──

export type PlanState =
  | { kind: 'none' }
  | { kind: 'planning'; planId: string }
  | { kind: 'executing'; planId: string; activeItemIndex: number }
  | { kind: 'completed'; planId: string }
  | { kind: 'failed'; planId: string; reason: string }
  | { kind: 'aborted'; planId: string };

// EvidenceLog type defined in types.ts (single source) — re-exported for
// backward compatibility with imports from plan-state.js.
export type { EvidenceLog };

// ── Derive ──

/**
 * Derive PlanState from checkpointStore — the ONLY place allowed to compute it.
 * Call each time you need state — never cache.
 */
export function derivePlanState(
  checkpointStore: CheckpointStore | null | undefined,
  sessionId: string | undefined,
): PlanState {
  if (!checkpointStore || !sessionId) return { kind: 'none' };
  try {
    const plan = checkpointStore.getPlan(sessionId);
    if (!plan) return { kind: 'none' };

    // ADR-001 terminal states
    if (plan.status === 'completed') return { kind: 'completed', planId: plan.id };
    if (plan.status === 'failed') return { kind: 'failed', planId: plan.id, reason: plan.stopReason ?? 'unknown' };
    if (plan.status === 'aborted') return { kind: 'aborted', planId: plan.id };

    // Non-terminal: find active item
    const activeIndex = plan.items.findIndex((i: any) => i.status !== 'completed');
    if (activeIndex === -1) return { kind: 'completed', planId: plan.id }; // fallback — all done
1
    // Determine planning vs executing: have any tool calls happened?
    // If plan has any item that was ever touched (in_progress, failed, skipped), we're executing.
    const hasExecutionEvidence = plan.items.some(
      (i: any) => i.status === 'in_progress' || i.status === 'failed' || i.status === 'skipped',
    );

    return hasExecutionEvidence
      ? { kind: 'executing', planId: plan.id, activeItemIndex: activeIndex }
      : { kind: 'planning', planId: plan.id };
  } catch {
    return { kind: 'none' };
  }
}

// ── Guard ──

/**
 * Is the plan guard active? True for planning or executing states.
 * Used by stall detection (agent.ts) and plan context building (engine.ts).
 */
export function isGuardActive(state: PlanState): boolean {
  return state.kind === 'planning' || state.kind === 'executing';
}

// ── Evidence validation ──

export interface CanCompleteResult {
  ok: boolean;
  reason?: string;
}

/**
 * Validate whether an item can be marked as completed based on evidence.
 * Used by update-plan-tool.ts complete_item action.
 */
export function canCompleteItem(
  evidenceLog: EvidenceLog | undefined | null,
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
