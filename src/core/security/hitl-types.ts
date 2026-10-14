/**
 * @file hitl-types.ts — Formal HITL Contract & Data Model
 * @layer core
 * @owner core-security
 *
 * Architecture Reference: docs/adr/ADR-000-state-principles.md
 * Design Reference: HITL_ADMIN_AUTHORIZATION_DESIGN_H1.md
 */

export type HITLActionType = 'tool_call' | 'command' | 'system_operation' | 'file_mutation';

export type HITLRiskLevel = 'low' | 'medium' | 'high' | 'critical';

export type HITLDecisionType = 'approve' | 'reject';

export type HITLDecisionChannel = 'telegram' | 'cli' | 'ipc' | 'system_policy';

/**
 * Các trạng thái hợp lệ của một Approval Request.
 * Tuân thủ ADR-000 §2P2: Union type tường minh, không dùng cờ boolean set-once.
 * 4 trạng thái sau là Terminal States: 'approved' | 'rejected' | 'expired' | 'cancelled'.
 */
export type HITLRequestState =
  | 'pending'    // Đang chờ con người phê duyệt
  | 'approved'   // Đã được người có thẩm quyền phê duyệt
  | 'rejected'   // Đã bị từ chối
  | 'expired'    // Hết thời gian chờ (TTL)
  | 'cancelled'; // Bị hủy do Session abort (/cancel) hoặc Plan termination

/**
 * Cấu trúc mô tả hành động cần phê duyệt.
 */
export interface HITLActionDescriptor {
  type: HITLActionType;
  name: string;
  args?: Record<string, unknown>;
  /** Chuỗi tóm tắt an toàn cho approver xem (đã ẩn sensitive tokens) */
  description: string;
  /** Băm SHA-256 của arguments để phát hiện tampering */
  argsDigest?: string;
  riskLevel: HITLRiskLevel;
}

/**
 * Tương quan ngữ cảnh đa tầng (Cross-Layer Correlation).
 */
export interface HITLCorrelationContext {
  /** ID duy nhất của Approval Request: hitl:<timestamp>:<nanoid> */
  requestId: string;
  /** Correlation Token bí mật chống brute-force / guessing */
  correlationToken: string;
  /** Định danh phiên làm việc */
  sessionId: string;
  /** Định danh tác vụ */
  taskId: string;
  /** Định danh kế hoạch TaskPlan (nếu có) */
  planId?: string;
  /** Phiên bản checkpoint của Engine */
  checkpointRequestId?: string;
  /** ID cụ thể của tool_call trong LLM response */
  toolCallId?: string;
}

/**
 * Bản ghi yêu cầu phê duyệt hoàn chỉnh (Entity lưu SQLite).
 */
export interface HITLApprovalRequest {
  id: string; // Khóa chính (requestId)
  correlation: HITLCorrelationContext;
  action: HITLActionDescriptor;
  status: HITLRequestState;

  /** Người yêu cầu (Requester) */
  requesterUserId: string;
  requesterDisplay?: string;

  /** Thời gian & Hạn định */
  createdAt: number;
  expiresAt: number;

  /** Thông tin quyết định (null khi pending) */
  decision?: {
    decidedAt: number;
    decidedBy: string; // Actor ID
    approverRole: 'admin' | 'owner' | 'system';
    channel: HITLDecisionChannel;
    type: HITLDecisionType;
    reason?: string;
    signature?: string; // HMAC/Token ký duyệt
  };

  /** Nguyên nhân kích hoạt */
  triggerReason: string;
  /** Bằng chứng Consequence Memory liên quan (nếu có) */
  evidenceIds?: string[];
}

/**
 * Yêu cầu gửi quyết định phê duyệt (Input của Admin Decision Service).
 */
export interface SubmitDecisionInput {
  requestId: string;
  correlationToken?: string;
  decision: HITLDecisionType;
  actorId: string;
  actorRole: 'admin' | 'owner' | 'system';
  channel: HITLDecisionChannel;
  reason?: string;
  idempotencyKey?: string;
}

/**
 * Kết quả xử lý quyết định.
 */
export interface SubmitDecisionResult {
  success: boolean;
  status: HITLRequestState;
  requestId: string;
  message: string;
  decidedAt?: number;
  errorCode?: 'NOT_FOUND' | 'ALREADY_DECIDED' | 'UNAUTHORIZED' | 'EXPIRED' | 'TOKEN_MISMATCH' | 'INVARIANT_VIOLATION';
}
