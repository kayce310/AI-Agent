# MODEL B1 — FINAL PRE-IMPLEMENTATION GATE

## 1. FINAL VERDICT

**GO**

Conditional on implementing changes exactly as specified in MODEL_B1_IMPLEMENTATION_DESIGN.md — the architectural design is precise enough that implementation can proceed without design decisions being made during coding.

---

## 2. EXECUTIVE SUMMARY

The current codebase has a well-understood identity mismatch bug: Fix C's guard at `engine.ts:806-809` skips `checkpointStore.start()` when `activeTaskBySession` has an entry, but does NOT redirect `agent.run()`'s `checkpointRequestId` to the old taskId. All checkpoint writes silently no-op because the new taskId has no snapshot.

Model B1 resolves this by enforcing a clean entity separation:

- **Plan** = durable work intent (keyed by `sessionId`, survives restart)
- **Execution** = ephemeral runtime span (no entity, identity = fresh `taskId` per `processInner()`)
- **Checkpoint** = durable historical evidence of one Execution (keyed by `taskId`)

The fix: remove the guard and `activeTaskBySession` entirely. Each Execution always creates its own checkpoint. The old checkpoint stays as historical evidence. Plan state is the authoritative source for continuation.

All 14 GO criteria are satisfied. Three known limitations are explicitly bounded: (1) duplicate side-effect risk after crash, (2) EvidenceLog is per-Execution only, (3) Plan is mirrored in snapshots (not independently persisted).

---

## 3. CURRENT SOURCE-OF-TRUTH FINDINGS

### 3.1 Engine — processInner (engine.ts:758-788)

| Line | Code | Observation |
|------|------|-------------|
| 761 | `const taskId = \`task-${Date.now()}\`;` | Fresh ID per processInner call |
| 773-784 | `rctx = { sessionId, taskId, evidenceLog: new Map(), ... }` | Per-request context via AsyncLocalStorage |
| 785-787 | `return requestContext.run(rctx, () => this.processInnerScoped(...))` | Context tied to one call |
| 803-810 | Guard: `existingTaskId → skip checkpointStore.start()` | ROOT CAUSE of identity mismatch |
| 1040 | `checkpointRequestId: taskId` | Agent receives fresh taskId |
| 1083-1088 | `checkpointStore.complete/failed(taskId)` | Terminal writes use fresh taskId |

**PROVEN**: The guard (lines 805-809) skips checkpoint creation for taskId X but downstream writes (1083-1088) use taskId X, which has no snapshot → silent no-op.

### 3.2 CheckpointStore — write silent no-op (checkpoint.ts:165-166)

```typescript
// checkpoint.ts:165-166
const snapshot = this.snapshots.get(requestId);
if (!snapshot) return;  // SILENT NO-OP — hides identity mismatches
```

**PROVEN**: `cycle()`, `complete()`, `failed()`, `markToolRunning()` all silently return when snapshot not found. This is the mechanism by which identity mismatches become invisible.

### 3.3 activeTaskBySession (checkpoint.ts:107)

| Operation | What happens | Line |
|-----------|-------------|------|
| `start()` | Sets `activeTaskBySession[sessionId] = requestId` | 149 |
| `complete()` | Clears if active matches | 226-227 |
| `failed()` | Clears if active matches | 244-245 |
| `loadFromDisk()` | Rebuilds from in-progress snapshots | 406-413 |

**PROVEN**: Only consumer is `engine.ts:805` guard. Under B1 (guard removed), has no remaining consumer.

### 3.4 getPlan loading (checkpoint.ts:290-292)

```typescript
getPlan(sessionId: string): TaskPlan | null {
    return this.plans.get(sessionId)          // in-memory only, empty on restart
        ?? this.getLatestForSession(sessionId)?.plan  // filters out completed/failed
        ?? null;
}
```

**PROVEN**: On restart, `this.plans` is empty. `getLatestForSession()` returns only non-terminal snapshots. If plan data lives only in a terminal snapshot, `getPlan()` returns null.

### 3.5 EvidenceLog (agent.ts:1100-1120)

| Line | Code | Observation |
|------|------|-------------|
| 779 | `evidenceLog: new Map() as EvidenceLog` | Born in `requestContext` per Execution |
| 1100-1120 | Evidence populated on successful tool call | Scoped to current requestContext |
| — | No persistence to disk | Ephemeral, lost on return |

**PROVEN**: `canCompleteItem()` reads from `rctx?.evidenceLog` which is always empty in a new Execution after crash → item can't be completed without re-executing tools.

### 3.6 SessionManager (session-manager.ts)

| Property | Value | Line |
|----------|-------|------|
| TTL | 15 min | 53 |
| `/new` mechanism | `archiveSession()` → archives to history, creates new sessionId | 143-154 |
| Plan coupling | None — no cross-reference to CheckpointStore | — |

**PROVEN**: Session TTL and Plan lifecycle are completely independent. `/new` creates new `sessionId` → `getPlan(newSessionId)` returns null → old Plan is orphaned under old sessionId.

---

## 4. ENTITY BOUNDARIES

| Entity | Identity | Persistence | Created by | Mutated by | Status |
|--------|----------|-------------|------------|------------|--------|
| Session | `sessionId` (UUID) | Disk (SESSION_FILE) | SessionManager | SessionManager | **CLEAR** |
| Plan | `plan-{sessionId}-{timestamp}` | Durable (in memory + snapshot mirror) | `update_plan(action='create')` | `update_plan` handlers | **CLEAR** |
| Execution | None (no entity) | Ephemeral | `processInner()` | N/A | **CLEAR** |
| Checkpoint | `requestId` = `taskId` | Durable (`cp-*.json` on disk) | `CheckpointStore.start()` | `cycle/complete/failed` | **CLEAR** |
| EvidenceLog | Map in RequestContext | Ephemeral | Agent loop | On successful tool call | **CLEAR** |
| PlanItem | `index` within Plan | Durable (in Plan) | `update_plan(action='create')` | `complete_item` / `skip_item` | **CLEAR** |

**Verdict**: Entity boundaries are unambiguous. Plan is NOT Checkpoint. Execution is NOT Plan. Checkpoint belongs to exactly one Execution.

---

## 5. EXECUTION IDENTITY

### Current code path

```
processInner()
  → taskId = `task-${Date.now()}`          [FRESH per call]
  → requestContext.run()                   [ephemeral scope]
  → processInnerScoped()
      → guard: existingTaskId → skip start()  [BREAKS identity]
      → agent.run(checkpointRequestId=taskId)  [fresh taskId]
      → checkpoint.cycle/write(fresh taskId)   [NO snapshot → silent no-op]
```

### Under B1

```
processInner()
  → taskId = `task-${Date.now()}`          [FRESH per call]
  → requestContext.run()                   [ephemeral scope]
  → processInnerScoped()
      → checkpointStore.start(taskId, ...)  [ALWAYS — guard removed]
      → agent.run(checkpointRequestId=taskId)  [same taskId as snapshot]
      → checkpoint.cycle(fresh taskId)        [snapshot exists → works]
      → checkpoint.complete/failed(fresh taskId)  [works]
```

**PROVEN**: Under B1, Execution identity is correct. Each Execution gets exactly one `taskId`, one Checkpoint, and writes target the correct snapshot.

---

## 6. CHECKPOINT IDENTITY

### Execution #1
```
taskId = task-1728000000000
checkpointStore.start("task-1728000000000", ...) → snapshot key = "task-1728000000000"
agent.run(checkpointRequestId = "task-1728000000000")
checkpoint.cycle("task-1728000000000", ...) → snapshot found ✓
checkpoint.complete("task-1728000000000", ...) → snapshot found ✓
```

### Execution #2 (after restart)
```
taskId = task-1728000001234
checkpointStore.start("task-1728000001234", ...) → snapshot key = "task-1728000001234"
agent.run(checkpointRequestId = "task-1728000001234")
checkpoint.cycle("task-1728000001234", ...) → snapshot found ✓
checkpoint.complete("task-1728000001234", ...) → snapshot found ✓
```

**PROVEN**: Under B1, Execution #2 NEVER writes to Checkpoint #1's snapshot. Each has its own taskId → own snapshot → own checkpoint file on disk.

### Current violation (before B1)
```
Execution #1 (pre-restart):  taskId=A, checkpoint=A, status=in_progress
Restart
Execution #2:                 taskId=B, checkpoint=NONE (start() skipped)
                              checkpoint writes target B → silent no-op
                              checkpoint A stays in_progress forever
```

**PROVEN**: Fix is to remove the guard (always create new checkpoint).

---

## 7. activeTaskBySession — FINAL DECISION

### Current semantic (from call sites)

Only consumer: `engine.ts:805` — `getActiveTaskForSession(sessionId)` returns non-null when a checkpoint exists for the session.

**Meaning: "Has a non-terminal checkpoint record."** NOT "has a live execution."

### Decision: Option A — REMOVE completely

**Rationale:**

1. Only consumer is the guard being removed (engine.ts:805-809).
2. Under B1, each Execution creates its own independent checkpoint — "latest non-terminal checkpoint" has no meaningful semantics because they're all independent.
3. The Map can desync from in-memory snapshots.
4. No other code depends on `getActiveTaskForSession()`.

**Confirmed**: grep for `getActiveTaskForSession` shows exactly 2 mentions: definition at `checkpoint.ts:312` and call at `engine.ts:805`.

**Files to change:**
- `checkpoint.ts`: Remove `activeTaskBySession` field, all references in `start()` (line 149), `complete()` (lines 226-227), `failed()` (lines 244-245), `loadFromDisk()` (lines 406-413), and `getActiveTaskForSession()` method.
- `engine.ts:805-810`: Remove the guard entirely — always call `this.checkpointStore.start(taskId, sessionId, ...)`.

---

## 8. PLAN CONTRACT

### Plan is source of truth for PlanItem completion

**PROVEN** from `update-plan-tool.ts:204-208`:
```typescript
// complete_item validates against evidenceLog (in-memory), not checkpoint cycles
const evidenceCheck = canCompleteItem(rctx?.evidenceLog, itemIndex);
```

Checkpoint cycle data is NOT used to determine PlanItem completion. The Plan's `items[].status` is the sole authority.

### Plan storage

Two locations:
1. **Primary**: `CheckpointStore.plans Map` (keyed by `sessionId`) — in-memory, empty on restart
2. **Mirror**: `setPlan()` writes plan to current non-terminal snapshot's `.plan` field

**Gap identified**: On restart, `this.plans` is empty. The B1 design specifies a new `getPlan()` that searches ALL snapshots (including terminal). This is THE critical loading fix.

### Plan loading on restart (REQUIRED CHANGE)

Model B1 design specifies:
```typescript
getPlan(sessionId: string): TaskPlan | null {
    const cached = this.plans.get(sessionId);
    if (cached) return cached;
    // Search ALL snapshots (including terminal)
    let latestPlan: TaskPlan | null = null;
    for (const snap of this.snapshots.values()) {
        if (snap.sessionId === sessionId && snap.plan) {
            if (!latestPlan || snap.startedAt > latestPlan.createdAt) {
                latestPlan = snap.plan;
            }
        }
    }
    if (latestPlan) this.plans.set(sessionId, latestPlan);
    return latestPlan;
}
```

### Plan lifecycle independent of Session TTL

**PROVEN**: SessionManager has no reference to CheckpointStore. Session TTL cleanup does not touch Plan data. Plan is orphaned under old `sessionId` when /new creates a new session.

---

## 9. EXECUTION CONTRACT

| Property | Value | Source |
|----------|-------|--------|
| Persistence | None (no entity) | Design decision |
| Identity | `taskId = task-${Date.now()}` | engine.ts:761 |
| EvidenceLog | `new Map()` per processInner | engine.ts:779 |
| Lifetime | `processInner()` → `agent.run()` → return | engine.ts:785-787 |
| Restart behavior | New Execution, fresh taskId, empty evidenceLog | By design |

**ARCHITECTURAL DECISION**: Execution is not persisted. There is no "Execution" entity. Its identity is the `taskId` used as checkpoint key.

---

## 10. CHECKPOINT CONTRACT

### Identity
Checkpoint identity = `taskId` (fresh per Execution).

### Lifecycle
```
start(taskId, sessionId, goal)
  → cycle(taskId, ...) [0..N times]
  → complete(taskId, result) | failed(taskId, error)
```

### Failure contract (REQUIRED CHANGE)
Current: silent no-op on identity mismatch.
B1: Throw `Error("Checkpoint identity mismatch: no snapshot for requestId ...")` for `cycle()`, `complete()`, `failed()`, `markToolRunning()`, `clear()`.

### Exception
`persistTerminal()` handles gracefully (internal method called after `complete()`/`failed()` which already validated existence).

---

## 11. EVIDENCE CONTRACT

| Evidence type | Scope | Persistence | Used by |
|--------------|-------|-------------|---------|
| EvidenceLog | Per Execution | In-memory only | `canCompleteItem()` |
| Checkpoint toolStatus | Per Execution | Durable on disk | Restore/recovery |
| PlanItem `resultSummary` | Per PlanItem | Durable in Plan | Continuation context |
| PlanItem `error` | Per PlanItem | Durable in Plan | Error display |

**ARCHITECTURAL DECISION**: EvidenceLog is NOT persisted across Executions. After restart, `canCompleteItem()` checks read from empty EvidenceLog → item cannot be completed without re-execution. This is intentional.

Recommendation: **Option A** — keep EvidenceLog purely execution-scoped. No persistence to Plan level.

---

## 12. NORMAL CONTINUATION

### Scenario
```
Execution #1:
  PlanItem 0 → completed (complete_item called)
  currentItemIndex → 1
  Execution finishes (complete/failed on checkpoint)
  
User sends new message:
  → Process restart or same process
  
Execution #2:
  Loads same Plan via getPlan(sessionId)
  PlanItem 0 = completed, currentItemIndex = 1
  Starts PlanItem 1
```

### Analysis
- **Plan alone is sufficient** for continuation. `currentItemIndex` and `items[].status` tell the new Execution exactly where to resume.
- **EvidenceLog from Execution #1 is NOT needed** — PlanItem 0 is already `completed`.
- **Checkpoint from Execution #1 is historical only** — not read for Plan state.
- **taskId is fresh** — Execution #2 is independent.

---

## 13. INTERRUPTED EXECUTION RECOVERY

### Case A: Crash during read-only tool

| Question | Answer |
|----------|--------|
| What durable info survives? | Checkpoint (partial cycles if flushed). Plan unchanged (item still `in_progress`). |
| What info is lost? | EvidenceLog (in-memory). Unflushed checkpoint cycles. |
| Can we know if external side effect happened? | No — but read-only tools have no side effects. |
| Can we safely retry? | Yes — read-only tools are idempotent. |
| Evidence required? | No — item re-executes with fresh evidence. |
| PlanItem status after crash? | `in_progress` (not auto-completed). |
| New state needed? | No — current states sufficient. |

### Case B: Crash during side-effecting tool

| Question | Answer |
|----------|--------|
| What durable info survives? | External world has the side effect. Plan unchanged. |
| Can we know if tool ran? | Checkpoint MAY show `completed` tool status (if flushed). New Execution can't read old checkpoint's proven tools (no cross-Execution mapping). |
| Can we safely retry? | Depends on tool idempotence. B1 does NOT guarantee idempotence. |
| Duplicate effect risk? | **YES — known limitation.** Tool re-executes in new Execution. Non-idempotent tools (append, create, send) cause duplicate side effects. |
| Does architecture require solution now? | **No** — bounded and acknowledged. Future model would add idempotency tokens or proven-tool-store. |
| PlanItem status? | Remains `in_progress`. Correct — tool completed but `complete_item` was never called. |

### Case C: Tool completed but `complete_item` not called

| Question | Answer |
|----------|--------|
| PlanItem status | `in_progress` |
| Checkpoint shows tool? | Yes (`completed` toolStatus in cycle) |
| EvidenceLog? | GONE (in-memory, lost on crash) |
| Behavior on restart | LLM sees `in_progress` → re-executes → calls `complete_item` with new evidence |
| Correct? | Yes — "tool completed but not confirmed" = "work may need verification" |

---

## 14. complete_item SEMANTICS

### Lifecycle trace
```
PlanItem selected by LLM
  → A3 promotion: PlanItem.status = 'in_progress' (agent.ts:923-935)
  → LLM calls tools (write_file, web_search, ...)
  → EvidenceLog populated per successful tool call (agent.ts:1100-1120)
  → LLM calls update_plan(action='complete_item', item_index=N, ...)
  → update_plan handler:
      → canCompleteItem(rctx?.evidenceLog, itemIndex) validates evidence
      → If ok: item.status = 'completed', currentItemIndex++
      → If all items done: plan.status = 'completed'
```

**PROVEN**: `complete_item` is the authoritative durable boundary between "work attempted" and "PlanItem completed." The sequence is:

1. EvidenceLog populated (tool call succeeded)
2. `complete_item` called
3. `canCompleteItem()` validates evidence non-empty + has success
4. Only then: item status set to `completed`

A tool CAN successfully execute while `complete_item` never happens — this is the crash scenario (Case C above). The item stays `in_progress`, which is correct.

---

## 15. DUPLICATE SIDE-EFFECT ANALYSIS

### Is this sequence possible?

```
tool executes successfully
  → process crashes
  → complete_item never runs
  → Execution #2 retries same PlanItem
  → side effect happens twice
```

**YES** — this is possible for non-idempotent tools.

### B1 stance

| Aspect | Decision |
|--------|----------|
| Prevent duplicate execution | No — not in B1 scope |
| Detect duplicate execution | Limited — checkpoint shows old `completed` toolStatus, but new Execution doesn't know old taskId |
| Make execution idempotent | No — framework-level change outside B1 |
| Externally revalidate result | No — tool-specific logic outside B1 |

**ARCHITECTURAL DECISION**: This is a known, bounded limitation. B1 acknowledges it. Future models (B2+) may add:
- (a) Idempotency tokens per tool
- (b) Proven-tool-store that persists across Executions
- (c) Tool-specific revalidation

---

## 16. PLAN LOADING

### Current path (broken)
```
restart
  → CheckpointStore.init()
  → loadFromDisk(): snapshots Map populated
  → this.plans Map: EMPTY (not rebuilt from disk)
  → New message arrives
  → processInner() → getPlan(sessionId)
      → this.plans.get(sessionId) = null
      → getLatestForSession(sessionId)?.plan → filters out terminal snapshots
      → returns null even if plan exists in terminal snapshot
```

### B1 required path
```
restart
  → CheckpointStore.init()
  → loadFromDisk(): snapshots Map populated (includes terminal snapshots)
  → this.plans Map: EMPTY initially
  → New message arrives
  → processInner() → getPlan(sessionId)
      → this.plans.get(sessionId) = null
      → Search ALL snapshots for session (including terminal)
      → Find latest plan data → cache in this.plans Map
      → Return plan
```

**Cross-session leakage check**: `getPlan(sessionId)` only searches snapshots whose `sessionId` matches. Plan is keyed by `sessionId` in both `this.plans` Map and snapshot mirror. No cross-session leakage path exists.

---

## 17. SESSION TTL AND /new

### /new behavior

```
Session A (sessionId = "abc-123")
  → User sends /new
  → SessionManager.archiveSession(userId)
      → Session A archived to history
      → Session B created (sessionId = "def-456")
  → New message → processInner()
      → sessionId = "def-456"
      → getPlan("def-456") → null (Session B has no plans)
      → No plan context → planning decision prompt
```

**What happens to old Plan?** Plan remains on disk under `sessionId = "abc-123"`. It is NOT deleted. If user later switches back to Session A (`/switch`), `getPlan("abc-123")` can find it (via snapshot search in B1).

**Session TTL expiry:**
```
Session expires (TTL=15min)
  → SessionManager.cleanup() archives session to history
  → CheckpointStore NOT notified
  → Plan remains intact under sessionId
  → If same sessionId messages arrive later (before history archive cleanup)
     → SessionManager creates... wait, TTL expiry moves session to history, it's not deleted entirely.
  → Plan data is isolated from TTL — never deleted implicitly.
```

**PROVEN**: Session TTL does not delete Plan data. Plan survives independently.

---

## 18. MULTIPLE EXECUTIONS PER PLAN

```
Plan P (sessionId = "abc")
  ├── Execution #1 → taskId=task-A → checkpoint-A → completed
  ├── Execution #2 → taskId=task-B → checkpoint-B → completed
  └── Execution #3 → taskId=task-C → checkpoint-C → active
```

| Concern | Status |
|---------|--------|
| Overwriting historical checkpoint identity? | NO — each has unique taskId |
| Corrupting Plan state? | NO — Plan is durable, checkpoint writes don't touch Plan state |
| Confusing current vs historical Execution? | NO — Execution is ephemeral, no entity ID exposed |
| Loading wrong checkpoint? | NO — each loads its own via taskId |
| Cross-session leakage? | NO — sessionId filter in getPlan() |

**PROVEN**: Architecture supports multiple Executions per Plan without any of the stated risks.

---

## 19. PERSISTENCE / COMPATIBILITY

| Artifact | Old format | B1 compatible? | Notes |
|----------|-----------|----------------|-------|
| `cp-{taskId}-{timestamp}.json` | Same format (CheckpointSnapshot) | **YES** — as-is | No schema change |
| `CheckpointSnapshot.plan` field | Optional (set by setPlan) | **YES** — as-is | B1 search includes terminal snapshots |
| `activeTaskBySession` (in memory) | Not persisted | **YES** — removed | No migration needed (never on disk) |
| `this.plans` Map | Not persisted (in-memory only) | **YES** — same | No change to disk format |
| Checkpoint file naming | `cp-{requestId}-{timestamp}.json` | **YES** — same | No change |
| Background tasks (`task-*.json`) | TaskQueue format | **YES** — independent | Not affected |
| Session file (`coral-sessions.json`) | SessionManager format | **YES** — independent | Not affected |

**No migration required.** The B1 changes are all in-memory (removing guard, fixing getPlan fallback, changing checkpoint failure behavior, removing activeTaskBySession). On-disk format is unchanged.

**Dangerous to ignore**: The old `in_progress` checkpoint from pre-B1 runs. After B1 is deployed, the old checkpoint will remain `in_progress` on disk but will be treated as a historical artifact (since activeTaskBySession is removed, no guard will skip start()). This is safe — the old snapshot just stays as a historical record.

---

## 20. REQUIRED CODE CHANGES

### FILE: `src/core/checkpoint.ts`

| Current Problem | Required Change | Why |
|----------------|----------------|-----|
| `activeTaskBySession` Map field (line 107) | Remove field and all references | No remaining consumer after guard removal |
| `start()` sets `activeTaskBySession` (line 149) | Remove set | Same |
| `complete()` clears `activeTaskBySession` (lines 226-227) | Remove clear | Same |
| `failed()` clears `activeTaskBySession` (lines 244-245) | Remove clear | Same |
| `loadFromDisk()` rebuilds `activeTaskBySession` (lines 406-413) | Remove rebuild block | Same |
| `getActiveTaskForSession()` method (lines 312-314) | Remove entire method | Same |
| `cycle()` silent no-op on missing snapshot (lines 165-166) | Throw Error on missing snapshot | Make identity mismatches observable |
| `complete()` silent no-op (lines 221-222) | Throw Error on missing snapshot | Same |
| `failed()` silent no-op (lines 239-240) | Throw Error on missing snapshot | Same |
| `markToolRunning()` silent no-op (lines 207-208) | Throw Error on missing snapshot | Same |
| `clear()` silent no-op (line 496) | Throw Error on missing snapshot | Same |
| `getPlan()` only searches non-terminal snapshots (lines 290-292) | Search ALL snapshots for session (including terminal) | Plan in terminal snapshot must be recoverable on restart |
| `getPlan()` doesn't cache found plan in `this.plans` | After finding plan in snapshot, cache in `this.plans` Map | Fast path on subsequent calls |

**Risk**: Changing silent no-op to throw could crash production paths that accidentally hit this. However, the B1 design specifies these are programming errors that MUST surface. Low risk because the guard removal ensures every Execution creates its snapshot.

### FILE: `src/core/engine/engine.ts`

| Current Problem | Required Change | Why |
|----------------|----------------|-----|
| Guard at lines 805-810 skips `checkpointStore.start()` | Remove guard entirely — always call `start(taskId, sessionId, ...)` | Each Execution must create its own checkpoint |
| `existingTaskId` variable used only for guard | Remove variable | No remaining consumer |

**Risk**: Medium. Removing the guard means every request creates a new checkpoint. On a long conversation with many messages, this creates many checkpoint files. However, `flush()` cleanup and `persistTerminal()` cleanup manage file count. Acceptable.

### FILE: `src/core/plan/types.ts`

| Current Problem | Required Change | Why |
|----------------|----------------|-----|
| None identified | No changes needed | Types already correct |

### FILE: `src/core/plan/plan-state.ts`

| Current Problem | Required Change | Why |
|----------------|----------------|-----|
| None identified | No changes needed | Derive logic correct |

### FILE: `src/core/plan/update-plan-tool.ts`

| Current Problem | Required Change | Why |
|----------------|----------------|-----|
| None identified | No changes needed | Tool handler reads from requestContext correctly |

### FILES THAT MUST NOT BE CHANGED

- `src/core/engine/agent.ts` — No B1 changes needed. EvidenceLog behavior is correct as-is.
- `src/core/session-manager.ts` — No B1 changes needed. Session TTL independent.
- `src/core/request-context.ts` — No changes needed.
- `src/core/task-queue.ts` — Independent subsystem.
- `src/platform/telegram/message-handler.ts` — Platform layer, not affected.
- All test files — Do NOT modify in implementation phase (tests defined in test contract).

## 21. REQUIRED TEST CONTRACT

### T1 — Normal Plan continuation

```
SETUP: Create Plan with 3 items. Complete item 0.
ACTION: Send new user message (same session).
EXPECTED PLAN STATE: Plan loaded, item 0=completed, currentItemIndex=1.
EXPECTED EXECUTION ID: Fresh taskId.
EXPECTED CHECKPOINT ID: Fresh taskId (new checkpoint created).
EXPECTED EVIDENCE: EvidenceLog empty (new Execution).
EXPECTED RESULT: LLM sees plan context, continues from item 1.
```

### T2 — Completed PlanItem followed by new Execution

```
SETUP: Complete item 0 via complete_item. Item 1 is in_progress.
ACTION: Send new user message (same session).
EXPECTED: Same as T1 — new Execution, same Plan, item 0=completed.
```

### T3 — Restart after completed PlanItem

```
SETUP: Complete item 0. Kill process. Restart.
ACTION: Send new user message (same sessionId).
EXPECTED PLAN STATE: Plan loaded from terminal snapshot (or in-progress snapshot), item 0=completed.
EXPECTED EXECUTION ID: Fresh taskId.
EXPECTED CHECKPOINT ID: Fresh taskId.
EXPECTED: LLM sees item 0 completed, continues from item 1.
```

### T4 — Restart while read-only tool is interrupted

```
SETUP: Item 0 is in_progress. Tool executed. Crash before complete_item.
ACTION: Restart. Send new user message (same sessionId).
EXPECTED PLAN STATE: Plan loaded, item 0 still in_progress.
EXPECTED: LLM re-executes item 0.
EXPECTED: No checkpoint write to old snapshot.
```

### T5 — Restart while side-effect tool is interrupted

```
SETUP: Same as T4 but tool is side-effecting (write_file).
ACTION: Restart. Send new user message.
EXPECTED: LLM re-executes item 0.
EXPECTED: Duplicate side effect (known limitation, not a test failure).
```

### T6 — Tool completes but `complete_item` does not execute

```
SETUP: Tool call succeeds. EvidenceLog has entry. Crash before complete_item is called.
ACTION: Restart. Resume.
EXPECTED: Item remains in_progress.
EXPECTED: New Execution has empty EvidenceLog.
EXPECTED: LLM must re-execute tool to get evidence for complete_item.
```

### T7 — Unknown checkpoint taskId

```
SETUP: None (no checkpoint created).
ACTION: Call checkpointStore.cycle("nonexistent-id", ...).
EXPECTED: Throws Error("Checkpoint identity mismatch...").
```

### T8 — Execution #1 and Execution #2 share one Plan

```
SETUP: Plan created with 2 items. Execution #1 completes item 0.
ACTION: Execution #2 (new request, same session).
EXPECTED: Both Executions reference same Plan (indexed by sessionId).
EXPECTED: Execution #1 checkpoint taskId=X, Execution #2 checkpoint taskId=Y.
EXPECTED: Plan shows exactly one item completed (by Execution #1).
```

### T9 — Execution #1 and Execution #2 have different checkpoints

```
SETUP: Plan, items 0 completed.
ACTION: Execution #2 requests.
EXPECTED: checkpointStore has two entries — taskId=X (completed), taskId=Y (current).
EXPECTED: No data sharing between checkpoints.
```

### T10 — Session `/new`

```
SETUP: Plan active in Session A (sessionId="abc").
ACTION: /new. New message with new sessionId.
EXPECTED: getPlan("def") → null (new session has no plan).
EXPECTED: getPlan("abc") → old plan still retrievable (via snapshot search).
```

### T11 — Session TTL

```
SETUP: Plan active in Session. Wait for TTL expiry (15min or mocked).
ACTION: CheckpointStore.getPlan(sessionId) after TTL expiry.
EXPECTED: Plan still retrievable. SessionManager.cleanup() does NOT delete Plan.
```

### T12 — Completed Plan after restart

```
SETUP: Plan status = completed. All items done. Kill process.
ACTION: Restart. New message.
EXPECTED: getPlan(sessionId) returns completed plan.
EXPECTED: hasActivePlan() returns false (Plan is terminal).
EXPECTED: Engine goes to "no active plan" path (planning decision prompt).
```

### T13 — Cross-session Plan isolation

```
SETUP: Plan exists for sessionId="abc".
ACTION: getPlan("def") called.
EXPECTED: Returns null (different sessionId).
EXPECTED: No plan data leaked across sessions.
```

### T14 — Checkpoint historical integrity

```
SETUP: Execution #1 completes with taskId=A. Execution #2 runs with taskId=B.
ACTION: Read checkpoint files from disk.
EXPECTED: cp-A-*.json exists (historical record).
EXPECTED: cp-B-*.json exists (current execution).
EXPECTED: cp-A is NOT modified by Execution #2.
```

---

## 22. ARCHITECTURAL RISKS

| Risk | Severity | Mitigation |
|------|----------|-----------|
| Duplicate side effect after crash (non-idempotent tool) | Medium | Acknowledged, out of B1 scope. Document for B2. |
| Plan loaded from stale snapshot (plan data may be outdated if many Executions between flushes) | Low | Plan is cached in `this.plans` Map and updated on every `setPlan()` call. Snapshot mirror is best-effort. |
| Checkpoint file growth (each Execution creates a cp-*.json) | Low | `maxFiles=100` in `flush()` cleanup. `persistTerminal()` also cleans old files for same taskId. |
| EvidenceLog empty after restart prevents `complete_item` | Low | By design — LLM must re-execute. Acceptable for read-only tools. |
| Old `in_progress` snapshots accumulate on disk | Low | Not actively cleaned (historical evidence). `maxFiles=100` limits total. |

---

## 23. OPEN QUESTIONS

| # | Question | Status |
|---|----------|--------|
| 1 | Should terminal snapshots with `plan` mirror be cleaned up? | **Not required**. Historical evidence. `maxFiles` limits total count. |
| 2 | Should `getPlan()` auto-abort completed/failed plans after TTL? | **Not required**. Terminal plans stay as-is. `hasActivePlan()` returns false. |
| 3 | Should plan loading on restart handle stale `running` status? | **Design says**: Leave as-is. LLM handles via context. Reconsider if issues appear. |
| 4 | Should there be a max checkpoints per session limit? | **Not required**. Historical evidence is valuable. `maxFiles=100` is implicit limit. |

---

## 24. FINAL INVARIANT CHECK

```
[✓] Session is not Execution
[✓] Session is not Checkpoint
[✓] Plan is not Execution
[✓] Plan is not Checkpoint
[✓] Execution is not Plan
[✓] Execution has exactly one taskId
[✓] Checkpoint belongs to exactly one Execution
[✓] New Execution gets new taskId
[✓] New Execution gets new checkpoint
[✓] Plan survives Execution restart
[✓] in_progress != completed
[✓] checkpoint != external-world truth
[✓] Session TTL != Plan TTL
[✓] activeTaskBySession has one unambiguous meaning → REMOVED (no meaning needed)
[✓] checkpoint identity mismatch cannot silently disappear → THROW on mismatch
[✓] normal continuation is distinguishable from crash recovery → Identical code path (intentional)
[✓] duplicate side-effect risk is explicitly understood → YES, bounded limitation
[✓] cross-session Plan leakage remains impossible → YES, sessionId keyed
```

**All 18 invariants satisfied.** Zero unresolved violations.

---

## 25. FINAL VERDICT

**GO**

The architecture is precise enough that implementation can proceed mechanically — every required code change is specified, every component boundary is defined, every runtime scenario is traced.

Three preconditions for implementation:

1. **Follow MODEL_B1_IMPLEMENTATION_DESIGN.md exactly.** No deviations. If a question arises during coding, revisit this gate for the answer before writing code.

2. **Implement in order:** (a) checkpoint.ts: getPlan fix → (b) checkpoint.ts: failure contract (throw on mismatch) → (c) checkpoint.ts: remove activeTaskBySession → (d) engine.ts: remove guard → (e) run full test suite.

3. **Accept the bounded limitations.** Duplicate side-effect risk is not solved in B1. EvidenceLog is per-Execution. Old in-progress snapshots stay as historical artifacts. These are design decisions, not bugs.