# CORAL Codebase Structure Report
**Generated:** 2026-06-21T04:16:24Z  
**Status:** Phase 4D — Cognitive Trace Viewer (Tab-based UI)  
**HEAD:** aa7f8036  
**Branch:** develop (54 commits ahead of origin)  
**Tests:** 378 PASS ✅

---

## 📊 Overview

| Metric | Value |
|--------|-------|
| **Total TS/JS Files** | 77 (2,320 LOC) |
| **Test Files** | 29 in `tests/` |
| **Test Status** | 378/378 PASS |
| **Dependencies** | 12 core packages |
| **Type System** | TypeScript 5.4.5 + Zod validation |
| **Runtime** | Node.js ESM + better-sqlite3 |
| **Portal** | Telegram (grammy) + Custom HTTP API |

---

## 🏗️ Architecture Layers

### **Layer 1: Core Engine** (`src/core/`)
Root domain logic, platform-agnostic. **Import rule: Cannot import `src/modules/`**

```
src/core/
├── engine/                    # Request → Response orchestrator
│   ├── engine.ts             # Main orchestrator (EngineRequest → EngineResponse)
│   ├── agent.ts              # Single agent instance
│   └── token-estimator.ts    # Token counting for cost/throttle
│
├── events/                    # Event sourcing layer
│   ├── bus.ts                # Event pub/sub
│   ├── store.ts              # SQLite event persistence
│   ├── trace-builder.ts      # Phase 4C: CognitiveTrace reconstruction (O(n log n))
│   ├── agent-state.ts        # State machine for agent lifecycle
│   ├── api.ts                # EventStore REST API (modified)
│   ├── http-server.ts        # HTTP server for events (modified)
│   ├── websocket.ts          # WebSocket bridge for live events
│   └── types.ts              # EventType, AgentEvent interfaces
│
├── memory/                    # Multi-layer memory system
│   ├── memory.ts             # Public API
│   ├── memory-store.ts       # Store abstraction
│   ├── memory-log.ts         # Event log layer
│   ├── memory-temporal.ts    # Time-based queries (decay, TTL)
│   └── sqlite-storage.ts     # SQLite backing store
│
├── cron/                      # Job scheduling
│   ├── cron-scheduler.ts     # Vitest-compatible scheduler
│   ├── monitor.ts            # Health checks, telemetry
│   └── index.ts              # Barrel export
│
├── security/                  # Auth & rate limiting
│   ├── privilege-guard.ts    # User/admin role checks
│   ├── rate-limiter.ts       # Token-bucket throttling
│   └── response-cache.ts     # Response memoization
│
├── llm/                       # Model adaptation layer
│   ├── model-adapter.ts      # Platform-specific (OpenAI, Anthropic, DeepSeek)
│   ├── prompt-builder.ts     # System/user/tool prompt assembly
│   └── provider-registry.ts  # Multi-provider configuration
│
├── tools/                     # Tool registry & execution
│   ├── tool-registry.ts      # Plugin loader, namespace
│   ├── tool-gateway.ts       # Tool execution + error handling
│   ├── filesystem.ts         # File I/O operations
│   ├── network.ts            # HTTP/fetch operations
│   ├── knowledge.ts          # Wiki/KB queries
│   ├── document.ts           # PDF/markdown parsing
│   ├── archive.ts            # Compression utilities
│   ├── search.ts             # Full-text search
│   ├── skills.ts             # Skill management
│   ├── system.ts             # Shell execution
│   ├── ast-scanner.ts        # Code analysis
│   ├── report.ts             # Report generation
│   ├── path-utils.ts         # Path normalization
│   ├── tool-pruner.ts        # Dead tool removal
│   └── _shared.ts            # Shared tool types
│
├── self-evolution/            # Phase 6: Learning system
│   ├── learner.ts            # Experience deduplication, ranking
│   ├── experience-store.ts   # Persistent learner state
│   ├── task-tracker.ts       # Task outcome tracking
│   └── index.ts              # Barrel export
│
├── observability/             # Tracing & debugging
│   ├── tracer.ts             # OpenTelemetry-like SDK (27 tests GREEN)
│   └── (no dependencies)
│
├── agents/                    # Multi-agent coordination
│   ├── agent-registry.ts     # Agent discovery & lifecycle
│   ├── delegate.ts           # Agent → Agent delegation
│   └── janitor.ts            # Resource cleanup (27 tests GREEN)
│
├── gateway/                   # Platform abstraction
│   ├── index.ts              # PlatformGateway interface
│   └── types.ts              # Request/response contracts
│
├── types.ts                   # Core domain types (no dependencies)
│   ├── LLMProviderConfig
│   ├── EngineRequest/Response
│   ├── ChatMessage
│   └── RequestConstraints (Tầng 1-4 brief layers)
│
├── context-compression.ts     # Message context reduction
├── audit-logger.ts            # Change audit trail
├── evolution.ts               # Phase 6 integration
├── hooks.ts                   # Lifecycle hooks
└── logger.ts                  # Structured logging
```

**Key Invariants:**
- ✅ Zero circular imports
- ✅ Type-driven: all interfaces defined in `types.ts`
- ✅ All operations testable in isolation

---

### **Layer 2: Modules** (`src/modules/`)
Platform adapters. **Import rule: Can import `core` via `../../core`**

```
src/modules/
└── telegram/                  # Telegram bot adapter
    ├── index.ts              # grammy integration
    ├── user-manager.ts       # User/admin registry (10 tests GREEN)
    └── activity-reporter.ts  # User activity tracking
```

**Constraints:**
- Cannot import `src/core/` directly — use barrel exports
- Cannot import other modules

---

### **Layer 3: Dashboard** (`src/dashboard/`)
Frontend for event visualization (Phase 4D).

```
src/dashboard/
├── index.html               # Tab-based UI (modified)
├── app.js                   # Event consumer, trace renderer (modified)
└── styles.css              # Scan beam, grid overlay (modified)
```

**Status:**
- Inspector: Right slide panel, SelectedEntity, no-fetch mode
- Cognitive Trace Viewer: Renders CognitiveTrace + DecisionTrace tabs
- Live event streaming via WebSocket

---

### **Layer 4: Scripts** (`src/scripts/`)
Utilities & initialization. **Import rule: Cannot import `src/core/`**

```
src/scripts/
└── start-telegram.ts        # Bootstrap Telegram bot
```

---

## 🧪 Test Suite (29 Files, 378 Tests PASS)

### Core Tests
| File | Tests | Status | Notes |
|------|-------|--------|-------|
| `trace-builder.test.ts` | 14 | ✅ 73ms | Phase 4C: CognitiveTrace linkage |
| `memory-recall.test.ts` | 10 | ✅ 76ms | Memory query patterns |
| `memory-core.test.ts` | 8 | ✅ 460ms | Store abstraction |
| `memory-log.test.ts` | 22 | ✅ 341ms | Event logging |
| `self-evolution.test.ts` | 16 | ✅ 127ms | Phase 6: Learning dedup |
| `tracer.test.ts` | 27 | ✅ 94ms | Observability SDK |
| `system.test.ts` | 20 | ✅ 366ms | Tool execution |
| `janitor.test.ts` | ? | ✅ | Resource cleanup |
| `user-manager.test.ts` | ? | ✅ | User registry |

### Integration Tests
| File | Status |
|------|--------|
| `evolution-integration.test.ts` | ✅ |
| `gateway.test.ts` | ✅ |
| `integration.test.ts` | ✅ |
| `events-bus.test.ts` | ✅ |
| `event-store.test.ts` | ✅ |
| `event-system.test.ts` | ✅ |

---

## 📦 Dependencies

### Runtime
```json
{
  "grammy": "^1.44.0",           // Telegram bot API
  "better-sqlite3": "^12.11.1",  // SQLite storage
  "langfuse": "^3.38.20",        // LLM observability
  "openai": "^6.37.0",           // OpenAI adapter
  "zod": "^4.4.3",               // Runtime validation
  "ws": "^8.21.0",               // WebSocket
  "dotenv": "^16.4.5",           // Environment config
  "mammoth": "^1.12.0",          // DOCX parsing
  "pdf-parse": "^2.4.5"          // PDF extraction
}
```

### Dev
```json
{
  "typescript": "^5.4.5",
  "vitest": "^3.2.4",
  "tsx": "^4.21.0",
  "ts-node": "^10.9.2"
}
```

---

## 🔄 Data Flow (Phase 4D)

```
User Input (Telegram)
    ↓
Engine.request(EngineRequest)
    ↓
PromptBuilder + ModelAdapter
    ↓
LLM API Call (9router, OpenAI, etc.)
    ↓
EventBus.publish({type, payload})
    ↓
EventStore.append(event) → SQLite
    ↓
TraceBuilder.buildCognitiveTrace(taskId)
    ↓
Dashboard WebSocket → Live UI Update
    ↓
UserManager tracks activity
    ↓
Self-Evolution records success/failure
```

---

## 📝 File Status (Modified, Unstaged)

```
modified: src/dashboard/app.js         (Event consumer update)
modified: src/dashboard/styles.css     (UI refinement)
modified: src/core/events/api.ts       (EventStore endpoint)
modified: src/core/events/http-server.ts (Server config)
```

**Action Required:** 
- [ ] Review dashboard UI changes (Phase 4D UI tabs)
- [ ] Verify event API compatibility
- [ ] Commit or stash before next phase

---

## 🎯 Phase Progress

| Phase | Feature | Status | Tests |
|-------|---------|--------|-------|
| 1-3 | Core engine, memory, LLM | ✅ Complete | 200+ |
| 4A | Decision intelligence | ✅ Complete | 30+ |
| 4B-A | Telemetry verification | ✅ Complete | 10+ |
| 4C | Trace Engine | ✅ Complete | 14/14 |
| **4D** | **Cognitive Trace UI** | 🔄 **In Progress** | Dashboard |
| 5 | Multi-agent coordination | 📋 Planned | — |
| 6 | Self-Evolution learner | 🔄 Wired | 16 |

---

## ⚠️ Known Issues / Blockers

| ID | Priority | Issue | Owner | Target |
|----|----------|-------|-------|--------|
| — | — | — | — | — |

**Status:** No blockers. Unstaged changes are exploratory (Phase 4D UI dev).

---

## 🚀 Next Steps

1. **Merge Phase 4D UI** → Review dashboard tabs, commit changes
2. **Phase 4D Testing** → Verify CognitiveTrace rendering on real events
3. **Phase 5 Planning** → Multi-agent orchestration (delegate.ts expansion)
4. **Phase 6 Integration** → Wire self-evolution feedback loop

---

**Generated by Tor @ 2026-06-21T04:16:24Z**
