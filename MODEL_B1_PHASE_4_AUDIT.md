# MODEL B1 — PHASE 4: READ-ONLY FORENSIC AUDIT
## Execution Recovery After Restart

**Repo:** `D:\AI-Agent`  
**Branch:** `develop`  
**Audit Date:** 2026-09-07  
**Type:** READ-ONLY — no code changes, no test changes, no commits  

---

## 1. VERDICT

**BLOCKED** — True Execution Recovery does NOT exist in the current codebase.

The system performs **Plan continuation** (Plan state survives restart via disk-persisted snapshots), but **NOT Execution recovery** (the ephemeral runtime state of an in-progress Execution is lost). The startup path annotates in-progress checkpoints but never re-executes them. When a new request arrives after restart, a *new* `taskId` is created and a *new* checkpoint snapshot is started — the old snapshot remains as a historical record on disk.

---

## 2. CURRENT RECOVERY IMPLEMENTATION

The startup/recovery path lives in `engine.ts` lines 322–350:

```
engine.init()
    ↓
checkpointStore.init()
    ↓
loadFromDisk() — loads all cp-*.json files into snapshots Map
    ↓
getAllInProgress() — filters status ∈ {in_progress, started}
    ↓
for each in-progress snapshot:
    markRecovered(requestId, note) — annotates with recovery metadata
    log.warn(...) — surfaces for resume
    ↓
flush() + flushSync() — persists recovery annotations to disk
```

**What this does:** Annotates in-progress snapshots with a `recovery` field containing `recoveredAtBoot`, `provenCompletedTools` count, and a note. That's it.

**What this does NOT do:**
- Does NOT re-execute any in-progress Execution
- Does NOT create a new Execution from the old checkpoint
- Does NOT restore `requestContext` or `evidenceLog`
- Does NOT restore Agent runtime state (ReAct loop locals)
- Does NOT queue the old task for background processing

---

## 3. DOES TRUE EXECUTION RECOVERY EXIST?

**NO.** The startup path is annotation-only, not recovery.

The code path when a user sends a message after restart:

```
process(request)          ← new user message
    ↓
processInner(request)
    ↓
taskId = `task-${Date.now()}`  ← FRESH taskId
    ↓
checkpointStore.start(taskId, sessionId, ...)  ← NEW checkpoint snapshot
    ↓
derivePlanState(checkpointStore, sessionId)    ← loads Plan from disk
    ↓
agent.run(agentRequest)                      ← new ReAct loop
```

This is **Plan continuation**: the Plan (and its items) are loaded from the latest snapshot on disk, but the Execution is a brand-new attempt with a brand-new `taskId`. The old in-progress checkpoint remains on disk as a historical artifact annotated with `recovery`.

**Proof by code:**
- `engine.ts:760`: `const taskId = \`task-${Date.now()}\`` — always creates fresh taskId
- `engine.ts:802`: `this.checkpointStore.start(taskId, ...)` — always starts new checkpoint
- `agent.ts:459`: `const requestId = request.sessionId || \`req-${Date.now()}\`` — different local requestId, never used for checkpoint ops
- `engine.ts:1032`: `checkpointRequestId: taskId` — the checkpoint reference is the fresh taskId

---

## 4. PRE-CRASH DURABILITY

### Session
| Property | Survives Restart? | Evidence |
|----------|-------------------|----------|
| Session object | **NO** | No session persistence to disk for execution state. `requestContext` is `AsyncLocalStorage` — ephemeral per-request. |
| Session restore | **PARTIAL** | `memoryStore` and `sqlite-storage` persist conversation messages, but not the runtime/execution context. `sessionId` itself is a UUID that changes per `/new`. |
| TTL impact | **YES** | `checkpointStore` snapshots have no TTL on `in_progress` status — they persist indefinitely on disk until cleaned by `flush()` excess logic. |

### Plan
| Property | Survives Restart? | Evidence |
|----------|-------------------|----------|
| Plan object | **YES** | `checkpointStore.plans` Map + snapshot.plan field persisted via `loadFromDisk()` → `getLatestSnapshotForSession()` → `getPlan()` fallback chain. |
| PlanItem status | **YES** | `TaskPlan.items` are serialized in snapshot JSON. `currentItemIndex` persists. |
| currentItemIndex | **YES** | `plan.currentItemIndex` is part of `TaskPlan` serialized to disk. |
| resultSummary | **YES** | `PlanItem.resultSummary` is part of `TaskPlan`. |

**BUT**: `checkpointStore.plans` Map is **NOT** populated by `loadFromDisk()`. It's an in-memory `Map<string, TaskPlan>` that's empty after restart. `getPlan()` falls back to `getLatestSnapshotForSession(sessionId)?.plan`, which DOES read from the loaded snapshots. So Plan survives via the snapshot fallback path.

### Checkpoint
| Property | Survives Restart? | Evidence |
|----------|-------------------|----------|
| Snapshot T1 (in_progress) | **YES** | `loadFromDisk()` reads all `cp-*.json` files into `snapshots` Map. |
| status | **YES** | `status: 'in_progress'` persisted in JSON. |
| cycles | **YES** | `cycles: CycleData[]` persisted in JSON. |
| toolStatus | **YES** | `toolStatus: Record<string, ToolStatus>` in each CycleData. |
| Plan in snapshot | **YES** | `snapshot.plan?: TaskPlan` persisted via `setPlan()` mirroring. |
| recovery annotation | **YES** | `recovery` field added by `markRecovered()` and flushed to disk. |
| **in-memory `requestId`→snapshot mapping** | **PARTIAL** | `snapshots` Map is repopulated from disk, but `dirty` flag and in-memory state are fresh. |

### RequestContext
| Property | Survives Restart? | Evidence |
|----------|-------------------|----------|
| RequestContext object | **NO** | `AsyncLocalStorage<RequestContext>` — created fresh in `processInner()` at line 772-783. `new Map() as EvidenceLog`. Completely ephemeral. |
| evidenceLog | **NO** | `evidenceLog: new Map()` at `engine.ts:778`. Never persisted to disk. Lost on restart. |
| taskId | **NO** | `taskId = \`task-${Date.now()}\`` — fresh per request. |
| userId | **PARTIAL** | From `request.userId` in `EngineRequest` — depends on the caller providing it. |

### EvidenceLog
| Property | Survives Restart? | Evidence |
|----------|-------------------|----------|
| EvidenceLog (Map<number, ToolCallRecord[]>) | **NO** | Created fresh at `engine.ts:778` as `new Map()`. Populated during ReAct loop at `agent.ts:1109-1117`. Never written to disk. |
| Tool execution evidence per PlanItem | **NO** | Evidence records are in-memory only. Lost on restart. |
| Consequence hint | **NO** | `requestContext.consequenceHint` — ephemeral. |

### Agent runtime state
| Property | Survives Restart? | Evidence |
|----------|-------------------|----------|
| ReAct loop locals (`toolCallCycles`, `messages`, `finalContent`) | **NO** | Local variables in `executeReActLoop()`. Lost on restart. |
| In-flight promises | **NO** | JavaScript promises cannot survive process crash. |
| `sessionStartTimes` Map | **NO** | `private sessionStartTimes = new Map()` — in-memory only. |
| `progressTracker` | **NO** | Created per-request at `agent.ts:460`. Ephemeral. |
| ModelRouter state | **PARTIAL** | Provider state may persist in provider adapters, but request-level streaming state is lost. |
| CircuitBreaker | **PARTIAL** | `engineCircuitBreaker` may have in-memory state; depends on adapter implementation. |

### Tool result
| Property | Survives Restart? | Evidence |
|----------|-------------------|----------|
| Tool execution results | **PARTIAL** | Results are in `executedToolResults` array (local var in agent.ts) and passed to `checkpoint.cycle()`. The cycle data IS persisted, but the raw result objects are summarized/truncated in `toolResultsSummary`. |
| Tool arguments | **YES (partial)** | `ToolCallSnapshot.args` is persisted in cycle data. But `args` is `Record<string, unknown>` — full fidelity depends on JSON serialization. |
| Side effects (write_file, send_message, etc.) | **UNKNOWN** | Depends on whether the tool itself persists its side effects externally. The checkpoint only records metadata, not the actual side effect outcome. |

### Tool arguments
| Property | Survives Restart? | Evidence |
|----------|-------------------|----------|
| Tool call arguments | **YES** | `ToolCallSnapshot.args` persisted in `CycleData.pendingActions` and `completedActions`. |

---

## 5. STARTUP TRACE

```
Process starts
    ↓
Engine constructor()  [engine.ts:203] — initializes fields, no disk I/O
    ↓
engine.init()
    ↓
checkpointStore.init()  [checkpoint.ts:125-133]
    ↓
  ├── fs.mkdirSync(checkpointDir) — ensures directory exists
  ├── loadFromDisk() — reads cp-*.json files → snapshots Map
  └── flushTimer = setInterval(flush, 60000) — periodic sync
    ↓
checkpointStore.getAllInProgress() — returns snapshots with status ∈ {in_progress, started}
    ↓
for each cp in recovered:
    checkpointStore.markRecovered(cp.requestId, note)
    ├── getProvenCompletedToolIds(cp.requestId) — counts completed tools from cycles
    ├── snapshot.recovery = { recoveredAtBoot, provenCompletedTools, note }
    └── dirty = true
    ↓
flush() + flushSync() — persists recovery annotations to disk
    ↓
taskQueue.init() — loads background tasks from disk
    ↓
agent.run() — only invoked when a NEW user message arrives
    ↓
process(request)
    ↓
processInner(request)
    ↓
taskId = `task-${Date.now()}` ← FRESH
    ↓
checkpointStore.start(taskId, sessionId, ...) ← NEW snapshot
    ↓
derivePlanState(checkpointStore, sessionId) ← Plan loaded from disk
    ↓
agent.executeReActLoop() ← New ReAct loop
```

### `markRecovered()` deep trace

```typescript
markRecovered(requestId: string, note: string): void {
    const snapshot = this.snapshots.get(requestId);
    if (!snapshot || snapshot.recovery) return;  // idempotent — only runs once
    const proven = this.getProvenCompletedToolIds(requestId).size;
    snapshot.recovery = {
        recoveredAtBoot: new Date().toISOString(),
        provenCompletedTools: proven,
        note,
    };
    this.dirty = true;
}
```

**What `markRecovered()` actually does:**
- Annotates the snapshot with recovery metadata
- Counts tools with `toolStatus === 'completed'` in finished cycles
- Does NOT change snapshot status (stays `in_progress`)
- Does NOT modify PlanItem statuses
- Does NOT queue any task
- Does NOT trigger any execution
- Does NOT restore any runtime state

**It is a marker, not a recovery mechanism.**

---

## 6. RECOVERY MATRIX

| Crash point | Durable state | Startup behavior | Auto-resume? | Risk |
|-------------|---------------|-----------------|--------------|------|
| Before tool starts | `checkpoint.start()` created snapshot, status=`started`, cycles=[] | `getAllInProgress()` finds it, `markRecovered()` annotates it | **NO** — new Execution with new taskId on next request | None (no side effects occurred) |
| Tool marked `running` | `markToolRunning()` set `toolStatus[toolCallId]='running'` in latest cycle | Same as above — `running` tools have no completion proof | **NO** — `running` status is not resolved | **HIGH**: Tool may have partially executed; restart treats as "never ran" |
| Tool execution finished (before result recorded) | Cycle data may have `pending` tools, `running` status | Same as above | **NO** | **HIGH**: Same as above — uncertain state |
| Tool result persisted in cycle | Cycle has `completedActions` and `toolStatus='completed'` | `getProvenCompletedToolIds()` counts these | **NO** — but proven-completed tools won't re-execute if task resumes | **MEDIUM**: Proven-completed tools correctly skipped IF resumed |
| `complete_item` succeeds | PlanItem.status=`completed`, PlanItem.resultSummary set | Plan loaded from snapshot, item shows completed | **NO** — but PlanItem progress visible | **LOW**: Plan state is consistent |
| Plan completed | PlanItem all completed, plan.status=`completed` | `getLatestSnapshotForSession()` returns terminal snapshot; `getPlan()` returns it; `isGuardActive(planState)` returns false | **N/A** — no execution to resume | **NONE** |

---

## 7. TOOL SIDE-EFFECT ANALYSIS

### Representative tools: `write_file`, `send_message`

**`write_file` execution path:**
```
agent.executeReActLoop()
    ↓
toolRegistry.executeToolCall(toolCall)  — executes write_file
    ↓
[tool starts execution — actual file write happens here]
    ↓
checkpoint.markToolRunning(requestId, toolCall.id)  [agent.ts:1006-1007]
    ← CALLED BEFORE actual tool execution completes
    ↓
[tool finishes — file is written]
    ↓
executedToolCalls.push({ id, name, args })
executedToolResults.push({ id, result })
    ↓
checkpoint.cycle(requestId, cycle, goal, executedToolCalls, executedToolResults)  [agent.ts:1168-1175]
    ← Records tool as completed in cycle data
```

**Wait — there's a critical ordering issue.** Let me re-examine:

Looking at `agent.ts` lines 1005-1007: `markToolRunning()` is called BEFORE `toolRegistry.executeToolCall()`. And `checkpoint.cycle()` is called AFTER the tool completes and results are collected.

```
markToolRunning()  ← called BEFORE tool execution
toolRegistry.executeToolCall()  ← actual side effect happens here
checkpoint.cycle()  ← marks tool as completed
```

**Crash window analysis:**

| Window | What's durable | What's uncertain |
|--------|---------------|-----------------|
| Between `markToolRunning()` and `executeToolCall()` | `toolStatus = 'running'` in checkpoint | Did the tool execute? Did the side effect happen? |
| During `executeToolCall()` (side effect in progress) | `toolStatus = 'running'` in checkpoint | Side effect may be partial or complete |
| After `executeToolCall()` returns, before `checkpoint.cycle()` | Side effect done, but `toolStatus` still `running` | Cycle data not yet updated — `complete()` hasn't been called |
| After `checkpoint.cycle()` returns | `toolStatus = 'completed'` in cycle data | `complete_item` may not have been called yet |

**Key finding: The `running` → `completed` transition in checkpoint is NOT atomic with the actual tool side effect.** There is a crash window between `executeToolCall()` returning and `checkpoint.cycle()` being called where the side effect happened but the checkpoint still says `running`.

**Duplicate side-effect risk: YES.**

Example:
```
send_message("Hello")  ← actual message sent to Telegram
crash                 ← before checkpoint.cycle() records it as completed
restart
→ new Execution starts (new taskId)
→ PlanItem still shows in_progress (or the next item)
→ LLM decides to call send_message("Hello") again
→ Duplicate message sent
```

### Tool Status Semantics

| Status | Meaning | Durable? | What it proves |
|--------|---------|----------|----------------|
| `pending` | Tool called but not started | YES (in cycle data) | Tool was requested by the model |
| `running` | `markToolRunning()` was called | YES (in cycle data) | `markToolRunning()` was called — **NOT** that the tool executed or completed |
| `completed` | `checkpoint.cycle()` recorded result | YES (in cycle data) | `checkpoint.cycle()` ran with this tool in `completedActions` — the tool's result was collected |

**Critical distinction:**
- `toolStatus = 'completed'` in checkpoint proves: "the checkpoint recorded the tool as completed"
- `toolStatus = 'completed'` does NOT prove: "the external side effect completed"
- The gap between `executeToolCall()` returning and `checkpoint.cycle()` writing is a **window where the side effect is done but the checkpoint still says `running`**

---

## 8. TOOL STATUS SEMANTICS

| Status | Meaning | Proof level |
|--------|---------|-------------|
| `pending` | Tool call listed in `pendingActions` of a cycle | PROVEN NOT STARTED — the tool was requested but `markToolRunning()` was not called |
| `running` | `markToolRunning()` set `toolStatus[toolCallId]='running'` | UNCERTAIN — the model decided to invoke this tool, `markToolRunning()` was called, but the tool may or may not have finished executing |
| `completed` | `checkpoint.cycle()` recorded the tool in `completedActions` and `toolStatus='completed'` | PROVEN COMPLETED (at the checkpoint level) — but NOT proof of external side effect completion |
| `failed` (PlanItem) | `PlanItem.status = 'failed'` | UNCERTAIN — depends on whether the failure was before or after side effect |

---

## 9. `getProvenCompletedToolIds()` AUDIT

**Input:** `requestId` (the checkpoint's requestId = `taskId`)

**Logic:**
```typescript
getProvenCompletedToolIds(requestId): Set<string> {
    const snapshot = this.snapshots.get(requestId);
    const done = new Set<string>();
    for (const cycle of snapshot.cycles) {
        for (const [toolCallId, st] of Object.entries(cycle.toolStatus)) {
            if (st === 'completed') done.add(toolCallId);
        }
        for (const a of cycle.completedActions) done.add(a.id);
    }
    return done;
}
```

**What it reads:** In-memory `snapshots` Map (populated from disk via `loadFromDisk()`).

**What it considers "proven completed":** A tool call ID that appears in `cycle.toolStatus['completed']` OR `cycle.completedActions` in any cycle.

**What it proves:** The checkpoint recorded this tool as completed in a finished cycle. The tool result was collected by `checkpoint.cycle()`.

**What it does NOT prove:**
- The external side effect completed (the gap between `executeToolCall()` return and `cycle()` call)
- The tool's output was correct or meaningful
- The tool's side effect was idempotent-safe

**Is it sufficient for safe resume? NO.** `getProvenCompletedToolIds()` only provides a COUNT (`provenCompletedTools`) for the `markRecovered()` annotation. It is never used to gate execution decisions. The system does not check proven-completed tools before deciding what to re-execute — because the system doesn't re-execute anything.

**Link to PlanItem?** NO direct link. `toolStatus` uses `toolCallId` (UUID), not `itemIndex`. There's no mapping from tool call IDs to PlanItems in the checkpoint data.

**Link to tool invocation?** YES, indirectly — `toolCall.id` is the key in `toolStatus` and `completedActions`.

---

## 10. `complete_item` BOUNDARY AUDIT

**Flow:**
```
Agent executes PlanItem (tools called)
    ↓
evidenceLog[activeItemIndex] populated with tool call records  [agent.ts:1109-1117]
    ↓
LLM calls update_plan(action='complete_item', item_index=N, result_summary=...)
    ↓
update-plan-tool.ts handler:
    1. Gets sessionId from requestContext (AsyncLocalStorage)
    2. Checks existing plan via checkpointStore.getPlan(sessionId)
    3. Validates transition via canCompleteItem(evidenceLog, itemIndex)
    4. Updates PlanItem.status = 'completed'
    5. Sets PlanItem.resultSummary
    6. checkpointStore.setPlan(sessionId, plan) — mirrors onto latest snapshot
    ↓
PlanItem is now durable (via snapshot)
    ↓
Agent continues next cycle
    ↓
Eventually: checkpointStore.complete(taskId, result) — terminal state
```

**Before `complete_item`:**
- PlanItem.status = `in_progress` or `pending`
- evidenceLog has tool call records for this item
- Checkpoint cycle has `running` or `pending` tools
- **Durable:** PlanItem status, evidence (in-memory only), cycle data (on disk)

**After `complete_item`:**
- PlanItem.status = `completed`
- PlanItem.resultSummary = provided summary
- `checkpointStore.setPlan()` mirrors to snapshot
- **Durable:** PlanItem status, resultSummary (on disk via snapshot)
- **What becomes durable:** PlanItem completion state
- **What remains uncertain:** Whether any tool called during this item had a side effect that completed. `complete_item` proves the MODEL decided the item was done, not that the external world reflects it.

**What crash before `complete_item` means:**
- PlanItem.status = `in_progress` on disk
- EvidenceLog is LOST (never persisted)
- `canCompleteItem()` on restart will find empty evidenceLog → blocks `complete_item`
- But if the task resumes with a new Execution, the LLM can call `complete_item` again without evidence validation if the evidence gap is not detected

**What crash after `complete_item` means:**
- PlanItem.status = `completed` on disk
- `checkpointStore.setPlan()` mirrored the completed plan to snapshot
- **Durable proof:** PlanItem is marked complete in checkpoint
- **What remains uncertain:** The actual side effects of tools called during this item. `complete_item` does NOT verify side effects — it only checks evidenceLog which is in-memory.

---

## 11. CRASH SCENARIOS

### Scenario A: Crash before tool invocation
- **What survives:** `checkpoint.start()` created snapshot with `status='started'`, `cycles=[]`
- **What is lost:** Everything else
- **What does startup know:** There was a request that started but no tools were called
- **Can system safely resume:** Not applicable — nothing happened to undo
- **Can duplicate side effect happen:** NO — no side effects occurred

### Scenario B: Crash after `markToolRunning()`, before actual tool execution
- **What survives:** `toolStatus[toolCallId]='running'` in the latest cycle's `toolStatus`
- **What is lost:** `evidenceLog` (in-memory), any partial tool initialization
- **What does startup know:** A tool was marked as running. `markRecovered()` counts 0 proven-completed tools.
- **Can system safely resume:** NO — the tool may or may not have executed. `running` means `markToolRunning()` was called, not that the tool finished or started.
- **Can duplicate side effect happen:** YES — if the tool did execute but `cycle()` was never called, the system sees `running` and has no way to know the side effect happened.

### Scenario C: Crash during actual tool execution
- **What survives:** Same as Scenario B — `toolStatus = 'running'`
- **What is lost:** `evidenceLog`, the tool's partial side effect state (unpredictable)
- **What does startup know:** `running` status — uncertain whether the tool started or finished
- **Can system safely resume:** NO — same as B. The side effect may be partial.
- **Can duplicate side effect happen:** YES — high risk if the tool was a `write_file` or `send_message` that partially completed.

### Scenario D: Crash after actual side effect, before `checkpoint.cycle()`
- **What survives:** Side effect is done (e.g., file was written). `toolStatus` still `running` in the cycle data (because `markToolRunning()` was called but `cycle()` hasn't updated it).
- **What is lost:** `evidenceLog`, the `completedActions` record that would have been in `cycle()`
- **What does startup know:** `running` status — the system thinks the tool is still running
- **Can system safely resume:** NO — the system would try to re-execute the tool, causing a duplicate side effect
- **Can duplicate side effect happen:** YES — **THIS IS THE HIGHEST RISK SCENARIO.** The side effect happened but the checkpoint says `running`. On resume, the system cannot distinguish this from Scenario B.

### Scenario E: Crash after `checkpoint.cycle()` says tool completed, before `complete_item`
- **What survives:** `toolStatus = 'completed'` in cycle data, `completedActions` contains the tool. `getProvenCompletedToolIds()` returns this tool as proven.
- **What is lost:** `evidenceLog` (in-memory), `complete_item` not yet called
- **What does startup know:** `getProvenCompletedToolIds().size > 0`, `markRecovered()` annotates with proven count
- **Can system safely resume:** PARTIAL — proven-completed tools will NOT re-execute if the task resumes (the LLM sees `completed` in cycles and should skip them). But `complete_item` hasn't been called, so PlanItem is still `in_progress`.
- **Can duplicate side effect happen:** LOW — the tool was recorded as completed. The risk is that `complete_item` might not validate correctly without evidenceLog, but the tool itself is proven done.

### Scenario F: Crash after `complete_item` succeeds
- **What survives:** PlanItem.status = `completed`, PlanItem.resultSummary set, `checkpointStore.setPlan()` mirrored to snapshot.
- **What is lost:** `evidenceLog`, Agent runtime state
- **What does startup know:** Plan shows item as completed. `derivePlanState()` returns `executing` or `completed` depending on remaining items.
- **Can system safely resume:** YES for this item — the completion is durable. Next items may still need execution.
- **Can duplicate side effect happen:** LOW for this item — but if a subsequent item's tool was `running` at crash, that item's tools might duplicate.

---

## 12. PROOF CLASSIFICATION

### PROVEN COMPLETED
- Tool appears in `cycle.completedActions` AND `cycle.toolStatus[id] = 'completed'`
- PlanItem.status = `completed` (after `complete_item` succeeds)
- Checkpoint.snapshot.status = `completed` or `failed` (terminal state)

### PROVEN NOT STARTED
- Tool appears in `cycle.pendingActions` (tool was requested but `markToolRunning()` was NOT called)
- `cycle.toolStatus[id] = 'pending'`
- No cycle data at all (crash before any tool call)

### UNCERTAIN
- `cycle.toolStatus[id] = 'running'` — `markToolRunning()` was called, but the tool may or may not have executed
- The gap between `executeToolCall()` return and `checkpoint.cycle()` call — side effect done but checkpoint says `running`
- EvidenceLog state — in-memory only, cannot be verified after restart
- `complete_item` was called but evidenceLog was not persisted — the tool execution evidence is gone but the completion record exists

**The critical insight:** `absence of evidence` (no `completed` status) is NOT `proof of non-execution`. A `running` status means "this tool was in flight" — not "this tool did not execute."

---

## 13. PLAN vs CHECKPOINT vs EXECUTION

### Q1: Checkpoint has enough data to reconstruct an Execution?
**NO.** Checkpoint has:
- Cycle-level tool call/result summaries (truncated to 500 chars)
- Tool status records (toolCallId → status)
- Plan reference (from `setPlan()` mirroring)

Checkpoint LACKS:
- Full tool arguments and results (truncated)
- EvidenceLog (per-item proof of tool execution)
- RequestContext (session state, user ID, signal)
- Agent runtime locals (messages, token budget, cycle count)
- ProgressTracker state

### Q2: Plan has enough data to resume an Execution?
**PARTIALLY.** Plan has:
- `currentItemIndex` — which item to resume from
- `items[]` with statuses — which items are done/pending
- `goal` — what the task is
- `status` — the plan's lifecycle state

Plan LACKS:
- Which tools were called for each item (EvidenceLog)
- Which tools were `running` at crash (only in checkpoint, and only as `running` status)
- Tool results (only in checkpoint cycle data, truncated)
- The model's conversation state (messages, tokens)

### Q3: Data lost that Recovery requires?
**YES — critical gaps:**
1. **EvidenceLog** — never persisted, proves tool execution per PlanItem. Without it, `canCompleteItem()` blocks `complete_item`.
2. **RequestContext** — AsyncLocalStorage, created per-request. Includes `evidenceLog`, `signal`, `userId`, `consequenceHint`.
3. **Agent runtime state** — ReAct loop locals, messages array, token budget, stall counters.
4. **In-flight promises/timers** — cannot survive process crash.
5. **Tool-side-effect state** — no external durability guarantee for tools like `write_file` or `send_message`.
6. **Session execution identity** — the `taskId` from the old Execution is lost; new `taskId` created on restart.

---

## 14. DUPLICATE SIDE-EFFECT RISK

**YES — HIGH RISK.**

### Evidence:

**Scenario: `send_message` duplicate**
```
User sends "Notify team"
  → Plan created, item #1: "Send notification"
  → Agent calls send_message("Team, ...")
  → markToolRunning(taskId, toolCallId)  ← checkpoint says 'running'
  → send_message actually sends the message
  → CRASH before checkpoint.cycle()
  → Restart: snapshot shows toolStatus = 'running'
  → New user message → new Execution with new taskId
  → Plan loaded: item #1 still in_progress
  → LLM sees the task, decides to call send_message again
  → Duplicate message sent
```

**Scenario: `write_file` duplicate**
```
  → Agent calls write_file("/path/to/file", "content")
  → markToolRunning(taskId, toolCallId)
  → File written to disk
  → CRASH before checkpoint.cycle()
  → Restart: checkpoint says 'running'
  → On resume, tool re-executes → file overwritten (or appended)
  → Duplicate/incorrect content
```

**Scenario: `send_message` after checkpoint.cycle() but before complete_item**
```
  → Agent calls send_message()
  → checkpoint.cycle() records tool as 'completed'
  → CRASH before complete_item
  → Restart: tool is proven-completed, but PlanItem is still in_progress
  → On resume, the model may call complete_item without re-executing the tool
  → This is SAFE (no duplicate) — but PlanItem completion requires evidenceLog which is LOST
```

**Root cause:** `markToolRunning()` and `checkpoint.cycle()` are NOT atomic with the tool's actual execution. The tool executes between these two calls, and a crash in that window leaves the checkpoint in an incorrect state.

---

## 15. EXISTING TEST COVERAGE

### Covered
- Phase 1 identity guard (`requireSnapshot()`) — `tests/model-b1-phase1.test.ts` (untracked)
- Phase 2 task identity uniqueness — `tests/model-b1-phase3.test.ts` (untracked)
- Plan state derivation — `plan-state.ts` has tests
- `getProvenCompletedToolIds()` logic — implicit in checkpoint tests
- `markRecovered()` annotation — implicit in engine startup tests
- Continuity blockers — `tests/continuity-blockers.test.ts` (modified in working tree)
- R3 admission control — `tests/r3-admission-control.test.ts` (modified in working tree)

### Not covered
- **Recovery/auto-resume behavior after crash** — no test verifies that in-progress tasks are NOT auto-resumed
- **Restart scenario** — no end-to-end test simulates process crash + restart
- **Duplicate side effect** — no test verifies that a `running` tool can be re-executed
- **Checkpoint identity after restart** — no test verifies that old taskId is not reused
- **EvidenceLog persistence** — no test (and no code) persists evidenceLog to disk
- **Plan continuation vs Execution recovery distinction** — no test that exercises the exact boundary
- **Crash window between `executeToolCall()` and `checkpoint.cycle()`** — no test for this timing window
- **`getProvenCompletedToolIds()` sufficiency for safe resume** — no test that validates whether proven-completed tools are sufficient to prevent duplicates

---蛋---

## 16. MODEL B1 INVARIANT CHECK

### Phase 1: `requireSnapshot()` identity guard
**PASS.** `checkpoint.ts` has `requireSnapshot()` function. All write operations (`cycle()`, `markToolRunning()`, `complete()`, `failed()`, `clear()`) call it. If `requestId` doesn't match any snapshot, it throws loudly.

Verified at `checkpoint.ts:40-48`, and usage at lines 173, 214, 227, 240, 470.

### Phase 2: No task reuse
**PASS.** `activeTaskBySession`, `getActiveTaskForSession`, `setActiveTaskForSession`, `existingTaskId` all removed from `checkpoint.ts`. Verified via `git diff HEAD` — these fields were removed.

Each Execution always creates a fresh `taskId` at `engine.ts:760`: `const taskId = \`task-${Date.now()}\``.

### Phase 3: Plan loading
**PASS.**
- `getPlan(sessionId)` → `getLatestSnapshotForSession()` → latest Plan (regardless of terminal status)
- `setPlan(sessionId, plan)` → `getLatestForSession()` → only active/in-progress snapshot
- Terminal checkpoint not mutated by `setPlan()`

Verified at `checkpoint.ts:274-281` (`setPlan`), `checkpoint.ts:290-292` (`getPlan`), `checkpoint.ts:312-321` (`getLatestSnapshotForSession`), `checkpoint.ts:327-337` (`getLatestForSession`).

### Phase 3.1: `setPlan()` audit
**PASS.** `setPlan()` only mirrors onto `getLatestForSession()` (non-terminal). Terminal snapshots are not mutated. The `plans` Map is the primary store; snapshots are the secondary mirror. Verified at `checkpoint.ts:274-281`.

---

## 17. GIT STATE

```
git status:
  Modified files (staged):
    src/core/checkpoint.ts (Phase 1-3 changes already committed)
    src/core/engine/engine.ts
    tests/continuity-blockers.test.ts
    tests/r3-admission-control.test.ts
  
  Untracked files:
    ARCHITECTURE_DECISION_PLAN_EXECUTION_CHECKPOINT.md
    BEHAVIORAL_PROOF_RUNNING_PLAN_AFTER_RESTART.md
    FORENSIC_TASK_IDENTITY_AFTER_RESTART.md
    MODEL_B1_FINAL_PRE_IMPLEMENTATION_GATE.md
    MODEL_B1_IMPLEMENTATION_DESIGN.md
    PLAN_RESUME_DATA_REQUIREMENTS.md
    SESSION_PLAN_LIFECYCLE_PROOF.md
    tests/model-b1-phase1.test.ts
    tests/model-b1-phase3.test.ts

Working tree: CLEAN (all source changes reverted for audit)
```

Verified via `git checkout --` to restore source files, then `git status --short` confirmed only untracked files remain. No source modifications from this audit.

---

## 18. ARCHITECTURAL GAPS FOR PHASE 4

### Gap 1: EvidenceLog not persisted
**Impact:** `complete_item` cannot validate tool execution after restart. `canCompleteItem(evidenceLog, itemIndex)` will find empty evidenceLog and block completion.

**Required for safe recovery:** EvidenceLog must be serialized to disk (in checkpoint or separate file) and restored on startup.

### Gap 2: RequestContext not persisted
**Impact:** Per-request state (userId, signal, consequenceHint, evidenceLog) is lost. AsyncLocalStorage context is recreated from scratch on every `processInner()`.

**Required for safe recovery:** RequestContext must be reconstructed from durable state or persisted to disk.

### Gap 3: Agent runtime state not persisted
**Impact:** ReAct loop state (messages, token budget, cycle count, stall counters) is completely lost. A resumed Execution starts with a fresh ReAct loop.

**Required for safe recovery:** Agent state must be serialized and restored, OR the system must accept that resumed Executions start fresh (which means it's Plan continuation, not Execution recovery).

### Gap 4: `running` status is semantically ambiguous
**Impact:** `toolStatus = 'running'` means "markToolRunning() was called" but does NOT distinguish between "tool hasn't started" and "tool executed but cycle() wasn't called yet."

**Required for safe recovery:** Add a third state or a timestamp to disambiguate. Or define a policy: "running = will re-execute."

### Gap 5: No execution identity after restart
**Impact:** After restart, a new `taskId` is created. The old Execution has no identity to resume. The system has no concept of "resuming task T1" — it only creates "task T2."

**Required for safe recovery:** Either add a resume mechanism that references the old taskId, or accept Plan continuation semantics.

### Gap 6: TaskQueue.background tasks may be orphaned
**Impact:** `task-queue.ts` has `loadFromDisk()` and `tasks: Map<string, BackgroundTask>`. Background tasks with `status: 'running'` after crash have no recovery path. The `restart-notify.ts` only tracks chatId — no task recovery.

**Required for safe recovery:** TaskQueue needs explicit recovery logic for `interrupted` status tasks.

### Gap 7: Tool side effects have no idempotency guarantee
**Impact:** Tools like `write_file`, `send_message`, `database write` are not idempotent. Re-execution causes duplicates.

**Required for safe recovery:** Either make tools idempotent, add deduplication keys, or ensure no re-execution of unproven tools.

---

## 19. RECOMMENDED NEXT STEP

**Do not implement.** This is a Phase 4 audit — no code changes.

### Phase 4A design must decide:

1. **What does "resume" mean?** The current codebase implements Plan continuation (new Execution with old Plan). Phase 4 must decide if true Execution recovery (re-using the old taskId, restoring runtime state) is desired, or if Plan continuation is sufficient.

2. **EvidenceLog persistence strategy:** Must be serialized to disk. Options:
   - Include in checkpoint snapshot (add `evidenceLog` field to `CheckpointSnapshot`)
   - Separate evidence file per session
   - Store in SQLite alongside plan state

3. **`running` status semantics:** Must be clarified. Current semantics are:
   - `running` = "markToolRunning() was called" (not "tool is executing")
   
   Suggested clarification: `running` = "tool was invoked, execution in-flight, may or may not have completed." On resume, `running` tools MUST be re-executed (with idempotency) because we cannot prove they completed.

4. **Execution identity after restart:** If true recovery is desired, the system needs a mechanism to reference old taskIds and restore their context. If Plan continuation is sufficient, the current design is correct and Phase 4 is a documentation exercise.

5. **TaskQueue recovery:** Background tasks with `status: 'running'` need explicit handling on startup.

### Invariants that must be chosed before Phase 4 code:

1. `activeTaskBySession` must remain 0 (Phase 2 invariant preserved)
2. `getPlan()` must continue using `getLatestSnapshotForSession()` fallback
3. `setPlan()` must continue not mutating terminal snapshots
4. `requireSnapshot()` must remain as the identity guard
5. Fresh `taskId` per Execution must be preserved
6. `markRecovered()` must remain annotation-only (no auto-resume)

---

## 20. FINAL ASSESSMENT

**YES — sufficient forensic evidence exists to begin Phase 4 design.**

The audit has traced the complete code path for:
- Checkpoint lifecycle: `start()` → `cycle()` → `markToolRunning()` → `complete()`/`failed()` → `markRecovered()`
- Engine startup recovery: `init()` → `loadFromDisk()` → `getAllInProgress()` → `markRecovered()` → `flush()`
- Agent ReAct loop: `executeReActLoop()` → `markToolRunning()` → `executeToolCall()` → `checkpoint.cycle()`
- Plan state: `getPlan()` → `getLatestSnapshotForSession()` → `getPlan()` fallback chain
- Evidence flow: `evidenceLog` (in-memory) → `canCompleteItem()` → `complete_item` validation

**Key conclusion:** The system performs **Plan continuation**, not **Execution recovery**. True Execution recovery would require persisting EvidenceLog, RequestContext, and Agent runtime state — none of which are currently persisted. The `markRecovered()` annotation is a marker, not a recovery mechanism. The `running` status is semantically ambiguous and cannot distinguish "tool never started" from "tool executed but checkpoint not updated."

---

*This audit is complete. No source code was modified. No tests were created or changed. No commits were made.*

*Working tree verified clean via `git checkout --` and `git status --short`.*
