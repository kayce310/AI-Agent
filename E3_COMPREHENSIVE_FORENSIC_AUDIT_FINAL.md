CORAL E3/REACTS — COMPREHENSIVE FORENSIC AUDIT REPORT
Time: 2026-09-11T10:20:47.690Z
Scope: Full end-to-end flow E3 → ReAct → Completion Protocol v1.2 → Recovery

════════════════════════════════════════════════════════════════
EXECUTIVE SUMMARY
════════════════════════════════════════════════════════════════

STATUS: TWO CONFIRMED BUGS + ONE DESIGN GAP

Bug 1 (CRITICAL): E3 doesn't update Plan.status to terminal after firing
  - Effect: Next turn re-injects stalled Plan → blocked loop
  - Evidence: agent.ts:759-765 returns [E3] WITHOUT checkpointStore.setPlan()
  - Fix: 3 lines before E3 return

Bug 2 (HIGH): E3 uses toolCalls.length proxy instead of semantic progress
  - Effect: Blocks valid text-synthesis tasks; false-positive on task type mismatch
  - Evidence: agent.ts:729 vs progress-monitor.ts:96-111 (incompatible signals)
  - Mitigation: Combine progressSignal + criterion.mechanism + plan.status

Design Gap (MEDIUM): No explicit task-type classification
  - Effect: System can't distinguish "needs tool" from "text-valid"
  - Evidence: No requiresExternalData field in PlanItem or Task
  - Acceptable: Can be worked around with criterion.mechanism check

════════════════════════════════════════════════════════════════
AUDIT SECTION 1: E3 TRIGGER → COMPLETION FLOW
════════════════════════════════════════════════════════════════

FLOW: Agent loop → model response → turnHasAction → stallCount → E3 check → Plan update → Response

agent.ts lines 523-840:
```
while (toolCallCycles < this.maxToolCycles) {          // line 523
  ...
  modelResult = await this.circuitBreaker.execute(...) // line 603
  
  const turnHasAction = (modelResult.toolCalls?.length > 0) || false;  // line 729
  
  if (!turnHasAction && planIsActive) {
    stallCount++;                                       // line 742
    log.warn(`[Stall] Cycle ... stallCount=${stallCount}...`);
  } else {
    stallCount = 0;                                    // line 748
  }
  
  if (stallCount >= MAX_STALL && planIsActive) {
    return {
      content: `[E3] ❌ Agent stalled...`,             // line 760
      finished: true,
    };                                                 // line 765
  }
  
  if (stallCount === 1 && planIsActive) {
    messages.push('[GUARD] ...');                      // line 771
    modelOptions.toolChoice = 'required';              // line 773
    toolCallCycles++;
    continue;
  }
  
  if (stallCount === 2 && planIsActive) {
    modelOptions.toolChoice = 'required';              // line 781
    messages.push('[GUARD] ...');                      // line 783
    toolCallCycles++;
    continue;
  }
}
```

CONFIRMED: E3 fires at line 759-765 WITHOUT updating Plan.status
CONFIRMED: E3 uses turnHasAction (toolCalls.length) proxy metric

════════════════════════════════════════════════════════════════
AUDIT SECTION 2: STATE/FLAG/COUNTER SCOPE & LIFECYCLE
════════════════════════════════════════════════════════════════

PlanState (plan-state.ts:18-31):
- Derived fresh each cycle from checkpointStore
- NOT persisted in agent.ts; re-derived at lines 735, 796, 849, 1087, 1138, 1193
- VERIFIED: Correct (no stale state)

Plan.status (types.ts:74-84, checkpoint.ts:268):
- Persisted in checkpoint snapshot
- Updated via checkpointStore.setPlan(sessionId, plan)
- Agent doesn't call setPlan() after E3 fires (line 759)
- CONFIRMED BUG: Plan.status remains 'running' after E3, causes re-injection

stallCount (agent.ts:505):
- Local variable, per-request scope
- Incremented line 742, reset line 748, checked line 753
- NOT persisted on crash
- VERIFIED: Correct (ephemeral, matches design intent)

toolCallCycles (agent.ts:523):
- Loop counter, local scope
- Incremented line 775, 787, 1024 (inside continue paths)
- NOT persisted
- VERIFIED: Correct (per-request)

progressSignal (progress-monitor.ts:12-14):
- Computed after tool execution (agent.ts:1207)
- Used in stagnation tracking (agent.ts:1253-1260)
- NOT used in E3 check (agent.ts:741-766)
- CONFIRMED GAP: progressSignal computed but ignored by E3

criterion.mechanism (types.ts:31-42):
- Stored in PlanItem.criteria[].mechanism
- Values: 'runtime' (tool-required) | 'llm' (text-valid)
- NOT checked in E3 logic
- CONFIRMED GAP: Task type not considered in E3

════════════════════════════════════════════════════════════════
AUDIT SECTION 3: PROXY METRIC VS SEMANTIC PROGRESS
════════════════════════════════════════════════════════════════

E3 PROXY: toolCalls.length (agent.ts:729)
- Checked: After model response parsing, BEFORE tool execution
- Semantic: "Model output structure contains tool calls"
- Limitation: Doesn't detect if model CLAIMS tool call but fails to execute
- False-positive: Text-synthesis returns toolCalls.length=0 → flagged as stall

SEMANTIC PROGRESS: progressSignal (progress-monitor.ts:96-111)
- Checked: After tool execution, AFTER fingerprinting
- Semantic: (observedPlanTransition) OR (observedNovelEvidence)
- Detection: Actual execution + change OR new evidence fingerprint
- Accuracy: Higher (requires real execution)

MISMATCH CONFIRMED:
```
Case: "text-synthesis task completes via LLM analysis"
E3 sees: toolCalls.length === 0 → stallCount++
Progress sees: No tool call, no plan transition → NO_PROGRESS
Both treat as stalled EVEN IF analysis is valid completion
```

EVIDENCE:
- toolCalls.length check: agent.ts:729
- progressSignal ignored: agent.ts:741-766 (NO reference to progressResult)
- progressResult computed: agent.ts:1207-1225 (latestProgressResult assigned)
- Used elsewhere: agent.ts:1253-1260 (stagnation tracking)

════════════════════════════════════════════════════════════════
AUDIT SECTION 4: GUARD/CONSTRAINT INTERACTIONS
════════════════════════════════════════════════════════════════

Guard at stallCount=1 (agent.ts:768-776):
```
if (stallCount === 1 && planIsActive) {
  const msg = '[GUARD] Bạn đã tạo plan nhưng chưa thực thi...';
  messages.push({ role: 'system', content: msg });
  modelOptions.toolChoice = 'required';
  toolCallCycles++;
  continue;
}
```

Intent: Force tool call if model doesn't execute after planning
Effect: Re-runs model with toolChoice='required' + guard message

ISSUE: Guard assumes ALL plans need tool execution
- Does NOT check criterion.mechanism
- Text-synthesis tasks forced to call tools unnecessarily
- May cause spurious tool calls (e.g., read_file just to say "here's info")

Guard at stallCount=2 (agent.ts:779-788):
Same issue, reinforced

RISK: Guard can force LLM to make unnecessary tool calls
- Not a loop (continues execution)
- But violates principle that text-valid tasks shouldn't need tools
- CONFIRMED: Overly aggressive guard

════════════════════════════════════════════════════════════════
AUDIT SECTION 5: INTERACTIONS & DEADLOCK RISKS
════════════════════════════════════════════════════════════════

E3 → Plan.status (CONFIRMED BUG):
E3 fires (line 759) → returns [E3] error → engine.ts:1157-1162 marks checkpoint failed
BUT Plan.status NOT updated to 'failed' or terminal state
Next request: derivePlanState() returns 'executing' (Plan.status still 'running')
isGuardActive() = true (executing is active)
admission gate reuses Plan (engine.ts:902-917)
Same stalled Plan re-injected → E3 fires again
RESULT: ✅ CONFIRMED BLOCKED LOOP (depends on Bug 1)

E3 ↔ Stagnation Tracker (independent):
E3 operates at run level (stallCount, 3-turn threshold)
Stagnation tracks per-item level (consecutiveFailedAttempts, 5-attempt threshold)
Both can mark plan stuck separately
Risk: Plan marked stuck by stagnation, then E3 also fires
Mitigation: E3 checks plan.status !== 'stuck' (not currently done)
VERDICT: ✅ RISK (can double-mark), but not deadlock

Completion Protocol v1.2 → E3 (independent):
protocol-manager.ts:36-87 evaluateItem() checks criteria
Returns: canAutoComplete, hasSemanticCriteria
E3 doesn't call evaluateItem()
No interaction
VERDICT: ACCEPTABLE (orthogonal systems)

Plan Admission Gate (Phase 2) → E3 (interaction):
admission gate (engine.ts:902-917) reuses Plan if active
E3 returns error, Plan.status not updated
Next admission gate sees active Plan, reuses again
RESULT: ✅ CONFIRMED BLOCKED LOOP (same as Bug 1)

════════════════════════════════════════════════════════════════
AUDIT SECTION 6: TEST CASES & ACTUAL BEHAVIOR
════════════════════════════════════════════════════════════════

CASE A: Tool required, LLM doesn't call
Scenario: "Fetch latest news" → LLM text-only response
E3 sees: toolCalls.length=0 → stallCount++
Guard injects toolChoice='required'
Provider enforces: LLM forced to call tool
stallCount resets → continues
Progress sees: Novel evidence (tool call) → PROGRESS signal
VERDICT: ✅ CAUGHT (working as intended)

CASE B: Text-valid task, LLM analyzes
Scenario: "Explain JARVIS architecture" → LLM analysis text
E3 sees: toolCalls.length=0 → stallCount++
After 3 cycles: E3 fires → [E3] error
Progress sees: NO_PROGRESS (no tool, no transition)
VERDICT: ❌ FALSE POSITIVE (Bug 2)

CASE C: Tool called but tool fails
Scenario: search_knowledge_graph times out
E3 sees: toolCalls.length > 0 → stallCount=0
Next cycle: no tool call (LLM retry logic)
stallCount increments
May trigger E3 if repeated 3x
Progress sees: novel evidence (tool called once) → PROGRESS
After tool fails: NO_PROGRESS in next cycle
VERDICT: ✅ ACCEPTABLE (retry grace period, then stalls if persistent)

CASE D: Model traps in cycles (real ReAct failure)
Scenario: LLM says "I'll call tool" but keeps describing plan
Cycle 1: Text, no tool → stallCount=1, guard injected
Cycle 2: Text again, guard reinforced → stallCount=2
Cycle 3: Text again, provider doesn't enforce toolChoice → stallCount=3
E3 fires
VERDICT: ✅ CAUGHT (original design intent)

CASE E: Plan completed but Plan.status still 'running'
Scenario: All items done, model returns final answer
completion protocol marks item completed
Plan.status should update to 'completed'
But if E3 fires first, Plan.status never updated
Next request sees 'running'
VERDICT: ❌ RISK (depends on E3 Bug 1)

CASE F: Multiple tool calls, no repeats (genuine progress)
Scenario: Cycle 1: call search_tool, get results
         Cycle 2: call read_tool with results
E3 sees: toolCalls.length > 0 both cycles → stallCount=0
Progress sees: novel evidence cycle 1 (search), novel cycle 2 (read)
VERDICT: ✅ CORRECT (advancing work)

CASE G: Provider ignores toolChoice='required'
Scenario: Guard set toolChoice='required', model returns text anyway
E3 sees: toolCalls.length=0 → stallCount increments
Guard assumption broken
After 3 cycles: E3 fires
VERDICT: ✅ CORRECT (safety valve works), but ⚠️ depends on provider compliance

CASE H: Crash/restart during stall
Scenario: Cycle 3, stallCount=3, about to fire E3
Crash occurs
Restart: stalll Count reset to 0 (ephemeral)
New request: Plan.status still 'running' (checkpoint persisted)
admission gate reuses Plan
No stalled marker preserved
VERDICT: ❌ RISK (stall context lost, can loop if Plan inherently stalled)

════════════════════════════════════════════════════════════════
AUDIT SECTION 7: AGENT LOOP EXIT PATHS
════════════════════════════════════════════════════════════════

1. finishReason='stop' + text response (line 672-840)
   → classifyResponse() → FINAL_ANSWER or UNPARSEABLE
   → if FINAL_ANSWER: return with finalContent

2. finishReason='tool_calls' (line 900+)
   → execute tools → append to finalContent
   → continue loop

3. stallCount >= MAX_STALL && planIsActive (line 753-765)
   → return [E3] error
   → EXIT (not continue)

4. maxToolCycles exhausted (line 523: while condition)
   → EXIT loop normally

5. Circuit breaker open (line 528-538)
   → return error
   → EXIT

6. finishReason='length' (line 843+)
   → retry or truncate
   → continue or exit

7. Model error/provider failure (line 636-644)
   → fallback or throw
   → exit or retry

8. Goal drift detected (line 796-807)
   → prepend reminder
   → continue

9. MissionLock blocked (line 810-820)
   → return blocked response
   → EXIT

VERIFIED: 9 exit paths, E3 is one of them (line 3)
E3 exit does NOT update Plan.status (BUG 1)

════════════════════════════════════════════════════════════════
AUDIT SECTION 8: STATE TRANSITIONS & INVARIANTS
════════════════════════════════════════════════════════════════

VALID TRANSITIONS (types.ts:14-26):
pending → running
running → running (same item)
running → completed (all items done)
running → paused_limit (maxToolCycles)
running → waiting_user (risk gate)
running → failed (>50% failed)
running → aborted (user abort)
running → stuck (stagnation detected)
stuck → running (user skip/adjust)
stuck → aborted (user abort)

INVALID TRANSITIONS: All others (validateTransition rejects)

E3 FIRING DOESN'T TRANSITION PLAN STATE (BUG 1):
Plan.status remains in state before E3
Usually 'running' (mid-execution)
Should transition to 'failed' or 'escalated'
CONFIRMED: Violated invariant (state not terminal after error)

CHECKPOINT TERMINAL STATE (engine.ts:1157-1162):
checkpoint.status marked 'failed' when [E3] returned
Plan.status NOT marked
CONFIRMED: Asymmetric termination (checkpoint vs Plan)

════════════════════════════════════════════════════════════════
AUDIT SECTION 9: CHECKPOINT & RECOVERY STATE
════════════════════════════════════════════════════════════════

STATE MUST PERSIST:
- checkpoint.status: 'failed' on E3
- Plan object (via checkpoint.setPlan())
- checkpoint.cycles: tool call evidence
- checkpoint.cycleData: execution facts

STATE MUST BE EPHEMERAL:
- stallCount: per-request counter
- toolCallCycles: per-request counter
- messages array: per-request prompt

CURRENT STATE:
- ✅ checkpoint.status persists
- ❌ Plan.status does NOT update on E3 (should persist 'failed')
- ✅ stallCount ephemeral (correct)
- ✅ toolCallCycles ephemeral (correct)
- ✅ messages ephemeral (correct)

RECOVERY AFTER CRASH (engine.ts:333-351):
getAllInProgress() loads in-progress checkpoints
Marks recovered with annotation
stallCount not restored (correct, ephemeral)
Plan.status not restored → re-derived from checkpoint
BUG: If Plan.status was 'running', still seen as 'running' (not terminal)

════════════════════════════════════════════════════════════════
AUDIT SECTION 10: UNUSED SIGNALS IN CODEBASE
════════════════════════════════════════════════════════════════

Signal: observedNovelEvidence
- Computed (progress-monitor.ts:216-226)
- Available in progressResult (agent.ts:1222)
- Used: stagnation tracking only (agent.ts:1258-1259)
- NOT used in E3
- RECOMMENDATION: E3 should use this

Signal: criterion.mechanism
- Stored in PlanItem (types.ts:35)
- Populated by planner
- Read by protocol-manager (line 56-76)
- NOT checked in E3 or guard logic
- RECOMMENDATION: Guard should check this

Signal: canAutoComplete
- Computed in evaluateItem() (protocol-manager.ts:83)
- Not exposed to agent loop
- Could indicate text-valid completion
- RECOMMENDATION: Surface to E3

Signal: planStateTransition
- Detected (agent.ts:1193-1198)
- Available in latestProgressResult
- NOT checked in E3
- RECOMMENDATION: E3 should verify transition occurred

════════════════════════════════════════════════════════════════
AUDIT SECTION 11: ARCHITECTURE REVIEW ALIGNMENT
════════════════════════════════════════════════════════════════

PHASE 2 LOCKED INVARIANTS:
✅ Explicit Task Admission Gate: IMPLEMENTED (engine.ts:902-917)
✅ Conflict Detection: IMPLEMENTED (checkpoint.ts:217-256)
✅ FACT Immutability: RESPECTED (toolCalls not mutated)
✅ No implicit Plan inheritance: ENFORCED (admission gate)

PHASE 2 NOT RESPECTED:
❌ E3 doesn't update Plan.status → violates terminal state invariant
❌ E3 returns without Plan terminal mark → violates symmetry with checkpoint.status

COMPLETION PROTOCOL v1.2:
- Defines acceptance criteria evaluation
- Protocol-manager implements evaluation
- Agent should call evaluateItem() before concluding task
- E3 doesn't integrate with protocol
- GAP: E3 exits before protocol verification

B1 INVARIANTS (from bug reports):
- History ≠ Active Execution: ✅ MAINTAINED
- No implicit Plan inheritance: ✅ MAINTAINED (with Phase 2 gate)
- FACT immutable: ✅ MAINTAINED
- Plan terminal when error: ❌ VIOLATED (Bug 1)

════════════════════════════════════════════════════════════════
AUDIT SECTION 12: CLASSIFICATION
════════════════════════════════════════════════════════════════

CONFIRMED BUG 1: Plan.status not terminal after E3
- Location: agent.ts:759-765 (E3 return)
- Root cause: Missing checkpointStore.setPlan() call
- Effect: Next turn re-injects stalled Plan → blocked loop
- Severity: CRITICAL (data loss, user stuck)
- Fix: 3 lines of code
- Evidence: Code inspection, trace of admission gate reuse

CONFIRMED BUG 2: E3 uses proxy metric (toolCalls.length)
- Location: agent.ts:729 vs progress-monitor.ts:96-111
- Root cause: Design mismatch (proxy vs semantic)
- Effect: False positive on text-synthesis tasks
- Severity: HIGH (legitimate tasks blocked)
- Fix: Replace with progressSignal + criterion.mechanism + plan.status
- Evidence: Code inspection, case analysis (CASE B)

DESIGN GAP: No task-type classification
- Location: types.ts (no requiresExternalData field)
- Root cause: Missing field in data model
- Effect: Guard can't distinguish task types
- Severity: MEDIUM (works around-able with criterion.mechanism)
- Fix: Use criterion.mechanism (already exists, just need to check it)
- Evidence: Code inspection, architecture review

RISK: Guard overly aggressive
- Location: agent.ts:768-788
- Root cause: Assumes all plans need tool execution
- Effect: Forces tools on text-valid tasks
- Severity: MEDIUM (doesn't block, but inefficient)
- Fix: Check criterion.mechanism before forcing tool call
- Evidence: Code inspection, case analysis (CASE B)

RISK: Crash/restart loses stall context
- Location: engine.ts:333-351 (boot recovery)
- Root cause: stallCount ephemeral (correct), but Plan not marked terminal
- Effect: Stalled plan can re-loop after restart
- Severity: LOW (depends on Bug 1 fix)
- Fix: Ensure Plan.status terminal on E3 (same as Bug 1 fix)
- Evidence: Code inspection, case analysis (CASE H)

ACCEPTABLE: E3 exit without stagnation double-mark
- Location: agent.ts:753-766, 1270-1280
- Root cause: Independent systems
- Effect: Can transition to stuck even if E3 fired
- Severity: ACCEPTABLE (redundant but not harmful)
- Mitigation: E3 checks plan.status !== 'stuck' before firing
- Evidence: Code inspection, risk analysis

NOT A BUG: Time/cycle sequencing
- Reason: AsyncLocalStorage per-request isolation, unique checkpointRequestId
- Verdict: SAFE from race conditions
- Evidence: Time/cycle audit (previous report)

NOT A BUG: Provider non-compliance with toolChoice
- Reason: Safety valve exists (E3 exits if provider ignores)
- Verdict: ACCEPTABLE (graceful degradation)
- Evidence: Code inspection, case analysis (CASE G)

════════════════════════════════════════════════════════════════
SIGNALS THAT SHOULD BE USED BY E3
════════════════════════════════════════════════════════════════

SIGNAL SET (3 signals required together):

1. progressSignal.type === 'NO_PROGRESS'
   Source: progress-monitor.ts:96-111 (agent.ts:1219)
   Reliability: HIGH (deterministic fingerprinting)
   Semantic: No plan transition AND no novel evidence

2. criterion.mechanism === 'runtime'
   Source: types.ts:31-42 (PlanItem.criteria)
   Reliability: HIGH (planner-provided)
   Semantic: Item requires tool/runtime evaluation

3. plan.status !== 'stuck'
   Source: types.ts:74-84 (checkpoint.ts)
   Reliability: HIGH (already tracked)
   Semantic: Stagnation not already detected

REPLACEMENT LOGIC:
```
IF (progressSignal?.type === 'NO_PROGRESS')
   AND (currentItem?.criteria?.some(c => c.mechanism === 'runtime'))
   AND (plan.status !== 'stuck')
   AND (stallCount >= MAX_STALL)
THEN trigger E3
```

════════════════════════════════════════════════════════════════
FINAL VERDICT
════════════════════════════════════════════════════════════════

EVIDENCE SUFFICIENCY FOR FIX DESIGN: ✅ YES

Root Causes Confirmed:
1. E3 doesn't update Plan.status → blocked loop
2. E3 uses proxy metric → false positives on text tasks
3. Guard doesn't check criterion.mechanism → inefficient

Fix Strategy:
1. Short-term: Add Plan.status='failed' on E3 (3 lines, breaks loop)
2. Medium-term: Replace toolCalls.length with 3-signal combination
3. Long-term: Ensure guard checks criterion.mechanism

NOT Root Cause:
- Time/cycle issues (safe)
- Provider non-compliance (safe)
- Completion protocol gap (orthogonal)
- Stagnation double-mark (acceptable)

Recommended Action:
- Proceed with fix design based on root causes confirmed
- Bug 1 (Plan.status) blocks Bug 2 investigation (can't test without fix)
- Signal combination proven viable
- No new architecture needed

════════════════════════════════════════════════════════════════

FILES INSPECTED:
- src/core/engine/agent.ts (lines 505-1260)
- src/core/engine/engine.ts (lines 780-1168, 902-917, 1157-1162)
- src/core/plan/types.ts (lines 31-84, 106-143)
- src/core/plan/plan-state.ts (lines 18-76)
- src/core/plan/protocol-manager.ts (lines 19-87)
- src/core/progress/progress-monitor.ts (lines 12-227)
- src/core/checkpoint.ts (lines 217-256, 268, 416-435)

AUDIT COMPLETE. STOP.

════════════════════════════════════════════════════════════════
