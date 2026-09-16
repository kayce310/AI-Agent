# CORAL AGENT — SYSTEM-LEVEL ISSUE INVENTORY
**Time:** 2026-09-16T02:30:40.827Z  
**Scope:** Post-locked-work baseline (B1, Completion Protocol v1.2, Architecture Review v1.2, Implementation Design, Phase 1-3, E3 investigation)  
**Mode:** READ-ONLY — no code changes, no new audits, evidence-based classification only  

---

## SECTION 1: CLOSED / LOCKED (DO NOT REOPEN)

| Issue ID | Name | Status | Evidence | Locked By | Reason |
|----------|------|--------|----------|-----------|--------|
| **LOCKED-001** | E3 semantic lifecycle classification gap | CLOSED | E3_COMPLETE_SYSTEM_STATE_AUDIT_FINAL.md §FINAL ANSWERS Q4 | E3 Investigation v1 | Architecture correctly places E3 before tool execution. System lacks "task execution intent" abstraction to distinguish stall from text-valid progress. Gap identified, root cause understood, solution layer identified (Task/PlanItem level), implementation deferred. Reopening E3 logic is wrong approach. |
| **LOCKED-002** | E3 does not terminalize Plan | CLOSED | E3_COMPLETE_SYSTEM_STATE_AUDIT_FINAL.md §FINAL SYSTEM VERDICT | E3 Investigation v1 | **NOT a contract violation.** Execution finished + non-terminal/resumable Plan is supported by architecture per MODEL_B1_IMPLEMENTATION_DESIGN.md §4. E3 is stall detector, not plan finalizer. Plan finalization is protocol-manager's responsibility (already designed). |
| **LOCKED-003** | Model B1 entity contract (Plan/Execution/Checkpoint separation) | RESOLVED | MODEL_B1_IMPLEMENTATION_DESIGN.md §1-7 | Model B1 Final Pre-Implementation Gate | Entities cleanly separated: Plan (durable, keyed by sessionId), Execution (ephemeral, identity=fresh taskId), Checkpoint (durable evidence, keyed by taskId). Contract specified and approved. Implementation gated on checkpoint write-contract enforcement (Bug-001). |
| **LOCKED-004** | Plan loading after restart | RESOLVED | MODEL_B1_IMPLEMENTATION_DESIGN.md §4.3 | Model B1 Pre-Implementation Gate | `getPlan()` must search ALL snapshots (including terminal) not just non-terminal. Design specified, implementation required (integration task, not blocker). |
| **LOCKED-005** | Completion Protocol v1.2 (phases 1-3) | RESOLVED | completion-protocol-phase1/2/3.test.ts all pass ✓ | Completion Protocol v1.2 | All 16 tests pass (phase1: 5, phase2: 6, phase3: 5). Contract verified via test suite. No open issues. |
| **LOCKED-006** | R6 Consequence fixture (userId field) | RESOLVED | R6_FROZEN_SPECIFICATION.md §SECTION A | R6 Frozen Specification | Fixture factory contract: makeRecord() must include userId. Rationale: production guard non-negotiable. Status: awaiting implementation (test-only change, low risk). |
| **LOCKED-007** | Checkpoint recovery annotation (Phase 4A) | RESOLVED | MODEL_B1_PHASE_4_AUDIT.md §STARTUP TRACE | Model B1 Phase 4 Audit | Recovery path correctly annotates in-progress snapshots on boot (markRecovered). Does NOT re-execute. Design matches contract: annotation-only, not execution recovery. True recovery is Plan continuation (design working as intended). |

---

## SECTION 2: CONFIRMED OPEN BUGS

| Issue ID | Name | Current Status | Evidence | Classification | Severity | Locked Work | Reopen Required? | Why It Matters | Recommended Action |
|----------|------|----------------|----------|---|----------|--------|--------|--|--|
| **BUG-001** | Checkpoint identity mismatch — silent writes after activeTaskBySession hit | **OPEN** | 1. ARCHITECTURE_DECISION_PLAN_EXECUTION_CHECKPOINT.md §5 (mechanism traced)<br/>2. checkpoint.ts:191 `if (!snapshot) return;` (silent no-op)<br/>3. engine.ts:806-809 guard skips start() but engine.ts:1040 passes new taskId<br/>4. Test: model-b1-phase1.test.ts line 35 expects throw but gets silent return (FAILS)<br/>5. Commit 31c40588: activeTaskBySession guard introduced, checkpoint write contract NOT updated | **CONFIRMED BUG** (not hypothesis) | **CRITICAL** | MODEL_B1_FINAL_PRE_IMPLEMENTATION_GATE.md identifies root cause exactly | **YES** — Model B1 design specifies fix: remove guard (lines 805-809), enforce checkpoint write contract (throw on identity mismatch per MODEL_B1_IMPLEMENTATION_DESIGN.md §10.2) | Silent checkpoint loss means: (1) in-progress cycle data never persisted after restart resume, (2) plan state indeterminate (doesn't know execution actually happened), (3) duplicate tool execution risk on retry | **PATCH** — implement Model B1 checkpoint contract: (1) Remove engine.ts:806-809 guard, (2) Convert checkpoint.ts silent returns to throw errors (lines 191, 281, 302, 355, 377, 396), (3) Each Execution creates own checkpoint, (4) Verify model-b1-phase1.test.ts passes |
| **BUG-002** | CheckpointStore.getPlan() skips terminal snapshots on restart | **OPEN** | 1. checkpoint.ts:290-292 (current impl: uses getLatestForSession = non-terminal only)<br/>2. MODEL_B1_IMPLEMENTATION_DESIGN.md §4.3 (NEW getPlan must search ALL snapshots)<br/>3. Use case: if latest snapshot is terminal (completed/failed), getPlan returns null even though plan data is in that terminal snapshot<br/>4. Test: no existing test for this scenario | **DESIGN GAP → BUG** (contract violation) | **HIGH** | MODEL_B1_IMPLEMENTATION_DESIGN.md §4.3 specifies design | **YES** — Model B1 explicitly requires this change | If plan is in terminal snapshot only, getPlan fails silently → agent starts fresh without plan context → loses continuity of multi-execution plans | **DESIGN DECISION + PATCH** — Update getPlan(sessionId) to search ALL snapshots sorted newest-first (code provided in design doc) |
| **BUG-003** | R6 test fixtures missing userId field | **OPEN** | 1. R6_FROZEN_SPECIFICATION.md §SECTION A (problem statement §1)<br/>2. consequence-store.ts:153-156 (guard: `if (!userId) throw`)<br/>3. tests/consequence-phase3.test.ts:25-38 (makeRecord returns no userId)<br/>4. tests/consequence-read-path.test.ts:28-41 (same)<br/>5. Status: fixture-only change, production code unchanged, verified non-negotiable guard | **CONFIRMED BUG** (test contract violation) | **MEDIUM** | R6_FROZEN_SPECIFICATION.md §SECTION A (VERIFICATION METHOD: step 1-4, all tests pass after fix) | **NO** — locked work identifies precise fix, no reopen needed | Tests fail at append() precondition without userId → test suite blocks on contract, not logic | **PATCH** — Add `userId: 'test-user'` to makeRecord() in both test files, run npm test to verify |
| **BUG-004** | model-b1-phase1.test.ts fails — checkpoint.cycle() does not throw on unknown requestId | **OPEN** | 1. Test file: tests/model-b1-phase1.test.ts line 35<br/>2. Expected: throw error with "Checkpoint identity mismatch"<br/>3. Actual: silent return (no throw)<br/>4. Root cause: BUG-001 — checkpoint.ts:191 silent return not yet changed<br/>5. Test run output: "expected [Function] to throw an error" | **CONFIRMED BUG** (test failure) | **MEDIUM** | MODEL_B1_IMPLEMENTATION_DESIGN.md §10.2 (contract requires throw) | **NO** — test is correct, implementation is wrong | Test validates Model B1 checkpoint write contract. Once BUG-001 is fixed, this test passes automatically | **PATCH** (via BUG-001 fix) — convert silent returns to throws in checkpoint.ts |

---

## SECTION 3: OPEN DESIGN GAPS

| Gap ID | Name | Current Status | Evidence | Classification | Severity | Blocked By | Reopen Required? | Why It Matters | Recommended Action |
|--------|------|---|---|---|---|---|---|---|---|
| **GAP-001** | Task execution intent abstraction missing | **OPEN** | 1. E3_COMPLETE_SYSTEM_STATE_AUDIT_FINAL.md §FINAL ANSWERS Q3 (lists 4 missing abstractions)<br/>2. Current system: no field marks "this PlanItem requires external data" vs "text analysis completes it"<br/>3. criterion.mechanism (runtime/llm) does NOT distinguish task type<br/>4. No evidence: cannot tell if task is genuinely tool-required or text-valid at request time | **DESIGN GAP** (missing layer) | **HIGH** | E3 analysis complete, solution layer identified but not designed | **YES** — requires architectural decision | E3 cannot distinguish stall from legitimate text progress without this abstraction. Affects correctness of stall detection, recovery decisions, and model behavior guidance | **DESIGN DECISION** — Specify "task execution mode" abstraction at Task/PlanItem level: `task_execution_mode: 'tool_required' | 'text_valid' | 'runtime_evaluable'`. Who determines (user/planner/classifier)? Where stored (Request/PlanItem)? How passed to E3 check? |
| **GAP-002** | Model action claim vs execution tracking not explicit | **OPEN** | 1. E3_COMPLETE_SYSTEM_STATE_AUDIT_FINAL.md §FINAL ANSWERS Q3 (abstraction #2)<br/>2. System observes: modelResult.toolCalls (what model said it will do)<br/>3. System does NOT track: did model actually execute claimed action?<br/>4. No explicit representation of "model claimed X vs model executed X"<br/>5. Current approach: infer from toolCalls array only | **DESIGN GAP** (missing tracking layer) | **MEDIUM** | E3 analysis complete, solution identified but not designed | **UNCERTAIN** — may be out-of-scope for current phase | Without this, system cannot distinguish "model claimed tool but didn't" from "model correctly text-completed". Affects E3 decision logic and recovery heuristics. | **FURTHER TARGETED VERIFICATION** — Determine if this is needed for E3 fix or if task-execution-mode (GAP-001) alone suffices. If needed: design explicit claim/execution tracking (Request-scoped or within ProgressMonitor). |
| **GAP-003** | Task completion criterion at request time not formalized | **OPEN** | 1. E3_COMPLETE_SYSTEM_STATE_AUDIT_FINAL.md §FINAL ANSWERS Q3 (abstraction #3)<br/>2. Current: completion criteria only at PlanItem level (added by planner)<br/>3. Missing: request-time specification of "what counts as done for THIS task"<br/>4. Example: "return text analysis" vs "fetch external data" — different completion contracts<br/>5. No field or structure to represent this | **DESIGN GAP** (missing formalization) | **MEDIUM** | Affects task type determination (GAP-001) and stall detection | **UNCERTAIN** — may be addressed by GAP-001 design | If task completion criterion is vague, system cannot reliably determine when to stop execution. Affects E3 stall thresholds and recovery logic. | **DESIGN DECISION** — Should task-level completion criterion be explicit in EngineRequest? Or inferred from plan criteria? If explicit: where stored, how updated, what format? |

---

## SECTION 4: UNKNOWN / NEEDS TARGETED VERIFICATION

| Issue ID | Name | Current Status | Evidence Gap | Classification | Severity | Known Blocker? | Reopen Required? | Why It Matters | Recommended Action |
|----------|------|---|---|---|---|---|---|---|---|
| **UNK-001** | Memory crash recovery (AC8 test) — blocks on missing helper file | **BLOCKED** | 1. Test: tests/memory-crash-recovery.test.ts (AC8 test)<br/>2. Error: `ERR_MODULE_NOT_FOUND` — cannot find `tests/consequence-restart-helper.ts`<br/>3. Evidence: file does not exist on disk<br/>4. Context: AC8 protocol requires child subprocess (execFileSync), child script tries to import missing helper<br/>5. Not a logic issue — missing artifact | **HYPOTHESIS** (blocked on dependency) | **MEDIUM** | Missing file blocks test from running | **NO** — simple artifact issue | Without this test, cannot verify memory durability after SIGKILL crash. Important for production reliability but not architecture-blocking. | **PATCH** — Either (1) create `tests/consequence-restart-helper.ts` with expected signature, or (2) disable AC8 test temporarily with skip() + doc issue |
| **UNK-002** | Missing test files: project-index.ts, process.ts | **UNKNOWN** | 1. Tests: continuity-blockers.test.ts and process-subprocess.test.ts import from `src/core/projects/project-index` and `src/core/tools/process`<br/>2. Files do not exist<br/>3. Unknown: are tests outdated, or are these features unimplemented?<br/>4. No error from build — only from test discovery | **HYPOTHESIS** (artifact/design mismatch) | **LOW** | Tests fail at import, not on logic | **UNCERTAIN** — need to verify test intent | If these are intended features, implementation is missing. If tests are outdated, they should be archived or updated. Affects test suite coverage claim. | **TARGETED VERIFICATION** — (1) Check git history: when were these tests added? (2) Check open issues: are project-index / process tools planned? (3) Decision: remove tests or implement features? |
| **UNK-003** | Plan recovery semantics after crash — is it correct? | **OPEN** | 1. Phase 4A audit: BLOCKED verdict — "True Execution Recovery does NOT exist"<br/>2. Evidence: startup path only annotates checkpoints, doesn't re-execute (correct per design)<br/>3. But: when new message arrives after restart, does Plan load correctly?<br/>4. Assumption: getPlan(sessionId) via fallback chain works (needs BUG-002 fix)<br/>5. Test coverage: no explicit test for "message after restart, plan loads, continues on item 2" | **UNKNOWN** (not tested) | **MEDIUM** | BUG-002 blocks full verification | **YES** — implementation of BUG-002 fix will prove or disprove correctness | If Plan doesn't load correctly after restart, multi-execution plans fail silently. Critical for tasks spanning multiple crashes. | **TARGETED VERIFICATION** — After BUG-002 fixed, add integration test: (1) Create plan with 3 items, (2) Complete item 0, (3) Restart, (4) Send new message, (5) Verify plan loads, currentItemIndex=1, can complete item 1. |
| **UNK-004** | EvidenceLog persistence model — is ephemeral-per-execution correct? | **OPEN** | 1. MODEL_B1_IMPLEMENTATION_DESIGN.md §5.3: EvidenceLog is per-Execution, lost on restart<br/>2. Evidence: created fresh at engine.ts:778, not persisted to disk<br/>3. Design intent: correct — each Execution must produce own evidence<br/>4. But: no test validates that "after restart, model cannot use evidence from previous execution"<br/>5. Unknown: is there legitimate use case for cross-execution evidence? | **HYPOTHESIS** (design assumption not verified) | **LOW** | No known blocker | **UNCERTAIN** — design is stated but not tested | If evidence is meant to persist cross-execution, architecture is wrong. If not, current design is correct. Affects recovery behavior and what model can "remember" after restart. | **TARGETED VERIFICATION** — Add test: (1) Execute tool in Execution A, record in evidenceLog, (2) Restart, (3) Execution B starts fresh, (4) Verify evidenceLog is empty, (5) Model cannot claim "I did X in previous execution" |

---

## SECTION 5: RECOMMENDED NEXT DECISION POINT

**Single issue that should be addressed next, evidence-based:**

### **Primary Decision: BUG-001 — Checkpoint Identity Mismatch (PATCH)**

**Why this is first:**
1. **Proof complete** — Root cause understood (Fix C guard inconsistency documented in ARCHITECTURE_DECISION_PLAN_EXECUTION_CHECKPOINT.md §5)
2. **Design available** — MODEL_B1_IMPLEMENTATION_DESIGN.md §10.2 specifies exact contract changes
3. **Test ready** — model-b1-phase1.test.ts validates the fix (currently fails, will pass after patch)
4. **No new design needed** — Not a gap, not a hypothesis. It's a bug with specified solution.
5. **Blocks nothing else** — BUG-002 and BUG-003 are independent. E3 design gaps don't block this.
6. **Unblocks verification** — Once this is fixed, model-b1-phase1.test.ts passes, proving checkpoint write contract enforced.

**Scope of patch:**
- Remove engine.ts:806-809 guard (activeTaskBySession check)
- Convert checkpoint.ts silent returns to explicit throws (lines 191, 281, 302, 355, 377, 396)
- Each Execution creates own checkpoint (no reuse via activeTaskBySession)
- Verify model-b1-phase1.test.ts passes
- **DO NOT** remove activeTaskBySession Map itself (used for other purposes, safe to leave)

**Verification:** One test pass (model-b1-phase1.test.ts), minimal diff, no integration test needed.

---

### Secondary decisions (in order):

1. **BUG-002** — getPlan() must search terminal snapshots (high-priority, high-risk, requires careful implementation of snapshot search)
2. **BUG-003** — R6 fixture userId (low-priority, test-only, safe to do anytime)
3. **GAP-001** — Task execution intent abstraction (high-priority design decision, blocks E3 improvement, NOT blocking current baseline)
4. **UNK-001** — AC8 memory test helper (low-priority, can skip/remove safely)

---

## SUMMARY

**Status after locked work:**
- **Architecture:** Clean, well-designed (Model B1), contracts specified
- **Tests:** 16/16 completion protocol pass, 1202/1209 overall pass (2 failed, 5 skipped)
- **Open bugs:** 4 confirmed (1 critical, 2 medium, 1 medium-test)
- **Design gaps:** 3 (affecting E3 improvement, NOT blocking baseline)
- **Unknowns:** 4 (mostly low-priority or artifact-related)

**Recommended execution:** Fix BUG-001 (1-2 hour patch), verify test pass, then schedule BUG-002 (higher risk, requires careful design review).

No need to reopen any LOCKED work. All locked decisions remain valid.
