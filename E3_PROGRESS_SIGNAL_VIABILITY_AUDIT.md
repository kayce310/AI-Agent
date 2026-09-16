E3/REACT STALL — PROGRESS SIGNAL VIABILITY AUDIT
Can PROGRESS replace toolCalls.length in E3?
Time: 2026-09-11

════════════════════════════════════════════════════════════════
Q1: COMPLETION PROTOCOL v1.2 — PROGRESS DEFINITIONS
════════════════════════════════════════════════════════════════

EVIDENCE: protocol-manager.ts lines 1-10

```typescript
/**
 * Implements the Runtime Completion Authority layer of Completion Protocol v1.2.
 * Core principle: LLM proposes, Runtime governs progress.
 * Phase 3: Independent Verification.
 */
```

PROGRESS DEFINITION IN PROTOCOL v1.2:
- Not explicitly defined in protocol-manager.ts
- No "progress" or "observed progress" field in CompletionEligibility (lines 19-26)
- Protocol focuses on: completion criteria evaluation, not progress detection

EVIDENCE VAULT REFERENCE:
evidence-vault.ts line 2:
```
@file Evidence Vault — Historical evidence storage for completion protocol
```

**FINDING Q1:** Completion Protocol v1.2 does NOT define progress semantics.
Progress is separate concern (progress-monitor.ts), not part of protocol.

════════════════════════════════════════════════════════════════
Q2: PROGRESS-MONITOR.TS — PROGRESSSIGNAL CALCULATION
════════════════════════════════════════════════════════════════

classifyProgress() function (progress-monitor.ts:96-111):

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

PROGRESSSIGNAL SEMANTICS:

**PROGRESS = true when:**
1. observedPlanTransition = true (plan item index advanced OR item.status changed to 'completed')
2. OR observedNovelEvidence = true (new tool call / evidence not seen before in run)

**NO_PROGRESS = true when:**
- No plan transition AND no novel evidence

EVIDENCE FINGERPRINTING (progress-monitor.ts:61-69):

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

Novel evidence = first occurrence of unique (kind + toolName + args + payload)

FINDING Q2:
- PROGRESS = plan transition OR novel evidence (deterministic)
- NO_PROGRESS = neither transition nor novel evidence
- Novelty tracked by fingerprint (deduplicates repeated same tool calls)

════════════════════════════════════════════════════════════════
Q3: PROGRESSSIGNAL CREATION + RUNTIME USAGE
════════════════════════════════════════════════════════════════

CREATION POINT (agent.ts:1207-1225):

```typescript
const progressEvidence: ProgressEvidenceInput[] = executedToolCalls.map((tc) => ({
  kind: tc.name === 'update_plan' ? 'plan_transition' : 'tool_call',
  toolName: tc.name,
  args: tc.args,
  cycleId: toolCallCycles,
}));

const progressResult = progressTracker.evaluate({
  runId: request.checkpointRequestId || request.sessionId || requestId,
  cycleId: toolCallCycles,
  transitionObserved,
  evidence: progressEvidence,
});
latestProgressResult = progressResult;
```

CREATED AFTER: Tool calls executed (executedToolCalls array populated)
LIFECYCLE: In-memory only (ProgressTracker instance per run)

USAGE POINT (agent.ts:1253-1260):

```typescript
const progressSignal = latestProgressResult?.signal;
const thresholdReached = latestProgressResult?.window.thresholdReached ?? false;

if (progressSignal?.type === 'PROGRESS') {
  currentItem.consecutiveFailedAttempts = 0;
  currentItem.consecutiveTransientAttempts = 0;
  log.info(`[Stagnation] Progress signal observed → counter reset`);
} else if (cycleErrorCategory === 'transient' && ...) {
  // transient tracking
} else {
  // permanent failure tracking
}
```

USED FOR: Stagnation tracking (plan item consecutive failures)
NOT USED FOR: E3 stall detection

FINDING Q3:
- progressSignal created AFTER tool execution (lines 1207-1225)
- Only used in stagnation tracking, NOT E3 logic
- E3 ignores progressResult completely

════════════════════════════════════════════════════════════════
Q4: E3 VS PROGRESS-MONITOR — SIGNAL COMPARISON
════════════════════════════════════════════════════════════════

E3 CURRENT LOGIC (agent.ts:729, 741-750):

```typescript
const turnHasAction = (modelResult.toolCalls?.length > 0) || false;

if (!turnHasAction && planIsActive) {
  stallCount++;
} else {
  stallCount = 0;
}
```

E3 SIGNAL: toolCalls.length > 0
- Checked: Before tool execution (from model response parsing)
- Condition: Any array element in toolCalls
- False-positive: Text-only synthesis tasks flagged as stalled

PROGRESS-MONITOR LOGIC (progress-monitor.ts:96-111):

```typescript
if (observation.observedPlanTransition) {
  return { type: 'PROGRESS', ... };
}
if (observation.observedNovelEvidence) {
  return { type: 'PROGRESS', ... };
}
return { type: 'NO_PROGRESS', ... };
```

PROGRESS SIGNAL: plan transition OR novel evidence
- Checked: AFTER tool execution (from executed tool calls)
- Condition: Actual execution + change OR new evidence fingerprint
- False-positive risk: Lower (requires actual execution or evidence)

CRITICAL DIFFERENCE:

```
E3 checks:        Model SAID it will call tool (finishReason not 'tool_calls' → false)
Progress checks:  Model ACTUALLY called tool (executedToolCalls not empty → true)
```

FINDING Q4:
- E3 uses proxy (toolCalls in response) before execution
- Progress uses actual (executedToolCalls after execution)
- Different timing → different false-positive profiles

════════════════════════════════════════════════════════════════
Q5: CAN PROGRESS DISTINGUISH TWO CASES?
════════════════════════════════════════════════════════════════

**CASE A: Task needs tool, LLM doesn't call tool**
Example: "Fetch latest news" → LLM text response only

Progress signal result:
- No tool call → observedNovelEvidence = false
- No plan transition → observedPlanTransition = false
- Result: NO_PROGRESS ✓ (CORRECT)

**CASE B: Task doesn't need tool, LLM analyzes/synthesizes**
Example: "Explain JARVIS architecture" → LLM text response with analysis

Progress signal result:
- No tool call → observedNovelEvidence = false
- No plan transition → observedPlanTransition = false
- Result: NO_PROGRESS ✗ (WRONG — task progressed via text)

PROBLEM: Progress-monitor doesn't distinguish:
- "No progress because task stuck"
- "No progress because task completes via text"

EVIDENCE: progress-monitor.ts:101-108

```typescript
if (observation.observedNovelEvidence) {
  return { type: 'PROGRESS', ... };
}
```

observedNovelEvidence only counts:
- New tool call fingerprints (lines 219: kind !== 'tool_call')
- OR plan_transition (lines 219: kind !== 'plan_transition')

Does NOT count:
- Model analysis/synthesis text
- Explanation quality
- Information completeness

WHAT CASE B NEEDS:
```
IF (modelResult.content has meaningful analysis) 
  AND (no external tool needed to fetch data)
  THEN observedNovelEvidence = true
```

BUT:
- How to detect "meaningful"? (NLP required, not deterministic)
- How to know "no external data needed"? (task classification missing)

FINDING Q5:
Progress-monitor CANNOT distinguish CASE A from CASE B.
Both result in NO_PROGRESS signal.
Requires additional context (task classification, analysis quality) not available in progress-monitor.

════════════════════════════════════════════════════════════════
Q6: MISSING SIGNALS/CONSTRAINTS FOR E3 ACCURACY
════════════════════════════════════════════════════════════════

TO AVOID FALSE-POSITIVE, E3 NEEDS:

**Signal 1: Task Classification**
- Type: tool_required vs text_valid
- Source: Plan metadata OR task description
- Current status: ❌ MISSING
- Evidence: No task_type field in TaskPlan (src/core/plan/types.ts)

**Signal 2: Model Output Analysis**
- Type: "Analysis provided" vs "Statement of intent without evidence"
- Source: Response text semantic analysis
- Current status: ❌ MISSING (classifyResponse only checks length > 3)
- Evidence: agent.ts:107-114 — pure structure check, no content analysis

```typescript
function classifyResponse(content: string): ResponseType {
  const trimmed = (content || '').trim();
  if (!trimmed || trimmed.length < 3) return 'UNPARSEABLE';
  return 'FINAL_ANSWER'; // No semantic check
}
```

**Signal 3: Evidence of Task Completion**
- Type: "Information/analysis provided" vs "Empty/trivial response"
- Source: Response content + context
- Current status: ❌ PARTIAL (E1/E2 check for empty, not for completeness)
- Evidence: engine.ts:74-76 — isFailureOutcome() only checks for [E1]/[E2]/[E3] prefix

**Signal 4: External Data Requirement Indicator**
- Type: "Task depends on live data" vs "Task uses training data"
- Source: Plan items description OR prompt embedding
- Current status: ❌ MISSING
- Evidence: No "requires_live_data" field in PlanItem

**Signal 5: Tool Execution Attempt Tracking**
- Type: "LLM tried but failed" vs "LLM chose not to call"
- Source: Model error messages OR provider feedback
- Current status: ❌ MISSING
- Evidence: modelResult structure doesn't distinguish "couldn't call" from "didn't call"

ALTERNATIVE: USE EXISTING PROGRESS CONSTRAINTS

Replace E3 condition from:
```
stallCount >= 3 && planIsActive && (toolCalls.length === 0)
```

To:
```
stallCount >= 3 && planIsActive && (progressSignal.type === 'NO_PROGRESS')
```

EFFECT:
- Catches CASE A (task needs tool but doesn't call) ✓
- Still flags CASE B (task is text-valid) ✗
- BUT: Requires execution to happen first (1-cycle delay)

FINDING Q6:
Progress-monitor signals insufficient alone.
Need one of:
- Task classification (tool_required vs text_valid)
- OR response quality analysis (meaningful vs trivial)
- OR explicit "needs live data" marker
Without these, false-positives persist.

════════════════════════════════════════════════════════════════
CONCLUSION
════════════════════════════════════════════════════════════════

**Can PROGRESS replace toolCalls.length in E3?**

PARTIAL: ❌ NO (insufficient alone)

**Why:**
- PROGRESS signal: plan transition OR novel evidence (tool calls only)
- E3 target: distinguish "stalled by refusal" from "text-complete"
- Gap: Progress doesn't detect text-valid task completion

**If used (toolCalls.length → progressSignal.type === 'NO_PROGRESS'):**
- ✅ Better than current: executes before triggering
- ✅ Harder to fool: actual execution required
- ❌ Still false-positive: text-synthesis tasks still NO_PROGRESS

**Minimum additions needed:**
1. Task classification (requires tool vs not)
2. OR response quality signal (meaningful analysis detected)
3. OR plan item metadata ("synthesize vs fetch")

**Without additions:**
Progress-monitor alone leaves CASE B (text-valid tasks) still vulnerable.

════════════════════════════════════════════════════════════════

Files inspected:
- src/core/plan/protocol-manager.ts (lines 1-10)
- src/core/progress/progress-monitor.ts (lines 96-111, 19-26, 61-69, 216-226)
- src/core/engine/agent.ts (lines 1207-1225, 1253-1260, 729, 741-750, 107-114)
- src/core/engine/engine.ts (lines 74-76)

REPORT COMPLETE. STOP.

════════════════════════════════════════════════════════════════
