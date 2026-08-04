# ADR-000: Nguyên tắc kiến trúc state cho Coral

> Vị trí đề xuất trong repo: docs/adr/ADR-000-state-principles.md
> Mục đích: đây không phải tài liệu cho 1 lần fix — đây là hợp đồng kiến trúc mà MỌI phiên debug/fix sau này (kể cả agent dev khác, kể cả chính người viết code này sau vài tháng) phải đọc trước khi thêm bất kỳ state mới nào vào Coral.

## 1. BỐI CẢNH: vì sao tài liệu này tồn tại

Trong 1 chuỗi debug liên tiếp (stall-guard, evidence-based completion, derived plan state, concurrency isolation), cùng 1 lớp lỗi xuất hiện lặp lại 3 lần dưới các hình dạng khác nhau:

| Lần | Bug | Biểu hiện |
|-----|-----|-----------|
| 1 | evidenceLog key sai scope | Evidence rò rỉ giữa các plan/session |
| 2 | hasCreatedPlan/executionPhase là cờ set-once | Guard kích hoạt sai sau khi plan đã complete |
| 3 | updatePlanCtx/currentTaskId/evidenceLog sống trên instance dùng chung | Race condition giữa các request đồng thời |

Cả 3 đều là cùng 1 nguyên nhân gốc: state được lưu trữ và suy luận (derive) ở nhiều nơi, không có 1 nguồn sự thật (source of truth) duy nhất, tường minh. Fix riêng lẻ từng cái sẽ luôn theo sau — không ngăn được lỗi thứ 4, thứ 5 xuất hiện dưới dạng khác. Tài liệu này đặt ra quy tắc bắt buộc để chặn cả lớp lỗi, không chỉ từng trường hợp cụ thể.

## 2. NGUYÊN TẮC BẮT BUỘC (áp dụng cho MỌI state trong Coral, không riêng Plan)

### Nguyên tắc 1 — Một state, một nguồn sự thật

Bất kỳ dữ liệu nào mô tả "trạng thái hiện tại của X" (plan, item, session, request, task...) chỉ được lưu ở đúng 1 nơi. Mọi chỗ khác cần biết trạng thái đó phải đọc lại từ nguồn, không được cache vào biến local rồi tự suy luận riêng.

❌ Sai: agent.ts tự tính planComplete bằng logic riêng, engine.ts tự tính lại bằng logic khác.
✅ Đúng: cả 2 gọi derivePlanState(checkpointStore, sessionId) — 1 hàm, 1 nơi định nghĩa.

### Nguyên tắc 2 — Không dùng cờ boolean set-once cho vòng đời có nhiều giai đoạn

Nếu 1 thực thể có thể ở nhiều hơn 2 trạng thái qua thời gian (plan: none → planning → executing → completed/failed/abandoned), không dùng 1 biến boolean (hasCreatedPlan, isDone, isActive...) để mã hóa nó. Dùng union type liệt kê tường minh mọi trạng thái hợp lệ, và trạng thái phải được tính lại mỗi lần cần dùng, không set 1 lần rồi giữ nguyên suốt vòng đời request.

### Nguyên tắc 3 — State per-request không bao giờ sống trên object dùng chung

Bất kỳ dữ liệu nào chỉ có ý nghĩa trong phạm vi 1 request/1 phiên chạy agent (sessionId, taskId, evidence log, context của lần gọi hiện tại...) phải sống trong AsyncLocalStorage (xem src/core/request-context.ts) hoặc được truyền tường minh qua tham số hàm. Không bao giờ gán vào this.xxx của 1 class instance sống lâu hơn 1 request (Engine, singleton CheckpointStore, v.v.).

### Nguyên tắc 4 — Model không được tự ý tạo transition

LLM chỉ được đề xuất hành động tiếp theo trong tập hợp hành động hợp lệ tại trạng thái hiện tại. Orchestrator (code, không phải model) quyết định trạng thái hiện tại là gì và hành động nào hợp lệ. Nếu model gọi hành động không hợp lệ ở trạng thái hiện tại (ví dụ complete_item khi chưa có evidence), orchestrator từ chối tường minh — không âm thầm chấp nhận, không "hiểu ý" model.

### Nguyên tắc 5 — Không tin nội dung text model tự viết làm bằng chứng

Bất kỳ khẳng định nào của model ("đã xong", "đã kiểm tra", "kết quả là...") không được dùng làm điều kiện chuyển trạng thái nếu không có bằng chứng cấu trúc (tool result thật) đi kèm. Đây là nguyên tắc đã áp dụng ở Fix 3 (evidence-based completion) — mở rộng thành quy tắc chung cho mọi nơi tương tự trong tương lai.

## 3. QUY TRÌNH CHO PHIÊN DEBUG/FIX TIẾP THEO (bắt buộc)

Khi phát hiện 1 bug liên quan đến state bị sai/lệch, trước khi vá riêng lẻ:

1. Xác định state đó đang vi phạm nguyên tắc nào ở mục 2 (có thể nhiều hơn 1).
2. Grep toàn codebase tìm state khác cùng dạng vi phạm — không chỉ sửa đúng chỗ đang lỗi. (Đây chính xác là bước đã làm sau Fix 4 — audit toàn bộ codebase phát hiện 12 bug thay vì chỉ vá 1 chỗ. Bước này nên là mặc định, không phải ngoại lệ.)
3. Nếu fix tạo ra state mới (biến, Map, field mới) — kiểm tra chéo lại với 5 nguyên tắc ở mục 2 trước khi commit, không chỉ chạy test pass là đủ.
4. Ghi lại quyết định + lý do vào docs/adr/ nếu đó là 1 quyết định kiến trúc mới (không phải mọi commit, chỉ những gì ảnh hưởng cấu trúc chung).

## 4. ADR-001: State machine cho Plan lifecycle (áp dụng cụ thể)

### Các trạng thái hợp lệ

```typescript
type PlanState =
  | { kind: 'none' }                                    // chưa có plan
  | { kind: 'planning'; planId: string }                // plan vừa tạo, chưa có tool call nào
  | { kind: 'executing'; planId: string; activeItemIndex: number } // đang thực thi item
  | { kind: 'completed'; planId: string }                // tất cả item done
  | { kind: 'failed'; planId: string; reason: string }   // có lỗi không phục hồi được
  | { kind: 'aborted'; planId: string };                // bị hủy giữa chừng
```

### Transition hợp lệ (chỉ những transition này được phép, mọi transition khác bị từ chối)

```text
none        --create-->      planning
planning    --tool_call-->   executing
executing   --tool_call-->   executing        (item khác, hoặc cùng item retry)
executing   --all_items_done--> completed
executing   --unrecoverable_error--> failed
executing   --user_abort-->  aborted
planning    --cycle_limit--> paused_limit     (*) plan tạo xong nhưng chạm maxToolCycles trước khi có tool call thật
planning    --stagnation-->  stuck             (*) runaway empty-content loop đếm failure khi plan chưa promote
```

Không có transition nào đi ngược lại completed/failed/aborted — muốn làm việc mới, phải create plan mới (state planning mới, planId mới).

> **(*) Ghi chú audit 2026-08-04:** `VALID_TRANSITIONS` (types.ts) cho phép `pending → paused_limit` và `pending → stuck`. Lý do: A3 (agent.ts:869) chỉ promote `pending → running` khi có tool call thật (≠ update_plan). Nếu LLM tạo plan rồi loop toàn update_plan/empty (runaway), plan giữ nguyên `pending` khi chạm cycle limit / stagnation — fuse an toàn (engine.ts:865, agent.ts:1133) PHẢI park được plan, không được để kẹt `pending` vô hạn (tái tạo bug drop-silently). Các mutation này đều đi qua `validateTransition()` — REFUSE + log nếu bất hợp pháp.

### Hàm dùng chung (single source of truth)

```typescript
// src/core/plan/plan-state.ts — MODULE DUY NHẤT được phép derive PlanState
export function derivePlanState(
  checkpointStore: CheckpointStore,
  sessionId: string
): PlanState {
  const plan = checkpointStore.getPlan(sessionId);
  if (!plan) return { kind: 'none' };
  if (plan.status === 'completed') return { kind: 'completed', planId: plan.id };
  if (plan.status === 'failed') return { kind: 'failed', planId: plan.id, reason: plan.stopReason ?? 'unknown' };
  if (plan.status === 'aborted') return { kind: 'aborted', planId: plan.id };

  const activeIndex = plan.items.findIndex(i => i.status !== 'completed');
  if (activeIndex === -1) return { kind: 'completed', planId: plan.id }; // fallback an toàn

  const hasAnyToolCall = /* check evidenceLog hoặc tool call history cho plan này */;
  return hasAnyToolCall
    ? { kind: 'executing', planId: plan.id, activeItemIndex: activeIndex }
    : { kind: 'planning', planId: plan.id };
}

export function isGuardActive(state: PlanState): boolean {
  return state.kind === 'planning' || state.kind === 'executing';
}

export function canCompleteItem(state: PlanState, itemIndex: number, evidenceLog: EvidenceLog): boolean {
  if (state.kind !== 'executing' && state.kind !== 'planning') return false;
  const evidence = evidenceLog.get(makeEvidenceKey(state.planId, itemIndex));
  return !!evidence && evidence.some(e => e.result.status === 'success');
}
```

Bắt buộc: agent.ts, engine.ts, update-plan-tool.ts — cả 3 file đều import và gọi các hàm này, không tự viết logic derive riêng ở bất kỳ đâu khác. Nếu 1 file cần thông tin gì mà hàm hiện tại chưa cung cấp, mở rộng hàm dùng chung, không viết logic song song.

### Migration khỏi kiến trúc hiện tại

- hasCreatedPlan, executionPhase (agent.ts) → xóa, thay bằng derivePlanState() gọi mỗi iteration.
- if (activePlan) (engine.ts, đang truthy-check sai) → thay bằng isGuardActive(derivePlanState(...)). ✅ Đã fix (2026-07-29).
- Logic validate riêng trong update-plan-tool.ts → thay bằng canCompleteItem().

## 5. NHỮNG GÌ CHƯA ĐƯỢC HÌNH THỨC HÓA (out of scope của ADR-001, cần ADR riêng nếu cần)

- **QUYẾT ĐỊNH TẠO PLAN hiện là model-discretionary — KHÔNG có code-level enforcement (gap đã biết, 2026-08-04).** Prompt-builder (5c/5d HARD RULE) và engine.ts planning-phase inject đều nói "BẮT BUỘC gọi update_plan(action='create') — không có exception", nhưng đây chỉ là prompt-text: không có code nào đo độ phức tạp/độ dài task để ép tạo plan, cũng không chặn model trả lời thẳng khi chưa có plan. Điều tra 2026-08-04 xác nhận: (1) HARD RULE được thêm mới nguyên vẹn tại d48588ce (25/07) với form "không exception" ngay từ đầu — không có complexity gate nào từng tồn tại để bị gỡ; (2) engine.ts:798-815 inject planning instruction vô điều kiện, không branch theo độ phức tạp; (3) DEFAULT_RULES (chứa 5c/5d) luôn push vào mọi prompt, không trim; (4) grep agent.ts/engine.ts không có heuristic simple/complexity/needsPlan nào. Vì vậy `planState=none` cho request đơn giản KHÔNG phải lúc nào cũng là bug — model tự quyết định bỏ qua (không đáng tin cậy 100%). Đang thu thập dữ liệu observational (`[PlanObs]` log, agent.ts:781/1250) trước khi quyết định có xây complexity gate ở code hay không. Nếu phiên sau nghi ngờ lại: đọc note này, KHÔNG lặp lại cuộc điều tra.
- Vòng đời Session (khác Plan — 1 session có thể có nhiều plan nối tiếp) — hiện tại chưa có state machine tường minh, đang được cô lập qua AsyncLocalStorage (đúng nguyên tắc 3) nhưng chưa có union type mô tả các trạng thái session hợp lệ. Nên làm ADR-002 riêng nếu session bắt đầu có logic phức tạp hơn.
- Vòng đời Item trong 1 plan (pending → in_progress → completed/failed/skipped) — hiện đang là field status rời rạc trên PlanItem, chưa có transition validation tường minh giống Plan. Cân nhắc ADR-003 nếu cần.

## 6. CÁCH DÙNG TÀI LIỆU NÀY TRONG PHIÊN DEBUG TƯƠNG LAI

Khi bắt đầu 1 phiên debug/fix mới liên quan đến agent loop, plan, session, hoặc bất kỳ dạng "trạng thái thay đổi qua nhiều bước" nào:

1. Đọc docs/adr/ADR-000-state-principles.md (tài liệu này) trước khi viết code.
2. Nếu bug liên quan đến Plan → đối chiếu với ADR-001, đảm bảo fix không tạo ra logic derive song song mới.
3. Nếu bug tạo ra 1 dạng vòng đời/state mới chưa có ADR (ví dụ Session, Item) → cân nhắc viết ADR mới theo đúng khuôn mẫu của ADR-001, thay vì vá tạm.
4. Mọi PR thêm field/biến mới mô tả "trạng thái" phải tự trả lời được: field này vi phạm nguyên tắc nào ở mục 2 không?
