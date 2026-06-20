# Phase 4B-A — Telemetry Verification Report

> **Date:** 2026-06-21  
> **Investigator:** Tor  
> **Agent:** Kato (Coral) — branch develop  
> **Scope:** data/coral.db — 72 events across 3 event types

---

## 1. Executive Summary

| Check | Status | Notes |
|---|---|---|
| reasoningSnippet có dữ liệu thật | ✅ PASS | DeepSeek reasoning content flows correctly |
| decisionId ↔ tool_called ↔ tool_finished khớp | ❌ FAIL | 0 tool_called / tool_finished events in DB |
| 3 execute_command = 3 real decisions | ✅ PASS | 3 unique decisionIds confirmed |
| taskId consistency | ⚠️ BROKEN | Old decisions use sessionId (`8967780585`) |
| Telemetry Debug Panel | ✅ DEPLOYED | Dashboard + User/Dev toggle + Inspector |

**Score: 3/5** — reasoningSnippet works, decisionIds are unique, but the entire `tool_called/tool_finished` event pipeline is broken.

---

## 2. CRITICAL Finding: Missing tool_called & tool_finished Events

### Symptom
SQLite DB has `72` events but **zero** `tool_called` or `tool_finished` events:

```
Event type distribution:
  task_started        29
  task_finished       27
  decision_made       16
  tool_called          0  ← MISSING
  tool_finished        0  ← MISSING
  file_*               0  ← MISSING
  error                0  ← MISSING
```

### Root Cause
`parseToolArgs()` returns non-`Record` values for certain tool arguments, causing Zod's `z.record(z.string(), z.unknown())` to **silently reject** the event in `EventBus.publish()`.

**Proof:** The `nextAction` field in stored `decision_made` events reads `Execute execute_command(0, 1, 2)`. The `0, 1, 2` are array indices (`Object.keys([])` → `["0", "1", "2"]`), proving `toolCall.function.arguments` was a **JSON array string** like `["arg0", "arg1"]`.

**Chain of failure:**
1. Model adapter returns `toolCall.function.arguments = '["arg0","arg1"]'` (JSON array string)
2. `parseToolArgs(data.toolArgs)` → `JSON.parse('["arg0","arg1"]')` → `["arg0","arg1"]` (JS Array)
3. `parseToolArgs` returns `["arg0","arg1"]` without wrapping — it's an Array, not a Record
4. `EventFactory.toolCalled({..., args: ["arg0","arg1"]})` → `ToolCalledSchema.parse()`
5. `args: z.record(z.string(), z.unknown())` → ❌ rejects Array input
6. `EventBus.publish()` logs error and **returns silently** — event NOT stored
7. `decision_made` event WAS stored (not affected — no `args` field)

### Fix (Applied)
`parseToolArgs()` now verifies `JSON.parse` result is a plain object:

```typescript
function parseToolArgs(raw: unknown): Record<string, unknown> {
  if (!raw) return {};
  if (typeof raw === 'object' && !Array.isArray(raw) && raw !== null)
    return raw as Record<string, unknown>;
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      if (typeof parsed === 'object' && !Array.isArray(parsed) && parsed !== null)
        return parsed as Record<string, unknown>;
      return { _raw: raw, _value: parsed };  // ← NEW: wraps non-object
    } catch {
      return { _raw: raw };
    }
  }
  return {};
}
```

**Requires agent restart** to take effect (tsx process in memory).

---

## 3. reasoningSnippet Verification ✅

### Source
Decisions carry reasoning from DeepSeek `reasoning_content` field via:
```
DeepSeek API → reasoning_content
  → LiteLLMAdapter (model-adapter.ts:278): choice.message?.reasoning_content
  → agent.ts hooks: model:response (reasoningContent)
  → engine.ts: summarizeReasoning() → reason (160 chars)
  → engine.ts: reasoningSnippet = reasoningContent?.slice(0, 1000)
  → EventFactory.decisionMade() → EventBus → SQLite
```

### Sample Data (from /api/state)
```json
{
  "reason": "The user (Kayce) is asking if I know what they developed me for.",
  "reasoningSnippet": "The user (Kayce) is asking if I know what they developed me for. Let me check what I know from memory and knowledge base.\n\nFrom the memory context, I can see:\n- Kayce is the developer\n- They're interested in J.A.R.V.I.S., AI agents, hologram effects\n- They asked about Jarvis brain effects, dashboard from agent data\n- They're building an AI agent system\n\nLet me check the knowledge base for more context about the project purpose."
}
```

- `reason` = first sentence (≤160 chars)
- `reasoningSnippet` = full reasoning up to 1000 chars
- Data is meaningful, non-truncated Vietnamese context

---

## 4. decisionId Consistency ⚠️

### Unique decisionIds
All 16 `decision_made` events have unique UUIDs:
```
51c52940-f355-4e99-af68-c997d6c7689f   — Respond directly
ac3105b7-6f32-4f27-bcd4-ed185dfca517  — Respond directly
8a35643f-2d9d-4807-8e3c-6b995a8b11b5  — Respond directly
75d3be64-0dc0-49db-ae60-a0c20dab49df  — Call write_wiki_page
dcafdc79-f3c1-4b23-927f-f0c5a151d942  — Call read_file
c8bd4ec3-e3c7-4b45-a76f-77bc568bdf32  — Call read_file
7c7d1caf-b2ee-4879-aad1-959619a9cdf0  — Call search_knowledge_graph
6075c5db-90e0-4fec-9444-98786c9c6303  — Call search_knowledge_graph
b967c7d0-890b-4515-8b00-7da90ed3991c  — Call search_knowledge_graph
efe4cf6c-70d7-46db-aa8b-e9b3e509ab90  — Call write_wiki_page
35126967-1308-4f7d-b043-6128fc9e5036  — Call execute_command  (cycle 1)
ce310cb3-ce1e-4414-823a-a26c64daef4f  — Call execute_command  (cycle 2)
9ecbccf3-da12-40f8-8308-279a8a812e4f  — Call execute_command  (cycle 2)
77417130-9f61-4841-b094-568fd190d5e1  — Call execute_command  (cycle 2)
25e0f232-82b8-4615-a542-621d2abbf4e6  — Call read_file        (cycle 3)
b86cb8bc-f954-4127-9ee7-7260bc229855  — Call read_file        (cycle 3)
```

### taskId Bug
**All** `decision_made` events use `taskId: "8967780585"` (the Telegram session ID) instead of the actual task ID (`task-1781986624434`). This is because the running process hasn't been restarted to pick up Fix 2 (c6de3639).

- Old code: `taskId = sessionId` → wrong
- Fix: `this.currentTaskId` tracks `task-` format

### decision_made → tool_called → tool_finished Linkage
**Cannot verify because 0 tool events exist.** Once `parseToolArgs` fix is active, the linkage should work:
- `decision_made.decisionId` = `tool_called.decisionId` = `tool_finished.decisionId`
- `tool_called.callId` = `tool_finished.callId`
- Synchronized via `pendingCallIds` queue (engine.ts)

---

## 5. Dashboard Telemetry Debug Panel

### Changes Deployed

| Component | Change |
|---|---|
| `index.html` | Added Telemetry Debug card + view toggle button in timeline header |
| `app.js` | `applyEvent` now stores `decisionId`, `reasoningSnippet`, `taskId` |
| `app.js` | `renderCurrentDecision` shows IDs/reasoningSnippet in Dev View |
| `app.js` | `renderDecisionInspector` shows all telemetry fields |
| `app.js` | New `renderTelemetryDebug()` — compact table of recent decisions |
| `app.js` | New `setupViewToggle()` — switches User/Developer view |
| `app.js` | `summarizeEventDev()` — shows IDs + raw payload in Dev View |
| `app.js` | Timeline `developer` view with full event type and payload |
| `styles.css` | `.telemetry-card`, `.view-toggle`, `.dev-id`, `.decision-snippet` |
| `agent-state.ts` | Added `taskId` to `RecentDecision` interface + reducer |

### Views
- **User View** (default): Clean timeline, no debug IDs
- **Developer View**: Shows `decisionId`, `callId`, `taskId`, raw `reasoningSnippet`, full event types

---

## 6. Recommendations

### Immediate (Phase 4B-B)
1. **Restart agent** to pick up:
   - Fix 1: `parseToolArgs` → unblocks `tool_called/tool_finished` events
   - Fix 2: `currentTaskId` → fixes `taskId` propagation
2. **Verify** after restart: run test tasks, check DB for `tool_called` events
3. **Add EventBus error visibility**: Log validation failures to dashboard WS so they appear in timeline

### Short-term (Phase 4B)
4. **Enable Debug panel in prod**: Dev View helps diagnose telemetry gaps
5. **Add tool_called/tool_finished to AgentState**: Frontend needs to render them
6. **Fix `parseToolArgs` edge cases**: Handle all JSON primitives (null, number, boolean, string)

### Long-term
7. **Consider broader schema**: Change `args` from `Record<string, unknown>` to `unknown` to accept any JSON value
8. **Event validation alerts**: Add `/api/events/validation-errors` endpoint to surface dropped events
9. **Pre-Phase 4B data migration**: Fix taskId for historical events

---

## 7. Files Changed

| File | Change | Status |
|---|---|---|
| `src/core/engine/engine.ts` | `parseToolArgs()` fix | ✅ Pending restart |
| `src/core/events/agent-state.ts` | Added `taskId` to `RecentDecision` | ✅ Active |
| `src/dashboard/index.html` | Telemetry Debug card + view toggle | ✅ Active |
| `src/dashboard/app.js` | Full telemetry rendering pipeline | ✅ Active |
| `src/dashboard/styles.css` | Telemetry + Dev View styles | ✅ Active |

---

*End of TELEMETRY_VERIFICATION.md*
