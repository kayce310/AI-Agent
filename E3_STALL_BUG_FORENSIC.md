E3 STALL BUG FORENSIC INVESTIGATION
Evidence-based root cause analysis
Case: "cấu trúc harness của JARVIS..." → 3 consecutive no-tool turns → E3 fires → blocked

════════════════════════════════════════════════════════════════
1. WHY NO TOOL CALL OCCURRED IN FIRST 3 TURNS
════════════════════════════════════════════════════════════════

DEFINITION OF "ACTION" (agent.ts:729):
```
const turnHasAction = (modelResult.toolCalls?.length > 0) || false;
```

CRITICAL: turnHasAction ONLY true if modelResult contains toolCalls array with length > 0.
If model returns finishReason='stop' with text content but NO tool calls → turnHasAction = false.

EVIDENCE from agent.ts:671-677:
```
if (modelResult.finishReason === 'stop') {
  R.state({ event: 'FINISHED', requestId, cycle: toolCallCycles, finishReason: 'stop' });
  let rawContent = modelResult.content || '';
  
  // PONYTAIL: debug response
  log.info(`[PONYTAIL_DEBUG] responseStop sessionId=${request.sessionId} cycle=${toolCallCycles} content=${rawContent.slice(0, 500)}`);
```

POSSIBLE REASONS NO TOOL CALLED:
1. Model chose text response (finishReason='stop', no toolCalls)
   - "JARVIS harness" = knowledge synthesis task
   - Model may think: "I can explain from training data; don't need tools"
2. Tool selection returned empty or irrelevant tools
   - selectRelevantTools() filters by relevance
   - Query "cấu trúc harness" may not match any tool signatures
3. Model did not recognize task as requiring tools
   - No explicit tool_choice='required' in cycle 1
   - Model had freedom to choose text response

RESULT: Model generated 3 text responses (no toolCalls) → stallCount incremented 3 times

════════════════════════════════════════════════════════════════
2. EXACTLY WHAT E3 CONSIDERS "PROGRESS"
════════════════════════════════════════════════════════════════

PROGRESS DEFINITION (agent.ts:741-750):
```
if (!turnHasAction && planIsActive) {
  stallCount++;
  log.warn(`[Stall] Cycle ${toolCallCycles} — stallCount=${stallCount}/${MAX_STALL}`);
} else {
  if (stallCount > 0) {
    log.info(`[Stall] Cycle ${toolCallCycles} — tool call detected, resetting stall counter.`);
  }
  stallCount = 0;
}
```

E3 PROGRESS = "toolCalls.length > 0"
- ✅ If ANY tool call in response → turnHasAction = true → stallCount RESET to 0
- ❌ If NO tool calls → turnHasAction = false → stallCount INCREMENTED

WHAT E3 DOES NOT CONSIDER PROGRESS:
- ❌ Text response (even if content exists)
- ❌ Model reasoning
- ❌ Plan item completion (via update_plan tool)
- ❌ Knowledge retrieval (no tool call)
- ❌ Model thinking/analysis without tool execution

E3 ASSUMES: "Plan active" + "No tool call" = "Stalled"

════════════════════════════════════════════════════════════════
3. WHETHER "NO TOOL CALL" IS INCORRECTLY TREATED AS "NO PROGRESS"
════════════════════════════════════════════════════════════════

ANSWER: ✅ YES — THIS IS THE BUG

EVIDENCE:

For task "cấu trúc harness của JARVIS, toàn diện các khía cạnh":
- This is a KNOWLEDGE SYNTHESIS task, not a TOOL-DEPENDENT task
- Model CAN answer directly from training data without tools
- Yet E3 treats this as "stalled" because toolCalls.length == 0

ARCHITECTURAL ASSUMPTION (WRONG):
```
Plan active ∧ No tool calls = Stalled
```

REALITY:
- Some tasks are inherently text-generative (synthesis, analysis, explanation)
- These tasks CAN make progress WITHOUT tools
- E3 conflates "no tool execution" with "no progress"

EVIDENCE FROM CODE (agent.ts:753-766):
```
if (stallCount >= MAX_STALL && planIsActive) {
  log.warn(`[Stall] Max stalls (${MAX_STALL}) reached — aborting`);
  return {
    content: `[E3] ❌ Agent stalled after plan creation: ${stallCount} consecutive turns without tool execution.`,
    // ... returns immediately WITHOUT checking if text content is valid
  };
}
```

BUG: E3 returns error WITHOUT validating:
- ❌ Is finalContent actually meaningful?
- ❌ Did model converge on an answer?
- ❌ Is this truly "stalled" or "complete via text"?
- ❌ Should text responses be valid terminal state?

════════════════════════════════════════════════════════════════
4. WHY SUBSEQUENT TURNS REMAIN BLOCKED AFTER E3 FIRES
════════════════════════════════════════════════════════════════

ROOT CAUSE: Plan status NOT updated when E3 fires

EVIDENCE (agent.ts:759-765):
```
return {
  content: `[E3] ❌ Agent stalled...`,
  modelUsed: modelResult.modelUsed || 'unknown',
  providerUsed: modelResult.providerUsed || 'unknown',
  toolCycles: toolCallCycles,
  finished: true,  // ← E3 returns finished=true
};
```

Agent returns error response but DOES NOT call checkpointStore.setPlan() to update Plan.status.

WHAT SHOULD HAPPEN:
1. E3 detects stall
2. Should update Plan.status = 'failed' (or 'aborted')
3. checkpoint.ts should persist this
4. Next request would see planState = { kind: 'failed' } (not 'executing')
5. Admission gate would NOT reuse Plan

WHAT ACTUALLY HAPPENS:
1. E3 returns error response
2. Plan.status REMAINS 'running' or 'executing'
3. engine.ts:1157-1162 marks checkpoint as 'failed' but...
4. Does NOT explicitly update Plan object status

EVIDENCE (engine.ts:1157-1162):
```
const outcomeIsFailure = isFailureOutcome(result.content);
this.eventLogger.taskFinished(taskId, ..., !outcomeIsFailure, ...);

if (outcomeIsFailure) {
  log.warn(`[P2] Outcome failure — checkpoint.failed`);
  this.checkpointStore.failed(checkpointRequestId, ...);
} else {
  this.checkpointStore.complete(checkpointRequestId, ...);
}
```

PROBLEM: outcomeIsFailure only marks checkpoint terminal state.
DOES NOT update Plan object (checkpointStore.setPlan) with new status.

NEXT TURN FLOW:
1. User sends new message
2. engine.ts:906 — derivePlanState(checkpointStore, sessionId)
3. checkpoint.ts:434 — getPlan(sessionId) returns OLD plan (status still 'running')
4. plan-state.ts:37-48 — Derive planState from old Plan
5. isGuardActive() returns TRUE (because status='running')
6. admission gate: existingPlan = checkpointStore.getPlan(sessionId)
7. assignedPlanId = existingPlan.id (REUSE OLD PLAN)
8. Model context re-injected with same stalled Plan
9. Same loop repeats → E3 fires again

CYCLE:
```
Turn 1: No tool → E3 fires → Plan.status = 'running' (NOT updated)
Turn 2: Plan re-injected → No tool → E3 fires → Plan.status = 'running'
Turn 3: Plan re-injected → blocked again
...
Until user asks /new or Plan is manually cancelled
```

════════════════════════════════════════════════════════════════
5. ONE BUG OR MULTIPLE?
════════════════════════════════════════════════════════════════

ANSWER: TWO INTERACTING BUGS

BUG A: E3 Definition is overly restrictive
────────────────────────────────────
- File: agent.ts:741-750
- Issue: stallCount incremented if "no toolCalls" REGARDLESS of task type
- Should: Distinguish between "text-generative task" vs "tool-dependent task"
- Impact: Knowledge synthesis tasks incorrectly flagged as stalled

BUG B: E3 doesn't update Plan.status
──────────────────────────────────────
- File: agent.ts:759-765 (returns E3 error WITHOUT updating Plan)
- Also affects: engine.ts:1157-1162 (marks checkpoint failed but not Plan)
- Issue: Plan remains 'running' even after E3 terminates execution
- Should: Set Plan.status = 'failed' or 'aborted' when E3 fires
- Impact: Next turn re-injects same stalled Plan → blocked indefinitely

INTERACTION:
```
Bug A: "No tool" treated as "stalled" ← triggers E3 prematurely
       ↓
Bug B: Plan not updated ← E3 error not terminal
       ↓
       Next turn sees active Plan ← reuses it
       ↓
       Same task re-executed ← same bug triggers
       ↓
       Blocked loop
```

════════════════════════════════════════════════════════════════
6. SMALLEST ARCHITECTURAL BOUNDARY FOR CORRECTION
════════════════════════════════════════════════════════════════

TWO INDEPENDENT FIX POINTS:

OPTION 1: Fix within Agent loop (agent.ts)
────────────────────────────────────────────
Boundary: agent.ts:741-766 (stallCount logic + E3 return)

Changes needed:
1. Line 741: Refine stallCount increment condition
   - Add: Check if Plan items require tools (not knowledge synthesis)
   - OR: Add fallback terminal state check before incrementing
   
2. Line 759-765: Before returning E3 error, update Plan
   - Call: checkpointStore.setPlan(sessionId, {...plan, status: 'failed'})
   - Ensure: Plan persisted with terminal status

File: agent.ts
Lines: 741-750 (definition), 759-765 (E3 return)

OPTION 2: Fix at Plan admission gate (engine.ts)
───────────────────────────────────────────────
Boundary: engine.ts:902-917 (admission gate)

Changes needed:
1. Line 906-907: Before admitting Plan, check if previous checkpoint failed
   - Reject admission if previous checkpoint marked 'failed' + contains E3
   - Force new Plan creation instead of reusing failed Plan

File: engine.ts
Lines: 902-917 (admission gate)

════════════════════════════════════════════════════════════════
MINIMUM FIX SCOPE
════════════════════════════════════════════════════════════════

PONYTAIL approach: Fix Bug B first (smaller boundary)

Bug B fix:
- File: agent.ts
- Lines: 759-765 (E3 return block)
- Change: Add Plan.status update before return
- Size: ~2 lines of code

```
if (stallCount >= MAX_STALL && planIsActive) {
  log.warn(`[Stall] Max stalls (${MAX_STALL}) reached — aborting`);
  
  // ← ADD: Mark Plan as failed
  const plan = this.checkpointStore.getPlan(request.sessionId);
  if (plan) {
    plan.status = 'failed';
    plan.stopReason = `E3 stalled: ${stallCount} consecutive turns without tool execution`;
    this.checkpointStore.setPlan(request.sessionId, plan);
  }
  
  R.state({ event: 'STALL_EXCEEDED', requestId, cycle: toolCallCycles });
  return { ... };
}
```

This alone breaks the blocked loop (Plan no longer re-injected).

Bug A (definition) can be addressed separately if needed.

════════════════════════════════════════════════════════════════
AFFECTED CODE PATHS
════════════════════════════════════════════════════════════════

PRIMARY:
- agent.ts:505-507 — stallCount variable definition
- agent.ts:729 — turnHasAction definition
- agent.ts:741-750 — stallCount increment/reset logic
- agent.ts:753-766 — E3 check + return
- agent.ts:768-789 — Guard injection at stallCount=1,2

SECONDARY:
- engine.ts:902-917 — Admission gate
- engine.ts:1157-1162 — Checkpoint terminal state
- checkpoint.ts:433-435 — getPlan (returns stale Plan)
- checkpoint.ts:416-428 — setPlan (should be called by E3)
- plan-state.ts:36-76 — derivePlanState (re-derives from stale Plan)

════════════════════════════════════════════════════════════════
CONCLUSION
════════════════════════════════════════════════════════════════

ROOT CAUSE: Two bugs interact
- Bug A: E3 treats "no tool calls" as "stalled" (overly restrictive)
- Bug B: E3 doesn't update Plan.status when terminating

BLOCKING ISSUE: Bug B
- User cannot escape loop because Plan remains active
- Next turn re-injects same Plan
- Same E3 fires again

SMALLEST FIX: Update Plan.status in agent.ts:759-765
- 2 lines of code
- Breaks infinite loop
- Allows next turn to proceed with fresh Plan or terminal state

NOT YET DETERMINED:
- Whether "text-only responses" should be valid terminal state
- Whether E3 should distinguish task types (tool-required vs text-generative)
- Phase 3+ enhancement: Better stall detection

════════════════════════════════════════════════════════════════
