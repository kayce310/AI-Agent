# R4 v1 SPECIFICATION — Planning Behavior Verification (Minimal Package)

**Date:** 2026-08-26
**Repo:** D:\AI-Agent (branch `r1-execution-safety`)
**Status:** SPEC-READY — awaiting owner confirmation trước khi implement.
**Decisions chốt bởi Kayce (input của spec này):**
1. PACKAGE = **MINIMAL**: B3 + B4-inv (B5 excluded)
2. Q3 = prompt-driven giữ nguyên; KHÔNG enforce planning trong R4 v1
3. **B4-sem = Option A HARD-REJECT** — explicit new product decision, độc lập với lịch sử code/test
4. Evidence = controlled/scripted model, single-run per scenario, không K-runs, real-model chỉ supplementary non-gating

---

## 1. REQUIREMENTS

### R4-F.1 — Planning Loop Coherence (từ B3)

Một planning lifecycle thực tế, chạy qua full engine loop bằng controlled/scripted model, phải:

1. Plan được tạo qua `update_plan(action='create')` và persist vào CheckpointStore.
2. Plan items được thực thi theo thứ tự item index.
3. Mọi item completion tuân thủ evidence gate (`canCompleteItem`).
4. Mọi state transition quan sát được nằm trong `VALID_TRANSITIONS` (`src/core/plan/types.ts`).
5. Lifecycle kết thúc ở trạng thái nhất quán (terminal consistency).
6. Không có invalid transition nào xảy ra trong toàn bộ run.
7. Không có completion claim không có evidence.

**Đây là behavioral/integration verification qua loop thật** (engine → toolRegistry → update_plan → checkpoint), KHÔNG phải re-run unit test state machine đã có (103 tests hiện hữu giữ nguyên, không tính vào R4 evidence).

### R4-F.2 — Single Active-Plan Invariant (từ B4-inv)

Một session KHÔNG THỂ có hai active plans đồng thời. Invariant phải được kiểm chứng **độc lập với model behavior** (enforced bởi code path, không phụ thuộc model ngoan).

---

## 2. B4 SEMANTICS — HARD-REJECT (PRODUCT DECISION A, CHỐT 2026-08-26)

Khi `update_plan(action='create')` được gọi trong session đang có active plan (status ∈ {pending, running, paused_limit, waiting_user, stuck} — `isPlanActive`):

- Request bị **REJECT** với error observable;
- KHÔNG resume/reuse active plan;
- KHÔNG reconcile goal, KHÔNG override goal, KHÔNG merge/reconcile items;
- KHÔNG tạo thêm plan object mới;
- Existing plan bất biến: `id`, `status`, `items`, `currentItemIndex` giữ nguyên trước/sau rejection;
- Rejection payload: `{ error, plan_status: <existing status>, plan_id: <existing id> }` — deterministic, giống hệt mọi lần gọi.

**Framing cấm:** không được ghi trong bất kỳ document nào rằng đây là "giữ vì code hiện tại làm vậy", "fix regression", hay "khôi phục behavior cũ". Đây là quyết định sản phẩm mới, chốt độc lập.

**Decision history (đã audit, xem đầy đủ `docs/evidence/R4/B4_SEMANTICS_DECISION.md`):**
- Hard-reject ra đời cùng hệ thống plan: `d48588ce` (25-07-2026), liên tục qua mọi production commit tới HEAD — không có regression event.
- Một hướng resume/reuse từng tồn tại CHỈ dạng WIP chưa ship: stash `14c65b0f` (18-08-2026, blob `update-plan-tool.ts` có `resumedExistingPlan: true`) + checkpoint `a0e207f6` (test hỏng encode resume). Abandoned không record — hai bản nháp WIP còn mâu thuẫn nhau về response shape.
- Resume/reuse có thể trở thành R4.x hoặc initiative riêng sau này; KHÔNG thuộc v1.

---

## 3. ACCEPTANCE CRITERIA — OBSERVABLE SIGNALS

Toàn bộ assertion nhắm END-STATE đọc từ CheckpointStore / EvidenceLog / return payload. Cấm assertion dạng "model trông hợp lý".

### R4-F.1 criteria

| ID | Assertion | Pass signal | Fail signal |
|---|---|---|---|
| F1-AC1 | Task đa bước qua `engine.process()` với scripted model → plan tồn tại trong store, đi pending→running | `store.getPlan(sid)` non-null; status journey chỉ chứa transitions hợp pháp | plan không tạo / transition ngoài bảng |
| F1-AC2 | Item hoàn thành ⟹ ≥1 `ToolCallRecord` với `success=true` trong `evidenceLog.get(itemIndex)` TRƯỚC khi complete_item được accept | mọi `item.status==='completed'` có evidence tương ứng | item completed nhưng evidence rỗng/all-failed |
| F1-AC3 | `complete_item` khi evidence rỗng hoặc all-failed ⟹ bị reject với error, item KHÔNG đổi status, plan status không đổi | error payload trả về; store xác nhận item vẫn pending/in_progress | item bị mark completed dù không evidence |
| F1-AC4 | Zero invalid transition toàn run: ghi lại mọi (from,to) quan sát được, mỗi cặp ∈ VALID_TRANSITIONS | tập transitions ⊆ bảng hợp lệ | bất kỳ cặp ngoài bảng |
| F1-AC5 | Terminal consistency: `status='completed'` ⟺ mọi item ∈ {completed, skipped, failed}; `completedAt` set; ngược lại nếu còn item pending thì plan KHÔNG được completed | trạng thái cuối khớp công thức | completed với item pending |
| F1-AC6 | Completion claim integrity: chỉ item có evidence mới mang `resultSummary`/`completedByTool`; không item nào "hoàn thành trên giấy" | khớp F1-AC2 subset | summary mà không có tool call |

### R4-F.2 criteria

| ID | Assertion | Pass signal | Fail signal |
|---|---|---|---|
| F2-AC1 | Session có active plan (test LẦN LƯỢT với mỗi active status: pending, running, stuck) + create mới ⟹ reject payload `{error, plan_status, plan_id}`; KHÔNG có field success-shape | error non-empty; plan_id == id gốc | bất kỳ response dạng resumed/guidance |
| F2-AC2 | Existing plan bất biến qua rejection: so sánh snapshot {id, status, items[], currentItemIndex} trước/sau — byte-equal | deep-equal pass | bất kỳ field đổi |
| F2-AC3 | Sau N lần create lặp lại (N≥3): store chứa ĐÚNG 1 plan cho session, là plan gốc | count==1 && id gốc | ≥2 plan / plan mới thay thế |
| F2-AC4 | (R2 load-bearing) Crash giữa plan → boot recovery → vẫn đúng 1 active plan, id preserved, không duplicate resurrection | post-recovery count==1, id gốc | 2 plan / mất plan |
| F2-AC5 | Model-independence: F2-AC1..3 pass ở TẦNG TOOL (gọi trực tiếp plugin execute, không cần model) VÀ 1 scenario qua full loop | cả hai tầng pass | chỉ một tầng pass |

F1-AC3 là điểm phân biệt behavioral vs unit: gate đã có unit test, nhưng R4 phải chứng minh gate ĐỨNG GIỮA loop thật khi scripted model cố vượt.

---

## 4. CONTROLLED-MODEL TEST PROTOCOL

**Precedent (reuse, không viết infra mới):** `tests/engine-cancel.test.ts` — dựng Agent với `modelRouter = { route }` trả queue các scripted response (tool-call JSON canned), drive full loop, đếm model call. R4 harness copy pattern này.

Protocol:

1. **Scripted model:** mỗi scenario định nghĩa queue response: `[create(items…), toolCall(item0-tool), complete_item(0), …]`. Scripted tool calls dùng tool thật đã đăng ký (không mock toolRegistry) để EvidenceLog có record thật.
2. **Single-run per scenario:** deterministic input ⟹ deterministic output. K-runs vô nghĩa (cùng script = cùng kết quả); không làm.
3. **No real model trong acceptance.** Real-model smoke (provider dev env) là OPTIONAL supplementary, non-gating, ghi riêng khỏi verdict nếu có.
4. **Scenario tối thiểu:**
   - S1 (F1-AC1/2/4/5/6): happy-path 3-item task → completed.
   - S2 (F1-AC3): model cố `complete_item` không evidence → reject → làm tool call thật → complete thành công.
   - S3 (F2-AC1/2/3 tầng loop): create → 1 item chạy → create thứ 2 → hard-reject → assert bất biến.
   - S4 (F2 tầng tool): direct plugin.execute với mỗi active status (pending/running/stuck) — không cần model.
   - S5 (F2-AC4): seed plan vào store → mô phỏng crash/recovery qua CheckpointStore boot path → assert single-plan.
5. **Fail handling:** bất kỳ assertion fail ⟹ paste raw transcript (scripted responses + store dumps + transition log) vào evidence doc — không tóm tắt.

---

## 5. DEPENDENCY CLASSIFICATION

| Dependency | Classification | Điều khoản |
|---|---|---|
| **R2 checkpoint** | **LOAD-BEARING** cho F.2 (AC4 recovery scenario; plan sống trong CheckpointStore) | Tiêu thụ as-is. Không sửa atomic-write/crash-flush/recovery annotations. Không re-prove. Nếu R4 làm hỏng test R2 → lỗi của R4. |
| **R1 execution loop** | Consumed context | Harness chạy bên trong loop R1 đã freeze. Không re-prove cancellation/fuse. Không modify signal infrastructure. Per-session 1-active-task invariant: không đổi. |
| **R3 admission gate** | Adjacency only | Flow single-session sequential không chạm limit. Không mở rộng concurrency scope. N=4 vẫn là test value. Hygiene "reject request không để plan side-effect" thuộc evidence domain R3 — không thêm criterion R4. |

---

## 6. OUT OF SCOPE (EXPLICIT)

- B1: model routing decision (có tạo plan hay không) — Q3 chốt prompt-driven, không enforce
- B2: decomposition quality
- B5: stuck → user feedback → full-loop recovery
- Expressive BehaviorEngine / emotion / emote / speak (`src/core/behavior/` — test-only, 0 production importer)
- Per-user planning policy
- CPU/RAM/resource governance
- R3 concurrency semantics
- Task Identity/Boundary workstream
- Resume/reuse semantics (candidate R4.x/initiative riêng, chưa mở)
- Policy constants tuning (STAGNATION_THRESHOLD=5 / MAX_TRANSIENT_RETRY=3 / ABSOLUTE_SAFETY_CEILING=200)
- Deprecated exports cleanup (ticket độc lập)
- R5/R6/R7

---

## 7. TEST / EVIDENCE MAPPING

| Requirement | Test file (implementation phase sẽ tạo) | Scenario | Unit tests hiện hữu (tham chiếu, không tính evidence R4) |
|---|---|---|---|
| R4-F.1 | `tests/r4-plan-loop-coherence.test.ts` | S1, S2 | plan-state.test.ts (24), state-driven-plan.test.ts (47) |
| R4-F.2 | `tests/r4-single-active-plan.test.ts` | S3, S4, S5 | progress-boundary.test.ts (14) |

Naming tách khỏi file cũ để không ai nhầm R4 evidence với WIP legacy.

---

## 8. LEGACY / WIP TEST TREATMENT

Phân loại theo semantics đã chốt (hard-reject):

| Artifact | Phân loại | Hành động (khi implementation, KHÔNG bây giờ) |
|---|---|---|
| `tests/progress-v1-plan-continuity.test.ts` (syntax-broken, 3 cases) | **Stale WIP encode semantics bị loại bỏ** — Case 1 & 1b kỳ vọng `resumedExistingPlan:true`/no-error (resume); Case 2/3 cũng viết quanh resume draft (comment trong file tự thú "With updated update-plan-tool.ts…") | **DELETE toàn bộ file.** KHÔNG sửa syntax để xanh — sửa-syntax-trước-khi-phân-loại chính là điều cấm. Invariant nó hé ("không silently replace") được phủ đúng semantics mới bởi F2-AC1/2. |
| `tests/progress-v1-plan-continuity.test.ts.bak` | Stale WIP duplicate (148 dòng, cùng nguồn gốc) | DELETE cùng lúc. |
| `738b07fe` contamination (file hỏng vào HEAD qua R3 sweep) | Historical fact — đã ghi nhận trong B4_SEMANTICS_DECISION.md | Không cần action thêm; deletion ở trên chính là đóng dọn. |

Không test nào bị xóa "cho suite xanh": cả 3 case đều đã được đối chiếu expectation-vs-decision trước khi xếp loại. Test thay thế (r4-single-active-plan) viết fresh theo hard-reject, không copy đoạn nào từ file cũ tránh resurrect expectation.

---

## 9. EVIDENCE ARTIFACT LOCATIONS

```
docs/evidence/R4/
├── INITIAL_AUDIT.md            (đã có — audit)
├── SCOPE_DEBATE.md             (đã có — candidate analysis)
├── FINAL_SCOPE_DEBATE.md       (đã có — package/Q3/evidence-protocol debate)
├── B4_SEMANTICS_DECISION.md    (đã có — historical audit + decision framing)
├── R4_V1_SPEC.md               (file này)
├── IMPLEMENTATION_EVIDENCE.md  (implementation phase tạo — raw runs, transcripts, store dumps)
└── VERIFICATION_REPORT.md      (verification phase tạo — verdict per AC)
```

Quy tắc evidence: raw command + output nguyên văn; classification Verified/Hypothesis/Rejected gắn từng AC; không dán kết luận không có artifact.

---

## 10. STATUS

**SPEC-READY**

- Requirements: R4-F.1, R4-F.2 — đủ criteria observable, đủ scenario map, đủ dependency terms.
- Không còn product decision nào đang treo cho v1.
- Implementation KHÔNG bắt đầu cho đến khi Kayce confirm spec này.

**Commit status: NOT COMMITTED** (theo yêu cầu — spec chưa review).
