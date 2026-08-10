/**
 * @file Consequence Memory — Types & Schema
 * @layer core
 * @owner core-memory
 *
 * Consequence Memory = sổ cái hậu quả hành động (context → action → outcome → lesson).
 * KHÔNG phải chat memory. Mục tiêu dài hạn: giảm lặp lỗi vận hành; trí nhớ có thể
 * can thiệp control plane (Phase 2+).
 *
 * ADR-003 — Phase 0 (contract). Ràng buộc ADR-000:
 *   - Nguyên tắc 2: reusePolicy là enum, KHÔNG dùng boolean set-once.
 *   - Nguyên tắc 5: `lesson` (text model) KHÔNG BAO GIỜ là điều kiện block.
 *     Quyết định vận hành chỉ dựa outcome/evidence/tool result thật (evidenceRef).
 */

import { z } from 'zod';

// ═══ OUTCOME ═══
export const ConsequenceOutcomeSchema = z.enum([
  'success',
  'fail',
  'partial',
  'rejected_by_gate',
]);
export type ConsequenceOutcome = z.infer<typeof ConsequenceOutcomeSchema>;

// ═══ REUSE POLICY ═══
// Phase 1: hầu hết record là 'record_only' (chỉ ghi, chưa can thiệp).
// 'suggest' / 'require_hitl' / 'block' chỉ là nhãn cho Phase 2+ — CHƯA enforce.
export const ReusePolicySchema = z.enum([
  'suggest',        // lần sau chỉ gợi ý (Phase 2+)
  'require_hitl',   // lần sau cần HITL (Phase 2+)
  'block',          // lần sau chặn (Phase 3+, default không auto-bật)
  'record_only',    // chỉ ghi, chưa dùng để can thiệp
]);
export type ReusePolicy = z.infer<typeof ReusePolicySchema>;

// ═══ CONTEXT ═══
export const ConsequenceContextSchema = z.object({
  goalSummary: z.string().optional(),
  planStatus: z.string().optional(),
  tags: z.array(z.string()).optional(),
  // optional stable hash for similarity later (Phase 2+)
  contextHash: z.string().optional(),
});
export type ConsequenceContext = z.infer<typeof ConsequenceContextSchema>;

// ═══ ACTION ═══
export const ConsequenceActionSchema = z.object({
  toolName: z.string(),
  // args đã redact; chỉ shape/key quan trọng, không value nhạy cảm
  argsDigest: z.string().optional(),
  riskLevel: z.string().optional(),
});
export type ConsequenceAction = z.infer<typeof ConsequenceActionSchema>;

// ═══ EVIDENCE REF ═══
// Neo vào bằng chứng cấu trúc thật (event/checkpoint/cycle) — nền tảng audit.
export const ConsequenceEvidenceRefSchema = z.object({
  eventIds: z.array(z.string()).optional(),
  checkpointId: z.string().optional(),
  cycle: z.number().optional(),
});
export type ConsequenceEvidenceRef = z.infer<typeof ConsequenceEvidenceRefSchema>;

// ═══ RECORD ═══
export const ConsequenceRecordSchema = z.object({
  id: z.string(),
  createdAt: z.number(),
  /**
   * userId — BẮT BUỘC từ Q3 fix (cách ly multi-user).
   * Stamp tại store.append() từ request context (rctx.userId — AsyncLocalStorage,
   * kế thừa qua subagent). Record CŨ (trước Q3) không có userId — không backfill,
   * bị loại khỏi mọi đếm multi-user ở read path.
   */
  userId: z.string(),
  sessionId: z.string().optional(),
  taskId: z.string().optional(),
  agentId: z.string().optional(),

  context: ConsequenceContextSchema,
  action: ConsequenceActionSchema,
  outcome: ConsequenceOutcomeSchema,

  evidenceRef: ConsequenceEvidenceRefSchema,

  // OPTIONAL, NEVER used as block condition (ADR-000 nguyên tắc 5)
  lesson: z.string().optional(),
  reusePolicy: ReusePolicySchema,

  // for future cross-session aggregation (Phase 3+)
  occurrenceCount: z.number().optional(),
  lastSeenAt: z.number().optional(),
});
export type ConsequenceRecord = z.infer<typeof ConsequenceRecordSchema>;

/**
 * Validate a ConsequenceRecord. Returns the parsed record or throws.
 * Single validation point — mọi record phải đi qua đây trước khi lưu.
 */
export function parseConsequenceRecord(input: unknown): ConsequenceRecord {
  return ConsequenceRecordSchema.parse(input);
}