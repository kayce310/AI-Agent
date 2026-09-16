CORAL E3/REACT STALL — COMPLETE SYSTEM STATE AUDIT
ONE-TIME FULL INVENTORY
Time: 2026-09-12T02:46:34.614Z
Scope: user request → engine → task → plan → agent → model → tool → evidence → completion → E3 → recovery

════════════════════════════════════════════════════════════════
STAGE 1: USER REQUEST → ENGINE
════════════════════════════════════════════════════════════════

STATE/SIGNAL INVENTORY:

1. EngineRequest.messages
   - Created: engine.ts:782 (from request input)
   - Read: agent.ts:544 (selectRelevantTools), agent.ts:771-784 (guard injection)
   - Timing: Available entire cycle, persists in requestContext
   - Persistent: YES (per-request)
   - Semantics: History of conversation, includes model outputs + user inputs + guard messages
   - E3 use: CAN REUSE — contains claims model made ("I will use...")
   - But: Requires NLP parsing to extract intent (risky, not reliable)

2. EngineRequest.task / request.currentGoal
   - Created: engine.ts:891 (derived from messages)
   - Read: agent.ts:798, 572 (prompt building)
   - Timing: Available entire cycle
   - Persistent: YES (per-request)
   - Semantics: User's stated goal/task
   - E3 use: CAN REUSE — contextualizes what task is asking for
   - But: Doesn't distinguish "tool-required" from "text-valid"

════════════════════════════════════════════════════════════════
STAGE 2: TASK/PLAN ADMISSION
════════════════════════════════════════════════════════════════

STATE/SIGNAL INVENTORY:

1. PlanState (discriminated union)
   - Created: plan-state.ts:36 (derivePlanState, line 735)
   - Read: agent.ts:735, 796, 849, 1087, 1138, 1193
   - Timing: Re-derived each cycle
   - Persistent: NO (ephemeral, re-derived from checkpoint)
   - Semantics: {kind: 'none'|'planning'|'executing'|'completed'|'failed'|'aborted', planId?, activeItemIndex?}
   - E3 use: CAN REUSE — isGuardActive(state) tells if plan active
   - But: Doesn't tell if item REQUIRES tools vs text-valid

2. assignedPlanId
   - Created: engine.ts:913 (Phase 2 admission gate)
   - Read: engine.ts:923 (to fetch activePlan)
   - Timing: Early in request, used to get Plan
   - Persistent: NO (ephemeral)
   - Semantics: Whether new task admitted to existing Plan
   - E3 use: NOT RELEVANT — E3 fires during execution, admission already decided

════════════════════════════════════════════════════════════════
STAGE 3: PLAN/PLANITEM STATE
════════════════════════════════════════════════════════════════

STATE/SIGNAL INVENTORY:

1. Plan.status
   - Created: plan creation (update_plan tool)
   - Read: agent.ts:735 (derivePlanState), agent.ts:1238 (stagnation check)
   - Timing: Available entire cycle, persisted in checkpoint
   - Persistent: YES (checkpoint persisted)
   - Semantics: 'pending'|'running'|'completed'|'failed'|'aborted'|'stuck'|'paused_limit'|'waiting_user'
   - E3 use: CAN REUSE — e.g., plan.status !== 'stuck' prevents double-mark
   - But: Doesn't distinguish "needs tool" from "text-valid"

2. Plan.items[].status
   - Created: plan creation
   - Read: agent.ts:1240-1244 (stagnation: check if completed)
   - Timing: Available entire cycle
   - Persistent: YES
   - Semantics: 'pending'|'in_progress'|'awaiting_verification'|'completed'|'skipped'|'failed'|'escalated'
   - E3 use: CAN REUSE — current item status shows execution state
   - But: 'in_progress' just means started, not executing tools specifically

3. Plan.items[].criteria (AcceptanceCriterion[])
   - Created: plan creation by planner
   - Read: protocol-manager.ts:38 (evaluateItem), agent.ts line NOT ACCESSED FOR E3 CHECK
   - Timing: Available at cycle start
   - Persistent: YES
   - Semantics: {mechanism: 'runtime'|'llm', required, evaluatorId?, ...}
   - E3 use: CANNOT REUSE — E3 checks at line 753, criteria evaluation happens AFTER tool execution
   - Timing issue: Criteria checked by protocol-manager AFTER completion, E3 fires DURING execution

4. Plan.currentItemIndex
   - Created: plan creation, updated by advancePlan
   - Read: agent.ts:1240 (stagnation tracker)
   - Timing: Available entire cycle
   - Persistent: YES
   - Semantics: Index of active item in plan
   - E3 use: CAN REUSE — can get currentItem = plan.items[currentItemIndex]
   - But: Doesn't tell what item requires

════════════════════════════════════════════════════════════════
STAGE 4: AGENT LOOP / REACT STATE TRANSITIONS
════════════════════════════════════════════════════════════════

STATE/SIGNAL INVENTORY:

1. toolCallCycles (loop counter)
   - Created: agent.ts:505 (let toolCallCycles = 0)
   - Read: agent.ts:523 (while condition), line 526, 742, 743, 753, etc.
   - Timing: Available entire loop
   - Persistent: NO (ephemeral, resets per request)
   - Semantics: Count of ReAct loop iterations
   - E3 use: CAN REUSE — already used in stallCount comparison
   - But: Time-based, not progress-based

2. stallCount (E3 counter)
   - Created: agent.ts:505 (let stallCount = 0)
   - Read: agent.ts:742, 753, 768, 779
   - Timing: Available during E3 check
   - Persistent: NO (ephemeral, resets per request)
   - Semantics: Count of consecutive turns without toolCalls
   - E3 use: ALREADY USING — this is the E3 metric
   - But: Proxy metric, not real progress indicator

3. messages[] (prompt history)
   - Created: engine.ts:819 (cycleMessages built from messages)
   - Read: agent.ts:544 (building prompt), agent.ts:771 (guard injection)
   - Timing: Grows each cycle as responses added
   - Persistent: NO (per-request array, reset per request)
   - Semantics: Full conversation + guard messages
   - E3 use: CAN REUSE — can parse to detect "I will use tool" claims
   - But: Requires NLP, prone to false positives

════════════════════════════════════════════════════════════════
STAGE 5: MODEL REQUEST/RESPONSE
════════════════════════════════════════════════════════════════

STATE/SIGNAL INVENTORY:

1. modelResult.toolCalls
   - Created: agent.ts:603 (from model invocation)
   - Read: agent.ts:729 (turnHasAction = toolCalls?.length > 0)
   - Timing: Available at model response parsing, BEFORE tool execution
   - Persistent: NO (ephemeral, per-cycle)
   - Semantics: Array of tool call objects from model output (or empty)
   - E3 use: ALREADY USING — this is what E3 checks (toolCalls.length)
   - Problem: Doesn't prove intent vs execution

2. modelResult.finishReason
   - Created: agent.ts:603 (from provider response)
   - Read: agent.ts:672, 843, etc. (routing logic)
   - Timing: Available at model response
   - Persistent: NO (per-cycle)
   - Semantics: 'stop' (text), 'tool_calls' (model called tools), 'length' (truncated), 'error'
   - E3 use: CAN REUSE — if finishReason='stop' AND toolCalls=[] → text-only response
   - But: Doesn't distinguish "planned text" from "stalled planning"

3. modelResult.content
   - Created: agent.ts:603 (model text response)
   - Read: agent.ts:674 (FINAL_ANSWER classification), agent.ts:800 (goal drift check)
   - Timing: Available if finishReason='stop'
   - Persistent: NO (per-cycle)
   - Semantics: Text response from model
   - E3 use: CAN REUSE — can analyze semantic content
   - But: Requires NLP/semantic analysis (not implemented)

4. modelResult.reasoningContent
   - Created: agent.ts:603 (reasoning from streaming)
   - Read: agent.ts:524 (hook), agent.ts:667 (emitted)
   - Timing: Available during/after model call
   - Persistent: NO (transient)
   - Semantics: Model's thinking/reasoning
   - E3 use: CANNOT REUSE — reasoning doesn't prove execution

════════════════════════════════════════════════════════════════
STAGE 6: TOOL EXECUTION
════════════════════════════════════════════════════════════════

STATE/SIGNAL INVENTORY:

1. executedToolCalls
   - Created: agent.ts:1100+ (after tool execution)
   - Read: agent.ts:1200 (mapped to progressEvidence)
   - Timing: Available AFTER tool execution, NOT at E3 check
   - Persistent: NO (ephemeral, per-cycle)
   - Semantics: Array of actual executed tool calls with results
   - E3 use: CANNOT REUSE — created AFTER E3 check (line 753)
   - Timing: This is the fatal issue: E3 fires before this exists

2. toolCallSnapshot (checkpoint evidence)
   - Created: checkpoint.ts (tool call recorded)
   - Read: checkpoint.ts (stored in CycleData)
   - Timing: Available after tool execution + checkpoint
   - Persistent: YES (checkpoint persisted)
   - Semantics: Evidence of tool call execution
   - E3 use: CANNOT REUSE — available AFTER E3 check

════════════════════════════════════════════════════════════════
STAGE 7: EVIDENCE / PROGRESS MONITORING
════════════════════════════════════════════════════════════════

STATE/SIGNAL INVENTORY:

1. progressSignal
   - Created: progress-monitor.ts:96-111 (classifyProgress)
   - Computed: agent.ts:1207 (progressTracker.evaluate)
   - Timing: Available AFTER tool execution
   - Persistent: NO (per-cycle, stored in latestProgressResult only)
   - Semantics: 'PROGRESS' (plan transition OR novel evidence) | 'NO_PROGRESS'
   - E3 use: CANNOT REUSE — created AFTER E3 fires
   - Timing issue: latestProgressResult available in E3 is from PREVIOUS cycle

2. latestProgressResult (from previous cycle)
   - Created: agent.ts:1213 (assigned from progressResult)
   - Read: agent.ts:1253, 1257 (in stagnation tracking)
   - Timing: At E3 check, contains PREVIOUS cycle's signal
   - Persistent: NO (per-run, overwritten each cycle)
   - Semantics: Previous cycle's progress signal
   - E3 use: CANNOT REUSE — doesn't reflect current cycle

3. observedNovelEvidence
   - Created: progress-monitor.ts:216-226 (fingerprint tracking)
   - Read: agent.ts:1222 (in progress event)
   - Timing: Available AFTER tool execution
   - Persistent: NO
   - Semantics: True if tool call signature NOT seen before in run
   - E3 use: CANNOT REUSE — timing issue

4. observedPlanTransition
   - Created: agent.ts:1193-1198 (detect planState change)
   - Read: agent.ts:1210 (passed to progress tracker)
   - Timing: Available AFTER tool execution
   - Persistent: NO
   - Semantics: True if plan state changed between cycles
   - E3 use: CANNOT REUSE — timing issue

════════════════════════════════════════════════════════════════
STAGE 8: STAGNATION / COMPLETION PROTOCOL v1.2
════════════════════════════════════════════════════════════════

STATE/SIGNAL INVENTORY:

1. consecutiveFailedAttempts (per item)
   - Created: agent.ts:1270 (incremented)
   - Read: agent.ts:1272 (STAGNATION_THRESHOLD check)
   - Timing: Available after tool execution for stagnation tracking
   - Persistent: YES (stored in plan.items[].consecutiveFailedAttempts)
   - Semantics: Count of attempts on current item without progress
   - E3 use: CANNOT REUSE — different semantic (item-level vs plan-level)
   - Scope: Stagnation tracker already handles multi-attempt detection

2. canAutoComplete
   - Created: protocol-manager.ts:83 (completionEligibility.canAutoComplete)
   - Read: protocol-manager.ts:90 (applyPureRuntimeCompletion)
   - Timing: Available AFTER protocol evaluation (after tool execution)
   - Persistent: NO (computed per item)
   - Semantics: Item can complete without LLM verification (runtime criteria only)
   - E3 use: CANNOT REUSE — timing issue
   - Semantic: Doesn't tell if item REQUIRES tool vs happens to not need verification

3. hasSemanticCriteria
   - Created: protocol-manager.ts:84 (completionEligibility.hasSemanticCriteria)
   - Read: protocol-manager.ts:90 (gate applyPureRuntimeCompletion)
   - Timing: Available AFTER protocol evaluation
   - Persistent: NO
   - Semantics: Item has LLM-verified criteria (requires IndependentVerifier)
   - E3 use: CANNOT REUSE — timing issue

4. CriterionEvaluation.outcome
   - Created: protocol-manager.ts:73-74 (from evaluator)
   - Read: protocol-manager.ts:75 (checking if pass/fail)
   - Timing: Available AFTER evaluator execution
   - Persistent: NO (per evaluation)
   - Semantics: 'pending'|'pass'|'fail'|'inconclusive'
   - E3 use: CANNOT REUSE — timing issue

════════════════════════════════════════════════════════════════
STAGE 9: GUARDS / EXPLICIT GUARDS
════════════════════════════════════════════════════════════════

STATE/SIGNAL INVENTORY:

1. Guard at stallCount=1
   - Trigger: agent.ts:768 (stallCount === 1 && planIsActive)
   - Action: Inject message (line 771) + set toolChoice='required' (line 773)
   - Timing: Early guard, runs in same cycle
   - Persistent: NO (message stored in messages[] array)
   - Semantics: "You created plan but didn't execute. Call tool NOW."
   - E3 use: NOT GUARD DATA — guard itself, not observable state
   - Issue: Assumes all plans need tools

2. Guard at stallCount=2
   - Trigger: agent.ts:779 (stallCount === 2)
   - Action: Reinforce toolChoice (line 781) + stronger message
   - Timing: Later guard
   - Persistent: NO
   - Semantics: "Second time: no text, only tools. Go now."
   - E3 use: NOT GUARD DATA — guard itself
   - Issue: Still assumes all plans need tools

════════════════════════════════════════════════════════════════
STAGE 10: E3 CHECK POINT
════════════════════════════════════════════════════════════════

STATE/SIGNAL AVAILABLE AT E3 CHECK (agent.ts:753):

✅ AVAILABLE:
- stallCount (current value)
- planIsActive (derived PlanState)
- plan.status (not 'stuck' etc.)
- plan.items[currentItemIndex] (current PlanItem)
- modelResult (from current cycle)
- modelResult.toolCalls (length === 0)
- modelResult.finishReason
- messages[] (conversation history with claims)
- toolCallCycles
- Request context (task, goal, user message)
- latestProgressResult (from PREVIOUS cycle only)

❌ NOT AVAILABLE:
- executedToolCalls (not populated yet)
- progressSignal (not computed yet)
- Tool execution results (not executed yet)
- completion protocol evaluation (not run yet)
- Evidence of "what model actually did"
- Stagnation counter for current item (updated after this check)

════════════════════════════════════════════════════════════════
STAGE 11: CHECKPOINT / RECOVERY STATE
════════════════════════════════════════════════════════════════

STATE/SIGNAL INVENTORY:

1. checkpoint.status
   - Created: checkpoint.ts:268 (marked 'in_progress')
   - Updated: checkpoint.ts:378 (marked 'failed' on error)
   - Timing: Persisted throughout execution
   - Persistent: YES (disk persisted)
   - Semantics: 'started'|'in_progress'|'completed'|'failed'
   - E3 use: CANNOT REUSE FOR CURRENT CYCLE — updated AFTER E3 fires
   - But: CAN check if previous checkpoint failed (recovery)

2. Recovery state (after crash)
   - Created: engine.ts:333 (getAllInProgress)
   - Read: engine.ts:335-351 (markRecovered)
   - Timing: Only on restart
   - Persistent: YES
   - Semantics: Previously in-progress tasks marked as recovered
   - E3 use: NOT RELEVANT — E3 fires during execution, recovery happens on restart

════════════════════════════════════════════════════════════════
CLASSIFICATION: CAN vs CANNOT REUSE FOR E3
════════════════════════════════════════════════════════════════

1. CAN REUSE FOR E3:
   - stallCount (already using)
   - planIsActive (already using)
   - plan.status !== 'stuck' (can prevent double-mark)
   - modelResult.toolCalls.length (already using)
   - modelResult.finishReason (can distinguish stop vs tool_calls)
   - messages[] (can parse for intent, but risky)
   - plan.items[currentItemIndex].status (shows current item active)

2. CANNOT REUSE — TIMING:
   - executedToolCalls (created after E3 check)
   - progressSignal (computed after E3 check)
   - latestProgressResult (only from previous cycle)
   - Tool execution results
   - Evidence of actual execution
   - Stagnation counters for current item
   - Completion protocol evaluation

3. CANNOT REUSE — SEMANTICS:
   - criterion.mechanism (doesn't mean "requires tool")
   - criterion.required (doesn't distinguish task type)
   - canAutoComplete (doesn't mean "text-valid")
   - hasSemanticCriteria (doesn't mean "must use tools")
   - plan.items[].status='in_progress' (just means started)

4. CANNOT REUSE — INSUFFICIENT INFORMATION:
   - No explicit "task requires external data" marker
   - No explicit "model claimed action X" extraction
   - No explicit "model executed action X" tracking
   - No link between claims and execution
   - No "legitimate text completion" marker

5. MISSING ABSTRACTIONS:
   - MISSING: "Item execution intent" — tool-required vs text-valid
   - MISSING: "Model action claim" — explicit representation of "I will do X"
   - MISSING: "Model action execution" — explicit tracking that "I did X"
   - MISSING: "Task completion criterion" — at request time, not item level
   - MISSING: "Task-item scope matching" — which item matches current execution

════════════════════════════════════════════════════════════════
FINAL ANSWERS TO 4 QUESTIONS
════════════════════════════════════════════════════════════════

Q1: E3 CURRENTLY OBSERVES:
- Model said it will call tool (modelResult.toolCalls.length > 0)
- Plan exists and is active (planIsActive)
- N consecutive cycles without tool calls (stallCount)
- Response type (finishReason)
- Plan + item status (basic state)

E3 DOES NOT OBSERVE:
- What model actually executed
- Whether execution reflects claimed intent
- What task actually requires (tool vs text)
- Whether task is genuinely progressing
- Whether item has legitimate text-only completion path

Q2: DISTINGUISH 4 FAILURE MODES?
- tool-required stall: ❌ NO (can't tell task requires tool)
- legitimate text-only progress: ❌ NO (can't distinguish from stall)
- genuine completion: ❌ NO (completion happens after E3)
- model merely describing action: ❌ NO (no action execution tracking)

VERDICT: System lacks signals to distinguish these at E3 check time.

Q3: MISSING ABSTRACTIONS:
1. **Item execution intent** (LAYER: PlanItem metadata)
   - Should mark: "this item requires external action" vs "text analysis is valid completion"
   - Currently: criterion.mechanism misused (semantics mismatch)
   - Should be: task_execution_mode: 'tool_required' | 'text_valid' | 'runtime_evaluable'

2. **Model intent vs action tracking** (LAYER: Agent execution)
   - Should distinguish: model claimed X vs model executed X
   - Currently: no explicit representation
   - Should be: claim tracked before execution, compared after execution

3. **Task completion criterion at request time** (LAYER: Task/Request)
   - Should specify: what counts as done for this task
   - Currently: only item-level criteria
   - Should be: task-level completion target ("return text analysis" vs "fetch data")

4. **Execution evidence at claim time** (LAYER: Model response)
   - Should track: what model claimed it would do
   - Currently: only toolCalls array (what it said)
   - Should be: explicit representation of action intent

Q4: SHOULD E3 CHANGE?
- Current E3 problem: Uses proxy metric (toolCalls.length) pre-execution
- Root cause: Timing—E3 runs before execution evidence available
- Solution layer: NOT in E3 itself
- Real solution needed: 
  * Move progress check AFTER tool execution (requires architecture change)
  * OR add missing abstractions at task/item level to distinguish task types
  * OR parse model intent from messages (risky, NLP-based)

E3 itself is correctly placed (catch runaway loops early).
The problem is: system lacks signal to distinguish "looping stall" from "legitimate text progression".

════════════════════════════════════════════════════════════════
FINAL SYSTEM VERDICT
════════════════════════════════════════════════════════════════

EVIDENCE SUFFICIENCY: ❌ INSUFFICIENT to design E3 fix without architectural change

ROOT CAUSE CONFIRMED:
1. E3 fires BEFORE tool execution evidence available
2. System has no "task execution intent" marker
3. No explicit model action claim vs execution tracking
4. Current signals insufficient to distinguish stall from legitimate text progress

EVIDENCE BLOCKING FIX DESIGN:
- Cannot distinguish "model looping in planning" from "model correctly synthesizing text"
- Cannot detect "model claimed tool but didn't execute" without NLP parsing messages
- Cannot mark "task requires tool" without new field in PlanItem/Task
- Current abstraction gap: no layer distinguishes task types

ONLY PATH FORWARD: Add missing abstraction layer
- Must happen at: Task/Request or PlanItem level (before execution)
- Must represent: "this task requires external data" vs "text analysis completes it"
- Current criterion.mechanism insufficient (wrong semantics)
- Implementation not yet designed (pending abstraction spec)

════════════════════════════════════════════════════════════════
OPEN QUESTIONS (SOLE REMAINING ISSUES)
════════════════════════════════════════════════════════════════

1. WHO DETERMINES TASK TYPE? (tool-required vs text-valid)
   - User? ("fetch latest news" vs "explain concept")
   - Planner? (create_plan should specify intent)
   - Task classifier? (NLP on request text—risky)

2. WHERE SHOULD TASK TYPE BE STORED?
   - Request/Task level? (user determines upfront)
   - PlanItem level? (planner determines per item)
   - Separate TaskExecutionMode? (new abstraction)

3. WHAT SHOULD MODEL CLAIM TRACKING LOOK LIKE?
   - Parse messages for intent? (NLP-based—not reliable)
   - Add explicit field to response? (model structured output)
   - Infer from toolCalls? (already doing)

4. SHOULD E3 CHANGE AT ALL?
   - Current E3 design may be correct (catch loops early)
   - Real fix: distinguish task types + mark plan state on E3 error (already identified Bug 1)
   - No need to change E3 logic if task type is known upfront

════════════════════════════════════════════════════════════════

STATUS: AUDIT COMPLETE. READY FOR NEXT DECISION GATE.

════════════════════════════════════════════════════════════════
