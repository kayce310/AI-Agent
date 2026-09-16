E3 FIX DESIGN VALIDATION — 2 CRITICAL POINTS AUDIT
Time: 2026-09-11T10:25:05.425Z

════════════════════════════════════════════════════════════════
POINT 1: PROGRESSSIGNAL TIMING vs E3 CHECK
════════════════════════════════════════════════════════════════

SEQUENCE IN AGENT LOOP:

Line 603-645:  Model invoked
Line 729:      turnHasAction = (modelResult.toolCalls?.length > 0)
Line 741-750:  E3 stallCount logic RUNS (NO progressSignal available yet)
Line 753-766:  E3 CHECK & RETURN (stallCount >= 3)
               ↓
               Exit agent loop (return [E3])
               progressSignal NEVER COMPUTED for this cycle

Line 1100+:    Tool execution (only if turnHasAction=true, skipped if E3 fired)
Line 1200:     executedToolCalls collected
Line 1207:     progressTracker.evaluate() called
Line 1213:     latestProgressResult assigned

EVIDENCE:
- E3 check: agent.ts:753-766 (BEFORE tool execution)
- progressSignal creation: agent.ts:1207-1213 (AFTER tool execution)
- latestProgressResult from PREVIOUS cycle: agent.ts:1253 references latestProgressResult

TIMING ANALYSIS:

Cycle N:
  Model response (no tools) → turnHasAction=false
  E3 stallCount++ (line 742)
  E3 check (line 753) → stallCount < 3, continue loop
  Guard injection (line 768-776) if stallCount=1
  toolCallCycles++ → continue
  ↓
Cycle N+1:
  Model response (retried with guard)
  turnHasAction = new response.toolCalls.length
  E3 stallCount logic AGAIN (line 741-750)
  latestProgressResult from CYCLE N available (line 1253)
  
E3 at line 753-766 in Cycle N+1 CAN access latestProgressResult from Cycle N
BUT: latestProgressResult from Cycle N reflects CYCLE N's tool execution
NOT Cycle N+1's attempted execution

CRITICAL FINDING:
- ❌ E3 cannot use progressSignal of CURRENT cycle (not computed yet)
- ✅ E3 CAN use progressSignal of PREVIOUS cycle (latestProgressResult available)
- ⚠️ BUT: Previous cycle's signal may not reflect current stall condition

VERDICT FOR POINT 1: CONTRADICTION

3-signal proposal assumed E3 can check:
```
progressSignal.type === 'NO_PROGRESS'  [CURRENT cycle]
```

ACTUALLY:
E3 only has access to:
```
latestProgressResult?.signal from PREVIOUS cycle
```

This is DIFFERENT signal. Previous cycle's progress does NOT prove current cycle is stalled.

Example failure:
```
Cycle 1: Tool call succeeds → progressSignal='PROGRESS' → latestProgressResult updated
Cycle 2: Model refuses tool (text response) → stallCount++ → E3 checks
         E3 sees latestProgressResult.signal='PROGRESS' from Cycle 1
         BUT Cycle 2 has no tool call
         E3 cannot distinguish using latestProgressResult from previous cycle
```

════════════════════════════════════════════════════════════════
POINT 2: CRITERION.MECHANISM SEMANTICS
════════════════════════════════════════════════════════════════

DEFINITION IN CODE:

types.ts:31-42:
```typescript
export interface AcceptanceCriterion {
  ...
  mechanism: 'runtime' | 'llm';
  ...
  evaluatorId?: string;  // for mechanism="runtime"
}
```

USAGE IN PROTOCOL-MANAGER:

protocol-manager.ts:56-66:
```
if (crit.mechanism === 'llm') {
  hasSemantic = true;
  evaluations.push({...outcome: 'pending'...});
  if (crit.required) blockedByRequired = true;
  continue;
}
```

protocol-manager.ts:67-76:
```
if (crit.mechanism === 'runtime') {
  if (!crit.evaluatorId) {
    evaluations.push({...outcome: 'inconclusive'...});
    if (crit.required) requiredRuntimePassed = false;
    continue;
  }
  const evaluation = await evaluatorRegistry.resolve(crit.evaluatorId, evidence);
  evaluations.push(evaluation);
  if (crit.required && evaluation.outcome !== 'pass') {
    requiredRuntimePassed = false;
    blockedByRequired = true;
  }
}
```

SEMANTIC MEANING:

mechanism='runtime':
- Criterion is evaluated by a RUNTIME EVALUATOR (evaluatorRegistry)
- evaluatorId identifies the evaluator function
- Evaluator takes evidence (tool results, etc.) and returns verdict
- Does NOT necessarily mean "tool must be called"
- Means: "Verify this criterion using runtime mechanism (not LLM)"

mechanism='llm':
- Criterion is evaluated by LLM (IndependentVerifier)
- No evaluatorId needed
- LLM analyzes evidence and decides

EVIDENCE FROM EVALUATOR-REGISTRY:

evaluator-registry.ts:2-8:
```
/**
 * Registry for runtime acceptance criteria evaluators.
 * Invariant #12: runtime mechanism MUST resolve a valid evaluator.
 */
```

evaluator-registry.ts:15:
```
export type RuntimeEvaluator = (evidence: any) => Promise<CriterionEvaluation>;
```

RuntimeEvaluator signature:
- Takes evidence (any tool output / execution result)
- Returns CriterionEvaluation (pass/fail verdict)
- No requirement that evidence MUST come from tool calls

CRITICAL FINDING:

mechanism='runtime' means:
✅ "Use runtime evaluator to verify completion"
✅ "Evaluator checks evidence (could be tool output, model analysis, etc.)"
❌ NOT "This item requires tool execution"

Example evaluator that doesn't need tools:
```
evaluator('content_length') → checks if response.length > N
evaluator('keyword_present') → checks if response contains keyword
```

Both can be runtime evaluators that verify completion WITHOUT requiring tool calls.

VERDICT FOR POINT 2: CONTRADICTION

3-signal proposal assumed:
```
criterion.mechanism === 'runtime'  means "item requires tool execution"
```

ACTUALLY:
mechanism='runtime' means "use runtime evaluator for verification"
Does NOT imply tool requirement
Could be text-valid item with runtime verification

════════════════════════════════════════════════════════════════
COMBINED VERDICT FOR 3-SIGNAL PROPOSAL
════════════════════════════════════════════════════════════════

Proposed signals:
1. progressSignal.type === 'NO_PROGRESS'
2. criterion.mechanism === 'runtime'
3. plan.status !== 'stuck'

VALIDATION RESULTS:

Signal 1 CONTRADICTION:
- E3 has latestProgressResult from PREVIOUS cycle, not current
- Previous progress doesn't prove current stall
- Using this signal would introduce TIMING BUG

Signal 2 CONTRADICTION:
- criterion.mechanism='runtime' does NOT mean "requires tool"
- Means "use runtime evaluator for verification"
- Text-valid items can have mechanism='runtime'
- Using this signal would introduce FALSE-POSITIVE BUG

Signal 3 VERIFIED:
- plan.status !== 'stuck' is valid check
- Prevents double-mark with stagnation tracker
- Available at E3 check time

════════════════════════════════════════════════════════════════
FINAL ANSWER
════════════════════════════════════════════════════════════════

CONTRADICTION

Both critical signals in the 3-signal proposal are semantically/timing incorrect:

1. progressSignal timing: E3 sees PREVIOUS cycle's signal, not current
   - Using it would create timing bug

2. criterion.mechanism: Does NOT distinguish "needs tool" from "text-valid"
   - Using it would create false-positive bug

The proposed 3-signal combination is NOT VALID for E3 redesign.

════════════════════════════════════════════════════════════════
