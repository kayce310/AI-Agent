E3/ReAct STALL DETECTION — COMPREHENSIVE FORENSIC REPORT
Intended Design vs Actual Implementation
Time: 2026-09-11

════════════════════════════════════════════════════════════════
Q1: E3 DESIGNED/IMPLEMENTED WITH WHAT OBJECTIVE?
════════════════════════════════════════════════════════════════

INTENDED DESIGN (from git history):

Commit 59608533 (2026-07-26) — "fix(core): agent dừng ở bước lập kế hoạch, không thực thi"
Root cause identified:
```
IntentionGuard chỉ kiểm tra model có tuyên bố ý định khi CHƯA có plan.
Sau khi hasCreatedPlan=true, guard tắt hoàn toàn — model viết plan text dài 
mà không bị ép phải EXECUTE.
```

Original failure mode (ReAct anti-pattern):
```
Cycle 1: LLM writes plan text (detailed description without calling create_plan tool)
         → No tool call → hasCreatedPlan = false
         → Model continues writing text
Cycle 2+: Model keeps describing plan without executing
         → Loop stuck at planning phase, never reaches execution
```

INTENT OF E3:
```
Prevent ReAct loop from getting stuck at planning phase.
If plan was created (hasCreatedPlan=true) but model doesn't call tools 
for N consecutive turns → abort with clear error [E3].
Don't let model keep talking about the plan; force execution or fail loudly.
```

INTENDED CONDITION:
```
stallCount >= 3 && hasCreatedPlan (now: planIsActive) → return [E3] error
```

ACTUAL IMPLEMENTATION (agent.ts:505-766):

```typescript
let stallCount = 0;            // số turn liên tiếp KHÔNG có tool call
const MAX_STALL = 3;

while (toolCallCycles < this.maxToolCycles) {
  ...
  const turnHasAction = (modelResult.toolCalls?.length > 0) || false;
  
  if (!turnHasAction && planIsActive) {
    stallCount++;
  } else {
    stallCount = 0;
  }
  
  if (stallCount >= MAX_STALL && planIsActive) {
    return {
      content: `[E3] ❌ Agent stalled after plan creation...`,
      finished: true,
    };
  }
  
  if (stallCount === 1 && planIsActive) {
    // Inject guard message + set toolChoice='required'
    messages.push('[GUARD] ...');
    modelOptions.toolChoice = 'required';
    toolCallCycles++;
    continue;
  }
  
  if (stallCount === 2 && planIsActive) {
    // Reinforce toolChoice='required'
    modelOptions.toolChoice = 'required';
    toolCallCycles++;
    continue;
  }
}
```

GAP BETWEEN INTENDED AND ACTUAL:

Intended: "Plan created but not executed → E3"
Actual: "No tool call + Plan active → E3"

These are NOT equivalent:
- Task can have active Plan AND complete via text (synthesis/analysis)
- Task can call tools without creating explicit Plan (direct tool invocation)
- "Tool call" ≠ "execution progress"

════════════════════════════════════════════════════════════════
Q2: ReAct FAILURE FLOW — LLM SAYS "WILL USE TOOL" BUT DOESN'T
════════════════════════════════════════════════════════════════

FAILURE SCENARIO (Original ReAct anti-pattern):

Cycle 1:
  LLM model response:
  ```
  "I'll analyze this task. Let me break it down:
   1. Search for JARVIS architecture documentation
   2. Analyze the core components
   3. Synthesize findings into a report
   
   I will now use search_knowledge_graph tool..."
  ```
  
  Agent detection:
  - modelResult.finishReason = 'stop' (not 'tool_calls')
  - modelResult.toolCalls = [] (empty)
  - modelResult.content = "I'll analyze... [long planning text]"
  
  Result:
  - turnHasAction = false (toolCalls.length === 0)
  - stallCount = 1
  - finalContent = [planning text]
  - finished = false → continue loop

Cycle 2:
  LLM tries again (no guard yet at stallCount=1)
  Response: More planning text or continuation
  
  Result:
  - turnHasAction = false
  - stallCount = 2

Cycle 3 (stallCount=1 guard executed in previous cycle):
  Guard injected: "[GUARD] Bạn đã tạo plan nhưng chưa thực thi..."
  toolChoice = 'required' set
  
  LLM response (forced by provider if toolChoice enforced):
  - Now calls tool (because toolChoice='required')
  - OR if provider doesn't enforce: still text
  
  IF provider enforces:
    - toolCalls not empty → turnHasAction = true
    - stallCount = 0 (reset)
    - ESCAPE the loop
  
  IF provider doesn't enforce OR model refuses:
    - toolCalls still empty → turnHasAction = false
    - stallCount = 3
    - E3 FIRES

EXACT CODE PATH:

agent.ts:729:
```
const turnHasAction = (modelResult.toolCalls?.length > 0) || false;
```
Only checks: toolCalls array has items
Does NOT check: model text content for "intent" or "will"

agent.ts:741-750:
```
if (!turnHasAction && planIsActive) {
  stallCount++;
} else {
  stallCount = 0;
}
```
Increment only on: no tools + plan active
No semantic analysis of model output

agent.ts:768-776:
```
if (stallCount === 1 && planIsActive) {
  messages.push('[GUARD] ... Gọi NGAY tool ...');
  modelOptions.toolChoice = 'required';
  toolCallCycles++;
  continue;
}
```
Guard injects at stallCount=1
Attempts to force tool call via toolChoice

agent.ts:779-788:
```
if (stallCount === 2 && planIsActive) {
  modelOptions.toolChoice = 'required';
  messages.push('[GUARD] Lần thứ hai: KHÔNG được trả lời bằng text...');
  toolCallCycles++;
  continue;
}
```
Reinforces at stallCount=2

agent.ts:753-766:
```
if (stallCount >= MAX_STALL && planIsActive) {
  return {
    content: `[E3] ❌ Agent stalled...`,
    finished: true,
  };
}
```
EXITS LOOP at stallCount >= 3 with E3 error

STUCK CONDITION (the ReAct trap):

If model ignores toolChoice='required' (some providers don't enforce it):
```
Cycle 1: stallCount=1, guard injected, toolChoice set
Cycle 2: stallCount=2, guard reinforced, toolChoice set again
Cycle 3: stallCount=3 → E3 FIRES
Result: Task terminates with [E3] error, Plan.status NOT updated
Next turn: Plan still 'running', re-injected, E3 fires again
```

════════════════════════════════════════════════════════════════
Q3: SIGNAL TO KNOW IF TASK "NEEDS TOOL/ACTION"?
════════════════════════════════════════════════════════════════

ANSWER: NO clear signal exists in system

AVAILABLE SIGNALS:

1. Plan existence + status
   - Exists: task was decomposed into actionable items
   - Does NOT mean: requires tool calls
   - Evidence: "explain JARVIS architecture" = valid Plan item that completes via text

2. Tool selection (selectRelevantTools)
   - Returns: tools matching user query
   - Does NOT indicate: user REQUIRES tools
   - Evidence: tool selection is heuristic; LLM can skip tools if answer known

3. Model response structure
   - finishReason='tool_calls': model selected tool call
   - finishReason='stop': model chose text response
   - Does NOT indicate intent: model may choose text for tool-requirable tasks

4. Guard injection at stallCount=1
   - Assumes: if plan exists + no tools = stalled
   - Incorrect assumption: text is valid for synthesis tasks

5. Progress monitor (progress-monitor.ts)
   - Tracks: plan transition OR novel evidence
   - NOT used by E3: E3 checks toolCalls.length only
   - Evidence: agent.ts:1253-1260 uses progressSignal for stagnation tracking, NOT E3

6. Plan item metadata
   - Plan.items[].description: e.g., "Research JARVIS architecture"
   - Does NOT specify: "requires tool call" vs "research & report"
   - system has NO mechanism to mark items as tool-required

WHAT'S MISSING:

- ❌ No "execution_intent" field indicating tool requirement
- ❌ No "task_mode" classification (knowledge_synthesis vs tool_required)
- ❌ No explicit signal from Plan/Task saying "must call tools"
- ❌ No model-level constraint saying "this task needs external data"

CLOSEST SIGNAL (unused):

Agent registry (agent-registry.ts:75-83):
```
{
  name: 'knowledge_synthesis',
  allowedTools: ['read_file', 'search_knowledge_graph', 'generate_report'],
}
```
Indicates tools available but NOT whether required

════════════════════════════════════════════════════════════════
Q4: CAN SYSTEM DISTINGUISH 3 CASES?
════════════════════════════════════════════════════════════════

CASE A: Task NEEDS tool but LLM doesn't call it
CASE B: Task doesn't need tool and LLM answers via text
CASE C: LLM says "will use tool" but doesn't call it (ReAct anti-pattern)

CURRENT SYSTEM CAPABILITY:

System can distinguish:
- ✅ Tool called vs not called (toolCalls.length)
- ✅ Plan exists vs doesn't exist
- ✅ Text response vs tool response

System CANNOT distinguish:
- ❌ CASE A vs CASE B: Both look identical (no tool call + text response)
- ❌ CASE C from CASES A/B: Only detects "no tool call", not model intent

EVIDENCE:

agent.ts:729:
```
turnHasAction = (modelResult.toolCalls?.length > 0) || false;
```
Checks: presence of tool calls only
No semantic analysis of:
- Model's claimed intent ("I will use...")
- Task requirements ("search for...")
- Response content ("here's my analysis...")

WHAT E3 ACTUALLY DETECTS:

```
stallCount >= 3 && planIsActive
  → "No tool call for 3 consecutive turns + Plan active"
  → Treats as: ReAct stuck
  → Actually could be: valid text synthesis
```

MISCLASSIFICATION EXAMPLES:

Example 1 (CASE B, incorrectly treated as CASE A):
```
Task: "cấu trúc harness của JARVIS, toàn diện các khía cạnh"
Type: Knowledge synthesis (can answer from training data)
LLM: "Based on my knowledge, JARVIS uses a hierarchical architecture with..."
E3 sees: No tool call + Plan active → stallCount++
After 3 cycles: E3 fires (WRONG — task doesn't need tools)
```

Example 2 (CASE A, correctly detected):
```
Task: "Fetch latest news about AI safety from Hacker News"
Type: Requires external data
LLM: "Let me search for this..." (but no actual search_tool call)
E3 sees: No tool call + Plan active → stallCount++
After 3 cycles: E3 fires (CORRECT — task needs tool)
```

Example 3 (CASE C, correctly detected but downstream broken):
```
Task: Anything requiring action
LLM (cycle 1): "I'll use search_knowledge_graph to find..." (no call)
E3 sees: No tool call + Plan active → stallCount++
Guard injects at stallCount=1
LLM (cycle 2): Still no tool call
Guard reinforces at stallCount=2
LLM (cycle 3): Provider enforces toolChoice → finally calls tool
OR: toolChoice not enforced → stallCount=3 → E3 fires
```

CONCLUSION Q4:
System cannot distinguish CASE A from CASE B.
Both appear as "no tool call + text response".
E3 treats both the same: as stalled.

════════════════════════════════════════════════════════════════
Q5: PROGRESS-MONITOR.TS USED BY E3?
════════════════════════════════════════════════════════════════

ANSWER: ❌ NO — E3 ignores progress-monitor completely

EVIDENCE:

progress-monitor.ts exists and defines:
```typescript
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

Progress monitor IS used elsewhere (agent.ts:1207-1260):
```
const progressResult = progressTracker.evaluate({...});
...
if (progressSignal?.type === 'PROGRESS') {
  currentItem.consecutiveFailedAttempts = 0;  // reset counter
}
```

BUT E3 does NOT use progressSignal:

agent.ts:741-766 (E3 logic):
```
const turnHasAction = (modelResult.toolCalls?.length > 0) || false;

if (!turnHasAction && planIsActive) {
  stallCount++;
} else {
  stallCount = 0;
}

if (stallCount >= MAX_STALL && planIsActive) {
  return { content: `[E3] ❌ Agent stalled...` };
}
```

ZERO references to:
- progressSignal
- progressResult
- observedNovelEvidence
- observedPlanTransition

DIFFERENCES:

E3 Stall Detection:
- Metric: toolCalls.length > 0
- Definition of progress: tool call executed
- Triggers on: 3 cycles without tool call

Progress Monitor (stagnation tracking):
- Metric: plan transition OR novel evidence
- Definition of progress: semantic advance
- Triggers on: 3+ failures on same item without progress signal

RESULT:
E3 and Progress Monitor are INDEPENDENT systems
E3 could use progressSignal but doesn't
E3 uses proxy metric (tool call) instead of semantic metric (progress)

════════════════════════════════════════════════════════════════
Q6: GIT HISTORY — E3 ADDED FOR WHAT FAILURE MODE?
════════════════════════════════════════════════════════════════

RELEVANT COMMITS:

1. Commit 59608533 (2026-07-26) — Stall Detection Added
   Message: "fix(core): agent dừng ở bước lập kế hoạch, không thực thi (stall detection)"
   
   Problem identified:
   ```
   IntentionGuard chỉ kiểm tra... Sau khi hasCreatedPlan=true, 
   guard tắt hoàn toàn — model viết plan text dài mà không bị ép 
   phải EXECUTE.
   ```
   
   Solution implemented:
   - Stall detection state machine
   - stallCount: number of consecutive turns without tool call
   - At stall=1: inject guard message + toolChoice='required'
   - At stall=2: reinforce toolChoice='required'
   - At stall>=3: return [E3] error

2. Commit 3d37b278 (2026-08-11) — E3 as Structured Failure Outcome
   Message: "fix(engine): P2 — structured task outcome (E1/E2/E3)"
   
   Change: Recognize [E3] as failure outcome
   - [E3] prefix → isFailureOutcome=true
   - checkpoint.failed() instead of checkpoint.complete()
   - success=false recorded in metrics
   
   Context:
   ```
   Agent trả [E1]/[E2]/[E3] = task KHÔNG hoàn thành.
   Trước đây engine hardcode success=true → stalled bi tinh la thanh cong.
   ```

ROOT CAUSE SOLVED (original failure):
```
Phase: Agent planning
Problem: LLM writes detailed plan text without calling create_plan tool
         Guard only active before plan creation
         After plan exists, no constraint to execute
Result: Loop stuck at planning, never reaches execution
```

HOW E3 SOLVES IT:
```
1. Detect: planIsActive && no tool call for N turns
2. Force: Guard injection + toolChoice='required'
3. Fail: If still no tool call after guardrails → E3 error
Result: Loop can't stay stuck at planning; either executes or fails
```

════════════════════════════════════════════════════════════════
Q7: DISTANCE BETWEEN DESIGN AND IMPLEMENTATION + GAPS
════════════════════════════════════════════════════════════════

DESIGN INTENT (from commit message):
```
"If plan was created but LLM keeps describing it without executing,
prevent infinite loop by forcing tool execution or failing loudly."

Condition: planIsActive && LLM behavior = "text instead of action"
Solution: Guard + force, then fail if ignored
```

IMPLEMENTATION ACTUAL:
```
Condition: planIsActive && toolCalls.length === 0
Assumption: no tool call = stalled
Problem: Not all tasks with active plans NEED tool calls
```

KEY GAPS:

GAP 1: Plan Active ≠ Must Execute Tools
```
Designed for: LLM creates plan but refuses to execute
Actual detects: Any plan + no tools (including valid synthesis)
```

GAP 2: No Tool Call ≠ Stalled
```
Designed for: ReAct anti-pattern (text loop)
Actual detects: All text responses, even final answers
```

GAP 3: Guardrails Don't Distinguish Tasks
```
Designed for: Force LLM to act on plan
Actual effect: Force tool calls on tasks that don't need them
```

GAP 4: E3 Doesn't Update Plan Terminal State
```
Designed: Fail loudly on stall (implicit: mark Plan failed)
Actual: Return [E3] error WITHOUT updating Plan.status
Result: Next turn sees active Plan → re-injected → E3 fires again
```

GAP 5: No Signal for Task Requirements
```
Designed: Detect "LLM should execute but won't"
Actual: No mechanism to distinguish "should execute" from "can answer via text"
```

UNIMPLEMENTED PARTS OF DESIGN:

1. Task classification
   - Design implied: distinguish tool-required vs text-valid tasks
   - Implementation: no classification exists

2. Semantic progress detection
   - Design could use: progress-monitor for real progress
   - Implementation: only checks toolCalls.length

3. Plan item metadata
   - Design could use: plan items marked "requires tool" vs "research & report"
   - Implementation: no such metadata

4. Model intent parsing
   - Design could infer: "model said it will use tool" vs "model doing text synthesis"
   - Implementation: no intent extraction

EVIDENCE OF GAPS:

agent.ts:741-750 — E3 logic:
```
if (!turnHasAction && planIsActive) {
  stallCount++;
  log.warn(`[Stall] stallCount=${stallCount}/${MAX_STALL}`);
}
```
Comment says: "số turn liên tiếp KHÔNG có tool call (reset khi có tool call)"
Implementation matches comment exactly.
Design intent is NOT fully reflected in comment or code.

════════════════════════════════════════════════════════════════
FACT CHECKPOINT (Final Summary)
════════════════════════════════════════════════════════════════

INTENDED E3 PURPOSE:
- Detect: LLM creates plan but refuses to execute → ReAct anti-pattern
- Prevent: Infinite loop of planning without action
- Force: Tool execution via guards or fail loudly

ACTUAL E3 BEHAVIOR:
- Detects: Plan active + no tool call for 3 turns
- Assumes: No tool call = stalled (always true)
- Consequence: Blocks valid text-synthesis tasks

ROOT FAILURE MODE (original):
- LLM describes plan without calling create_plan tool
- Guard disabled after plan creation
- Loop stuck at planning phase

ROOT CAUSE ADDRESSED:
- Added stall detection state machine
- Guard reactivated when no tool calls after plan creation
- Force toolChoice='required' at stall=1,2; fail at stall>=3

REMAINING ARCHITECTURAL ISSUES:
1. ❌ E3 can't distinguish task requirements (tool-required vs text-valid)
2. ❌ E3 doesn't use actual progress semantics (uses tool call proxy)
3. ❌ E3 doesn't mark Plan as terminal → blocked loop on E3 error
4. ❌ No mechanism to signal "this task needs external action"
5. ❌ Guardrails force tools on tasks that don't need them

EVIDENCE SOURCE:
- git log: commits 59608533, 3d37b278
- agent.ts: lines 505-766 (E3 implementation)
- progress-monitor.ts: unused by E3 (lines 96-111)
- No task classification in agent-registry.ts

STOP. Investigation complete. No recommendations. No code changes.

════════════════════════════════════════════════════════════════
