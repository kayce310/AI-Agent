# 🏛️ Kato Agent — Lịch sử Phát triển

> **Kato Agent** — từ monorepo sơ khai đến agentic workspace v1.0.0.
>
> Tài liệu này ghi lại toàn bộ hành trình phát triển qua 5 phiên bản chính, được tổng hợp từ git history của các nhánh đã archived.

---

## Tổng quan Tiến hóa

| Version | `src/` files | Tests | Patterns | Modules | Trạng thái |
|---------|:-----------:|:-----:|:--------:|---------|-----------|
| **old-main** | 15 | 0 | 0 | discord | 🗑️ Archived |
| **v5.0** | 93 | 0 | 5 | discord, doc, knowledge, report | 🗑️ Archived |
| **v6.0** | 97 | 21 | 5 | + GNAP, SOP, Observability, MCP | 🗑️ Archived |
| **v6.5** | 97 | 24 | 20 | + Agents, Memory Temporal, Tools, Security | 🗑️ Archived |
| **v1.0.0** | 191 | 24 | 20 | Full suite | ✅ Clean baseline |

---

## old-main (commit `bdee6928`)

**Trạng thái:** Sơ khai — chưa có modular structure.

```
src/ (15 files)
  index.ts
  core/
    chunker.cjs / chunker.js     ← CJS artifacts lẫn lộn
    control_state.json
    llm.ts
    memory-compressor.ts / memory.ts
    orchestrator.cjs / orchestrator.js
    task-manager.md / task-queue.ts
  modules/discord/index.ts
  scripts/
    extract_worker.cjs / extract_worker.js
```

**package.json:** `kato-agent v0.1.0` — MCP SDK, discord.js, dotenv, openai, pdf-parse.
**Tests:** ❌ Không có.
**CLINE.md:** ❌ Không có.

---

## v5.0 (commit `edc2d682`)

**Trạng thái:** Modular hóa lần đầu — 5 pattern files cơ bản.

**So với old-main — thêm:**
- 93 files trong `src/` (từ 15)
- 5 patterns: chaining, code-exec, parallel, reflection, routing
- Modules: document (converter, docx-parser, formula-extractor, pdf-parser), knowledge (md-archiver), report (generator, style-engine)
- `knowledge/wiki/` với AGENTS.md, index.md, skills/

**Còn thiếu:**
- ❌ Tests — `tests/` folder không tồn tại
- ❌ GNAP queue/task system
- ❌ SOP engine
- ❌ MCP client/server
- ❌ Observability (tracing, eval, cost-tracker)
- ❌ Agents system

---

## v6.0 (commit `b18e3536`)

**Trạng thái:** Architecture gap closure — ~69% hoàn chỉnh.

**So với v5.0 — thêm:**
- `src/core/gnap/` — gnap-agent-card, gnap-queue
- `src/core/sop/` — pattern-registry, pattern-selector, sop-engine, sop-registry
- `src/core/observability/` — cost-tracker, eval-engine, langfuse-client, tracer
- `src/core/mcp/` — mcp-client, mcp-server
- `tests/` — 21 test files (cache, code-parser, cost-tracker, eval-engine, event-system, guardrails, janitor, langfuse, litellm, mcp-flow, mcp-server, memory-log, orchestrator, patterns, rate-limiter, security-scanner, skill-runtime, sop-engine, tracer)
- Dependencies: `@modelcontextprotocol/sdk`, `langfuse`, `mammoth`, `@anthropic-ai/sdk`

**Còn thiếu:**
- ❌ 16 pattern files — chỉ có 5
- ❌ Agent-manager, sandbox, failure-classifier, skill-runtime, sub-agent
- ❌ Memory Temporal
- ❌ Tools framework

---

## v6.5 (commit `2c1d4240`)

**Trạng thái:** Gần hoàn chỉnh — 20 pattern files (+ index.ts).

**So với v6.0 — thêm:**
- `src/core/agents/` — agent-manager, code-parser, docker-sandbox, failure-classifier, janitor, sandbox-executor, skill-runtime, skills-index-manager, sub-agent
- `src/core/memory/` — memory-agentic, memory-compressor, memory-temporal
- `src/core/patterns/` — **full 16+ patterns** (adaptive-thinking, agent-workforce, chain-of-thought, chaining, code-exec, context-compression, dynamic-scaffolding, evaluation, human-in-the-loop, memory-augmented, multi-agent, orchestrator-workforce, parallel, reflection, routing, self-consistency, self-discovery, supervisor, tool-arbiter, tool-augmented)
- `src/core/tools/` — 15 tool files + tool-gateway, tool-pruner, tool-registry
- `src/core/security/` — output-guard, privilege-guard, response-cache, security-scanner
- `CLINE.md` bootloader — lần đầu xuất hiện
- Tests: thêm `gnap-queue.test.ts`, `memory-temporal.test.ts`, `tool-registry.test.ts`

**Còn sót:** CJS artifacts (chunker.cjs, orchestrator.cjs), ollama-adapter.ts (dead code), test-queue-demo.ts

---

## v1.0.0 (commit `758581ac` — **hiện tại**)

**Trạng thái:** Clean baseline — zero external tool branding, zero runtime artifacts.

**So với v6.5 — sạch hơn:**
- ✅ `git checkout --orphan` → 1 commit sạch, không lịch sử rác
- ✅ 9router/ tách ra standalone project
- ✅ 14 root files rác xóa (audit reports, one-time scripts, personal notes, runtime state)
- ✅ 0 external tool references — `CLINE.md` → `KATO.md`
- ✅ 0 vendor lock-in (Roo/CLINE mentions removed)
- ✅ 16 whitelist knowledge files — `knowledge/wiki/` chỉ giữ core skills
- ✅ `.git` size: 12.22 MB (giảm từ ~520 MB remote history)
- ✅ Tagged `v1.0.0`

### Cấu trúc hiện tại

```
kato-agent/
├── KATO.md                      # Bootloader / Operating rules
├── package.json                 # Dependencies
├── tsconfig.json                # TypeScript config
├── vitest.config.mjs            # Test framework
├── src/
│   ├── index.ts                 # Entry point
│   ├── core/
│   │   ├── agents/              # Agent-manager, janitor, skill-runtime, sub-agent, ...
│   │   ├── engine/              # ReAct loop, orchestrator, plan-executor
│   │   ├── gnap/                # Queue / task system
│   │   ├── llm/                 # LLM adapters, model router
│   │   ├── mcp/                 # MCP client + server
│   │   ├── memory/              # Store, Temporal, Agentic, Compressor
│   │   ├── observability/       # Tracing, eval, cost-tracker, promptfoo
│   │   ├── patterns/            # 20 pattern files
│   │   ├── security/            # Input/output guard, RBAC, rate-limiter
│   │   ├── sop/                 # SOP engine + pattern registry
│   │   └── tools/               # 15 tool plugins + gateway
│   ├── modules/
│   │   ├── discord/             # Discord bot adapter
│   │   ├── document/            # PDF/DOCX parser
│   │   ├── knowledge/           # Markdown archiver
│   │   └── report/              # Report generator
│   └── scripts/                 # State manager, start-discord
├── tests/                       # 24 test files
├── knowledge/
│   └── wiki/
│       ├── AGENTS.md
│       ├── index.md
│       ├── KATO.md              # Bootloader copy
│       ├── core/                # master-vision, llm-architecture, task-queue
│       └── skills/              # 11 core skills
└── .github/workflows/
    └── validate.yml             # CI pipeline
```

---

## Timeline

```
old-main (15 files, 0 tests)
  │
  ├─ Modular hóa, thêm modules doc/knowledge/report
  ▼
v5.0 (93 files, 0 tests, 5 patterns)
  │
  ├─ Thêm GNAP, SOP, Observability, MCP, tests (21)
  ▼
v6.0 (97 files, 21 tests, 5 patterns)     ← ~69% gap closure
  │
  ├─ Thêm Agents system, full patterns (16+),
  │  Memory Temporal, Tools framework, Security
  ▼
v6.5 (97 files, 24 tests, 20 patterns)    ← gần hoàn chỉnh
  │
  ├─ Squash → orphan commit → dọn rác → force push → tag
  ▼
v1.0.0 (191 files, 24 tests, clean)       ← ✅ hiện tại
```

---

*Tài liệu được tổng hợp từ git history của các nhánh đã archived (v5.0, v6.0, v6.5) và remote old-main.*
*Cập nhật lần cuối: 2026-05-22*