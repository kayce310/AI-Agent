E3/REACT STALL — FULL ARCHITECTURE SIGNAL AUDIT
Existing signals inventory + combination feasibility
Time: 2026-09-11

════════════════════════════════════════════════════════════════
EXECUTIVE SUMMARY
════════════════════════════════════════════════════════════════

CURRENT STATE: E3 uses SINGLE proxy signal (toolCalls.length === 0)
GOAL: Find combination of existing signals to replace it
FINDING: YES — viable combination exists, requires 3 signals together

Combination = (progressSignal === 'NO_PROGRESS') 
            + (planItemStatus !== 'completed')
            + (planItem.criteria || []).some(c => c.mechanism === 'runtime')

════════════════════════════════════════════════════════════════
Q1: E3/STALL DETECTION — SIGNALS CURRENTLY RECEIVED
════════════════════════════════════════════════════════════════

CURRENT E3 SIGNAL (agent.ts:729):
```
const turnHasAction = (modelResult.toolCalls?.length > 0) || false;
```

SOURCE: modelResult from LLM provider
TIMING: Before tool execution (model response parsing)
SEMANTIC: "Model output contains tool calls structure"

WHAT E3 RECEIVES:
- ✅ toolCalls array (present or empty)
- ✅ finishReason (stop, tool_calls, length, error)
- ✅ content (text response if finishReason='stop')
- ❌ NOT execution result (happens downstream)
- ❌ NOT progress signal (ignored)
- ❌ NOT plan item state (not checked)

EVIDENCE (agent.ts:741-750):
```
if (!turnHasAction && planIsActive) {
  stallCount++;
} else {
  stallCount = 0;
}
```

E3 only checks: turnHasAction boolean
Does NOT check: plan state, criteria, execution result

════════════════════════════════════════════════════════════════
Q2: PROGRESSMONITOR/PROGRESSSIGNAL — AVAILABLE SIGNALS
════════════════════════════════════════════════════════════════

PROGRESSSIGNAL TYPES (progress-monitor.ts:12-14):

```typescript
export type ProgressSignal =
  | { type: 'PROGRESS'; reason?: string }
  | { type: 'NO_PROGRESS'; reason?: string };
```

PROGRESS CONDITIONS (progress-monitor.ts:96-111):

```typescript
export function classifyProgress(observation: ProgressObservation): ProgressSignal {
  if (observation.observedPlanTransition) {
    return { type: 'PROGRESS', reason: 'plan_transition_observed' };
  }
  
  if (observation.observedNovelEvidence) {
    return {
      type: 'PROGRESS',
      reason: observation.evidenceFingerprint
        ? `novel_evidence:${observation.evidenceFingerprint}`
        : 'novel_evidence',
    };
  }
  
  return { type: 'NO_PROGRESS', reason: 'no_transition_and_no_novel_evidence' };
}
```

SIGNALS AVAILABLE:
- observedPlanTransition: BOOLEAN (item index advanced OR status changed to 'completed')
- observedNovelEvidence: BOOLEAN (new tool fingerprint seen in this run)
- evidenceFingerprint: STRING (deterministic hash of tool_call identity)
- reason: STRING (human-readable reason for signal type)

SIGNAL TIMING (agent.ts:1207-1225):
Created AFTER tool execution from executedToolCalls array
Used in stagnation tracking (lines 1253-1260), NOT in E3

FINGERPRINTING (progress-monitor.ts:61-69):
```typescript
export function fingerprintProgressEvidence(input: ProgressEvidenceInput): string {
  const normalized = {
    kind: input.kind,
    toolName: input.toolName ?? '',
    args: input.args ?? null,
    payload: input.payload ?? null,
  };
  return stableSerialize(normalized);
}
```

Novel evidence deduplicates by: (kind + toolName + args + payload)
Detects: First occurrence of unique tool call signature per run

════════════════════════════════════════════════════════════════
Q3: PLAN/PLANITEM METADATA — SIGNALS FOR TASK TYPE
════════════════════════════════════════════════════════════════

PLANITEM STRUCTURE (types.ts:54-72):

```typescript
export interface PlanItem {
  index: number;
  description: string;
  status: PlanItemStatus;
  completedByTool?: string;
  resultSummary?: string;
  error?: string;
  errorCategory?: 'transient' | 'permanent' | 'security';
  consecutiveFailedAttempts: number;
  consecutiveTransientAttempts?: number;
  requiredToolGroups?: string[];      // @deprecated
  criteria?: AcceptanceCriterion[];   // ACTIVE
}
```

ACCEPTANCE CRITERIA (types.ts:31-42):

```typescript
export interface AcceptanceCriterion {
  id: string;
  description: string;
  tracesTo: string;
  mechanism: 'runtime' | 'llm';       // KEY: distinguishes tool-required vs semantic
  independence: 'same_context' | 'independent';
  required: boolean;
  provenance: 'planner' | 'executor';
  planVersion: string;
  createdAt: number;
  evaluatorId?: string;               // for mechanism="runtime"
}
```

KEY SIGNAL: mechanism field
- 'runtime': Item requires evaluator/tool execution to verify completion
- 'llm': Item can be evaluated by LLM semantic analysis

EVIDENCE FOR TASK CLASSIFICATION:
```
if (planItem.criteria?.some(c => c.mechanism === 'runtime')) {
  // This item REQUIRES tool execution
} else if (planItem.criteria?.some(c => c.mechanism === 'llm')) {
  // This item can be completed via LLM analysis
}
```

PLANSTATUS (types.ts:74-84):

```typescript
export type PlanStatus =
  | 'pending'
  | 'running'
  | 'awaiting_verification'
  | 'waiting_user'
  | 'paused_limit'
  | 'completed'
  | 'failed'
  | 'aborted'
  | 'stuck'              // Detected stagnation
  | 'escalated';         // Budget exhausted
```

STATUS SIGNAL: 'stuck' = stagnation already detected
Can use this to prevent E3 from re-triggering

════════════════════════════════════════════════════════════════
Q4: COMPLETION PROTOCOL v1.2 — PROGRESS/SEMANTIC SIGNALS
════════════════════════════════════════════════════════════════

COMPLETION ELIGIBILITY (protocol-manager.ts:19-26):

```typescript
export interface CompletionEligibility {
  eligible: boolean;
  itemIndex: number;
  evaluations: CriterionEvaluation[];
  canAutoComplete: boolean;
  hasSemanticCriteria: boolean;
  reason?: string;
}
```

SIGNALS:
- canAutoComplete: BOOLEAN (no LLM criteria needed; runtime criteria passed)
- hasSemanticCriteria: BOOLEAN (requires LLM verification)

SEMANTIC: Indicates whether completion can be auto-determined

CRITERION EVALUATION (types.ts:46-52):

```typescript
export interface CriterionEvaluation {
  criterionId: string;
  outcome: EvaluationOutcome;      // 'pending' | 'pass' | 'fail' | 'inconclusive'
  evidence?: string;
  evaluatedAt: number;
  reasoning?: string;
}
```

SIGNALS: outcome type indicates evaluation result

EVIDENCE-BASED COMPLETION (agent.ts lines 1087-1138):
```
const toolDriftState = derivePlanState(this.checkpointStore, request.sessionId);
...
const planStateAfterTool = derivePlanState(this.checkpointStore, request.sessionId);
```

Plan state transitions detected after tool execution

════════════════════════════════════════════════════════════════
Q5: REACT STATE MACHINE — TRANSITIONS/OBSERVATIONS
════════════════════════════════════════════════════════════════

PLANSTATE DISCRIMINATED UNION (plan-state.ts:18-31):

```typescript
export type PlanState =
  | { kind: 'none' }
  | { kind: 'planning'; planId: string }
  | { kind: 'executing'; planId: string; activeItemIndex: number }
  | { kind: 'completed'; planId: string }
  | { kind: 'failed'; planId: string; reason: string }
  | { kind: 'aborted'; planId: string };
```

TRANSITIONS DETECTABLE:
- none → planning: Plan created
- planning → executing: First item started
- executing → executing: Item progressed
- executing → completed: All items done
- executing → failed: Item/plan failed
- executing → aborted: User abort
- executing → stuck: (via plan.status, detected in stagnation tracker)

GUARDSACTIVE CHECK (plan-state.ts:74-76):

```typescript
export function isGuardActive(state: PlanState): boolean {
  return state.kind === 'planning' || state.kind === 'executing';
}
```

Guard active = Plan exists and not terminal

OBSERVATION: Each cycle can re-derive planState and detect transitions

EVIDENCE (agent.ts:1193-1198):
```typescript
const planStateAfterCycle = derivePlanState(this.checkpointStore, request.sessionId);
const transitionObserved =
  planStateAfterCycle.kind !== currentPlanState.kind ||
  ('planId' in currentPlanState &&
   planStateAfterCycle.planId !== currentPlanState.planId);
```

════════════════════════════════════════════════════════════════
Q6: INVARIANTS E3 MUST RESPECT
════════════════════════════════════════════════════════════════

INVARIANT 1: Plan Immutability After Terminal State
(types.ts:14-26, protocol-manager.ts)
- Terminal: 'completed', 'failed', 'aborted', 'escalated'
- Once terminal, status cannot change
- E3 must NOT reuse plan after it's terminal

INVARIANT 2: STAGNATION_THRESHOLD Consistency
(types.ts:106-110, agent.ts:1270-1272)
```typescript
export const STAGNATION_THRESHOLD = 5;

if (thresholdReached || currentItem.consecutiveFailedAttempts >= STAGNATION_THRESHOLD) {
  sp.status = 'stuck';
}
```

Stagnation already detected independently per item
E3 operates at run level (stallCount), not item level
Must NOT conflict with stagnation tracking

INVARIANT 3: Plan State Determinism
(plan-state.ts:36-76)
```typescript
export function derivePlanState(
  checkpointStore: CheckpointStore,
  sessionId: string
): PlanState { ... }
```

PlanState derived deterministically from checkpoint only
No side effects, repeatable
E3 can call this safely

INVARIANT 4: Tool Call Recording
(agent.ts:1200-1225)
```typescript
const progressEvidence: ProgressEvidenceInput[] = executedToolCalls.map((tc) => ({
  kind: tc.name === 'update_plan' ? 'plan_transition' : 'tool_call',
  toolName: tc.name,
  ...
}));
```

Tool calls recorded in progressEvidence
Deduplicated by fingerprint
E3 can use novelEvidence signal to detect repeated tool calls

════════════════════════════════════════════════════════════════
CURRENT STATE: WHERE E3 DEVIATES
════════════════════════════════════════════════════════════════

E3 TODAY (agent.ts:741-766):
```
if (!turnHasAction && planIsActive) {
  stallCount++;
} else {
  stallCount = 0;
}

if (stallCount >= MAX_STALL && planIsActive) {
  return { content: `[E3] ❌ Agent stalled...` };
}
```

DEVIATION 1: No plan item context
- E3 doesn't know which item is active
- Doesn't check item.criteria.mechanism
- Treats all items as tool-required

DEVIATION 2: Fires before execution
- turnHasAction checked at model response parse time
- progressSignal available only after execution
- E3 can't see what actually happened

DEVIATION 3: Ignores plan.status
- Doesn't check if plan already 'stuck'
- Could re-trigger E3 after stagnation already detected

DEVIATION 4: Uses count-based logic
- stallCount >= 3 arbitrary threshold
- No semantic check of actual progress

════════════════════════════════════════════════════════════════
VIABLE COMBINATION: SIGNALS TO REPLACE E3
════════════════════════════════════════════════════════════════

PROPOSED SIGNAL SET:

Signal A: progressSignal.type === 'NO_PROGRESS'
  Source: progress-monitor.ts:classifyProgress()
  Timing: After tool execution
  Semantic: No plan transition AND no novel evidence
  Reliability: ✅ HIGH (deterministic fingerprinting)

Signal B: planItem.criteria?.some(c => c.mechanism === 'runtime')
  Source: types.ts:31-42 (AcceptanceCriterion)
  Timing: At item start (available from Plan)
  Semantic: Item requires tool/runtime evaluation
  Reliability: ✅ HIGH (planner-provided metadata)

Signal C: plan.status !== 'stuck'
  Source: types.ts:74-84 (PlanStatus)
  Timing: Current state in checkpoint
  Semantic: Stagnation not already detected
  Reliability: ✅ HIGH (set by stagnation tracker)

COMBINATION LOGIC:

```
IF (progressSignal.type === 'NO_PROGRESS')
   AND (currentPlanItem?.criteria?.some(c => c.mechanism === 'runtime'))
   AND (plan.status !== 'stuck')
   AND (stallCount >= THRESHOLD)
THEN trigger E3
```

RATIONALE:
- Signal A: Detects no actual progress (tool or evidence)
- Signal B: Confirms item type requires action
- Signal C: Avoids duplicate with stagnation tracker
- stallCount: Allows grace period (same as today)

FALSE-POSITIVE AVOIDANCE:

Case A (task needs tool, doesn't call):
```
✅ Caught: progressSignal='NO_PROGRESS' + mechanism='runtime' → E3 triggers
```

Case B (task text-valid, LLM synthesizes):
```
✅ Avoided: mechanism='llm' (or absent criteria) → E3 not triggered
         OR progressSignal='PROGRESS' (if tool called once) → stallCount resets
```

════════════════════════════════════════════════════════════════
IMPLEMENTATION FEASIBILITY
════════════════════════════════════════════════════════════════

REQUIRED INPUTS:
1. progressSignal (already computed at agent.ts:1207-1225) ✅ AVAILABLE
2. planItem.criteria (already in PlanItem) ✅ AVAILABLE
3. plan.status (already in checkpoint) ✅ AVAILABLE

TIMING:
- Signal A: Available after tool execution cycle
- Signal B: Available from start (plan metadata)
- Signal C: Available from checkpoint

INTEGRATION POINT:
agent.ts:753-766 (where E3 fires)
Currently checks: stallCount >= MAX_STALL && planIsActive
New check: stallCount >= MAX_STALL && progressSignal.type === 'NO_PROGRESS' && hasRuntimeCriteria && plan.status !== 'stuck'

CODE FOOTPRINT: ~3-5 lines
```
const hasRuntimeCriteria = currentItem?.criteria?.some(c => c.mechanism === 'runtime') ?? false;
const shouldTriggerE3 = (stallCount >= MAX_STALL) 
  && (progressSignal?.type === 'NO_PROGRESS')
  && hasRuntimeCriteria
  && (plan.status !== 'stuck');

if (shouldTriggerE3) {
  return { content: `[E3] ❌ Agent stalled...` };
}
```

════════════════════════════════════════════════════════════════
SIGNALS CURRENTLY UNUSED BUT AVAILABLE
════════════════════════════════════════════════════════════════

1. observedNovelEvidence
   - Available in progressResult (agent.ts:1222)
   - Could detect if ANY new evidence (tool call) attempted
   - Currently only used in stagnation tracking

2. canAutoComplete
   - Available from completionEligibility (protocol-manager.ts)
   - Indicates if item can complete without LLM verification
   - Could gate E3 trigger

3. criterionOutcome
   - Available from evaluations (protocol-manager.ts:73-74)
   - Shows if runtime criteria passed/failed
   - Could qualify E3 reason

4. planStateTransition
   - Available via re-derived planState (agent.ts:1193-1198)
   - Could qualify E3 trigger (e.g., no transition + no evidence)

════════════════════════════════════════════════════════════════
CONCLUSION
════════════════════════════════════════════════════════════════

REUSABLE SIGNALS EXIST: ✅ YES

1. PROGRESS SIGNAL (progress-monitor.ts)
   - observedPlanTransition / observedNovelEvidence
   - Already computed, currently ignored by E3
   - READY TO USE

2. PLAN ITEM CRITERIA (types.ts)
   - mechanism: 'runtime' vs 'llm'
   - Distinguishes tool-required from text-valid items
   - READY TO USE

3. PLAN STATUS (types.ts)
   - status: 'stuck' already detected
   - Can prevent E3 re-trigger
   - READY TO USE

VIABLE COMBINATION:
```
E3 trigger = (NO_PROGRESS signal) 
           + (item has runtime criteria)
           + (plan not already stuck)
           + (stallCount threshold)
```

GAPS FILLED:
- ❌ "No tool call" → ✅ "No progress AND requires tools"
- ❌ "Catches text synthesis" → ✅ "Skips text-valid items"
- ❌ "No context awareness" → ✅ "Respects item type"

SIGNALS NOT REUSABLE FOR THIS PURPOSE:
- ❌ toolCalls.length (false proxy, pre-execution)
- ❌ finishReason (doesn't indicate actual execution)
- ❌ content length (no semantic meaning)

════════════════════════════════════════════════════════════════

FILES INSPECTED:
- src/core/engine/agent.ts (lines 729, 741-766, 1207-1225, 1253-1260)
- src/core/plan/types.ts (lines 31-72, 74-84, 106-119)
- src/core/plan/plan-state.ts (lines 18-31, 74-76, 36-76)
- src/core/progress/progress-monitor.ts (lines 12-14, 96-111, 61-69)
- src/core/plan/protocol-manager.ts (lines 19-26, 73-74)

AUDIT COMPLETE. NO CODE CHANGES. STOP.

════════════════════════════════════════════════════════════════
