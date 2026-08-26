# R4 SCOPE DEBATE — PLANNING/DECISION BEHAVIOR ONLY

**Date:** 2026-08-26
**Input:** docs/evidence/R4/INITIAL_AUDIT.md (mục 10 — A/B + classification)
**Scope locked bởi product owner:** Decision/planning behavior. BehaviorEngine KHÔNG thuộc R4. Không implement, không sửa code/test, không viết spec v1 trong session này.

---

## 1. CRITICAL FINDING MỚI (ảnh hưởng trực tiếp B4)

Đối chiếu adversarial phát hiện mâu thuẫn semantics, không chỉ lỗi syntax:

**Code hiện tại** — `src/core/plan/update-plan-tool.ts:123-130`: create khi đã có active plan → **HARD-REJECT**:

```ts
return {
  error: `Cannot create plan: session already has active plan (status=${existing.status}). Use action="abort" first or complete existing items.`,
  plan_status: existing.status,
  plan_id: existing.id,
};
```

**Test hỏng** — `tests/progress-v1-plan-continuity.test.ts:72-84` encode hành vi KHÁC:

```ts
message: expect.stringContaining('Active plan already exists'),
resumedExistingPlan: true,
...
expect(result).not.toHaveProperty('error');
```

Kết luận:
1. Test được viết cho một semantics **CHƯA ĐƯỢC IMPLEMENT** (guidance/resume thay vì hard-reject).
2. Sửa syntax test mà chưa quyết semantics = quyết định ngầm bằng cách vô tình enshrine hành vi chưa được duyệt.
3. Đây chính là nội dung tồn đọng "Progress V1 Phase 6 / create_plan hard-reject".
4. Engine-level ĐÃ có continuity qua prompt (engine.ts:913 — inject "KHÔNG tạo plan mới khi có plan active"); tool-level guard là backstop hard-error. Invariant "1 active plan/session" HOLD ngày hôm nay ở cả 2 tầng.

---

## 2. PHÂN TÍCH TỪNG CANDIDATE

### B1 — Model quyết định khi nào tạo plan

Tách 3 khái niệm theo yêu cầu #4:

| Sub-claim | Bản chất | Phân loại |
|---|---|---|
| B1-cap: model CÓ KHẢ NĂNG gọi create trong loop thật | Mechanical | Không cần criterion riêng — được chứng minh ngầm định bởi B3 (B3 yêu cầu create phải xảy ra) |
| B1-dec: model QUYẾT ĐỊNH ĐÚNG khi nào cần plan | Judgment quality | **SHOULD BE EXCLUDED khỏi v1** |
| B1-enf: system BẮT BUỘC model phải plan | System design | **CẦN PRODUCT DECISION** (= Q3 code-enforced vs prompt-driven) |

Ba câu cho B1-dec:
- a. Loại khỏi R4 → R4 vẫn còn ý nghĩa? **CÓ** — B3/B4/B5 vẫn chứng minh lifecycle coherence.
- b. Pass/fail observable? **KHÔNG** nếu giữ prompt-driven — mọi rubric routing đúng/sai đòi hỏi labeled prompt set = mini evaluation framework mới.
- c. Nguy cơ subjective eval? **CAO**.

Ghi chú B1-enf: nếu Q3 chọn enforce → criterion deterministic ("không có execution cycle trước khi plan tồn tại") NHƯNG đổi production semantics toàn cục — nên tính như phase riêng, không nhét v1.

### B2 — Decomposition quality

- a. Loại khỏi R4 → R4 còn ý nghĩa? **CÓ** — lifecycle behaviors (completion integrity, continuity, recovery) vẫn đứng vững.
- b. Pass/fail objective mà KHÔNG tạo evaluation framework mới? **KHÔNG TỒN TẠI**: đếm items = arbitrary; "item thực thi được" = circular; human-rating = rubric framework. Structural validity (items non-empty, index hợp lệ) đã nằm trong unit tests hiện có — không phải behavioral claim mới.
- c. Nguy cơ subjective? **CAO NHẤT** trong cả 5.

→ **SHOULD BE EXCLUDED FROM R4 v1.** (đúng dự đoán adversarial #3)

### B3 — Truthful completion qua evidence gate trong model loop

Tách theo yêu cầu #5:

| Layer | Trạng thái |
|---|---|
| Gate bị unit-test (canCompleteItem từ chối empty/all-failed evidence) | VERIFIED unit — có sẵn |
| Model loop tuân thủ gate (happy-path: task đa bước chạy tới completed với evidence thật) | **CHƯA có behavioral evidence** |

Evidence nào chứng minh MODEL behavior chứ không chỉ code path? Chỉ có quan sát end-state sau session model thật:

Criterion khả dĩ (observable pass/fail): *"Task đa bước đơn-giản-deterministic qua engine.process() với model thật → TaskPlan đạt status='completed', MỖI item completed có ≥1 ToolCallRecord success trong EvidenceLog, không invalid transition nào được emit."*

- a. Nếu loại → R4 mất bằng chứng DUY NHẤT rằng loop planning thực sự vận hành với model thật; các mục còn lại không đủ tạo ra behavioral proof standalone.
- b. Observable? **CÓ** — assertion nhắm END-STATE (terminal status + evidence integrity), không nhắm chiến lược trung gian. Nondeterminism kiểm soát bằng lựa chọn task, không bằng nới lỏng assertion.
- c. Nguy cơ subjective? **THẤP–TRUNG BÌNH** — miễn cấm dạng "decomposition trông hợp lý".

→ **MUST BE R4 v1** (core).

### B4 — Continuity khi request mới đến với active plan

Tách 2 tầng theo finding mục 1 + yêu cầu #6:

| Sub-claim | Phân loại |
|---|---|
| B4-inv: invariant "đúng 1 active plan/session; active plan được inject vào context request sau; không duplicate" | **MUST BE R4 v1** — end-state observable: sau request thứ 2, checkpointStore chứa đúng 1 plan với id gốc, status hợp pháp. Deterministic bất kể model cố recreate hay không (tool guard chặn). |
| B4-sem: semantics phản hồi khi create-trùng xảy ra (hard-reject hiện tại vs guidance/resume mà test hỏng encode) | **CẦN PRODUCT DECISION** — chưa từng được chốt. |
| Repair file test hỏng | **DEPENDENCY / PREREQUISITE ONLY** — và thứ tự đúng là: quyết semantics TRƯỚC, rồi repair/rewrite test theo semantics đó. Repair không bao giờ là feature. |

- a. Nếu loại B4-inv → claim continuity (lời hứa cốt lõi hậu-R2) không có behavioral proof; R4 còn B3 nhưng yếu hơn đáng kể.
- b. Observable? **CÓ** (B4-inv). B4-sem chỉ observable SAU khi owner chọn semantics.
- c. Nguy cơ? THẤP nếu dừng ở end-state invariant; CAO nếu trượt sang "UX của thông báo reject".

### B5 — Stuck → user phản hồi → full loop

Adversarial check #7: machinery nào đã VERIFIED?

| Thành phần | Trạng thái |
|---|---|
| Stagnation fuse park plan → stuck | VERIFIED unit (verify-stagnation-tracking, 13 PASS) — machinery R1-adjacent, FROZEN |
| Transition stuck→running hợp pháp | VERIFIED unit (transition matrix) |
| FULL interaction coherence: user follow-up → stuck-context prompt (engine.ts:890) → model skip/abort/adjust HỢP LỆ → plan kết thúc legal | **CHƯA verify — đây là claim mới duy nhất** |

- a. Nếu loại → R4 vẫn chứng minh happy-path + continuity; recovery-interaction thành documented gap cho phase sau.
- b. Observable? **MỘT PHẦN** — "plan đạt trạng thái legal theo transition table trong K cycles, zero invalid transition" là pass/fail; NHƯNG đòi hỏi harness multi-turn (scripted user turn) phức tạp hơn B3/B4 rõ rệt.
- c. Nguy cơ? **TRUNG BÌNH** — phải cấm tuyệt đối assertion "model chọn ĐÚNG strategy recovery"; chỉ asserted legality + terminal consistency.

→ Không đủ mạnh để MUST; xếp **EXPANDED tier**.

Lưu ý chống scope-creep: waiting_user/risk-gate flow cùng lớp nhưng KHÔNG mở thành sub-requirement mới (vi phạm quy tắc).

---

## 3. BẢNG PHÂN LOẠI TỔNG HỢP

| Candidate | Quyết định đề xuất |
|---|---|
| B1-cap | Gộp vào B3 (implicit precondition) — không criterion riêng |
| B1-dec | SHOULD BE EXCLUDED (subjective) |
| B1-enf | CẦN PRODUCT DECISION (Q3); nếu enforce → phase riêng |
| B2 | SHOULD BE EXCLUDED FROM R4 v1 |
| B3 | **MUST BE R4 v1** |
| B4-inv | **MUST BE R4 v1** |
| B4-sem | CẦN PRODUCT DECISION |
| B4-repair | DEPENDENCY / PREREQUISITE ONLY (sau B4-sem) |
| B5 | EXPANDED tier (nếu owner muốn) |

## 4. SCOPE PACKAGES ĐỀ XUẤT (không tự chọn)

### Package MINIMAL R4 v1
- **B3**: happy-path loop coherence (end-state: completed + evidence integrity + zero invalid transition)
- **B4-inv**: continuity invariant (end-state: single-plan store assertion qua request loop thật)
- Prerequisite: B4-sem decision → repair test
- Dependencies: R2 checkpoint = load-bearing (consume as-is); R1 loop = execution-context; R3 gate = adjacency

### Package EXPANDED R4 v1 (= Minimal +)
- **B5**: stuck-recovery interaction coherence (legality + terminal consistency assertions)

Không package nào chứa: B1-dec, B2, BehaviorEngine, policy-constant tuning, Task Identity/Boundary.

## 5. DANH SÁCH QUYẾT ĐỊNH CÒN THIẾU (exact)

1. **Chọn package**: Minimal hay Expanded (owner)
2. **Q3**: planning code-enforced hay giữ prompt-driven (quyết số phận B1-enf; đổi production semantics)
3. **B4-sem**: create-trùng → giữ hard-reject, hay guidance/resume như test hỏng encode? (blocker cho repair + B4 evidence)
4. **Evidence protocol**: model/provider nào chạy behavioral loop + chính sách runs (single-run vs K-runs threshold) — tham số hóa pass/fail

## 6. STATUS

**R4 SCOPE STATUS = DEBATE REQUIRED**

Lý do: hình dạng criterion đã xác định được observable cho B3/B4-inv, nhưng 4 quyết định ở mục 5 — đặc biệt #1 (package) và #3 (B4-sem, vừa được phát hiện là mâu thuẫn code-vs-test thật) — là input bắt buộc của spec. Viết spec trước khi có chúng = spec đoán mò thay owner.

Sau khi 4 quyết định chốt → chuyển SPEC-READY, viết R4 Spec v1 với criteria đã hình dạng hóa ở mục 2.
