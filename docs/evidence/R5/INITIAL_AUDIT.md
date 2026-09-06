# R5 INITIAL AUDIT — CORRECTED

**Date:** 2026-09-04
**Correction:** 2026-09-04 — Corrected persistence vs retrieval vs restart bootstrap distinctions
**Scope:** Determine what R5 should be, based on current source code only
**Method:** Source-code audit + git forensics + test coverage inventory. No implementation, no refactor, no test changes.

---

## 1. Executive Summary

This audit examined the codebase to determine what R5 should address. The codebase contains **two parallel, never-integrated memory architectures**, plus a third (largely dormant) storage layer.

**Consequence Memory (ADR-003):** Durable persistence and cross-session retrieval are both IMPLEMENTED and verified by source evidence and tests. The read-path guard is re-registered on every process restart via `engine.init()` (called from `start-telegram.ts:355`). There is no gap in restart read-path continuity based on source evidence — however, no dedicated test verifies the restart-read-path-continuity path.

**Legacy Memory (`globalMemoryStore`):** Uses an in-memory Map backed by an append-log + periodic JSON snapshot. The append-log is durable, but the in-memory Map may lose recent writes on crash between flushes (5s debounce). The append-log replays on `init()`, so boot-from-disk is durable.

**Audit Conclusion: R5 — NOT YET DEFINED**

Evidence does not yet support a single clear R5 scope. Several candidates exist but none has been confirmed as the official R5. The SCOPE DEBATE step is required before R5 can be defined.

---

## 2. Current Architecture Relevant to R5

The codebase has three distinct storage/memory subsystems operating in parallel:

### 2.1 Consequence Memory (ADR-003) — `src/core/memory/consequence-*.ts`

| File | Lines | Purpose |
|------|-------|---------|
| `consequence-types.ts` | 102 | Schema: context → action → outcome → evidenceRef → lesson → reusePolicy |
| `consequence-store.ts` | 458 | Single-writer SQLite store (`:memory:` or `data/consequences.db`) |
| `consequence-write-path.ts` | 310 | Writes on `tool:result` hook; records fail/success/gate-reject |
| `consequence-read-path.ts` | 393 | Reads on `tool:call` hook; resolves policy → allow/suggest/HITL/block |
| `consequence-redact.ts` | 111 | Redacts sensitive keys in argsDigest |
| `consequence-config.ts` | 54 | Env-driven thresholds (Phase 3b) |

**Status: PRODUCTION, finalized v1** (commit `f902a65e`, "feat(memory): finalize Consequence Memory v1"). Full write + read path with real SQLite persistence, 9 dedicated test files, and a real cross-process restart test.

### 2.2 Legacy/Coral Memory (Waku-inspired) — `src/core/memory/memory-*.ts`

| File | Lines | Purpose |
|------|-------|---------|
| `memory-store.ts` | 583 | In-memory Map + append-log persistence; `globalMemoryStore` singleton |
| `memory-log.ts` | 544 | Append-log (O(1) write, snapshot, rotation) — used by `memory-store.ts` |
| `memory-temporal.ts` | 356 | Time-indexed block storage backed by MemoryLog |
| `memory-facade.ts` | 92 | Unified interface over `globalMemoryStore` |
| `MemoryExtractor.ts` | 312 | Event-driven extraction: EventBus → MemoryStore |
| `MemoryItem.ts` | 119 | Data model: fact/belief/preference/skill/summary with confidence/decay |
| `MemorySearch.ts` | 182 | TF/IDF-like keyword search |
| `memory-consolidation.ts` | 185 | Batch LLM extraction of facts+episodes every N messages |
| `memory-retrieval-gate.ts` | 87 | Heuristic gate: when to recall memory |
| `memory-api.ts` | 233 | REST endpoints |

**Status: Used in `engine.ts`** via `globalMemoryStore`. The append-log is durable; the in-memory Map may lose recent writes on crash.

### 2.3 CoralStorage (SQLite, largely dormant) — `src/core/memory/sqlite-storage.ts`

Single `CoralStorage` singleton with `memories`, `sessions`, `todos` tables + FTS5. Types exported but **not actively imported** in the production runtime (no import in `engine.ts` or `gateway/index.ts`).

---

## 3. State / Memory Inventory

### A1. All state types in the system:

| State Type | Location | Owner | Persistence | Lifecycle |
|---|---|---|---|---|
| ConsequenceRecord | `data/consequences.db` (SQLite) | ConsequenceStore (singleton) | Durable (WAL mode) | Append-only; record_only → suggest (monotonic); survives restart |
| MemoryBlock (legacy) | `knowledge/memory-store/` (JSON + append-log) | globalMemoryStore (singleton) | Append-log durable; in-memory Map may lose writes on crash | Add-only; TTL eviction; survives restart via log replay |
| MemoryItem (cognitive) | `data/memories.json` (JSON, debounced) | MemoryStore (Map-based) | Debounced JSON write (5s) | CRUD with confidence decay; active/dormant/reinforced/decaying |
| Checkpoint | `knowledge/checkpoints/` (JSON files) | CheckpointStore | Durable (fs) | Per-request; cleaned on next request |
| Conversation/session | `data/coral.db` (SQLite sessions table) | CoralStorage | Durable | Per-session; FTS-indexed |
| Event history | `src/core/events/store.ts` (in-memory) | EventBus | Ephemeral | Per-session; lost on restart |
| Agent events | `AgentEvent` via EventBus | EventBus | Ephemeral | Per-session |
| Temporal memory | `knowledge/memory-temporal/` (append-log) | MemoryTemporal | Durable (append-log) | Add-only; retention/cap enforced on boot |
| Plans | In-memory + `knowledge/plans/` | Plan module | Mixed | Per-request |
| Tool results | Ephemeral | engine.ts | None | Per-cycle |
| Lessons (Consequence) | Stored as `lesson` field in ConsequenceRecord | ConsequenceStore | Durable | Optional text; never used as block condition |

### A2. Memory Architecture Detail

**There are TWO separate, non-integrated memory systems:**

1. **Consequence Memory** (ADR-003): Production, single-writer SQLite, full write/read/HITL path. Records `context → action → outcome → lesson → reusePolicy`. Wired into `engine.ts` via `registerConsequenceWritePath()` and `registerConsequenceReadPath()`.

2. **Legacy Memory** (`globalMemoryStore`): In-memory Map + append-log. Used by `engine.ts` for `saveMessage()` (via MemoryFacade), temporal memory, consolidation, and the `memory` tool. The append-log (`memory-log.ts`) is durable; the in-memory Map may lose recent writes on crash between flushes.

**No integration between them.** Consequence records are not queryable via `globalMemoryStore.query()`. Legacy memory blocks are not accessible via ConsequenceStore. They are parallel architectures.

### A3. Consequence Memory — Persistence vs Retrieval vs Restart Bootstrap

This distinction is the key correction in this audit. Each is independently verified:

| Behavior | Classification | Evidence |
|---------|--------------|----------|
| **Durable persistence** | IMPLEMENTED | `consequence-store.ts:98-99` — SQLite WAL mode; `better-sqlite3` opens `data/consequences.db` on every singleton instantiation; verified across process restart in `tests/consequence-restart.test.ts` |
| **Cross-session retrieval** | IMPLEMENTED | `consequence-store.ts:338-430` — `findRelevantForToolCall()` queries by `toolName`, `argsDigest`, `userId`, `windowMs` (default 7 days); read path at `consequence-read-path.ts:278-384` calls it on every `tool:call` |
| **Restart read-path continuity** | IMPLEMENTED | `engine.ts:545` — `registerConsequenceReadPath()` is called inside `init()`; `init()` is called from `start-telegram.ts:355` on every process startup; only production call site is `engine.ts:545` (verified by exhaustive grep) |
| **Restart read-path continuity test** | IMPLEMENTED BUT NOT VERIFIED | `consequence-restart.test.ts` tests record persistence across restart but does NOT test whether the read-path guard is re-registered — the source code proves re-registration happens (every `init()` call re-registers), but no test directly verifies this specific behavior |

---

## 4. Production Data Flows

### Consequence Memory lifecycle (trace):

```
creation:    tool:result emitted by agent.ts/delegate.ts
             → handler in consequence-write-path.ts
storage:     ConsequenceStore.append() → INSERT INTO consequences (SQLite)
retrieval:   consequence-read-path.ts → store.findRelevantForToolCall()
             → SELECT payload_json FROM consequences WHERE tool_name=? AND created_at>=?
consumption: resolveDecision() → action (allow/suggest/require_hitl/block)
             → setConsequenceHint() → requestContext.consequenceHint
             → buildCycleMessagesWithHint() → injected into agent prompt
update:      recordSuccessOccurrence() → UPDATE occurrence_count, reuse_policy
persistence: SQLite WAL → data/consequences.db
restart:     Process A terminates → Process B starts
             → start-telegram.ts:353 → new Engine()
             → start-telegram.ts:355 → engine.init()
             → engine.ts:539 → registerConsequenceWritePath()
             → engine.ts:545 → registerConsequenceReadPath()
             → ConsequenceStore singleton reopens same data/consequences.db
             → full records restored from disk
             → read-path guard re-registered on globalHooks
             (verified in source; restart read-path test not written)
```

**Source of truth:** `data/consequences.db` (SQLite, WAL mode).
**Derived state:** `consequenceHint` in request context (ephemeral, rebuilt per tool call).
**Cache:** None — reads go directly to SQLite.

### Legacy Memory lifecycle:

```
creation:    globalMemoryStore.add(type, content, opts)
storage:     In-memory Map + append-log (memory-log.ts) + periodic JSON snapshot
retrieval:   globalMemoryStore.query() → keyword + type + tag + session + time filters
consumption: prompt injection; MemoryFacade.getChannelHistory() → UI
update:      updateMemory() (Map + debounced JSON write)
persistence: Debounced setTimeout (5s) → JSON file write; append-log snapshot every 1000 ops
restart:     memory-store.ts:119-133 → init() replays append-log → blocks rebuilt
```

**Source of truth:** Ambiguous — both the in-memory Map and the append-log JSON. The append-log is durable; the in-memory Map may lose writes on crash between flushes.
**Derived state:** `MemoryFacade.getChannelHistory()` reconstructs from blocks.

### Duplicate state / non-durable state risks:

1. **`globalMemoryStore` in-memory Map may lose writes on crash.** The append-log is durable, but writes are accumulated in the in-memory Map and flushed to JSON every 5s (debounce). If the process crashes between flushes, recent append-log entries may have been applied to the Map but the snapshot JSON may not reflect them. On restart, replay restores from the append-log (which IS durable), so boot is safe. The gap is between last flush and crash during runtime.

2. **Two parallel memory stores with no cross-query.** ConsequenceStore (SQLite) and globalMemoryStore (JSON) are independent. A consequence record cannot be queried through the legacy memory query path and vice versa.

3. **Two `MemoryStore` classes with the same name** in the same directory (`memory-store.ts` vs `MemoryStore.ts`).

---

## 5. Consequence Memory Status (detailed)

| Concept | Classification | Evidence |
|---------|--------------|----------|
| context | IMPLEMENTED | `consequence-types.ts:39-46` — `ConsequenceContextSchema` |
| action | IMPLEMENTED | `consequence-types.ts:49-55` — `ConsequenceActionSchema` |
| outcome | IMPLEMENTED | `ConsequenceOutcomeSchema` enum (success/fail/partial/rejected_by_gate) |
| lesson | IMPLEMENTED (optional) | `ConsequenceRecordSchema.lesson: z.string().optional()` (line 88) |
| evidenceRef | IMPLEMENTED | `ConsequenceEvidenceRefSchema` with eventIds/checkpointId/cycle |
| reusePolicy | IMPLEMENTED | `ReusePolicySchema` (suggest/require_hitl/block/record_only) |
| write path | IMPLEMENTED | `consequence-write-path.ts` — `registerConsequenceWritePath()` on `tool:result` hook |
| read path | IMPLEMENTED | `consequence-read-path.ts` — `registerConsequenceReadPath()` on `tool:call` hook |
| HITL integration | IMPLEMENTED | `require_hitl` triggers `hitl.checkAndRequest()` |
| cross-session | IMPLEMENTED | `findRelevantForToolCall()` with `windowMs` default 7 days |
| user isolation | IMPLEMENTED (Q3) | `userId` column added in commit `d1a89c29`; old records excluded from reads |
| success pattern aggregation | IMPLEMENTED (Phase 5) | `recordSuccessOccurrence()` — 1 row per pattern, monotonic policy |
| block enforcement | NOT ENFORCED (design) | `BLOCK_ALLOWLIST: []` (empty), `enforceBlock: false` by default |
| lesson as block condition | NEVER | ADR-000 nguyên tắc 5 explicitly documented in code comments |
| durable persistence | IMPLEMENTED | SQLite WAL; verified in `consequence-restart.test.ts` PHASE 10 |
| restart read-path continuity | IMPLEMENTED | `engine.ts:545` inside `init()` called from `start-telegram.ts:355` on every process start |
| restart read-path test | IMPLEMENTED BUT NOT VERIFIED | `consequence-restart.test.ts` tests persistence; source proves re-registration but no dedicated test for it |

---

## 6. Existing Invariants

### EXISTING INVARIANT:

| Invariant | Evidence |
|-----------|----------|
| Single writer for ConsequenceStore | `consequence-store.ts:6` — "ADR-003 §4.2 — SINGLE-WRITER module. Chỉ module này được ghi/đọc bảng `consequences`" |
| `reusePolicy` is enum, never boolean | `consequence-types.ts:30-36` — `ReusePolicySchema = z.enum([...])` |
| `lesson` never used as block condition | `consequence-types.ts:87` — "OPTIONAL, NEVER used as block condition (ADR-000 nguyên tắc 5)"; multiple code comments |
| Consequence records survive restart | `tests/consequence-restart.test.ts` — real cross-process test with separate V8 isolates |
| ConsequenceStore validates before insert | `consequence-store.ts:161` — `parseConsequenceRecord(stamped)` before INSERT |
| `recordSuccessOccurrence` is idempotent per pattern | `consequence-store.ts:236-238` — SHA256 hash of userId+toolName+argsDigest as deterministic ID |
| `consequenceHint` is ephemeral per request | `agent.ts:596` — `hintRctx.consequenceHint = undefined` after use |
| `BLOCK_ALLOWLIST` empty by default (safe) | `consequence-read-path.ts:55` — `export const BLOCK_ALLOWLIST: string[] = []` |
| `globalMemoryStore` is a singleton | `memory-store.ts:582` — `export const globalMemoryStore = new MemoryStore()` |
| MemoryStore ADD-only pattern | `memory-store.ts:147` — "ADD-only pattern: không update, không delete, chỉ append" |
| Memory consolidation never deletes original blocks | `memory-consolidation.ts:16` — "Consolidation NEVER deletes original blocks (safety)" |
| Read-path registered on every process start | `engine.ts:545` inside `init()`; `init()` called from `start-telegram.ts:355` on every process start; only call site is `engine.ts:545` (grep verified) |

### MISSING INVARIANT (not enforced):

| Invariant | Why it matters | Current behavior |
|-----------|---------------|-----------------|
| Consequence records bounded in time | No TTL on consequences table | Records accumulate indefinitely in SQLite |
| No dedup of fail records across cycles | `buildToolRecord` uses `randomUUID()` for each fail event | Multiple fail records for same tool pattern are created |
| Single source of truth for memory queries | Two parallel stores (ConsequenceStore + globalMemoryStore) | `globalMemoryStore.query()` cannot see ConsequenceStore records |
| MemoryExtractor wired to engine runtime | `MemoryExtractor` only started in `start-telegram.ts`, NOT in `engine.ts` | Event-driven memory extraction NOT active in the main engine |
| `globalMemoryStore` crash-durability for in-memory Map | In-memory Map may lose writes between flushes | Boot-from-disk is safe (append-log replay) but runtime crash gap exists |

### UNCLEAR / NEEDS DEBATE:

| Question | Evidence |
|----------|----------|
| Is `MemoryExtractor.ts` intended for production? | Only wired in `src/scripts/start-telegram.ts:395-396`, NOT in `engine.ts`. May be a legacy module or intentionally scoped to the Telegram path. |
| Is `CoralStorage` (sqlite-storage.ts) production? | Exports types and singleton but grep shows no active import in engine.ts or gateway. |
| Should `knowledge/memory-store/` be the canonical memory or `data/consequences.db`? | Both active. No architectural decision documented in source code. |

---

## 7. Missing / Unclear Invariants

1. **No TTL on Consequence records.** The `consequences` table has no expiration. Records accumulate indefinitely.
2. **No dedup of fail records across cycles.** `buildToolRecord` generates a new UUID per fail event — same fail pattern produces multiple records.
3. **MemoryExtractor not wired to engine.** Only started via `start-telegram.ts`; engine.ts uses `globalMemoryStore.add()` directly.
4. **No unified memory query.** Cannot query both ConsequenceStore and globalMemoryStore through a single interface.
5. **`globalMemoryStore` in-memory crash gap.** Append-log is durable; boot-from-disk is safe; runtime crash may lose Map writes between flushes.

---

## 8. Test Coverage

### Consequence Memory tests (dedicated):

| Test file | What it covers | Type |
|-----------|---------------|------|
| `tests/consequence-store.test.ts` | append, getById, listRecent, listByTool, filter, reusePolicy enum, zod validation | unit |
| `tests/consequence-write-path.test.ts` | write path registration, tool result handling, record success/fail, plan terminal, gate reject | unit |
| `tests/consequence-read-path.test.ts` | read path guard, resolveDecision, suggest/HITL/block, hints | unit |
| `tests/consequence-e2e.test.ts` | Full runtime chain: WRITE → STORE → READ → DECISION → HINT → PROMPT → TOOL BEHAVIOR | integration |
| `tests/consequence-success.test.ts` | Success pattern aggregation, occurrence count, policy escalation | unit |
| `tests/consequence-user-isolation.test.ts` | User isolation — A's fails don't affect B's policy | unit |
| `tests/consequence-phase3.test.ts` | Phase 3 behavior (HITL, config, block allowlist) | unit |
| `tests/consequence-hint-consumer.test.ts` | Hint consumption in prompt | unit |
| `tests/consequence-restart.test.ts` | **Real cross-process restart** — separate V8 isolates, same SQLite file | integration (real-runtime) |

### Legacy Memory tests:

| Test file | What it covers | Type |
|-----------|---------------|------|
| `tests/memory-core.test.ts` | MemoryStore CRUD, query | unit |
| `tests/memory-forgetting.test.ts` | Expired block cleanup, TTL | unit |
| `tests/memory-integration.test.ts` | Integration of memory with engine | integration |
| `tests/memory-log.test.ts` | Append-log persistence, replay, snapshot, rotation | unit |
| `tests/memory-recall.test.ts` | Retrieval gate (shouldRecallMemory) | unit |
| `tests/memory-temporal.test.ts` | MemoryTemporal temporal queries | unit |
| `tests/semantic-memory.test.ts` | Semantic search | unit |

### Coverage gaps:

- **Restart read-path continuity is not verified by a dedicated test.** The `consequence-restart.test.ts` tests record persistence but does not test whether the read-path guard is re-registered. Source evidence proves re-registration happens (every `init()` re-registers), but no test directly exercises this path.
- **No test for Consequence record TTL/cleanup.** No expiration in the schema.
- **No test for cross-query between ConsequenceStore and globalMemoryStore.**
- **No test verifies `MemoryExtractor` is wired into `engine.ts`.** It is not — only `start-telegram.ts` starts it.
- **Tests use `:memory:` SQLite** for most unit tests — only `consequence-restart.test.ts` uses a real disk file.

### Test classification:

- **Production path coverage:** The E2E test uses real components through `globalHooks` — it tests the actual production wire (emit → handler → store → guard → hint → prompt).
- **False-positive risk:** Low — tests use `:memory:` DBs and fresh `globalHooks.clear()` in `afterEach`. The restart test uses real subprocesses with real files.
- **Durable state test:** `consequence-restart.test.ts` is the only one that verifies durable state across process restart.
- **Cross-session test:** `consequence-user-isolation.test.ts` and `consequence-e2e.test.ts` test cross-session behavior.

---

## 9. Git Forensics

### Key commits for Consequence Memory:

| Commit | Message | What changed |
|--------|---------|-------------|
| `f902a65e` | `feat(memory): finalize Consequence Memory v1` | Finalized read-path + store — Phase 1 complete |
| `d1a89c29` | `fix(Q3): userId isolation cho Consequence Memory` | Added `userId` column for multi-user isolation |
| `d810400b` | `fix(build): commit 3 consequence modules missing from git` | Fixed build by committing previously missing modules |
| `69ffbdc2` | `feat(memory): enforce temporal retention/cap (Mức 2, ADR-002)` | Temporal retention for legacy memory |

### Key commits for Legacy Memory:

| Commit | Message | What changed |
|--------|---------|-------------|
| `580843df` | `feat(memory): add Retrieval Gate (Waku-inspired)` | Added `memory-retrieval-gate.ts` |
| `1e856630` | `feat(memory): add Memory Consolidation (Waku-inspired)` | Added `memory-consolidation.ts` |
| `93e63749` | `feat(memory): add source provenance to MemoryBlock` | Provenance tracking |
| `68a917f5` | `feat(memory): Phase 2 — forgetting strategy with TTL, expiry, importance` | Added TTL and decay |
| `4717c884` | `P1(facade): create MemoryFacade as unified memory interface` | Created `memory-facade.ts` |
| `be4db3dc` | `P1(facade): remove legacy MemoryCore (memory.ts)` | Removed old `memory.ts` |

### WIP vs production:

- `consequence-types.ts` references "Phase 2+", "Phase 3+" — these are future phases, not current WIP.
- `BLOCK_ALLOWLIST: []` and `enforceBlock: false` confirm block is intentionally disabled.
- `memory-consolidation.ts` and `MemoryExtractor.ts` reference Waku-inspired architecture — may be design-phase artifacts not fully production-hardened.

---

## 10. Current Problems / Gaps

1. **Parallel memory architectures with no integration.** Consequence Memory (SQLite) and Legacy Memory (globalMemoryStore/append-log) are independent. No unified query, no shared schema.

2. **`globalMemoryStore` in-memory Map crash gap.** Append-log is durable; boot is safe. Runtime crash between flushes may lose recent Map writes.

3. **`MemoryExtractor` not wired to main engine.** Only started via `start-telegram.ts`. Engine.ts uses `globalMemoryStore.add()` directly.

4. **No TTL on Consequence records.** Records accumulate indefinitely in `data/consequences.db`.

5. **No unified memory query interface.** Cannot query across ConsequenceStore and globalMemoryStore simultaneously.

6. **Two `MemoryStore` classes.** `memory-store.ts` (append-log, ADD-only) and `MemoryStore.ts` (Map-based, CRUD, with confidence decay) share a name.

7. **`CoralStorage` appears dormant.** Defined in `sqlite-storage.ts` but not actively imported in the production runtime.

---

## 11. R5 Candidate Boundaries

Multiple candidates exist, none confirmed as R5. Each must be evaluated in the SCOPE DEBATE.

### Candidate A: Restart read-path continuity — verification gap

- **Problem:** Restart read-path continuity is IMPLEMENTED in source code (every `init()` call re-registers both write and read paths), but **no dedicated test directly verifies** that the read-path guard is re-registered and functional after a real process restart.
- **Evidence (implemented):** `engine.ts:545` inside `init()` → `engine.ts:237`; `start-telegram.ts:355` → `engine.ts:237`; grep confirms `registerConsequenceReadPath()` has only ONE production call site: `engine.ts:545`.
- **Evidence (verification gap):** `tests/consequence-restart.test.ts` tests record persistence (Process A → Process B), but does not emit a `tool:call` in Process B to verify the guard fires. The guard IS registered in Process B (source code proves), but no test directly calls `toolCall()` in Process B.
- **Why it matters:** If the read-path registration path is broken (e.g., a silent exception, a wrong call order), production would silently lose consequence-based intervention on restart without any test catching it.
- **Status:** HYPOTHESIS — needs SCOPE DEBATE to confirm whether a restart-read-path test belongs in R5 or is a separate maintenance task.

### Candidate B: Legacy Memory — crash durability for in-memory Map

- **Problem:** `globalMemoryStore` append-log is durable, but the in-memory Map accumulates writes between snapshots. Crash between flushes may lose Map writes.
- **Why it matters:** The gap exists during runtime, not on boot. Append-log replay makes boot safe.
- **Evidence:** `memory-store.ts` header comments explicitly note the non-durability of the flush pattern. `memory-log.ts` is durable (append-only, fsync).
- **Status:** HYPOTHESIS — may overlap with R2 recovery scope; needs SCOPE DEBATE.

### Candidate C: Memory system integration/unification

- **Problem:** Two parallel memory systems with no integration.
- **Why it matters:** The agent cannot leverage both memory systems together through a unified interface.
- **Evidence:** No import of ConsequenceStore in `memory-store.ts`; no import of globalMemoryStore in `consequence-store.ts`.
- **Status:** HYPOTHESIS — architectural decision, not an acceptance criterion. Large scope; may not fit in a single R. Needs SCOPE DEBATE.

### Candidate D: MemoryExtractor production hardening/wiring

- **Problem:** `MemoryExtractor` is not wired to `engine.ts`. Event-driven memory extraction is only active in `start-telegram.ts`.
- **Why it matters:** If the design intent is for MemoryExtractor to be the primary memory extraction pipeline, it needs to be wired into the engine. If it is intentionally scoped to Telegram only, this is not a gap.
- **Evidence:** `MemoryExtractor.ts` imported only by `start-telegram.ts:21,395`. Not imported by `engine.ts`.
- **Status:** HYPOTHESIS — may be WIP or intentionally scoped. Needs SCOPE DEBATE.

### Candidate E: Consequence Memory TTL / lifecycle management

- **Problem:** No TTL on Consequence records; records accumulate indefinitely.
- **Evidence:** `consequences` table has no `expires_at` column; no cleanup code.
- **Status:** HYPOTHESIS — "no TTL" is an observation, not a defect. Retention policy is an architectural decision.

---

## 12. Dependencies on R0-R4

All candidates are **ADJACENT** to R0-R4. None is a load-bearing dependency. R0-R4 are VERIFIED and must not be reopened.

---

## 13. Remaining Risks / Out-of-Scope Issues

### Known build/runtime issues (not R5):

1. **`src/platform/telegram/message-handler.ts`** — introduced in commit `738b07fe`, R3 workstream, repository-wide build blocker. NOT R4, NOT blocking R4 acceptance.

### Out-of-scope:

- `src/core/knowledge/memory-extractor.ts` (Obsidian markdown extraction) — separate knowledge pipeline.
- `src/core/self-evolution/` — experience store, learner, task tracker — separate learning systems.
- `src/core/plan/` — plan state management, not memory.
- **Two `MemoryStore` classes** (`memory-store.ts` vs `MemoryStore.ts`) — naming collision but not a runtime error.
- **`CoralStorage` dormant status** — needs architectural decision, not R5.

---

## 14. Evidence Index

| # | Claim | Evidence |
|---|-------|----------|
| 1 | Consequence Memory v1 is production | `src/core/memory/consequence-*.ts`; commit `f902a65e` |
| 2 | Consequence uses SQLite (single-writer) | `consequence-store.ts:6` — "ADR-003 §4.2"; `better-sqlite3` import |
| 3 | Consequence records survive restart | `tests/consequence-restart.test.ts` — Process A → Process B same file |
| 4 | Legacy Memory is in-memory Map + JSON | `memory-store.ts:582` — `globalMemoryStore = new MemoryStore()` |
| 5 | Two parallel memory systems, no integration | grep: no cross-imports between ConsequenceStore and globalMemoryStore |
| 6 | MemoryExtractor not wired to engine | `grep -rn "MemoryExtractor" src/core/engine/` returns nothing; only `start-telegram.ts:21,395` |
| 7 | BLOCK_ALLOWLIST empty, enforceBlock false | `consequence-read-path.ts:55`; `consequence-config.ts:53` |
| 8 | lesson never used as block condition | `consequence-types.ts:87`; `consequence-read-path.ts:19-20` |
| 9 | No TTL on Consequence records | `consequence-store.ts` schema — no `expires_at` column |
| 10 | ReusePolicy is enum, not boolean | `consequence-types.ts:30-36` |
| 11 | recordSuccessOccurrence is idempotent | `consequence-store.ts:236-238` — SHA256 deterministic ID |
| 12 | `registerConsequenceReadPath()` defined in consequence-read-path.ts:259 | `export function registerConsequenceReadPath(...)` |
| 13 | `registerConsequenceReadPath()` has ONE production call site: engine.ts:545 | `grep -rn "registerConsequenceReadPath" src/` returns only `engine.ts:545` for non-import lines |
| 14 | `engine.ts:545` is inside `init()` | `engine.ts:237` — `async init()`; line 545 is between 237 and `log.info('[Consequence] read path registered...')` at 546 |
| 15 | `init()` is called from `start-telegram.ts:355` | `start-telegram.ts:353` — `new Engine()`; `start-telegram.ts:355` — `await engine.init()` |
| 16 | `start-telegram.ts` is the production process entry | `src/scripts/start-telegram.ts:352` — `main()` with `console.log('🚀 Starting Coral Telegram Bot...')` |
| 17 | Restart read-path continuity is IMPLEMENTED in source | Combined evidence 12-16: every process start → new Engine → engine.init() → registerConsequenceReadPath() |
| 18 | Restart read-path continuity has NO dedicated test | `consequence-restart.test.ts` tests persistence but does NOT emit `tool:call` in Process B to verify guard fires |
| 19 | Known build blocker in message-handler.ts | `src/platform/telegram/message-handler.ts`, commit `738b07fe`, R3 workstream |

---

## 15. Audit Conclusion

### Final 4-Point Verification Table

| Question | Source Evidence | Classification |
|----------|----------------|----------------|
| Durable persistence? | `consequence-store.ts:98-99` — SQLite WAL mode; `tests/consequence-restart.test.ts` verifies cross-process | **IMPLEMENTED** |
| Cross-session retrieval? | `consequence-store.ts:338-430` — `findRelevantForToolCall()` with 7-day window; `consequence-read-path.ts:278-384` calls it on every `tool:call` | **IMPLEMENTED** |
| Restart read-path bootstrap? | `engine.ts:545` inside `init()` → `start-telegram.ts:355` on every process start; single call site verified by grep | **IMPLEMENTED** |
| Restart read-path bootstrap test? | `consequence-restart.test.ts` verifies persistence, NOT guard re-registration; source proves but no test directly exercises `tool:call` in Process B | **IMPLEMENTED BUT NOT VERIFIED** |

**R5 — NOT YET DEFINED**

The codebase shows no behavior gap in Consequence Memory persistence, cross-session retrieval, or restart read-path continuity. The restart-read-path continuity IS implemented (proven by source) but NOT verified by a dedicated test — however, this is a test gap, not a production gap, and does not by itself justify an R5.

Multiple candidates (B–E) exist. None has been confirmed as the official R5 scope. The SCOPE DEBATE step is required.

This audit correction is complete. No implementation, test changes, or refactoring was performed.
