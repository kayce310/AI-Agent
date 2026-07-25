# Coral Agent — System Overview

> **Purpose:** This document gives another AI agent a complete mental model of Coral — what it is, how it's built, how data flows, what works, what doesn't, and what pitfalls exist. Read this before touching the codebase.

---

## 1. What Coral Is

Coral is a **TypeScript/Node.js AI agent** that:
- Receives messages from **Telegram** (primary) via grammY bot framework
- Routes them through a **ReAct (Reason+Act) loop** powered by any OpenAI-compatible LLM
- Executes **tool calls** (filesystem, shell commands, HTTP fetch, file write)
- Maintains **persistent memory** (append-log store + cognitive memory)
- Exposes a **real-time dashboard** (port 8766) via WebSocket
- Runs **background cron jobs** (health checks, memory consolidation, proactive suggestions)
- Has **3-layer security** (injection detection, identity lock, privilege guard)

**In one sentence:** Coral is a Telegram bot with an AI brain that can read/write files, execute commands, remember context across sessions, and show its thinking on a live dashboard.

**Owner/developer:** Kayce (VN, C/embedded background). Coral is supervised by Hermes Agent (a separate AI system at `D:\hermes`).

---

## 2. Tech Stack

| Layer | Technology |
|-------|-----------|
| Language | TypeScript/ESM (Node.js) |
| Bot framework | grammY (Telegram) |
| LLM integration | OpenAI SDK (compatible with any OpenAI-format API) |
| Database | better-sqlite3 (SQLite WAL mode) |
| Web dashboard | Vanilla JS + Three.js, served via `ws` + `http` |
| Build | `npx tsc` (no bundler, no framework) |
| Tests | vitest, 837+ tests |
| Entry point | `src/scripts/start-telegram.ts` → `dist/scripts/start-telegram.js` |

**Key dependencies:** `grammy` (Telegram), `openai` (LLM), `better-sqlite3` (SQLite), `ws` (WebSocket), `zod` (schema validation), `puppeteer` (browser automation).

**Run command:** `npm start` (prestart hook runs `npm run build` → `npx tsc`, then `node dist/scripts/start-telegram.js`).

**Always set heap:** `node --max-old-space-size=2048 dist/scripts/start-telegram.js` (default 1.4GB is too tight for Coral's init).

---

## 3. Architecture — 6 Layers

```
┌─────────────────────────────────────────────────────┐
│  PLATFORM (Telegram, Discord, future IoT)           │
│  src/modules/telegram/                              │
│  - message handling, session management, commands   │
│  - dual-handler (message:text + channel_post:text)  │
│  - HITL inline keyboard approvals                   │
├─────────────────────────────────────────────────────┤
│  SERVICES (Cron, Proactive, World Model)            │
│  src/core/cron/, src/core/proactive/, src/core/world│
│  - periodic jobs (health, memory flush, cleanup)    │
│  - context-aware suggestions (time-based rules)     │
│  - system/file/network probes (30s poll)            │
├─────────────────────────────────────────────────────┤
│  KNOWLEDGE (Semantic Memory, Graph, Entities)       │
│  src/core/knowledge/                                │
│  - entity extraction, semantic search, graph query  │
├─────────────────────────────────────────────────────┤
│  AGENT (ReAct Loop, Tools, Orchestration)           │
│  src/core/agent/, src/core/tools/                   │
│  - executeReActLoop() — max 15 cycles, 120s timeout │
│  - 9 tool plugins (filesystem, system, network...)  │
│  - tool registry with Zod schemas                   │
├─────────────────────────────────────────────────────┤
│  ENGINE (Core Processing, LLM Routing)              │
│  src/core/engine/, src/core/llm/                    │
│  - Engine.process(request) — main API               │
│  - ModelRouter — provider selection + fallback      │
│  - PromptBuilder — system prompt construction       │
│  - CircuitBreaker — zombie retry protection         │
├─────────────────────────────────────────────────────┤
│  CORE (Events, Memory, Security)                    │
│  src/core/events/, src/core/memory/, src/core/security│
│  - EventBus → EventStore (SQLite) → WebSocket       │
│  - MemoryFacade → append-log store                  │
│  - 3-layer security (PrivilegeGuard, MissionLock, HITL)│
└─────────────────────────────────────────────────────┘
```

---

## 4. Message Flow (End-to-End)

```
User sends message on Telegram
  │
  ▼
Gateway.handleAdapterMessage(adapterMsg)     ← SINGLE ENTRY POINT
  │
  ├─ missionLock.validateMessage(text, userId)  ← BLOCK INJECTION
  │    └─ Regex injection detection + boundary check
  │    └─ If blocked → return warning, write audit event
  │
  ├─ Route to Telegram adapter
  ▼
TelegramBridge.onMessage()
  │
  ├─ Read session (SessionManager: Map<userId, {active, history[]}>)
  ├─ Append user message to session history
  ├─ Memory recall: globalMemoryStore.query(text, topK=10)
  │    └─ Keyword-overlap scoring, excludes tool-source blocks
  │
  └─ coralAgent.process({ sessionId, messages, task, ... })
       │
       ▼
  Engine.process(request)
       │
       ├─ PromptBuilder.build() — 8-tier system prompt + memory context
       ├─ ModelRouter.route() — select LLM provider
       ├─ Call LLM (OpenAI SDK, streaming)
       │    └─ CircuitBreaker wraps model call (3 failures → OPEN 60s)
       ├─ Parse response
       │    ├─ If tool_call → execute tool → loop back to LLM
       │    ├─ If final text → return response
       │    └─ Max 15 cycles, 120s hard timeout
       └─ CheckpointStore: start → cycle → complete/failed
  │
  ▼
Gateway → TelegramBridge → sendMessage to user
  │
  └─ EventBus: task_completed event → EventStore → WebSocket → Dashboard
```

**Two code paths (legacy vs active):**
- **ACTIVE:** `Gateway → TelegramBridge.onMessage() → coralAgent.process()` (Hermes-style, all messages go to AI)
- **DEAD:** `TelegramMessageHandler.handleMessage()` — still in codebase but NOT called. Do NOT add features here.

---

## 5. Key Components

### 5.1 Engine (`src/core/engine/engine.ts`)
- Main API: `process(request: EngineRequest)` — NOT `handleMessage()`
- `flush()` — periodic save (non-destructive, keeps connections open)
- `cleanup()` — shutdown only (closes SQLite permanently, NEVER call from cron)
- Manages the ReAct loop: LLM call → parse → tool exec → repeat

### 5.2 Agent (`src/core/engine/agent.ts`)
- Wraps Engine with checkpoint lifecycle
- `executeReActLoop()` — the actual loop with cycle counting + timeout
- Circuit breaker integration (prevents zombie retry loops)

### 5.3 Tools (`src/core/tools/`)
| Tool | File | What it does |
|------|------|-------------|
| `read_file` | filesystem.ts | Read files under WORKSPACE_ROOT |
| `list_directory` | filesystem.ts | List directory contents |
| `write_file` | filesystem.ts | Write/create files (auto-creates parent dirs) |
| `execute_command` | system.ts | Run shell commands via execFileSync (no shell redirect) |
| `fetch_url` | network.ts | HTTP requests |
| Tool registry | registry.ts | Loads all plugins, registers schemas + executors |
| Tool gateway | tool-gateway.ts | Zero-trust file I/O wrapper (path safety) |

### 5.4 Memory System
```
User message
  │
  ├─ MemoryRetrievalGate.shouldRecallMemory(text)
  │    └─ Skip greetings/filler (<8 chars)
  │    └─ Always retrieve on memory keywords
  │    └─ Fail-open on error, zero LLM cost
  │
  ├─ globalMemoryStore.query(text, topK=10, sessionId)
  │    └─ Keyword-overlap scoring (NOT FTS5 MATCH despite index existing)
  │    └─ Source filter: exclude raw tool blocks (noisy + injection risk)
  │
  └─ MemoryConsolidation.tick() every 20 messages
       └─ LLM summarizes → fact blocks (importance 0.8) + episode blocks (0.6)
```

**Storage:** Append-log in SQLite (`mem_blocks` table). Blocks carry `source: { type, uri }` provenance. Max 5K blocks with TTL-based eviction.

**Key limitation:** `query()` uses simple keyword overlap, not semantic/vector search. No embedding model is used for retrieval.

### 5.5 Security (3 Layers)

| Layer | File | What it does |
|-------|------|-------------|
| **MissionLock** | mission-lock.ts | Input injection detection, system prompt lock (immutable identity), response identity drift detection |
| **PrivilegeGuard** | privilege-guard.ts | Tool-level RBAC + path traversal prevention. Uses alias/category patterns, not direct tool names |
| **HITL** | hitl.ts | Human-In-The-Loop for destructive actions. Classifies dangerous commands, creates approval requests with 5-min TTL, Telegram inline keyboard approve/reject |

**RiskGate** (`risk-gate.ts`) wraps PrivilegeGuard + whitelist into ALLOW/ASK/DENY classification.

### 5.6 Dashboard (`src/dashboard/`)

**6 tabs, 3,486 lines, Vanilla JS (no framework, no bundler):**
1. **MISSION** — Current goal, active tools, decisions, timeline
2. **TRACE** — Cognitive trace, MCP trace, cost tracking
3. **FOCUS** — Streaming reasoning (typewriter effect)
4. **MEMORY** — 3-panel: search/filter → list → detail + mini graph
5. **GRAPH** — SVG knowledge graph visualization
6. **HOLOGRAM** — Three.js 3D neural network (120 nodes, 400 particles)

**Data flow:** Engine → EventBus → EventWebSocket → `ws://host/ws/events` → Browser `app.js` → `renderAllFromState()`

**Architecture:** `index.html` (layout) + `styles.css` (3,260 lines) + `app.js` (1,759 lines, monolithic) + `brain-tab.js` (861 lines) + `memory-tab.js` (598 lines) + `i18n.js` (268 lines).

**Known issues:** Monolithic app.js, zero tests, full re-render on every WS event, no TypeScript, no framework.

### 5.7 Platform Layer

**Telegram integration** (`src/modules/telegram/`):
- Dual handler: `message:text` (DMs/groups) + `channel_post:text` (channels)
- Session management: active session + archived sessions per user
- Commands: `/new`, `/sessions`, `/switch`, `/status`, `/list`, `/cancel`, `/dashboard`, `/world`
- Activity reporting: typing indicator + 👀 reaction (no heartbeat — removed due to conflict with streaming thinking)
- i18n: VN/EN toggle via `data-i18n` attributes

**⚠️ Critical pattern:** Features that edit messages (like streaming thinking via `onThinking`) MUST be wired in BOTH handlers. Missing the `channel_post` handler = channel users get no updates.

---

## 6. Configuration

### Providers (`config/providers.json`)
```json
{
  "providers": [{
    "name": "openrouter",
    "type": "openai-compat",
    "baseUrl": "https://openrouter.ai/api/v1",
    "apiKey": "...",
    "models": [
      {"id": "anthropic/claude-sonnet-4", "maxTokens": 8192, "tier": 1}
    ]
  }]
}
```

**⚠️ Provider pitfalls:**
- `NINE_ROUTER_API_BASE` env var overrides config — unset it when changing providers
- tsx caches modules — clear `node_modules/.cache .tsx-cache` after config changes
- Old `buildDefaultRouter()` had hardcoded `'9router'` string — now fixed to read from config
- Circuit breaker: 3 consecutive LLM failures → OPEN (60s cooldown) → HALF_OPEN → CLOSED

### Environment Variables
| Variable | Purpose |
|----------|---------|
| `TELEGRAM_BOT_TOKEN` | Bot token |
| `TELEGRAM_ALERT_CHAT_ID` | Chat ID for alerts + HITL approvals |
| `TELEGRAM_ALWAYS_REPLY_CHANNELS` | Channel IDs where bot always replies |
| `CORAL_DASHBOARD` | Set `1` to auto-start dashboard on boot |
| `NINE_ROUTER_API_BASE` | ⚠️ Overrides provider config if set |
| `WORKSPACE_ROOT` | Base path for file tools (default: project root) |

---

## 7. Event System

```
EventBus.publish(AgentEvent)
  │
  ├─ EventStore.append() → SQLite (agent_events table, auto-prune 14 days / 10K rows)
  │
  ├─ EventWebSocket → broadcast to connected browsers
  │    ├─ On connect: { type: 'init', state: currentState, events: bus.getRecent(200) }
  │    └─ On event: { type: 'event', event, state: reduceEvent(currentState, event) }
  │
  └─ Other subscribers (logging, alerting)
```

**Event types:** `task_started`, `task_completed`, `tool_called`, `tool_finished`, `llm_request`, `llm_response`, `memory_stored`, `decision_made`, `error`, `mission_injection`, `proactive_rule_triggered`.

---

## 8. Cron & Background Tasks

**CronScheduler** (`src/core/cron/cron-scheduler.ts`):
- setInterval-based, each job has timeout guard
- Persistent via CronStore (SQLite: `cron_jobs` + `cron_runs` tables)
- `enabled` field controls timer start — NOT the `running` field (that's an execution lock)
- API: `enableJob(name)`, `disableJob(name)` for runtime toggle

**Built-in jobs:**
| Job | Interval | What |
|-----|----------|------|
| health-check | 6h | Disk, memory, port liveness |
| memory-flush | 1h | Flush in-memory store to SQLite |
| memory-cleanup | 30min | Remove expired blocks |
| proactive-tick | 30min | Time-based suggestion rules |

**⚠️ Never call `engine.cleanup()` from cron** — it closes SQLite permanently. Use `engine.flush()`.

---

## 9. What Works vs What Doesn't

### ✅ Working
- Telegram message processing (ReAct loop with tool calls)
- File read/write/execute tools
- Persistent memory with recall and consolidation
- Real-time dashboard (6 tabs, WebSocket)
- Cron jobs (health, memory, proactive)
- Session management (active + archived, cross-platform)
- HITL approval for destructive actions
- Circuit breaker (zombie retry protection)
- Checkpoint/crash recovery (P1-P5 all implemented)
- Background task queue (SQLite-backed)
- Context window management (importance-scored eviction)
- **Cross-platform command architecture** (`src/core/commands/`):
  - Platform-agnostic `CommandRegistry` singleton (Hermes-inspired)
  - Builtin commands: help, status (with dashboard/tunnel info), model, sessions
  - `PLATFORM_HINTS` in PromptBuilder — LLM biết đang nói chuyện qua platform nào
  - Telegram adapter delegates generic commands to core registry
- **State-Driven Task Plan** (Phase 3-4): 47 tests, stagnation tracking, IntentionGuard
- **Error classifier** — transient/permanent/security classification
- **967+ tests passing**

### ⚠️ Partially Working / Known Issues
- **Streaming tool_calls capture:** LLM promises to use tool but tool_call is silently dropped during streaming (delta accumulation bug in `model-adapter.ts`)
- **Memory query:** Uses keyword overlap, not semantic/vector search (FTS5 index exists but `query()` doesn't use `MATCH`)
- **DelegationOrchestrator:** Exists but unhooked from message path. Stub that returns confirmation text without real processing.
- **Sentiment analysis:** Dead code — never imported from production path. Safe to delete.
- **Dashboard performance:** Full re-render on every WS event (up to 300 DOM ops/sec at high event rates)
- **Dashboard:** Monolithic app.js (1,759 lines), zero tests, no TypeScript
- **Entity extractor / Semantic memory:** Incomplete implementations

### ❌ Not Implemented
- Vector/embedding-based memory search
- True background agent execution (no Hermes-style `delegate_task(background=true)`)
- Dashboard tests
- Prompt versioning / A/B testing
- Tool change detection (schema validation)
- Discord / CLI adapters (architecture ready, adapters chưa implement)

---

## 10. Critical Pitfalls (Read Before Coding)

1. **`engine.cleanup()` is SHUTDOWN ONLY.** Cron jobs must use `engine.flush()`. Calling cleanup from cron closes SQLite → all requests fail.

2. **`engine.process()` not `handleMessage()`.** The public API is `process(request: EngineRequest)`. `handleMessage()` doesn't exist.

3. **Dual Telegram handler.** Any feature editing messages must be wired in BOTH `message:text` AND `channel_post:text` handlers.

4. **Dashboard: revert immediately if broken.** `git checkout -- src/dashboard/` to last known-good commit. Never push full layout redesigns without visual verification.

5. **Provider config has shadow layers.** Env vars (`NINE_ROUTER_API_BASE`) override `config/providers.json`. tsx caches modules. Always clear cache + unset conflicting env vars when changing providers.

6. **`CronJob.running` is NOT an on/off toggle.** It's an execution lock (true while handler runs). Use `enabled: false` to disable a job, or `cronScheduler.disableJob(name)`.

7. **WebSocket `ws://` on HTTPS pages is blocked.** Frontend must detect `location.protocol` and use `wss://` for HTTPS. Both `app.js` and `brain-tab.js` need this.

8. **`Object.assign(agentState, msg.state)` destroys frontend state.** Use whitelist or spread with backend-only keys.

9. **`PrivilegeGuard` uses alias patterns, not tool names.** `guard.check('read_file')` returns false — check `TOOL_ALIAS_MAP` or use `'filesystem:*'` category patterns.

10. **Memory recall is bounded (topK=10).** Don't add routing layers or classifiers — the overhead is ~1.1% of context window, not worth the complexity.

---

## 11. Project Layout

```
D:\AI-Agent\
├── src/
│   ├── core/
│   │   ├── engine/        # Engine, Agent, CircuitBreaker
│   │   ├── llm/           # ModelRouter, PromptBuilder, ProviderRegistry
│   │   ├── tools/         # Tool plugins + registry
│   │   ├── memory/        # MemoryFacade, MemoryStore, Consolidation
│   │   ├── security/      # PrivilegeGuard, MissionLock, HITL, RateLimiter
│   │   ├── events/        # EventBus, EventStore, EventTypes
│   │   ├── knowledge/     # SemanticMemory, GraphQuery, EntityStore
│   │   ├── cron/          # CronScheduler, CronStore, Monitor
│   │   ├── proactive/     # ProactiveEngine (time-based suggestions)
│   │   ├── world/         # WorldModel (system probes)
│   │   ├── orchestrator/  # DelegationOrchestrator (unhooked)
│   │   ├── checkpoint.ts  # CheckpointStore (crash recovery)
│   │   ├── task-queue.ts  # Background task queue (SQLite)
│   │   ├── context-window.ts  # Token budget management
│   │   ├── risk-gate.ts   # ALLOW/ASK/DENY classification
│   │   └── gateway/       # Gateway (single entry point)
│   ├── modules/
│   │   └── telegram/      # Bot, commands, session, HITL, activity
│   ├── platform/
│   │   └── telegram/      # Legacy message-handler (DEAD PATH)
│   ├── dashboard/         # Frontend (Vanilla JS + Three.js)
│   ├── scripts/
│   │   ├── start-telegram.ts   # Entry point
│   │   └── start-telegram-lite.ts  # Lite mode (20s timeout)
│   └── dashboard/         # DashboardServer (HTTP + WebSocket)
├── tests/                 # vitest, 837+ tests
├── config/                # providers.json
├── dist/                  # Compiled JS (npx tsc output)
├── references/            # Architecture docs, post-mortems, patterns
├── CLEANUP_NOTES.md       # Items needing human decision
├── package.json           # npm start = build + run
└── tsconfig.json
```

---

## 12. Testing

```bash
npm run test              # Full suite (837+ tests)
npx vitest run --filter="sentiment"  # Filtered
npx vitest run tests/agent/react-loop.test.ts  # Specific file
```

**Live testing pattern:** Send message to Telegram channel → wait 15-60s → poll `http://127.0.0.1:8766/api/state` → record response. Do NOT use browser for dashboard checks — use curl.

---

## 13. Memory Footprint (Windows, baseline)

| Component | RAM |
|-----------|-----|
| V8 Heap | ~280 MB |
| MemoryStore (2,576 blocks) | ~30 MB |
| memories.json cache | ~25 MB |
| Module code (tsx cache) | ~130 MB |
| Native addons (better-sqlite3) | ~180 MB |
| **Total working set** | **~463 MB** |
| **Peak during heavy tasks** | **~1.2 GB** |

**Minimum for ARM deployment:** 2GB (Orange Pi Zero 3) for Hermes + Coral combined.

---

## 14. Current State (July 2026)

- **Latest commits:** Cleanup phase — removed orphan modules (smarthome, adapters, resilience, observability, duplicate entity-approval)
- **Active codebase:** TypeScript/ESM, 837+ tests, all 5 long-running task phases implemented
- **Primary platform:** Telegram only
- **LLM backend:** Any OpenAI-compatible API via providers.json
- **Dashboard:** v1 (Vanilla JS), functional but monolithic
- **Development style:** Ponytail philosophy — minimal code, known ceilings, explicit upgrade paths. Comments prefixed with `// ponytail:` mark intentional shortcuts.

---

*Last updated: 2026-07-22. Source of truth: `D:\AI-Agent` codebase + `coral-architecture` skill.*
