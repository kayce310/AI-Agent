# R6 v1 — FROZEN SPECIFICATION
# Coral Agent — Consequence Memory Phase 6

**Phase:** R6 v1 — Frozen Specification  
**Date:** 2026-09-04  
**Authority:** Source evidence only; historical artifacts are intent evidence, not specification.

---

## VERIFICATION MATRIX

| Item | Production change | Test change | Main proof | Out-of-scope |
|------|-----------------|-------------|------------|--------------|
| A | No | Yes (fixtures only) | consequence-phase3 + consequence-read-path pass userId precondition | Consequence production contract |
| B1 | Yes (restore one module) | As needed | npm run build: B1 error gone, B2 errors remain | B2, SessionManager contract |
| R6-C | No | Yes (2 new test files) | execFileSync write→verify: guard denies after restart (architecture resolved) | Production bootstrap logic |

---

## SECTION A — CONSEQUENCE TEST FIXTURE

### 1. Problem Statement

Production `ConsequenceStore.append()` requires `userId` — either from `record.userId` field or from request context (`rctx.userId` via AsyncLocalStorage). The guard at `src/core/memory/consequence-store.ts:153-156` throws if neither is present:

```
if (!userId) {
  throw new Error(
    '[Consequence] append requires userId: record.userId hoặc request context (rctx.userId) — không backfill',
  );
}
```

Test fixtures in two suites call `makeRecord()` which does NOT provide `userId`. No request context exists in test environment. All `append()` calls in both test files therefore hit this guard.

### 2. Current Source-of-Truth

**Evidence — FACT:** `src/core/memory/consequence-store.ts:153-156`  
Guard is non-negotiable production enforcement.

**Evidence — FACT:** `tests/consequence-phase3.test.ts:25-38`  
`makeRecord()` returns record with NO `userId` field.

**Evidence — FACT:** `tests/consequence-read-path.test.ts:28-41`  
`makeRecord()` returns record with NO `userId` field.

**Evidence — FACT:** `tests/consequence-phase3.test.ts:52-54, 63-65, 75-77, 103-106, 124-125, 144, 162-164`  
`store.append()` called WITHOUT `userId` in record.

**Evidence — FACT:** `tests/consequence-read-path.test.ts:55-57, 67-68, 75, 167, 180, 195, 210, 225, 237-238, 252-256`  
`store.append()` called WITHOUT `userId` in record.

**Evidence — FACT:** R6 Independent Review confirmed: failures occur at append precondition, not `:memory:` isolation.

### 3. Existing Behavior

Two test suites fail at `append()` precondition because `userId` is absent.

### 4. Required Change

Add `userId` field to `makeRecord()` output in both test files.

**Both `makeRecord()` functions currently return:**
```typescript
{
  id: `rec-${Math.random().toString(36).slice(2)}`,
  createdAt: Date.now(),
  sessionId: 's1',
  taskId: 't1',
  context: { tags: ['tool_result'] },
  action: { toolName: 'some_tool' },
  outcome: 'fail',
  evidenceRef: { cycle: 1, checkpointId: 't1' },
  reusePolicy: 'record_only',
  // ← userId MISSING
}
```

**Required:** Add `userId: 'test-user'` (or equivalent stable string) to returned object. The value does not need to match any real user — it only needs to satisfy the non-empty string guard.

### 5. Files Allowed to Change

- `tests/consequence-phase3.test.ts` — fixture factory `makeRecord()` only
- `tests/consequence-read-path.test.ts` — fixture factory `makeRecord()` only

### 6. Files Forbidden to Change

- `src/core/memory/consequence-store.ts`
- `src/core/memory/consequence-read-path.ts`
- `src/core/memory/consequence-types.ts`
- Any other source file
- Any other test file

### 7. Functional Invariant

Production `ConsequenceStore.append()` guard at line 153 MUST remain unchanged. The test fix is fixture-only — production contract is not modified.

### 8. Verification Method

1. Run `npm test -- tests/consequence-phase3.test.ts` — all tests pass
2. Run `npm test -- tests/consequence-read-path.test.ts` — all tests pass
3. Both suites: userId-related failures are eliminated; behavior assertions (failCountWindow, HITL, block allowlist, cross-session, etc.) remain intact

### 9. Failure Interpretation

- If tests still fail after userId is added → DEBATE REQUIRED, stop
- If any assertion unrelated to userId breaks → REVERT, DEBATE REQUIRED
- If `append()` throws on existing test data after change → REVERT

### 10. Out-of-Scope Boundary

- Does NOT fix ConsequenceStore production contract
- Does NOT add `userId` to production call sites
- Does NOT modify `getRequestContext()` behavior
- Does NOT change any `reusePolicy`, `HITL_THRESHOLD`, or `BLOCK_ALLOWLIST` values

### 11. Evidence References

| Evidence | Source |
|----------|--------|
| Guard at append | `src/core/memory/consequence-store.ts:153-156` |
| phase3 makeRecord | `tests/consequence-phase3.test.ts:25-38` |
| read-path makeRecord | `tests/consequence-read-path.test.ts:28-41` |
| Independent review | R6 Initial Audit + Independent Review |

### 12. Ambiguities

None. `userId` is mandatory, `makeRecord` omits it, append throws. Fix is deterministic.

---

## SECTION B1 — MISSING TELEGRAM UTILS

### 1. Problem Statement

`src/platform/telegram/message-handler.ts:6` imports `getChannelIdFromChatId` from `./utils.js`:

```typescript
import { getChannelIdFromChatId } from './utils.js';
```

The source file `src/platform/telegram/utils.ts` does not exist. TypeScript compilation fails:

```
error TS2307: Cannot find module './utils.js' or its corresponding type declarations.
```

The compiled artifact `dist/platform/telegram/utils.js` exists and is part of the current working build, but the TypeScript source is absent.

### 2. Current Source-of-Truth

**Evidence — FACT:** `src/platform/telegram/message-handler.ts:6` imports `getChannelIdFromChatId` from `./utils.js`.

**Evidence — FACT:** `src/platform/telegram/utils.ts` does NOT exist.

**Evidence — FACT:** `dist/platform/telegram/utils.js` exists and contains:
```javascript
export function getChannelIdFromChatId(chatId) {
    return chatId;
}
```

**Evidence — FACT:** `dist/platform/telegram/utils.d.ts` exists and declares:
```typescript
export declare function getChannelIdFromChatId(chatId: string): string;
```

**Evidence — INFERENCE:** The dist artifact was compiled from a source that existed previously. The source was subsequently removed. The compiled output is the only behavioral evidence available.

**Evidence — INFERENCE:** The function's behavior (identity pass-through `chatId → chatId`) suggests it was a placeholder or no-op at time of compilation.

### 3. Existing Behavior

Build fails with TS2307 — missing module error.

### 4. Required Change

Create `src/platform/telegram/utils.ts` that compiles to equivalent output matching the existing dist artifact.

**Minimum implementation:**
```typescript
/**
 * Derive channel ID from Telegram chat ID.
 * @param chatId — Telegram chat identifier
 * @returns channel ID string
 */
export function getChannelIdFromChatId(chatId: string): string {
  return chatId;
}
```

**Specification is constrained to identity pass-through ONLY because that is the only behavior supported by dist evidence.** Historical intent may have been different, but dist is the binding source-of-truth for implementation.

### 5. Files Allowed to Change

- `src/platform/telegram/utils.ts` — new file creation only

### 6. Files Forbidden to Change

- `src/platform/telegram/message-handler.ts` (except as noted in section 4 — DEBATE REQUIRED if needed)
- `src/platform/telegram/session-manager.ts`
- Any other file for B1 purposes

### 7. Functional Invariant

- After creation, `dist/platform/telegram/utils.js` output is equivalent to current dist artifact.
- `message-handler.ts` can import and call `getChannelIdFromChatId` without build error.
- The function returns the input `chatId` unchanged (pass-through).

### 8. Verification Method

1. `npm run build` — TS2307 error disappears (1 of 4 total build errors eliminated)
2. The remaining 3 errors (TS2554 at lines 66, 69, 91 in message-handler.ts — SessionManager B2) MUST remain
3. `dist/platform/telegram/utils.js` output verified equivalent to current dist artifact
4. `dist/platform/telegram/utils.d.ts` matches expected declaration

### 9. Failure Interpretation

- If build error TS2307 persists → B1 verification FAILED
- If ANY new error introduced beyond TS2307 → REVERT
- If dist output differs from existing artifact → REVERT

### 10. Out-of-Scope Boundary

- B1 does NOT fix B2 (SessionManager API mismatch)
- B1 does NOT change `getSession(userId)`, `createSession(userId)`, `updateLastActivity(userId)` signatures
- B1 does NOT fix message-handler.ts calls at lines 66, 69, 91
- B1 does NOT change SessionManager multi-session architecture

### 11. Evidence References

| Evidence | Source |
|----------|--------|
| Import in message-handler | `src/platform/telegram/message-handler.ts:6` |
| Missing source | `src/platform/telegram/utils.ts` (file not found) |
| Compiled artifact | `dist/platform/telegram/utils.js` |
| Type declaration | `dist/platform/telegram/utils.d.ts` |
| Build errors | `npm run build` output |

### 12. Ambiguities

**Ambiguity 1 — Function intent:** The identity pass-through in dist could be:
- (a) Intentional no-op placeholder
- (b) A stub awaiting real implementation
- (c) A refactored-out stub that once did something else

**Resolution:** Specification constrains to dist-equivalent behavior only. Historical intent is NOT binding specification. If real business logic is needed, that is a separate scope expansion request (DEBATE REQUIRED).

**Ambiguity 2 — Why source was deleted:** Not relevant to specification. Current state is the binding constraint.

---

## SECTION R6-C — RESTART READ-PATH CONTINUITY TEST

### 1. Problem Statement

Production bootstrap at `src/core/engine/engine.ts:539-545` registers the consequence read path:

```typescript
// ═══ CONSEQUENCE MEMORY (ADR-003 Phase 1) ═══
registerConsequenceWritePath();
log.info('[Consequence] write path registered (ADR-003 Phase 1)');

// ═══ CONSEQUENCE MEMORY (ADR-003 Phase 2) ═══
registerConsequenceReadPath();
log.info('[Consequence] read path registered (ADR-003 Phase 2)');
```

This confirms the read-path registration is part of production bootstrap. However, no dedicated test proves that:
1. Consequence data survives process restart
2. Engine initialization re-registers the read path after restart
3. A subsequent `tool:call` reaches the guard and produces the expected decision

### 2. Current Source-of-Truth

**Evidence — FACT:** `src/core/engine/engine.ts:539-545` — read path registration in engine init.

**Evidence — FACT:** `src/core/memory/consequence-read-path.ts` exports `registerConsequenceReadPath`.

**Evidence — FACT:** `src/core/hooks.ts` exports `globalHooks` — event emitter used for `tool:call` hook.

**Evidence — FACT:** `tests/consequence-read-path.test.ts` tests read-path guard behavior but ONLY within a single in-process lifecycle (same `beforeEach` / `afterEach`).

**Evidence — NOT PROVEN:** That read-path registration survives a process restart.

### 3. Existing Behavior

Existing tests exercise read-path guard within a single Node.js process lifecycle. Restart continuity is NOT tested.

### 4. Required Change

**Create two files:**

1. `tests/consequence-restart-continuity-helper.ts` — CLI helper (entrypoint for child processes)
2. `tests/consequence-restart-continuity.test.ts` — test harness

**Helper (`consequence-restart-continuity-helper.ts`):**
- CLI entrypoint: receives `mode` ('write' | 'verify') and `dbPath` as args
- **write mode:**
  - Create `ConsequenceStore(dbPath)` — explicit path passed as arg
  - Set up request context: `requestContext.run(ctx, async () => { ... })` with userId
  - Write fail consequence: `store.append({ action: { toolName: 'dangerous_tool' }, outcome: 'fail', reusePolicy: 'block', userId: 'alice' })`
  - Close: `store.close()` — synchronous SQLite WAL flush
  - Emit JSON to stdout: `{ ok: true, toolName, outcome }`
- **verify mode:**
  - Create `ConsequenceStore(dbPath)` — same path
  - Initialize `Engine()`, call `await engine.init()`
  - Register read path: `registerConsequenceReadPath({ store })`
  - Set up request context for userId
  - Perform lookup: `store.findRelevantForToolCall({ toolName: 'dangerous_tool', sessionId })`
  - Call `resolveDecision(lookup, { toolName: 'dangerous_tool', blockAllowlist: ['dangerous_tool'], enforceBlock: true })`
  - Emit JSON to stdout: `{ allowed: boolean, action: string, reasonCode }`

**Test harness (`consequence-restart-continuity.test.ts`):**
```
describe('R6-C — restart read-path continuity', () => {
  it('Process A write → Process B restart → guard decision reflects persisted data', () => {
    // 1. runChild('write') — Process A
    // 2. execFileSync guarantees process exit = write complete
    // 3. runChild('verify') — Process B
    // 4. assert: allowed = false (block policy from Process A)
    // 5. assert: reasonCode = 'consequence_block_allowlist'
  });
});
```

**Lifecycle:**
```
Process A (write)                    Process B (verify)
  │                                      │
  ├─ new ConsequenceStore(path)          ├─ new ConsequenceStore(path)
  ├─ requestContext.run()                ├─ new Engine()
  ├─ append(fail, block policy)         ├─ engine.init()
  ├─ store.close() [sync flush]         ├─ registerConsequenceReadPath({store})
  ├─ stdout JSON                        ├─ requestContext.run()
  └─ exit                               ├─ findRelevantForToolCall()
                                       ├─ resolveDecision() → block
                                       ├─ stdout JSON
                                       └─ exit
```

**Observable assertions:**
- Process A: write succeeds
- Process B: guard denies (block policy enforced)
- Process B: reasonCode = 'consequence_block_allowlist'

### 5. Files Allowed to Change

- `tests/consequence-restart-continuity-helper.ts` — NEW FILE, CLI helper (write + verify modes)
- `tests/consequence-restart-continuity.test.ts` — NEW FILE, test harness only

### 6. Files Forbidden to Change

- `src/core/engine/engine.ts` — NO changes
- `src/core/memory/consequence-store.ts` — NO changes
- `src/core/memory/consequence-read-path.ts` — NO changes
- `src/core/hooks.ts` — NO changes
- `src/core/request-context.ts` — NO changes
- Any other production source file for R6-C purposes

### 7. Functional Invariant

- Production engine initialization is NOT modified
- Production read-path registration is NOT modified
- Production `tool:call` guard logic is NOT modified

### 8. Verification Method

1. New test file added to test suite
2. `npm test` runs the new test
3. Test passes — restart continuity proven
4. Existing `consequence-read-path.test.ts` and `consequence-phase3.test.ts` still pass (no regression)

### 9. Failure Interpretation

- If test cannot be written without modifying production code → DEBATE REQUIRED
- If test fails on restart detection step → report exactly what failed, do not paper over
- If test reveals production defect → STOP, DEBATE REQUIRED

### 10. Out-of-Scope Boundary

- R6-C does NOT modify production engine initialization
- R6-C does NOT add test hooks or callbacks to production code
- R6-C does NOT change consequence store format or schema
- R6-C does NOT verify write-path restart continuity (separate concern)

### 11. Evidence References

| Evidence | Source |
|----------|--------|
| Read-path registration | `src/core/engine/engine.ts:539-545` |
| Read-path exports | `src/core/memory/consequence-read-path.ts` |
| Hook system | `src/core/hooks.ts` |
| Existing read-path test | `tests/consequence-read-path.test.ts` |
| Existing restart pattern | `tests/consequence-restart.test.ts:34-41` |
| Persistence path | `src/core/memory/consequence-store.ts:30-31,94` |
| Engine bootstrap | `src/core/engine/engine.ts:203,237-240,539-545` |
| Production startup | `src/scripts/start-telegram.ts:353-355` |
| Request context | `src/core/request-context.ts:53` |

### 12. Architecture — RESOLVED FROM SOURCE

#### Q1 — Persistence Path

**FACT:** `src/core/memory/consequence-store.ts:30-31`
```
const DB_DIR = path.resolve(process.cwd(), 'data');
const DB_PATH = path.join(DB_DIR, 'consequences.db');
```
Production persistence path = `process.cwd()/data/consequences.db` — deterministic, fixed path.

**FACT:** `src/core/memory/consequence-store.ts:94`
```
constructor(dbPath: string = DB_PATH)
```
Constructor accepts optional override. Default = `DB_PATH`. Test can pass custom path.

**FACT:** `src/core/memory/consequence-store.ts:452-454`
Module-level singleton `_instance` created on first `getConsequenceStore()` call.

**→ Conclusion:** Test uses temporary file (e.g., `data/consequences-restart-test.db`) passed as constructor param. Production path is independent.

#### Q2 — Engine Bootstrap

**FACT:** `src/core/engine/engine.ts:203` — `constructor(registry?: ProviderRegistry)`  
Optional dependency injection. Minimal instantiation with no args.

**FACT:** `src/core/engine/engine.ts:237-240`
```
async init(): Promise<void> {
  setEngineInstance(this);
  this.registry.loadFromConfig();
  await evolutionEngine.init();
```
`init()` is async. Gateway/Telegram wired AFTER `init()` in `start-telegram.ts:355-372`.

**FACT:** `src/core/engine/engine.ts:539-545` — `registerConsequenceReadPath()` called LAST in init.

**FACT:** `src/scripts/start-telegram.ts:353-355` — Production startup:
```
const engine = new Engine();
await engine.init();
engineInstance = engine;
```

**→ Conclusion:** Child process can replicate production bootstrap via `new Engine()` + `await engine.init()`. No Telegram/gateway required. All init side effects are in-memory/file-based (no network).

#### Q3 — Real Restart Architecture

**FACT:** `tests/consequence-restart.test.ts:34-41` — Existing pattern:
```typescript
function runChild(mode: 'write' | 'verify', dbPath: string): AidJson {
  const stdout = execFileSync(
    process.execPath,
    [path.join(REPO, 'node_modules', 'tsx', 'dist', 'cli.mjs'), HELPER, mode, dbPath],
    { cwd: REPO, encoding: 'utf8', timeout: 60_000, stdio: ['ignore', 'pipe', 'pipe'] },
  );
  return JSON.parse(stdout.trim().split('\n').pop() ?? '{}') as AidJson;
}
```

**Pattern:** `execFileSync` + `tsx` + `HELPER` (CLI helper file) + mode arg + JSON stdout. `execFileSync` blocks parent until child exits (guarantees write completion).

**FACT:** `tests/consequence-restart.test.ts:47-54`
```
beforeAll(() => {
  writeOut = runChild('write', DB_FILE);
  readOut = runChild('verify', DB_FILE);
});
```
Lifecycle: Process A (write) → exit → Process B (verify), sequential.

**FACT:** `tests/consequence-restart.test.ts:19`
```
const DB_FILE = path.join(REPO, 'data', 'consequences-restart-test.db');
```
Temp DB file in `data/` directory.

**FACT:** `tests/consequence-restart.test.ts:26-30` — expected JSON shape:
```
decisions?: {
  fail?: { allowed: boolean; hint?: {...} | null };
  success?: { allowed: boolean; hint?: {...} | null };
};
```

**→ Process A (write mode):**
- Entrypoint: `tsx HELPER write dbPath`
- Consequence write: `new ConsequenceStore(dbPath).append({...})`
- Persistence: `store.close()` — synchronous SQLite WAL flush
- Exit: process exits naturally after write
- Observable: stdout JSON

**→ Process B (verify mode):**
- Entrypoint: `tsx HELPER verify dbPath`
- Fresh store: `new ConsequenceStore(dbPath)` — singleton re-created
- Engine init: `new Engine()` → `await engine.init()`
- Read-path registered: `registerConsequenceReadPath({ store })`
- Tool call: `await globalHooks.emit('tool:call', {...})`
- Observable: guard decision in JSON stdout

**→ Persistence confirmation:** SQLite `close()` is synchronous WAL flush. Parent blocks via `execFileSync` until child confirms write complete.

**→ NOTE:** `tests/consequence-restart-helper.ts` is MISSING from current tree (expected by `consequence-restart.test.ts` at line 18). This is an existing test in the repo with a missing dependency. R6-C must create its own helper file, following this established pattern but with R6-C-specific assertions.

**→ Conclusion:** Architecture fully specified. R6-C test follows same pattern with `execFileSync` + `tsx` + helper file. No polling, no setTimeout, no test-only callbacks.

---

## ACCEPTANCE CRITERIA

### Item A

| AC | Criterion | Pass condition |
|----|-----------|----------------|
| A1 | `makeRecord()` in phase3 test provides `userId` | `userId` field present in returned object |
| A2 | `makeRecord()` in read-path test provides `userId` | `userId` field present in returned object |
| A3 | phase3 suite passes | `npm test -- tests/consequence-phase3.test.ts` exit 0 |
| A4 | read-path suite passes | `npm test -- tests/consequence-read-path.test.ts` exit 0 |
| A5 | Production guard unchanged | `src/core/memory/consequence-store.ts:153-156` unchanged |
| A6 | B2 unaffected | No changes to session-manager.ts or message-handler.ts |

### Item B1

| AC | Criterion | Pass condition |
|----|-----------|----------------|
| B1-1 | `src/platform/telegram/utils.ts` created | File exists, compiles |
| B1-2 | `npm run build` — TS2307 gone | Error count: 4 → 3 |
| B1-3 | B2 errors remain | Exactly 3 TS2554 errors at lines 66, 69, 91 |
| B1-4 | dist output equivalent | `dist/platform/telegram/utils.js` matches existing artifact |
| B1-5 | Function behavior | `getChannelIdFromChatId(x)` returns `x` |

### Item R6-C

| AC | Criterion | Pass condition |
|----|-----------|----------------|
| R6-C1 | New test file created | `tests/consequence-restart-continuity.test.ts` exists |
| R6-C2 | Separate process restart proven | Process exit + new PID verified |
| R6-C3 | Read-path registered post-restart | Guard decision observable |
| R6-C4 | Guard reflects persisted data | Expected decision from pre-restart records |
| R6-C5 | No production code modified | git diff on src/ shows no changes |
| R6-C6 | Existing suites still pass | phase3 + read-path tests still exit 0 |

---

## CHANGE BUDGET

| Item | Budget | Allowable |
|------|--------|-----------|
| A | Test fixtures only | ✅ `makeRecord()` add one field |
| B1 | One new source module | ✅ `src/platform/telegram/utils.ts` |
| R6-C | Two new test files + harness | ✅ helper + test (pattern from existing `consequence-restart.test.ts`) |

**SCOPE EXPANSION — NOT AUTHORIZED if budget exceeded.**

---

## FINAL FREEZE REPORT

### R6 v1 Frozen Scope

```
A    = FROZEN
B1   = FROZEN
R6-C = FROZEN — 3 ambiguities resolved via source inspection
B2   = DEFERRED / DEBATE REQUIRED
```

### Production Files Allowed

- `src/platform/telegram/utils.ts` (B1 — new)

### Test Files Allowed

- `tests/consequence-phase3.test.ts` (A — fixture only)
- `tests/consequence-read-path.test.ts` (A — fixture only)
- `tests/consequence-restart-continuity-helper.ts` (R6-C — NEW)
- `tests/consequence-restart-continuity.test.ts` (R6-C — NEW)

### Forbidden Changes

- `src/core/memory/consequence-store.ts` — NO changes
- `src/core/memory/consequence-read-path.ts` — NO changes
- `src/core/engine/engine.ts` — NO changes for R6-C
- `src/platform/telegram/message-handler.ts` — NO changes for B1
- `src/platform/telegram/session-manager.ts` — NO changes (B2 deferred)
- Any other production file

### Open Decisions

Only **B2** remains open:
- `getSession(userId, channelId)` caller vs `getSession(userId)` callee mismatch
- `createSession(userId, channelId)` caller vs `createSession(userId)` callee mismatch
- `updateLastActivity(userId, channelId)` caller vs `updateLastActivity(userId)` callee mismatch

No other ambiguities identified in A, B1, or R6-C.

### Specification Status

**FROZEN — READY FOR IMPLEMENTATION**

---

## AUTHORITY ACKNOWLEDGMENT

This specification was generated from direct source evidence. All factual statements are labeled FACT with file:line evidence, or INFERENCE where derivable, or NOT PROVEN where unresolvable. No historical implementation was blindly copied. B1 uses dist artifact as behavioral proxy for the missing source. R6-C identifies 3 ambiguities that may require DEBATE before implementation proceeds.

---

**STOP — NO IMPLEMENTATION.**

Await Kayce review and authorization for implementation phase.
