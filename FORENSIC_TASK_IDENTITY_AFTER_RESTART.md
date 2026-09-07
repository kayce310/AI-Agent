# FORENSIC CLOSEOUT: TASK / REQUEST / EXECUTION IDENTITY AFTER RESTART

## 1. Identity Diagram (from source)

```
sessionId (from SessionManager, persistent across disk load)
   │
   ├── planId = `plan-${sessionId}-${Date.now()}`
   │       stored in CheckpointStore.plans[sessionId]
   │       also embedded in CheckpointSnapshot.plan
   │       persistent on disk via checkpoint snapshot
   │
   ├── requestId = sessionId || `req-${Date.now()}`
   │       engine.ts:763 — reused as agent.ts:459 local var
   │       USED ONLY for runtime instrumentation (R.* calls)
   │       NOT used for checkpoint indexing
   │
   ├── taskId (ENGINE) = `task-${Date.now()}`
   │       engine.ts:761 — generated fresh EVERY processInner()
   │       used as checkpointSnapshot.KEY
   │       passed as checkpointRequestId to agent.run()
   │
   └── checkPointRequestId (AGENT) = taskId from engine
           agent.ts:460 — used for cycle() / complete() / failed() / markToolRunning()
           is the "persistent execution identity" for checkpoint purposes
```

**Actual index key for checkpoint: `taskId` (engine.ts:761), NOT `requestId`.**

---

## 2. Trace A — Normal Execution (single session, no restart)

```
User message
    ↓
processInner()                          engine.ts:758
    ↓
taskId = `task-1728123456000`            engine.ts:761     ← FRESH
requestId = sessionId_"sess-A"           engine.ts:763     ← same as sessionId
    ↓
RequestContext {
  sessionId: "sess-A",
  taskId: "task-1728123456000",          ← same as engine taskId
  evidenceLog: new Map(),                ← FRESH
  onPlanCreated: fn,
  signal: AbortSignal,
}                                       engine.ts:773-784
    ↓
processInnerScoped()                     engine.ts:795
    ↓
checkpointStore.start(taskId, sessionId, goal)     engine.ts:809
   → snapshots.set("task-1728123456000", {requestId, sessionId, ...})
   → activeTaskBySession.set("sess-A", "task-1728123456000")     checkpoint.ts:140-149
    ↓
agent.run() with checkpointRequestId = "task-1728123456000"   engine.ts:1040
    ↓
checkpointStore.cycle("task-1728123456000", ...)   agent.ts:1169-1170
checkpointStore.complete("task-1728123456000", ...) or .failed(...)  engine.ts:1083-1088
    ↓
activeTaskBySession.delete("sess-A")       checkpoint.ts:226-227 (on complete/failed)
```

**Key: taskId and checkpointRequestId are the SAME value.** All checkpoint operations use this ID.

---

## 3. Trace B — Crash / Restart

### Before restart (captured state):

```
sessionId           = "sess-A"
planId              = "plan-sess-A-1728123456000"
plan.status         = "running"
taskId              = "task-1728123456000"       ← engine.ts:761
requestId           = "sess-A"                   ← engine.ts:763 (=sessionId)
checkpoint.key      = "task-1728123456000"       ← checkpointStore.start() arg
activeTaskBySession = "sess-A" → "task-1728123456000"  ← checkpoint.ts:149
checkpoint.snapshot = { requestId: "task-1728123456000", sessionId: "sess-A",
                        status: "in_progress", cycles: [...], plan: PlanP }
EvidenceLog         = in-memory Map in requestContext    ← NOT persisted
RequestContext      = ephemeral (torn down when processInner returns)
```

### After restart (loadFromDisk):

```
activeTaskBySession = "sess-A" → "task-1728123456000"   ← rebuilt from snapshots (checkpoint.ts:406-413)
this.snapshots      = { "task-1728123456000": {sessionId:"sess-A", plan: PlanP, ...} }
this.plans          = {}  ← NOT rebuilt from disk (plans not independently persisted)
                        ← but getPlan(sessionId) falls back to snapshot.plan
```

---

## 4. Trace C — First Message After Restart

```
User message (to session "sess-A")
    ↓
processInner()                              engine.ts:758
    ↓
NEW taskId = `task-1728199999000`           engine.ts:761     ← DIFFERENT from old!
requestId = "sess-A"                        engine.ts:763
    ↓
RequestContext {
  taskId: "task-1728199999000",             ← NEW
  evidenceLog: new Map()                    ← EMPTY (no persistence)
}
    ↓
processInnerScoped()                        engine.ts:795
    ↓
existingTaskId = checkpointStore.getActiveTaskForSession("sess-A")
               = "task-1728123456000"       ← OLD persisted taskId
    ↓
because existingTaskId is truthy:           engine.ts:806-807
  log "reusing, skipping duplicate creation"
  checkpointStore.start() SKIPPED           ← CRITICAL: no snapshot for new taskId
    ↓
agent.run() with checkpointRequestId = "task-1728199999000"   ← NEW taskId!   engine.ts:1040
    ↓
Inside agent: checkpointStore.cycle("task-1728199999000", ...)
   → this.snapshots.get("task-1728199999000") = undefined (never created)
   → cycle() returns early: NO-OP           ← CRITICAL: all checkpoint updates dropped
    ↓
Inside agent: checkpointStore.complete("task-1728199999000", ...)
   → snapshot not found → returns early     ← CRITICAL: terminal state never written
    ↓
OLD snapshot "task-1728123456000" remains unchanged (still "in_progress")
```

---

## 5. Identity Table

| Identity | Before restart | After restart (loaded) | After restart (1st message) | Persistent? |
|----------|---------------|----------------------|----------------------------|-------------|
| sessionId | "sess-A" | "sess-A" | "sess-A" | YES (disk + sessionHistory) |
| planId | "plan-sess-A-..." | same | same | YES (in snapshot) |
| plan.status | "running" | "running" | "running" | YES (unchanged) |
| taskId (engine) | "task-1728123456000" | N/A (no process) | "task-1728199999000" | NO — fresh per message |
| requestId | "sess-A" | N/A | "sess-A" | NO — derived from sessionId |
| checkpoint snapshot key | "task-1728123456000" | same (on disk) | "task-1728199999000" (NOT created) | YES (old), NO (new — skipped) |
| activeTaskBySession[sess-A] | "task-1728123456000" | "task-1728123456000" | **STILL** "task-1728123456000" | YES (old only) |
| RequestContext.taskId | "task-1728123456000" | N/A | "task-1728199999000" | NO (ephemeral) |
| EvidenceLog | {0: [ToolCallRecord...]} | N/A | new Map() (empty) | **NO** — in-memory only |
| checkpoint snapshots | {"task-1728123456000": {...}} | same | same + NOTHING for new taskId | YES (old only) |

---

## 6. Trace D — Identity Relationship (Answers)

### Q1: taskId có phải persistent execution identity không?

**NO.** `taskId = \`task-${Date.now()}\`` is generated fresh every `processInner()` call (engine.ts:761). It is the **runtime identity** of a single request processing cycle. It does NOT survive across messages (same session, next message = new taskId). It definitely does NOT survive restart.

### Q2: requestId có phải persistent execution identity không?

**NO.** `requestId = request.sessionId` (engine.ts:763). It is just the sessionId renamed. Used only for `R.*()` runtime instrumentation logs. Not used as a checkpoint index key — checkpoint uses `taskId`.

### Q3: RequestContext.taskId có luôn bằng taskId được tạo tại processInner() không?

**YES.** `RequestContext.taskId` is explicitly set to the same `taskId` variable at engine.ts:774-775.

### Q4: Sau restart, persisted requestId có được dùng để đại diện cho Execution mới không?

**NO.** After restart + first message:
- `existingTaskId = getActiveTaskForSession(sessionId)` returns the OLD `taskId`
- `checkpointStore.start()` is **SKIPPED** (engine.ts:806-807)
- The NEW `taskId` is passed to `agent.run()` as `checkpointRequestId` (engine.ts:1040)
- But `checkpointStore.cycle()` and `.complete()`/`.failed()` all look up by `checkpointRequestId` = NEW taskId → snapshot not found → **all checkpoint writes are silent no-ops**

### Q5: Sau restart, có một execution identity mới được tạo không?

**YES.** `taskId = task-Date.now()` is generated at engine.ts:761. This is a **new identity** that represents the runtime execution (ReAct loop). However, it is **not recorded** anywhere durable — checkpoint.start() is skipped, so no snapshot exists under this new identity.

### Q6: Cơ chế nào liên kết old requestId và new taskId?

**There is NO intentional linking mechanism.** They share the same `sessionId` by accident (old requestId = sessionId; new taskId just happens to be passed to the same session's processInner). The link `activeTaskBySession[sessionId]` still points to the OLD taskId — the new taskId is NOT stored there. So the only bridge is `sessionId`.

### Q7: activeTaskBySession[A] = old requestId, current execution = new taskId?

**YES, this occurs.** After restart + first message:
- `activeTaskBySession["sess-A"]` = `"task-1728123456000"` (old)
- `taskId` in engine.ts:761 = `"task-1728199999000"` (new)
- `taskId` in RequestContext = `"task-1728199999000"` (new)

Classification: **UNCLEAR** — The intent of Fix C (ADR-000 §1) is to prevent duplicate checkpoint creation, but the side effect is that all checkpoint writes for the new execution silently fail. The comment at engine.ts:803 says "reusing, skipping duplicate creation" — implying intentional reuse of the old checkpoint record. However, the checkpoint operations (`cycle`, `complete`, `failed`) are called with the NEW taskId, so they miss the old record. This mismatch may be unintentional.

---

## 7. Trace E — Checkpoint Ownership

```
checkpointStore.start(taskId, sessionId, goal)     engine.ts:809
   → snapshot KEY = taskId
   → sessionId is a FIELD within the snapshot, not the index

checkpointStore.cycle(request.checkpointRequestId, ...)   agent.ts:1169
   → lookup by checkpointRequestId (which = taskId from engine)
   → WRITES to taskId's snapshot

checkpointStore.complete(taskId, ...)               engine.ts:1087
   → lookup by taskId

checkpointStore.failed(taskId, ...)                 engine.ts:1085/1119
   → lookup by taskId

activeTaskBySession: sessionId → taskId             checkpoint.ts:149

getPlan(sessionId) → this.plans.get(sessionId) ?? getLatestForSession(sessionId)?.plan
   → getLatestForSession iterates all snapshots matching sessionId
   → NOT indexed by snapshot key

Snapshot OWNERSHIP:
  - Indexed by: taskId (runtime, generated per processInner)
  - Associated with: sessionId (field inside snapshot)
  - Owns: cycles, toolStatus, recoveries, plan (embedded copy)
  - Does NOT own: plan identity (plans have own Map by sessionId)
```

Checkpoint snapshot is indexed by **taskId**, which is generated fresh per `processInner()`. The `sessionId` is just a field inside the snapshot, not the primary key.

---

## 8. Trace F — Recovery Semantics

After restart, `activeTaskBySession["sess-A"]` = old taskId.

What does this mean? From source:

```
checkpoint.ts:312-314:
  getActiveTaskForSession(sessionId):
    return this.activeTaskBySession.get(sessionId) ?? null;
```

The comment at checkpoint.ts:148:
```
// Fix C: this requestId is now the active task for the session
```

And checkpoint.ts:102-105:
```
// Fix C: single source of truth — active requestId per session
private activeTaskBySession: Map<string, string> = new Map();
```

And from engine.ts:803-809:
```
// Fix C (ADR-000 §1): single source of truth — session already has an active
// task (rebuilt from disk on boot) → do NOT create a duplicate checkpoint.
const existingTaskId = this.checkpointStore.getActiveTaskForSession(sessionId);
if (existingTaskId) {
  log warn "reusing, skipping duplicate creation"
} else {
  checkpointStore.start(taskId, sessionId, ...);
}
```

**Semantics:** `activeTaskBySession` says "this session has a checkpoint record". The intent is to prevent duplicate checkpoint creation when the same session fires another request while a previous task is still recorded as in-progress.

After restart, it says: **"a checkpoint record exists"** — not "an execution is alive". The runtime is NOT claiming the old execution is still running. It is saying the old checkpoint state still exists and should not be overwritten.

Semantics: **"Checkpoint cũ vẫn tồn tại"** — NOT "Execution cũ vẫn tồn tại".

---

## 9. Trace G — Tool Completion

### Proven-completed tools (checkpoint.ts:506-516):

```
getProvenCompletedToolIds(requestId):
  iteration over snapshot.cycles
    for each cycle:
      - toolStatus[toolCallId] === 'completed' → proven
      - completedActions[].id → proven
```

A tool is **proven completed** only if it finished a full cycle (its result was in `toolResults` argument to `cycle()`).

### Tools with running/pending state:

```
markToolRunning(requestId, toolCallId):    checkpoint.ts:206-213
  sets lastCycle.toolStatus[toolCallId] = 'running'
  → NOT proven (no completion evidence)

pending tools (from cycle() call):
  toolCalls without matching toolResults → 'pending'
  → NOT proven
```

### EvidenceLog:

```
Location: RequestContext.evidenceLog (in-memory Map)
Created:  engine.ts:779 — new Map() per processInner()
Written:  agent.ts:1109-1117 — on each non-update_plan tool call for active plan item
Persist:  NOT persisted to checkpoint or disk
After restart: EMPTY Map
```

### Completion certainty after restart:

```
Tool state at crash      | Completion certainty after restart
-------------------------|----------------------------------
'completed' (in a finished cycle) | YES (proven via toolStatus in checkpoint cycles)
'running' (last cycle, no result) | NO (only toolStatus=running, no completion evidence)
'pending' (no result)             | NO (no completion evidence at all)

EvidenceLog after restart: EMPTY
  → canCompleteItem() (plan-state.ts:89-107) requires evidence entries
  → update_plan(complete_item) will REJECT with "No evidence of tool execution"
  → LLM needs to RE-EXECUTE the tool to generate new evidence
```

---

## 10. Critical Finding: Identity Mismatch

> Có tồn tại identity mismatch giữa persisted checkpoint execution record và fresh runtime execution sau restart không?

**PROVEN**

Source evidence:

| Dimension | Persisted (checkpoint) | New runtime (first message) | File:Line |
|-----------|----------------------|---------------------------|-----------|
| taskId | `task-1728123456000` | `task-1728199999000` | engine.ts:761 |
| snapshot key | old taskId | NEW taskId (start() skipped → no snapshot) | engine.ts:809 skipped |
| activeTaskBySession | old taskId | old taskId (unchanged) | checkpoint.ts:149 + 406-414 |
| Checkpoint writes (cycle/complete/failed) | target old taskId (work) | target new taskId → NO-OP | engine.ts:1083-1088 |

**Behavior:** After restart, `checkpointStore.start()` is skipped because `activeTaskBySession` still maps to the old taskId. But all subsequent checkpoint operations (`cycle`, `complete`, `failed`) use the **new** taskId (via `checkpointRequestId`). Since no snapshot exists under the new key, these operations silently return without recording the new execution's data.

The old checkpoint snapshot is **frozen** at `in_progress` — never completed or failed after restart.

---

## 11. Recovery Conclusion

> **B — only checkpoint state is recoverable**

The old checkpoint state (cycles, tool status, plan) can be read. But there is no Execution to resume. The LLM gets plan context in the prompt and must decide what to do. The new execution's checkpoint data is silently dropped.

---

## 12. Final Statement

> Sau restart, Coral đang khôi phục **checkpoint state (frozen snapshot + plan text)**, nhưng không khôi phục **execution identity (taskId, evidenceLog, requestContext, live agent loop)**.