/**
 * @file Update Plan Tool — State-Driven Task Plan Tool
 * @layer core
 * @owner core-engine
 *
 * SINGLE tool that replaces old heuristic intent-detection.
 * The LLM calls update_plan() with one of 5 actions:
 *   create         — Planning Phase: define items, start plan
 *   complete_item  — Mark an item as completed
 *   skip_item      — Skip a PlanItem (permanent error or user request)
 *   abort          — Abort entire plan
 *   pause          — Pause plan (e.g., waiting for user input)
 *
 * Tool handler does NOT contain business logic beyond:
 *   (a) validate args against current state machine
 *   (b) update TaskPlan data
 *   (c) persist to CheckpointStore
 *   (d) return new state
 *
 * NO natural language reasoning in this handler.
 * sessionId is read from mutable context (UpdatePlanContext), NOT from LLM args.
 */

import type { Tool, ToolPlugin } from '../tools/tool-registry.js';
import type { CheckpointStore } from '../checkpoint.js';
import type { TaskPlan, PlanItem, UpdatePlanContext, EvidenceLog, ToolCallRecord } from './types.js';
import { DEFAULT_ABANDON_MS, validateTransition, isPlanActive } from './types.js';
import { Logger } from '../logger.js';

const log = new Logger({ module: 'UpdatePlanTool' });

/**
 * Create a plan ID suitable for the session.
 */
function makePlanId(sessionId: string): string {
  return `plan-${sessionId}-${Date.now()}`;
}

/**
 * Create a PlanItem from a description string + index.
 */
function makePlanItem(description: string, index: number): PlanItem {
  return {
    index,
    description,
    status: 'pending',
    consecutiveFailedAttempts: 0,
  };
}

/**
 * Create the update_plan tool plugin.
 * @param checkpointStore - CheckpointStore for persistence
 * @param ctx - Mutable context ref (sessionId + callback injected by Engine)
 */
export function createUpdatePlanPlugin(checkpointStore: CheckpointStore, ctx: UpdatePlanContext): ToolPlugin {
  const tool: Tool = {
    name: 'update_plan',
    description: `QUẢN LÝ KẾ HOẠCH (State-Driven Task Plan) — BẮT BUỘC dùng cho MỌI request.

ACTIONS:
- action='create', items=[...]: Tạo plan mới. Đây là bước ĐẦU TIÊN của mọi request — kể cả plan 1 bước.
- action='complete_item', item_index=N, result_summary=...: Đánh dấu item N hoàn thành.
- action='skip_item', item_index=N, reason=...: Bỏ qua item N (lỗi vĩnh viễn hoặc user yêu cầu).
- action='abort', reason=...: Hủy toàn bộ plan.
- action='pause', reason=...: Tạm dừng plan (chờ input).`,
    schema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['create', 'complete_item', 'skip_item', 'abort', 'pause'],
          description: 'Hành động cần thực hiện',
        },
        items: {
          type: 'array',
          items: { type: 'string' },
          description: 'Danh sách các bước (mỗi string = 1 bước). Chỉ dùng với action="create".',
        },
        item_index: {
          type: 'number',
          description: 'Index của item (0-based). Chỉ dùng với action="complete_item" hoặc "skip_item".',
        },
        result_summary: {
          type: 'string',
          description: 'Tóm tắt kết quả của item vừa hoàn thành. Chỉ dùng với action="complete_item".',
        },
        reason: {
          type: 'string',
          description: 'Lý do. Dùng với action="abort", "pause", hoặc "skip_item".',
        },
      },
      required: ['action'],
    },
    execute: async (args: Record<string, any>): Promise<Record<string, any>> => {
      const action = args.action as string;
      const validActions = ['create', 'complete_item', 'skip_item', 'abort', 'pause'];

      if (!validActions.includes(action)) {
        return {
          error: `Invalid action "${action}". Valid: ${validActions.join(', ')}`,
          plan_status: 'unknown',
        };
      }

      // ── sessionId from context (B2: NOT from LLM args) ──
      const sessionId = ctx.currentSessionId || 'default';

      // ── action: create ──
      if (action === 'create') {
        const itemsRaw = args.items as string[] | undefined;
        if (!itemsRaw || !Array.isArray(itemsRaw) || itemsRaw.length === 0) {
          return { error: 'action="create" requires "items" (non-empty array of strings)', plan_status: 'unknown' };
        }

        const goal = (args.goal as string) || itemsRaw[0];

        // Check if there's already an active plan for this session
        const existing = checkpointStore.getPlan(sessionId);
        if (existing && isPlanActive(existing.status)) {
          return {
            error: `Cannot create plan: session already has active plan (status=${existing.status}). Use action="abort" first or complete existing items.`,
            plan_status: existing.status,
            plan_id: existing.id,
          };
        }

        const planId = makePlanId(sessionId);
        const plan: TaskPlan = {
          id: planId,
          sessionId,
          requestId: planId,
          goal,
          items: itemsRaw.map((desc, i) => makePlanItem(desc, i)),
          status: 'pending',
          currentItemIndex: 0,
          createdAt: Date.now(),
          abandonAfterMs: DEFAULT_ABANDON_MS,
        };

        checkpointStore.setPlan(sessionId, plan);

        // D3: Update cycle budget immediately via callback
        try {
          ctx.onPlanCreated(itemsRaw.length);
        } catch (cbErr: any) {
          log.warn(`[update_plan] onPlanCreated callback failed: ${cbErr.message}`);
        }

        log.info(`[update_plan] Created plan ${planId} for session ${sessionId}: ${itemsRaw.length} items`);

        return {
          plan_id: planId,
          plan_status: plan.status,
          current_item_index: plan.currentItemIndex,
          items_count: plan.items.length,
          items: plan.items.map(i => `${i.index}: [${i.status}] ${i.description}`),
          message: `✅ Plan created with ${plan.items.length} item(s). Start with item 0: "${plan.items[0]?.description}".`,
        };
      }

      // ── All other actions require an existing plan ──
      const existingPlan = checkpointStore.getPlan(sessionId);

      if (!existingPlan) {
        return { error: `No active plan found for session "${sessionId}". Call update_plan(action='create', items=[...]) first.`, plan_status: 'none' };
      }

      const plan: TaskPlan = existingPlan; // non-null after guard above

      if (plan.status === 'completed' || plan.status === 'aborted' || plan.status === 'failed') {
        return { error: `Plan is already ${plan.status}. Cannot perform action "${action}".`, plan_status: plan.status, plan_id: plan.id };
      }

      // ── Helper: update plan and persist ──
      function save(): void {
        checkpointStore.setPlan(sessionId, plan);
      }

      // ── Helper: build summary ──
      function summary(): string[] {
        return plan.items.map(i => `${i.index}: [${i.status}] ${i.description}${i.resultSummary ? ' — ' + i.resultSummary : ''}${i.error ? ' ⚠️ ' + i.error : ''}`);
      }

      // ── action: complete_item ──
      if (action === 'complete_item') {
        // item_index từ LLM có thể là string (JSON parse không auto-convert kiểu)
        const rawIdx = args.item_index;
        const itemIndex = typeof rawIdx === 'string' ? parseInt(rawIdx, 10) : rawIdx as number;
        if (typeof itemIndex !== 'number' || isNaN(itemIndex) || itemIndex < 0 || itemIndex >= plan.items.length) {
          return { error: `Invalid item_index ${rawIdx}. Must be 0..${plan.items.length - 1}`, plan_status: plan.status, plan_id: plan.id };
        }

        const item = plan.items[itemIndex];
        if (item.status === 'completed') {
          return { error: `Item ${itemIndex} ("${item.description}") is already completed.`, plan_status: plan.status, plan_id: plan.id };
        }

        // ── Evidence-based completion validation ──
        // Chỉ chấp nhận complete_item nếu có tool call thật đã được thực thi cho item này.
        // evidenceLog được orchestrator (agent loop) tự động ghi nhận.
        const evidence: ToolCallRecord[] = (ctx.evidenceLog?.get(itemIndex)) || [];
        if (evidence.length === 0) {
          return {
            error: `No evidence of tool execution for item ${itemIndex}. You must actually execute this item (call tools) before calling complete_item. Evidence log is empty.`,
            plan_status: plan.status,
            plan_id: plan.id,
          };
        }
        // Nếu tất cả evidence đều lỗi → reject
        const allFailed = evidence.every(e => !e.success);
        if (allFailed) {
          return {
            error: `All tool calls for item ${itemIndex} failed. Cannot mark as completed. Consider calling skip_item instead if the task is impossible.`,
            plan_status: plan.status,
            plan_id: plan.id,
          };
        }

        // Validate transition: cho phép từ pending, running, stuck, waiting_user, paused_limit
        const transErr = validateTransition(plan.status, 'running');
        if (transErr && plan.status !== 'running' && plan.status !== 'pending' && plan.status !== 'stuck' && plan.status !== 'waiting_user' && plan.status !== 'paused_limit') {
          return { error: transErr, plan_status: plan.status, plan_id: plan.id };
        }

        item.status = 'completed';
        item.resultSummary = (args.result_summary as string) || undefined;
        // Reset stagnation counter khi item được hoàn thành
        item.consecutiveFailedAttempts = 0;

        // Transition: pending→running, stuck→running
        if (plan.status === 'pending') {
          plan.status = 'running';
        } else if (plan.status === 'stuck') {
          plan.status = 'running';
          log.info(`[update_plan] Plan ${plan.id} recovered from stuck → running (item ${itemIndex} completed)`);
        }

        plan.currentItemIndex = itemIndex + 1;

        // Check if all items are done or skipped/failed — → completed
        const allDone = plan.items.every(i => i.status === 'completed' || i.status === 'skipped' || i.status === 'failed');
        if (allDone) {
          const compErr = validateTransition(plan.status, 'completed');
          if (compErr) return { error: compErr, plan_status: plan.status, plan_id: plan.id };
          plan.status = 'completed';
          plan.completedAt = Date.now();
          save();
          log.info(`[update_plan] Plan ${plan.id} COMPLETED`);
          return {
            plan_id: plan.id,
            plan_status: 'completed',
            message: `✅ All ${plan.items.length} item(s) completed. Plan finished.`,
            summary: summary(),
          };
        }

        save();

        const nextItem = plan.items[plan.currentItemIndex];
        log.info(`[update_plan] Item ${itemIndex} completed. Next: ${nextItem ? `item ${nextItem.index}: ${nextItem.description}` : 'none'}`);

        return {
          plan_id: plan.id,
          plan_status: plan.status,
          current_item_index: plan.currentItemIndex,
          completed_item: itemIndex,
          next_item: nextItem ? { index: nextItem.index, description: nextItem.description } : null,
          message: `✅ Item ${itemIndex} completed. ${nextItem ? `Next: item ${nextItem.index} — "${nextItem.description}"` : 'All done!'}`,
          summary: summary(),
        };
      }

      // ── action: skip_item ──
      if (action === 'skip_item') {
        const rawIdx = args.item_index;
        const itemIndex = typeof rawIdx === 'string' ? parseInt(rawIdx, 10) : rawIdx as number;
        if (typeof itemIndex !== 'number' || isNaN(itemIndex) || itemIndex < 0 || itemIndex >= plan.items.length) {
          return { error: `Invalid item_index ${rawIdx}. Must be 0..${plan.items.length - 1}`, plan_status: plan.status, plan_id: plan.id };
        }

        // Validate: can only skip from running, pending, or stuck
        const skipErr = validateTransition(plan.status, 'running');
        if (skipErr && plan.status !== 'pending' && plan.status !== 'stuck') {
          return { error: `Cannot skip item from state "${plan.status}". Plan must be running, pending, or stuck.`, plan_status: plan.status, plan_id: plan.id };
        }

        const item = plan.items[itemIndex];
        item.status = 'skipped';
        item.error = (args.reason as string) || 'Skipped by user/error';

        // Check if >50% items are failed/skipped → transition to 'failed'
        const failCount = plan.items.filter(i => i.status === 'failed' || i.status === 'skipped').length;
        if (failCount > plan.items.length / 2) {
          const failErr = validateTransition(plan.status, 'failed');
          if (failErr) return { error: failErr, plan_status: plan.status, plan_id: plan.id };
          plan.status = 'failed';
          plan.stopReason = `Too many failed/skipped items (${failCount}/${plan.items.length})`;
          save();
          log.info(`[update_plan] Plan ${plan.id} FAILED (${failCount}/${plan.items.length} items failed/skipped)`);
          return {
            plan_id: plan.id,
            plan_status: 'failed',
            stop_reason: plan.stopReason,
            message: `❌ Plan failed: ${failCount}/${plan.items.length} items were skipped/failed.`,
            summary: summary(),
          };
        }

        if (plan.status === 'pending') plan.status = 'running';
        plan.currentItemIndex = itemIndex + 1;
        save();

        const nextItem = plan.items[plan.currentItemIndex];
        log.info(`[update_plan] Item ${itemIndex} skipped. Next: ${nextItem ? `item ${nextItem.index}` : 'none'}`);

        return {
          plan_id: plan.id,
          plan_status: plan.status,
          current_item_index: plan.currentItemIndex,
          skipped_item: itemIndex,
          next_item: nextItem ? { index: nextItem.index, description: nextItem.description } : null,
          message: `⏭️ Item ${itemIndex} skipped. ${nextItem ? `Next: item ${nextItem.index} — "${nextItem.description}"` : 'No more items.'}`,
          summary: summary(),
        };
      }

      // ── action: abort ──
      if (action === 'abort') {
        const abortErr = validateTransition(plan.status, 'aborted');
        if (abortErr) return { error: abortErr, plan_status: plan.status, plan_id: plan.id };

        const reason = (args.reason as string) || 'Aborted by user/LLM';
        plan.status = 'aborted';
        plan.stopReason = reason;
        plan.completedAt = Date.now();
        save();

        log.info(`[update_plan] Plan ${plan.id} ABORTED: ${reason}`);

        return {
          plan_id: plan.id,
          plan_status: 'aborted',
          stop_reason: reason,
          message: `🛑 Plan aborted: ${reason}`,
          summary: summary(),
        };
      }

      // ── action: pause ──
      if (action === 'pause') {
        const pauseErr = validateTransition(plan.status, 'waiting_user');
        if (pauseErr) return { error: pauseErr, plan_status: plan.status, plan_id: plan.id };

        const reason = (args.reason as string) || 'Paused';
        plan.status = 'waiting_user';
        plan.stopReason = reason;
        save();

        log.info(`[update_plan] Plan ${plan.id} PAUSED (waiting_user): ${reason}`);

        return {
          plan_id: plan.id,
          plan_status: 'waiting_user',
          stop_reason: reason,
          message: `⏸️ Plan paused: ${reason}`,
          summary: summary(),
        };
      }

      // Should never reach here
      return { error: `Unhandled action "${action}"`, plan_status: plan.status || 'unknown' };
    },
  };

  return {
    name: 'update_plan',
    tools: [tool],
  };
}
