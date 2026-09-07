# MODEL B1 — PHASE 4: EXECUTION RECOVERY ARCHITECTURE DESIGN

**Repo:** `D:\AI-Agent`  
**Branch:** `develop`  
**Type:** READ-ONLY DESIGN PROPOSAL — no source changes, no test changes, no commits  
**Prerequisite:** `MODEL_B1_PHASE_4_AUDIT.md` (forensic audit, already completed)

---

## 1. EXECUTIVE SUMMARY

**Verdict: GO WITH CONDITIONS**

The codebase already has partial recovery infrastructure that the forensic audit didn't fully account for. Most importantly, `TaskQueue.loadFromDisk()` already implements the `interrupted` status with `getProvenCompletedToolIds()` checks. The gap is that this logic only covers background tasks, not foreground executions (which is the primary execution path through `engine.ts`).

The core architectural question is **not** "how do we resume Execution #1" — it's "what guarantee do we provide when a foreground Execution crashes mid-tool?" The answer must be **explicit** and **defensible**, because the crash-window between `executeToolCall()` and `checkpoint.cycle()` creates an **UNCERTAIN** state that cannot be resolved without either:

1. Accepting duplicate side effects (at-most-once delivery), or
2. Adding external idempotency/deduplication, or
3. Failing closed and requiring manual revalidation.

**Recommendation: Option 3 (fail-closed for uncertain side effects) + Option 1 (auto-retry for definitely-not-started tools).** Plan continuation is sufficient. True Execution recovery is not achievable without persisting EvidenceLog and Agent runtime state, which contradicts the B1 constraint against persistent Execution entities.

---

## 2. CURRENT RECOVERY REALITY

### What already exists (noted by audit but under-emphasized):

**TaskQueue already has recovery logic:**

File: `src/core/task-queue.ts:273-327`

```typescript
// loadFromDisk() already handles:
if (task.status === 'running') {
    // R2 §C: was running at an unexpected crash
    let provenCompleted = 0;
    const cp = getCheckpoint().getLatestForSession(task.sessionId);
    provenCompleted = cp
        ? getCheckpoint().getProvenCompletedToolIds(cp.requestId).size
        : 0;
    if (provenCompleted > 0) {
        task.status = 'interrupted';
        // NOT auto-requeued — requires explicit re-enqueue
    } else {
        task.status = 'queued'; // safe to re-queue
    }
}
```

This is the correct pattern. The foreground path in `engine.ts` does NOT have this logic. That's the gap.

**`markRecovered()` exists but is annotation-only** — confirmed by audit.

**`requireSnapshot()` identity guard exists** — confirmed by audit.

**Fresh `taskId` per execution** — confirmed by audit (`engine.ts:760`).

**No `activeTaskBySession`** — confirmed by audit (removed in Phase 2).

### What does NOT exist:

1. **Foreground execution recovery** — `engine.ts` `processInnerScoped()` has no recovery branch after `checkpointStore.init()`. It just starts a new checkpoint and new ReAct loop.
2. **EvidenceLog persistence** — `new Map()` at `engine.ts:778`, never written to disk.
3. **RequestContext persistence** — `AsyncLocalStorage`, recreated every `processInner()`.
4. **Uncertain-state classification** — `toolStatus = 'running'` has no disambiguation after restart.
5. **Checkpoint-based recovery trigger** — `getAllInProgress()` only annotates; never queues or resumes.

---

## 3. RECOVERY GUARANTEE DECISION

### Options analyzed:

| Option | Description | Feasible with B1? | Side-effect safety |
|--------|-------------|-------------------|-------------------|
| 1. No automatic recovery | Crash = manual restart. User sends new message, new Execution. | **YES** | No duplicates possible — nothing auto-retries |
| 2. Plan continuation only | Plan loads from disk, new Execution picks up PlanItem progress | **YES** (current state) | Depends on uncertain-state handling |
| 3. Safe automatic recovery | Resume execution using proven-completed tool tracking | **PARTIAL** | Only safe if `running` = definitely-not-started |
| 4. Best-effort execution recovery | Resume with best-guess about crashed tool state | **NO** | Uncertain state can cause duplicates |
| 5. Exactly-once execution | Guarantee no duplicate side effects | **NO** | Requires transactional boundary with external systems |

### Recommendation: **Option 1 + 2 (No auto-recovery for foreground + Plan continuation)**

**Justification:**
- Option 5 is impossible without external idempotency (no distributed transaction in codebase).
- Option 4 is unsafe because `toolStatus = 'running'` cannot distinguish "never started" from "executed but not checkpointed."
- Option 3 is only safe for background tasks (where `TaskQueue` already implements `interrupted` status). For foreground tasks, the uncertain gap is too large.
- Option 1 + 2 gives Plan continuation (PlanItem progress preserved) without false execution recovery (no auto-retry of uncertain tools).

**This means:** After a crash, the next user message creates a **new Execution** that continues the **Plan** from where it left off. Tools that were `running` at crash are re-evaluated: definitely-not-started tools are re-executed; uncertain tools trigger the `uncertain` policy (fail-closed for side-effecting tools).

---

## 4. CRASH-STATE MODEL

### Taxonomy:

```typescript
enum CrashState {
    DEFINITELY_NOT_STARTED,   // markToolRunning() never called
    DEFINITELY_COMPLETED,     // checkpoint.cycle() recorded completion
    UNCERTAIN                 // markToolRunning() called, cycle() not called
}
```

### Crash window analysis:

| Scenario | Window | Durable state | Known facts | Unknown facts | Can safely resume? | Can safely retry? | Duplicate risk | Required policy |
|----------|--------|---------------|-------------|---------------|--------------------|--------------------|----------------|-----------------|
| A | Before `markToolRunning()` | `status='started'`, `cycles=[]` | No tool was requested | N/A | N/A (nothing to undo) | N/A | NONE | Re-execute if needed |
| B | After `markToolRunning()`, before `executeToolCall()` | `toolStatus='running'` | Tool was requested by model | Did the tool start executing? Was the side effect initiated? | NO for side-effecting tools | NO for side-effecting tools | **HIGH** | FAIL_CLOSED for side-effecting; AUTO_RETRY for read-only |
| C | During `executeToolCall()` | `toolStatus='running'` | Same as B | Same as B | NO | NO | **HIGH** | FAIL_CLOSED |
| D | After side effect, before `checkpoint.cycle()` | `toolStatus='running'`, side effect done | Side effect completed externally | Checkpoint doesn't reflect it | NO | NO | **HIGH** | FAIL_CLOSED for side-effecting; revalidation needed |
| E | After `checkpoint.cycle()`, before `complete_item` | `toolStatus='completed'`, `evidenceLog` empty (in-memory) | Tool recorded as completed in checkpoint | `complete_item` hasn't been called; PlanItem still `in_progress` | YES for tool (won't re-execute); NO for PlanItem completion | YES for tool | LOW for tool; MEDIUM for PlanItem | `complete_item` requires new evidence after restart |
| F | After `complete_item` | `PlanItem.status='completed'`, snapshot.plan updated | PlanItem durable on disk | N/A | YES | N/A | NONE | Continue to next item |

### Critical finding for Scenario D:

This is the **highest-risk** scenario. The tool side effect happened, `markToolRunning()` was called, but `checkpoint.cycle()` was never called. On restart:
- `toolStatus = 'running'` in checkpoint
- `getProvenCompletedToolIds()` returns empty (tool not in `completedActions`)
- `markRecovered()` counts 0 proven-completed tools
- If the task resumes, the LLM may decide to re-execute the tool
- **Result: duplicate side effect**

**No code currently handles this window.**

---

## 5. RECOVERY IDENTITY MODEL

### Model B (Recovery = New Execution based on old Checkpoint) is correct for B1.

```
Execution #1 (taskId = task-A)
    ↓ crash
Checkpoint #1 (snapshot on disk, status = in_progress)
    ↓
User sends message
    ↓
Execution #2 (taskId = task-B, FRESH) ← new taskId
    ↓
derivePlanState(checkpointStore, sessionId) ← loads Plan from Checkpoint #1
    ↓
Agent continues from currentItemIndex
```

**Identity model:**
- `taskId` for Execution #2: `task-${Date.now()}` (fresh)
- Checkpoint #1 remains on disk as historical evidence
- Checkpoint #1 is NOT "resumed" — it is consulted for Plan state
- Execution #2 creates a NEW checkpoint snapshot (Checkpoint #2)
- The link between Checkpoint #1 and Checkpoint #2 is implicit: same `sessionId` + same `Plan.id`

**Do NOT add `parentTaskId` or `recoveryOf`.** This would create a pseudo-persistent Execution entity, which violates B1 constraints. The link is: same `sessionId`, same `Plan.id`, PlanItem `currentItemIndex` carries the position.

**Why not Model A (resume old Execution):**
- Requires persisting Agent runtime state (messages, token budget, ReAct locals)
- Requires persisting `RequestContext` (AsyncLocalStorage)
- Requires persistent Execution entity or re-using old taskId
- Both violate B1 constraints and add significant complexity
- The model's conversation state cannot survive a process crash anyway (Node.js runtime is ephemeral)

### Checkpoint naming:
- `checkpointStore.start(taskId, ...)` — creates a NEW snapshot for Execution #2
- `checkpointStore.cycle(taskId, ...)` — cycles the new Execution's snapshot
- Old snapshot (task-A) remains in `snapshots` Map loaded from disk
- `getAllInProgress()` returns BOTH task-A (in_progress) and task-B (started)
- This is fine — `getLatestForSession()` returns the newest non-terminal snapshot

**This means after recovery, there will be TWO in-progress snapshots for the same session.** The old one has `toolStatus = 'running'` for tools that may have executed. The new one has empty cycles. `getAllInProgress()` returns both, and `markRecovered()` annotates both.

**Mitigation needed:** The old in-progress snapshot (task-A) should be classified as `UNCERTAIN` and NOT re-executed. The new snapshot (task-B) is the active Execution. The system must not confuse the two.

---

## 6. MINIMUM DURABLE STATE

### Already durable (confirmed):
- ✅ Plan (via `checkpointStore.plans` Map + `snapshot.plan` fallback)
- ✅ PlanItem status (via `TaskPlan` serialized in snapshot)
- ✅ `currentItemIndex` (part of `TaskPlan`)
- ✅ `resultSummary`, `error`, `consecutiveFailedAttempts` (part of `PlanItem`)
- ✅ Checkpoint cycles (via `CycleData[]` in snapshot JSON)
- ✅ `toolStatus` (part of `CycleData`)
- ✅ `completedActions` and `pendingActions` (part of `CycleData`)
- ✅ TaskQueue background task state (via `saveToDisk()` / `loadFromDisk()`)

### NOT durable (confirmed by audit):
- ❌ `EvidenceLog` (`new Map()` at `engine.ts:778`)
- ❌ `RequestContext` (AsyncLocalStorage)
- ❌ Agent runtime locals (`toolCallCycles`, `messages`, `finalContent`)
- ❌ `sessionStartTimes` Map
- ❌ `ProgressTracker` state
- ❌ In-flight promises/timers

### Minimum Durable Recovery State:

```
Plan + PlanItem progress + Checkpoint tool status = SUFFICIENT
```

This is enough to:
1. Know which PlanItems are completed
2. Know which item to resume from (`currentItemIndex`)
3. Know which tools were `completed` (via `getProvenCompletedToolIds()`)
4. Know which tools were `running` (via `toolStatus`)

This is NOT enough to:
1. Prove that a `running` tool actually executed (UNCERTAIN)
2. Validate `complete_item` (needs EvidenceLog)
3. Restore the model's conversation context

**Conclusion: Minimum Durable Recovery State is achievable without new persistence.** The gap is `EvidenceLog` for `complete_item` validation, and `toolStatus` disambiguation for UNCERTAIN tools.

---

## 7. EVIDENCE MODEL

### Question: Does EvidenceLog need full persistence?

**Answer: NO — but the `complete_item` validation path needs a durable alternative.**

Current flow (runtime):
```
executeToolCall() → evidenceLog[itemIndex].push({toolName, args, result, success})
    ↓
LLM calls update_plan(action='complete_item', item_index=N)
    ↓
canCompleteItem(evidenceLog, itemIndex) → checks evidenceLog has entries with success=true
```

After restart: `evidenceLog` is empty → `canCompleteItem()` returns `ok: false` → `complete_item` is blocked.

### Proposal: Dual-path evidence

**Path 1 (runtime, current):** `RequestContext.evidenceLog` — used for `complete_item` during active execution.

**Path 2 (durable, new):** `checkpointStore.getProvenCompletedToolIds(requestId)` — counts tools with `toolStatus = 'completed'` in finished cycles. Used as fallback after restart.

**After restart `complete_item` validation:**
- If `evidenceLog` has entries (same execution, no crash) → use current path
- If `evidenceLog` is empty (new execution after restart) → check `getProvenCompletedToolIds()` for the old taskId to see if tools were proven completed

**Problem:** After restart, the old taskId's snapshot is still in `snapshots` Map (loaded from disk). `getProvenCompletedToolIds(oldTaskId)` can be called. But `complete_item` runs in the NEW execution context with the NEW taskId. There's no automatic link.

**Simpler proposal (ponytail):** Don't change `complete_item` validation after restart. Instead:
1. After restart, the old `toolStatus = 'completed'` tools are proven (visible in checkpoint cycles).
2. `complete_item` is blocked only when `evidenceLog` is empty AND the tool wasn't in the proven-completed set.
3. The LLM, seeing the plan state after restart, will naturally re-execute needed tools and call `complete_item` after.

**Schema change:** Add `getProvenCompletedToolIdsForSession(sessionId)` — aggregate across ALL checkpoints for a session.

```typescript
// In CheckpointStore:
getProvenCompletedToolIdsForSession(sessionId: string): Set<string> {
    const done = new Set<string>();
    for (const snapshot of this.snapshots.values()) {
        if (snapshot.sessionId !== sessionId) continue;
        for (const cycle of snapshot.cycles) {
            for (const [id, st] of Object.entries(cycle.toolStatus)) {
                if (st === 'completed') done.add(id);
            }
            for (const a of cycle.completedActions) done.add(a.id);
        }
    }
    return done;
}
```

This aggregates proven-completed tools across all checkpoints for a session, including the old (pre-crash) execution.

---

## 8. TOOL SAFETY MODEL

### Classification:

| Category | Examples | Crash behavior | Recovery policy |
|----------|----------|----------------|-----------------|
| **Read-only** | `read_file`, `search_knowledge_graph`, `list_directory` | No side effect | AUTO_RETRY — always safe |
| **Idempotent** | `get_file_info`, `compute_hash` | Repeatable without harm | AUTO_RETRY |
| **Side-effecting** | `write_file`, `send_message`, `database_write`, `create_resource` | Duplicate = data corruption | **FAIL_CLOSED** — never auto-retry uncertain |
| **Destructive** | `delete_file`, `cancel_task` | Duplicate = data loss | **FAIL_CLOSED** — require manual revalidation |

### Policy for UNCERTAIN tools:

| Tool category | `running` after crash → action | Rationale |
|---------------|-------------------------------|-----------|
| Read-only | AUTO_RETRY | No side effect; safe to re-execute |
| Idempotent | AUTO_RETRY | Repeatable without harm |
| Side-effecting | **FAIL_CLOSED** | Side effect may have completed; re-execute risks duplicate |
| Destructive | **FAIL_CLOSED** | Side effect may have completed; re-execute risks data loss |

**Implementation:** The LLM is responsible for classification via tool names, OR we add a `toolCategory` metadata field. On recovery, the engine checks the tool category and applies the policy.

**Simpler approach (ponytail):** Don't classify tools. For ALL `running` tools after restart:
- Re-execute read-only tools (safe)
- For side-effecting tools, surface via log: "WARNING: tool X was running at crash — external side effect status unknown. Manual verification recommended."
- The LLM decides whether to re-execute based on the log warning and the current plan state.

This avoids adding a tool registry classification layer.

---

## 9. TASKQUEUE / STARTUP BEHAVIOR

### Current behavior (confirmed):

**Background tasks:** `TaskQueue.loadFromDisk()` already handles `running` → `interrupted` conversion. If `provenCompleted > 0`, status becomes `interrupted` (not auto-requeued). If `provenCompleted == 0`, status becomes `queued` (safe to re-queue).

**Foreground tasks:** NO recovery logic in `engine.ts` `processInnerScoped()`. The checkpoint `getAllInProgress()` + `markRecovered()` only annotates. No task is created or queued.

**User-triggered vs auto-triggered:** Recovery is ALWAYS user-triggered. The user must send a new message to create a new Execution. There is no auto-resume on startup.

### Proposal: Extend `TaskQueue` recovery pattern to foreground

The `TaskQueue.loadFromDisk()` pattern is correct. Apply the same logic:

```
engine.init()
    ↓
checkpointStore.init()
    ↓
checkpointStore.getAllInProgress() → returns old snapshots
    ↓
for each old snapshot:
    getProvenCompletedToolIds(snapshot.requestId)
    if provenCompleted > 0:
        log.warn("UNCERTAIN: old task had proven-completed tools — manual verification needed")
        // Don't mark as interrupted — it's a checkpoint, not a TaskQueue task
    // Mark as recovered (annotation only)
    checkpointStore.markRecovered(snapshot.requestId, ...)
    ↓
// NEW: classify old snapshots
for each old snapshot with running tools:
    log.warn("UNCERTAIN side effect: tool X was running at crash")
```

**Do NOT create a new Execution automatically.** The user must trigger it with a new message.

---

## 10. PLANITEM COMPLETION BOUNDARY

### The three distinct completions:

```
Tool completed (executeToolCall returns)
    ≠
Checkpoint recorded as completed (checkpoint.cycle() runs)
    ≠
PlanItem completed (complete_item called + validated)
    ≠
Execution completed (checkpoint.complete() called)
```

### Proposed durable write order (safest):

```
1. executeToolCall() returns → side effect done
2. checkpoint.cycle() → records tool as completed in cycle data (DURABLE via flush)
3. complete_item → validates via evidenceLog, updates PlanItem.status='completed', calls setPlan() (DURABLE via snapshot)
4. checkpoint.complete() → terminal state + persistTerminal() (DURABLE immediately)
```

**Current problem:** Step 2 can crash (Scenario D). Steps 1→2 is the UNCERTAIN window.

**Proposed fix (Phase 4):** Add a `checkpoint.markToolCompleted(requestId, toolCallId)` that atomically updates `toolStatus` from `running` to `completed` AND adds to `completedActions`. This must be called immediately after `executeToolCall()` returns, BEFORE any other logic.

Actually, looking at the code, `checkpoint.cycle()` already does this in bulk. The issue is that `cycle()` is called at the end of the ReAct loop (after all tools in the cycle), not immediately after each tool.

**Proposal:** Call `checkpoint.markToolCompleted(requestId, toolCallId)` immediately after `executeToolCall()` returns, before evidence logging and before the next model call. This closes the Scenario D window.

```typescript
// agent.ts, after tool execution:
const toolResult = await this.toolRegistry.executeToolCall(toolCall);
// NEW: immediately mark as completed in checkpoint
if (this.checkpointStore && request.checkpointRequestId) {
    this.checkpointStore.markToolCompleted(request.checkpointRequestId, toolCall.id);
}
```

`markToolCompleted` would atomically: set `toolStatus = 'completed'` AND push to `completedActions` in the latest cycle.

**This eliminates Scenario D entirely** — the tool is recorded as completed in the checkpoint before any other logic runs. The only crash window remaining is between `checkpoint.start()` and `markToolRunning()`, which is Scenario A/B boundary (no side effect yet).

---

## 11. DUPLICATE SIDE-EFFECT POLICY

### Question: Can we achieve exactly-once?

**NO.** Exactly-once requires transactional boundary with external systems (e.g., write_file must be atomic with checkpoint write). The current architecture has no such transaction. `atomicWriteFileSync` only protects the checkpoint file, not the tool's external side effect.

### Trade-off analysis:

| Policy | Guarantees | Cost | Suitable for B1? |
|--------|-----------|------|------------------|
| at-most-once | Never duplicate, but may lose work | Skip uncertain tools | NO — loses work |
| at-least-once | Never lose work, but may duplicate | Retry all tools | NO — duplicates side effects |
| fail-closed | Never duplicate automatically | Requires manual intervention | **YES** |
| external revalidation | Duplicate possible but detectable | Requires external system support | NO — too complex |

### Recommendation: **FAIL_CLOSED for uncertain side effects**

- `DEFINITELY_NOT_STARTED` tools → AUTO_RETRY (safe)
- `DEFINITELY_COMPLETED` tools → SKIP (already done)
- `UNCERTAIN` tools → **FAIL_CLOSED** for side-effecting tools; AUTO_RETRY for read-only

Implementation: When the new Execution starts, scan old checkpoints for `running` tools. For side-effecting tools, log a warning. The system does NOT auto-re-execute them. The LLM sees the warning and the current plan state and decides.

**Key insight:** This is already what happens — the system creates a new Execution, the LLM sees the plan state (which PlanItems are `in_progress`), and decides what to do. The only change needed is the UNCERTAIN classification and logging.

---

## 12. PROPOSED PHASE 4 ARCHITECTURE

### 12.1 Recovery lifecycle:

```
Process starts
    ↓
engine.init()
    ↓
checkpointStore.init()
    ↓
loadFromDisk() — all cp-*.json loaded into snapshots Map
    ↓
getAllInProgress() — returns old in-progress snapshots
    ↓
for each old snapshot:
    markRecovered(requestId, note) — annotate with proven-completed count
    ↓
classifyOldSnapshots(oldSnapshots)
    ├── for each snapshot with toolStatus = 'running':
    │   → classify as UNCERTAIN
    │   → log warning for each running tool
    │   → if side-effecting tool: flag for manual verification
    │
    ├── for each snapshot with ALL tools DEFINITELY_NOT_STARTED:
    │   → safe to ignore (nothing happened)
    │
    └── for each snapshot with ALL tools DEFINITELY_COMPLETED:
        → already terminal or about to complete
    
    ↓
flush() + flushSync() — persist recovery annotations
    ↓
taskQueue.init() — already handles interrupted/queued conversion
    ↓
await user message → new Execution (fresh taskId)
    ↓
processInner() → checkpointStore.start(freshTaskId, ...)
    ↓
derivePlanState(checkpointStore, sessionId) → loads Plan from old snapshot
    ↓
Agent.run() → new ReAct loop continues from currentItemIndex
    ↓
NEW: scan old snapshots for UNCERTAIN tools → surface via context
    ↓
Agent decides: re-execute, skip, or flag for verification
```

### 12.2 State machine:

```
RUNNING (Execution active, tool executing)
    ↓ crash
INTERRUPTED (post-crash, same checkpoint on disk)
    ↓ classify (during next init())
├── DEFINITELY_NOT_STARTED → ignored (no side effects)
├── DEFINITELY_COMPLETED → terminal, no action needed
└── UNCERTAIN → flagged, requires manual/LLM decision

IN_PROGRESS (PlanItem)
    ↓ complete_item → COMPLETED (durable via snapshot)
    ↓ skip_item → SKIPPED
    ↓ abort → ABORTED
    ↓ crash → remains in_progress (visible on restart)
```

### 12.3 Checkpoint schema changes:

| Field | Type | Existing? | New? | Reason | Durability | Writer | Reader |
|-------|------|-----------|------|--------|------------|--------|--------|
| `recovery` | object | ✅ | — | Already exists | On flush | `markRecovered()` | Startup, logs |
| `status` | enum | ✅ | — | Already exists | Terminal via `persistTerminal()` | `complete()`/`failed()` | All |
| **`uncertainTools`** | `string[]` | ❌ | NEW | Track UNCERTAIN running tools | On flush | `classifyOldSnapshots()` | Recovery, logging |
| **`parentTaskId`** | `string` | ❌ | NEW | Link old snapshot to recovery snapshot (optional) | On flush | recovery classifier | Debug, audit |

**Do NOT add `executionAttempt` or `generation` counters** — the `taskId` already distinguishes Executions. `parentTaskId` is only useful for audit/debugging and can be deferred.

### 12.4 Recovery metadata:

**Do NOT add `parentTaskId` or `recoveryOf`.** The B1 constraint says no persistent Execution entity. The link between old and new Executions is implicit: same `sessionId` + same `Plan.id`. Adding metadata fields that link Executions is a step toward the forbidden entity.

**Exception:** `uncertainTools` array is acceptable because it's per-checkpoint metadata (not per-Execution), and it serves the recovery classification.

### 12.5 Tool status semantics after restart:

| Status | Meaning during execution | Meaning after restart |
|--------|-------------------------|----------------------|
| `pending` | Tool requested, `markToolRunning()` not yet called | **UNCERTAIN** — may or may not have started executing |
| `running` | `markToolRunning()` called | **UNCERTAIN** — may or may not have executed |
| `completed` | `checkpoint.cycle()` recorded | DEFINITELY_COMPLETED — proven done, do not re-execute |
| `failed` | `checkpoint.failed()` called | Terminal — no action needed |

**`pending` and `running` after restart = UNCERTAIN.** Both lack completion proof via `checkpoint.cycle()`. Neither should be auto-re-executed without LLM awareness of the uncertainty.

**`started + empty cycles` → no UNCERTAIN tool.** A checkpoint with `status: 'started'` and zero cycles means no tool was ever requested. Classification produces `uncertainTools = []`.

---

## 13. STATE MACHINE (proposed)

```
┌─────────────┐
│  EXECUTING   │  ← active ReAct loop, checkpoint.start() called
│  (task-A)    │
└──────┬───────┘
       │ crash
       ▼
┌─────────────┐
│  INTERRUPTED │  ← checkpoint on disk, status = in_progress
│  (task-A)    │  ← getProvenCompletedToolIds() determines classification
└──────┬───────┘
       │ classify (on next init())
       ├─→ DEFINITELY_NOT_STARTED (no tools marked running)
       │     → ignore, no action
       │
       ├─→ DEFINITELY_COMPLETED (all tools completed)
       │     → terminal state, wait for user
       │
       └─→ UNCERTAIN (some tools running)
             → flag uncertainTools in snapshot
             → log warnings
             → do NOT auto-resume
             → new Execution (task-B) handles continuation
```

PlanItem state machine is unchanged:
```
pending → in_progress → completed
              ↓
           skipped / failed
```

---

## 14. CHECKPOINT SCHEMA PROPOSAL

### Add to `CheckpointSnapshot`:

```typescript
interface CheckpointSnapshot {
    // ... existing fields ...
    
    /** R2 §B: recovery annotation (already exists) */
    recovery?: {
        recoveredAtBoot: string;
        provenCompletedTools: number;
        note: string;
    };
    
    /** Phase 4: tools marked 'running' at crash — UNCERTAIN classification */
    uncertainTools?: string[];
    
    /** Phase 4: classification timestamp (when snapshot was classified) */
    classifiedAt?: string;
}
```

### Add to `CheckpointStore`:

```typescript
/**
 * Classify an in-progress snapshot after restart.
 * Identifies tools with status 'pending' or 'running' → UNCERTAIN.
 * Both pending (markToolRunning() not yet called) and running (markToolRunning() called)
 * lack completion proof via checkpoint.cycle() → both UNCERTAIN.
 * Also handles status: 'started' snapshots (no cycle() yet).
 * Does NOT re-execute or resume anything.
 */
classifySnapshot(requestId: string): void {
    const snapshot = this.snapshots.get(requestId);
    if (!snapshot || (snapshot.status !== 'in_progress' && snapshot.status !== 'started')) return;
    
    const uncertain: string[] = [];
    for (const cycle of snapshot.cycles) {
        for (const [toolCallId, status] of Object.entries(cycle.toolStatus)) {
            if (status === 'running') {
                uncertain.push(toolCallId);
            }
        }
    }
    
    if (uncertain.length > 0) {
        snapshot.uncertainTools = uncertain;
        snapshot.classifiedAt = new Date().toISOString();
        this.dirty = true;
    }
}

/**
 * Get all 'running' tools for a session across all checkpoints.
 * Used for UNCERTAIN classification after restart.
 */
getRunningToolsForSession(sessionId: string): Map<string, string[]> {
    const result = new Map<string, string[]>();
    for (const snapshot of this.snapshots.values()) {
        if (snapshot.sessionId !== sessionId) continue;
        const uncertain = new Set<string>();
        for (const cycle of snapshot.cycles) {
            for (const [toolCallId, status] of Object.entries(cycle.toolStatus)) {
                if (status === 'pending' || status === 'running') uncertain.add(toolCallId);
            }
        }
        if (uncertain.size > 0) {
            result.set(snapshot.requestId, Array.from(uncertain));
        }
    }
    return result;
}
```

**Do NOT add `markToolCompleted()`** as a separate method. Instead, add a `completeTool(requestId, toolCallId)` that atomically updates `toolStatus` and adds to `completedActions` in the latest cycle. This closes the Scenario D window.

---

## 15. IMPLEMENTATION PLAN

### Phase 4A: Close the UNCERTAIN window (MUST HAVE)

**Files to change:**
- `src/core/checkpoint.ts` — add `completeTool()`, `classifySnapshot()`, `getRunningToolsForSession()`, `uncertainTools` field on snapshot
- `src/core/engine/engine.ts` — add classification loop in `init()` after `markRecovered()`
- `src/core/engine/agent.ts` — call `completeTool()` immediately after `executeToolCall()` returns

**Schema changes:** Add `uncertainTools?: string[]` and `classifiedAt?: string` to `CheckpointSnapshot`

**Tests to add:**
- `tests/model-b1-phase4a.test.ts` — test `completeTool()` closes the running→completed gap; test `classifySnapshot()` identifies UNCERTAIN tools; test `getRunningToolsForSession()` aggregates across snapshots

**Invariants:**
- `completeTool()` must be called atomically (set running→completed AND add to completedActions in one operation)
- `classifySnapshot()` must not change snapshot status (stays `in_progress`)
- `getRunningToolsForSession()` must not modify snapshots

**Risk:** `completeTool()` must be called before evidence logging in `agent.ts`. Current code at line 1006-1007 calls `markToolRunning()` before `executeToolCall()`. We need to add `completeTool()` after `executeToolCall()` returns (around line 1035).

### Phase 4B: Recovery classification logging (NICE TO HAVE)

**Files to change:**
- `src/core/engine/engine.ts` — add `getRunningToolsForSession()` loop in `init()`, log UNCERTAIN warnings

**Schema changes:** None (uses `uncertainTools` from Phase 4A)

**Tests to add:**
- Verify that `init()` logs warnings for UNCERTAIN tools

**Invariants:**
- No auto-resume of any kind
- Log messages are descriptive enough for LLM to see in context

**Risk:** Log verbosity — must not flood console with warnings for every old checkpoint.

### Phase 4C: Evidence fallback for complete_item (NICE TO HAVE)

**Files to change:**
- `src/core/checkpoint.ts` — add `getProvenCompletedToolIdsForSession(sessionId)`
- `src/core/plan/update-plan-tool.ts` — fallback validation after restart

**Schema changes:** None

**Tests to add:**
- Test that `getProvenCompletedToolIdsForSession()` aggregates across snapshots
- Test that `complete_item` validation works when `evidenceLog` is empty but proven-completed tools exist

**Invariants:**
- `complete_item` must never be bypassed
- EvidenceLog takes priority over proven-completed fallback

**Risk:** This could mask the missing EvidenceLog problem. If `complete_item` passes without runtime evidence, the completion is unverified. Must be clearly logged as "post-restart validation."

### Phase 4D: Side-effect tool classification (OUT OF SCOPE for Phase 4)

**Reason:** Requires tool registry metadata (`toolCategory`), which is a separate concern. Defer to Phase 5.

---

## 16. TEST MATRIX

### R1 — Restart before tool starts
- **Given:** `checkpoint.start()`, no `markToolRunning()`, crash
- **When:** `init()` → `getAllInProgress()` → `markRecovered()`
- **Expected:** `uncertainTools = []`, `provenCompleted = 0`
- **Recovery decision:** No action needed
- **Side-effect behavior:** N/A

### R2 — Restart after `markToolRunning()`, before `executeToolCall()`
- **Given:** `markToolRunning(toolCallId='t1')`, crash before tool executes
- **When:** `init()` → `classifySnapshot()`
- **Expected:** `uncertainTools = ['t1']`
- **Recovery decision:** UNCERTAIN — do not auto-retry
- **Side-effect behavior:** Tool t1 NOT executed; no duplicate risk

### R3 — Restart during tool execution
- **Given:** Same as R2 (execution happens in JS event loop, cannot distinguish)
- **When:** Same as R2
- **Expected:** Same as R2
- **Recovery decision:** Same as R2
- **Side-effect behavior:** UNCERTAIN

### R4 — Restart after side effect, before `checkpoint.cycle()`
- **Given:** `executeToolCall()` returns (side effect done), crash before `checkpoint.cycle()`
- **When:** `init()` → `classifySnapshot()`
- **Expected:** `uncertainTools = ['t1']` (tool still shows `running`)
- **Recovery decision:** UNCERTAIN — FAIL_CLOSED for side-effecting tools
- **Side-effect behavior:** Duplicate risk (file was written but checkpoint says running). `completeTool()` closes this window.

### R5 — Restart after `checkpoint.cycle()` (tool completed)
- **Given:** `checkpoint.cycle()` recorded tool as `completed`, crash before `complete_item`
- **When:** `init()` → `getProvenCompletedToolIds()` returns `{t1}`
- **Expected:** `uncertainTools = []`, `provenCompleted = 1`
- **Recovery decision:** DEFINITELY_COMPLETED — safe, no re-execute
- **Side-effect behavior:** No duplicate

### R6 — Restart after `complete_item`
- **Given:** `complete_item` succeeded, `PlanItem.status = 'completed'`, crash before terminal checkpoint
- **When:** `init()` → `getPlan()` returns plan with completed item
- **Expected:** PlanItem shows completed, new Execution continues from next item
- **Recovery decision:** Continue Plan from `currentItemIndex`
- **Side-effect behavior:** No duplicate

### R7 — Multiple executions / multiple checkpoints
- **Given:** task-A (completed), task-B (in_progress, running tool t1), task-C (started)
- **When:** `init()` → `getAllInProgress()` returns task-B and task-C
- **Expected:** Both classified, task-B has `uncertainTools = ['t1']`, task-C has `uncertainTools = []`
- **Recovery decision:** task-B UNCERTAIN, task-C not started
- **Side-effect behavior:** Only task-B's t1 is uncertain

### R8 — Terminal historical checkpoint remains immutable
- **Given:** task-A completed, task-B in_progress with `uncertainTools = ['t1']`
- **When:** `setPlan(sessionId, plan)` called for new execution
- **Expected:** task-A snapshot NOT mutated; task-B snapshot gets `uncertainTools`
- **Recovery decision:** N/A
- **Side-effect behavior:** N/A

### R9 — Session isolation
- **Given:** session-1 has task-A (running), session-2 has task-B (running)
- **When:** `init()` → `getAllInProgress()` returns both sessions' snapshots
- **Expected:** Classification is per-session; no cross-session leakage
- **Recovery decision:** Independent per session
- **Side-effect behavior:** Independent per session

### R10 — Uncertain side-effect policy
- **Given:** `uncertainTools = ['write_file']`
- **When:** New Execution starts, LLM sees plan state
- **Expected:** Warning logged for `write_file`; LLM decides whether to re-execute
- **Recovery decision:** FAIL_CLOSED — no auto-retry
- **Side-effect behavior:** Depends on LLM decision (logged as warning)

---

## 17. INVARIANTS

Proposed mandatory invariants for Phase 4:

```
I1. Every checkpoint write references an existing snapshot (requireSnapshot).
I2. A historical terminal checkpoint (completed/failed) is immutable.
I3. A new Execution never reuses an old taskId.
I4. Recovery never silently assumes an uncertain side effect completed.
I5. markRecovered() is annotation-only, never triggers execution.
I6. setPlan() never mutates terminal checkpoints.
I7. getPlan() returns the latest Plan across all checkpoints (including terminal).
I8. Tool status 'pending' or 'running' after restart = UNCERTAIN, never "still running" or "definitely not started".
I9. completeTool() (new) must be called atomically: set running→completed AND add to completedActions.
I10. complete_item validation must never be bypassed (even after restart).
I11. getProvenCompletedToolIds() returns only tools in completedActions or completed toolStatus.
I12. TaskQueue 'interrupted' status is never auto-requeued.
I13. Foreground execution is never auto-resumed on startup.
I14. EvidenceLog is runtime-only; complete_item after restart uses fallback validation.
```

---

## 18. RISKS / TRADE-OFFS

### Risk 1: `completeTool()` adds overhead per tool call
**Mitigation:** `completeTool()` is a synchronous Map operation — negligible cost. The alternative (Scenario D crash window) is far more expensive.

### Risk 2: `uncertainTools` field increases snapshot size
**Mitigation:** Array of toolCallId strings. Typically 0-5 tools per cycle. Negligible JSON size.

### Risk 3: Phase 4A changes `agent.ts` flow — may break existing ReAct loop timing
**Mitigation:** `completeTool()` is called immediately after `executeToolCall()` returns, before evidence logging and before the next model call. This is a strict superset of the current flow. Existing behavior is preserved; only the crash window is narrowed.

### Risk 4: `getRunningToolsForSession()` scans all snapshots — could be slow with many checkpoints
**Mitigation:** `loadFromDisk()` already limits to `maxFiles` (default 100). Scanning 100 snapshots is O(n) — trivial.

### Risk 5: LLM may ignore UNCERTAIN warnings and re-execute side-effecting tools
**Mitigation:** This is an inherent limitation of the architecture. The warning is logged and surfaced; the LLM is informed. The system cannot enforce "don't retry" without an execution queue that blocks re-execution. This is a known trade-off of Plan continuation.

### Trade-off: Plan continuation vs true execution recovery
- Plan continuation: minimal code changes, preserves PlanItem progress, no duplicate risk from uncertain tools, but LLM may re-execute tools
- True execution recovery: requires persisting EvidenceLog + Agent state, violates B1 constraints, adds significant complexity
- **Chosen:** Plan continuation with UNCERTAIN classification and logging

---

## 19. OPEN QUESTIONS

### OQ1: Should `completeTool()` be called before or after evidence logging?

**Current flow:** `executeToolCall()` → `markToolRunning()` (before tool) → `evidenceLog.push()` → `checkpoint.cycle()` (after all tools in cycle)

**Proposed:** `executeToolCall()` → `completeTool()` → `evidenceLog.push()` → `checkpoint.cycle()`

**Question:** Does `completeTool()` need to call `checkpoint.cycle()` internally, or just update `toolStatus` and `completedActions` in the latest cycle? The former creates a new cycle entry; the latter updates the latest cycle in place.

**Recommendation:** Update latest cycle in place (same `markToolRunning()` pattern). `completeTool()` mirrors `markToolRunning()` but changes `running` → `completed` and pushes to `completedActions`.

### OQ2: Should the LLM be explicitly told about UNCERTAIN tools?

**Option A:** Log only (visible in agent.log, not in LLM context)
**Option B:** Inject into system prompt / plan context
**Option C:** Return as part of `derivePlanState()` result

**Recommendation:** Option B — inject a warning into the plan context so the LLM sees it. This is the most reliable way to prevent duplicate re-execution.

### OQ3: Does `complete_item` need a post-restart validation fallback?

**Current:** `canCompleteItem(evidenceLog, itemIndex)` blocks if evidenceLog is empty.
**After restart:** evidenceLog is always empty → `complete_item` always blocked.

**Question:** Should we add a fallback that checks `getProvenCompletedToolIds()` for the old taskId?

**Recommendation:** YES, but with clear logging. The fallback should log: "Post-restart validation: using proven-completed tools from previous execution (task-A). EvidenceLog was lost." This makes the limitation explicit.

### OQ4: Should `TaskQueue` recovery be extended to foreground execution?

**Current:** `TaskQueue` has `interrupted` status and `loadFromDisk()` recovery. Foreground has none.
**Question:** Should we create a `ForegroundTask` equivalent?

**Recommendation:** NO. Foreground execution is synchronous with a user message. It doesn't need a task queue. The recovery classification in Phase 4A provides equivalent functionality via logging.

---

## 20. FINAL RECOMMENDATION

### Verdict: **GO WITH CONDITIONS**

The Phase 4 architecture is sound with the following conditions:

1. **Phase 4A MUST close the UNCERTAIN window** — `completeTool()` must be implemented to atomically mark tools as completed immediately after `executeToolCall()` returns. Without this, Scenario D remains unresolved.

2. **Phase 4A MUST classify old snapshots on startup** — `classifySnapshot()` must identify UNCERTAIN tools and flag them. Without this, the system cannot distinguish "never started" from "executed but not checkpointed."

3. **Phase 4B MUST log UNCERTAIN warnings into LLM context** — Without this, the LLM cannot make informed decisions about re-execution.

4. **Phase 4C MUST add evidence fallback for `complete_item`** — Without this, `complete_item` is permanently blocked after restart.

5. **DO NOT create persistent Execution entities** — The B1 constraint stands. Plan continuation is sufficient.

6. **DO NOT add `parentTaskId` or `recoveryOf` metadata** — The implicit link (same `sessionId` + same `Plan.id`) is sufficient.

### Key architectural decision:

> **Recovery = Plan continuation with UNCERTAIN classification.** After crash, a new Execution (fresh taskId) resumes the Plan from `currentItemIndex`. Tools that were `running` at crash are classified as UNCERTAIN and logged. The LLM decides whether to re-execute, with side-effecting tools flagged for manual verification. The `completeTool()` method closes the gap between `executeToolCall()` and `checkpoint.cycle()`.

### Open decisions:

1. **OQ1:** `completeTool()` implementation detail — update cycle in place vs. create new cycle entry.
2. **OQ2:** How to surface UNCERTAIN warnings to the LLM (system prompt injection vs. log-only).
3. **OQ3:** `complete_item` post-restart validation fallback — scope and logging.
4. **OQ4:** Whether to extend `TaskQueue` pattern to foreground — decided NO.

---

## 21. VERIFICATION

* Files read during analysis:
  - `src/core/checkpoint.ts` — full (545 lines)
  - `src/core/engine/engine.ts` — partial (init, processInner, processInnerScoped, process)
  - `src/core/engine/agent.ts` — partial (executeReActLoop, markToolRunning, checkpoint.cycle, evidence logging)
  - `src/core/task-queue.ts` — full (347 lines, including loadFromDisk recovery)
  - `src/core/request-context.ts` — full (61 lines)
  - `src/core/plan/update-plan-tool.ts` — partial (complete_item handler, canCompleteItem call)
  - `src/core/plan/plan-state.ts` — full (107 lines)
  - `src/core/plan/types.ts` — partial (PlanItem, PlanStatus, TaskPlan)
  - `src/core/crash-handler.ts` — full (41 lines)
  - `src/types.ts` — partial (EngineRequest.checkpointRequestId)
  - `tests/model-b1-phase1.test.ts` — full (78 lines)
  - `tests/model-b1-phase3.test.ts` — partial (167 lines)
  - `MODEL_B1_PHASE_4_AUDIT.md` — full (already created)

* File created: `MODEL_B1_PHASE_4_RECOVERY_DESIGN.md`

* Source changes: NONE
* Test changes: NONE
* Commits: NONE
* Working tree: Clean (verified via `git checkout --` and `git status`)

---

*This design document is complete. No source code was modified. No tests were created or changed. No commits were made.*

*Design is ready for ChatGPT/Claude review before Phase 4A implementation.*
