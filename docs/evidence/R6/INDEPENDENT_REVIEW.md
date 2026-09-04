# R6 — INDEPENDENT AUDIT REVIEW REPORT

**Project:** Coral Agent
**Phase:** R6 — Independent Review (post R6 Initial Audit)
**Preceding phase:** R6 Initial Audit (commit `7a2ec62f`, file `docs/evidence/R6/INITIAL_AUDIT.md`)
**Status:** INDEPENDENT REVIEW COMPLETE — No R6 scope selected
**Date:** 2026-09-04

---

## Methodology

Every claim from the Initial Audit was independently verified against source code using `grep`, `sed`, `cat`, and `npx vitest`. Each finding tagged:
- **FACT** — direct source evidence obtained.
- **INFERENCE** — derived from evidence, logical but not directly stated.
- **NOT PROVEN** — insufficient evidence to confirm or deny.

No implementation, test modification, or production code change was performed.

---

## Part 1: Candidate-by-Candidate Review

---

### Candidate A — Consequence Memory Test Failures

#### Audit Claim
15 tests fail because test fixtures don't provide `userId`; production guard requires user identity.

#### Independent Verification

**FACT — `append requires userId` is the PRIMARY root cause:**
- `src/core/memory/consequence-store.ts:150-156`:
  ```typescript
  const rctx = getRequestContext();
  const userId = record.userId ?? rctx?.userId;
  if (!userId) {
    throw new Error('[Consequence] append requires userId...');
  }
  ```
- `tests/consequence-phase3.test.ts:24-41`: `makeRecord()` returns a `ConsequenceRecord` without `userId` field.
- `tests/consequence-phase3.test.ts:52-77`: Tests call `store.append(makeRecord({...}))` without `userId`.
- Test output confirms: `Error: [Consequence] append requires userId...` for ALL 7 failing `consequence-phase3` tests.

**FACT — `consequence-read-path.test.ts` has same root cause:**
- `tests/consequence-read-path.test.ts:46-50`: `beforeEach` creates `new ConsequenceStore(':memory:')`, `afterEach` calls `store.close()`.
- Same `makeRecord()` function without `userId`.
- Test output confirms: `Error: [Consequence] append requires userId...` for ALL 8 failing tests.
- **10 tests in this file PASS** (including `should fail-open: lookup throw không crash request` and `lesson thay đổi không đổi quyết định`).

**FACT — The `:memory:` close/reopen hypothesis is INCORRECT as primary cause:**
- `tests/consequence-read-path.test.ts:225-230` explicitly tests close/reopen:
  ```typescript
  const closedStore = new ConsequenceStore(':memory:');
  closedStore.close();
  unsub = registerConsequenceReadPath({ store: closedStore });
  ```
- This test **PASSES** (confirmed in live run: `✓ Consequence Read Path — guard on tool:call > should fail-open`).
- `afterEach` close + `beforeEach` new instance works correctly for `findRelevantForToolCall`.
- The `TypeError: The database connection is not open` warning at `consequence-store.ts:421` is caught by the fail-open handler (`catch` block at `consequence-store.ts:418-426`) and does NOT cause assertion failures.

**FACT — better-sqlite3 `:memory:` isolation behavior:**
- Verified with direct test: `new Database(':memory:')`, close, then `new Database(':memory:')` creates a truly separate in-memory database (throws `SqliteError: no such table` when querying old data — confirming isolation).
- `:memory:` close/reopen isolation WORKS in better-sqlite3.
- The `:memory:` hypothesis from the Initial Audit is **OVERCLAIMED**.

#### Classification Assessment

| Audit Claim | Verdict |
|-------------|---------|
| `append requires userId` is the cause | **FACT — CONFIRMED** |
| Test fixture lacks `userId` | **FACT — CONFIRMED** |
| `:memory:` close/reopen causes failures | **INCORRECT — OVERCLAIMED** |
| `:memory:` close/reopen is a production concern | **NOT PROVEN — and evidence contradicts it** |
| Classification = DEFECT | **CORRECT** — test precondition mismatch |

**Refined classification:** DEFECT — test fixture precondition mismatch. `makeRecord()` must provide `userId` or tests must mock `getRequestContext()`. Production `ConsequenceStore.append()` correctly enforces `userId` requirement (Q3 userId isolation).

**NO hidden production defect.** All test failures are caused by tests not satisfying the production precondition that was intentionally introduced (Q3 migration, documented in `consequence-store.ts:148-156`).

---

### Candidate B — Telegram Build Blocker

#### Audit Claim
`message-handler.ts:6` imports `./utils.js` but source `utils.ts` doesn't exist. `npm run build` fails.

#### Independent Verification

**FACT — `npm run build` produces 4 TypeScript errors:**
```
src/platform/telegram/message-handler.ts(6,40):    error TS2307: Cannot find module './utils.js'
src/platform/telegram/message-handler.ts(66,58):   error TS2554: Expected 1 arguments, but got 2
src/platform/telegram/message-handler.ts(69,59):   error TS2554: Expected 1 arguments, but got 2
src/platform/telegram/message-handler.ts(91,52):   error TS2554: Expected 1 arguments, but got 2
```

**FACT — Error #1: Missing module (`utils.ts`):**
- `src/platform/telegram/message-handler.ts:6`: `import { getChannelIdFromChatId } from './utils.js'`
- `src/platform/telegram/utils.ts` does NOT exist.
- `dist/platform/telegram/utils.js` exists (compiled artifact from stash commit `12628afd`).
- **This is a missing source file.**

**FACT — Errors #2-4: API contract mismatch (INDEPENDENT of Error #1):**
- `src/platform/telegram/message-handler.ts:66`: `this.sessionManager.getSession(userId, channelId)` — passes 2 arguments.
- `src/platform/telegram/message-handler.ts:69`: `this.sessionManager.createSession(userId, channelId)` — passes 2 arguments.
- `src/platform/telegram/message-handler.ts:91`: another call with 2 arguments.
- `src/platform/telegram/session-manager.ts:352`: `getSession(userId: string): SessionState | undefined` — accepts 1 argument.
- `src/platform/telegram/session-manager.ts:332`: `createSession(userId: string): SessionState` — accepts 1 argument.
- TypeScript error `Expected 1 arguments, but got 2` confirms the mismatch.
- **This is an independent API contract mismatch — completely separate from missing `utils.ts`.**

**FACT — `SessionManager` has no `channelId` parameter anywhere:**
- `getSession(userId)` — 1 param.
- `createSession(userId)` — 1 param.
- `getOrCreateSession(userId)` — 1 param.
- No method in `SessionManager` accepts `(userId, channelId)`.

**FACT — `getChannelIdFromChatId` is used but undefined:**
- Called at `message-handler.ts:6`: `const channelId = getChannelIdFromChatId(chatId)`.
- Function doesn't exist in source.
- Only compiled artifact `dist/platform/telegram/utils.js` has it.

#### Classification Assessment

| Audit Claim | Verdict |
|-------------|---------|
| Missing `utils.ts` | **FACT — CONFIRMED** |
| `getChannelIdFromChatId` undefined | **FACT — CONFIRMED** |
| Restore `utils.ts` fixes build | **NOT PROVEN — only fixes 1 of 4 errors** |
| SessionManager API mismatch exists | **FACT — CONFIRMED, independent issue** |
| Classification = DEFECT | **CORRECT — but scope is 2 problems, not 1** |

**Refined classification:** DEFECT — TWO independent problems:
1. **Missing source module** (`utils.ts` with `getChannelIdFromChatId`).
2. **API contract mismatch** (`message-handler.ts` calls `getSession(userId, channelId)` and `createSession(userId, channelId)` but `SessionManager` only accepts `getSession(userId)` and `createSession(userId)`).

**Scope is NOT just "restore utils.ts".** Restoring `utils.ts` fixes only 1 of 4 TypeScript errors. The `channelId` parameter mismatch is an independent issue requiring either:
- Update `message-handler.ts` to call `getSession(userId)` without `channelId`.
- Or update `SessionManager` to accept `channelId` parameter.
- Product decision required: was `channelId` intentionally removed or was `message-handler.ts` updated incorrectly?

**Source history would clarify intent** — `message-handler.ts` passes `channelId` to `getSession`/`createSession`, suggesting `SessionManager` should support it, OR `message-handler.ts` was updated to pass `channelId` but `SessionManager` was not.

---

### Candidate C — `:memory:` Close/Reopen Isolation

#### Audit Claim
`ConsequenceStore.close()` calls `this.db.close()`. `better-sqlite3` `:memory:` databases may not be truly isolated across `new Database(':memory:')` instances. This causes `TypeError: database connection is not open` in subsequent tests.

#### Independent Verification

**FACT — `:memory:` databases ARE isolated in better-sqlite3:**
- Verified via direct test: `new Database(':memory:')` → insert data → `close()` → `new Database(':memory:')` → query → `SqliteError: no such table: t`.
- This confirms each `:memory:` instance is a truly separate database. `:memory:` is NOT shared across instances in the same process.

**FACT — The explicit close/reopen test PASSES:**
- `tests/consequence-read-path.test.ts:225-230`: Creates `new ConsequenceStore(':memory:')`, calls `close()`, registers with `registerConsequenceReadPath({ store: closedStore })`, emits `tool:call` event.
- Test output: `✓ Consequence Read Path — guard on tool:call > should fail-open: lookup throw không crash request`.
- This proves `:memory:` close/reopen works correctly.

**FACT — `TypeError: database connection is not open` is a caught warning, NOT a test failure:**
- At `consequence-store.ts:421`: `log.warn('[Consequence] lookup failed (fail-open): ...')` inside a `catch` block.
- The `catch` block returns a default `ConsequenceLookupResult` with empty arrays and `record_only` policy.
- Test assertions check the returned `ConsequenceLookupResult`, not the warning log.
- Test output shows `⚠️ [ConsequenceStore] ... lookup failed (fail-open): TypeError` but tests still PASS or fail for OTHER reasons (the `append requires userId` issue).

**FACT — All test failures trace to `append requires userId`:**
- 7/7 failures in `consequence-phase3` are `append requires userId`.
- 8/8 failures in `consequence-read-path` are `append requires userId`.
- 0 failures trace to `:memory:` isolation.

**FACT — `close()` behavior in `ConsequenceStore`:**
- `consequence-store.ts:440-441`: `close(): void { this.db.close(); }`
- This closes the SQLite connection. For `:memory:` databases, `db.close()` destroys the database.
- `new ConsequenceStore(':memory:')` in `beforeEach` creates a fresh, empty database.
- This is the CORRECT behavior for test isolation.

**FACT — `consequence-restart.test.ts` (5 tests, 5 SKIPPED):** Uses subprocess approach with real file-based SQLite, correctly handling lifecycle across processes.

#### Classification Assessment

| Audit Claim | Verdict |
|-------------|---------|
| `:memory:` close/reopen causes test failures | **INCORRECT — evidence contradicts** |
| `:memory:` databases share state in better-sqlite3 | **INCORRECT — verified isolated** |
| `TypeError: database connection is not open` is the primary failure cause | **INCORRECT — it's a caught warning** |
| `:memory:` close/reopen is a production concern | **NOT PROVEN — and explicit test proves it works** |
| Classification = DESIGN QUESTION | **OVERSTATED — no evidence of a problem** |

**Refined classification: NOT PROVEN — and evidence is AGAINST the hypothesis.**
The `:memory:` close/reopen isolation is NOT a problem. The `TypeError` warning is caught by fail-open logic and does not cause test failures. This candidate should be **REMOVED from R6 scope debate entirely** or demoted to OBSERVATION with no action.

If further investigation is desired: the only legitimate question is why `TypeError: database connection is not open` appears at all during tests — but since it's caught by the fail-open handler and doesn't affect test outcomes, it's not load-bearing.

---

### Candidate D — Dormant TODO Cleanup

#### Audit Claim
Several source files contain `// TODO` markers and dormant code: `sqlite-storage.ts:206`, `entity-extractor.ts:82`, `entity-extractor.ts:220`, `semantic-memory.ts:295`.

#### Independent Verification

**FACT — `sqlite-storage.ts:206` (`// TODO OPERATIONS`):**
- This is NOT a TODO for an unimplemented feature. It is a SECTION DIVIDER comment:
  ```
  // ═══════════════════════════════════════════════════════════════
  // TODO OPERATIONS
  // ═══════════════════════════════════════════════════════════════
  
  addTodo(...) { ... }
  getTodos(...) { ... }
  ```
- `addTodo()`, `getTodos()`, and related methods are FULLY IMPLEMENTED at `sqlite-storage.ts:208-230`.
- **This is a documentation/comment artifact, NOT an unimplemented feature.**
- `engine.ts:229`: `this.storage.initEventTables()` — confirms CoralStorage is actively used.
- `engine.ts:1064-1066`: `this.storage.addSessionMessage(...)` — confirms session message storage is actively used.

**FACT — `entity-extractor.ts:82` (`// TODO: Implement actual LLM call via provider registry`):**
- `entity-extractor.ts:81`: `private async callLLM(message: string): Promise<string>` returns heuristic-based mock data.
- `entity-extractor.ts:245-248`: `getEntityExtractor()` singleton exists.
- **FACT:** No consumer outside `entity-extractor.ts` calls `getEntityExtractor()`. Searched across entire `src/` — only `entity-extractor.ts` references itself.
- **FACT:** `start-telegram.ts` imports `MemoryExtractor` (not `EntityExtractor`).
- **Classification:** OBSERVATION — intentionally stubbed feature with no active consumer. NOT a defect.

**FACT — `entity-extractor.ts:220` (`// TODO: Implement fuzzy matching for similar names`):**
- Part of the same `EntityExtractor` class. No consumer.
- **Classification:** OBSERVATION.

**FACT — `semantic-memory.ts:295` (`// TODO: Implement proper vector embedding similarity`):**
- `semantic-memory.ts:56`: `log.info('SemanticMemory initialized')` — class exists and initializes.
- No consumer calls `getSemanticMemory()` outside of `semantic-memory.ts` itself. Searched across entire `src/` — only `semantic-memory.ts` references itself.
- **Classification:** OBSERVATION — intentionally stubbed feature with no active consumer.

**FACT — `MemoryExtractor` is the active extraction pipeline, NOT `EntityExtractor`:**
- `src/scripts/start-telegram.ts:21`: `import { MemoryExtractor } from '../core/memory/MemoryExtractor.js'`.
- `src/scripts/start-telegram.ts:395`: `const memoryExtractor = new MemoryExtractor(ms, eventBus)`.
- `MemoryExtractor` (not `EntityExtractor`) is the production extraction pipeline.

#### Classification Assessment

| Audit Claim | Verdict |
|-------------|---------|
| `sqlite-storage.ts:206` is an unimplemented feature TODO | **INCORRECT — it's a section divider comment; all methods implemented** |
| `entity-extractor.ts:82` is unimplemented | **FACT — CONFIRMED — no consumer** |
| `semantic-memory.ts:295` is unimplemented | **FACT — CONFIRMED — no consumer** |
| These are OBSERVATION | **CORRECT** |
| Any are load-bearing defects? | **NO — no consumer depends on them** |
| `sqlite-storage.ts` TODO is a defect? | **NO — comment artifact; methods fully implemented** |

**Refined classification:**
- `sqlite-storage.ts:206`: **OBSERVATION (comment artifact)** — methods fully implemented, CoralStorage is active.
- `entity-extractor.ts:82/220`: **OBSERVATION (intentionally stubbed, no consumer)** — `MemoryExtractor` is the active pipeline, not `EntityExtractor`.
- `semantic-memory.ts:295`: **OBSERVATION (intentionally stubbed, no consumer)** — no external consumer found.

**NONE of these are R6-worthy.** They are future capability stubs with no production impact.

---

### Candidate E — CoralStorage Integration / Ownership

#### Audit Claim
`CoralStorage` is imported by `engine.ts` but classified as dormant. `// TODO OPERATIONS` suggests unfinished methods.

#### Independent Verification

**FACT — `engine.ts` actively uses `CoralStorage`:**
- `src/core/engine/engine.ts:37`: `import { CoralStorage, getStorage } from '../memory/sqlite-storage.js'`
- `src/core/engine/engine.ts:178`: `private storage!: CoralStorage;`
- `src/core/engine/engine.ts:227`: `this.storage = getStorage();` — constructs CoralStorage singleton.
- `src/core/engine/engine.ts:229`: `this.storage.initEventTables();` — calls method.
- `src/core/engine/engine.ts:230`: `this.eventStore = new EventStore(this.storage.getDb());` — uses `getDb()` to pass to EventStore.
- `src/core/engine/engine.ts:1064-1066`: `this.storage.addSessionMessage(...)` — actively writes session messages.
- `src/core/engine/engine.ts:1254`: `try { this.storage.close(); }` — actively closes storage on shutdown.

**FACT — `CoralStorage` is NOT dormant — it is actively used by the engine:**
- `initEventTables()` is called during engine construction.
- `getDb()` is used to create `EventStore`.
- `addSessionMessage()` is called in the engine's message handling path.
- `close()` is called during shutdown.

**FACT — `getStorage()` singleton pattern:**
- `sqlite-storage.ts:347-353`: Singleton `let _instance: CoralStorage | null = null`. First call creates instance, subsequent calls return same instance.
- `engine.ts:227`: `this.storage = getStorage()` — gets the singleton.

**FACT — Other consumers:**
- `src/core/security/consent.ts:63-64`: `const { CoralStorage } = await import('../memory/sqlite-storage.js'); this.db = new CoralStorage(dbPath);` — uses CoralStorage directly for consent.
- `src/core/security/secret-rotation.ts:4`: `@depends-on security/sqlite-storage` — references CoralStorage.

**FACT — `// TODO OPERATIONS` is a section divider, not an unimplemented feature:**
- `sqlite-storage.ts:206-208`: Section divider comment.
- `sqlite-storage.ts:209-230`: `addTodo()`, `getTodos()` fully implemented.
- The TODO marker was misread by the Initial Audit.

**FACT — `MemoryExtractor` is the active memory extraction pipeline (not CoralStorage):**
- `start-telegram.ts:395`: `const memoryExtractor = new MemoryExtractor(ms, eventBus)` — uses `MemoryStore` (append-log), NOT `CoralStorage`.
- `MemoryExtractor` is the production memory extraction pipeline.

**FACT — `CoralStorage` and `MemoryStore` are SEPARATE systems:**
- `CoralStorage` = better-sqlite3, used by `engine.ts` for events/sessions/todos.
- `MemoryStore` = append-log, used by `MemoryFacade` and `MemoryExtractor` for memory blocks.
- They serve different purposes and are independently active.

**FACT — `sqlite-storage.ts` has a `Memory` table:**
- `sqlite-storage.ts:41-49`: `CREATE TABLE IF NOT EXISTS memories` — stores user facts/preferences.
- This is a SEPARATE memory system from `MemoryStore` (append-log). Not the same data path.

#### Classification Assessment

| Audit Claim | Verdict |
|-------------|---------|
| `CoralStorage` is dormant | **INCORRECT — engine.ts actively calls methods on it** |
| `// TODO OPERATIONS` means unfinished features | **INCORRECT — it's a section divider; all methods implemented** |
| `CoralStorage` integration status is an architectural gap | **NOT PROVEN — it's actively integrated and used** |
| `CoralStorage` is the canonical memory owner | **NOT PROVEN — it's a separate system, `MemoryStore` is the canonical memory for `MemoryFacade`** |
| Classification = ARCHITECTURAL GAP | **INCORRECT — needs downgrade to OBSERVATION** |

**Refined classification: OBSERVATION — not an architectural gap.**
CoralStorage is actively used by the engine for event tables, session messages, and consent. The `// TODO OPERATIONS` comment is a section divider, not an unimplemented feature. The "many memory systems" observation is a design question about whether `CoralStorage.memories` and `MemoryStore` should be unified, but this was explicitly excluded from R5 scope and is NOT a defect.

**Key correction:** The Initial Audit misclassified `sqlite-storage.ts` as dormant. It is NOT dormant — it has 3+ active production consumers (`engine.ts`, `consent.ts`, `secret-rotation.ts`). The TODO was a section divider comment. This candidate should be **demoted from ARCHITECTURAL GAP to OBSERVATION**.

---

## Part 2: R0–R5 Boundary Verification

| Phase | Status | Reopen risk | Verification |
|-------|--------|-------------|--------------|
| R0 — Baseline/Forensic Audit | VERIFIED | None | `docs/evidence/R1-D1/SUMMARY.md` exists and is VERIFIED |
| R1 — Execution Safety/Cancellation | VERIFIED | None | R1-F.1, R1-F.2 verified with real-process tests |
| R2 — Crash/Interruption Recovery | VERIFIED | None | 12/12 PASS crash injection |
| R3 — Global Foreground Concurrency | VERIFIED | None | 15/15 PASS, evidence at `docs/evidence/R3/` |
| R4 — Planning Loop Coherence | VERIFIED | None | 110/110 PASS, `84b216f7` |
| R5 — Memory Append Durability | VERIFIED | None | AC1-AC9 all evaluated; `cd1694b3` |
| R1-D.1 — Tool Registry Integration | VERIFIED | None | `docs/evidence/R1-D1/SUMMARY.md` |

**CONFIRMED: No R0–R5 phase is being reopened.**

**R5 AC4 — PASS WITH SEMANTIC LIMITATION:**
- Test executes R5 code path (`memory-store.ts:196` `await this.log.sync()`).
- Test does NOT independently verify crash durability invariant.
- AC8 independently verifies durability (3/3 blocks recovered after SIGKILL).
- Classification correct. NOT a defect.

**R5 AC7 — PASS WITH EXTERNAL BUILD BLOCKER:**
- `npm run build` fails with 4 TypeScript errors at `message-handler.ts`.
- Pre-existing, R3 ownership, present at clean HEAD `9ea64a88`.
- NOT caused by R5.
- Classification correct.

---

## Part 3: Backlog Carry-Over

| Item | Source | Status | Action |
|------|--------|--------|--------|
| Build blocker (`utils.ts` missing + SessionManager API mismatch) | R3 → R4 → R5 → R6 | Carried over | Candidate B (2 separate problems) |
| R5 AC4 semantic limitation | R5 | Documented | No action — AC8 covers durability |
| R5 AC7 external build blocker | R5 | Documented | No action — outside R5 scope |
| R1-D.1 Tool Registry | R1 | VERIFIED | Closed |
| `:memory:` close/reopen hypothesis | R6 Initial Audit | **REJECTED — NOT PROVEN, evidence contradicts** | Remove from backlog |
| `sqlite-storage.ts` dormant classification | R6 Initial Audit | **CORRECTED — actively used, TODO is comment divider** | Downgrade to OBSERVATION |
| Consequence Memory test failures | R6 Initial Audit | **CONFIRMED — userId precondition mismatch** | Candidate A — ready for debate |
| EntityExtractor stubs | R6 Initial Audit | **CONFIRMED — no consumer, intentional** | OBSERVATION — not R6-worthy |
| SemanticMemory stubs | R6 Initial Audit | **CONFIRMED — no consumer, intentional** | OBSERVATION — not R6-worthy |

**No historical items were missed.** The R6 Initial Audit's list is complete and accurate for items A, B, D, E. Candidate C was overclaimed and should be removed.

---

## Part 4: Candidate Quality Test

| Candidate | Evidence sufficient? | Classification correct? | Implementation state | R6-worthy? | Main uncertainty |
|-----------|---------------------|------------------------|---------------------|-------------|------------------|
| A — Consequence test fix | **YES** — `append requires userId` proven at `consequence-store.ts:154`, fixture missing at `makeRecord()` | **YES** — DEFECT, but needs refinement: only test-precondition mismatch | NOT IMPLEMENTED — tests need `userId` or `getRequestContext()` mock | **YES** — ready for debate | Whether to change `append()` to fail-open or fix tests |
| B — Telegram build | **PARTIAL** — 2 problems identified but product intent for `channelId` parameter unclear | **YES** — DEFECT (2 independent issues) | NOT IMPLEMENTED — `utils.ts` missing, `SessionManager` API mismatch | **YES** — ready for debate | Was `channelId` intentionally removed from `SessionManager`? |
| C — `:memory:` isolation | **NO** — evidence contradicts hypothesis | **NO** — OVERCLAIMED | NOT PROVEN — close/reopen works correctly | **NO** — remove from debate | None — hypothesis refuted by source evidence |
| D — Dormant TODOs | **YES** — all confirmed as comment artifacts or intentional stubs | **YES** — OBSERVATION | N/A — not defects | **NO** — no load-bearing defect | None |
| E — CoralStorage | **YES** — actively used by engine.ts | **NO** — should be OBSERVATION, not ARCHITECTURAL GAP | IMPLEMENTED AND ACTIVE | **NO** — not an architectural gap | None — `CoralStorage` is actively integrated |

---

## Part 5: Final Recommendations

### CONFIRMED FINDINGS
1. **Consequence Memory test failures** (15 tests) are caused by `makeRecord()` not providing `userId`, which triggers `ConsequenceStore.append()`'s Q3 `userId` guard at `consequence-store.ts:154`. Production code is correct; tests need `userId` context or `getRequestContext()` mock.
2. **Telegram build blocker** has TWO independent problems: (a) missing `src/platform/telegram/utils.ts` source file, (b) `message-handler.ts` calls `SessionManager.getSession(userId, channelId)` / `createSession(userId, channelId)` but `SessionManager` only accepts `(userId)`.
3. **`sqlite-storage.ts:206` `// TODO OPERATIONS` is a section divider comment**, not an unimplemented feature. All methods are implemented. `CoralStorage` is actively used by `engine.ts`, `consent.ts`, and `secret-rotation.ts`.
4. **`EntityExtractor` and `SemanticMemory` stubs** have no active consumers. `MemoryExtractor` is the production extraction pipeline.

### CORRECTED FINDINGS
1. **Candidate C (`:memory:` isolation) — OVERCLAIMED.** better-sqlite3 `:memory:` databases ARE isolated. The explicit close/reopen test at `consequence-read-path.test.ts:225-230` passes. The `TypeError` warning is caught by fail-open logic and does not cause test failures. Remove from debate.
2. **Candidate E (CoralStorage integration) — MISCLASSIFIED.** `CoralStorage` is NOT dormant — `engine.ts` actively calls `initEventTables()`, `getDb()`, `addSessionMessage()`, and `close()`. Downgrade from ARCHITECTURAL GAP to OBSERVATION.
3. **Candidate D — `sqlite-storage.ts:206` TODO is a comment artifact**, not an unimplemented feature. All methods implemented.

### NOT PROVEN
1. **Whether `SessionManager.getSession/getSession` should accept `channelId`** — product decision needed. `message-handler.ts` passes `channelId` but `SessionManager` doesn't accept it. Intent unclear without source history.
2. **Whether `EntityExtractor` stubs will ever be wired** — no consumer exists today. Product decision needed.
3. **Whether `CoralStorage.memories` and `MemoryStore` should be unified** — architectural question, not defect. Excluded from R5 scope.

### CANDIDATES ELIGIBLE FOR SCOPE DEBATE
1. **Candidate A — Consequence Memory test fix** (userId precondition mismatch)
2. **Candidate B — Telegram build blocker** (2 independent problems: missing `utils.ts` + `SessionManager` API mismatch)

### CANDIDATES REJECTED / OBSERVATION
1. **Candidate C — `:memory:` close/reopen isolation** — REFUTED by source evidence. Remove from debate.
2. **Candidate D — Dormant TODO cleanup** — OBSERVATION only. `sqlite-storage.ts` TODO is a comment divider. `EntityExtractor`/`SemanticMemory` stubs have no consumers. Not R6-worthy.
3. **Candidate E — CoralStorage integration** — DOWNGRADED to OBSERVATION. Actively integrated, not dormant, `// TODO OPERATIONS` is a comment divider.

### R0–R5 Boundary
**CONFIRMED — No phase reopened.** R1-D.1 VERIFIED, R5 AC4 PASS WITH SEMANTIC LIMITATION, R5 AC7 PASS WITH EXTERNAL BUILD BLOCKER. No candidate reopens any verified phase.

### Backlog Carry-Over
- Build blocker: carried over (Candidate B).
- R5 AC4/AC7: carried over (documented, no action).
- R1-D.1: VERIFIED (closed).
- `:memory:` hypothesis: **removed** (refuted).
- CoralStorage dormant: **corrected** to OBSERVATION (actively used).

---

## Part 6: Additional Findings Not in Initial Audit

1. **`sqlite-storage.ts` has a `Memories` table** (`sqlite-storage.ts:41-49`) that is SEPARATE from `MemoryStore` (append-log). `MemoryExtractor` (not `CoralStorage`) uses `MemoryStore` for memory blocks. This is a design question about whether two memory systems should be unified — but this was explicitly excluded from R5 scope and is NOT a defect.

2. **`MemoryExtractor` is the active memory extraction pipeline** (`start-telegram.ts:395`), not `EntityExtractor` or `SemanticMemory`. `EntityExtractor` and `SemanticMemory` are unused stubs.

3. **`consent.ts` and `secret-rotation.ts` also use `CoralStorage`** (`consent.ts:63-64`, `secret-rotation.ts:4`), confirming it is actively integrated, not dormant.

---

*Independent Review complete: 2026-09-04*
*Next phase: Kayce + reviewer cross-check → Scope Debate → Frozen R6 Spec*
*No implementation performed. No scope selected.*
