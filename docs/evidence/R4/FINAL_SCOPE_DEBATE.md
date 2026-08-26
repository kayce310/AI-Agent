# R4 — FINAL SCOPE / SEMANTICS DEBATE

**Date:** 2026-08-26
**Repo:** D:\AI-Agent (branch `r1-execution-safety`, HEAD `9ea64a88`)
**Input:** `docs/evidence/R4/INITIAL_AUDIT.md` + `docs/evidence/R4/SCOPE_DEBATE.md`
**Session type:** READ-ONLY debate. Không implement, không sửa code, không sửa test, không commit, không viết spec.
**Mọi code fact dưới đây đã được re-verify trực tiếp trong session này** (không trích dẫn mù từ session trước).

---

## 1. EXECUTIVE VERDICT

Hình dạng R4 v1 đã chốt được về mặt phân tích:

- **Core bắt buộc:** B3 (planning loop coherence) + B4-inv (single-active-plan invariant). Cả hai đều có thể phát biểu thành end-state observable pass/fail.
- **Khuyến nghị package:** MINIMAL. B5 không cần thiết để chứng minh core R4 capability (lý do đầy đủ ở mục 2).
- **B4-sem là blocker thật sự duy nhất cho evidence:** code hiện tại (hard-reject) và test hỏng (resume) encode hai semantics khác nhau, cả hai đều KHÔNG phải product requirement đã chốt.
- **Q3 (enforcement) không block việc viết spec Minimal** — nó chỉ quyết số phận B1-enf, vốn nằm ngoài cả hai package.
- **Evidence protocol có lời giải không mơ hồ:** controlled/scripted model là ĐỦ cho acceptance, vì (a) acceptance của B3/B4-inv là deterministic lifecycle invariant, và (b) pattern harness scripted-model đã tồn tại sẵn trong repo (`tests/engine-cancel.test.ts`). K-runs KHÔNG cần khi acceptance không phụ thuộc stochastic behavior.

Còn lại 4 product decisions (mục 8). Trước khi chúng được chốt: **DEBATE REQUIRED**.

---

## 2. PACKAGE ANALYSIS

So sánh trên 5 trích diện được yêu cầu:

| Dimension | MINIMAL (B3 + B4-inv) | EXPANDED (= Minimal + B5) |
|---|---|---|
| **Behavioral value** | Chứng minh đủ 2 lời hứa cốt lõi: loop chạy tới legal end-state với evidence thật; continuity qua request thứ 2. Đây là phần chưa từng có behavioral proof. | Thêm 1 claim mới: recovery-interaction coherence (stuck → user response → loop lại). Giá trị thật nhưng KHÔNG phải điều kiện để chứng minh core planning capability. |
| **Acceptance-testability** | Single-turn harness, assertion nhắm end-state (terminal status, EvidenceLog, store contents, zero invalid transition). Deterministic. | Cần multi-turn harness + scripted stuck-induction. Assertion vẫn chỉ dám là *legality* (cấm đoán strategy chất lượng) → mỗi phức tạp harness đổi lấy ít assertion mạnh hơn. **Precedent tiêu cực trong chính repo này: R3 đã phải commit `4927713b` để XÓA harness timing-sensitive vì flaky.** Harness càng phức tạp, rủi ro lặp lịch sử càng cao. |
| **Dependency burden** | R1 giữ nguyên là adjacency. R2 load-bearing (xem mục 7). | Kích hoạt thêm R1 thành execution-context precondition (B5 chạy bên trong cơ chế cancel/fuse của R1). Không re-prove nhưng tăng diện tiếp xúc. |
| **Scope-creep risk** | Thấp — 2 claim, ranh giới rõ. | Trung bình — "model có phục hồi ỔN không?" là câu hỏi kéo theo judgment quality, đúng cái bẫy subjective đã loại B1-dec/B2 ra. Có thể chống bằng legality-only assertion, nhưng áp lực trượt scope tồn tại suốt phase. |
| **NEW behavior claimed** | 2 claims mới (loop coherence, continuity). | 3 claims mới — mỗi claim nhân diện tích acceptance + evidence phải bảo trì. |

### Tại sao B5 nên EXCLUDE khỏi v1 (nếu hỏi "có cần để chứng minh core không?")

1. **Không phải điều kiện của core claim.** Core R4 = "planning loop vận hành coherent với model". B3+B4-inv trả lời đúng câu đó. B5 trả lời câu khác ("loop phục hồi sau stuck thế nào") — đáng giá nhưng tách rời.
2. **Marginal verified-behavior gain thấp so với cost.** Stagnation fuse (park→stuck) và transition stuck→running đã VERIFIED unit (13 PASS). Phần mới duy nhất của B5 là interaction coherence — chính là phần đắt nhất để harness hóa và dễ flaky nhất.
3. **Lịch sử flake-harness của repo** (4927713b) lập luận trực tiếp: đừng mở acceptance surface đa vòng khi chưa cần.

**Kết luận khuyến nghị: MINIMAL.** B5 xuống documented gap, không bị xóa khỏi roadmap — owner có thể chọn Expanded nếu muốn trả giá harness. Quyết định cuối vẫn là PRODUCT DECISION (mục 8, #1).

---

## 3. B1–B5 FINAL CLASSIFICATION

| Candidate | Classification v1 | Ghi chú |
|---|---|---|
| B1-cap (model có khả năng gọi create) | GỘP VÀO B3 | Precondition ngầm của B3 — không criterion riêng |
| B1-dec (model quyết routing đúng/sai) | **EXCLUDED** | Subjective labeled evaluation; cần evaluation framework mới. Standing. |
| B1-enf (system bắt buộc plan) | **EXCLUDED khỏi v1 — PRODUCT DECISION (Q3)** | Nếu Q3 = code-enforced → phase riêng, đổi production semantics toàn cục, không nhét vào verification phase |
| B2 (decomposition quality) | **EXCLUDED** | Không có pass/fail objective mà không tạo LLM benchmark (cấm). Structural validity đã unit-tested. Standing. |
| B3 (loop coherence) | **IN — CORE** | End-state: terminal status hợp pháp + evidence integrity + zero invalid transition |
| B4-inv (single active plan invariant) | **IN — CORE** | End-state: sau request loop, store chứa đúng 1 plan, id gốc, status hợp pháp |
| B4-sem (semantics create-trùng) | **BLOCKED — PRODUCT DECISION** | Mục 4. Blocker cho B4-repair + hình dạng evidence B4 |
| B4-repair (sửa test hỏng) | **PREREQUISITE ONLY** | Thực hiện SAU khi B4-sem chốt; repair ≠ feature; KHÔNG đụng trong session này |
| B5 (stuck recovery interaction) | **EXPANDED tier** | Khuyến nghị exclude khỏi v1 (mục 2); gap có chủ đích, không âm thầm bỏ |

BehaviorEngine: **OUT hoàn toàn** (0 production importer, test-only — audit đã verify). Không ai được tự kéo vào.

---

## 4. B4-SEMANTIC DECISION ANALYSIS

Code fact (re-verified session này):

- `src/core/plan/update-plan-tool.ts:121-129` — create khi active plan tồn tại → trả `{ error: 'Cannot create plan: session already has active plan (status=…). Use action="abort" first or complete existing items.', plan_status, plan_id }`.
- `src/core/engine/engine.ts` (~dòng 920) — prompt layer đang dạy model: *"KHÔNG tạo plan mới. KHÔNG gọi update_plan(action='create') khi đã có plan active."* → tool guard chỉ là backstop; đường chính là prompt tránh va.
- Test hỏng `tests/progress-v1-plan-continuity.test.ts:72-84` — kỳ vọng `'Active plan already exists'` + `resumedExistingPlan: true` + `not.toHaveProperty('error')` → semantics resume, chưa từng được implement.
- **Không bên nào là requirement:** current code ≠ product intent; broken test ≠ product intent. Cả hai chỉ là bằng chứng rằng semantics CHƯA TỪNG được chốt.

### OPTION A — HARD REJECT (giữ nguyên behavior hiện tại)

| Khía cạnh | Phân tích |
|---|---|
| Behavior | Plan gốc bất biến (id, status, items). Caller nhận error kèm `plan_id`/`plan_status` — payload đã tự mang thông tin đủ để model tự xử lý tiếp. Duplicate plan bất khả khả thi bởi cấu trúc. |
| Acceptance/evidence | Nhẹ nhất: `create-with-active → error`; store vẫn đúng 1 plan, cùng id, cùng items. Deterministic tuyệt đối, harness 1 turn. |
| Chi phí/rủi ro | Model phải xử lý rejection graceful trong loop (retry-create spam → stagnation fuse backstop, đã có). Guidance "abort first" đẩy về abort-and-recreate → mất accumulated state của plan dài: đây là hệ quả sản phẩm thật của Option A, owner cần biết chứ không phải chi tiết kỹ thuật trung tính. |
| Dependency | R2 checkpoint: chỉ consume. Không đụng logic resume. |

### OPTION B — GUIDANCE / RESUME (như test hỏng encode)

| Khía cạnh | Phân tích |
|---|---|
| Behavior | create-trùng trả success-shape tham chiếu plan gốc (`resumedExistingPlan: true`), không duplicate. Nhưng semantics "request mới gắn vào existing plan" CHƯA ĐƯỢC ĐỊNH NGHĨA ở bất cứ đâu: goal có đổi không? Item pending cũ giữ hay reconcile? Ai phân xử mismatch giữa yêu cầu mới và mục tiêu cũ? Mỗi câu trả lời = một invariant mới phải spec + verify. |
| Acceptance/evidence | Nặng hơn: cần thêm assert `returned plan_id == original id`, `status preserved`, `no duplicate`, CỘNG toàn bộ adoption semantics do owner định nghĩa. Ngày hôm nay chưa đủ thông tin để phát biểu criterion — thiếu chính nội dung semantics. |
| Chi phí/rủi ro | Silent-reuse có thể che khuất mismatch request-mới-vs-plan-cũ — product có thể cố ý muốn REJECT rõ ràng để model chủ động abort/recreate. Đây là judgment triết lý UX, KHÔNG suy ra được từ code hay test. |
| Dependency | Đụng R2 sâu hơn (resume đọc plan persist qua process boundary). Overlap máy móc với B5 (cùng flavor reuse/resume). |

### Hệ quả coupling với Package decision

- Nếu B4-sem = B → B5 (resume-flavored) trở nên đồng nhất hơn với B4, chọn Expanded bớt lệch pha.
- Nếu B4-sem = A → B5 tách rời sạch; Minimal tự nhiên hơn.
→ **Owner nên quyết #3 (B4-sem) TRƯỚC hoặc CÙNG lúc #1 (package).**

### Verdict

**PRODUCT DECISION REQUIRED.** Session này không chọn A hay B. Phân tích duy nhất được phép nêu: A có gánh evidence nhẹ hơn và semantics tự đóng; B giàu hơn nhưng hiện thiếu định nghĩa đủ để viết acceptance criteria — nếu chọn B, owner phải bổ sung adoption semantics trước khi spec viết được.

---

## 5. Q3 — CODE-ENFORCED VS PROMPT-DRIVEN

Tách đúng 4 lớp fact:

1. **Infrastructure đang tồn tại:** update_plan tool (5 actions) + transition guards + evidence gate + stagnation fuse — production-wired, 103 unit tests. VERIFIED EXISTS (không tự động là VERIFIED BEHAVIOR).
2. **Prompt hiện tại đang yêu cầu gì:** engine.ts (~945-950) ĐÃ mandate: task ≥2 bước → *"hãy gọi update_plan(action='create', …) trước khi thực thi"*; task trivial → trả lời trực tiếp, không tạo plan. Nghĩa là **policy prompt-side ngày nay thực chất đã là "plan-required-for-complex-tasks"** — chỉ là không enforce.
3. **Model loop observable behavior:** KHÔNG có behavioral evidence theo hướng nào. lazy-plan-trigger (5 PASS) dùng stub registry — chứng minh trigger machinery, không chứng minh model thật tuân thủ. Cũng chưa có evidence model thật bỏ qua prompt.
4. **Product requirement cần verify là gì:** đây là điểm chưa chốt.

Phân tích lựa chọn:

- **Prompt-driven (giữ nguyên):** B1-enf không tồn tại như criterion. B3 phát biểu dạng điều kiện: *"với task đi vào planning loop…"*. Verification không bị block. Rủi ro: hành vi entry-point thuộc model discretion — nhưng đó không phải claim của R4 v1.
- **Code-enforced:** criterion sẽ deterministic ("zero execution cycle trước khi plan tồn tại") NHƯNG đổi production semantics toàn cục trên mọi request path → là implementation phase riêng, không phải verification scope. Nhét vào R4 v1 = vi phạm nguyên tắc "không mở phase mới trong phase đang debate".

**Verdict: PRODUCT DECISION REQUIRED, nhưng NON-BLOCKING cho Minimal v1** — vì B3/B4-inv đều verifiable độc lập với cách plan được tạo ra. Q3 chỉ trở thành blocker nếu owner muốn B1-enf nằm trong R4, khi đó đề xuất xử lý như phase riêng.

---

## 6. EVIDENCE PROTOCOL ANALYSIS

Câu hỏi gốc: B3 có cần real model không?

Tách hai mục tiêu chứng minh:

| Mục tiêu | Bản chất | Công cụ đủ |
|---|---|---|
| (i) Deterministic lifecycle/invariant compliance — gates chặn, transitions hợp pháp, single-plan invariant, evidence integrity | Claim của B3/B4-inv | **Controlled/scripted model — ĐỦ** |
| (ii) Stochastic model quality — routing decisions, decomposition chọn đẹp hay không | KHÔNG phải claim R4 (đã exclude B1-dec/B2) | K-runs + benchmark — bị cấm theo scope rules |

Feasibility (fact, không giả định): repo **đã có** pattern drive full loop bằng scripted model — `tests/engine-cancel.test.ts` dựng `modelRouter = { route }` trả tool-call sequence canned, chạy qua engine thật, assert model-call counts. Harness cho B3/B4-inv = reuse pattern này + assertion nhắm end-state plan/checkpoint/EvidenceLog. Không infra mới.

Vậy:

- **Controlled model:** deterministic, nhanh, không phụ thuộc provider flake, assertion end-state vẫn có ý nghĩa "behavior trong loop thật" vì tool calls đi qua engine → registry → guards → checkpoint thật. Gate bị model "cố" phá vẫn phải chặn — đây chính là chỗ unit-test-gate khác loop-evidence.
- **Real model:** chỉ thêm "LLM thật navigate được tool surface" — giá trị smoke/sanity, KHÔNG phải gating acceptance. Cho real model làm gating = nhập provider variance vào acceptance = trượt về benchmark (cấm).
- **K-runs:** chỉ cần khi acceptance criterion phụ thuộc stochastic distribution. Acceptance của Minimal là deterministic lifecycle invariant dưới scripted input → **K=1 per scenario là đủ; lặp lại script giống nhau cho kết quả giống nhau, K-runs chỉ thêm noise không thêm thông tin.** K-runs chỉ quay lại relevant nếu owner chọn real-model gating — khuyến nghị KHÔNG.

**Verdict (khuyến nghị, owner ratify):** acceptance = controlled/scripted model, single-run per scenario, assertion end-state. Real-model smoke (provider mặc định dev env) là OPTION, non-gating, chỉ nếu owner muốn. Mục 8, #4.

---

## 7. DEPENDENCY MATRIX

| Dependency | Classification với MINIMAL | Classification với EXPANDED | Rule |
|---|---|---|---|
| **R1 loop** (cancel/fuse/signal) | Adjacency — B5 out nên precondition KHÔNG kích hoạt | Execution-context precondition (B5 sống bên trong cơ chế R1) | Tiêu thụ as-is. Không re-prove. Không modify. Per-session 1-active-task invariant: KHÔNG đổi. |
| **R2 checkpoint** | **LOAD-BEARING** — B4-inv nằm trong package; plan được đọc/ghi qua CheckpointStore chính là môi trường của continuity assertion. Khuyến nghị evidence gồm 1 scenario recovery: crash giữa plan → boot recovery → vẫn ≤1 active plan, không duplicate resurrection. | Load-bearing (nhưMinimal) + B5 đụng thêm stuck-park persistence | Tiêu thụ as-is. Không sửa atomic write/crash-flush/recovery annotations. Không re-prove. |
| **R3 admission gate** | Code adjacency — flow sequential/single-session của planning không chạm N limit. Hygiene note "rejected request không để plan side-effect" thuộc evidence domain R3, KHÔNG thành criterion R4. | Như Minimal | Không kéo concurrency admission vào R4. N=4 vẫn là test value. |
| **External workstreams** | BehaviorEngine: OUT (0 importer, test-only). Task Identity/Boundary: independent (PROGRESS_V1_FINAL.md tự tuyên bố). Deprecated-exports cleanup: ticket độc lập. `.bak` cleanup: independent. Broken-test ownership: fold vào B4-repair PREREQUISITE, sau B4-sem. | Như Minimal | Không merge workstream nào vào R4. |

Ghi chú hiệu chỉnh so với handoff: "R2 adjacency nếu R4 chỉ B1-B3" là case không tồn tại trong cả 2 package candidate — vì B4-inv thuộc cả hai, R2 load-bearing ở CẢ HAI. Không mâu thuẫn, chỉ làm rõ.

---

## 8. EXACT REMAINING PRODUCT DECISIONS

| # | Decision | Options | Blocking gì | Recommendation (không tự chốt) |
|---|---|---|---|---|
| 1 | **PACKAGE** | Minimal / Expanded | Toàn bộ spec shape | Minimal (mục 2) |
| 2 | **Q3 ENFORCEMENT** | Prompt-driven (giữ) / code-enforced (phase riêng) | Chỉ B1-enf; non-blocking cho Minimal spec | Giữ prompt-driven cho v1; nếu muốn enforce → phase riêng |
| 3 | **B4-SEM** | A hard-reject / B guidance-resume | B4-repair + evidence shape B4-inv; nếu B → owner phải định nghĩa adoption semantics trước | Không có enough info để recommend B (thiếu semantics); A nhẹ hơn về evidence — quyết là của owner |
| 4 | **EVIDENCE PROTOCOL** | Controlled model single-run (ratify?) / thêm real-model smoke non-gating? | Viết acceptance criteria chương evidence | Controlled single-run; real-smoke optional non-gating |

Sau khi 4 mục trên được Kayce chốt → SPEC-READY, viết R4 Spec v1 từ classification mục 3 + criteria shape đã có ở SCOPE_DEBATE.md mục 2.

---

## 9. SCOPE BOUNDARY

**IN (Minimal):**
- B3 — planning loop coherence: end-state terminal hợp pháp, evidence integrity per completed item, zero invalid transition
- B4-inv — single-active-plan invariant qua request loop thật (+ 1 recovery scenario)

**IN (chỉ nếu Expanded):**
- B5 — stuck-recovery interaction coherence, assertion legality-only

**PREREQUISITE (không phải deliverable):**
- B4-repair: rewrite `tests/progress-v1-plan-continuity.test.ts` THEO semantics được chốt ở decision #3. Sau decision, trước/trong implementation. Repair ≠ feature.
- B1-cap: ngầm trong B3, không artifact riêng.

**OUT:**
- B1-dec (subjective evaluation)
- B2 (decomposition quality — cấm biến R4 thành LLM benchmark)
- B1-enf (trừ phi Q3 chọn enforce → phase riêng)
- BehaviorEngine + toàn bộ expressive/emotion/speak
- Policy constants tuning (stagnation=5/transient=3/ceiling=200)
- Re-prove R1/R2/R3
- Mọi requirement ngoài B1–B5

**EXTERNAL BACKLOG (không đụng):**
- BehaviorEngine wire-or-archive decision
- Task Identity / Boundary workstream
- Deprecated exports cleanup ticket
- `.bak` test file cleanup

---

## 10. FINAL STATUS

**DEBATE REQUIRED**

Debate scope/semantics: HOÀN TẤT. Không còn câu hỏi phân tích mở — mọi candidate đã có classification, mọi option còn lại đã có phân tích hệ quả.

Chặn chuyển SPEC-READY: 4 product decisions ở mục 8, trong đó:
- Hard blocker: #1 (package), #3 (B4-sem)
- Non-blocking-nếu-giữ-status-quo: #2 (Q3)
- Ratify-by-default: #4 (evidence protocol)

Viết spec trước khi có #1/#3 = spec đoán mò thay owner. Không làm.

---
*Session này: 0 code change, 0 test change, 0 commit. File này là artifact duy nhất được tạo.*
