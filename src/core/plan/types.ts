/**
 * @file Plan Types — State-Driven Task Plan Data Model
 * @layer core
 * @owner core-engine
 *
 * Coral Agent — Task Plan data model
 * Replaces all heuristic intent-detection with explicit state-driven planning.
 *
 * Architecture:
 *   Every request goes through a mandatory Planning Phase (update_plan action:'create')
 *   before execution. No fast-path, no regex guessing.
 *
 * State machine:
 *   pending → running (when first item starts)
 *   running → running (complete_item, more items remain)
 *   running → completed (complete_item, no items remain)
 *   running → paused_limit (maxToolCycles hit mid-plan)
 *   running → waiting_user (risk-gate approval needed)
 *   running → failed (security error or >50% items failed)
 *   running → aborted (action:'abort')
 *   running → stuck (stagnation detected on current item)
 *   paused_limit → running (auto-resume on next cycle)
 *   waiting_user → running (user responds, LLM calls update_plan)
 *   stuck → running (user responds via update_plan, e.g., skip/adjust item)
 *   stuck → aborted (user chooses to abort entirely)
 *   All other transitions are INVALID.
 */

export type PlanItemStatus = 'pending' | 'in_progress' | 'completed' | 'skipped' | 'failed';

export interface PlanItem {
  index: number;
  description: string;
  status: PlanItemStatus;
  completedByTool?: string;
  resultSummary?: string;
  error?: string;
  errorCategory?: 'transient' | 'permanent' | 'security';
  /** Số lần thử liên tiếp trên item này mà KHÔNG dẫn tới completed */
  consecutiveFailedAttempts: number;  // default 0
  /** Số lần lỗi TRANSIENT liên tiếp trên item này (timeout/network/rate-limit).
   *  Không cộng vào consecutiveFailedAttempts — transient có thể tự khỏi.
   *  Khi vượt MAX_TRANSIENT_RETRY thì chuyển xử lý như permanent. */
  consecutiveTransientAttempts?: number;  // default 0
  /** Nhóm tool được coi là "đủ bằng chứng" cho item này.
   *  Nếu undefined hoặc rỗng, fallback: chỉ cần evidence log không rỗng. */
  requiredToolGroups?: string[];
}

export type PlanStatus =
  | 'pending'          // vừa tạo, chưa chạy bước nào
  | 'running'          // đang thực thi
  | 'waiting_user'     // cần user quyết định (VD: xác nhận hành động rủi ro)
  | 'paused_limit'     // dừng vì chạm resource limit (maxToolCycles) — KHÁC waiting_user
  | 'completed'
  | 'failed'
  | 'aborted'          // user chủ động hủy qua update_plan(action: 'abort')
  | 'stuck';           // bị kẹt lặp lại cùng vấn đề, cần user quyết định hướng đi khác

export interface TaskPlan {
  id: string;
  sessionId: string;
  requestId: string;
  goal: string;                  // câu gốc của user
  items: PlanItem[];
  status: PlanStatus;
  currentItemIndex: number;
  stopReason?: string;
  createdAt: number;
  completedAt?: number;
  abandonAfterMs: number;        // default 2 giờ (2 * 60 * 60 * 1000)
}

/**
 * Standard TTL for abandoned plans.
 */
export const DEFAULT_ABANDON_MS = 2 * 60 * 60 * 1000; // 2 hours

/**
 * STAGNATION_THRESHOLD — số lần liên tiếp không tiến triển trên CÙNG 1 item
 * trước khi dừng plan và chuyển sang trạng thái 'stuck'.
 * 5 lần: đủ để phân biệt giữa "cần thử lại" vs "thực sự bị kẹt".
 */
export const STAGNATION_THRESHOLD = 5;

/**
 * MAX_TRANSIENT_RETRY — số lần lỗi transient liên tiếp (timeout/network/rate-limit)
 * cho CÙNG 1 item trước khi coi như permanent.
 * Transient không cộng vào consecutiveFailedAttempts (không kích hoạt stuck sớm),
 * nhưng vẫn có giới hạn riêng để tránh vòng lặp vô hạn khi 1 lỗi "tưởng transient"
 * thực ra không bao giờ tự khỏi.
 */
export const MAX_TRANSIENT_RETRY = 3;

/**
 * ABSOLUTE_SAFETY_CEILING — cầu chì tuyệt đối chống runaway chi phí.
 * 200 cycles: KHÔNG dùng để điều tiết công việc bình thường, chỉ chống bug loop
 * thật sự (VD counter stagnation bị lỗi logic, không tự tăng đúng).
 * Khi chạm 200 → dừng với cảnh báo nghiêm trọng khác hẳn thông điệp 'stuck' bình thường.
 */
export const ABSOLUTE_SAFETY_CEILING = 200;

/**
 * @deprecated Không dùng nữa trong luồng chính. Giữ lại để backward compatibility
 * với code cũ nếu có. Thay thế bằng tracking stagnation per-item.
 */
export const SAFETY_CEILING = 50;

/**
 * @deprecated Không dùng nữa trong luồng chính.
 */
export const BASE_PLANNING_BUDGET = 6;

/**
 * @deprecated Không dùng nữa trong luồng chính.
 */
export const PLAN_CYCLES_PER_ITEM = 3;

/**
 * @deprecated Không dùng nữa trong luồng chính. Thay thế bằng stagnation tracking.
 */
export function computePlanBudget(itemCount: number): number {
  return Math.min(itemCount * PLAN_CYCLES_PER_ITEM, SAFETY_CEILING);
}

/**
 * Mutable context ref for update_plan tool.
 * Engine sets these values before each agent.run().
 * The tool handler reads sessionId from here (NOT from LLM args — security).
 * The tool handler calls onPlanCreated when a plan is created (D3 fix).
 */
export interface UpdatePlanContext {
  currentSessionId: string;
  onPlanCreated: (itemCount: number) => void;
  /** Evidence log: tự động ghi nhận tool call thành công cho item đang active. */
  evidenceLog?: EvidenceLog;
}

/**
 * Evidence record — logged by orchestrator for each successful tool call
 * while an item is active. Used by complete_item to validate real execution.
 */
export interface ToolCallRecord {
  toolName: string;
  args: Record<string, unknown>;
  result: any;
  timestamp: number;
  success: boolean;
}

/**
 * Map<itemIndex, ToolCallRecord[]> — evidence log for plan items.
 * Automatically populated by the agent loop; read by update_plan handler.
 */
export type EvidenceLog = Map<number, ToolCallRecord[]>;

/**
 * UpdatePlan tool argument schema.
 */
export interface UpdatePlanArgs {
  action: 'create' | 'complete_item' | 'skip_item' | 'abort' | 'pause';
  items?: string[];       // dùng khi action='create'
  item_index?: number;    // dùng khi action='complete_item'/'skip_item'
  result_summary?: string;
  reason?: string;        // dùng khi action='abort'/'pause'/'skip_item'
}

/**
 * Check whether a PlanStatus is considered "active" (has an in-flight plan).
 */
export function isPlanActive(status: PlanStatus): boolean {
  return status === 'pending' || status === 'running' || status === 'paused_limit' || status === 'waiting_user' || status === 'stuck';
}

/**
 * Allowed state transitions.
 */
const VALID_TRANSITIONS: Record<PlanStatus, PlanStatus[]> = {
  // ponytail: pending → paused_limit là case THẬT — plan được create nhưng loop chạm
  // maxToolCycles trước khi có tool call thật (A3 chưa promote). B4 (engine.ts:865)
  // ghi paused_limit cho cả pending; xóa điều kiện = plan bị bỏ lại pending vô hạn
  // (tái tạo bug drop-silently). Thêm transition thay vì bỏ guard (verdict 2026-08-04).
  // pending → stuck cũng thật: runaway với empty content (E1/E2) làm stagnation đếm
  // failure khi plan chưa bao giờ promote — fuse phải park được plan (agent.ts:1133).
  pending:       ['running', 'aborted', 'paused_limit', 'stuck'],
  running:       ['running', 'completed', 'paused_limit', 'waiting_user', 'failed', 'aborted', 'stuck'],
  paused_limit:  ['running', 'aborted'],
  waiting_user:  ['running', 'aborted'],
  stuck:         ['running', 'aborted'],
  completed:     [],
  failed:        [],
  aborted:       [],
};

/**
 * Validate a state transition.
 * Returns an error string if invalid, or null if allowed.
 */
export function validateTransition(from: PlanStatus, to: PlanStatus): string | null {
  if (from === to) return null; // same state is always allowed (no-op)
  const allowed = VALID_TRANSITIONS[from];
  if (!allowed) return `No transitions allowed from state "${from}"`;
  if (!allowed.includes(to)) {
    return `Invalid transition: "${from}" → "${to}". Allowed: [${allowed.join(', ')}]`;
  }
  return null;
}
