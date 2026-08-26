# R1-F.2 Evidence Summary — Advanced Process Management Features

**Date:** 2026-08-25
**Status:** VERIFIED
**Scope implemented (exactly the agreed spec, nothing more):**

1. **Mechanism 1 — Signal control:** `process_kill` accepts optional
   `signal: 'SIGTERM' | 'SIGKILL'`. Default stays SIGTERM (regression-tested).
2. **Mechanism 2 — Windows tree kill (separate mechanism):**
   `process_kill({ session_id, tree: true })` → `taskkill /F /T /PID`.
3. **Extended timeout ladder:** any first-stage SIGTERM (manual kill,
   AbortSignal, start-timeout) → 5 s grace (`KILL_GRACE_PERIOD_MS`) →
   escalation (win32: `taskkill /F /T`; posix: SIGKILL).
4. **Windows SIGTERM/SIGKILL behavior mapping documented** — see
   [windows-signal-mapping.md](./windows-signal-mapping.md) and the header
   comment block in `src/core/tools/process.ts`.

Out of scope (not implemented): resource monitoring, session persistence /
cross-invocation state, POSIX tree kill.

## Implementation

- File: `src/core/tools/process.ts` (uncommitted working tree on top of R1-F.1)
- New exports: `KILL_GRACE_PERIOD_MS = 5000`, `treeKillWin32()`,
  `scheduleKillEscalation()` (the latter exported for real-process testing of
  the production timer body — evidence T7).
- Build: `npm run build` (npx tsc). `dist/core/tools/process.js` emitted fresh.
  Pre-existing unrelated build errors remain in
  `src/platform/telegram/message-handler.ts` (known separate issue; not touched).

## Test evidence

Runner: [r1-f2.test.cjs](./r1-f2.test.cjs) against the REAL built module with
REAL OS processes. Liveness oracle = `tasklist /FI "PID eq N"` — never mocked.
Every test enforces pre-kill aliveness as a precondition (guards against
spurious passes from early process death — this actually caught two false
positives during development, T6/T8 first run).

| # | Test | What it proves |
|---|---|---|
| T1 | default-signal-regression | No `signal` arg ⇒ response `signal:'SIGTERM'`, grace armed, direct child dead at OS level |
| T2 | explicit-SIGKILL | `signal:'SIGKILL'` honored, no grace |
| T3 | invalid-signal-rejected | Unknown signal ⇒ error, process verified STILL ALIVE after rejection |
| T4 | tree-kill-parent-and-child-gone | cmd.exe root PID AND node worker PID both confirmed gone from tasklist |
| T5 | no-tree-gap-child-survives | Without `tree`, parent dies but worker survives ⇒ mechanisms are genuinely separate; gap documented |
| T6 | timeout-full-flow | start timeout=800 ms fires on schedule (death measured from process start), tracking cleaned up |
| T7 | escalation-branch-real-os | Production 5 s grace timer escalates and force-kills a REAL live `ping` via taskkill /F /T; stub records `lastSignal='SIGKILL'` |
| T8 | win32-signal-mapping-empirical | SIGTERM vs SIGKILL death timing indistinguishable (both ≤1500 ms) ⇒ mapping table claim |

**Result: 8/8 PASS**, reproduced in two consecutive runs, zero leaked
processes after harness cleanup.
Machine output: [results.json](./results.json) ·
[environment.json](./environment.json) · [git-info.json](./git-info.json)

## Source ↔ dist correspondence

[source-dist-correspondence.json](./source-dist-correspondence.json):
sha256 + mtimes for src (07:54:52Z) and dist (07:55:16Z); dist contains F.2
markers (taskkill ×10, grace 5000, named exports verified by require).

## Limitations

1. **win32 stage-1 physics:** because SIGTERM already hard-kills on Windows,
   the full ladder's observable behavior is "died at stage 1". The escalation
   branch is exercised for real via `scheduleKillEscalation` + live victim
   (T7), which is the strongest honest coverage available on this platform.
2. **POSIX tree kill not implemented** (documented fallback, returns
   `method:'direct-child-only'`). Spec scoped tree kill to Windows.
3. **Orphan window remains without `tree:true`:** callers that plain-kill a
   shell-wrapped command still orphan descendants BY DESIGN until they opt
   into Mechanism 2 (this is the documented gap T5 codifies, inherited from
   the R1-F.1 finding; changing the default was not in scope).
4. Cross-invocation session invisibility persists (in-memory Map design;
   explicitly out of scope per spec).

## Verdict

VERIFIED per the agreed 5-tier standard:
code inspection (Tier 1) + runtime behavioral tests with OS-level oracles and
assertions that decide PASS/FAIL (Tier 2+), persistent artifacts committed
under docs/evidence/R1-F2/.

## R1 roadmap status after F.2

All R1 requirements now have implementation + evidence. Two backlog items
remain open OUTSIDE R1-F.2 scope and are NOT closed by this work:

- **R1-D.1 evidence review:** D.1 is VERIFIED, but the reviewer has not yet
  inspected the evidence content directly.
- **Progress V1 Phase 6:** suspected create_plan hard-reject regression after
  merge b29614b1 — no root cause yet.
