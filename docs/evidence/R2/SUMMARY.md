# R2 — Recovery / Resume
## SUMMARY

**Status: VERIFIED**

### Implementation
- **Phase A (commit 66f532bf)**: Atomic checkpoint writes, crash-handler, boot recovery, TaskQueue interrupted policy
- **Phase B (commit b4efb9c6)**: Crash-injection evidence (12/12 PASS)

### Tests: Real Process Execution
```
S1: Crash Recovery (§A)
  ✓ s1.exit-code-1
  ✓ s1.checkpoint-flushed-before-exit (file=cp-req-s1-*.json)
  ✓ s1.flushed-json-valid(atomic)
  ✓ s1.toolStatus-completed+running-preserved

S3: Checkpoint Resume + Fix C (§B/§D)
  ✓ s3.restart-loads-checkpoint-no-crash
  ✓ s3.active-task-reused-not-duplicated(Fix-C) [active=req-s1]
  ✓ s3.recovery-annotation-applied
  ✓ s3.recovery-persisted-in-memory-state

S4: Interrupted Task Recovery (§C)
  ✓ s4.partial-completion→interrupted(NOT auto-requeued) [provenCompleted=1]
  ✓ s4.no-silent-full-rerun
  ✓ s4.progress-message-explicit

S4-control: Legacy Requeue (no proof)
  ✓ s4ctrl.no-proof→legacy-requeued

TOTAL: 12/12 PASS
```

### Evidence Artifacts
- `crash-injection-results-final.txt`: Raw execution output, dates, Node.js version, git HEAD
- `artifacts/s1-flushed-checkpoint.json`: Real checkpoint file flushed before crash handler exit
- `artifacts/s3-restart.out`, `s4-*.out`: Child process outputs
- `WORKLOG.md`: Implementation notes, precondition audit, Phase A/B summary

### Acceptance Criteria Met

**A. Crash Recovery**
- Global crash handler installs `uncaughtException`/`unhandledRejection` → `flushSync()` → `exit(1)`
- Checkpoint in-memory dirty state flushed before process death (§A evidence: s1 file written despite crash)
- Wire at both entrypoints (start-telegram.ts, start-telegram-lite.ts)
- Limitation documented: SIGKILL/power-loss/handler-throws not guaranteed

**B. Checkpoint Resume**
- `getProvenCompletedToolIds()`: tool proven complete only if cycle recorded it `completed`
- `markRecovered()`: annotation idempotent, memory-state visible after init
- Boot recovery: in-progress tasks marked + recovery annotation applied
- Fix C respected: no duplicate checkpoint for task resume (active-task mapping reused)
- Semantics: completed = never re-execute; running/pending = may re-execute if task resumes

**C. Interrupted Task Recovery**
- Background task status 'running' at restart + proven-completed tools → status 'interrupted'
- Progress message explicit: "Interrupted by unexpected shutdown...NOT auto-requeued"
- No proven completion → legacy requeue behavior preserved (full task rerun)
- `listActiveTasks()` includes 'interrupted' status

**D. Restart Consistency**
- Recovery code does not duplicate execution (proven-completed gate)
- No giả định subprocess cũ tồn tại (in-memory limitation documented)

### Limitations Documented
- Orphan subprocess reconciliation: OUT OF SCOPE (in-memory process tracking is R1-F baseline)
- Exactly-once for external side effects: NOT guaranteed (partial recovery semantics only)
- Graceful resource cleanup: NOT included (best-effort checkpoint flush only)

### Build Status
- `npm run build` → exit 0 (0 new errors introduced)
- Production dist artifacts used for all tests (no mocks)

### Note on Test Harness
- `scripts/r2-crash-child.mjs`: Scenarios using getCheckpoint() singleton + cwd-based default dirs
- `scripts/r2-run-crash-matrix.sh`: Orchestrates 4 scenario groups, assertions on exit codes + child output
- Fixtures use temp directories; cleanup automatic after each run

---
**Date:** 2026-08-26  
**git HEAD:** b4efb9c6 (R2 Phase B committed)  
**Node.js:** v24.15.0
