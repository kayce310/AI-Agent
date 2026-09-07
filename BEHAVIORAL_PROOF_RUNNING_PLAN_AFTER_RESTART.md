# BEHAVIORAL PROOF: RUNNING/PENDING PLAN AFTER RESTART

## 1. Executive Summary

A Plan with `status = 'running'` or `'pending'` survives restart via checkpoint snapshot persistence.
After restart, the Plan remains `running`/`pending` — no code changes its status.
But there is **no Execution** attached to it. The Plan is **persisted but dormant** (CASE B).
The next user message triggers a new `processInner()` with a fresh `RequestContext`,
and the Plan context is injected into the LLM prompt. The LLM must decide what to do —
there is no automatic resumption loop.

**Verdict: Persisted but dormant (CASE B). Not automatic resume (not CASE A).**

---

## 2. Static Check — All code paths after startup that reference `plan.status === 'running'` or `'pending'`

### 2a. Engine.init() — recovery phase

```
FILE:   src/core/engine/engine.ts
LINE:   322-351
CODE:
  const recovered = this.checkpointStore.getAllInProgress();
  for (const cp of recovered) {
    this.checkpointStore.markRecovered(cp.requestId, /* note */);
  }

WHAT markRecovered DOES (checkpoint.ts:520-534):
  - sets snapshot.recovery fields (provenCompletedTools, recoveredAtBoot)
  - does NOT change plan.status
  - does NOT create an execution
  - does NOT start a new agent loop

PLAN STATUS AFTER: UNCHANGED (still 'running' or 'pending')
```

### 2b. Engine.processInnerScoped() — per-message entry

```
FILE:   src/core/engine/engine.ts
LINE:   805-810
CODE:
  const existingTaskId = this.checkpointStore.getActiveTaskForSession(sessionId);
  if (existingTaskId) {
    log reuse, skip duplicate creation
  } else {
    checkpointStore.start(taskId, sessionId, goal)
  }

WHAT getActiveTaskForSession DOES (checkpoint.ts:312-314):
  - returns this.activeTaskBySession.get(sessionId) ?? null

AFTER RESTART:
  - activeTaskBySession is rebuilt in loadFromDisk() from in-progress snapshots
  - If the snapshot's sessionId matches, existingTaskId is set
  - checkpointStore.start() is SKIPPED (no duplicate creation)
  - A NEW taskId is still generated at line 761 (const taskId = `task-${Date.now()}`)
  - But it's passed to agent.run() — NOT stored back to checkpoint
  - The "active task" for the session remains the OLD requestId

PLAN STATUS: UNCHANGED. No execution started automatically.
```

### 2c. Plan context injection (BEFORE LLM call)

```
FILE:   src/core/engine/engine.ts
LINE:   858-870
CODE:
  const planState = derivePlanState(this.checkpointStore, sessionId);
  const activePlan = isGuardActive(planState) ? this.checkpointStore.getPlan(sessionId) : null;
  if (activePlan) {
    if (activePlan.status === 'paused_limit') {
      activePlan.status = 'running';  // auto-resume paused_limit only
    }
    // Build planContext string (injected into LLM prompt)
    if (activePlan.status === 'stuck') {
      // stuck message
    } else {
      // Normal plan context: show items, tell LLM to continue
    }
  }

KEY OBSERVATIONS:
  - 'paused_limit' → 'running' auto-resume exists (line 866-868)
  - NO auto-resume for 'running' → stays 'running' (no-op)
  - NO auto-resume for 'pending' → stays 'pending' (no-op)
  - PlanContext is injected as text for the LLM to read
  - The LLM must decide to call tools — no code forces tool execution
```

### 2d. Agent loop — no plan-driving code

```
FILE:   src/core/engine/agent.ts
LINE:   523 (while loop entry), 669 (finish_reason handling), 900-932 (tool call handling)

The ReAct loop (agent.ts:523-1100):
  - Calls model → model decides tool calls or text
  - No code reads plan items and auto-executes them
  - No code forces the model to continue a specific item
  - The plan context is just text in the system prompt

After restart:
  - model sees plan context → may or may not continue
  - If model returns text without tool call → treated as FINAL_ANSWER
  - If model calls update_plan() tools → continues plan normally
```

### 2e. handleCycleLimit — only triggers on maxToolCycles hit

```
FILE:   src/core/engine/engine.ts
LINE:   992-1013
CODE:
  if (plan && (plan.status === 'running' || plan.status === 'pending')) {
    plan.status = 'paused_limit';
    plan.stopReason = 'maxToolCycles';
  }

This only fires after agent.run() returns with cycleLimitReached=true.
NOT triggered by restart — only by the agent loop hitting its limit.
```

### Summary of all post-startup code handling `running`/`pending` plans

| Location | File:Line | What it does to plan.status |
|----------|-----------|-----------------------------|
| Engine.init() | engine.ts:322-351 | NOTHING — markRecovered() annotates snapshot, doesn't change plan |
| processInnerScoped() | engine.ts:866-868 | Auto-resumes `paused_limit`→`running` only. Not `running`/`pending` |
| processInnerScoped() | engine.ts:862-928 | Injects plan context into LLM prompt (text only) |
| processInnerScoped() | engine.ts:994-1010 | paused_limit on cycle limit — only after agent finishes |
| agent.ts ReAct loop | agent.ts:666-932 | Model-driven: execute tools model calls, no forced plan execution |
| agent.ts item tracking | agent.ts:914-932 | On tool call: promotes `pending`→`in_progress` and `pending`→`running` |

**Conclusion: No code path actively turns a persisted `running`/`pending` Plan into a new Execution after restart.**

---

## 3. Before Restart — State Capture (Source-derived values)

These are the values that would exist before a controlled restart, based on source analysis:

```
Field               | Value                      | Source
--------------------|----------------------------|-------------------------------------------
sessionId_A         | randomUUID (from createNewSession) | session-manager.ts:122-123
planId_P            | `plan-${sessionId}-${Date.now()}` | update-plan-tool.ts:37-39
plan.status         | 'running' (after first tool call promotes from 'pending') | agent.ts:925-931
taskId              | `task-${Date.now()}`       | engine.ts:761
RequestContext      | set via requestContext.run() per processInner() | request-context.ts:53
RequestContext.signal | AbortSignal (per-session)  | engine.ts:680-682, request-context.ts:48
checkpoint.snapshot | status='in_progress', has cycles, has plan embedded | checkpoint.ts:140-151
checkpoint.activeTaskBySession | sessionId_A → requestId  | checkpoint.ts:149,149
```

---

## 4. After Restart — Behavioral Analysis

### 4.1 Plan persistence across restart

```
FLOW:
1. CheckpointStore.loadFromDisk() reads cp-*.json files
2. Snapshot with Plan P embedded is loaded into this.snapshots
3. activeTaskBySession rebuilt: sessionId_A → requestId (from in-progress snapshot)
4. this.plans Map is NOT rebuilt (remains empty)

getPlan(sessionId_A) AFTER restart:
  checkpoint.ts:290-292:
    this.plans.get(sessionId_A)                 → undefined (not persisted independently)
    ?? this.getLatestForSession(sessionId_A)?.plan → Plan P (from snapshot, sessionId matches)

PLAN PERSISTENCE: PROVEN (via snapshot fallback in getPlan())
```

### 4.2 Execution (RequestContext) — does NOT persist

```
RequestContext is created by processInner() at engine.ts:773-784:
  const rctx = {
    sessionId,
    taskId: `task-${Date.now()}`,      // NEW taskId on every processInner()
    evidenceLog: new Map(),             // FRESH evidence log
    onPlanCreated: (itemCount) => { ... },
    signal: abortSignal,
  };
  return requestContext.run(rctx, () => this.processInnerScoped(...));

After restart:
  - New processInner() call generates new taskId
  - Fresh evidenceLog (empty Map)
  - Fresh AbortSignal
  - The old execution context is gone — no continuity

EXECUTION PERSISTENCE: DISPROVEN
```

### 4.3 Automatic plan resume — does NOT happen

```
After restart, when a user message triggers processInner():
  Line 805: getActiveTaskForSession(sessionId_A) → returns existing requestId
  Line 807: logs "reusing, skipping duplicate creation"
  Line 808: checkpointStore.start() is SKIPPED (no duplicate taskId)

But:
  - agent.run() is called with a NEW taskId (line 761/1040)
  - The old requestId from checkpoint is used as checkpointRequestId
  - Plan context is injected into system prompt (line 986)
  - LLM decides the next action — NOT automatically resumed

AUTOMATIC RESUME: DISPROVEN
```

### 4.4 Plan becomes stale — running/pending without execution

```
After restart:
  - Plan P is loaded, status='running' (unchanged)
  - No agent loop is running (no processInner active)
  - No RequestContext exists
  - Plan is "dormant" — persisted data with no live process

The Plan sits in CheckpointStore until:
  (a) User sends a message → triggers processInner → Plan injected into LLM context
  (b) /switch restores session → same behavior as (a)
  (c) Plan status ≠ 'running'/'pending' when checked later

running/pending CAN BECOME STALE: PROVEN
```

### 4.5 Duplicate re-execution risk

```
The warning at engine.ts:337-339 (markRecovered note):
  "running/pending tools have no completion proof and may re-execute
   only if the task resumes"

Source evidence:
  - toolStatus entries marked 'running' or 'pending' in the last cycle
    are NOT proven-completed (checkpoint.ts:506-516)
  - getProvenCompletedToolIds() only returns tools from FINISHED cycles
  - On resume, the LLM gets plan context but:
    (a) The system prompt says "Item đã hoàn thành: GIỮ NGUYÊN, không làm lại" (engine.ts:924)
    (b) There is NO code that prevents the LLM from calling the same tool again
    (c) The evidence log is fresh (empty) — evidence-gate for complete_item is blind

Duplicate execution is POSSIBLE but NOT OBSERVABLE from source alone — 
it depends on the LLM's behavior. The architectural risk exists.

DUPLICATE RE-EXECUTION RISK: NOT VERIFIED (depends on LLM behavior)
```

---

## 5. Three Cases — Classification

### CASE A — Automatic resume

```
restart
  ↓
Plan P loaded
  ↓
new execution created
  ↓
Plan continues automatically

STATUS: DISPROVEN
Evidence: No code auto-starts agent loop. New processInner() only
triggers on user message. Plan context is passive text in prompt.
```

### CASE B — Persisted but dormant (ACTUAL BEHAVIOR)

```
restart
  ↓
Plan P loaded
  ↓
status still running/pending  ✓ (markRecovered() doesn't change status)
  ↓
no execution                 ✓ (RequestContext is ephemeral)
  ↓
waits for user action         ✓ (processInner() only on user message)

STATUS: PROVEN
Evidence: engine.ts:322-351 (init doesn't create execution),
agent.ts:523 (loop only runs when agent.run() is called),
checkpoint.ts:520-534 (markRecovered doesn't change plan status)
```

### CASE C — Unsafe re-execution

```
restart
  ↓
Plan P loaded
  ↓
new execution
  ↓
previously incomplete tool/task executes again

STATUS: NOT VERIFIED (possible, depends on LLM)
The architecture does not prevent it. Tool status 'running'/'pending'
at crash time have no completion proof. The LLM is guided by prompt
text but not constrained by code.
```

---

## 6. `/switch` Behavior After Restart

```
After restart, same sessionId_A exists in SessionManager history (load from disk):
  SessionManager.load() → sessionHistory reconstructed from SESSION_FILE
  → sessionId_A is in history (not active if it expired before restart)

/switch sessionId_A:
  1. session-manager.ts:159-181:
     - Finds sessionId_A in history
     - Removes from history, sets as active
     - Returns SessionState with sessionId = sessionId_A

  2. Gateway sends request with sessionId = sessionId_A

  3. engine.ts:805:
     - getActiveTaskForSession(sessionId_A)
     - If checkpoint still in activeTaskBySession → reuses existing taskId
     - Plan P is loaded via getPlan(sessionId_A)
     - Plan context injected into prompt

  4. User must send a message for execution to proceed:
     - processInnerScoped() runs → agent.run() → ReAct loop

/switch RESTORES PLAN VISIBILITY but does NOT auto-resume execution.
User must type a message for the LLM to act.
```

---

## 7. Evidence Matrix

| Claim | Classification | Evidence |
|-------|----------------|----------|
| Plan persistence | **PROVEN** | `getPlan()` fallback: `checkpoint.ts:290-292` + snapshot persistence |
| Execution persistence | **DISPROVEN** | `RequestContext` per `requestContext.run()` each `processInner()` — `request-context.ts:53` |
| Automatic Plan resume | **DISPROVEN** | No code creates new execution after restart — `engine.ts:322-351` init only marks recovered, doesn't start agent |
| `running`/`pending` can become stale | **PROVEN** | Plan loaded with unchanged status, no live loop — `engine.ts:862-928` injects context but doesn't auto-execute |
| Duplicate re-execution risk | **NOT VERIFIED** | LLM-dependent. Architectural gap: empty evidenceLog on restart means evidence-gate is blind. Prompt guides but doesn't enforce. |

---

## 8. Final Answer

> **Sau restart, Plan `running/pending` của Coral có thực sự đại diện cho một công việc đang được tiếp tục, hay chỉ là persisted state không còn Execution tương ứng?**

**Persisted state không còn Execution tương ứng.**

Source evidence:

- `engine.ts:761` — new `taskId = task-${Date.now()}` generated per `processInner()` (fresh one-shot)
- `engine.ts:773-784` — `RequestContext` created fresh every `processInner()`, destroyed when it returns
- `engine.ts:322-351` — `Engine.init()` calls `markRecovered()` on in-progress checkpoints but does NOT start agent loops
- `agent.ts:523` — ReAct loop only runs inside `agent.run()`, which is only called from `processInnerScoped()`, which is only called on user message
- `checkpoint.ts:520-534` — `markRecovered()` annotates snapshot, does not change `plan.status`, does not create execution

The Plan is durable data. The Execution is ephemeral context. Restart destroys the latter completely. The Plan sits inert until a user message triggers a fresh `processInner()`, at which point the LLM sees the old plan in its prompt and may choose to continue — but there is no automatic bridge.