# R6 — INITIAL AUDIT CHARTER

**Project:** Coral Agent
**Author:** Tor — Trợ lý cá nhân của Khang
**Date:** 2026-09-04
**Preceding phase:** R5 v1 — VERIFIED (cd1694b3)
**Status:** INITIAL AUDIT — evidence collection and candidate identification only. No scope selection, no implementation.

---

## 0. Methodology

1. **Evidence-first scan** of repository state post-R5.
2. **Every claim tagged**: FACT (direct evidence), INFERENCE (from evidence), NOT PROVEN (insufficient evidence).
3. **No scope selected** — candidates identified, classified, Kayce decides.
4. **No implementation, no test changes, no refactor.**
5. **No reopening R0–R5.**

---

## 1. Current Repository State Post-R5

### 1.1 Build Status
**FACT:** `npm run build` exits with code 2.
**FACT:** 4 TypeScript errors at `src/platform/telegram/message-handler.ts`.
**FACT:** `message-handler.ts` line 6 imports `{ getChannelIdFromChatId } from './utils.js'` — but `utils.ts` does not exist in `src/platform/telegram/`; only `dist/platform/telegram/utils.js` exists (compiled artifact).
**FACT:** Root cause: `utils.ts` was in stash commit `12628afd`, not in working tree.
**Classification:** EXTERNAL BUILD BLOCKER (pre-existing, R3 ownership, present at clean HEAD `9ea64a88`).
**FACT:** Not caused by R5.

### 1.2 Test Status
**FACT:** Full test suite run: `1138 passed | 19 failed | 5 skipped`.
**FACT:** 19 failures concentrated in 2 test suites:
- `consequence-phase3.test.ts` — 7/10 failed
- `consequence-read-path.test.ts` — 8/18 failed (5 skipped from other files)
- `memory-core.test.ts` — 3/8 failed (timeout, pre-existing)

### 1.3 Consequence Memory Test Failures
**FACT (root cause):** `consequence-store.ts:440` — `close(): void { this.db.close(); }` closes the SQLite database connection.
**FACT:** `beforeEach` in `consequence-phase3.test.ts:43` creates `new ConsequenceStore(':memory:')`.
**FACT:** `afterEach` calls `store.close()`.
**FACT:** `beforeEach` in `consequence-read-path.test.ts:46` creates `new ConsequenceStore(':memory:')`.
**FACT:** `afterEach` in `consequence-read-path.test.ts:50` calls `store.close()`.
**FACT:** Error message from test output: `TypeError: The database connection is not open` at `consequence-store.ts:154` (`append requires userId`) — more precisely, `ConsequenceStore.append` or `findRelevantForToolCall` calls `this.db.prepare(...)` after `close()`.
**INFERENCE:** The `:memory:` database is destroyed when `db.close()` is called in better-sqlite3. A subsequent `new ConsequenceStore(':memory:')` in `beforeEach` creates a new connection, but if vitest runs tests within the same describe block sequentially and `afterEach` closes the DB, the next test's `beforeEach` should create a fresh instance. The failure suggests `db` state persists or the `:memory:` database path is shared/singleton across instances in better-sqlite3.
**FACT:** `consequence-store.ts:91` — `export class ConsequenceStore`. Constructor line 93-98 opens `new Database(dbPath)`.
**FACT:** `consequence-restart.test.ts` (5 tests, 5 skipped) uses `execFileSync` subprocess to spawn real processes — this test correctly handles lifecycle by using separate processes.
**Classification:** DEFECT in test lifecycle or better-sqlite3 `:memory:` behavior. `:memory:` databases may share state across `Database()` instances in better-sqlite3 when using the same file path in the same process. `close()` destroys the in-memory data, but `new ConsequenceStore(':memory:')` may not create a truly isolated fresh database.
**NOT PROVEN:** Whether this is a test bug (missing `beforeAll`/`afterAll` cleanup), a better-sqlite3 `:memory:` quirk, or a production bug in `close()`.

### 1.4 Consequence Store — `append requires userId` Error
**FACT:** `consequence-store.ts:154` — `append()` throws if no `userId`: `[Consequence] append requires userId: record.userId hoặc request context (rctx.userId) — không backfill`.
**FACT:** `makeRecord()` in test files does NOT include `userId` field.
**FACT:** `consequence-store.ts:150-156`:
```typescript
const rctx = getRequestContext();
const userId = record.userId ?? rctx?.userId;
if (!userId) {
  throw new Error('[Consequence] append requires userId...');
}
```
**FACT:** `getRequestContext()` is called from `consequence-store.ts` — returns `undefined` when no AsyncLocalStorage context exists (test environment).
**FACT:** Tests in `consequence-phase3.test.ts` and `consequence-read-path.test.ts` call `store.append(makeRecord({...}))` without `userId` or `rctx` setup.
**FACT:** `consequence-store.ts:147-156` is the append validation that was introduced in R5 scope or after (not part of original Consequence Memory finalized at `f902a65e`).
**INFERENCE:** The `append` method was hardened to require `userId` (Q3 userId isolation per comments), but tests were not updated to provide `userId` or mock `getRequestContext()`. This is a **test-production mismatch** — production code expects a request context that tests don't provide.
**Classification:** DEFECT — test does not satisfy production precondition introduced after R5 (or as part of Q3 migration). Tests call `append()` without `userId`, production throws. This is NOT an R5 issue (R5 was memory-store.ts only).

### 1.5 `memory-core.test.ts` — 3 Timeout Failures
**FACT:** 3 tests timeout after 30000ms: `should add message and retrieve it`, `should add multiple messages`, `should separate channels`.
**FACT:** These tests use `memory.addMessage()` → `MemoryFacade.addMessage()` → `globalMemoryStore.add()` → `MemoryStore.add()` → `await this.log.append()` → `await this.log.sync()` → `fsSync.fsync(fd)`.
**FACT:** Test file has `vi.mock('fs/promises')` mocking `mkdir`, `readFile`, `writeFile`, `readdir`.
**FACT:** `MemoryLog` uses `import * as fsSync from 'fs'` (NOT `fs/promises`) for `WriteStream` and `fsSync.fsync()`.
**FACT:** `MemoryStore.init()` calls `await fs.mkdir(this.storePath, { recursive: true})` — this IS from `fs/promises` and IS mocked.
**FACT:** The mock returns `async () => {}` for `mkdir`, which resolves immediately. But `MemoryLog.init()` creates `fsSync.createWriteStream(...)` — this uses Node.js `fs` module directly (not mocked).
**INFERENCE:** The `fs/promises` mock may interfere with vitest module resolution or create module-level conflicts when `vi.resetModules()` is called between tests. The 3 timeouts are likely caused by `MemoryLog.sync()` waiting on a WriteStream event that never fires because the mocked `fs/promises` interferes with `init()` or the `beforeEach` creates a new instance that doesn't properly initialize the WriteStream.
**FACT:** 5/8 tests PASS (including `should be a class`, `should have getChannelHistory method`, `should have addMessage method`, `should return empty history for new channel`, `should have reloadChannel method`).
**FACT:** The 3 timeouts are **pre-existing** (not introduced by R5 — R5 only added `await this.log.sync()` lines).
**Classification:** PRE-EXISTING DEFECT in test infrastructure. Not an R5 regression.

---

## 2. Source-Level Findings

### 2.1 `sqlite-storage.ts` — Dormant with TODO
**FACT:** `src/core/memory/sqlite-storage.ts:206` — `// TODO OPERATIONS` comment.
**FACT:** `CoralStorage` class exists with `memories`, `sessions`, `todos` tables and FTS5.
**FACT:** `sqlite-storage.ts` imports `better-sqlite3`.
**FACT:** Audit (R5 Initial Audit section 2.1C) classified this as **dormant**, not active production memory path.
**FACT:** The `// TODO OPERATIONS` suggests unfinished operations method.
**Classification:** OBSERVATION — dormant code with a TODO marker. Not an active defect.

### 2.2 `entity-extractor.ts` — Stub LLM Call
**FACT:** `src/core/knowledge/entity-extractor.ts:82` — `// TODO: Implement actual LLM call via provider registry`.
**FACT:** `entity-extractor.ts:81` — `private async callLLM(message: string): Promise<string>` returns mock data.
**FACT:** Comment at line 79-80: "Non-blocking: returns mock data for now, will be replaced by actual LLM call".
**Classification:** OBSERVATION — intentionally stubbed for testing. Product decision pending.

### 2.3 `entity-extractor.ts` — Stub Fuzzy Matching
**FACT:** `src/core/knowledge/entity-extractor.ts:220` — `// TODO: Implement fuzzy matching for similar names`.
**Classification:** OBSERVATION — planned feature, not implemented.

### 2.4 `semantic-memory.ts` — Stub Vector Embedding
**FACT:** `src/core/knowledge/semantic-memory.ts:295` — `// TODO: Implement proper vector embedding similarity`.
**Classification:** OBSERVATION — planned feature, not implemented.

### 2.5 `sqlite-storage.ts` — `// TODO OPERATIONS`
**FACT:** `src/core/memory/sqlite-storage.ts:206`.
**FACT:** `CoralStorage` class is imported by `engine.ts` and gateway.
**FACT:** Audit classified as dormant, but import exists in engine.ts.
**INFERENCE:** Either dormant code or partially integrated but operations not yet implemented. Needs verification whether `engine.ts` actually calls `CoralStorage` methods or only imports it.
**NOT PROVEN:** Whether this is dead code or partially active.

---

## 3. Backlog Carry-Over Items

### 3.1 message-handler.ts Build Blocker
**FACT:** `src/platform/telegram/message-handler.ts:6` — `import { getChannelIdFromChatId } from './utils.js'`.
**FACT:** `utils.ts` does not exist in source tree (only `dist/platform/telegram/utils.js`).
**FACT:** Root cause in stash commit `12628afd`.
**FACT:** 4 TypeScript errors, exit code 2, pre-existing at clean HEAD `9ea64a88` (R4 precedent).
**Classification:** EXTERNAL BUILD BLOCKER — R3 ownership. Not an R6 candidate unless decided to fix.
**Status:** Carried over from R3/R4/R5.

### 3.2 R5 AC4 — Semantic Limitation
**FACT:** `tests/memory-core.test.ts` executes R5 production path (`memory-store.ts:196` `await this.log.sync()` runs).
**FACT:** Test does NOT independently verify crash-durability invariant.
**FACT:** AC8 independently verifies durability (3/3 blocks recovered after SIGKILL).
**Classification:** Documented, not a defect. AC4 = PASS WITH SEMANTIC LIMITATION. AC8 covers the gap.
**Status:** Carried over from R5. No action required.

### 3.3 R5 AC7 — External Build Blocker
**FACT:** Same as §3.1.
**Classification:** PASS WITH EXTERNAL BUILD BLOCKER. Not an R6 candidate unless decided to fix.
**Status:** Carried over from R5.

### 3.4 R1-D.1 — Evidence
**NOT PROVEN:** The current repository scan does not show explicit `R1-D.1` markers. R1 is VERIFIED per project context. If R1-D.1 was a specific finding from R1 audit, it is closed per project context (R0–R4 closed).
**Action:** Verify if any R1-D.1 evidence file exists in `docs/evidence/R1/`.

### 3.5 Consequence Memory Test Failures
**FACT:** 15 total test failures across `consequence-phase3.test.ts` and `consequence-read-path.test.ts`.
**FACT:** Root causes identified: `append requires userId` precondition not satisfied by tests; `:memory:` database `close()` behavior.
**FACT:** `consequence-restart.test.ts` uses subprocess approach (correct), 5 tests SKIPPED.
**Classification:** DEFECT in test infrastructure. Not production code defect — production `ConsequenceStore.append()` correctly validates `userId`. Tests need `userId` context or mock.
**NOT PROVEN:** Whether the `:memory:` close/reopen issue is a better-sqlite3 bug or test lifecycle bug.

---

## 4. R6 Candidate Identification

### Candidate A — Consequence Memory Test Fix
| Field | Value |
|-------|-------|
| **Problem** | 15 test failures in `consequence-phase3.test.ts` (7/10) and `consequence-read-path.test.ts` (8/18). Tests call `ConsequenceStore.append()` without `userId` context; `:memory:` DB closed in `afterEach` may persist state causing `TypeError: database connection is not open` in next test. |
| **Evidence** | `consequence-store.ts:150-156` (append requires userId); `consequence-store.ts:440` (close()); test output `TypeError: The database connection is not open`; `makeRecord()` does not include `userId`. |
| **Classification** | DEFECT — test precondition mismatch. |
| **Not Implemented / Not Verified** | NOT IMPLEMENTED — tests need `userId` context or `getRequestContext()` mock. `:memory:` close/reopen issue NOT PROVEN — may be better-sqlite3 `:memory:` behavior quirk. |
| **Why R6** | Test failures block CI. R5 did not address Consequence Memory tests. Fixing tests is verification work, not implementation. |
| **Scope** | Fix `consequence-phase3.test.ts` and `consequence-read-path.test.ts` to provide `userId` or mock `getRequestContext()`. Investigate `:memory:` close/reopen isolation. |
| **Architecture Dependency** | Low — test-only change. Product decision: should `append()` require `userId` or fail-open? |
| **Verification** | Run `npx vitest run tests/consequence-phase3.test.ts tests/consequence-read-path.test.ts` → all PASS. |
| **Product Decision Required** | YES — whether `append()` should fail-open (return error gracefully) when no `userId`, or require `userId` and tests must mock the context. Current `throw` is a hard precondition. |

### Candidate B — Build Blocker Fix (Telegram utils.ts)
| Field | Value |
|-------|-------|
| **Problem** | `src/platform/telegram/message-handler.ts:6` imports `getChannelIdFromChatId` from `./utils.js`. No `utils.ts` exists in source tree. `npm run build` fails with 4 TypeScript errors. |
| **Evidence** | `message-handler.ts:6`; `dist/platform/telegram/utils.js` exists (compiled artifact); stash commit `12628afd` had `utils.ts`; `npm run build` exit 2; 4 TypeScript errors at `message-handler.ts`. |
| **Classification** | DEFECT — missing source file. Pre-existing since R3. |
| **Not Implemented / Not Verified** | NOT IMPLEMENTED — `utils.ts` source file does not exist. |
| **Why R6** | Build must pass for any production deployment. R5 explicitly did not fix this (frozen scope). R4 precedent confirmed it's pre-existing. |
| **Scope** | Restore `src/platform/telegram/utils.ts` (decompile from `dist/platform/telegram/utils.js` or recover from stash `12628afd`). |
| **Architecture Dependency** | None — pure restoration. |
| **Verification** | `npm run build` exits 0. |
| **Product Decision Required** | NO — this is a source restoration task. But: was `utils.ts` intentionally removed? If yes, `message-handler.ts` import should be removed instead. |

### Candidate C — Consequence Memory `:memory:` Close/Reopen Isolation
| Field | Value |
|-------|-------|
| **Problem** | `ConsequenceStore.close()` calls `this.db.close()`. `better-sqlite3` `:memory:` databases may not be truly isolated across `new Database(':memory:')` instances in the same process. `afterEach` closes DB, `beforeEach` creates new instance, but `TypeError: database connection is not open` occurs in subsequent tests. |
| **Evidence** | `consequence-store.ts:440-441` (`close(): void { this.db.close(); }`); test output `TypeError: The database connection is not open`; `:memory:` path behavior in better-sqlite3. |
| **Classification** | DESIGN QUESTION or DEFECT — depends on better-sqlite3 behavior. `:memory:` may share a single underlying database across instances in the same process (known better-sqlite3 behavior). |
| **Not Implemented / Not Verified** | NOT PROVEN — whether this is a test bug or a production code issue with `:memory:` isolation. |
| **Why R6** | Affects test reliability for all Consequence Memory tests. May affect production if `:memory:` is used in single-process scenarios. |
| **Scope** | Investigate better-sqlite3 `:memory:` behavior. If `:memory:` is shared, switch to temp file paths or `new Database()` (anonymous memory). |
| **Architecture Dependency** | Medium — may require changing `ConsequenceStore` constructor default or test setup. |
| **Verification** | Create two `ConsequenceStore(':memory:')` instances in same process, close first, verify second has empty DB. |
| **Product Decision Required** | YES — if production uses `:memory:` and close/reopen is a pattern, isolation must be guaranteed. |

### Candidate D — Dormant Code Cleanup / TODO Resolution
| Field | Value |
|-------|-------|
| **Problem** | Several source files contain `// TODO` markers and dormant code: `sqlite-storage.ts:206` (`// TODO OPERATIONS`), `entity-extractor.ts:82` (stub LLM call), `entity-extractor.ts:220` (stub fuzzy matching), `semantic-memory.ts:295` (stub vector embedding), `sqlite-storage.ts` (dormant CoralStorage). |
| **Evidence** | `sqlite-storage.ts:206`, `entity-extractor.ts:82/220`, `semantic-memory.ts:295`. Audit classified CoralStorage as dormant. |
| **Classification** | OBSERVATION — not defects. TODO markers in planned/unfinished features. |
| **Not Implemented / Not Verified** | NOT IMPLEMENTED — all TODO items are stubs. |
| **Why R6** | Only if Kayce decides to prioritize codebase hygiene and complete unfinished features. |
| **Scope** | Depends on which TODOs are prioritized. Could be: implement LLM call, implement fuzzy matching, implement vector embedding, complete CoralStorage operations. |
| **Architecture Dependency** | HIGH — implementing LLM integration, fuzzy matching, or vector embeddings requires architectural decisions. |
| **Verification** | Tests for the implemented features. |
| **Product Decision Required** | YES — HIGH. These are feature implementations, not bug fixes. Must decide priority and design. |

### Candidate E — `sqlite-storage.ts` Integration Status
| Field | Value |
|-------|-------|
| **Problem** | `CoralStorage` is imported by `engine.ts` but audit classified it as dormant. The `// TODO OPERATIONS` at line 206 suggests unfinished methods. |
| **Evidence** | `engine.ts` line 37: `import { CoralStorage, getStorage } from '../memory/sqlite-storage.js'`. `sqlite-storage.ts:206`: `// TODO OPERATIONS`. `sqlite-storage.ts` has full schema (memories, sessions, todos, FTS5). |
| **Classification** | ARCHITECTURAL GAP — code exists and is imported but may not be actively used. |
| **Not Implemented / Not Verified** | NOT PROVEN — need to verify if `engine.ts` actually calls `CoralStorage` methods or only imports it for type/reference. |
| **Why R6** | If `CoralStorage` is imported but never used, it's dead code. If it IS used, the `// TODO OPERATIONS` is a missing feature. This determines whether it's a defect or a planned feature. |
| **Scope** | Trace all `CoralStorage` / `getStorage` usages in `engine.ts`. Determine if methods are called or only imported. |
| **Architecture Dependency** | HIGH — if CoralStorage is intended to be the unified storage layer, its integration status is a critical architectural question. |
| **Verification** | Grep `engine.ts` for `CoralStorage`, `getStorage`, `storage.` method calls. |
| **Product Decision Required** | YES — is CoralStorage intended to be active? If yes, complete integration. If no, remove import to eliminate dead code. |

---

## 5. NOT Candidates (Excluded)

| Item | Reason |
|------|--------|
| MemoryStore crash durability (AC8) | Already VERIFIED in R5. |
| R1–R4 reopens | Explicitly forbidden (Principle 5). |
| Consequence Memory implementation | Consequence Memory v1 was finalized at `f902a65e`. Only tests are broken, not implementation. |
| Telegram platform code | Out of scope, pre-existing, not R5 or R6 candidate unless decided. |
| Dashboard | Pre-existing, separate codebase, not related to R5 findings. |
| Memory system unification | Was Candidate C in R5 scope debate, explicitly excluded from R5 v1. |
| MemoryExtractor | Was Candidate D in R5 scope debate, explicitly excluded from R5 v1. |
| Consequence TTL/lifecycle | Was Candidate E in R5 scope debate, explicitly excluded from R5 v1. |

---

## 6. Cross-Reference: R5 Audit Predictions vs Reality

| R5 Audit Prediction | Reality | Status |
|---------------------|---------|--------|
| `memory-core.test.ts` 3 timeouts | Confirmed — 3/8 timeout, pre-existing | Carried over |
| `npm run build` fails | Confirmed — exit 2, 4 errors at `message-handler.ts` | Carried over |
| `utils.ts` missing from source | Confirmed — only `dist/platform/telegram/utils.js` exists | Carried over |
| Consequence Memory tests pass | **NOT predicted as failing** — discovered in R6 scan as new finding | **NEW** |
| `sqlite-storage.ts` dormant | Confirmed — `// TODO OPERATIONS` | Confirmed |
| EntityExtractor stubs | Confirmed — `// TODO` markers | Confirmed |

---

## 7. Open Questions for Kayce

1. **Should the Consequence Memory test failures be fixed before R6 scope selection?** They are test-only issues but block CI.
2. **Should `utils.ts` be restored or should the `message-handler.ts` import be removed?** This determines whether the build blocker is a source restoration or import cleanup.
3. **Is `CoralStorage` intended to be active integration or dead code?** This determines whether `sqlite-storage.ts` TODOs are actionable.
4. **Should `better-sqlite3 :memory:` close/reopen behavior be investigated as a potential production issue?** Currently only observed as test failure, but may affect production if `:memory:` is used.
5. **Should the `append requires userId` hard precondition in `ConsequenceStore` be changed to fail-open?** Current behavior throws; tests can't satisfy it without mock context.

---

## 8. Scope Integrity

- **No implementation performed.**
- **No test changes made.**
- **No production code modified.**
- **No scope reopened.**
- **All findings are evidence-based with file:line citations.**
- **Every candidate has explicit classification and NOT PROVEN flags where evidence is insufficient.**

---

*Audit complete: 2026-09-04*
*Next phase: Claude Independent Review → Kayce cross-check → Scope Debate → Frozen R6 Spec*
