# Coral — Architecture Contract (BẮT BUỘC)

> Bản tóm tắt này KHÔNG thay thế ADR-000. Trước khi SỬA bất kỳ state nào
> (plan, session, task, item, evidence, checkpoint), BẮT BUỘC đọc đầy đủ:
> `docs/adr/ADR-000-state-principles.md`
> Tài liệu gốc đó là hợp đồng kiến trúc — bản này chỉ là tóm tắt nhanh.

## 5 Nguyên tắc state (ADR-000 §2) — không thêm, không sửa

1. **Một state, một nguồn sự thật** — mọi nơi cần biết trạng thái phải đọc từ
   nguồn duy nhất, không cache ra biến local rồi tự suy luận riêng.
2. **Không dùng cờ boolean set-once** cho vòng đời nhiều giai đoạn
   (cấm `hasCreatedPlan`, `executionPhase`, `isDone`...). Dùng discriminated
   union + tính lại mỗi lần cần dùng.
3. **State per-request không sống trên object dùng chung** — phải dùng
   `RequestContext` (AsyncLocalStorage, `src/core/request-context.ts`) hoặc
   truyền tường minh qua tham số. Cấm gán `this.xxx` trên Engine/Agent/CheckpointStore singleton.
4. **Model không được tự ý tạo transition** — chỉ đề xuất hành động hợp lệ;
   orchestrator (code) quyết định và từ chối tường minh nếu không hợp lệ.
5. **Không tin text model tự viết làm bằng chứng** — cần bằng chứng cấu trúc
   (tool result thật trong `evidenceLog`).

## Single source of truth cho PlanState

- **Hàm derive DUY NHẤT được phép**: `derivePlanState()` tại
  `src/core/plan/plan-state.ts`.
- Mọi nơi cần trạng thái plan (agent.ts, engine.ts, update-plan-tool.ts)
  PHẢI gọi hàm này — cấm tự re-implement logic derive ở nơi khác.
- `canCompleteItem()` cũng chỉ nằm ở `plan-state.ts` — bảo vệ evidence-based
  completion (nguyên tắc 5).
- ADR-001: PlanState là discriminated union
  `none | planning | executing | completed | failed | aborted`.

## Import rules (CORAL.md §8)

| From | To | Status |
|------|----|--------|
| `modules/` | `core/` | OK via barrel |
| `core/` | `modules/` | FORBIDDEN |
| `scripts/` | `core/` | FORBIDDEN |
| any code | `knowledge/` | FORBIDDEN |
