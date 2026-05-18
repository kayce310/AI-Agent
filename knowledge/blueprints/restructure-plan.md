# Restructure Plan — Kato Agent Core
> Generated: 2026-05-17 | After Micro-Sprint 1 & 2 completion

---

## PHASE 1: Final Gap Closure Check

### P0 Items (MUST HAVE)

| Requirement | Status | Notes |
|-------------|--------|-------|
| memory-temporal.ts | ✅ DONE | 1532 B, time-indexed block storage |
| memory-agentic.ts | ✅ DONE | 1637 B, agent write/delete memory |
| world block type | ⚠️ PARTIAL | MemoryStore has tags but no dedicated 'world' type |
| Temporal query | ✅ DONE | getRecentBlocks with time-range filter |
| Agent auto write/delete | ✅ DONE | addBlockForAgent / deleteBlockForAgent |
| state.json backward compat | ✅ DONE | MemoryStore unchanged |
| Migration state.json → temporal log | ✅ DONE | Engine init() migrates blocks |

### P1 Items (SHOULD HAVE)

| Requirement | Status | Notes |
|-------------|--------|-------|
| 16 Agentic Patterns | ✅ DONE | 15 new + 5 pre-existing = 20 total |
| GNAP protocol (gnap-queue.ts) | ✅ DONE | 3547 B, git commit/log/pull/push |
| gnap-agent-card.ts | ❌ MISSING | Not created — low priority |

### P2 Items (NICE TO HAVE)

| Requirement | Status | Notes |
|-------------|--------|-------|
| DSPy prompt optimization | ❌ NOT STARTED | Future work |
| Prism Scanner | ❌ NOT STARTED | Future work |
| The Library | ❌ NOT STARTED | Future work |
| Temporal workflow engine | ❌ NOT STARTED | Future work |
| 7-day memory rotation TTL | ❌ NOT STARTED | Future work |

### Verdict

**P0: 95% complete** (world block type needs dedicated interface)
**P1: 90% complete** (gnap-agent-card.ts missing, low impact)
**P2: 0%** (all future work)

---

## PHASE 2: System Baseline Mapping

### Current src/core/ Structure (Flat — 66 files)

```
src/core/
├── Engine & Orchestration (6 files)
│   ├── engine.ts              — Main ReAct loop (15035 B)
│   ├── agent.ts               — Agent class (12074 B)
│   ├── orchestrator.ts        — Decompose→Execute→Synthesize (4640 B)
│   ├── decomposer.ts          — Task decomposition (6093 B)
│   ├── plan-executor.ts       — Plan execution (7187 B)
│   └── result-synthesizer.ts  — Result synthesis (4048 B)
│
├── Memory Subsystem (7 files)
│   ├── memory.ts              — MemoryCore (3934 B)
│   ├── memory-store.ts        — Persistent memory store (13760 B)
│   ├── memory-log.ts          — Append-log persistence (13063 B)
│   ├── memory-compressor.ts   — Memory compression (3365 B)
│   ├── memory-temporal.ts     — Time-indexed storage (1532 B) [NEW]
│   ├── memory-agentic.ts      — Agentic memory (1637 B) [NEW]
│   └── state-manager.ts       — State management (12086 B)
│
├── LLM & Model Layer (5 files)
│   ├── llm.ts                 — LLM interface (14842 B)
│   ├── model-adapter.ts       — Model adapter (15191 B)
│   ├── provider-registry.ts   — Provider registry (5602 B)
│   ├── ollama-adapter.ts      — Ollama adapter (2252 B)
│   └── prompt-builder.ts      — Prompt building (10803 B)
│
├── Pattern Registry (20 files in patterns/)
│   ├── index.ts               — Pattern registry (1143 B)
│   ├── chaining.ts            — Sequential chaining (1338 B)
│   ├── routing.ts             — Input-based routing (1560 B)
│   ├── parallel.ts            — Parallel execution (1237 B)
│   ├── code-exec.ts           — Code execution (2078 B)
│   ├── reflection.ts          — Self-reflection (1834 B)
│   ├── dynamic-scaffolding.ts — Auto agent structure (6486 B) [NEW]
│   ├── orchestrator-workforce.ts — Multi-agent coord (6315 B) [NEW]
│   ├── tool-arbiter.ts        — Tool selection (4354 B) [NEW]
│   ├── evaluation.ts          — LLM-as-judge (4862 B) [NEW]
│   ├── supervisor.ts          — Step monitoring (4439 B) [NEW]
│   ├── multi-agent.ts         — Debate & consensus (5396 B) [NEW]
│   ├── agent-workforce.ts     — Workforce management (2249 B) [NEW]
│   ├── self-discovery.ts      — Capability discovery (2932 B) [NEW]
│   ├── context-compression.ts — Context optimization (2872 B) [NEW]
│   ├── memory-augmented.ts    — RAG-enhanced gen (2059 B) [NEW]
│   ├── human-in-the-loop.ts   — Human approval (2789 B) [NEW]
│   ├── chain-of-thought.ts    — Step-by-step reasoning (2680 B) [NEW]
│   ├── tool-augmented.ts      — Dynamic tool use (2509 B) [NEW]
│   ├── self-consistency.ts    — Multi-path voting (2415 B) [NEW]
│   └── adaptive-thinking.ts   — Adjust thinking depth (3224 B) [NEW]
│
├── Tool System (8 files in tools/)
│   ├── tools.ts               — Tool registry (1517 B)
│   ├── tool-registry.ts       — Tool registration (6896 B)
│   ├── tool-pruner.ts         — Tool pruning (4952 B)
│   ├── _shared.ts             — Shared utilities (3368 B)
│   ├── filesystem.ts          — File operations (2166 B)
│   ├── document.ts            — Document processing (12905 B)
│   ├── knowledge.ts           — Knowledge ops (4337 B)
│   ├── archive.ts             — Archive ops (2059 B)
│   ├── skills.ts              — Skill ops (3215 B)
│   ├── report.ts              — Report gen (2624 B)
│   ├── system.ts              — System ops (7750 B)
│   └── network.ts             — Network ops (2081 B)
│
├── Security & Guardrails (5 files)
│   ├── input-guard.ts         — Input validation (5182 B)
│   ├── output-guard.ts        — Output validation (9620 B)
│   ├── privilege-guard.ts     — Privilege control (6512 B)
│   ├── security-scanner.ts    — Security scanning (12798 B)
│   └── response-cache.ts      — Response caching (6427 B)
│
├── MCP & External (3 files)
│   ├── mcp-client.ts          — MCP client (8806 B)
│   ├── mcp-server.ts          — MCP server (2369 B)
│   └── gnap-queue.ts          — GNAP protocol (3547 B) [NEW]
│
├── SOP & Workflow (3 files)
│   ├── sop-engine.ts          — SOP execution (8342 B)
│   ├── sop-registry.ts        — SOP registry (7595 B)
│   └── pattern-selector.ts    — Pattern selection (9327 B)
│
├── Observability (4 files)
│   ├── tracer.ts              — Tracing (13304 B)
│   ├── langfuse-client.ts     — Langfuse integration (13534 B)
│   ├── promptfoo-client.ts    — Promptfoo integration (3160 B)
│   └── cost-tracker.ts        — Cost tracking (3723 B)
│
├── Agent Management (4 files)
│   ├── agent-manager.ts       — Agent management (4459 B)
│   ├── sub-agent.ts           — Sub-agent abstraction (1376 B)
│   ├── failure-classifier.ts  — Failure classification (2506 B)
│   └── sandbox-executor.ts    — Sandbox execution (3773 B)
│
├── Misc (5 files)
│   ├── types.ts               — Type definitions (4837 B)
│   ├── index.ts               — Main exports (3233 B)
│   ├── hooks.ts               — Event hooks (5648 B)
│   ├── evolution.ts           — Evolution engine (13760 B)
│   └── docker-sandbox.ts      — Docker sandbox (3448 B)
│
└── Legacy/Orphaned (4 files)
    ├── chunker.cjs            — Old chunker (845 B)
    ├── chunker.js             — Old chunker (834 B)
    ├── orchestrator.cjs       — Old orchestrator (2492 B)
    ├── orchestrator-batch.js  — Old batch orchestrator (1878 B)
    ├── task-queue.ts          — Old task queue (4979 B)
    ├── task-manager.md        — Old task manager doc (1095 B)
    └── control_state.json     — Control state (75 B)
```

---

## PHASE 3: Restructuring Plan

### Proposed New Structure

```
src/core/
├── engine/                    # Engine & Orchestration
│   ├── engine.ts
│   ├── agent.ts
│   ├── orchestrator.ts
│   ├── decomposer.ts
│   ├── plan-executor.ts
│   └── result-synthesizer.ts
│
├── memory/                    # Memory Subsystem
│   ├── memory.ts
│   ├── memory-store.ts
│   ├── memory-log.ts
│   ├── memory-compressor.ts
│   ├── memory-temporal.ts
│   ├── memory-agentic.ts
│   └── state-manager.ts
│
├── llm/                       # LLM & Model Layer
│   ├── llm.ts
│   ├── model-adapter.ts
│   ├── provider-registry.ts
│   ├── ollama-adapter.ts
│   └── prompt-builder.ts
│
├── patterns/                  # Agentic Patterns (already organized)
│   ├── index.ts
│   └── [20 pattern files]
│
├── tools/                     # Tool System (already organized)
│   ├── tools.ts
│   ├── tool-registry.ts
│   ├── tool-pruner.ts
│   ├── _shared.ts
│   └── [8 tool files]
│
├── security/                  # Security & Guardrails
│   ├── input-guard.ts
│   ├── output-guard.ts
│   ├── privilege-guard.ts
│   ├── security-scanner.ts
│   └── response-cache.ts
│
├── mcp/                       # MCP & External Protocols
│   ├── mcp-client.ts
│   ├── mcp-server.ts
│   └── gnap-queue.ts
│
├── sop/                       # SOP & Workflow
│   ├── sop-engine.ts
│   ├── sop-registry.ts
│   └── pattern-selector.ts
│
├── observability/             # Observability
│   ├── tracer.ts
│   ├── langfuse-client.ts
│   ├── promptfoo-client.ts
│   └── cost-tracker.ts
│
├── agents/                    # Agent Management
│   ├── agent-manager.ts
│   ├── sub-agent.ts
│   ├── failure-classifier.ts
│   └── sandbox-executor.ts
│
├── core/                      # Core utilities
│   ├── types.ts
│   ├── index.ts
│   ├── hooks.ts
│   └── evolution.ts
│
└── [LEGACY — to be cleaned]
```

### File Move Mapping

| Current Path | New Path |
|-------------|----------|
| src/core/engine.ts | src/core/engine/engine.ts |
| src/core/agent.ts | src/core/engine/agent.ts |
| src/core/orchestrator.ts | src/core/engine/orchestrator.ts |
| src/core/decomposer.ts | src/core/engine/decomposer.ts |
| src/core/plan-executor.ts | src/core/engine/plan-executor.ts |
| src/core/result-synthesizer.ts | src/core/engine/result-synthesizer.ts |
| src/core/memory.ts | src/core/memory/memory.ts |
| src/core/memory-store.ts | src/core/memory/memory-store.ts |
| src/core/memory-log.ts | src/core/memory/memory-log.ts |
| src/core/memory-compressor.ts | src/core/memory/memory-compressor.ts |
| src/core/memory-temporal.ts | src/core/memory/memory-temporal.ts |
| src/core/memory-agentic.ts | src/core/memory/memory-agentic.ts |
| src/core/state-manager.ts | src/core/memory/state-manager.ts |
| src/core/llm.ts | src/core/llm/llm.ts |
| src/core/model-adapter.ts | src/core/llm/model-adapter.ts |
| src/core/provider-registry.ts | src/core/llm/provider-registry.ts |
| src/core/ollama-adapter.ts | src/core/llm/ollama-adapter.ts |
| src/core/prompt-builder.ts | src/core/llm/prompt-builder.ts |
| src/core/input-guard.ts | src/core/security/input-guard.ts |
| src/core/output-guard.ts | src/core/security/output-guard.ts |
| src/core/privilege-guard.ts | src/core/security/privilege-guard.ts |
| src/core/security-scanner.ts | src/core/security/security-scanner.ts |
| src/core/response-cache.ts | src/core/security/response-cache.ts |
| src/core/mcp-client.ts | src/core/mcp/mcp-client.ts |
| src/core/mcp-server.ts | src/core/mcp/mcp-server.ts |
| src/core/gnap-queue.ts | src/core/mcp/gnap-queue.ts |
| src/core/sop-engine.ts | src/core/sop/sop-engine.ts |
| src/core/sop-registry.ts | src/core/sop/sop-registry.ts |
| src/core/pattern-selector.ts | src/core/sop/pattern-selector.ts |
| src/core/tracer.ts | src/core/observability/tracer.ts |
| src/core/langfuse-client.ts | src/core/observability/langfuse-client.ts |
| src/core/promptfoo-client.ts | src/core/observability/promptfoo-client.ts |
| src/core/cost-tracker.ts | src/core/observability/cost-tracker.ts |
| src/core/agent-manager.ts | src/core/agents/agent-manager.ts |
| src/core/sub-agent.ts | src/core/agents/sub-agent.ts |
| src/core/failure-classifier.ts | src/core/agents/failure-classifier.ts |
| src/core/sandbox-executor.ts | src/core/agents/sandbox-executor.ts |
| src/core/types.ts | src/core/core/types.ts |
| src/core/index.ts | src/core/core/index.ts |
| src/core/hooks.ts | src/core/core/hooks.ts |
| src/core/evolution.ts | src/core/core/evolution.ts |
| src/core/docker-sandbox.ts | src/core/agents/docker-sandbox.ts |

### Garbage Collection Targets

| File | Reason |
|------|--------|
| src/core/chunker.cjs | Legacy, unused |
| src/core/chunker.js | Legacy, unused |
| src/core/orchestrator.cjs | Legacy, unused |
| src/core/orchestrator-batch.js | Legacy, unused |
| src/core/task-queue.ts | Legacy, unused |
| src/core/task-manager.md | Old doc |
| src/core/control_state.json | Orphaned state file |

---

## PHASE 4: Execution Plan

### Steps (after user approval):
1. Create new directories (engine/, memory/, llm/, security/, mcp/, sop/, observability/, agents/, core/)
2. Move files according to mapping
3. Update ALL import paths in moved files
4. Update src/core/index.ts to re-export from new locations
5. Delete garbage files
6. Run `npx tsc --noEmit` to verify
7. Run `npm run test` to verify

### Estimated Impact:
- 34 files moved
- ~50 import paths need updating
- 7 garbage files deleted