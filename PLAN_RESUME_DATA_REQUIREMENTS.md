# PLAN RESUME DATA REQUIREMENTS

## 1. EXECUTIVE ANSWER

**PLAN-ALONE-SUFFICIENT (for continuation) + CONDITIONAL (for safety)**

For **normal continuation** (Execution #1 ends, Execution #2 starts in same session): Plan state alone is sufficient. `currentItemIndex`, `items[].status`, and `items[].resultSummary` capture everything needed to know what's done and what's next.

For **process restart**: Plan state alone is **insufficient for safe continuation** when tools were interrupted mid-flight. `EvidenceLog` is lost, `toolStatus` is partially durable (checkpoint cycles) but not indexed by plan item. The system has no way to prove a tool was completed unless `complete_item` was called before the crash.

**The separation is exactly `complete_item`:** If `complete_item` was called → Plan state suffices. If not → durable evidence is missing.

---

## 2. PLAN STATE INVENTORY

| Field | Durable? | Meaning | Used by Resume? | Source |
|-------|----------|---------|-----------------|--------|
| `TaskPlan.id` | YES (via disk snapshot fallback) | Plan identity | Identification | types.ts:61, checkpoint.ts:290-292 |
| `TaskPlan.sessionId` | YES | Owning session | Scope/lookup | types.ts:62 |
| `TaskPlan.goal` | YES | Original user goal | LLM prompt context | types.ts:64 |
| `TaskPlan.status` | YES | pending/running/completed/failed/aborted/stuck | Determines if work remains | types.ts:66 |
| `TaskPlan.currentItemIndex` | YES | Index of current active item | Tells Execution #2 where to start | types.ts:67, update-plan-tool.ts:229 |
| `TaskPlan.items[]` | YES (as part of plan) | All plan items with individual status | Resume core data structure | types.ts:65 |
| `PlanItem.index` | YES | Position in items[] | Navigation | types.ts:32 |
| `PlanItem.description` | YES | Task description | LLM knows what to do | types.ts:33 |
| `PlanItem.status` | YES | pending/in_progress/completed/skipped/failed | Tells what remains to be done | types.ts:34, update-plan-tool.ts:216, agent.ts:923 |
| `PlanItem.completedByTool` | YES | Which tool completed it | Audit trail | types.ts:35 |
| **`PlanItem.resultSummary`** | **YES** | Text summary of completion result (set by complete_item) | **PROVES item was done** — does NOT prove tool was the one that succeeded | types.ts:36, update-plan-tool.ts:217 |
| `PlanItem.error` | YES | Error message from failure/skip | Resume knows what went wrong | types.ts:37 |
| `PlanItem.errorCategory` | YES | transient/permanent/security | Resume knows retry category | types.ts:38 |
| `PlanItem.consecutiveFailedAttempts` | YES | Stagnation counter | Resume knows how many attempts already failed | types.ts:40, agent.ts:1257 |
| `PlanItem.consecutiveTransientAttempts` | YES | Transient error counter | Resume knows transient retry count | types.ts:44, agent.ts:1248 |
| `TaskPlan.createdAt` | YES | When plan was created | Age calculation | types.ts:69 |
| `TaskPlan.completedAt` | YES | When plan finished | Audit | types.ts:70 |

### Resume-relevant fields

For a NEW Execution to know where to continue, these Plan fields are sufficient:
- `currentItemIndex` → which item to start from
- `items[i].status === 'completed'` → items already done (skip, don't redo)
- `items[currentItemIndex].status === 'pending'` → next work item
- `items[i].resultSummary` → what previous items produced

**Source:** `update-plan-tool.ts:229`: `plan.currentItemIndex = itemIndex + 1;` — after each `complete_item`, the plan's pointer advances. At `update-plan-tool.ts:232`: `allDone = plan.items.every(i => i.status === 'completed' || i.status === 'skipped' || i.status === 'failed')` — terminal determination uses item statuses only.

---

## 3. EXECUTION STATE INVENTORY

| State | Durable? | Where stored | Needed after restart? | Source |
|-------|----------|-------------|----------------------|--------|
| `taskId` = `task-${Date.now()}` | NO — ephemeral | engine.ts:761 local var | Not needed — new one generated | engine.ts:761 |
| `RequestContext` | NO — ephemeral | AsyncLocalStorage, torn down when processInner returns | Not needed — new one created | engine.ts:773-784, request-context.ts:53 |
| `rctx.evidenceLog` | NO — in-memory Map | engine.ts:779 (new Map()), populated agent.ts:1109-1117 | **YES for evidence-gated complete_item** — but lost | agent.ts:1100-1120 |
| `rctx.onPlanCreated` | NO — function reference | engine.ts:780-782 | Not needed — new callback set | engine.ts:780-782 |
| `rctx.signal` (AbortSignal) | NO — per-request | engine.ts:680-682 | Not needed — new controller per request | engine.ts:680-682 |
| `modelOptions` | NO — per cycle | agent.ts:577-582 | Not needed | agent.ts:577-582 |
| `stallCount` | NO — local var in loop | agent.ts:505 | Not needed — reset per execution | agent.ts:505 |
| `toolCallCycles` | NO — restarted each execution | agent.ts:499 | Not needed — reset each time | agent.ts:499 |
| `finalContent` | NO — response result | agent.ts:500 | Not needed — already returned | agent.ts:500 |
| Agent instance | YES (agent singleton) | Agent class on Engine | Survives restart? Only if in-memory — lost on restart | engine.ts:295, agent.ts constructor |

### What is completely lost on Execution end

The entire agent.ts ReAct loop state: stallCount, toolCallCycles, cycleErrorCategory, planNudgeInjected, unplannedToolCallCount, readToolCount, latestProgressResult.

**None of these are needed for resume.** The new execution builds fresh state from scratch.

---

## 4. CHECKPOINT STATE INVENTORY

| State | Durable? | Meaning | Needed for resume? | Source |
|-------|----------|---------|-------------------|--------|
| `CheckpointSnapshot.plan` | YES (embedded copy) | Copy of TaskPlan at snapshot time | **Used by getPlan() fallback** when `this.plans` is empty | checkpoint.ts:71, 290-292 |
| `CheckpointSnapshot.cycles[]` | YES | Recorded ReAct cycles with tool calls | **Partially** — tool status per cycle for proven-completed check | checkpoint.ts:158-200 |
| `CycleData.toolStatus` | YES per cycle | `'pending'|'running'|'completed'` for each tool call | **Used by getProvenCompletedToolIds()** — proves tool finished a cycle | checkpoint.ts:190-200, 506-516 |
| `CycleData.completedActions[]` | YES | Tools that had results in this cycle | Proven completion evidence | checkpoint.ts:175-176 |
| `CycleData.pendingActions[]` | YES | Tools called but no result recorded | **NOT proven** — pending = no completion proof | checkpoint.ts:178-179 |
| `CheckpointSnapshot.recovery` | YES (set by markRecovered) | Recovered-at-boot annotation | Audit/logging only — does not change plan status | checkpoint.ts:520-534 |
| `activeTaskBySession` | YES (rebuilt from disk) | sessionId → latest taskId | **Guards checkpoint.start()** — ambiguous semantics post-restart | checkpoint.ts:107,406-413 |

### Checkpoint and Plan relationship

`getPlan(sessionId)` at `checkpoint.ts:290-292`:
```typescript
return this.plans.get(sessionId) ?? this.getLatestForSession(sessionId)?.plan ?? null;
```

After restart: `this.plans` is empty (not persisted independently). The fallback loads Plan from the latest in-progress snapshot.

**PROVEN:** Plan state is ultimately durable via checkpoint snapshot fallback. The Plan seen by the new Execution is identical to the Plan at crash time (minus any in-memory-only mutations that weren't flushed).

---

## 5. EVIDENCE INVENTORY

| Evidence | Durable? | Where stored | What decision uses it? | Source |
|----------|----------|-------------|----------------------|--------|
| `EvidenceLog` (RequestContext) | **NO** — in-memory Map | engine.ts:779, agent.ts:1109-1117 | `canCompleteItem()` gate for `complete_item` | plan-state.ts:89-107 |
| `PlanItem.resultSummary` | **YES** — in Plan state | update-plan-tool.ts:217 sets on complete_item | LLM sees what previous items produced | types.ts:36 |
| `PlanItem.status = 'completed'` | **YES** — in Plan state | update-plan-tool.ts:216 | Resume knows item is done | types.ts:34 |
| `PlanItem.status = 'in_progress'` | **YES** — in Plan state | agent.ts:923 | Resume sees item was started but not completed | types.ts:34 |
| Checkpoint `toolStatus[callId] = 'completed'` | **YES** per cycle | checkpoint.ts:175-176, 190-200 | `getProvenCompletedToolIds()` for crash recovery | checkpoint.ts:506-516 |
| Checkpoint `toolStatus[callId] = 'running'` | **YES** per cycle | checkpoint.ts:206-213 (markToolRunning) | **NOT proof** — running = mid-flight at crash | checkpoint.ts:211 |
| Checkpoint `completedActions[]` | **YES** per cycle | checkpoint.ts:175-176 | Proven completion | checkpoint.ts:190-200 |
| Tool result in cycle data | **YES** (truncated summary) | checkpoint.ts:183-188 | Partial — only summary string, not full result | checkpoint.ts:183-188 |

### Critical gap

**EvidenceLog is NOT durable.** The `canCompleteItem()` function at plan-state.ts:89-107 requires a non-empty evidence log with successful tool calls for the item index. After restart, the evidence log is empty, so `complete_item` calls for pending/in_progress items will be REJECTED.

This means:
- Items with `status='pending'` that had tools executed (but no complete_item call) before restart → after restart, complete_item fails because evidence is empty
- The LLM must re-execute the tool to generate new evidence for the item

`PlanItem.status='completed'` items are safe — they don't need evidence gate re-verification.

---

## 6. COMPLETE_PLAN_ITEM TRACE

```
Step 1: Plan creation
  update-plan-tool.ts:131-144
  → TaskPlan created with items=[item0(pending), item1(pending), item2(pending)]
  → currentItemIndex = 0
  → plan.status = 'pending'
  → checkpointStore.setPlan(sessionId, plan)                           checkpoint.ts:278

Step 2: Agent selects item 0
  agent.ts:916: activePlan.items[activePlan.currentItemIndex]
  → item 0, status='pending'

Step 3: A3 promotion to in_progress
  agent.ts:917-936: first real tool call (not update_plan)
  → item0.status = 'in_progress'                                       agent.ts:923
  → plan.status = 'running'                                             agent.ts:931
  → checkpointStore.setPlan(sessionId, plan)                            agent.ts:934

Step 4: Tool execution
  agent.ts:951-1081: tool called, result returned
  → EvidenceLog updated: evidenceLog.get(0).push({toolName, success})  agent.ts:1109-1117
  → checkPointer.cycle(checkpointRequestId, ...) records tool status   agent.ts:1167-1176

Step 5: complete_item called
  update-plan-tool.ts:205: canCompleteItem(rctx?.evidenceLog, 0)
    → plan-state.ts:93: evidenceLog.get(0) or []
    → evidence has ToolCallRecord with success=true
    → plan-state.ts:106: returns {ok: true}
  update-plan-tool.ts:216: item0.status = 'completed'
  update-plan-tool.ts:217: item0.resultSummary = args.result_summary
  update-plan-tool.ts:229: plan.currentItemIndex = 1 (itemIndex 0 + 1)
  checkpointStore.setPlan(sessionId, plan)                               update-plan-tool.ts:248

  DURABLE PLAN STATE NOW:
    items[0]: { status: 'completed', resultSummary: '...' }
    items[1]: { status: 'pending' }
    items[2]: { status: 'pending' }
    currentItemIndex: 1

Step 6: Execution #1 ends
  processInnerScoped returns (engine.ts:1083-1088)
  → checkpointStore.complete(taskId, ...) or agent.run complete
  → RequestContext destroyed: evidenceLog lost

Step 7: New Execution #2 starts (same session)
  engine.ts:761: new taskId = task-Date.now()
  engine.ts:773-784: fresh RequestContext, new evidenceLog (empty Map)
  engine.ts:862: derivePlanState(this.checkpointStore, sessionId)
    → plan-state.ts:42: getPlan(sessionId) → Plan loaded from this.plans or snapshot
    → items[0].status='completed', items[1].status='pending', currentItemIndex=1
    → plan-state.ts:56: hasExecutionEvidence = items.some(i => i.status==='in_progress'||'failed'||'skipped')
      → false (item0 completed, item1 pending)
    → Returns { kind: 'planning', planId }   ← NOT executing! But harmless.

  engine.ts:862-928: Plan context built, injected into LLM prompt
  → LLM sees: item0 [✅] completed — result: "..."
  → LLM sees: item1 [⬜] pending — next work item
  → LLM proceeds with item1

Step 8: Agent selects next item
  agent.ts:916: activePlan.items[activePlan.currentItemIndex] → item1
```

**Result:** After complete_item, Plan state alone is sufficient to continue. The `resultSummary` text tells the LLM what item0 produced. `currentItemIndex=1` tells where to start. The evidence gate for complete_item on item1 will fire fresh tool calls and generate new evidence.

---

## 7. INTERRUPTED_ITEM TRACE

```
Tool execution happens, but complete_item is NOT called (crash/error before call)

Step 1-4: Same as normal trace
Step 5: interrupted BEFORE complete_item
  → item0.status = 'in_progress' (set by A3)                           agent.ts:923
  → evidenceLog has entries for item 0                                  agent.ts:1109-1117
  → checkpoint cycles have toolStatus['call-xyz'] = 'completed'        agent.ts:1167-1176
  → NO complete_item call
  → Plan NOT updated: currentItemIndex still 0

  DURABLE PLAN STATE:
    items[0]: { status: 'in_progress' }
    items[1]: { status: 'pending' }
    items[2]: { status: 'pending' }
    currentItemIndex: 0

Step 6: Execution ends / crash
  → RequestContext destroyed: evidenceLog lost
  → Checkpoint snapshot persisted (if flush happened) with cycles + toolStatus

Step 7: New Execution #2 starts
  engine.ts:862: getPlan(sessionId)
  → items[0].status='in_progress', currentItemIndex=0
  → derivePlanState: hasExecutionEvidence=true (status='in_progress' exists)
  → Returns { kind: 'executing', activeItemIndex: 0 }

  engine.ts:862-928: Plan context built
  → LLM sees: item0 [🔄] in_progress — started but not completed
  → LLM sees: "Bạn ĐANG thực thi plan này" (engine.ts:922)

  LLM decides: call tool for item0 again, then complete_item
  → agent.ts:1107: check if sp.status === 'pending' || sp.status === 'running'
  → plan.status = 'running' (set at crash, still 'running')
  → tool runs again, evidenceLog populated
  → complete_item succeeds

CRITICAL: EvidenceLog was LOST. But item0 is 'in_progress', so:
  - complete_item would still FAIL if called immediately
    (plan-state.ts:93: evidenceLog.get(0) = undefined → empty → {ok: false})
  - LLM must re-execute the tool to get fresh evidence
  - DOUBLY important if the tool had SIDE EFFECTS (wrote a file, sent an email)
    → the side effect happened in Execution #1, also happens in Execution #2
    → DUPLICATE EXECUTION risk is real
```

### What durability exists for interrupted tools

| Source | Data | Utility after restart |
|--------|------|----------------------|
| Plan state | `item.status = 'in_progress'` | Shows item was started, not completed — no safe skip |
| Checkpoint cycles | Tool status = 'completed' for the cycle | Proves tool ran once — but NOT indexed by plan item |
| Checkpoint `markToolRunning` | `toolStatus = 'running'` at crash | NOT proven — guarantees nothing |
| EvidenceLog | LOST | Cannot call complete_item without re-execution |

---

## 8. RESTART ANALYSIS

### Survives restart
- Plan state (via `this.plans` fallback to `getLatestForSession()?.plan`)
- PlanItem statuses (completed/pending/in_progress/skipped/failed)
- PlanItem resultSummary
- PlanItem error + errorCategory
- PlanItem consecutiveFailedAttempts
- currentItemIndex
- CheckpointSnapshot cycles[] (proven-completed tool IDs)
- CheckpointSnapshot toolStatus per cycle
- activeTaskBySession (rebuilt from disk)

### Lost on restart
- EvidenceLog (in-memory Map in RequestContext)
- RequestContext entirely
- ReAct loop local state (stallCount, cycleErrorCategory, ...)
- In-flight tool calls (their results in agent.ts local scope)
- Checkpoint writes not yet flushed (if process crashes before periodic flush)

### Reconstructable
- `this.plans` Map — reconstructed from `getLatestForSession()?.plan` fallback per load
- `activeTaskBySession` — rebuilt from in-progress snapshots
- Plan identity — derived from checkpoint snapshot contents

### NOT Reconstructable
- Which tools were proven completed for items that haven't called `complete_item`
- Whether tool side effects already happened
- The exact result of an interrupted tool

---

## 9. SCENARIO RESULTS

| Scenario | Plan Alone? | Checkpoint Needed? | Evidence Needed? | External Revalidation Needed? |
|----------|------------|-------------------|-----------------|------------------------------|
| **A — Normal continuation** (complete_item called) | **YES** — currentItemIndex + item statuses tell exactly where to continue | Not needed | Not needed (resultSummary proves done) | Not needed (item is just a description, not an external claim) |
| **B — Process restart with tool interrupted** | **NO** — item status='in_progress' but no evidence which tool was mid-flight | **YES** — checkpoint.cycles.toolStatus tells which tools had completed cycle | **YES** — tool results from previous execution NOT available to new execution | **YES** — external side effects from the interrupted tool may have happened |
| **C — Tool completed, complete_item not called** | **NO** — item.status='in_progress', can't distinguish "tool never ran" from "tool ran but complete_item wasn't called" | **PARTIALLY** — checkpoint cycles have completed status for the tool call | **NO** — evidenceLog lost, can't call complete_item without re-execution | **YES** — same as B: side effects may have happened |
| **D — External world changed** | **NO** — Plan state records past completion, doesn't know current reality | Not relevant | Not relevant | **YES** — gap known and intentional; no revalidation mechanism exists |

---

## 10. MINIMUM DURABLE RESUME CONTRACT

The minimum information that must survive an Execution boundary for correct Plan continuation:

### For normal continuation (complete_item called for each done item):

1. **`currentItemIndex`** — where to resume
2. **`items[i].status`** — completed vs pending per item
3. **`items[i].resultSummary`** — what was produced (optional but helpful)
4. **`items[i].error`** — if an item failed
5. **`goal`** — the original task

**These already survive.** Plan state is sufficient. (STRONG INFERENCE)

### For crash/interrupted recovery:

1. All of the above
2. **`PlanItem.status = 'in_progress'`** — marks partially-done items
3. **Checkpoint cycle toolStatus** — which tools completed a cycle before crash
4. **Something to link plan items to completed tools** — currently missing

**Items #3-4 are the gap.** Checkpoint tracks tool status by `toolCallId` per cycle, but does NOT link it to `planItemIndex`. There is no durable mapping of "tool X completed for plan item Y." The EvidenceLog did this mapping in memory but is lost on restart. (PROVEN)

---

## 11. ARCHITECTURAL CONSEQUENCE

### Plan alone is sufficient for CASE A (normal continuation)
Model B1 (no persistent Execution entity) works for the happy path. `TaskPlan` has everything: status per item, `currentItemIndex`, `resultSummary`. A new Execution loads the Plan and knows exactly what's done and what's next.

### Plan alone is INSUFFICIENT for CASE B/C (interrupted tools after restart)
The gap: EvidenceLog is per-Execution, not per-Plan. When interrupted mid-flight:
- `item.status = 'in_progress'` shows the item was started but NOT completed
- No durable record of *which* tool results were obtained for the item
- Checkpoint has cycle toolStatus but NOT indexed by plan item
- `complete_item` cannot be called without re-executing tools
- Duplicate side-effect risk is real

**To close this gap with Model B1, the minimum addition is:** evidence for a plan item must survive the Execution boundary. This means either:
- Move the evidence log from `RequestContext` (ephemeral) to `TaskPlan` (durable), OR
- Persist a mapping from plan item index → completed tool calls in checkpoint

### Plan-context text in LLM prompt is NOT a reliable recovery mechanism
The current system injects Plan state as text in the system prompt (`engine.ts:862-928`). The LLM reads item statuses and `resultSummary` and decides what to do. This works for CASE A (items properly completed) but for CASE B/C the LLM sees `in_progress` with no evidence of what was already done — it may re-execute tools that already succeeded.

---

## 12. OPEN QUESTIONS

| # | Question | Status |
|---|----------|--------|
| 1 | Should `EvidenceLog` become part of durable Plan state? | **UNRESOLVED** — depends on whether duplicate tool execution risk is acceptable for interrupted items. |
| 2 | Should checkpoint cycle toolStatus be indexed by planItemIndex for cross-execution resume? | **UNRESOLVED** — current checkpoint has no plan-item awareness. |
| 3 | Is `item.status='in_progress'` useful after restart, or should it revert to 'pending'? | **UNRESOLVED** — `in_progress` implies an execution was active at crash; 'pending' implies "needs work." The current semantics are ambiguous after restart. |
| 4 | Does `canCompleteItem()` need to accept historical evidence (from checkpoint), not just ephemeral EvidenceLog? | **UNRESOLVED** — currently it only checks the in-memory log. Cross-execution completion requires a different source. |
| 5 | Should the Plan status `'running'` be auto-adjusted to `'paused'` or `'pending'` after restart to accurately reflect "no active execution"? | **UNRESOLVED** — currently stays 'running' forever. |
| 6 | Should `activeTaskBySession` be cleared on restart for Plans with `status='running'` (no real execution)? | **UNRESOLVED** — clearing it would allow checkpoint.start() to create a fresh snapshot. |
| 7 | Is duplicate tool execution for interrupted items an acceptable UX? | **UNRESOLVED** — depends on use case. For read-only tools (search, read file): acceptable. For mutating tools (write_file, send_message): dangerous. |