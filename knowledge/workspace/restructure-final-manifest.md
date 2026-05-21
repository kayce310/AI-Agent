# 📐 Restructure Final Manifest — Kato Agent Core

> **Generated**: 2026-05-21 | **Status**: ✅ ~95% Complete
> **Consolidated from**: `restructure-plan.md` + `restructure-plan-vs-reality.md`

---

## 1. Mục tiêu

Tái tổ chức `src/core/` từ flat structure (66 files) → layered subdirectories (10 folders).

---

## 2. Cấu trúc đã đạt được ✅

```
src/core/
├── evolution.ts              ← Core utility (giữ nguyên tại root)
├── hooks.ts                  ← Core utility (giữ nguyên tại root)
├── index.ts                  ← Barrel export (giữ nguyên tại root)
├── types.ts                  ← Core utility (giữ nguyên tại root)
├── agents/                   ← 9 files (agent-manager, code-parser, docker-sandbox,
│                                 failure-classifier, janitor, sandbox-executor,
│                                 skill-runtime, skills-index-manager, sub-agent)
├── engine/                   ← 6 files (agent, decomposer, engine, orchestrator,
│                                 plan-executor, result-synthesizer)
├── gnap/                     ← 2 files (gnap-agent-card, gnap-queue)
├── llm/                      ← 4 files (llm, model-adapter, prompt-builder, provider-registry)
├── mcp/                      ← 2 files (mcp-client, mcp-server)
├── memory/                   ← 7 files (memory, memory-agentic, memory-compressor,
│                                 memory-log, memory-store, memory-temporal, state-manager)
├── observability/            ← 5 files (cost-tracker, eval-engine, langfuse-client,
│                                 promptfoo-client, tracer)
├── patterns/                 ← 20 files (16 patterns + index + composites)
├── security/                 ← 6 files (input-guard, output-guard, privilege-guard,
│                                 rate-limiter, response-cache, security-scanner)
├── sop/                      ← 4 files (pattern-registry, pattern-selector,
│                                 sop-engine, sop-registry)
└── tools/                    ← 13 files (_shared, archive, document, filesystem,
                                  knowledge, network, report, skills, system,
                                  tool-gateway, tool-pruner, tool-registry, tools)
```

---

## 3. Kết quả hoàn thành ✅

| Hạng mục | Kết quả | % |
|----------|---------|---|
| Tạo 10 subdirectories | 10/10 | 100% |
| Di chuyển files | 39/34 (thêm 5 file mới) | 100% |
| Xóa garbage files | 7/7 | 100% |
| Tạo gnap-agent-card.ts | ✅ | 100% |
| Thêm WorldBlock interface | ✅ | 100% |
| Files mới bonus (tool-gateway, skill-runtime, code-parser, janitor, docker-sandbox, security-scanner) | ✅ | — |

---

## 4. Còn sót lại ❌

| Việc | Chi tiết | Ưu tiên |
|------|----------|---------|
| Fix source file imports | `model-adapter.ts`, `tracer.ts`, `engine.ts` — old relative paths | **P1** |
| Fix test file imports | ~60 import paths cần cập nhật | **P1** |
| Verify `npx tsc --noEmit` | Chưa chạy thành công sau restructure | **P1** |
| Verify `npm run test` | 435 tests cần pass trên cấu trúc mới | **P1** |

---

## 5. Chi tiết import paths cần fix

### Source files:
- `src/core/llm/model-adapter.ts` — `./types.js` → `../types.js`, `./evolution.js` → `../evolution.js`
- `src/core/observability/tracer.ts` — `./hooks.js` → `../hooks.js`
- `src/core/engine/engine.ts` — nhiều old flat paths

### Test files (~60 patterns):
- `../src/core/agent.js` → `../src/core/engine/agent.js`
- `../src/core/plan-executor.js` → `../src/core/engine/plan-executor.js`
- `../src/core/result-synthesizer.js` → `../src/core/engine/result-synthesizer.js`
- `../src/core/eval-engine.js` → `../src/core/observability/eval-engine.js`
- `../src/core/hooks.js` → `../src/core/hooks.js` (giữ nguyên — đã ở root)
- `../src/core/langfuse-client.js` → `../src/core/observability/langfuse-client.js`
- `../src/core/model-adapter.js` → `../src/core/llm/model-adapter.js`
- *(full list trong `restructure-plan-remaining.md`)*

---

## 6. Garbage Collection — ĐÃ XÓA ✅

| File | Lý do |
|------|-------|
| `chunker.cjs` | Legacy, unused |
| `chunker.js` | Legacy, unused |
| `orchestrator.cjs` | Legacy, unused |
| `orchestrator-batch.js` | Legacy, unused |
| `task-queue.ts` | Legacy, unused |
| `task-manager.md` | Old doc |
| `control_state.json` | Orphaned state file |

---

*End of manifest. Còn lại: fix imports → verify → commit.*
