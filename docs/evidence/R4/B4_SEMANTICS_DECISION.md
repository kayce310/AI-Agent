# R4 — B4 SEMANTICS DECISION BRIEF (Historical Context Audit)

**Date:** 2026-08-26
**Repo:** D:\AI-Agent (branch `r1-execution-safety`, HEAD `9ea64a88`)
**Input:** FINAL_SCOPE_DEBATE.md (decision #3 — B4-sem)
**Session type:** READ-ONLY. Git archaeology + decision framing. Không sửa code/test, không viết spec, không chọn A/B, không commit.
**Method:** mọi claim dưới đây kiểm tra trực tiếp bằng `git show`/`git log -S` trên blob thật — KHÔNG tin vào context truyền tay.

---

## 1. EXECUTIVE SUMMARY

Câu chuyện lịch sử được truyền vào session ("1521e489 từng đổi behavior sang resume; b29614b1 revert về hard-reject") **KHÔNG đúng theo git history**. Bằng chứng blob-by-blob:

- Hard-reject tồn tại **từ ngày sinh của hệ thống plan** (25-07-2026) và **không rời khỏi bất kỳ production commit nào** cho tới HEAD. Không có sự kiện regression — không có gì để regress FROM.
- 1521e489 KHÔNG đụng vào create-on-active behavior — chỉ đổi **description text** của tool (mandatory-for-all → conditional) + thêm lazy-trigger tests.
- Resume/reuse **đã từng được implement** — nhưng CHỈ dạng WIP chưa commit, tồn tại trong stash/checkpoint snapshots (14c65b0f, a0e207f6), **từng chưa bao giờ landing lên branch production**, và còn tồn tại **2 thế hệ WIP mâu thuẫn nhau** về response shape.
- Broken test **đã hỏng syntax ngay từ lần đầu bị capture** — chưa từng có bằng chứng nó chạy xanh ở bất kỳ đâu.

Hệ quả framing: việc chọn Hard-Reject hôm nay **không phải "chấp nhận một unresolved regression"** (không có regression), nhưng cũng **không phải status-free default** — vì có WIP chưa ship thể hiện hướng đi resume kèm rationale ("breaks stale loop on restart"), và việc bỏ rơi WIP đó **chưa từng được đóng/root-cause trong bất kỳ record nào**.

**Status: DEBATE REQUIRED — B4 SEMANTICS PRODUCT DECISION.**

---

## 2. CURRENT IMPLEMENTATION FACT

`src/core/plan/update-plan-tool.ts:121-129` (HEAD, re-verified):

```ts
const existing = checkpointStore.getPlan(sessionId);
if (existing && isPlanActive(existing.status)) {
  return {
    error: `Cannot create plan: session already has active plan (status=${existing.status}). Use action="abort" first or complete existing items.`,
    plan_status: existing.status,
    plan_id: existing.id,
  };
}
```

Prompt layer (engine.ts ~920) dạy model tránh va trước: *"KHÔNG tạo plan mới… khi đã có plan active"* → tool guard là backstop.

Broken test `tests/progress-v1-plan-continuity.test.ts` encode kỳ vọng resume (`resumedExistingPlan: true`, `not.toHaveProperty('error')`) — chỉ là historical artifact, không phải acceptance evidence.

---

## 3. HISTORICAL DECISION HISTORY

### 3.1 Full ancestry of update-plan-tool.ts (mọi commit chạm file, tất cả --all)

| Commit | Date | Message | Create-on-active behavior |
|---|---|---|---|
| d48588ce | 07-25 | feat(core/status): dashboard+tunnel (swoops plan system) | **HARD-REJECT (line 122) — ngày sinh** |
| b29614b1 | 07-25 | merge into develop (47-test State-Driven Plan) | HARD-REJECT (giữ nguyên byte) |
| a0822338 | 07-26 | evidence-based completion | HARD-REJECT |
| 4ef0a975 | 07-27 | AsyncLocalStorage per-request state | HARD-REJECT |
| 8c518858 | 07-27 | extract shared plan-state.ts | HARD-REJECT |
| 1521e489 | 08-17 | fix(plan): keep direct answers planless | HARD-REJECT (line 125) |
| 14c65b0f | 08-18 | **stash** "On develop: temp isolation for phase 0-6 audit" | **RESUME (WIP)** |
| HEAD     | 08-26 | 9ea64a88 | HARD-REJECT |

Chuỗi tìm kiếm `-S "Cannot create plan"`: chỉ hit d48588ce + b29614b1 → string ra đời một lần duy nhất, ngày 25-07.
Chuỗi tìm kiếm `-S "resumedExistingPlan"` trên TOÀN BỘ history: chỉ hit **738b07fe, a0e207f6, 12628afd** — đều là commit contamination/checkpoint, **zero production commit**.

### 3.2 Inspect 1521e489 — "fix(plan): keep direct answers planless"

- Files changed: agent.ts (35), engine.ts (21), prompt-builder.ts (2), **update-plan-tool.ts (4)**, lazy-plan-trigger.test.ts (+231).
- Nội dung 4 dòng trong update-plan-tool.ts: đổi **tool description** từ *"BẮT BUỘC dùng cho MỌI request… kể cả plan 1 bước"* thành *"dùng cho task ≥2 bước hoặc có side-effect — KHÔNG dùng cho câu trả lời trực tiếp"*. Blob tại commit này vẫn chứa hard-reject nguyên vẹn ở line 125.
- **Kết luận: CONFIRMED — commit này KHÔNG implement resume/reuse.** Nó là policy change về KHI NÀO tạo plan (lazy trigger), không phải WHAT happens khi create-trùng. Claim "1521e489 = Plan Lifecycle Audit đổi behavior sang resume" → **REFUTED by blob inspection.**

### 3.3 Inspect b29614b1 — merge "State-Driven Task Plan (47 tests)"

- Merge đưa toàn bộ hệ thống plan vào develop. Blob update-plan-tool.ts trong merge **đã chứa hard-reject ngay từ đầu** (kế thừa từ d48588ce).
- **Không có phiên bản committed nào TRƯỚC b29614b1 chứa logic resume** — vì vậy không thể gọi đây là "reintroduce hard-reject" hay "regression/revert": không tồn tại trạng thái trước đó để revert từ đó.
- Intent: merge feature drop hàng loạt (cleanup/dead-code-audit), không có dấu hiệu quyết định có chủ đích về create-on-active riêng lẻ — nhưng cũng KHÔNG có dấu hiệu cố tình phá gì, vì không gì để phá.
- **Kết luận: claim "b29614b1 gây regression resume → hard-reject" → REFUTED.** Classification đúng: **UNKNOWN-intent, NON-EVENT** (không có behavior change nào xảy ra tại commit này về create-on-active).

### 3.4 Resume/reuse thực sự sống ở đâu — WIP layer

Ba snapshot chưa-từng-là-production:

1. **14c65b0f** (stash, 3 parents, 08-18): `update-plan-tool.ts` WIP chứa:
   ```ts
   // ponytail: RESUME instead of ERROR — breaks stale loop on restart
   log.info(`[update_plan] … Resuming existing plan.`);
   return {
     resumedExistingPlan: true,
     plan_id: existing.id,
     plan_status: existing.status,
     current_item_index: existing.currentItemIndex,
     message: `✅ Đang tiếp tục kế hoạch hiện có: ${existing.id} (status: ${existing.status}).`,
   };
   ```
   → KHÔNG mutate existing plan, KHÔNG đổi goal, KHÔNG reconcile items. Read-only guidance return.
2. **12628afd** ("untracked files on develop: 217d5d1a"): chỉ docs/tests khác (CONTINUITY_FIXES_SUMMARY.md — nội dung về session isolation, KHÔNG phải plan create semantics). Không chứa tool WIP.
3. **a0e207f6** ("untracked files on cline checkpoint"): `progress-v1-plan-continuity.test.ts` (164 dòng) **ĐÃ syntax-broken** (`async () => {` mồ côi) + `.bak` (148 dòng). Test kỳ vọng shape: `message ~ 'Active plan already exists'`, nested `plan: {id, plan_status, current_item_index}` + flat fields + `resumedExistingPlan: true`. Comment trong test tự thú: *"With updated update-plan-tool.ts…"* → viết CHO một tool change đang làm dở.

### 3.5 Phát hiện then chốt: HAI THẾ HỆ WIP MÂU THUẪN

- Tool WIP (14c65b0f): message `"✅ Đang tiếp tục kế hoạch hiện có…"`, response FLAT.
- Test kỳ vọng (a0e207f6): message `"Active plan already exists"`, response có nested `plan` object.
- **Không tìm thấy ở bất kỳ đâu trong history một bản update-plan-tool.ts khớp shape mà test kỳ vọng.**

Nghĩa là: ngay cả ở tầng WIP, resume semantics **chưa từng hội tụ** — tool draft và test draft là hai bản thiết kế khác nhau của cùng một ý tưởng, không bản nào hoàn chỉnh, không bản nào chạy chung xanh.

### 3.6 Classification tổng

| Claim truyền tay | Verdict | Evidence |
|---|---|---|
| Original behavior = hard-reject | **CONFIRMED** | d48588ce blob, ngày sinh 25-07 |
| 1521e489 đổi behavior sang resume | **REFUTED** | diff 4 dòng = description text only; blob vẫn hard-reject |
| b29614b1 revert/regression về hard-reject | **REFUTED (non-event)** | không có committed resume trước đó; blob merge = hard-reject kế thừa |
| Resume/reuse từng được implemented | **CONFIRMED (WIP-only)** | 14c65b0f stash blob |
| Resume = "historical intended behavior" đã được approve | **KHÔNG ĐỦ BẰNG CHỨNG** | zero record phê duyệt; 2 thế hệ WIP mâu thuẫn; test chưa từng green |
| Regression root cause chưa đóng | **REPHRASED (xem mục 4)** | không có regression event để root-cause |

---

## 4. REGRESSION STATUS

Phát biểu chính xác theo bằng chứng, thay cho framing truyền tay:

- **CONFIRMED:** Hard-reject là behavior liên tục duy nhất từng tồn tại trong production code, từ 25-07 đến HEAD. Không có khoảng thời gian nào production chạy resume.
- **CONFIRMED:** Một hướng đi resume đã được bắt đầu dạng WIP (~18-08), kèm rationale ngắn trong code comment ("breaks stale loop on restart"), rồi **bị bỏ dở không dấu vết quyết định**.
- **SUSPECTED (không chứng minh được từ git):** Lý do WIP không landing — không có commit message, không có doc, không có evidence run nào ghi lại việc từ bỏ. Các checkpoint commit chỉ là auto-snapshot của working tree.
- **UNRESOLVED — phát biểu thay cho "root cause regression chưa đóng":** cái chưa đóng KHÔNG phải root cause của một regression (vì không có regression), mà là **số phận của một hướng design chưa hoàn thiện**: WIP resume bị abandon giữa chừng, không ai ghi lại vì sao, và hai bản nháp WIP còn tự mâu thuẫn nhau. Đây là **abandoned-WIP-without-closure**, không phải regression-without-root-cause.

Bất kỳ tài liệu nào sau đây gọi việc này là "regression" đều sai mức độ: không có trạng thái cũ tốt hơn bị mất — có một trạng thái mới (resume) chưa từng hoàn thiện đủ để vào production.

---

## 5. OPTION A — KEEP / CONFIRM HARD-REJECT

- **Current behavior:** như mục 2. Payload reject đã mang `plan_id` + `plan_status` + hướng dẫn thoát ("abort first or complete items").
- **Historical implications:** Đây là behavior gốc từ ngày sinh, LIÊN TỤC qua toàn bộ production history. Chọn A **không phải khôi phục trạng thái nào** — nhưng PHẢI được ghi là *"explicit new product decision to retain/confirm hard-reject, despite unshipped WIP that expressed a resume direction"* — KHÔNG được ghi kiểu "giữ vì code hiện tại làm vậy" (vi phạm quy tắc), và cũng KHÔNG được ghi kiểu "hủy một regression" (sai lịch sử).
- **Acceptance/evidence implications:** Nhẹ nhất: deterministic 1-turn assert (create-with-active → error; store giữ nguyên 1 plan, id/status/items bất biến). Khớp controlled-model protocol đã ratify hướng ở FINAL_SCOPE_DEBATE.md mục 6.
- **Product consequence cần owner nhìn thẳng:** reject đẩy model vào đường "abort first" → plan dài mất accumulated completed-items nếu model nghe lời guidance. Đồng thời: WIP rationale *"breaks stale loop on restart"* nêu một scenario thật — sau crash/restart, model có xu hướng gọi create lại → ăn hard-reject → nếu model retry loạn thì stagnation fuse backstop (đã VERIFIED unit). Với A, hành vi model post-reject trong loop PHẢI nằm trong B3 assertion (reject được xử lý graceful, không spin).
- **Cần explicit decide:** (1) confirm A là product decision mới; (2) xử lý tồn đọng WIP: ghi nhận abandoned, hoặc mở backlog item nhỏ "close out abandoned resume WIP" nếu muốn truy nguyên lý do; (3) chấp nhận consequence abort-first-state-loss, hoặc ghép kèm policy "model nên complete/skip hết item rồi abort" vào prompt — lưu ý đây là prompt-side tuning, không mở requirement mới.

## 6. OPTION B — RESTORE / CONFIRM RESUME

- **Historical implementation evidence — thứ thực sự biết:** trả success-shape tham chiếu existing plan; `plan_id`/`plan_status`/`current_item_index` giữ nguyên; KHÔNG mutate plan; KHÔNG duplicate; rationale: tránh stale-loop sau restart. Response shape cụ thể: **CHƯA XÁC ĐỊNH** — hai bản nháp WIP trả hai shape khác nhau (flat "✅ Đang tiếp tục…" vs nested "Active plan already exists") và không bản nào có evidence chạy xanh.
- **Current divergence:** production = hard-reject; khoảng cách restore ≈ 15 dòng tool code + rewrite test theo shape được chốt.
- **Acceptance/evidence implications:** assert: create-trùng → success-shape, `returned plan_id == original id`, store vẫn 1 plan, status/currentItemIndex preserved, zero mutation. Vẫn deterministic, vẫn可控-model friendly — gánh nặng chỉ tăng đúng một bước so với A (phải chốt shape trước).
- **What remains undefined (UNKNOWN / PRODUCT DECISION — KHÔNG tự thiết kế):**
  - goal mới có override goal cũ không? → UNKNOWN, không bằng chứng trong bất kỳ WIP nào (cả hai draft đều ignore args.goal khi resume)
  - existing items có reconcile với request mới không? → UNKNOWN (không WIP nào đụng)
  - request mới có modify plan (thêm/xóa item) không? → UNKNOWN (không WIP nào đụng)
  - conflict resolution (request mới mâu thuẫn goal cũ) thế nào? → UNKNOWN
  - response shape cuối cùng: flat hay nested? → hai draft mâu thuẫn, owner chốt
  Nếu B được chọn với đúng phạm vi historical evidence: resume = **read-only guidance return**, mọi câu hỏi trên giữ nguyên OUT-of-scope cho tới khi owner mở rộng rõ ràng.
- **Framing bắt buộc nếu chọn B:** *"Restore/confirm previously implemented (as unfinished WIP) resume/reuse semantics"* — KHÔNG mô tả như feature mới hoàn toàn; đồng thời KHÔNG mô tả như "khôi phục intended behavior đã được duyệt" (không có record phê duyệt).

## 7. RISK OF CHOOSING A

Phân biệt bắt buộc:

- **"New product confirmation" (đúng):** owner nhìn thấy full context — hard-reject liên tục từ ngày sinh + một hướng resume WIP chưa ship chưa được close — và chủ động confirm hard-reject. Hợp lệ hoàn toàn.
- **"Accidental ratification of unresolved regression" (KHÔNG áp dụng được nguyên văn):** không tồn tại regression để accidentally ratify. Risk thật của A không nằm ở đó, mà nằm ở:
  1. **Silent dismissal của abandoned WIP:** nếu không ai ghi lại rằng WIP resume từng tồn tại và bị từ chối có chủ đích, thì 6 tháng nữa ai đó lại "phát hiện" mâu thuẫn code-vs-test như session SCOPE_DEBATE vừa làm, và vòng debate lặp lại. Mitigation: chính document này + một dòng "WIP closed by product decision #X" trong spec.
  2. **Post-restart stale-loop:** đúng scenario mà WIP comment cảnh báo. Nếu chọn A, scenario "crash → restart → model create lại" PHẢI xuất hiện trong B3/B4-inv evidence (model xử lý reject graceful) — nếu không, A sẽ yếu đúng chỗ mà B từng được viết ra để vá.
  3. **Abort-first data-loss:** consequence sản phẩm nêu ở mục 5 — cần owner accept rõ, không ngầm.

## 8. RISK OF CHOOSING B

Phân biệt bắt buộc:

- **Restoring known historical behavior (được phép):** giới hạn đúng ở những gì WIP đã làm = read-only resume guidance, không mutate, không đổi goal, không reconcile. Scope nhỏ, deterministic, có tiền lệ trong repo history.
- **Inventing new resume semantics (CẤM ngầm):** bất kỳ câu trả lời nào cho goal-override/item-reconcile/conflict-resolution đều là THIẾT KẾ MỚI — không có trong bất kỳ historical evidence nào. Nếu owner muốn những cái đó, phải là yêu cầu tách bạch, không lẫn vào "restore". Rủi ro cụ thể: chọn B rồi vô tình đọc test hỏng như spec → enshrine một shape (nested plan object) mà chưa một bản tool nào từng trả.
- **Risk phụ:** shape chưa hội tụ (2 drafts) → nếu không chốt shape tường minh, B sẽ sinh ra cuộc debate test-vs-code THỨ HAI y hệt vụ này.

## 9. EXACT PRODUCT DECISION REQUIRED FROM KAYCE

Một quyết định chính, hai phụ thuộc kèm theo:

1. **B4-sem:** (A) explicit-confirm hard-reject — với điều kiện ghi nhận abandoned resume WIP vào biên bản; hay (B) restore resume/reuse đúng phạm vi historical evidence (read-only guidance return).
2. **Nếu B:** chốt response shape (flat theo stash-draft / nested theo test-draft / shape mới do owner định nghĩa) — vì hai bản nháp history tự mâu thuẫn.
3. **Nếu A:** chấp nhận (hoặc điều chỉnh prompt-side) consequence abort-first-state-loss + yêu cầu scenario post-restart-create vào B3/B4-inv evidence?

Quyết định này giải tỏa blocker cuối cùng của MINIMAL package (Q3 non-blocking, evidence protocol đã ratify-hướng). Sau khi chốt → SPEC-READY.

## 10. FINAL STATUS

**DEBATE REQUIRED — B4 SEMANTICS PRODUCT DECISION**

Brief này KHÔNG chọn A hay B. Nó đảm bảo Kayce quyết với context đầy đủ:
- Chọn A = product decision mới có chủ đích, KHÔNG phải mặc định vô tri của status quo, và KHÔNG phải "chấp nhận regression" (không có regression).
- Chọn B = hoàn thiện một hướng đã được phác thảo nhưng chưa từng hội tụ, KHÔNG phải khôi phục behavior đã được duyệt, và KHÔNG được mở rộng ra ngoài historical evidence.

---
*Session này: 0 file sửa, 0 commit. Artifact duy nhất: file này. Toàn bộ evidence là git blobs đọc trực tiếp.*
