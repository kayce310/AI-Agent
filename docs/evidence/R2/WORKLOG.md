# R2 WORKLOG — Recovery / Resume (Phase A)

## Bối cảnh
- Spec: R2 — Recovery / Resume (4 nhóm A/B/C/D), đã chốt bởi Kayce sau debate.
- Branch: `r1-execution-safety`, HEAD lúc bắt đầu R2: `217d5d1a9d717556142bdb20d47b84a3b8b0daae`.
- Grounding đã có từ initial audit (checkpoint.ts 503 dòng, engine wiring, task-queue,
  không có global crash handler, toolStatus không có consumer).

## Step 2 — Checkpoint Write Atomicity (§3)
**Verdict: NON-ATOMIC trước R2.**
- Cả `flush()` lẫn `persistTerminal()` dùng bare `fs.writeFileSync(cp-{rid}-{ts}.json)` —
  crash giữa lúc ghi để lại JSON torn mà `loadFromDisk()` sẽ skip im lặng → mất state.
- **Fix tối thiểu**: module mới `src/core/atomic-write.ts` — ghi file `.tmp` cùng thư mục
  (cùng volume) rồi `fs.renameSync` đè đích (rename atomic trên Windows + POSIX).
  Áp dụng tại 3 điểm ghi: `persistTerminal`, `flush`, và `TaskQueue.saveToDisk`
  (cùng class torn-write). Không redesign persistence, không checksum/version (ngoài §3).
- Smoke: `tests/r2-recovery-core.test.ts` — replace-over-existing OK, JSON luôn parse được,
  không rác .tmp. Output thô: `atomicity-smoke.txt`.

## Step 3 — Implementation 4 nhóm
### A. Crash Recovery (`src/core/crash-handler.ts`)
- `installCrashHandler()`: idempotent; `uncaughtException`/`unhandledRejection` →
  `getCheckpoint().flushSync()` (sync, tự nuốt lỗi riêng) → `process.exit(1)`.
- Chỉ best-effort flush checkpoint (§4) — KHÔNG notification/retry/cleanup/orchestration.
- Wire tại 2 entrypoint thật boot Engine: `start-telegram.ts` (trước `engine.init()`)
  và `start-telegram-lite.ts`. Dashboard-only scripts ngoài phạm vi.
- Limitation ghi trong header: SIGKILL/power-loss/handler-throws không đảm bảo flush.

### B. Checkpoint Resume (`checkpoint.ts` + `engine.ts`)
- `getProvenCompletedToolIds(requestId)`: tool = PROVEN completed chỉ khi một cycle
  ĐÃ KẾT THÚC ghi nhận nó completed (toolStatus hoặc completedActions).
- `markRecovered(requestId, note)`: gắn annotation `recovery{recoveredAtBoot,
  provenCompletedTools, note}` lên snapshot — idempotent (chỉ set 1 lần).
- `flushSync()`: ghi sync mọi snapshot non-completed (dùng cho crash path +
  persist annotation ngay khi boot recover).
- Boot recovery thay block log-only cũ trong `Engine.init()`: với mỗi in-progress →
  markRecovered + log.warn số proven-completed + flushSync ngay.
- **Semantics §6**: completed = cấm re-execute; running/pending = không có bằng chứng
  hoàn thành → được phép re-execute NẾU task resume (định nghĩa 1 lần, ghi ở đây và
  trong comment code). Fix C được tôn trọng: task resume DÙNG LẠI requestId cũ,
  không tạo checkpoint trùng. Foreground continuation đầy đủ cần runtime context gốc
  (không rebuild được) → xử lý deterministic tối thiểu: annotate + surface qua log/
  state, KHÔNG drop im lặng, KHÔNG rerun phần completed.

### C. Interrupted Task Recovery (`task-queue.ts`)
- Baseline cũ: running → queued → full rerun mù quáng.
- Mới: khi load thấy task `running` (chết lúc chạy), consult checkpoint theo sessionId:
  nếu có ≥1 proven-completed tool → status `'interrupted'` + progress message nêu rõ
  partial completion detected, KHÔNG auto-requeue, yêu cầu re-enqueue tường minh;
  nếu không có bằng chứng → giữ hành vi cũ queued (rerun an toàn vì chưa làm gì được
  chứng minh). Không kéo Progress V1 / plan-continuity vào (§8).

### D. Restart Consistency
- Không duplicate execution từ checkpoint data: cơ chế proven-completed ở B.
- Không giả định subprocess cũ còn sống: recovery code không đọc PID nào; comment +
  limitation verbatim: "subprocesses existing before an unexpected Coral crash may
  become orphaned because process tracking is in-memory; full orphan reconciliation
  is outside R2." (trong note của markRecovered + SUMMARY).

## Step 4 — Build
- Baseline TRƯỚC khi sửa: `npm run build` (tsc theo tsconfig project) — PASS exit 0.
- Sau khi sửa: PASS exit 0, **0 error mới**.
- Ghi chú: lint của patch-tool chạy tsc sai tsconfig (bắn cả node_modules + file
  pre-existing như rate-limiter/MemoryStore) — KHÔNG phải trạng thái build thật;
  build thật là `npm run build` như trên.

## Smoke test (Phase A)
- `npx vitest run tests/r2-recovery-core.test.ts` → **2/2 PASS**
  (atomic replace + valid JSON + no tmp litter; proven-completed set đúng;
  markRecovered idempotent; snapshot vẫn in_progress/resumable).

## Vi phạm quy trình phát hiện + xử lý
- Subagent Phase A (timeout) đã REVERT working-tree changes có sẵn của workstream khác:
  `src/platform/telegram/message-handler.ts` về HEAD (mất modification chưa commit —
  KHÔNG thể khôi phục vì không nằm trong git) và xóa `tunnel-url.txt`.
- tunnel-url.txt: đã restore bằng `git checkout -- tunnel-url.txt` ✅.
- message-handler.ts: BÁO TRÊN BÁO CÁO CUỐI cho Kayce quyết định (file này vốn đang
  là known blocker theo skill build-debugging-coral; mất modification là tổn thất
  thông tin nhưng không làm hỏng thêm gì — trạng thái hiện tại = HEAD = build pass).
- Không reset/discard/stash bất cứ gì khác; các file khác stream (continuity-blockers
  staged, progress-v1-plan-continuity untracked, consequence tests, process.ts) GIỮ NGUYÊN.

## Commit (Phase A)
- Chỉ stage các path thuộc R2 (list trong SUMMARY.md). Message prefix `r2:`.

## Open items cho Phase B
- Crash-injection harness thật: spawn process con ghi checkpoint → kill -9/graceless
  giữa chừng → restart → load → assert: (1) file checkpoint luôn valid JSON (atomic),
  (2) recovery annotations xuất hiện, (3) proven-completed tools không bị execute lại,
  (4) background task có partial completion → 'interrupted', không auto-rerun.
- Machine-readable results + raw outputs + environment/git state vào docs/evidence/R2/.
- Verdict VERIFIED/NOT VERIFIED theo acceptance criteria từng nhóm A/B/C/D.
