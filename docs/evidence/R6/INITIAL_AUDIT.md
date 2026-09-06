lm:** Fifteen consequence tests fail before exercising their assertions because fixtures omit the required user identity (`docs/evidence/R6/initial-audit-runs.txt:9-11`).
- **Evidence:** `tests/consequence-phase3.test.ts:24-49`; `tests/consequence-read-path.test.ts:25-50`; `src/core/memory/consequence-store.ts:150-156`.
- **Classification:** `DEFECT` in test/verification setup.
- **Implementation/verification:** The production user-isolation guard is `IMPLEMENTED`; the affected behaviors are `IMPLEMENTED BUT NOT VERIFIED` by the failing suites. This is not `NOT IMPLEMENTED`.
- **Why R6:** It is a post-R5 verification blocker outside the R5 memory-store change.
- **Provisional scope:** Decide the test contract for supplying `userId` or request context, then rerun the two suites. Treat the `:memory:` error as a separate hypothesis unless independently reproduced.
- **Decision dependency:** Low for test setup; medium if changing the production fail-closed user identity contract is considered.
- **Verification:** `npx vitest run tests/consequence-phase3.test.ts tests/consequence-read-path.test.ts` with the chosen fixture contract.

### Candidate R6-C - Verify consequence read-path bootstrap after restart

- **Problem:** Source registers the consequence read path during engine initialization, but the restart test does not directly exercise a post-restart `tool:call` guard.
- **Evidence:** `src/core/engine/engine.ts:237`, `src/core/engine/engine.ts:539-545`; `docs/evidence/R5/INITIAL_AUDIT.md:98-101`; `docs/evidence/R5/VERIFICATION_REPORT.md:260-263`.
- **Classification:** `ARCHITECTURAL GAP` in verification evidence, not a missing implementation.
- **Implementation/verification:** Bootstrap is `IMPLEMENTED`; dedicated restart guard behavior is `IMPLEMENTED BUT NOT VERIFIED`.
- **Why R6:** It is a bounded evidence gap left visible after R5 and does not require reopening the persistence implementation.
- **Provisional scope:** Add only the smallest real-process or equivalent test that proves registration and guard behavior after restart; scope remains undecided.
- **Decision dependency:** Low architecture dependency; test harness boundary requires agreement.
- **Verification:** A restart scenario that emits `tool:call` in the restarted process and observes the guard decision.

### Candidate R6-D - Clarify active memory ownership

- **Problem:** Multiple memory/storage abstractions exist, while the intended canonical query boundary is not explicit.
- **Evidence:** `src/core/engine/engine.ts:227-230`; `src/core/memory/sqlite-storage.ts:23-33`; `docs/evidence/R5/INITIAL_AUDIT.md:21-44`.
- **Classification:** `DESIGN QUESTION`.
- **Implementation/verification:** Multiple implementations exist; canonical ownership is `NOT PROVEN`. This is not evidence that any capability is missing.
- **Why R6:** It is an architectural decision surfaced after R5, not a defect to fix opportunistically.
- **Provisional scope:** Compare active consumers and define the desired ownership boundary only if Kayce selects this candidate.
- **Decision dependency:** High architecture/product dependency.
- **Verification:** Architecture decision plus consumer-level tests; no meaningful verification target can be frozen before that decision.

## 4. Observations excluded from candidate scope

- **FACT:** Entity extraction contains an explicit mock LLM return and TODO markers (`src/core/knowledge/entity-extractor.ts:79-83`, `src/core/knowledge/entity-extractor.ts:220`).
- **FACT:** Semantic memory contains a vector-embedding TODO (`src/core/knowledge/semantic-memory.ts:295`).
- **Classification:** `OBSERVATION`; these are `NOT IMPLEMENTED` feature stubs, not R6 tasks by default.
- **FACT:** A TODO or absent test does not prove a production defect; these observations remain outside scope unless a later product decision promotes them.

## 5. Scope integrity and next gate

- **FACT:** No code, production behavior, or test has been changed by this audit.
- **FACT:** Candidates above are not an ordered backlog and none is an approved R6 scope.
- **INFERENCE:** The required next step is Claude Independent Review, then Kayce cross-check and Scope Debate.
- **NOT PROVEN:** No R6 candidate is selected, and no product or architecture decision is made here.

**Process:** Initial Audit -> Claude Independent Review -> Kayce + author cross-check -> Scope Debate -> Frozen R6 Spec -> Agent Dev -> Implementation -> Independent Verification -> R6 VERIFIED.
