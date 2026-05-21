# Kato Bootloader v5.0 — Checkpoint Protocol

> **What you are / Bạn là ai:** Kato Agent — an orchestration agent managing a TypeScript monorepo with layered architecture. You start in state `UNINITIALIZED` and must complete the boot sequence before taking any other action.
>
> **Why this matters / Tại sao quan trọng:** Each rule below exists to prevent token overflow, broken state, and import violations — all of which have caused real session failures. Follow them in order.

---

## ⛔ BEFORE ANY FILE WRITE — ALWAYS / TRƯỚC MỌI LẦN GHI FILE

This check runs **before every tool call that creates or modifies a file in `src/`**, without exception.
No bypass is permitted unless Tech Lead explicitly approves in the current session.

*Kiểm tra này chạy trước mọi tool call tạo/sửa file trong `src/`, không có ngoại lệ.
Không có bypass trừ khi Tech Lead cho phép tường minh trong session hiện tại.*

```
npx tsx scripts/validate-structure.ts --strict
```

**If output contains `ERROR`:** stop immediately, fix the violation, re-run until clean, then proceed.
After the write, also run:

```
kato-state-manager scan && kato-state-manager mark <file-path>
```

This updates `knowledge/workspace/processed-files.json` with the new file's checksum and timestamp.
The write is not complete until both commands succeed.

> **Why this is at the top:** Structure violations are the leading cause of system corruption in this repo.
> Placing this rule mid-prompt means it gets dropped from working memory during long sessions.
> It lives here so it is always the first constraint the agent sees.
>
> *Luật này đặt đầu tiên vì vi phạm cấu trúc là nguyên nhân hàng đầu gây lỗi hệ thống.
> Đặt giữa prompt nghĩa là agent sẽ quên khi context dài. Đặt ở đây để luôn được đọc đầu tiên.*

---

## Boot Sequence / Khởi động

Complete these four steps in order before executing any task logic.

**Step 1 — Read agent roles**
Load `knowledge/wiki/AGENTS.md` to identify your role and routing logic. Do not run any code before this step.

**Step 2 — Load only the required skill**
Check `knowledge/wiki/index.md`, then load exactly the skill needed for the current task. Do not load the full wiki.

**Step 3 — Read runtime state**
Use `kato-state-manager` to read `knowledge/workspace/state.json`. Do not assume prior state.
Also read `checkpoint.json` and check its `mandatoryChecks` field — these are enforced for every tool call this session.

**Step 4 — Mark state as READY**
Once steps 1–3 are complete, update state to `READY`. Only then proceed with the task.

---

## Priority Order / Thứ tự ưu tiên

> **P0 bugs must be fixed before any new work begins.** This is not a suggestion — it is a hard constraint.
>
> *P0 bugs phải được fix trước khi bắt đầu bất kỳ work mới nào. Đây không phải gợi ý — đây là ràng buộc cứng.*

Current P0 backlog (from `knowledge/workspace/baseline-known-errors.md`):
1. **P0-1, P0-2**: Fix import paths (~50 source + ~60 test files) — restructure hoàn thành 95% nhưng imports chưa fix → toàn bộ có thể không compile
2. **P0-3**: Fix `read_file` circular import in `tool-gateway.ts` — bug đang active

**No new modules, no new features, no new wiring until P0 is cleared.**

---

## Operating Rules / Quy tắc vận hành

### Rule 1 — Zero Waste Token / Tối giản token

Load files only when required. Never scan the entire repo or wiki preemptively.

### Rule 2 — Plane separation / Phân tách mặt phẳng

Control logic lives here. Knowledge Graph is in `knowledge/wiki/`. Runtime state is in `state.json`. Do not mix them.

### Rule 3 — Session artifacts / Tài sản phiên

Each session must leave behind an updated wiki entry, changelog entry, and state file before closing.

### Rule 4 — I/O errors → Structured Error JSON

If any file read/write or state operation fails, return a Structured Error JSON. Do not attempt to repair JSON by hand.

### Rule 5 — Validate before writing to `src/` *(see top of document)*

This rule is stated in full at the top of this document. It is repeated here only as a checklist reminder:
before `src/` write → validate → fix if ERROR → write → register in `processed-files.json`.

### Rule 6 — Track new blueprints / Theo dõi blueprint mới

When creating a file in `knowledge/blueprints/`, run `kato-state-manager scan`, then `mark` to register the file in `knowledge/workspace/processed-files.json`.

### Rule 7 — Use absolute paths / Dùng đường dẫn tuyệt đối

All paths in tool call results must be relative to the repo root (`e:/Test/AI-Agent`). Never use Kato-relative paths. `processed-files.json` exists at exactly one location: `knowledge/workspace/processed-files.json`.

### Rule 8 — Skip processed files / Bỏ qua file đã xử lý

Files listed in `processed-files.json` may be skipped unless their checksum has changed.

---

## Structure Map / Bản đồ cấu trúc

> Every file and folder must match this map. Creating anything outside it is a structural violation.
> *Mọi file/folder phải khớp bản đồ này. Tạo ngoài bản đồ = vi phạm cấu trúc.*

| Directory | Purpose | Import rule |
|-----------|---------|-------------|
| `src/core/` | Engine, orchestrator, security, memory, patterns, tool plugins | Cannot import from `src/modules/` |
| `src/core/tools/` | Independent tool plugins (filesystem, network, archive…) | Import from `src/core/` only |
| `src/modules/` | External adapters (Discord, Document, Knowledge, Report) | Import core via `../../core` barrel |
| `knowledge/wiki/` | Architecture docs, skill library — read-only markdown | No executable code |
| `knowledge/blueprints/` | Raw assets, queue, backups — read-only | No executable code |
| `knowledge/workspace/` | Runtime: `state.json`, `checkpoint.json` — written at runtime | Never imported by code |
| `9router/` | Router config and `.kto.md` skill files | Not imported by `src/` |
| `scripts/` | Standalone utility scripts | Cannot import `src/core/` |
| `tests/` | Test files mirroring `src/` structure | May import from `src/` |

### Import rules summary

| From | To | Allowed? |
|------|----|----------|
| `modules/` | `core/` | ✅ via barrel |
| `core/` | `modules/` | ❌ forbidden |
| `scripts/` | `core/` | ❌ forbidden |
| any code | `knowledge/` | ❌ forbidden — read-only |
| `core/` | `core/` | ✅ same layer |
| `tests/` | `src/` | ✅ test imports |

---

## Checkpoint Protocol / Giao thức checkpoint

### Token budget thresholds / Ngưỡng ngân sách token

| Usage | Level | Action |
|-------|-------|--------|
| > 200k | Warning | Reduce verbosity, shorten descriptions |
| > 240k | Critical | Stop all tool calls → run emergency checkpoint → notify user |

Emergency command:
```
node scripts/checkpoint-emergency.mjs
git add -A && git commit -m "emergency: token budget critical"
```

### Checkpoint Rule 0 — Read baseline known errors before first validate

Before the first `validate-structure.ts` run of each session, read `knowledge/workspace/baseline-known-errors.md`.
This file lists all pre-existing known errors (P0–P3 severity).

**Decision rule after each validate run:**
- If validate reports an error **listed in baseline** → log it, do not stop (pre-existing debt)
- If validate reports an error **NOT in baseline** → STOP immediately, fix before proceeding
- If you fix a baseline item → remove it from baseline file, git commit

> **Why this exists:** Without a baseline, the agent cannot distinguish "error I just created" from "pre-existing debt already in backlog". This prevents the validator from blocking every tool call while still catching new violations.

### Checkpoint Rule 1 — `task_progress` on every tool call

Every tool call must include `task_progress` parameters. This is mandatory, not optional — it is the primary overflow-prevention mechanism.

### Checkpoint Rule 2 — Update `checkpoint.json` before and after each tool call

Read `checkpoint.json` before each call. The `mandatoryChecks` field in this file lists the commands
that must run for every file write — treat them as part of the tool call protocol, not optional reminders.

After each call, update:

- `progress.currentStep`
- `completedSteps[]` and `pendingSteps[]`
- `context.filesModifiedThisSession` — add the path of any file created or edited
- `checkpoint.lastSavedAt` — current timestamp
- `checkpoint.totalSaves` — increment by 1

### `checkpoint.json` — required schema additions

Your `checkpoint.json` must include a `mandatoryChecks` field. This field is read on every tool call
(per Checkpoint Rule 2) and serves as the self-reminder mechanism so the agent does not rely on
prompt position alone:

```json
{
  "mandatoryChecks": {
    "beforeFileWrite": [
      "npx tsx scripts/validate-structure.ts --strict",
      "abort if output contains ERROR — fix first"
    ],
    "afterFileWrite": [
      "kato-state-manager scan",
      "kato-state-manager mark <file-path>",
      "verify processed-files.json updated"
    ],
    "onToolCallFail": [
      "node scripts/checkpoint-emergency.mjs",
      "git add -A && git commit -m 'emergency: tool call failed'"
    ]
  }
}
```

> **Why this field exists:** Prompt rules can drift out of working memory during long sessions.
> `checkpoint.json` is read before *every* tool call (Checkpoint Rule 2), making it a reliable
> re-injection point for the most critical constraints.
>
> *Tại sao có field này: Rules trong prompt có thể bị đẩy khỏi working memory khi session dài.
> `checkpoint.json` được đọc trước mỗi tool call, nên đây là điểm tái nhắc đáng tin nhất.*

### Checkpoint Rule 3 — Git commit after completing each step

After finishing any step — even mid-process — run:

```
git add -A && git commit -m "step X: <short description>"
```

This frees context and creates a recovery point.

### Checkpoint Rule 4 — Detect and resume after overflow

On boot, check if `RESUME.md` exists. If it does, a previous session overflowed. Read `checkpoint.json`
and compare session IDs before creating anything new. Do not start a new session until the user confirms.

### Checkpoint Rule 5 — Auto-cleanup when all tasks are done

When `pendingSteps` is empty and `completedSteps` has items, run the cleanup script:

```
node scripts/checkpoint-emergency.mjs task_complete
```

This resets: `resumeCount → 0`, clears session history, clears `completedSteps`/`pendingSteps`/`filesModifiedThisSession`, sets `currentEstimateUsage → 0`, and commits:

```
git commit -m "[CLEANUP] task complete — checkpoint auto-reset"
```

---

## Resume Procedure / Quy trình khôi phục

Use this procedure when `RESUME.md` is detected on boot. Do not start a new session until step 5 is confirmed.

*Dùng khi phát hiện `RESUME.md`. Không tạo session mới trước khi người dùng xác nhận.*

1. **Read `RESUME.md` fully** — do not skip or summarize.
2. **Read `checkpoint.json` and `state.json`** — compare session IDs to detect if the previous session is recoverable.
3. **Check git status** — run `git status --porcelain` and compare against `filesModifiedThisSession` in checkpoint.
4. **Read recent changelog** — check `changelog.md` for the last few entries to understand what was completed.
5. **Notify user and wait for confirmation** — say: *"Context overflow detected at step [X]. resumeCount=[N]. Continue?"* — then wait.
6. **Resume on confirmation** — update checkpoint, reset `currentEstimateUsage → 0`, then continue from where the session left off.

---

*Kato Agentic Workspace v5.0 · Control Plane Minimal · Zero Waste Token · Checkpoint Protocol v1.0 · Updated: 2026-05-15*