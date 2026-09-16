E3 STALL BUG — DEEP INVESTIGATION (5 Questions)
Evidence-based forensic analysis
Time: 2026-09-11

════════════════════════════════════════════════════════════════
Q1: E3 DESIGNED TO DETECT "NO PROGRESS" OR "NO TOOL CALL"?
════════════════════════════════════════════════════════════════

ANSWER: E3 designed to detect "NO TOOL CALL" — NOT "NO PROGRESS"

EVIDENCE:

agent.ts:729 — E3 definition:
```
const turnHasAction = (modelResult.toolCalls?.length > 0) || false;
```

ONLY condition: toolCalls.length > 0

agent.ts:741-750 — stallCount logic:
```
if (!turnHasAction && planIsActive) {
  stallCount++;
  log.warn(`[Stall] stallCount=${stallCount}/${MAX_STALL}`);
} else {
  stallCount = 0;
}
```

CRITICAL: NO reference to "progress" semantics.
E3 does NOT call progressTracker.evaluate() or check progressSignal.

COMPARISON WITH ACTUAL PROGRESS MONITOR:

progress-monitor.ts:96-111 — classifyProgress():
```
export function classifyProgress(observation: ProgressObservation): ProgressSignal {
  if (observation.observedPlanTransition) {
    return { type: 'PROGRESS', reason: 'plan_transition_observed' };
  }
  if (observation.observedNovelEvidence) {
    return { type: 'PROGRESS', reason: 'novel_evidence:...' };
  }
  return { type: 'NO_PROGRESS', reason: 'no_transition_and_no_novel_evidence' };
}
```

PROGRESS = plan transition OR novel evidence
(Not just "tool call")

STAGNATION TRACKING (agent.ts:1253-1260) uses progressSignal:
```
if (progressSignal?.type === 'PROGRESS') {
  currentItem.consecutiveFailedAttempts = 0;
  log.info(`[Stagnation] Progress signal observed → counter reset`);
}
```

FINDING:
- ✅ progressTracker exists (agent.ts:460)
- ✅ progressSignal computed (agent.ts:1207-1225)
- ✅ Used for stagnation tracking (agent.ts:1253-1260)
- ❌ E3 does NOT use progressSignal
- ❌ E3 only checks turnHasAction (toolCalls.length)
- ❌ E3 is DECOUPLED from progress semantics

CONCLUSION Q1:
E3 designed to detect "NO TOOL CALL" only.
NOT designed to detect "NO PROGRESS".
Actual progress monitoring exists in stagnation tracker but E3 ignores it.

════════════════════════════════════════════════════════════════
Q2: VALID TASKS THAT COMPLETE VIA TEXT WITHOUT TOOLS?
════════════════════════════════════════════════════════════════

ANSWER: ✅ YES — multiple valid task types

EVIDENCE FROM AGENT REGISTRY:

agent-registry.ts:75-83 — "Knowledge Synthesis" agent:
```
{
  name: 'knowledge_synthesis',
  goal: 'Tổng hợp thông tin từ multiple sources thành báo cáo hoàn chỉnh',
  allowedTools: ['read_file', 'search_knowledge_graph', 
    'generate_report', 'write_wiki_page', 'session_search']
}
```

Task "cấu trúc harness của JARVIS, toàn diện các khía cạnh":
- Type: Knowledge synthesis (tổng hợp)
- May use tools (read_file, search_knowledge_graph) OR
- May generate answer from training data WITHOUT tools

VALID TEXT-ONLY COMPLETION:
1. Synthesis tasks
   - Summarize multiple concepts
   - Explain architecture
   - Create reports from memory

2. Analysis tasks
   - Discuss design patterns
   - Explain principles
   - Compare approaches

3. Chat tasks
   - Greetings: "chào Coral" → "Chào bạn!"
   - Clarifications: "Bạn là ai?" → text answer
   - General questions with LLM knowledge

EVIDENCE FOR TEXT VALIDITY:

prompt-builder.ts:75-102 — ADR compliance:
```
### 0. ADR COMPLIANCE — STATE-RELATED TASK (HARD RULE)
...
- Chỉ tải đúng skill/knowledge cần dùng cho task hiện tại.
```

Agent can perform knowledge synthesis WITHOUT tools:
- Training data contains architecture knowledge
- Model can compose answer directly
- No external tools required for complete response

COUNTER-EVIDENCE (Why E3 exists):

agent.ts:769-774 — Guard at stallCount=1:
```
const msg = '[GUARD] Bạn đã tạo plan nhưng chưa thực thi. 
Không mô tả plan bằng văn bản. Gọi NGAY tool để thực thi item hiện tại.';
```

ASSUMPTION: Plan active → must execute tools to complete items

PROBLEM: Not all Plan items require tools.
Some items are "research & summarize" (can be text).
Others are "read file X" (MUST call tool).

CONCLUSION Q2:
✅ YES, valid tasks exist that can complete via text:
  - Knowledge synthesis
  - Architecture analysis
  - Concept explanation
  - General discussion
❌ BUT E3 forbids them if Plan is active
❌ E3 assumes all Plan execution needs tools

════════════════════════════════════════════════════════════════
Q3: TRACE TASK "JARVIS HARNESS" FLOW COMPLETE
════════════════════════════════════════════════════════════════

INPUT: "cấu trúc harness của JARVIS, toàn diện các khía cạnh"

CYCLE 1 — PLAN CREATION
─────────────────────────

engine.ts:906 — derivePlanState(checkpointStore, sessionId)
  → planState = { kind: 'none' } (no existing plan)
  → planIsActive = false

agent.ts:523-523 — while loop starts
  toolCallCycles = 0

agent.ts:545-552 — selectRelevantTools("cấu trúc harness...")
  → Matches: search_knowledge_graph, read_file, web_search (if selected)
  
agent.ts:603-645 — Model invoke
  Prompt includes: "Bạn cần tạo plan cho task này"
  Model response (expected):
    - Creates plan with items (e.g., "Research JARVIS architecture", "Synthesize findings")
    - toolCalls = [{ name: 'create_plan', args: {...} }]

agent.ts:1095+ — Process create_plan tool call
  → checkpointStore.setPlan(sessionId, newPlan)
  → newPlan.status = 'running'
  → newPlan.items[0].status = 'pending' (first item)

CYCLE 1 END:
- turnHasAction = true (create_plan called)
- stallCount = 0 (reset)
- planIsActive = true (Plan now exists, status='running')
- finalContent: Plan description or partial answer
- finished = false (continue loop)

CYCLE 2 — FIRST EXECUTION ATTEMPT
──────────────────────────────────

agent.ts:735-736 — planState re-derived
  → planState = { kind: 'executing', planId: ... }
  → planIsActive = true

agent.ts:545-552 — selectRelevantTools("...")
  → Same tools available

agent.ts:603-645 — Model invoke
  Prompt includes: "Thực hiện item 0: Research JARVIS architecture"
  Guard message (stallCount=0): none yet
  
Model response (CRITICAL CHOICE):
  OPTION A: Calls tool (search_knowledge_graph, read_file)
    → toolCalls.length > 0
    → turnHasAction = true
    → stallCount = 0
    
  OPTION B: Text response only (no tool call)
    → finishReason = 'stop', content = "...", toolCalls = []
    → turnHasAction = false
    → stallCount++ → stallCount = 1
    
FOR THIS TASK: Model chooses OPTION B (text synthesis preferred)
  Reason: Can answer from training data; tool call not necessary
  Result: stallCount = 1

CYCLE 2 END:
- turnHasAction = false (no tool call)
- stallCount = 1
- planIsActive = true
- finished = false (continue)
- Agent continues loop

CYCLE 3 — SECOND ATTEMPT (GUARD INJECTED)
──────────────────────────────────────────

agent.ts:768-777 — stallCount=1 guard:
```
if (stallCount === 1 && planIsActive) {
  const msg = '[GUARD] Bạn đã tạo plan nhưng chưa thực thi...';
  messages.push({ role: 'system', content: msg });
  modelOptions.toolChoice = 'required';
  toolCallCycles++; continue;
}
```

GUARD INJECTED: "Gọi NGAY tool để thực thi"
toolChoice = 'required' (force tool call)

agent.ts:603-645 — Model invoke
  With toolChoice='required' and guard message
  Model must return tool call (provider enforces)
  
Model response (forced):
  - Generates tool call (even if suboptimal)
  - toolCalls.length > 0
  - turnHasAction = true
  - stallCount = 0 (reset)

CYCLE 3 END:
- turnHasAction = true
- stallCount = 0
- Tool executed

CYCLE 4+ — NORMAL EXECUTION
──────────────────────────────

If task completes quickly: finished=true, exit loop

If task doesn't converge: stallCount may increment again in later cycles

SCENARIO: IF MODEL CHOOSES TEXT 3 TIMES
─────────────────────────────────────────

Hypothetical: Model ignores guards or provider doesn't enforce toolChoice

Cycle 2: stallCount = 1 (no tool)
Cycle 3: Guard injected, toolChoice='required' — assume provider fails/ignores
         stallCount = 2 (no tool again)
         
agent.ts:779-789 — stallCount=2 guard:
```
if (stallCount === 2 && planIsActive) {
  modelOptions.toolChoice = 'required';
  messages.push('[GUARD] Lần thứ hai: bạn KHÔNG được trả lời bằng text...');
  toolCallCycles++; continue;
}
```

Guard enforced again, continue loop

Cycle 4: stallCount = 3 (no tool AGAIN)
         
agent.ts:753-766 — E3 FIRES:
```
if (stallCount >= MAX_STALL && planIsActive) {
  return {
    content: `[E3] ❌ Agent stalled after plan creation...`,
    finished: true,
  };
}
```

E3 ERROR RETURNED ← THIS IS THE BUG

ACTUAL FLOW FOR "JARVIS HARNESS":
─────────────────────────────────

Test showed:
- Cycle 1: Create plan (tool call) → stallCount=0
- Cycle 2: Text synthesis attempt → stallCount=1
- Cycle 3: Guard + forced tool call → stallCount=0
- Cycles 4+: Complete task or E3 if loops again

BUT if provider toolChoice doesn't work or Model keeps choosing text:
- Cycle 2: stallCount=1
- Cycle 3: stallCount=2
- Cycle 4: stallCount=3 → E3 FIRES

THEN SUBSEQUENT TURNS:
- engine.ts:906 — derivePlanState() still returns 'executing'
- Plan.status still 'running' (NOT updated to 'failed')
- admission gate reuses Plan
- Same task re-attempted with E3 error response
- BLOCKED LOOP

════════════════════════════════════════════════════════════════
Q4a: BUG A — E3 DEFINITION PROGRESS INCORRECT?
════════════════════════════════════════════════════════════════

ANSWER: ✅ YES — Bug A is ROOT CAUSE of false positives

EVIDENCE:

E3 Definition (agent.ts:729, 741-750):
```
turnHasAction = (modelResult.toolCalls?.length > 0) || false;
if (!turnHasAction && planIsActive) {
  stallCount++;
}
```

WHAT E3 MEASURES:
- ✅ Detects: "No tool call issued"
- ❌ Does NOT measure: "No progress" (concept)
- ❌ Does NOT measure: "Plan item completed"
- ❌ Does NOT measure: "Novel evidence"

WHAT E3 SHOULD MEASURE (if called "progress"):
- ✅ Plan item completed (tool call + success)
- ✅ Plan transition (to next item)
- ✅ Model generated novel information
- ✅ Evidence collected

COMPARISON WITH ACTUAL PROGRESS MONITOR:

progress-monitor.ts:96-111:
```
PROGRESS ← (observedPlanTransition) OR (observedNovelEvidence)
NO_PROGRESS ← (no transition AND no novel evidence)
```

agent.ts:1253-1260 — Stagnation tracker uses this:
```
if (progressSignal?.type === 'PROGRESS') {
  counter = 0; ← RESET only on actual progress
}
```

FINDING:
- Actual progress = plan transition OR novel evidence
- E3 progress = tool call
- These are NOT the same
- Example: Text synthesis generates novel evidence but NO tool call
  → Real progress monitor: PROGRESS
  → E3: NO_PROGRESS (stalled)

BUG A: E3 uses proxy metric (tool call) instead of actual metric (progress)

════════════════════════════════════════════════════════════════
Q4b: BUG B — PLAN NOT TERMINAL, CAUSES BLOCKED LOOP?
════════════════════════════════════════════════════════════════

ANSWER: ✅ YES — Bug B is ROOT CAUSE of blocked loop

EVIDENCE:

When E3 fires (agent.ts:759-765):
```
if (stallCount >= MAX_STALL && planIsActive) {
  return {
    content: `[E3] ❌ Agent stalled...`,
    finished: true,
  };
}
```

agent.ts: Does NOT call checkpointStore.setPlan() with status='failed'

engine.ts:1149-1162 — After agent returns:
```
const outcomeIsFailure = isFailureOutcome(result.content);
if (outcomeIsFailure) {
  this.checkpointStore.failed(checkpointRequestId, {...});
}
```

checkpointStore.failed() MARKS CHECKPOINT as 'failed'
But does NOT update Plan object status

NEXT TURN (user sends new message):

engine.ts:906 — derivePlanState(checkpointStore, sessionId)
  → checkpoint.ts:434 — getPlan(sessionId)
  → Returns: Plan with status='running' (UNCHANGED)
  → planState = { kind: 'executing' }
  → isGuardActive() = true

engine.ts:902-917 — Admission gate
  → existingPlan = getPlan(sessionId) → Plan with status='running'
  → assignedPlanId = existingPlan.id (REUSE)
  → activePlan context injected

RESULT: Same stalled Plan re-injected
→ Same E3 fires again
→ BLOCKED

VERIFICATION:

checkpoint.ts:416-428 — setPlan() implementation:
```
setPlan(sessionId: string, plan: TaskPlan): void {
  this.plans.set(sessionId, plan);
  const cpRequestId = this.getActiveTaskForSession(sessionId);
  if (cpRequestId) {
    const snapshot = this.snapshots.get(cpRequestId);
    if (snapshot) {
      snapshot.plan = plan;  // ← Mirrors to snapshot
    }
  }
  this.dirty = true;
}
```

If E3 called setPlan with status='failed', next restart would:
1. Load checkpoint (status='failed')
2. checkpointStore.getPlan() returns Plan with status='failed'
3. planState = { kind: 'failed' }
4. isGuardActive() = false
5. admission gate rejects Plan
6. New Plan created or task terminated

BUT agent.ts does NOT call setPlan on E3 → Bug B

════════════════════════════════════════════════════════════════
Q5: INVARIANT/RECOVERY/COMPLETION CHECK
════════════════════════════════════════════════════════════════

IF FIX: Add setPlan(status='failed') when E3 fires

QUESTION: Does this break any invariants?

INVARIANT 1: Checkpoint terminal state
─────────────────────────────────────
checkpoint.ts:77:
```
status: 'started' | 'in_progress' | 'completed' | 'failed'
```

When E3 fires:
- engine.ts:1157-1162 marks checkpoint.status = 'failed' ✅
- If we add: Plan.status = 'failed' ✅
- Both marked terminal — CONSISTENT

INVARIANT 2: Plan state machine
────────────────────────────────
plan-state.ts:46-48:
```
if (plan.status === 'completed') return { kind: 'completed' };
if (plan.status === 'failed') return { kind: 'failed' };
if (plan.status === 'aborted') return { kind: 'aborted' };
```

'failed' is valid terminal state ✅
Transition running → failed is valid (validateTransition checks this)

INVARIANT 3: No implicit Plan inheritance
──────────────────────────────────────────
Phase 2 admission gate (engine.ts:902-917):
```
if (existingPlan && isGuardActive(planState)) {
  assignedPlanId = existingPlan.id;
}
```

If Plan.status='failed':
- plan-state.ts returns { kind: 'failed' }
- isGuardActive() = false (doesn't match 'planning' or 'executing')
- assignedPlanId = null (NOT reused) ✅

INVARIANT 4: Recovery on restart
─────────────────────────────────
engine.ts:333-351 — Boot recovery:
```
const recovered = this.checkpointStore.getAllInProgress();
for (const cp of recovered) {
  this.checkpointStore.markRecovered(...);
}
```

If Plan.status='failed' when E3 fires:
- Checkpoint is 'failed' (not 'in_progress')
- getAllInProgress() filters by status='in_progress' only
- Failed checkpoint is NOT re-recovered ✅

INVARIANT 5: Plan completion semantics
───────────────────────────────────────
update-plan-tool.ts:134:
```
if (action === 'complete') {
  plan.status = 'completed';
}
```

Only explicit update_plan(..., action='complete') sets status='completed'
E3 setting status='failed' does NOT confuse completion logic ✅

CRITICAL CHECK: Does Plan.failed block legitimate recovery?
──────────────────────────────────────────────────────────

Scenario: E3 fires incorrectly (text-only task treated as stalled)
User sends: "chào, tiếp tục"

Flow:
1. Plan.status = 'failed' (from E3)
2. derivePlanState() returns { kind: 'failed' }
3. isGuardActive() = false
4. admission gate: assignedPlanId = null
5. NEW Plan created for new request
6. Task can proceed

RESULT: User CAN continue (via new Plan), not stuck forever ✅

CONCLUSION Q5:
✅ Setting Plan.status='failed' on E3 does NOT break invariants
✅ Recovery works correctly
✅ No implicit inheritance re-triggered
✅ Completion semantics preserved
✅ Blocks legitimate recovery (but that's correct — failed Plan should not auto-resume)

════════════════════════════════════════════════════════════════
FINAL VERDICT: BUGS CONFIRMED
════════════════════════════════════════════════════════════════

BUG A: E3 conflates "tool call" with "progress"
  - ROOT CAUSE of false positives
  - Affects: Knowledge synthesis, text analysis, explanation tasks
  - Severity: HIGH (blocks valid workflows)
  - Should: Use actual progress semantics (plan transition OR novel evidence)

BUG B: E3 doesn't update Plan.status to terminal
  - ROOT CAUSE of blocked loop
  - Affects: Any E3 false positive → subsequent turns stuck
  - Severity: CRITICAL (data loss risk: user must create new session)
  - Should: Call checkpointStore.setPlan() with status='failed'

MINIMUM FIX: Add 3 lines in agent.ts:759-765
  Before E3 return, update Plan.status = 'failed'
  Breaks blocked loop
  Allows recovery flow

PHASE 3+ ENHANCEMENT: Use actual progress monitor instead of stallCount
  Replace E3 with classifyProgress(progressSignal)
  Distinguish text-valid tasks from tool-required tasks

════════════════════════════════════════════════════════════════
