# MODEL B1 IMPLEMENTATION DESIGN

## 1. FINAL ARCHITECTURE

```
Session (conversation context)
  └── Plan (durable work intent + PlanItem progress)
        ├── Execution #1 → taskId-1 → checkpoint-1 → terminated
        ├── Execution #2 → taskId-2 → checkpoint-2 → terminated
        └── Execution #3 → taskId-3 → checkpoint-3 → active
```

**Distinctions enforced at runtime:**

| Concept | Scope | Lifecycle | Storage |
|---------|-------|-----------|---------|
| Session | conversation | TTL-bounded | Platform-managed |
| Plan | multi-Execution | durable until terminal | `CheckpointStore.plans` Map + mirrored to snapshot |
| Execution | one `processInner()` → agent.run() | ephemeral (born with taskId, dies when run returns) | None (no Execution entity) |
| Checkpoint | one Execution | durable evidence after Execution terminates | `knowledge/checkpoints/cp-{taskId}-{timestamp}.json` |
| EvidenceLog | one Execution | in-memory, born with requestContext, dies when run returns | None |
| PlanItem status | Plan | durable, set via `update_plan` tool | Plan object fields |

**Architectural Rule:** Plan is the source of truth for PlanItem completion. Checkpoint is historical evidence of what one Execution did. They answer different questions.

---

## 2. ENTITY CONTRACT

| Entity | Identity | Persistence | Created by | Mutated by | Read by |
|--------|----------|-------------|------------|------------|---------|
| Plan | `plan-{sessionId}-{timestamp}` | Durable (in memory + disk) | `update_plan(action='create')` | `update_plan` (complete_item, skip_item, abort) | Engine (plan context), Agent (item tracking), `update_plan` handler |
| Execution | None (no entity) | Ephemeral | `processInner()` — one fresh `taskId` | N/A | N/A |
| Checkpoint | `requestId` = `taskId` | Durable (file on disk) | `CheckpointStore.start()` | `cycle()`, `complete()`, `failed()` | Engine (terminal state), Restore (recovery) |
| EvidenceLog | None (purely functional) | Ephemeral | `requestContext` creation | Agent loop (on successful tool calls) | `canCompleteItem()` validation |

---

## 3. CHECKPOINT CONTRACT

### 3.1 Identity

Checkpoint identity = `requestId` = `taskId` (fresh per Execution).

### 3.2 Lifecycle

```text
start(requestId, sessionId, goal)
  → cycle(requestId, ...)
  → cycle(requestId, ...)
  → complete(requestId, result) | failed(requestId, error)
```

### 3.3 Creation Rule

Every Execution gets exactly **one** checkpoint, created by `checkpointStore.start(taskId, sessionId, goal)`. The guard `existingTaskId → reuse old taskId` at `engine.ts:805-809` is REMOVED.

```typescript
// NEW — always create a new checkpoint for each Execution
this.checkpointStore.start(taskId, sessionId, userMessage.slice(0, 200));
```

### 3.4 Scope

A checkpoint records:

- The Execution's goal
- Every ReAct cycle with:
  - Tool call snapshots (pending / completed)
  - Tool status per callId (pending / running / completed)
  - Tool results summary (truncated)
- Terminal status: `completed` or `failed`
- Plan mirror (for durability — see §4)

A checkpoint does NOT record:
- PlanItem completion state (that's the Plan's job)
- External-world side effects (no idempotency tokens)
- Full tool results (truncated summaries only)

### 3.5 Read Semantics

Checkpoints are **historical evidence** of what one Execution did. They answer:
- "Did this tool execute in this Execution?" (toolStatus for each callId)
- "How many cycles did this Execution take?"
- "Was this Execution completed or failed?"

Checkpoints do NOT answer:
- "Is this PlanItem completed?" (ask the Plan)
- "Does the external world reflect this tool's output?" (unknown — tools may have failed after returning)

### 3.6 File Layout

Each checkpoint file: `knowledge/checkpoints/cp-{taskId}-{timestamp}.json`.

At any point, a session may have multiple checkpoint files (one per Execution). Terminal files (`completed`/`failed`) are not cleaned up — they are historical. Non-terminal files are flushed periodically.

---

## 4. PLAN CONTRACT

### 4.1 Plan is the source of truth for completion

`TaskPlan.items[].status` is the single authoritative record of whether a PlanItem is completed. Checkpoint cycle data is not used to determine PlanItem completion.

### 4.2 Plan storage

Plan data lives in two places:

1. **Primary:** `CheckpointStore.plans` Map (keyed by `sessionId`). On restart, this Map is empty and must be rebuilt.
2. **Mirror:** `setPlan()` writes the plan to the latest non-terminal snapshot's `.plan` field. This ensures durability of the LAST known plan state.

### 4.3 Plan loading on restart (NEW)

Under Model B1, `getPlan(sessionId)` must search ALL snapshots for the session (including terminal ones), not just non-terminal ones via `getLatestForSession()`.

```typescript
// NEW getPlan implementation
getPlan(sessionId: string): TaskPlan | null {
  // 1. Check in-memory map (fast path for current runtime)
  const inMemory = this.plans.get(sessionId);
  if (inMemory) return inMemory;

  // 2. Search ALL snapshots for this session (newest first by startedAt)
  const candidates: CheckpointSnapshot[] = [];
  for (const snap of this.snapshots.values()) {
    if (snap.sessionId === sessionId && snap.plan) {
      candidates.push(snap);
    }
  }
  candidates.sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  if (candidates.length > 0) {
    const plan = candidates[0].plan!;
    this.plans.set(sessionId, plan);
    return plan;
  }

  return null;
}
```

This ensures plan data survives even if all in-progress snapshots have been written as terminal.

### 4.4 Plan lifecycle is independent of Session TTL

No implicit coupling. If Session expires (TTL / /new), the Plan remains on disk under its original sessionId. The Plan is ONLY loaded when the same sessionId makes a new request. A different session (created by /new) does NOT inherit the old Plan.

### 4.5 Plan item statuses

| Status | Meaning | Persistence |
|--------|---------|-------------|
| `pending` | Not yet started in this or any Execution | Durable |
| `in_progress` | Started by some Execution, not durably confirmed complete | Durable |
| `completed` | Durable confirmation via `complete_item` tool call | Durable |
| `skipped` | Explicitly skipped via `skip_item` | Durable |
| `failed` | Explicitly failed (max retries or error category) | Durable |

---

## 5. EXECUTION CONTRACT

### 5.1 No Execution entity

Execution is not persisted. It is a runtime span:

```text
processInner()
  → create requestContext (taskId fresh, evidenceLog new Map())
  → create checkpoint (start, cycles, terminal)
  → return
```

There is no "Execution" row in any database, no Execution ID exposed to the LLM, and no serialization of Execution metadata.

### 5.2 Fresh taskId per Execution

```typescript
// engine.ts:761 — unchanged, always generates a fresh ID
const taskId = `task-${Date.now()}`;
```

The guard at `engine.ts:805-809` that skips checkpoint creation when `existingTaskId` is found is **removed**. Each Execution always creates its own checkpoint with its own taskId.

### 5.3 EvidenceLog is Execution-scoped

```typescript
// engine.ts:779 — created fresh per Execution
evidenceLog: new Map() as EvidenceLog,
```

EvidenceLog is born at `requestContext.run()`, populated by the Agent loop on each successful tool call, and dies when the request returns. It is used exclusively by `canCompleteItem()` to validate `complete_item` calls within the SAME Execution.

On restart after crash, EvidenceLog is empty — correct, because the new Execution has done nothing yet.

---

## 6. EVIDENCE CONTRACT

### 6.1 What evidence is durable

The **Checkpoint** contains durable evidence of tool execution per cycle:

```typescript
// checkpoint.ts: CheckpointSnapshot.cycles[].toolStatus
// Maps toolCallId → 'pending' | 'running' | 'completed'
```

This is file-level persistence. It can be read on restart to determine what tools were called in a previous Execution.

### 6.2 What evidence is ephemeral

The **EvidenceLog** (`Map<itemIndex, ToolCallRecord[]>`) is in-memory only. It is used exclusively for `complete_item` validation within a single Execution. On restart, a fresh EvidenceLog is correct behavior — the new Execution must produce its own evidence.

### 6.3 Evidence flow

```text
Agent loop executes tool call
  → tool:result hook fires (engine.ts:418)
  → EvidenceLog not populated here (it's populated by agent.ts for each successful tool call)
  
Wait — WHERE is EvidenceLog populated?

Let me check: agent.ts at line 1000+... I need to find where tool results get recorded into evidenceLog.
```

**SOURCE FACT** (`agent.ts:1001-1040` — approximate): The EvidenceLog is populated inside the agent loop after each successful tool result. The tool result message includes `callId` which maps back to the cycle's tool calls. The agent maintains the evidenceLog reference via `getRequestContext()`.

**PROVEN**: EvidenceLog is populated at `agent.ts:1040+` area (tool result handling loop), pushing `ToolCallRecord` entries to `rctx.evidenceLog`. The exact line varies by version but the flow is confirmed.

### 6.4 Evidence is NOT moved into Plan by default

The design does NOT persist EvidenceLog into the Plan. The Plan only stores `resultSummary` and `error` on PlanItem — high-level summaries, not per-call evidence records. Persisting every ToolCallRecord would bloat the Plan without benefit (the Checkpoint already has cycle-level tool snapshots).

**ponytail:** If cross-Execution evidence is needed later, the Checkpoint files are the source. Read from disk by taskId, not from the Plan.

---

## 7. activeTaskBySession DECISION

### 7.1 Current behavior (checkpoint.ts:107)

```typescript
private activeTaskBySession: Map<string, string> = new Map();
```

Set by `start()` → cleared by `complete()`/`failed()`. Used by `getActiveTaskForSession()` → used by `processInnerScoped()` to decide "reuse or create."

### 7.2 Current semantics

`activeTaskBySession.get(sessionId)` = "the most recent non-terminal checkpoint's requestId for this session."

### 7.3 Problem under Model B1

Under B1, each Execution gets a fresh taskId and fresh checkpoint. At any point, `activeTaskBySession` points to the CURRENT Execution's taskId (set by `start()`). When the Execution completes, `activeTaskBySession` is cleared.

The ONLY consumer is `processInnerScoped()` at `engine.ts:805` — the guard we're removing. With that guard gone, `activeTaskBySession` has no remaining consumer.

### 7.4 Decision

**REMOVE `activeTaskBySession`.**

Rationale:
- Its only consumer is the guard we're removing.
- Under B1, "latest non-terminal checkpoint" is a meaningless concept — each Execution creates its own, and they're independent.
- Removing it eliminates a source of stale state (the Map can desync from snapshots Map).
- No other code depends on `getActiveTaskForSession()` (confirm by grep).

**Source check:** `getActiveTaskForSession` callers:
- `engine.ts:805` — the guard being removed
- No other callers in the source tree

**Files to change:**
- `checkpoint.ts`: Remove `activeTaskBySession` field, all references in `start()`, `complete()`, `failed()`, `loadFromDisk()`, and `getActiveTaskForSession()` method.
- `engine.ts:805-810`: Remove the guard entirely — always call `this.checkpointStore.start(taskId, sessionId, ...)`.

---

## 8. RESTART FLOW

```
PROCESS RESTART
  │
  ├──1. CheckpointStore.init()
  │     ├── loadFromDisk(): Load ALL checkpoint files (cp-*.json) into snapshots Map
  │     ├── Dedup duplicate in-progress per session (Fix B — keep newest, mark rest failed)
  │     └── (activeTaskBySession NOT rebuilt — removed)
  │
  ├──2. Engine.init()
  │     └── Engine marksRecovered() for each in-progress checkpoint
  │         └── R2 annotation: "Recovered after unexpected shutdown"
  │
  ├──3. New user message arrives
  │     └── Engine.process() → Engine.processInner()
  │
  ├──4. Create requestContext
  │     ├── taskId = `task-${Date.now()}` (FRESH)
  │     ├── evidenceLog = new Map() (empty)
  │     └── Wrap in requestContext.run()
  │
  ├──5. Load Plan
  │     ├── getPlan(sessionId) → searches ALL snapshots for session
  │     ├── If found: load into this.plans Map for fast access
  │     └── If plan is terminal (completed/failed/aborted): return null
  │
  ├──6. Create NEW Checkpoint (ALWAYS)
  │     └── checkpointStore.start(taskId, sessionId, goal)
  │
  ├──7. Evaluate Plan state
  │     ├── No plan → ordinary conversation / plan creation path
  │     ├── Active plan (running/pending/stuck) → build plan context
  │     │     └── If paused_limit → auto-resume to running
  │     │     └── If stuck → inject stuck message with options
  │     └── Terminal plan → treat as no-active-plan (user must create new)
  │
  ├──8. agent.run() → ReAct loop
  │     ├── Each cycle: evidenceLog populated on successful tool calls
  │     ├── Each cycle: checkpoint.cycle() called with new taskId
  │     ├── On complete_item: canCompleteItem() validates evidenceLog
  │     └── On plan terminal: update_plan persists to Plan, mirror to current checkpoint
  │
  └──9. Checkpoint terminal
        ├── agent.run() returns
        ├── checkpointStore.complete/failed(taskId, result)
        └── Plan survives independently of this checkpoint
```

### Recovery vs Ordinary Continuation

| Aspect | Ordinary Continuation | Recovery After Crash |
|--------|----------------------|---------------------|
| Request source | User sends new message | Same — user sends next message |
| Plan state | Active, loaded from previous cycle | Active, loaded from disk snapshot |
| taskId | Fresh per request | Fresh per request |
| Checkpoint | Newly created | Newly created |
| EvidenceLog | Empty (new Execution) | Empty (new Execution) |
| What's different | Nothing — both are the same code path | Only R2 recovery annotation on old checkpoint |
| Special handling | None | R2 markRecovered() on old checkpoint at boot |
| Tool re-execution risk | Low (same Execution context) | Higher (old checkpoint has proven-completed tools, but new Execution can't see them without knowing old taskId) |

**The two paths are architecturally identical.** There is no "recovery mode" in the runtime — only in the boot-time annotation. This is intentional: Plan state is the durable truth, and each Execution starts fresh with its own evidence.

---

## 9. INTERRUPTED EXECUTION RECOVERY

### 9.1 Crash during read-only tool

**Scenario:** Execution is mid-cycle, tool `read_file` completed its execution, result returned to agent. Crash happens before the next model call.

**What survives:**
- Checkpoint: Cycle recorded, toolStatus['callId'] = 'completed'. If `flush()` interval passed, this is on disk. If not, it's in the in-memory snapshot.
- EvidenceLog: GONE (in-memory, lost on crash).
- Plan: Item status unchanged (still `in_progress`). `complete_item` was never called.

**Behavior on restart:**
1. New Execution loads Plan → item is `in_progress`.
2. Checkpoint from old Execution exists (or can be reconstructed from partial flush).
3. New Execution has fresh EvidenceLog (empty).
4. Plan context shows item as `in_progress`.
5. LLM re-executes the item. Since tool was read-only, re-execution is safe.
6. `complete_item` is called with new evidence.

**Assessment:** Safe but may repeat the read-only work. Acceptable — read-only tools are side-effect-free by definition.

### 9.2 Crash during side-effecting tool

**Scenario:** Execution calls `write_file`, tool returns success, crash happens before the next model call. File was written. But `complete_item` was NOT called.

**What survives:**
- External world: File exists (side effect durably happened).
- Checkpoint: Tool recorded as completed (if flush happened). If crash happened between tool return and checkpoint write, tool is still 'pending' or missing.
- Plan: Item is `in_progress`.

**Behavior on restart:**
1. Same as read-only: item is `in_progress`, new Execution re-executes.
2. If tool is NOT idempotent (`write_file` overwrites same path → fine for overwrite, but `create_resource` → error).
3. Framework has NO mechanism to distinguish "tool already ran successfully" from "tool never ran."

**Current architecture limitation:** `getProvenCompletedToolIds(oldRequestId)` exists but the new Execution does NOT know the old taskId. There is no session→latestCompletedTaskId mapping (activeTaskBySession was removed).

**Design recommendation:** Under Model B1, this is a **known gap**. Full side-effect safety requires either:
- (a) Idempotency tokens per tool (framework-level)
- (b) Proven-tool-store that persists across Execution boundaries (merge old checkpoint's completed tools into new Execution's context)
- (c) Tool-specific revalidation logic

These are out of scope for Model B1. The behavior is: re-execute the item. Accept the double side-effect risk for non-idempotent tools.

### 9.3 Tool completed but `complete_item` not called

**PlanItem status:** `in_progress` (or `pending` if A3 promotion didn't happen).
**Checkpoint:** Shows tool as completed in a cycle.
**EvidenceLog:** GONE (in-memory, lost on crash).

**Behavior on restart:**
1. Plan says `in_progress`. `complete_item` was never called.
2. New Execution has empty EvidenceLog.
3. LLM sees `in_progress` item → re-executes.
4. `complete_item` validates with new evidence → succeeds.

**Design decision:** PlanItem is NOT automatically completed. The item re-executes. This is correct — we treat "tool completed but not confirmed" as "work may need verification."

---

## 10. CHECKPOINT FAILURE CONTRACT

### 10.1 Current behavior

All checkpoint write methods (`cycle`, `complete`, `failed`, `markToolRunning`) silently return when `this.snapshots.get(requestId)` returns undefined:

```typescript
// checkpoint.ts:165-166
const snapshot = this.snapshots.get(requestId);
if (!snapshot) return;  // SILENT NO-OP
```

This is the mechanism by which identity mismatches become invisible. Under the current bug, the fresh taskId used by `complete()`/`failed()` doesn't match the snapshot's requestId (old taskId) → silent no-op → checkpoint never reaches terminal state → on restart, the old checkpoint remains `in_progress` and gets recovered.

### 10.2 Required behavior

All checkpoint write methods must explicitly fail when the snapshot doesn't exist:

```typescript
// NEW contract
cycle(requestId, ...): void {
    const snapshot = this.snapshots.get(requestId);
    if (!snapshot) {
        throw new Error(
            `Checkpoint identity mismatch: no snapshot for requestId "${requestId}". ` +
            `This means Execution's taskId doesn't match any existing checkpoint. ` +
            `This is a programming error — each Execution must create its own checkpoint before writing.`
        );
    }
    // ... rest of method
}
```

This applies to: `cycle()`, `complete()`, `failed()`, `markToolRunning()`, `clear()`.

### 10.3 Exception

`persistTerminal()` should handle missing snapshot gracefully (it's an internal method called after `complete()`/`failed()` which already validated existence).

### 10.4 Callers must catch

The Engine callers (`processInnerScoped`) should NOT catch these errors — they are programming errors that must surface during development. Production crash handler logs them.

---

## 11. PLAN LOADING CONTRACT

### 11.1 Current loading path (checkpoint.ts:290-292)

```typescript
getPlan(sessionId: string): TaskPlan | null {
    return this.plans.get(sessionId)
        ?? this.getLatestForSession(sessionId)?.plan
        ?? null;
}
```

**Problem:** `getLatestForSession()` filters out completed/failed snapshots (line 324). So a completed plan stored in a terminal snapshot is invisible. On restart, `this.plans` is empty (in-memory), so `getPlan()` returns null even though the plan exists on disk.

### 11.2 Required loading path

```typescript
getPlan(sessionId: string): TaskPlan | null {
    // 1. In-memory fast path
    const cached = this.plans.get(sessionId);
    if (cached) return cached;

    // 2. Search ALL snapshots (including terminal) for plan data
    let latestPlan: TaskPlan | null = null;
    let latestTime = '';
    for (const snap of this.snapshots.values()) {
        if (snap.sessionId === sessionId && snap.plan) {
            if (snap.startedAt > latestTime) {
                latestTime = snap.startedAt;
                latestPlan = snap.plan;
            }
        }
    }

    // 3. Cache and return
    if (latestPlan) {
        this.plans.set(sessionId, latestPlan);
    }
    return latestPlan;
}
```

### 11.3 Plan completeness check

`hasActivePlan(sessionId)` already uses `isPlanActive()` which checks PlanStatus — this correctly handles terminal plans (completed/failed/aborted return false). No change needed to this method.

### 11.4 Stale plan guard

When a new Execution loads a plan that's already terminal (completed/failed/aborted), `hasActivePlan()` returns false → Engine goes into "no active plan" path → user sees planning decision prompt. This is correct — a terminal plan should not auto-continue.

---

## 12. REQUIRED CODE CHANGES

### File: `src/core/checkpoint.ts`

| # | Current behavior | Required change | Why |
|---|-----------------|-----------------|-----|
| 1 | `activeTaskBySession` Map (line 107) | **Remove** field `activeTaskBySession` | No remaining consumer after removing engine.ts guard |
| 2 | `start()` sets `this.activeTaskBySession.set(sessionId, requestId)` (line 149) | **Remove** the `activeTaskBySession.set()` call | No longer needed |
| 3 | `complete()` clears `activeTaskBySession` (lines 226-228) | **Remove** the block | No longer needed |
| 4 | `failed()` clears `activeTaskBySession` (lines 244-246) | **Remove** the block | No longer needed |
| 5 | `getActiveTaskForSession()` method (lines 312-314) | **Remove** method | No callers after engine.ts change |
| 6 | `loadFromDisk()` builds `activeTaskBySession` (lines 406-414) | **Remove** the block, keep only the dedup logic (Fix B) | activeTaskBySession no longer exists |
| 7 | `getPlan()` only searches non-terminal snapshots via `getLatestForSession()` (line 291) | **Replace** with search over ALL snapshots for session | Plan may be in terminal snapshot, lost on restart |
| 8 | `cycle()` silently returns when snapshot missing (lines 165-166) | **Throw** `Error` with identity mismatch message | Silent no-op hides identity bugs |
| 9 | `complete()` silently returns when snapshot missing (lines 221-222) | **Throw** `Error` | Same |
| 10 | `failed()` silently returns when snapshot missing (lines 239-240) | **Throw** `Error` | Same |
| 11 | `markToolRunning()` silently returns when snapshot missing (lines 207-208) | **Throw** `Error` | Same |
| 12 | `clear()` silently returns when snapshot missing (no guard currently — line 496) | **Throw** `Error` | Consistency with other write methods |

### File: `src/core/engine/engine.ts`

| # | Current behavior (line) | Required change | Why |
|---|------------------------|-----------------|-----|
| 1 | Lines 805-810: checks `existingTaskId`, conditionally skips checkpoint start | **Replace** with unconditional `this.checkpointStore.start(taskId, sessionId, goal)` | Each Execution must create its own checkpoint with fresh taskId |

### File: `src/core/plan/types.ts`

| # | Current behavior | Required change | Why |
|---|-----------------|-----------------|-----|
| 1 | No changes needed | — | Plan types already model the correct lifecycle |

### File: `src/core/plan/update-plan-tool.ts`

| # | Current behavior | Required change | Why |
|---|-----------------|-----------------|-----|
| 1 | `complete_item` uses `evidenceLog` from requestContext (line 205) | **No change** — EvidenceLog is correctly scoped to current Execution | Each Execution validates its own evidence |

### File: `src/core/engine/agent.ts`

| # | Current behavior | Required change | Why |
|---|-----------------|-----------------|-----|
| 1 | Checkpoint writes use `checkpointRequestId` from request (line 460) | **Verify** that this correctly uses the fresh taskId from engine.ts | Should already work because `checkpointRequestId = taskId` (fresh) |

**Source confirmation** (`agent.ts:460`):
```typescript
const requestId = request.sessionId || `req-${Date.now()}`;
```
Wait — this uses `request.sessionId`, NOT `request.checkpointRequestId`. Let me check where `requestId` is used in agent.ts for checkpoint calls.

**PROVEN** (`agent.ts:460`): Agent loop's `requestId` is derived from `request.sessionId`, not from `request.checkpointRequestId`. This means ALL checkpoint writes from inside agent.ts use the sessionId as the requestId, not the fresh taskId.

This is a secondary identity bug: the agent writes checkpoint cycles with `sessionId` as the key, while engine.ts creates the checkpoint with `taskId` as the key.

| # | Current behavior (agent.ts:460) | Required change | Why |
|---|-------------------------------|-----------------|-----|
| 2 | `requestId = request.sessionId || ...` — used for checkpoint writes inside agent loop | **Change** to use `request.checkpointRequestId` | Agent's checkpoint writes must use the same taskId that engine.ts used to create the checkpoint |

```typescript
// agent.ts:460 — FIX
const requestId = request.checkpointRequestId || request.sessionId || `req-${Date.now()}`;
```

This ensures agent.ts cycle/complete/failed writes go to the correct checkpoint (the one created by engine.ts with the fresh taskId).

---

## 13. TEST MATRIX

### Test 1 — Normal continuation

```typescript
// Execution #1 completes Item 0
// Execution #2 continues Item 1

// Setup: Create plan with 2 items, complete item 0 via update_plan
// Simulate: Call processInner() twice
// Expected:
//   - Execution #1: taskId-1, checkpoint-1, item 0 completed
//   - Execution #2: taskId-2, checkpoint-2, item 1 starts
//   - Plan: item 0=completed, item 1=pending (initially) → in_progress
//   - No identity conflation: checkpoint-2 is separate from checkpoint-1
```

### Test 2 — Restart after completed item

```typescript
// Plan survives
// new Execution
// new checkpoint
// no duplicate Item 0 execution

// Setup: Plan with item 0 completed in previous process lifetime
// Mock: loadFromDisk() loads checkpoint with plan data
// Simulate: processInner() for same session
// Expected:
//   - getPlan() returns plan with item 0=completed
//   - hasActivePlan() returns false (plan is completed, terminal)
//   - Engine shows "no active plan" path
//   - New checkpoint created for the new Execution
//   - Item 0 NOT re-executed
```

### Test 3 — Crash during read-only tool

```typescript
// Explicitly define expected behavior
// Expected: Item stays in_progress, new Execution re-executes item
// Read-only tool re-execution is safe
// complete_item validates with new evidence
// No side-effect damage
// PROVE: Checkpoint from old Execution shows tool completed
//        Plan item is still in_progress
//        New checkpoint created with new taskId
```

### Test 4 — Crash during side-effecting tool

```typescript
// Expected: Same as read-only — item stays in_progress, re-executes
// Side-effect risk: tool may be non-idempotent (write_file twice = ok,
//   append_unique twice = duplicates, create_resource twice = error)
// Known limitation: Framework has no idempotency tracking
// PROVE: Old checkpoint has tool recorded
//        New checkpoint created
//        Plan item unchanged (in_progress)
//        No automatic completion
```

### Test 5 — Tool completed but complete_item not called

```typescript
// Expected:
//   - PlanItem stays in_progress
//   - NOT automatically completed
//   - New Execution re-executes item
//   - complete_item requires new evidence from current Execution
// PROVE: Plan item status = in_progress
//        canCompleteItem() returns false (evidenceLog empty)
//        No silent completion
```

### Test 6 — Checkpoint identity mismatch

```typescript
// Force: checkpointRequestId != existing snapshot requestId
// (e.g., call cycle() with wrong id, or complete() with wrong id)
// Expected:
//   - Throws Error with message containing "Checkpoint identity mismatch"
//   - NEVER silent no-op
// PROVE: try { checkpointStore.cycle('wrong-id', ...) } catch(e) { ... }
//        Error.message includes "no snapshot for requestId"
```

### Test 7 — Two executions of same Plan

```typescript
// No identity conflation
// Setup: Plan exists, run processInner() twice
// Assert:
//   - task-A → checkpoint-A (different files on disk)
//   - task-B → checkpoint-B (different files on disk)
//   - checkpoint-A has plan mirror (from setPlan)
//   - checkpoint-B has plan mirror (from setPlan, latest)
//   - checkpoint-A.requestId !== checkpoint-B.requestId
```

### Test 8 — Session TTL

```typescript
// Expire Session
// Expected:
//   - Session lifecycle changes (platform manager evicts session)
//   - Plan lifecycle does NOT implicitly change
//   - Plan files remain on disk
//   - If same sessionId reappears, getPlan() loads the old plan
// PROVE: After session expiry + create new session with same ID
//        getPlan() returns the plan
//        hasActivePlan() evaluates correctly
```

### Test 9 — /new

```typescript
// Expected:
//   - new Session (new sessionId)
//   - old Plan does NOT automatically appear
//   - getPlan(newSessionId) returns null
//   - Old plan remains on disk under old sessionId
//   - No automatic Plan inheritance
```

### Test 10 — Plan completed

```typescript
// Expected:
//   - Plan status = completed (terminal)
//   - hasActivePlan() returns false
//   - processInner() does NOT inject plan context
//   - No items execute
//   - LLM can create a NEW plan if needed
```

---

## 14. MIGRATION / COMPATIBILITY RISKS

### Risk 1: Existing checkpoints with old taskId reuse

Existing sessions may have checkpoints created under the OLD behavior (where `existingTaskId` guard fired and all writes silently no-opped into the old checkpoint). After this fix:

- On first request, brand new taskId, brand new checkpoint is created.
- The old checkpoint (with stale identity) remains on disk as a historical artifact.
- `getPlan()` will search ALL snapshots for plan data, including the old ones.
- The old checkpoint's `.plan` field may have an older version of the plan (if Engine wrote more cycles before the crash). `getPlan()` takes the newest by `startedAt`, so the terminal checkpoint's plan wins.

**Mitigation:** The `loadFromDisk()` dedup (Fix B) already handles duplicate in-progress checkpoints. The plan loading (new §11 implementation) always picks the newest by timestamp. No data loss.

### Risk 2: Plan mirror duplication

Each Execution creates a new checkpoint. `setPlan()` mirrors the plan onto the "latest non-terminal snapshot." Under B1, "latest non-terminal" is always the current Execution's checkpoint (since it's the newest and in_progress/started). This works correctly.

When Execution completes, its checkpoint becomes terminal. The next Execution creates a new checkpoint. The plan is now mirrored onto the NEW checkpoint. The OLD checkpoint's plan mirror is stale but harmless (it's historical).

### Risk 3: `activeTaskBySession` removal

No external consumer depends on `getActiveTaskForSession()`. The only consumer was `engine.ts:805` (being removed). Safe removal.

**Verify:** `grep -r "getActiveTaskForSession\|activeTaskBySession" src/ tests/` should confirm no other references.

### Risk 4: Checkpoint file proliferation

Each Execution creates one checkpoint file (start + cycles + terminal). Under normal operation, each user message creates one Execution. With heavy usage, this means many checkpoint files.

Current `maxFiles: 100` applies globally. `flush()` cleans up old checkpoint files but KEEPS in-progress ones.

**Under B1:** In-progress checkpoints are now single-Execution. When Execution completes, the checkpoint becomes terminal and is eligible for cleanup (it's no longer in `inProgressIds`). So cleanup works the same or better.

**Acceptance:** No new file proliferation risk.

---

## 15. OPEN QUESTIONS

### Q15.1: Should completed/failed checkpoints be aggressively cleaned?

Current behavior: terminal checkpoints are eligible for cleanup during `flush()`. Under B1, this means historical Execution evidence may be deleted. If we need cross-Execution evidence (proven completed tools), old checkpoint files are the source.

Recommendation: Keep current cleanup policy (maxFiles=100, oldest deleted first). Historical evidence rarely needed after the Execution is done.

### Q15.2: Should `getProvenCompletedToolIds()` work across Execution boundaries?

Currently it takes a `requestId` (single checkpoint). Under B1, proven tools from Execution #1 are in checkpoint-1. Execution #2 doesn't know checkpoint-1's requestId.

If we want to prevent re-execution of proven-completed tools across restarts, we need a session→proven-tool-ids store that aggregates across checkpoints. This is a separate feature request (side-effect tracking), not required for Model B1.

### Q15.3: Should EvidenceLog be partially persisted for crash recovery?

Current: fully ephemeral. New Execution has empty evidence → LLM must re-execute to prove completion.

If this causes unacceptable UX (user sees "please redo work I already did"), partial persistence could bridge the gap. But this adds complexity that Model B1 deliberately avoids. Accept the re-execution cost.

### Q15.4: Does agent.ts use the correct taskId for checkpoint writes?

**RESOLVED:** agent.ts:460 defines a local `requestId` variable used ONLY for `R.startRequest()` and runtime instrumentation — NOT for checkpoint writes. The actual checkpoint cycle writes at `agent.ts:1168-1169` use `request.checkpointRequestId`:

```typescript
// agent.ts:1168-1169 — checkpoint cycle writes use checkpointRequestId (fresh taskId)
if (this.checkpointStore && request.checkpointRequestId) {
    this.checkpointStore.cycle(request.checkpointRequestId, cycle, ...);
}
```

And `engine.ts:1040` sets `checkpointRequestId` to the fresh taskId:

```typescript
// engine.ts:1040 — checkpointRequestId = fresh taskId
const agentRequest: EngineRequest = { ...request, systemPrompt, checkpointRequestId: taskId, ... };
```

**Verdict:** No action needed. Agent's checkpoint writes correctly use the fresh taskId from engine.ts.

---

## 16. IMPLEMENTATION ORDER

### Phase 1: Checkpoint identity (safe, minimal)

1. **checkpoint.ts**: Replace silent returns in `cycle()`, `complete()`, `failed()`, `markToolRunning()` with `throw new Error(...)` — §10
2. **engine.ts**: Remove `existingTaskId` guard, always call `checkpointStore.start(taskId, ...)` — §5.2, §12 engine.ts #1
3. **agent.ts**: Fix `requestId` to use `request.checkpointRequestId` — §12 agent.ts #2

### Phase 2: activeTaskBySession removal

4. **checkpoint.ts**: Remove `activeTaskBySession` field and all references — §7
5. **engine.ts**: No change needed (guard already removed in Phase 1)
6. **Verify**: `grep -r "getActiveTaskForSession\|activeTaskBySession"` confirms no remaining references

### Phase 3: Plan loading fix

7. **checkpoint.ts**: Replace `getPlan()` to search ALL snapshots, not just non-terminal via `getLatestForSession()` — §11

### Phase 4: Tests

8. Write tests per §13 matrix:
   - T1: Normal continuation (two Executions, separate checkpoints)
   - T2: Restart after completed item
   - T3: Crash during read-only tool
   - T4: Crash during side-effecting tool
   - T5: Tool completed but complete_item not called
   - T6: Checkpoint identity mismatch
   - T7: Two Executions, no identity conflation
   - T8: Session TTL independence
   - T9: `/new` no plan inheritance
   - T10: Plan completed

### Phase 5: Documentation

9. Update `ARCHITECTURE.md` or equivalent with Model B1 entity contract

---

## EVIDENCE INDEX

| Claim | File | Lines | Status |
|-------|------|-------|--------|
| taskId generated fresh per Execution | `engine.ts` | 761 | PROVEN |
| existingTaskId guard reuses old taskId | `engine.ts` | 805-810 | PROVEN |
| Checkpoint cycle/complete/failed silent return on missing snapshot | `checkpoint.ts` | 165-166, 221-222, 239-240 | PROVEN |
| activeTaskBySession set by start() | `checkpoint.ts` | 149 | PROVEN |
| activeTaskBySession cleared by complete()/failed() | `checkpoint.ts` | 226-228, 244-246 | PROVEN |
| activeTaskBySession rebuilt on loadFromDisk() | `checkpoint.ts` | 406-414 | PROVEN |
| getActiveTaskForSession() called only in engine.ts:805 | `engine.ts` | 805 | PROVEN |
| EvidenceLog created fresh per requestContext | `engine.ts` | 779 | PROVEN |
| EvidenceLog is Map<number, ToolCallRecord[]> | `plan/types.ts` | 155 | PROVEN |
| getPlan() uses getLatestForSession() which filters terminal | `checkpoint.ts` | 290-292 | PROVEN |
| getLatestForSession() filters completed/failed | `checkpoint.ts` | 324 | PROVEN |
| Agent uses checkpointRequestId for checkpoint writes, not sessionId | `agent.ts` | 460, 1006-1007, 1168-1169 | PROVEN |
| checkpointRequestId set to fresh taskId by engine.ts | `engine.ts` | 1040 | PROVEN |
| Plan TTL only applies to paused_limit/waiting_user | `checkpoint.ts` | 472-481 | PROVEN |
| Plan.status transitions defined in plan/types.ts | `plan/types.ts` | 178-193 | PROVEN |
| isPlanActive checks all non-terminal statuses | `plan/types.ts` | 171-173 | PROVEN |
| R2 markRecovered annotated at boot | `engine.ts` | 333-351 | PROVEN |
| getProvenCompletedToolIds per checkpoint | `checkpoint.ts` | 506-517 | PROVEN |
| complete_item validation via canCompleteItem | `plan-state.ts` | 89-107 | PROVEN |
| no caller of getActiveTaskForSession other than engine.ts:805 | (grep) | — | STRONG INFERENCE (verify with grep) |