# REPORT: Decision Data Analysis

> **Date**: 2026-06-21  
> **Database**: `data/coral.db`  
> **Event Period**: 2026-06-20 18:13 → 20:06 UTC  
> **Phase**: Pre-Phase 4B Investigation

---

## 1. Raw Event Counts

| Event Type | Count | Status |
|-----------|-------|--------|
| task_started | 18 | ✅ Normal |
| task_finished | 16 | ✅ 2 orphans (never finished) |
| decision_made | 9 | ✅ Phase 4A fix working |
| tool_called | 0 | ❌ **BUG** |
| tool_finished | 0 | ❌ **BUG** |
| file_created | 0 | (pre-Phase 4A, not tracked) |
| error | 0 | ✅ No errors in DB |
| **TOTAL** | **43** | |

### ⚠️ CRITICAL BUG: 0 tool_called/tool_finished Events

**Root cause**: `toolCall.function.arguments` is a JSON **string** (e.g., `'{"query":"hello"}'`), but `ToolCalledSchema.args` expects `z.record(z.string(), z.unknown())` (an object). Zod validation fails → event silently dropped.

**Evidence**:
```
Agent emits tool:call with:
  toolArgs: toolCall.function.arguments  →  '{"query":"hello"}'  (STRING)

ToolCalledSchema expects:
  args: z.record(z.string(), z.unknown())  →  {query: "hello"}  (OBJECT)

Result: ZodError → validation.valid=false → event not stored
```

**Impact**: No tool execution events exist in SQLite. The entire tool→result→decision chain is invisible. Only decision_made events survived (they don't have the `args` field issue).

**Fix required**: Parse `toolArgs` with `JSON.parse()` before passing to EventFactory, or change schema to accept `z.union([z.string(), z.record(...)])`.

---

## 2. Task Type Distribution

### By Response Type

| Type | Count | % | Description |
|------|-------|---|-------------|
| Direct response | 13 | 72% | LLM answered without tools |
| Single-tool | 1 | 6% | 1 tool call (write_wiki_page) |
| Multi-tool | 1 | 6% | 5 tool calls in 1 task |
| Orphaned | 2 | 11% | Started but never finished |
| Pre-tracking | 1 | 6% | Finished before event tracking |

**Note**: Direct response dominance (72%) is likely inflated because:
1. Early tasks (before Phase 2) had no decision_made emission for direct path
2. The bot primarily handles conversational queries in Vietnamese
3. "Self-referential shortcut" (isSelfReferential) bypasses tools for identity/about questions

### The Multi-Tool Task (Real Chain Pattern)

The only multi-tool task: *"ok được đấy. bạn biết bạn được tôi phát triển để làm gì không?"*

```
TASK START
  ├─ Decision #1 → Call search_knowledge_graph  (reason: "The user (Kayce) is asking if I know...")
  ├─ Decision #2 → Call search_knowledge_graph  (reason: same — duplicate query!)
  ├─ Decision #3 → Call read_file               (reason: "No results from knowledge graph.")
  ├─ Decision #4 → Call read_file               (reason: same — duplicate query!)
  ├─ Decision #5 → Call read_file               (reason: "Now I have a much better understanding.")
  └─ *** BOT CRASHED — No task_finished ***
```

**Key observations**:
- 5 decisions, 3 unique tool types (search_knowledge_graph ×2, read_file ×3)
- Reasoning snippets show actual LLM thinking process ✅
- Duplicate tool calls (search×2, read×2) — no deduplication
- Bot crashed during this task (exit code 1)

---

## 3. Averages (from tracked data only)

| Metric | Value | Calculation |
|--------|-------|-------------|
| Decisions per task (with tracking) | 1.8 | 9 decisions / 5 tasks |
| Direct:Tool ratio | 3:1 | 3 direct : 1 tool-using task |
| Multi-cycle tasks | 1/5 | Only 1 task had >1 decision |
| Avg cycles per tool-task | 3.0 | 6 decisions / 2 tool-using tasks |

### Full Task List

| # | Goal | Status | Decisions | Type |
|---|------|--------|-----------|------|
| 1 | Test task | ❌ orphan | 0 | — |
| 2 | Hello | ✅ | 0 | direct |
| 3 | tìm hiểu về J.A.R.V.I.S | ✅ | 0 | direct |
| 4 | Liệt kê hệ thống Jarvis | ❌ orphan | 0 | — |
| 5 | xong chưa? | ✅ | 0 | direct |
| 6 | task trước đó là gì? | ✅ | 0 | direct |
| 7 | [conversation context] | ✅ | 0 | direct |
| 8 | Liệt kê hệ thống Jarvis | ✅ | 0 | direct |
| 9 | hoạt ảnh não Jarvis | ✅ | 0 | direct |
| 10 | Hiện lên dashboard | ✅ | 0 | direct |
| 11 | Cho prompt codebase | ✅ | 0 | direct |
| 12 | bạn là ai? | ✅ | 0 | direct |
| 13 | đa năng đến mức nào? | ✅ | 1 | **direct** |
| 14 | session task riêng không? | ✅ | 1 | **direct** |
| 15 | biết tôi là ai? | ✅ | 1 | **direct** |
| 16 | ghi nhớ tôi là Kayce | ✅ | 1 | **single-tool** |
| 17 | nếu ai đó nói là dev? | ✅ | 0 | direct |
| 18 | phát triển để làm gì? | ❌ crash | 5 | **multi-tool** |

---

## 4. Decision Chain Patterns

### Pattern A: Direct Response (72%)
```
User → [task_started] → LLM → finishReason:'stop' → [decision_made: Respond directly] → [task_finished]
```
- Single cycle, no tools
- Decision reason: "Respond directly" (no LLM reasoning captured for early tasks)

### Pattern B: Single Tool (6%)
```
User → [task_started] → LLM → finishReason:'tool_calls' → [decision_made: Call X] → Tool Execution → LLM → finishReason:'stop' → [task_finished]
```
- 1 tool cycle
- Example: "ghi nhớ tôi là Kayce" → write_wiki_page

### Pattern C: Multi-Tool Chain (6%)
```
User → [task_started] → LLM → Decision → Tool → LLM → Decision → Tool → ... → CRASH
```
- 5 cycles observed
- Each cycle: new reasoning → new tool call
- **Bot crashed before completion**

### Pattern D: Orphaned (11%)
```
User → [task_started] → ??? → (no task_finished)
```
- Likely killed during development/testing

---

## 5. Decision Intelligence Quality

### reasoningSnippet — Real Data

The 5-decision task captured actual LLM thinking:

```json
{
  "decision": "Call search_knowledge_graph",
  "reason": "The user (Kayce) is asking if I know what they developed me for.",
  "reasoningSnippet": "The user (Kayce) is asking if I know what they developed me for.
Let me check what I know from memory and knowledge base.

From the memory context, I can see:
- Kayce is the developer
- They're interested in J.A.R.V.I.S., AI agents, hologram effects
- They asked about Jarvis brain effects, dashboard from agent data
- They're building an AI agent system

Let me check the knowledge base for more context about the project purpose."
}
```

**Assessment**: reasoningSnippet captures genuine LLM chain-of-thought. This is valuable data for the Decision Timeline UI.

### Phase 4A Fix Verification

| Feature | Status | Evidence |
|---------|--------|----------|
| decisionId in decision_made | ✅ | All 9 events have UUID decisionId |
| decisionId in tool events | N/A | No tool events stored (validation bug) |
| reasoningSnippet | ✅ | Present in 5 multi-tool decisions |
| Direct path decision_made | ✅ | 3 direct responses have decisions |
| reason field | ✅ | Real reasoning for multi-tool, "Respond directly" for direct |
| summarizeReasoning() | ✅ | First-sentence extraction working (160 chars) |

---

## 6. Conclusion

### A. Decision Trace IS the right direction ✅

**Why Decision Trace works:**
1. **Decision-centric view is more useful than task-centric** — the same task can have 0, 1, or 5 decisions. The decision is the atomic unit of agent cognition.
2. **reasoningSnippet captures genuine LLM thinking** — not just "what tool" but "why this tool".
3. **decisionId provides clean linkage** — decision → tool_call → tool_result chain is well-defined.
4. **Multi-cycle tasks show progression** — search→fail→read→understand is a meaningful cognitive arc.

**Why Cognitive Activity View is NOT needed separately:**
- Decision Trace already IS cognitive activity tracking — each decision captures reasoning
- Adding a separate "cognitive view" would duplicate the same data
- Decision Timeline UI is sufficient if it shows reasoning prominently

### B. BUT data quality bugs must be fixed first

| Bug | Severity | Fix |
|-----|----------|-----|
| tool/tool_finished missing (args string vs object) | **CRITICAL** | Parse args in engine.ts before EventFactory |
| taskId mismatch (all decisions use "8967780585" instead of task-XXX) | **HIGH** | Use taskId from request.sessionId, not sessionId |
| Duplicate tool calls (same tool×2) | **MEDIUM** | Add deduplication or tool-call budget |
| No file_created/fileModified events | **MEDIUM** | Verify file event hook wiring |
| 2 orphaned tasks | **LOW** | Add task timeout/cleanup |
| **taskId mismatch** (decisions use session ID "8967780585" instead of task-XXX) | **HIGH** | engine.ts uses `sessionId` as taskId for decision events, but task_started uses `task-${Date.now()}`. Decisions can't be linked to parent tasks. |

### C. Recommended Architecture for Phase 4B

```
Decision Timeline (F2 Mission Mode)
├── Task Card
│   ├── Goal (from task_started)
│   ├── Duration
│   ├── Status (success/fail/orphan/crash)
│   └── Decision Chain
│       ├── Decision #1
│       │   ├── decision (e.g., "Call search_knowledge_graph")
│       │   ├── reason (first sentence, ≤160 chars)
│       │   ├── reasoningSnippet (full thinking, ≤1000 chars) — EXPAND ON CLICK
│       │   └── Tool Result
│       │       ├── toolName
│       │       ├── args (parsed from JSON)
│       │       ├── success
│       │       └── result (truncated preview)
│       ├── Decision #2
│       │   └── ...
│       └── Decision #N
```

### D. What NOT to Build (yet)

- ❌ Decision DAG / parent-child chains — no evidence of branching decisions
- ❌ "Why Did Agent Do This" button — reasoningSnippet already answers this
- ❌ Cognitive Activity separate view — Decision Timeline IS cognitive tracking
- ❌ Cycle visualization — tool loops are linear (no DAG evidence in data)

### E. Data Validation After Bug Fix

After fixing the args validation bug, run the bot with 5-10 tool-calling queries and re-run this analysis to get proper tool event data.

---

## Appendix: Database Schema

```sql
CREATE TABLE agent_events (
  id TEXT PRIMARY KEY,
  timestamp INTEGER NOT NULL,
  type TEXT NOT NULL,
  payload TEXT NOT NULL,        -- JSON
  metadata TEXT,                -- JSON (optional)
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL,     -- Telegram group ID or test harness ID
  user_id TEXT NOT NULL,
  role TEXT NOT NULL,           -- 'user' | 'assistant' | 'system'
  content TEXT NOT NULL,
  tokens INTEGER DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

**Event type distribution in SQLite**: 18 + 16 + 9 = 43 total (0 tool events due to bug).
