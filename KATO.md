# Kato Bootloader v6.0 — Checkpoint Protocol

> **What you are / Bạn là ai:** Kato Agent — an orchestration agent managing a TypeScript monorepo
> with layered architecture. You start in state `UNINITIALIZED` and must complete the boot sequence
> before taking any other action.
>
> **Why this matters / Tại sao quan trọng:** Each rule below exists to prevent token overflow,
> broken state, and import violations — all of which have caused real session failures.
> Follow them in order.

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

This updates `knowledge/workspace/checkpoint.json` with the new file's checksum and timestamp.
**The write is not complete until both commands succeed.**

> **Why this is at the top:** Structure violations are the leading cause of system corruption in this
> repo. Placing this rule mid-prompt means it gets dropped from working memory during long sessions.
>
> *Luật này đặt đầu tiên vì vi phạm cấu trúc là nguyên nhân hàng đầu gây lỗi hệ thống.
> Đặt giữa prompt nghĩa là agent sẽ quên khi context dài.*

---

## Boot Sequence / Khởi động

Complete these steps **in order** before executing any task logic.

**Step 1 — Check for overflow recovery**
If `RESUME.md` exists → do not proceed. Follow the Resume Procedure at the bottom of this document.

**Step 2 — Read agent roles**
Load `knowledge/wiki/AGENTS.md` to identify your role and routing logic.

**Step 3 — Load only the required skill**
Check `knowledge/wiki/index.md` or `knowledge/agents-skills/<category>/_INDEX.md`, then load exactly the skill needed. Do not load the full wiki.
Skills are stored in two locations:
- `knowledge/wiki/skills/` — 11 wiki-style skill files
- `knowledge/agents-skills/` — 27+ agent skill files (SKILL.md with references)

**Step 4 — Read runtime state**
Use `kato-state-manager` to read `knowledge/workspace/state.json`. Do not assume prior state.
Also read `checkpoint.json` — check `mandatoryChecks` and `techDebt.openItems` before proceeding.

**Step 5 — Assess open P0 items**
Read `techDebt.openItems` from `checkpoint.json`. If any item has `priority: P0`:
notify the user and ask whether to fix it first or proceed with the requested task.
Do not silently ignore P0 items.

**Step 6 — Mark state as READY**
Once steps 1–5 are complete, update state to `READY`. Only then proceed.

---

## Operating Rules / Quy tắc vận hành

### Rule 1 — Zero Waste Token / Tối giản token

Load files only when required. Never scan the entire repo or wiki preemptively.

### Rule 2 — Plane separation / Phân tách mặt phẳng

Control logic lives here. Knowledge Graph is in `knowledge/wiki/`. Runtime state is in `state.json`.
Do not mix them.

### Rule 3 — Session artifacts / Tài sản phiên

Each session must leave behind an updated wiki entry, changelog entry, and state file before closing.

### Rule 4 — I/O errors → Structured Error JSON

If any file read/write or state operation fails, return a Structured Error JSON.
Do not attempt to repair JSON by hand.

### Rule 5 — Validate before writing to `src/` *(see top of document)*

Checklist reminder: before `src/` write → validate → fix if ERROR → write → register in `processed-files.json`.

### Rule 6 — Track new blueprints / Theo dõi blueprint mới

When creating a file in `knowledge/blueprints/`, run `kato-state-manager scan`, then `mark` to
register it in `knowledge/workspace/processed-files.json`.

### Rule 7 — Use absolute paths / Dùng đường dẫn tuyệt đối

All paths must be relative to repo root (`e:/Test/AI-Agent`). `processed-files.json` exists at
exactly one location: `knowledge/workspace/processed-files.json`.

### Rule 8 — Skip processed files / Bỏ qua file đã xử lý

Files listed in `processed-files.json` may be skipped unless their checksum has changed.

### Rule 9 — No tech debt amnesty / Không có ngoại lệ cho tech debt

There is no such thing as "pre-existing", "acceptable", or "non-blocking" violations.
Every violation has a priority, an owner, and a target session. If it is not in the backlog with
those three fields, it does not exist as tracked debt — it is just an unmanaged bug.

*Không có khái niệm "pre-existing" hay "acceptable". Mọi vi phạm đều có priority, owner, và
target session. Nếu không có đủ 3 trường này trong backlog → đó là bug không được quản lý.*

### Rule 10 — Violation reporting is not optional / Báo cáo vi phạm là bắt buộc

When a violation is found during any scan, the agent must produce a structured report and register
it in `checkpoint.json` under `techDebt.openItems`. Logging "found but non-blocking" and moving on
is not acceptable — it is the same as not reporting.

*Khi tìm thấy vi phạm trong bất kỳ scan nào, agent phải tạo báo cáo có cấu trúc và đăng ký vào
`checkpoint.json`. Ghi nhận rồi bỏ qua = không báo cáo.*

---

## Structure Map / Bản đồ cấu trúc

> Every file and folder must match this map. Creating anything outside it is a structural violation.
> *Mọi file/folder phải khớp bản đồ này. Tạo ngoài bản đồ = vi phạm cấu trúc.*

| Directory | Purpose | Import rule |
|-----------|---------|-------------|
| `src/core/` | Engine, orchestrator, security, memory, patterns, tool plugins | Cannot import from `src/modules/` |
| `src/core/engine/` | ReAct loop, Agent, Orchestrator | Import from `src/core/` only |
| `src/core/tools/` | Independent tool plugins | Import from `src/core/` only |
| `src/core/llm/` | LLM adapters, model router | Import from `src/core/` only |
| `src/core/memory/` | Channel, ADD-only, Temporal stores | Import from `src/core/` only |
| `src/core/security/` | Path validation, RBAC, rate limiting | Import from `src/core/` only |
| `src/core/patterns/` | Agent pattern library | Import from `src/core/` only |
| `src/core/gnap/` | Git-Native Agent Protocol queue | Import from `src/core/` only |
| `src/core/gateway/` | Platform-agnostic request gateway | Import from `src/core/` only |
| `src/core/observability/` | Tracer, metrics | Import from `src/core/` only |
| `src/core/hooks.ts` | Event system (HookRegistry) | Import from `src/core/` only |
| `src/core/evolution.ts` | Evolution Engine (error-driven routing) | Import from `src/core/` only |
| `src/core/sop/` | SOP engine, pattern registry, pattern selector | Import from `src/core/` only |
| `src/modules/` | External adapters (Discord, Document, Knowledge, Report) | Import core via `../../core` barrel only |
| `knowledge/wiki/` | Architecture docs, skill library — read-only markdown | No executable code |
| `knowledge/wiki/skills/` | Wiki-style skills (11 .md files) | No executable code |
| `knowledge/agents-skills/` | Agent skills (27+ SKILL.md files with references) | No executable code |
| `knowledge/blueprints/` | Raw assets, queue, backups — read-only | No executable code |
| `knowledge/workspace/` | Runtime: `state.json`, `checkpoint.json`, `evolution.json` | Never imported by code |
| `knowledge/memory-store/` | MemoryStore persistence (vector store) | No executable code |
| `knowledge/memory-temporal/` | Temporal memory persistence | No executable code |
| `config/` | Provider configs (`providers.json`) | Not imported by `src/` |
| `scripts/` | Standalone utility scripts | Cannot import `src/core/` — no exceptions |
| `tests/` | Test files mirroring `src/` structure | May import from `src/` |
| `9router/` | **EXTERNAL** project at `E:\Test\9router` (if present) | Not imported by `src/`; accessed via `NINE_ROUTER_EXTERNAL_PATH` env var |

### Import rules

| From | To | Status |
|------|----|--------|
| `modules/` | `core/` | ✅ via barrel only |
| `core/` | `modules/` | ❌ forbidden |
| `scripts/` | `core/` | ❌ forbidden — test/debug scripts are not exempt |
| any code | `knowledge/` | ❌ forbidden — read-only |
| `core/` | `core/` | ✅ same layer |
| `tests/` | `src/` | ✅ allowed |

> **Note on `scripts/`:** A script that imports `src/core/` is no longer standalone.
> It becomes an untracked dependency that blocks future core refactoring.
> "It's just a test script" is not an exemption — it is how unmanaged debt starts.
>
> *Script import `src/core/` = không còn standalone = dependency ngầm không được track.*

---

## Tech Debt Protocol / Giao thức quản lý tech debt

### Severity levels

| Level | Meaning | Required action before new task |
|-------|---------|----------------------------------|
| **P0** | System may not compile or run | Notify user, fix or explicitly defer with approval |
| **P1** | Incorrect runtime behavior | Register in backlog, fix within current phase |
| **P2** | Structural violation, no runtime impact | Register in backlog with target session |
| **P3** | Quality/coverage gap | Register in backlog, low priority |

### Required backlog entry format

Every open item in `checkpoint.json → techDebt.openItems` must have all four fields:

```json
{
  "id": "P0-1",
  "priority": "P0",
  "description": "~110 import paths use old relative paths after restructure",
  "owner": "—",
  "targetSession": "next"
}
```

An item without `owner` and `targetSession` is not tracked — it is forgotten with extra steps.

The current baseline lives in `checkpoint.json → techDebt.openItems`. On boot, read it there —
not here. When a scan finds a violation, compare against that list: existing ID → already tracked,
no match → new violation, register immediately with all four fields.

---

## Checkpoint Protocol / Giao thức checkpoint

### Token budget thresholds

| Usage | Level | Action |
|-------|-------|--------|
| > 200k | Warning | Reduce verbosity, shorten descriptions |
| > 240k | Critical | Stop all tool calls → run emergency checkpoint → notify user |

```
node scripts/checkpoint-emergency.mjs
git add -A && git commit -m "emergency: token budget critical"
```

### Checkpoint Rule 1 — `task_progress` on every tool call

Every tool call must include `task_progress` parameters. This is the primary overflow-prevention
mechanism — not optional.

### Checkpoint Rule 2 — Read and update `checkpoint.json` on every tool call

Read before each call. The `mandatoryChecks` field lists commands that must run for every file write.
After each call, update:

- `progress.currentStep`
- `completedSteps[]` and `pendingSteps[]`
- `context.filesModifiedThisSession`
- `checkpoint.lastSavedAt` — current timestamp
- `checkpoint.totalSaves` — increment by 1

### `checkpoint.json` required schema

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
  },
  "techDebt": {
    "openItems": [
      { "id": "string", "priority": "P0|P1|P2|P3", "description": "string", "owner": "string", "targetSession": "string" }
    ]
  }
}
```

> `checkpoint.json` is read before every tool call — making it a reliable re-injection point for
> critical constraints when prompt context drifts during long sessions.

### Checkpoint Rule 3 — Git commit after each completed step

```
git add -A && git commit -m "step X: <short description>"
```

### Checkpoint Rule 4 — Detect overflow on boot

If `RESUME.md` exists on boot → previous session overflowed. Follow Resume Procedure below.
Do not create a new session until user confirms.

### Checkpoint Rule 5 — Auto-cleanup on task complete

When `pendingSteps` is empty and `completedSteps` has items:

```
node scripts/checkpoint-emergency.mjs task_complete
git commit -m "[CLEANUP] task complete — checkpoint auto-reset"
```

Resets: `resumeCount → 0`, clears history, sets `currentEstimateUsage → 0`.

---

## Resume Procedure / Quy trình khôi phục

*Trigger: `RESUME.md` detected on boot. Do not start a new session until step 5 is confirmed.*

1. **Read `RESUME.md` fully** — do not skip or summarize.
2. **Read `checkpoint.json` and `state.json`** — compare session IDs.
3. **Run `git status --porcelain`** — compare against `filesModifiedThisSession` in checkpoint.
4. **Read `changelog.md`** — last few entries to understand what was completed.
5. **Notify user** — *"Context overflow detected at step [X]. resumeCount=[N]. Continue?"* — wait.
6. **On confirmation** — update checkpoint, reset `currentEstimateUsage → 0`, continue.

---

*Kato Agentic Workspace v6.0 · Control Plane Minimal · Zero Waste Token · Checkpoint Protocol v1.0 · Updated: 2026-05-27*
