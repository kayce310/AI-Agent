# Structure Violations Report

> **Generated:** 2026-05-30T15:34:00Z
> **Validator:** `npx tsx scripts/validate-structure.ts --strict` — ✅ PASS (0 errors, 0 warnings)
> **Scope:** Full `src/` tree (recursive) + `scripts/` + `knowledge/workspace/` state files
> **Method:** Actual import graph analysis (not `@imported-by` annotations — those are stale docs)

---

## Summary

| Priority | Count | Status |
|----------|-------|--------|
| P0 | 0 | — |
| P1 | 1 | Open |
| P2 | 6 | Open |
| P3 | 0 | — |
| **Total** | **7** | |

---

## P1 Violations

### P1-1: `scripts/` imports `core/` — KATO.md import rule violation

| Field | Value |
|-------|-------|
| **File** | [`src/scripts/coral-state-manager.ts:8`](d:/AI-Agent/src/scripts/coral-state-manager.ts) |
| **Code** | `import { CoralStateManager, ProcessedFile } from '../core/memory/state-manager.js';` |
| **Rule** | KATO.md: `scripts/` → `core/` is ❌ forbidden — no exceptions |
| **Impact** | Script is no longer standalone; creates untracked dependency that blocks future core refactoring |
| **Fix** | Extract `CoralStateManager` to a shared utility, or duplicate the needed logic in the script layer |
| **Owner** | — |
| **Target session** | next |

---

## P2 Violations

### P2-1: Dead code — `orchestrator.ts` (259 lines)

| Field | Value |
|-------|-------|
| **File** | [`src/core/engine/orchestrator.ts`](d:/AI-Agent/src/core/engine/orchestrator.ts) |
| **Fact** | Removed from `engine.ts` in prior session (commits `f7f950e`, `6ebe64c1`, `f28fac77`). No file in `src/` imports it. Only `src/core/index.ts:18` re-exports it, but nothing imports that export. |
| **Impact** | Dead code increases maintenance surface |
| **Fix** | Delete file + remove re-export from `src/core/index.ts:18` |
| **Owner** | — |
| **Target session** | next |

### P2-2: Dead code — `agent-manager.ts` (390 lines)

| Field | Value |
|-------|-------|
| **File** | [`src/core/agents/agent-manager.ts`](d:/AI-Agent/src/core/agents/agent-manager.ts) |
| **Fact** | No file in `src/` imports it. `@imported-by orchestrator.ts` is stale. |
| **Impact** | Dead code |
| **Fix** | Delete file |
| **Owner** | — |
| **Target session** | next |

### P2-3: Dead code — `boot.ts` (97 lines)

| Field | Value |
|-------|-------|
| **File** | [`src/core/engine/boot.ts`](d:/AI-Agent/src/core/engine/boot.ts) |
| **Fact** | Only `coral-state-manager.ts` (script, P1-1) imports it. No runtime `src/` consumer. `@imported-by orchestrator.ts` is stale. |
| **Impact** | Dead code (unless script dependency is resolved) |
| **Fix** | Delete file after resolving P1-1 |
| **Owner** | — |
| **Target session** | next |

### P2-4: Dead code — `decomposer.ts`, `plan-executor.ts`, `result-synthesizer.ts`

| Field | Value |
|-------|-------|
| **Files** | [`src/core/engine/decomposer.ts`](d:/AI-Agent/src/core/engine/decomposer.ts), [`src/core/engine/plan-executor.ts`](d:/AI-Agent/src/core/engine/plan-executor.ts), [`src/core/engine/result-synthesizer.ts`](d:/AI-Agent/src/core/engine/result-synthesizer.ts) |
| **Fact** | Only imported by `orchestrator.ts` (dead). Re-exported by `src/core/index.ts:19-21` but nothing imports those exports. |
| **Impact** | Dead code |
| **Fix** | Delete 3 files + remove re-exports from `index.ts:19-21` |
| **Owner** | — |
| **Target session** | next |

### P2-5: Dead code — `gnap-queue.ts`, `memory-compressor.ts`, `skill-runtime.ts`

| Field | Value |
|-------|-------|
| **Files** | [`src/core/gnap/gnap-queue.ts`](d:/AI-Agent/src/core/gnap/gnap-queue.ts), [`src/core/memory/memory-compressor.ts`](d:/AI-Agent/src/core/memory/memory-compressor.ts), [`src/core/agents/skill-runtime.ts`](d:/AI-Agent/src/core/agents/skill-runtime.ts) |
| **Fact** | `@imported-by engine.ts` is stale — engine.ts no longer imports any of these. No other consumer in `src/`. |
| **Impact** | Dead code. Note: `memory-compressor.ts` could solve the 118 messages / 66k tokens issue if integrated into `agent.ts` `executeReActLoop()`. |
| **Fix** | Delete files, or integrate `memory-compressor.ts` into agent.ts |
| **Owner** | — |
| **Target session** | next |

### P2-6: Missing `checkpoint.json` and `processed-files.json`

| Field | Value |
|-------|-------|
| **Path** | `knowledge/workspace/checkpoint.json` — does not exist |
| **Path** | `knowledge/workspace/processed-files.json` — does not exist |
| **Fact** | `knowledge/workspace/` contains only `evolution.json` and `.coral-ast-cache.json`. KATO.md requires these files at `knowledge/workspace/`. |
| **Impact** | Checkpoint protocol incomplete; `coral-state-manager scan/mark` may fail |
| **Fix** | Create both files per KATO.md schema |
| **Owner** | — |
| **Target session** | next |

---

## Verified Clean (no violations)

| Area | Status |
|------|--------|
| `validate-structure.ts --strict` | ✅ 0 errors, 0 warnings |
| `engine.ts` imports | ✅ Only imports from `core/` layer, no `modules/` |
| `engine.ts` → `agent.ts` | ✅ Single ReAct loop, no orchestrator bypass |
| `gateway/index.ts` imports | ✅ Only from `core/` |
| `modules/discord/index.ts` imports | ✅ Only from `core/` via relative path |
| `start-discord.ts` imports | ✅ Engine + Gateway + DiscordBridge (no orchestrator) |
| Import direction `modules/` → `core/` | ✅ Via relative `../../core` paths |
| Import direction `core/` → `modules/` | ✅ None found |
| `knowledge/` executable code | ✅ None found |

---

## Import Graph (Runtime)

```
src/scripts/start-discord.ts
  ├── src/modules/discord/index.ts  (DiscordBridge)
  ├── src/core/engine/engine.ts     (Engine)
  └── src/core/gateway/index.ts     (CoralGateway)

src/core/engine/engine.ts
  ├── src/core/memory/memory.ts
  ├── src/core/memory/memory-store.ts
  ├── src/core/llm/provider-registry.ts
  ├── src/core/llm/prompt-builder.ts
  ├── src/core/tools/tool-registry.ts
  ├── src/core/tools/tool-pruner.ts
  ├── src/core/types.ts
  ├── src/core/evolution.ts
  ├── src/core/llm/model-adapter.ts
  ├── src/core/engine/agent.ts
  ├── src/core/hooks.ts
  ├── src/core/security/privilege-guard.ts
  ├── src/core/security/response-cache.ts
  ├── src/core/observability/tracer.ts
  ├── src/core/security/rate-limiter.ts
  ├── src/core/memory/memory-temporal.ts
  ├── src/core/memory/memory-log.ts
  └── src/core/memory/memory-agentic.ts

src/core/engine/agent.ts
  ├── src/core/hooks.ts
  ├── src/core/llm/model-adapter.ts
  ├── src/core/tools/tool-registry.ts
  ├── src/core/tools/tool-pruner.ts
  ├── src/core/evolution.ts
  ├── src/core/observability/tracer.ts
  └── src/core/agents/janitor.ts
```

---

## Obsidian Links

- [[master-vision]] — Project vision and architecture
- [[llm-architecture]] — LLM adapter and model routing
- [[architecture-decisions]] — ADR log
- [[soul]] — Agent identity and behavior rules
- [[task-queue]] — Task queue design

---

> **KATO.md Rule 9:** There is no such thing as "pre-existing", "acceptable", or "non-blocking" violations.
> Every violation has a priority, an owner, and a target session.
