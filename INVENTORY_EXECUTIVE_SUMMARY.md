# EXECUTIVE SUMMARY — CORAL AGENT ISSUE INVENTORY
**Date:** 2026-09-16  
**Scope:** System-level architecture and runtime issues after locked work (B1, Completion Protocol v1.2, Architecture Review v1.2, Implementation Design, Phase 1-3, E3 investigation)  
**Classification:** Evidence-based, no re-audits, no code changes

---

## CURRENT STATE

**Build:** ✓ Passes (`npm run build`)  
**Tests:** 1202 pass, 2 fail, 5 skip out of 1209  
**Locked work:** 7 decisions finalized, all architectural direction set  
**Architecture:** Clean (Model B1), well-specified, ready for selective implementation  

---

## ISSUE SUMMARY BY CATEGORY

### CLOSED / LOCKED — 7 issues (DO NOT REOPEN)
All prior investigations conclusive. Decisions made and locked.

- **E3 semantic gap** — System lacks "task execution intent" abstraction. Root cause identified, solution layer known (PlanItem-level metadata). Reopening E3 logic is wrong path; correct path is Task/PlanItem design.
- **E3 plan finalization** — NOT a bug. Plan can remain non-terminal after E3 fires. E3 is stall detector, not finalizer. Protocol-manager (already designed) handles finalization.
- **Model B1 entity contract** — LOCKED. Plan/Execution/Checkpoint cleanly separated. Design complete, implementation gated on BUG-001 fix.
- **Plan loading on restart** — Design complete (MODEL_B1_IMPLEMENTATION_DESIGN.md §4.3), implementation required (BUG-002).
- **Completion Protocol v1.2** — RESOLVED. All 16 tests pass (phases 1-3).
- **R6 fixture userId** — Design complete, implementation pending (test-only, low-risk patch).
- **Checkpoint recovery annotation** — RESOLVED. Annotation-only path correct per design. True recovery is Plan continuation.

### CONFIRMED OPEN BUGS — 4 issues (BLOCKING)

| Bug | Severity | Evidence | Fix Available? | Time Est. |
|-----|----------|----------|---|---|
| **BUG-001: Checkpoint identity mismatch** | CRITICAL | engine.ts:806-809 guard skips start() but engine.ts:1040 passes new taskId → checkpoint writes silent no-op. Fix C guard inconsistency. Root cause traced in ARCHITECTURE_DECISION_PLAN_EXECUTION_CHECKPOINT.md §5. Test fails: model-b1-phase1.test.ts:35 expects throw, gets silent return. | YES — MODEL_B1_IMPLEMENTATION_DESIGN.md §10.2 specifies exact contract | 1-2 hrs |
| **BUG-002: getPlan() skips terminal snapshots** | HIGH | checkpoint.ts:290-292 uses getLatestForSession (non-terminal only). If latest snapshot is terminal, getPlan returns null. Design specifies search ALL snapshots (MODEL_B1_IMPLEMENTATION_DESIGN.md §4.3). No test coverage. | YES — design provided, implementation needed | 2-3 hrs |
| **BUG-003: R6 test fixture missing userId** | MEDIUM | consequence-store.ts:153 guard requires userId. Tests don't provide it. Fixture contract: makeRecord() must add userId:'test-user'. R6_FROZEN_SPECIFICATION.md §SECTION A specifies exact fix. | YES — one-line per test file | 30 mins |
| **BUG-004: model-b1-phase1.test.ts fails** | MEDIUM | checkpoint.cycle() does not throw on unknown requestId (should throw per MODEL_B1_IMPLEMENTATION_DESIGN.md §10.2). Root cause: BUG-001. Fixes automatically when BUG-001 patched. | YES — via BUG-001 fix | 0 hrs (auto-fixed) |

### DESIGN GAPS — 3 issues (AFFECTING E3 IMPROVEMENT, NOT BASELINE)

| Gap | Severity | Description | Blocker? | Reopen? |
|-----|----------|---|---|---|
| **GAP-001: Task execution intent abstraction** | HIGH | System cannot distinguish "PlanItem requires external data" from "text analysis completes it". Missing: task_execution_mode field. Affects E3 stall detection correctness. | NO — baseline works without this | YES — needed for E3 improvement |
| **GAP-002: Model action claim vs execution tracking** | MEDIUM | No explicit representation of "model claimed X" vs "model executed X". Affects recovery heuristics and E3 logic. | NO | UNCERTAIN |
| **GAP-003: Task completion criterion at request time** | MEDIUM | Request-time "what counts as done" not formalized. Only item-level criteria exist. Affects task type determination. | NO | UNCERTAIN |

### UNKNOWN / NEEDS VERIFICATION — 4 issues (LOW IMPACT)

| Issue | Impact | Evidence Gap | Action |
|-------|--------|---|---|
| **UNK-001: AC8 memory crash test** | LOW | Test blocked on missing helper file (tests/consequence-restart-helper.ts). | Create file or skip test |
| **UNK-002: Missing test files** | LOW | continuity-blockers.test.ts and process-subprocess.test.ts import non-existent modules (project-index, process). | Verify if features intended or tests outdated |
| **UNK-003: Plan recovery after restart** | MEDIUM | No integration test validates "message after restart → plan loads → continues on next item". Needs verification once BUG-002 fixed. | Add integration test post-BUG-002 |
| **UNK-004: EvidenceLog ephemeral-per-execution** | LOW | Design states EvidenceLog lost on restart (correct). Not tested. | Add verification test |

---

## RECOMMENDED EXECUTION PATH

### Phase 1: Critical Fix (1-2 days)
**BUG-001 — Checkpoint Identity Mismatch**
- Remove engine.ts:806-809 guard
- Convert checkpoint.ts silent returns to throws (lines 191, 281, 302, 355, 377, 396)
- Verify model-b1-phase1.test.ts passes
- Fixes BUG-004 automatically

### Phase 2: High-Priority (2-3 days)
**BUG-002 — getPlan() Terminal Snapshot Search**
- Implement getPlan(sessionId) to search ALL snapshots (design provided)
- Add integration test: create plan → complete item 0 → restart → verify plan loads, currentItemIndex=1
- Verify plan recovery semantics (UNK-003)

### Phase 3: Low-Risk Patch (30 mins)
**BUG-003 — R6 Fixture userId**
- Add userId:'test-user' to makeRecord() in both test files
- Run npm test to verify

### Phase 4: Artifact Cleanup (as-needed)
**UNK-001, UNK-002** — Create missing test files or skip/remove outdated tests

### Phase 5: Design Gates (Separate decision track)
**GAP-001, GAP-002, GAP-003** — Architectural decisions for E3 improvement. Do NOT block baseline completion. Schedule after Phase 1-3.

---

## WHY THIS INVENTORY MATTERS

**What changed from prior audits:**
- Prior work repeatedly reopened E3, Plan recovery, identity issues because root causes weren't traced to specific code lines
- This inventory locks those decisions with concrete evidence: specific commit, exact line numbers, file paths
- Issues are now classified (bug vs gap vs unknown), not subjective
- Fixes have designs ready (not "think about it later")

**What remains stable:**
- Model B1 architecture is correct and complete
- All locked decisions (E3, protocol, entity model) are final
- No need to reopen prior investigations

**Preventing future cycles:**
- BUG-001 has a SPECIFIC fix (remove lines 806-809, throw at lines 191/281/302/355/377/396)
- BUG-002 has DESIGN + CODE PROVIDED (MODEL_B1_IMPLEMENTATION_DESIGN.md §4.3)
- Bugs are not hypotheses — they have line numbers and test failures
- Design gaps are NAMED (task-execution-intent, action-tracking, request-time-criterion)

---

## EVIDENCE LOCATION

Full details in: `D:/AI-Agent/SYSTEM_LEVEL_ISSUE_INVENTORY.md`

Source documents (all locked):
- MODEL_B1_IMPLEMENTATION_DESIGN.md (entity contract, checkpoint write contract)
- MODEL_B1_FINAL_PRE_IMPLEMENTATION_GATE.md (root cause analysis)
- docs/historical/E3_COMPLETE_SYSTEM_STATE_AUDIT_FINAL.md (E3 design gaps)
- ARCHITECTURE_DECISION_PLAN_EXECUTION_CHECKPOINT.md (identity mismatch mechanism)
- R6_FROZEN_SPECIFICATION.md (fixture contract)
- completion-protocol-phase1/2/3.test.ts (verified contracts)

---

## NEXT DECISION GATE

**Proceed with Phase 1 (BUG-001 fix)?**

Evidence: ✓ Design complete, ✓ Test ready (will pass after fix), ✓ Root cause understood, ✓ No design decisions needed, ✓ Low risk (only checkpoint write calls change)

**Recommendation:** GO — fix BUG-001, verify test passes (1-2 hours), then proceed to BUG-002.
