# R4 — INITIAL AUDIT

**Date:** 2026-08-26
**Repo:** D:\AI-Agent (branch `r1-execution-safety`, HEAD `9ea64a88`)
**Audit type:** Initial audit — READ-ONLY. No code changed, no tests modified, no commits made by this audit.

---

## 1. R4 Status

**R4 = UNDEFINED**

Không tồn tại bất kỳ artifact nào sau đây trong repository:

| Artifact | Kết quả tìm kiếm | Evidence |
|---|---|---|
| R4 spec document | KHÔNG TỒN TẠI | grep "R4" toàn repo → chỉ 2 hit thật, đều là pointer "Next phase: R4 — Behavior / Planning" trong `docs/evidence/R3/IMPLEMENTATION_EVIDENCE.md:261` và `docs/evidence/R3/VERIFICATION_REPORT.md:183` |
| Acceptance criteria | KHÔNG TỒN TẠI | không có file nào chứa criteria cho behavior/planning dưới nhãn R4 |
| Scope boundary | KHÔNG TỒN TẠI | không có docs/evidence/R4/ trước audit này (thư mục chỉ vừa được tạo để chứa báo cáo này) |
| Requirement IDs (R4-F.x …) | KHÔNG TỒN TẠI | không có requirement ID dạng R4.* ở bất kỳ đâu |
| Evidence standard | KHÔNG TỒN TẠI | docs/evidence/ chỉ có R1-D1, R1-E1, R1-F1, R1-F2, R2, R3 |

Tên "R4 — Behavior / Planning" hiện chỉ là **nhãn roadmap trong session context**, chưa từng được vật chất hóa thành spec trong repo.

---

## 2. Existing Evidence

Inventory capability liên quan Behavior/Planning — phân loại theo bằng chứng code/test thực tế:

| Capability | Classification | Evidence | Confidence |
|---|---|---|---|
| Plan state machine (8 trạng thái + VALID_TRANSITIONS guard) | VERIFIED (test) | `src/core/plan/types.ts` (VALID_TRANSITIONS, validateTransition); `tests/plan-state.test.ts` 24 PASS | High |
| update_plan tool (5 actions: create/complete_item/skip_item/abort/pause) | EXISTS + production-wired | `src/core/plan/update-plan-tool.ts`; engine.ts:253-256 đăng ký plugin vào toolRegistry | High (wiring), Medium (behavior) |
| Evidence-gated completion (canCompleteItem) | VERIFIED (test) | `plan-state.ts:89-107`; test trong plan-state.test.ts | Medium-High |
| Stagnation tracking + fuse (STAGNATION_THRESHOLD=5, MAX_TRANSIENT_RETRY=3, ABSOLUTE_SAFETY_CEILING=200) | VERIFIED (test) | `agent.ts:38,1255-1264`; `tests/verify-stagnation-tracking.test.ts` 13 PASS | High |
| Mandatory Planning Phase prompt (quyết định create vs trả lời trực tiếp) | UNVERIFIED | engine.ts:940-944 inject prompt; CORAL.md:278 ghi rõ "không có code-level enforcement — model tự" | Medium |
| Plan continuity khi đã có active plan (resume/guidance thay hard-reject) | **BROKEN EVIDENCE** | Test `tests/progress-v1-plan-continuity.test.ts` **không load được** — syntax error line 62-69 (`async () => { async () => {` mồ côi), esbuild transform fail. File hỏng đã được COMMIT trong `738b07fe` | Low |
| Lazy plan trigger | VERIFIED (test) | `tests/lazy-plan-trigger.test.ts` 5 PASS | Medium |
| Progress Monitor V1 (signal + stagnation detection only) | EXISTS + wired | `src/core/progress/progress-monitor.ts`, import bởi agent.ts; PROGRESS_V1_FINAL.md: recovery/replan OUT of V1 | Medium |
| BehaviorEngine (rule-based event → BehaviorPlan, emotion mapping, over-expression stats) | EXISTS, **KHÔNG wire production** | `src/core/behavior/behavior-engine.ts` (416 dòng); importers = chỉ chính nó + types.ts của nó. 0 instantiation ngoài test | High (rằng nó không chạy production) |
| Emotion tag parser | EXISTS, test-only | `emotion-tag-parser.ts`; tests/behavior/emotion.test.ts | Low-Medium |
| Task decomposition quality (plan items do LLM tự tạo có đúng/phân rã hợp lý) | MISSING | Không có test/evidence nào đánh giá chất lượng decomposition | — |
| Replanning / dynamic adjustment giữa chừng | PARTIAL (skip/abort/stuck path có; replan mới không có) | update-plan-tool actions; stuck flow agent.ts | Low |

Test run verbatim (audit run 2026-08-26):

```
✓ tests/progress-boundary.test.ts (14 tests)
✓ tests/plan-state.test.ts (24 tests)
✓ tests/verify-stagnation-tracking.test.ts (13 tests)
✓ tests/lazy-plan-trigger.test.ts (5 tests)
✓ tests/state-driven-plan.test.ts (47 tests)
FAIL tests/progress-v1-plan-continuity.test.ts [transform error]
Test Files  1 failed | 5 passed (6)
Tests  103 passed (103)
```

Lưu ý: "47 tests" khớp đúng con số trong merge commit b29614b1 ("State-Driven Task Plan (47 tests)").

---

## 3. Specification Findings

- **R4 spec có tồn tại không?** KHÔNG. Chỉ có nhãn "R4 — Behavior / Planning" trong session context và 2 pointer trong evidence R3.
- **Acceptance criteria có tồn tại không?** KHÔNG.
- **Scope boundary có tồn tại không?** KHÔNG.
- **Requirement IDs có tồn tại không?** KHÔNG (R1 có R1-F.1/R1-F.2/R1-D.1…; R4 chưa có gì tương đương).
- **Evidence standard có tồn tại không?** KHÔNG riêng cho R4 (chuẩn chung của R-series: persistent evidence trong docs/evidence/R<N>/ + runtime artifacts).

Kết luận: mọi câu hỏi scope R4 (behavior là gì — expressive emotion hay decision behavior? planning cần cải thiện cái gì?) đều **chưa có chủ sở hữu quyết định**.

---

## 4. Architecture / Behavior Findings

Chỉ mô tả những gì đã quan sát được trong code:

1. **Hai khối "behavior/planning" độc lập nhau đang cùng sống trong repo:**
   - `src/core/plan/` + wiring trong engine/agent — state-driven task planning, production-active, có 103 passing tests.
   - `src/core/behavior/` — BehaviorEngine expressive behavior (emote/speak/emotion), **0 production importer**, test-only. Được giữ lại theo quyết định 2026-08-11 (CORAL.md:248-250) vì test-facing compatibility surface.
2. **Planning phase hiện là prompt-driven, không phải code-enforced:** engine.ts:940-944 chỉ inject hướng dẫn; model tự quyết định gọi update_plan hay không. Không có enforcement bắt buộc create-plan trước execution.
3. **Plan lifecycle đã sâu vào R2:** `checkpoint.ts` import plan module — TaskPlan được persist qua CheckpointStore. Mọi thay đổi plan lifecycle sẽ đụng R2 semantics.
4. **Stagnation/fuse đã là cơ chế chống-runaway hoạt động** trong agent loop với ngưỡng hard-coded (5/3/200).
5. **File test bị hỏng đã vào HEAD qua commit R3:** `738b07fe` sweep cả `tests/progress-v1-plan-continuity.test.ts` (syntax-broken) + `.bak` vào commit resource governance. Đây là nhiễm bẩn commit-boundary, không phải R3 logic.
6. **PROGRESS_V1_FINAL.md tự tuyên bố đóng V1** và tách "Task Identity / Task Boundary" thành workstream riêng — chưa rõ quan hệ với R4.

Phân loại invariant/policy:
- Per-session max-1-active-task: architecture invariant (giữ nguyên, thuộc R1).
- PlanState discriminated union + single derivation module (ADR-000/ADR-001): architecture invariant nội bộ planning.
- Ngưỡng STAGNATION/MAX_TRANSIENT/ABSOLUTE_CEILING: policy constants (implementation detail), không phải requirement.
- BehaviorEngine emotion mapping: implementation detail chưa có product owner xác nhận.

---

## 5. Test / Evidence Matrix

| Test | Exists | Passes | Proves requirement nào |
|---|---|---|---|
| state-driven-plan.test.ts (47) | ✓ | ✓ | State machine + tool actions hoạt động theo design nội bộ — nhưng KHÔNG map sang R4 requirement nào (chưa có requirement) |
| plan-state.test.ts (24) | ✓ | ✓ | Derivation/guard/evidence-gate |
| verify-stagnation-tracking.test.ts (13) | ✓ | ✓ | Stagnation fuse |
| lazy-plan-trigger.test.ts (5) | ✓ | ✓ | Trigger tạo plan |
| progress-boundary.test.ts (14) | ✓ | ✓ | Boundary Progress V1 (không recovery/replan) |
| progress-v1-plan-continuity.test.ts | ✓ | ✗ **LOAD FAIL** | Không chứng minh được gì — syntax error committed |
| tests/behavior/* (4 files) | ✓ | chưa chạy trong audit này | Test-only module; không chứng minh behavior production |

Missing evidence (đặt tên capability, không đề xuất giải pháp): decomposition quality, replanning, plan↔user communication, BehaviorEngine production value.

---

## 6. R-series Dependencies

Dependency THẬT đã quan sát (theo capability, không phải tên R-series):

1. **TaskPlan persistence ↔ R2 checkpoint**: `checkpoint.ts` lưu plan. Bất kỳ R4 nào đụng plan lifecycle phải không phá atomic write/crash-flush/recovery annotations của R2.
2. **Agent loop stagnation/fuse ↔ R1 cancellation**: fuse nằm trong agent loop dùng signal/timeout infrastructure của R1-F.2.
3. **engine.process entry ↔ R3 admission gate**: mọi foreground request vẫn đi qua admission trước; R4 không được thay đổi reject semantics.
4. **Per-session 1-active-task invariant**: giới hạn thiết kế test concurrency liên quan plan (một session = một plan active tại một thời điểm).

Không tìm thấy dependency bắt buộc từ 2 việc tồn đọng (R1-D.1 evidence content; Progress V1 Phase 6 root-cause) vào R4 — tuy nhiên mục #2 có liên quan GIÁN TIẾP: chính test của Progress V1 Phase 6 là file bị hỏng (mục 5 ở trên). Việc sửa file đó là blocker evidence của bất kỳ scope R4 nào chạm plan continuity, nhưng việc sửa thuộc ai (R4 hay workstream riêng) là quyết định cho product owner.

---

## 7. Scope Risks

Flag, không giải quyết:

1. **"Behavior" mơ hồ:** repo có sẵn `core/behavior/` (expressive/emotion) — nguy cơ cao R4 bị hiểu nhầm là "hoàn thiện BehaviorEngine" trong khi ý ban đầu có thể là "decision/task behavior". Cần debate định nghĩa.
2. **Planning đã tồn tại 70%:** nguy cơ R4 biến thành "refactor lại planning hiện có" hoặc ngược lại "kênh hóa mọi thứ đã có thành R4 deliverable" (double-counting công việc cũ).
3. **Commit contamination đã xảy ra một lần** (738b07fe sweep planning WIP vào R3) — nguy cơ lặp lại nếu R4 không có boundary rõ ngay từ đầu.
4. **Deprecated exports (SAFETY_CEILING/BASE_PLANNING_BUDGET/computePlanBudget)** có backlog ticket xóa riêng — dễ bị kéo vô R4 dù đã có ticket độc lập.
5. **Task Identity/Boundary workstream** (từ PROGRESS_V1_FINAL.md) có thể trùng hoặc đè lên R4 — chưa ai quyết quan hệ.
6. **File .bak nằm trong git** (progress-v1-plan-continuity.test.ts.bak) — cleanup nhỏ nhưng dễ bị kéo vào R4 commit đầu tiên.

---

## 8. Open Questions

Cho product owner / debate — audit không tự trả lời:

1. "Behavior" trong R4 nghĩa là gì: (a) expressive behavior/emotion của BehaviorEngine, (b) decision/task-planning behavior, hay (c) cả hai?
2. BehaviorEngine hiện test-only, 0 production importer — R4 có wire nó vào production không, hay chính thức loại bỏ/archive?
3. Planning phase nên trở thành code-enforced (bắt buộc create trước execute) hay giữ prompt-driven?
4. File test hỏng `progress-v1-plan-continuity.test.ts` (committed broken trong 738b07fe): sửa trong R4, mở workstream riêng, hay gắn với root-cause Progress V1 Phase 6 đang treo?
5. Quality bar cho decomposition/replanning là gì (acceptance criteria chưa tồn tại)?
6. Quan hệ giữa R4 và workstream "CORAL TASK IDENTITY / TASK BOUNDARY"?
7. Các policy constants (stagnation=5, transient=3, ceiling=200) có cần được R4 chuẩn hóa/thay đổi không?

---

## 9. Verdict

**DEBATE REQUIRED**

Lý do:
- R4 = UNDEFINED: không spec, không acceptance criteria, không scope boundary, không requirement IDs.
- Capability hiện có (planning production-active, behavior test-only) đủ đa dạng khiến nhiều diễn giải R4 hợp lệ khác nhau → bắt buộc product owner chọn định nghĩa trước khi bất kỳ implementation nào.
- Blocker kỹ thuật đã nhận diện (broken committed test) nhưng việc xử lý nó cũng cần quyết định ownership.

Không thể chuyển sang IMPLEMENTATION hay SPEC-READY cho đến khi các Open Questions ở mục 8 được trả lời.

---

## 10. FOLLOW-UP ANALYSIS — Capability Gap & Dependency Classification (post-audit)

### 10.1 A — Behavioral capability chưa được chứng minh

Cơ sở: toàn bộ 47 tests của state-driven-plan.test.ts là **pure-unit** (transition matrix, error classifier, stagnation counter, constants). lazy-plan-trigger dùng stub registry. **Không test nào drive LLM thật/mock qua planning loop.**

| # | Capability | Trạng thái hiện tại |
|---|---|---|
| B1 | Model quyết định tạo plan khi task đa bước / không tạo cho chat đơn giản | Prompt-driven only (engine.ts:940-944). Zero enforcement, zero behavioral test |
| B2 | Decomposition quality — items đúng granularity, thực thi được | Không có measurement nào |
| B3 | Model hoàn thành item trung thực qua evidence gate (không hallucinate complete_item) | Gate được unit-test; compliance của model trong loop thật thì không |
| B4 | Continuity khi request mới vào với active plan (resume/guidance, không hard-reject, không duplicate) | Test duy nhất cho shape này bị syntax-broken committed |
| B5 | Stuck → user phản hồi → plan chạy lại (full loop, không chỉ transition guard) | Unit: stuck→running allowed. Behavioral: chưa chứng minh |

R4 candidate capability = **B1–B5**: decision/lifecycle behavior của planning dưới model loop thật. KHÔNG phải infrastructure (đã có), KHÔNG phải expressive BehaviorEngine (module riêng, test-only, 0 production importer).

### 10.2 B — Dependency classification

| Dependency | Phân loại | Điều kiện |
|---|---|---|
| R2 checkpoint | **Load-bearing IFF B4/B5 in scope** — continuity theo nghĩa kỹ thuật là plan đọc/ghi qua CheckpointStore giữa các process() call | Nếu R4 giới hạn trong single-request (B1-B3) → rơi về adjacency |
| R1 loop (cancellation/fuse) | **Execution-context precondition** — B5 chạy bên trong cơ chế R1 đã freeze; R4 tiêu thụ, không re-prove, không modify | Luôn đúng khi B5 in scope |
| R3 admission gate | **Code adjacency** — flow sequential/single-session của planning behavior không bao giờ chạm N limit; per-session invariant loại trừ scenario concurrency | Chỉ tương tác nếu tự ý ghép: "rejected request không được tạo plan side-effect" — hygiene invariant thuộc R3 evidence, không phải R4 criterion |

Kết luận B: không dependency nào intrinsic — tất cả contingent theo scope. Đây là lý do scope debate phải đi trước mọi acceptance criterion.

### 10.3 Phân loại Open Questions

| Q | Nội dung | Phân loại |
|---|---|---|
| 1 | Định nghĩa "Behavior": expressive vs decision/planning | **R4 SCOPE** |
| 2 | BehaviorEngine wire vào production hay archive | **EXTERNAL BACKLOG** (escalate lên scope chỉ nếu Q1 chọn expressive; module 0-importer không cần cho bất kỳ capability đang chạy) |
| 3 | Planning code-enforced hay giữ prompt-driven | **R4 SCOPE** |
| 4 | Ownership broken test progress-v1-plan-continuity | **DEPENDENCY** — blocking prerequisite cho B4 evidence; là repair defect từ commit contamination, tính riêng khỏi R4 deliverable |
| 5 | Quan hệ với workstream Task Identity/Boundary | **EXTERNAL BACKLOG** (PROGRESS_V1_FINAL.md đã tuyên bố workstream độc lập) |
| 6 | Quality bar cho decomposition (audit doc Q6) | R4 scope, contingent Q1=planning |
| 7 | Chuẩn hóa policy constants (audit doc Q7) | **NOT APPLICABLE** v1 — đang hoạt động + unit-tested; tuning ngưỡng ≠ capability proof |

### 10.4 Debate input

Scope R4 v1 tối thiểu khả dĩ = {Q1: decision/planning} + {B1–B5 subset do owner chọn} với dependencies ở 10.2 áp theo. Mọi lựa chọn expressive sẽ mở rộng scope sang BehaviorEngine (Q2 escalate) và đổi hình dạng dependencies.
