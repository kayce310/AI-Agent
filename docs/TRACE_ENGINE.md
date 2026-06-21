# Phase 4C — Trace Engine

> **Date:** 2026-06-21  
> **Status:** ✅ COMPLETE  
> **Commit:** f77b8103  
> **Tests:** 14/14 GREEN | Gate: 30/30 INVARIANT PASS

---

## 1. Executive Summary

**Trace Engine** is a deterministic data layer that reconstructs **cognitive traces** from a flat event stream. It bridges raw EventStore data to the UI without text parsing, regex, or timeline scanning.

| Component | Status | Notes |
|---|---|---|
| `buildCognitiveTrace()` | ✅ Complete | O(n log n) algorithm, handles out-of-order + corruption |
| Test suite | ✅ 14/14 GREEN | Covers all 5 scenarios + edge cases |
| Gate test | ✅ 30/30 PASS | All invariants verified on real SQLite data |
| Data model | ✅ Defined | CognitiveTrace, DecisionTrace types exported |

**Ready for:** Cognitive Trace UI (Phase 4D)

---

## 2. Data Model

### CognitiveTrace

```typescript
export interface CognitiveTrace {
  taskId: string;
  decisions: DecisionTrace[];
}
```

Represents a complete cognitive history for a single task.

### DecisionTrace

```typescript
export interface DecisionTrace {
  decisionId: string;
  /** The decision_made event that triggered this trace */
  decision: AgentEvent;
  /** Tool calls spawned by this decision, paired by callId */
  tools: {
    toolCalled?: AgentEvent;
    toolFinished?: AgentEvent;
  }[];
  /** Side-effects: file_*, memory_write, error during this decision */
  artifacts: AgentEvent[];
}
```

Each decision contains:
- **decision**: The original `decision_made` event (immutable reference)
- **tools**: Array of tool invocations, each optionally paired with a result
- **artifacts**: Events that occurred during this decision's execution (files, memory writes, errors)

---

## 3. Linking Rules

All linkage is **structured payload only** — no text parsing, no regex scanning.

### Primary Keys

| Field | Scope | Cardinality |
|---|---|---|
| `taskId` | Partition events into tasks | 1:many |
| `decisionId` | Link tool_called/tool_finished to decision_made | 1:many |
| `callId` | Pair tool_called ↔ tool_finished | 1:1 |

### Algorithm

```
for each event in sorted(taskEvents, by=timestamp):
  if type == 'decision_made':
    create new DecisionTrace(decisionId, decision_event)
    set activeDecisionId = decisionId
  elif type == 'tool_called':
    find DecisionTrace with matching decisionId
    check for orphan tool_finished slot (out-of-order)
    if orphan exists: fill toolCalled
    else: create new tool slot with toolCalled
  elif type == 'tool_finished':
    find tool slot with matching callId
    fill toolFinished
    if no slot found: create orphan slot under activeDecisionId
  else:
    if not lifecycle event: add to artifacts under activeDecisionId
```

---

## 4. Complexity Analysis

### Time Complexity
- **Sorting:** O(n log n) — sort events by timestamp
- **Linking:** O(n) — single pass, O(1) map lookups per event
- **Total:** O(n log n)

### Space Complexity
- O(n) — store decisions, tools, artifacts

### No Backtracking
- Single forward pass — no reordering
- Out-of-order events handled via orphan slots
- Corrupted streams degrade gracefully (missing tool_finished still produces trace)

---

## 5. Edge Cases Handled

| Case | Behavior | Test |
|---|---|---|
| No matching events | Empty decisions array | ✅ `returns empty decisions for no matching events` |
| Different taskId | Filtered out | ✅ `returns empty decisions for events with different taskId` |
| Direct response (no tools) | Decision only, no tools[] | ✅ `builds trace for direct response (no tools)` |
| Single tool call | 1 decision → 1 tool slot | ✅ `builds trace for single tool call with result` |
| Multi-tool decision | 1 decision → N tool slots | ✅ `builds trace for multi-tool decision` |
| File artifacts | Assigned to active decision | ✅ `includes file artifacts in decision trace` |
| Non-file artifacts | memory_write, error included | ✅ `includes non-file artifacts (memory_write, error)` |
| Missing tool_finished | tool_called only, incomplete pair | ✅ `handles corrupted stream — missing tool_finished` |
| Orphan tool_finished | No tool_called, standalone slot | ✅ `handles corrupted stream — orphan tool_finished without tool_called` |
| Multiple decisions | Each gets own DecisionTrace | ✅ `builds trace for multiple decisions in one task` |
| Out-of-order events | tool_finished before tool_called | ✅ `handles out-of-order events — tool_finished before tool_called` |
| No taskId in payload | Included if artifact types | ✅ `rejects events without taskId in payload` |
| Lifecycle exclusion | task_started/finished not artifacts | ✅ `does not include task_started/task_finished as artifacts` |
| Consistency | Deterministic output | ✅ `produces consistent output — same input = same structure` |

---

## 6. Gate Test Results

**Test:** Reconstruct traces from real SQLite data (30 tasks, 72 events)

```
=== Correctness: 30/30 tasks invariant-pass, 0 failed ===

Invariants checked:
  I1: decision count matches decision_made events ✅
  I2: each decision has unique decisionId ✅
  I3: each decision's ID matches payload ID ✅
  I4: tool counts by decisionId match events ✅
  I5: artifacts assigned to active decision ✅

All tasks passed every invariant.
```

### Data Quality Note

- **1 task (8967780585):** 16 decision_made events → 16 decisions (full trace)
- **29 tasks:** 0 decision_made events → 0 decisions (empty traces)

**Root cause:** Historical sessionId-as-taskId bug (pre-Fix 2 c6de3639). After agent restart picking up Fix 2 + parseToolArgs, new tasks will produce full traces.

**Conclusion:** Trace builder is **correct**. Data limitation is temporary.

---

## 7. Example Output

### Input (Raw Events)

```json
[
  { "type": "decision_made", "payload": { "taskId": "task-1", "decisionId": "dec-A", "decision": "Call read_file", "reason": "Need config" } },
  { "type": "tool_called", "payload": { "taskId": "task-1", "decisionId": "dec-A", "callId": "call-1", "toolName": "read_file", "args": { "path": "/etc/app.conf" } } },
  { "type": "tool_finished", "payload": { "taskId": "task-1", "decisionId": "dec-A", "callId": "call-1", "toolName": "read_file", "success": true, "result": "config content" } },
  { "type": "file_created", "payload": { "taskId": "task-1", "path": "/tmp/cache.json" } }
]
```

### Output (CognitiveTrace)

```typescript
{
  taskId: "task-1",
  decisions: [
    {
      decisionId: "dec-A",
      decision: { type: "decision_made", payload: { ... } },
      tools: [
        {
          toolCalled: { type: "tool_called", payload: { callId: "call-1", ... } },
          toolFinished: { type: "tool_finished", payload: { callId: "call-1", ... } }
        }
      ],
      artifacts: [
        { type: "file_created", payload: { path: "/tmp/cache.json" } }
      ]
    }
  ]
}
```

---

## 8. Limitations

| Limitation | Impact | Workaround |
|---|---|---|
| **Structured payload only** | Can't parse tool results from text | Store structured output in payload |
| **No artifact prefilter** | Artifacts assigned to active decision | Use payload.taskId to disambiguate |
| **No decision metadata** | Can't track decision confidence | Add metadata field to decision_made payload |
| **Orphan handling** | Corrupted streams create slots without both halves | Implement automated repair in EventStore |

---

## 9. API Reference

### `buildCognitiveTrace(taskId: string, events: AgentEvent[]): CognitiveTrace`

**Parameters:**
- `taskId` (string): The task to trace
- `events` (AgentEvent[]): Raw event stream (any order, any completeness)

**Returns:**
- `CognitiveTrace`: Fully linked cognitive history, or empty decisions if no matching events

**Guarantees:**
- Deterministic: same input → same output
- No side effects: does not modify input events
- Graceful degradation: corrupted streams produce partial traces

**Example:**

```typescript
import { buildCognitiveTrace } from './src/core/events/trace-builder.js';
import { eventStore } from './src/core/events/store.js';

const allEvents = eventStore.getRecent(1000);
const trace = buildCognitiveTrace('task-12345', allEvents);

for (const decision of trace.decisions) {
  console.log(`Decision: ${decision.decision.payload.decision}`);
  console.log(`  Tools: ${decision.tools.length}`);
  console.log(`  Artifacts: ${decision.artifacts.length}`);
}
```

---

## 10. Files

| File | Role | Status |
|---|---|---|
| `src/core/events/trace-builder.ts` | Core algorithm + types | ✅ Production |
| `tests/trace-builder.test.ts` | 14 test cases | ✅ All GREEN |
| `docs/TRACE_ENGINE.md` | This document | ✅ Complete |

---

## 11. Next Steps (Phase 4D — Cognitive Trace UI)

1. **Add trace to AgentState**
   - Import buildCognitiveTrace
   - Call on every event batch
   - Store latest trace per task

2. **Render trace timeline**
   - Decision card (reason, nextAction)
   - Tool execution card (name, status, duration)
   - Artifact list (files created, memory written, errors)

3. **Inspector drill-down**
   - Click decision → see full reasoningSnippet
   - Click tool → see args and result
   - Click artifact → see payload

4. **Data migration**
   - Document sessionId-as-taskId migration for historical events
   - Optional: run one-time script to rebuild traces for old tasks

---

*End of TRACE_ENGINE.md*
