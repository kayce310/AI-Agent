# R4 v1 IMPLEMENTATION EVIDENCE

**Date:** 2026-08-26
**Branch:** `r1-execution-safety`
**Spec:** `docs/evidence/R4/R4_V1_SPEC.md`
**Scope:** MINIMAL — R4-F.1 (Planning Loop Coherence) + R4-F.2 (Single Active-Plan Invariant)

---

## 1. Files changed

| File | Change | Purpose |
|---|---|---|
| `src/core/engine/agent.ts` | +3 dòng guard tại evidence-write point (~line 1101) | Fix F1-AC3 defect (mục 3) |
| `tests/r4-plan-loop-coherence.test.ts` | NEW (2 scenarios S1, S2) | R4-F.1 acceptance |
| `tests/r4-single-active-plan.test.ts` | NEW (5 tests: S3 loop, S4 tool×3 statuses, negative control, S5 recovery) | R4-F.2 acceptance |
| `tests/progress-v1-plan-continuity.test.ts` | DELETE | Spec §8 — stale WIP encode resume semantics |
| `tests/progress-v1-plan-continuity.test.ts.bak` | DELETE | Spec §8 |

Production diff tổng: **1 điều kiện guard** (`toolCall.function.name !== 'update_plan'`) tại đúng 1 write-point. Không đổi state machine, không đổi checkpoint/recovery, không đổi admission gate, không đổi semantics hard-reject.

---

## 2. Harness (theo spec §4, precedent `engine-cancel.test.ts`)

- Real `Agent.run()` loop — KHÔNG mock agent.
- Real `ToolRegistry` + real plugin `createUpdatePlanPlugin(checkpointStore)` đăng ký như production engine.
- Scripted `modelRouter.route(messages)` trả queue canned tool-call JSON; mỗi turn ghi lại `store.getPlan(sid)?.status` (transition journey observable) và mọi tool-payload model nhận được (rejection observability).
- Work tool thật (`r4_work`) qua registry path thật (`registry.executeToolCall` — cùng đường `agent.ts:1035`).
- EvidenceLog đọc trực tiếp từ `requestContext` store do test tự cấp (cùng AsyncLocalStorage instance agent dùng).

---

## 3. Defect tìm thấy trong implementation phase (root-caused, đã fix)

**Symptom:** S2 RED ở run đầu tiên — premature `complete_item(0)` KHÔNG bị gate reject trong full loop, dù gate có unit test xanh.

**Raw RED output (nguyên văn):**

```
 FAIL  tests/r4-plan-loop-coherence.test.ts > ... > S2 gate-in-loop: ...
AssertionError: gate rejection payload reached the model: expected false to be true
 ❯ tests/r4-plan-loop-coherence.test.ts:197:71
 Test Files  1 failed | 1 passed (2)
      Tests  1 failed | 6 passed (7)
```

**Root cause:** `agent.ts` evidence-block log MỌI tool result vào `evidenceLog[currentItemIndex]` khi plan pending/running — kể cả chính các `update_plan` call. Hệ quả: ngay sau `create`, bản thân create-call trở thành evidence `success=true` cho item 0 ⇒ gate (`canCompleteItem`: ≥1 success record) tự chứng minh vô hiệu trong loop. Unit test không bắt được vì test function trực tiếp, không qua write-path này.

**Fix (single write point):**

```ts
// ponytail(R4-F1-AC3): update_plan là bookkeeping chứ không phải work —
// không được log làm evidence, nếu không chính create/complete_item call
// sẽ tự chứng minh evidence-gate của item hiện tại (gate vô hiệu trong loop).
if (toolCall.function.name !== 'update_plan' && sp && (sp.status === 'pending' || sp.status === 'running')) {
```

**GREEN sau fix:** 7/7 pass. S2 xác nhận: rejection payload `"No evidence of tool execution"` tới model, item vẫn `pending`, `evidenceLog.get(0)` rỗng trước work thật, và sau work `ev0 === [{toolName:'r4_work', success:true}]` (đúng 1 record — không pollution).

---

## 4. Out-of-scope findings (KHÔNG sửa — báo lại)

1. **`skip_item` không có all-done check:** handler `skip_item` chỉ có fail>50%→failed transition; plan mà item cuối bị skip (≤50%) sẽ treo `running` mãi (stagnation fuse là cơ chế cứu duy nhất — thuộc B5). Phát hiện qua S2 draft đầu; scenario đã reshape để đóng lifecycle bằng completes hợp lệ. Thuộc state-machine semantics ngoài spec v1 → candidate cho debate sau.
2. **Build fail pre-existing ngoài scope:** xem mục 6.

---

## 5. Test commands + results (nguyên văn)

**Targeted R4 tests:**
```
$ npx vitest run tests/r4-plan-loop-coherence.test.ts tests/r4-single-active-plan.test.ts
 Test Files  2 passed (2)
      Tests  7 passed (7)
   Duration  1.15s
```

**Full relevant suite (plan infra + stagnation + boundary + lazy-trigger + R4):**
```
$ npx vitest run tests/state-driven-plan.test.ts tests/plan-state.test.ts \
    tests/verify-stagnation-tracking.test.ts tests/progress-boundary.test.ts \
    tests/lazy-plan-trigger.test.ts tests/r4-plan-loop-coherence.test.ts \
    tests/r4-single-active-plan.test.ts
exit=0
 ✓ tests/plan-state.test.ts (24 tests) 16ms
 ✓ tests/progress-boundary.test.ts (14 tests) 16ms
 ✓ tests/verify-stagnation-tracking.test.ts (13 tests) 8ms
 ✓ tests/r4-single-active-plan.test.ts (5 tests) 94ms
 ✓ tests/lazy-plan-trigger.test.ts (5 tests) 132ms
 ✓ tests/r4-plan-loop-coherence.test.ts (2 tests) 130ms
 ✓ tests/state-driven-plan.test.ts (47 tests) 1055ms
 Test Files  7 passed (7)
      Tests  110 passed (110)
   Duration  1.79s
```

**Legacy reference check sau delete:**
```
$ rm tests/progress-v1-plan-continuity.test.ts tests/progress-v1-plan-continuity.test.ts.bak
$ grep -rln "progress-v1-plan-continuity" tests/ src/
refs-check-exit=1   # zero match
```

## 6. Build

```
$ npx tsc --noEmit -p tsconfig.json     # working tree (có thay đổi R4)
src/platform/telegram/message-handler.ts(6,40): error TS2307: Cannot find module './utils.js' ...
src/platform/telegram/message-handler.ts(66,58): error TS2554: Expected 1 arguments, but got 2.
src/platform/telegram/message-handler.ts(69,59): error TS2554: Expected 1 arguments, but got 2.
src/platform/telegram/message-handler.ts(91,52): error TS2554: Expected 1 arguments, but got 2.
exit=2
```

**Chứng minh pre-existing + out-of-scope** (clean HEAD worktree, TRƯỚC mọi thay đổi R4):

```
$ git worktree add /tmp/r4-baseline HEAD   # HEAD=9ea64a88, chưa có thay đổi R4
$ ln -s <main>/node_modules /tmp/r4-baseline/node_modules
$ npx tsc --noEmit -p tsconfig.json        # trong /tmp/r4-baseline
baseline-tsc-exit=2
→ CÙNG ĐÚNG 4 lỗi message-handler.ts, không thêm lỗi nào khác
```

- `git diff --name-only` (working tree): chỉ `src/core/engine/agent.ts` + xóa 2 legacy tests + runtime data — KHÔNG file nào thuộc `platform/telegram`.
- `git log --all -- src/platform/telegram/utils.ts` → rỗng: file **chưa từng tồn tại trong git history**; import './utils.js' có sẵn trong HEAD-committed `message-handler.ts`.
- Kết luận: build gate FAIL do workstream telegram riêng (issue đã biết), không phải do R4. Zero lỗi TypeScript phát sinh từ thay đổi R4 (output tsc toàn repo CHỈ có 4 lỗi đó).

## 7. Git discipline

Pre-commit checks thực hiện: `git status --short`, `git diff --stat`, `git diff --cached --stat`. Runtime/data dirty (`data/coral.db-*`, `data/memories.json`, `knowledge/memory-temporal/manifest.json`) — KHÔNG stage. Chỉ stage R4 deliverables.

## 8. Known limitations

- Real-model smoke run: CHƯA chạy (spec §4.3 optional non-gating) — không ảnh hưởng verdict.
- F2-AC4 recovery scenario dùng CheckpointStore boot path thật (`init()` → disk flush → instance mới `loadFromDisk()`); không simulate SIGKILL process thật.
