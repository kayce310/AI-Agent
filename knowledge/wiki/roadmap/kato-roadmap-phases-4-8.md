# Kato Roadmap Phase 4-8 v2.0 — Optimized Lộ Trình

> **Phân tích lại sau khi reassess codebase thực tế.**
> Phase 3 đã hoàn thành: Tool Registry (9 plugins), memory-store (ADD-only), model-adapter (multi-provider), Agent, HookRegistry, evolution, tracer.
> Plan v1.1 có 3 giả định stale (tools.ts 1444 lines, memory-store mutate JSON, model-adapter chưa có) — **đã được validate lại.**

---

## 1. Reassessment: Plan v1.1 vs Thực Tế Code

| # | Plan v1.1 nói | Thực tế Code | Kết luận |
|---|--------------|-------------|----------|
| AI-1 | tools.ts (1444 lines) cần refactor vào registry | tools.ts chỉ còn **47 lines** (barrel exports). 9 plugin files đã tách. ToolRegistry đã dùng trong engine.ts | ❌ **Stale — đã xong từ Phase 3.1** |
| AI-2 | memory-store.ts dùng `fs.writeFileSync` overwrite | `memory-store.ts` dùng **`fs.writeFile`** (async) trong `flush()`. ADD-only *in-memory* đã đúng. Cần thêm append-log *persistence* | ⚠️ **Một nửa đúng — persistence vẫn là full-rewrite** |
| AI-3 | Không có ADR | Chưa có file | ✅ **Vẫn là gap** |
| Memory block types | Thiếu `'world'` type | Có `'human' | 'persona' | 'session' | 'task' | 'fact'` — đúng 6/6 Letta layers ngoại trừ `'world'` | ⚠️ **Thiếu 'world' type** |
| Model abstraction | Phase 6.3 quá muộn | `model-adapter.ts` (458 lines) đã có ModelRouter + 9router/Ollama/OpenAI/Anthropic adapters | ❌ **Đã có từ Phase 3.2 — không phải gap** |
| LiteLLM | Cần thêm | model-adapter đã có abstraction — chỉ cần thêm 1 adapter | 🟢 **Dễ thêm, không cần Phase riêng** |
| patterns/design | Phase 7.2 quá muộn | Engine đã dùng Strategy pattern qua ToolRegistry + HookRegistry | ⚠️ **Pattern cơ bản đã có, cần registry patterns execution** |

---

## 2. Lộ Trình Tối Ưu (Revised v2.0)

### Nguyên tắc
1. **Fix persistence trước** — memory-store flush() full-rewrite → append-log (1-2h)
2. **Thêm ADR ngay** — architectural debt không để tích tụ (30m)
3. **Build từ core ra** — Decomposer → MCP → Observability → SOP → Patterns → Security
4. **Rotation code từ Phase 4** — như plan gốc đã đúng

### Phase 4 — Memory & Tools Layer
| Sub-phase | Mô tả | Lines | Priority |
|-----------|-------|-------|----------|
| **4.0a** | memory-store: append-log persistence (thay flush full-rewrite) | 100 | 🔴 HIGH |
| **4.0b** | ADR creation (architecture-decisions.md) | 50 | 🔴 HIGH |
| **4.1a** | MCP client — gọi external AI tools (model_context_protocol) | 200 | 🟡 MED |
| **4.1b** | MCP server — expose Kato tools dưới dạng MCP resources | 200 | 🟡 MED |
| **4.2** | `World` block type cho memory-store + world store | 80 | 🟢 LOW |
| **Rotation** | Memory rotation (TTL 30d, importance filter) | 100 | 🟡 MED |

### Phase 5 — Deterministic Orchestration
| Sub-phase | Mô tả | Lines | Priority |
|-----------|-------|-------|----------|
| **5.1a** | `Decomposer` — 1 LLM call → structured task list (Bernstein pattern) | 150 | 🔴 HIGH |
| **5.1b** | `PlanExecutor` — execute task list tuần tự/parallel | 120 | 🟡 MED |
| **5.1c** | `ResultSynthesizer` — 1 LLM call → human response | 100 | 🟡 MED |
| **5.2a** | `CodeParser` — parse/sandbox LLM-generated code | 120 | 🟢 LOW |
| **5.2b** | `SandboxExecutor` — Docker/E2B sandbox execution | 180 | 🟢 LOW |
| **5.3a** | `AgentManager` — sub-agent lifecycle (spawn/kill/timeout) | 150 | 🟢 LOW |
| **5.4** | `Janitor` — verify step: tests, lint, PII scan | 120 | 🟢 LOW |

### Phase 6 — Observability + Cost
| Sub-phase | Mô tả | Lines | Priority |
|-----------|-------|-------|----------|
| **6.1a** | `LangfuseClient` — span hierarchy, token tracking | 120 | 🟡 MED |
| **6.1b** | Integrate tracer.ts với Langfuse spans | 80 | 🟡 MED |
| **6.2** | `PromptFooClient` — security scan, regression test | 150 | 🟢 LOW |
| **6.3** | `LiteLLMAdapter` — thêm vào model-adapter.ts (100+ providers) | 100 | 🟡 MED |
| **6.4a** | `CostTracker` — per-span token cost | 80 | 🟢 LOW |
| **6.4b** | `RateLimiter` — token/minute, request/minute | 80 | 🟢 LOW |
| **6.5** | `OllamaAdapter` — local model inference | 120 | 🟢 LOW |

### Phase 7 — SOPs + Design Patterns
| Sub-phase | Mô tả | Lines | Priority |
|-----------|-------|-------|----------|
| **7.1a** | `SOPRegistry` — YAML schema SOP templates | 80 | 🟡 MED |
| **7.1b** | `SOPEngine` — execute SOP step-by-step | 150 | 🟡 MED |
| **7.1c** | SOP template library (analyze, research, write) | 200 | 🟢 LOW |
| **7.2a** | `PatternRegistry` — Strategy pattern registry | 100 | 🟢 LOW |
| **7.2b** | `PatternSelector` — auto-select pattern from task type | 80 | 🟢 LOW |
| **7.2c** | 5 critical patterns: chaining, routing, parallel, code-exec, reflection | 250 | 🟢 LOW |
| **7.2d** | Pattern fallback chain | 50 | 🟢 LOW |

### Phase 8 — Production Polish  
| Sub-phase | Mô tả | Lines | Priority |
|-----------|-------|-------|----------|
| **8.1a** | `DockerSandbox` — isolated execution | 200 | 🟢 LOW |
| **8.1b** | Image lifecycle + resource quota | 100 | 🟢 LOW |
| **8.2a** | `InputGuard` — prompt injection scan | 120 | 🟢 LOW |
| **8.2b** | `OutputGuard` — response validation | 100 | 🟢 LOW |
| **8.2c** | `PrivilegeGuard` — per-tool access control | 80 | 🟢 LOW |
| **8.3a** | `ResponseCache` — LRU, TTL 1h | 100 | 🟢 LOW |
| **8.3b** | Cold start warmup | 80 | 🟢 LOW |

---

## 3. Priority Matrix (What to Build First)

```
P0 🔴 MUST HAVE (Phase 4.0)
├── 4.0a: memory-store append-log persistence (critical: hiện tại flush full-rewrite)
├── 4.0b: ADR — kiến trúc debt không để tích tụ
├── 4.1a: MCP client (tool mở rộng)
└── Rotation policy (chặn 2GB disk)

P1 🟡 SHOULD HAVE (Phase 5 → 6)
├── 5.1a: Decomposer (giảm 50% LLM calls)
├── 5.1b: PlanExecutor
├── 5.1c: ResultSynthesizer
├── 6.1a: LangfuseClient (observability)
└── 6.3: LiteLLMAdapter (100+ providers)

P2 🟢 NICE TO HAVE (Phase 5.2+ → 7 → 8)
├── Sandbox, AgentManager, Janitor
├── SOP Registry + Engine
├── Pattern Registry + Selector
├── Input/Output/Privilege Guard
└── DockerSandbox, ResponseCache
```

---

## 4. File Impact Summary (Sau Reassessment)

### New Files cần tạo

```
Phase 4.0 (ngay bây giờ):
  knowledge/wiki/core/architecture-decisions.md  (NEW — ADR)
  src/core/memory-log.ts                          (NEW — append-log persistence layer)

Phase 4.1:
  src/core/mcp-client.ts                          (NEW)
  src/core/mcp-server.ts                          (NEW)
  knowledge/blueprints/mcp-config.json            (NEW)

Phase 5:
  src/core/decomposer.ts                          (NEW)
  src/core/plan-executor.ts                       (NEW)
  src/core/result-synthesizer.ts                  (NEW)
  src/core/code-parser.ts                         (NEW)
  src/core/sandbox-executor.ts                    (NEW)
  src/core/sub-agent.ts                           (NEW)
  src/core/agent-manager.ts                       (NEW)
  src/core/janitor.ts                             (NEW)
  src/core/failure-classifier.ts                  (NEW)

Phase 6:
  src/core/langfuse-client.ts                     (NEW)
  src/core/promptfoo-client.ts                    (NEW)
  src/core/litellm-adapter.ts                     (NEW)
  src/core/cost-tracker.ts                        (NEW)
  src/core/rate-limiter.ts                        (NEW)
  src/core/ollama-adapter.ts                      (NEW)

Phase 7:
  src/core/sop-registry.ts                        (NEW)
  src/core/sop-engine.ts                          (NEW)
  src/core/pattern-registry.ts                    (NEW)
  src/core/pattern-selector.ts                    (NEW)
  src/core/patterns/*.ts                          (NEW)

Phase 8:
  src/core/docker-sandbox.ts                      (NEW)
  src/core/input-guard.ts                         (NEW)
  src/core/output-guard.ts                        (NEW)
  src/core/privilege-guard.ts                     (NEW)
  src/core/response-cache.ts                      (NEW)

Tests:
  tests/memory-log.test.ts
  tests/mcp-flow.test.ts
  tests/decomposer.test.ts
  tests/langfuse.test.ts
  tests/sop-engine.test.ts
  tests/patterns.test.ts
  tests/guardrails.test.ts
```

---

## 5. Bắt Đầu Triển Khai: Phase 4.0

### Bước 1: ADR — Architecture Decision Record (30 phút)
Tạo file `knowledge/wiki/core/architecture-decisions.md`
→ Ghi lại 5 ADR first: Deterministic Orchestration, ADD-only Memory, CodeAgent, Tool Registry, Event-Driven Engine

### Bước 2: Memory-Store Append-Log Persistence (1-2 giờ)
Tạo `src/core/memory-log.ts`:
- Append-log writer: ghi mỗi operation như 1 dòng JSON
- Log reader: replay từ log → rebuild memory state
- Migration: convert existing store.json blocks → log

### Bước 3: MCP Client (2 giờ)
Tạo `src/core/mcp-client.ts`:
- MCP spec v1.0 client
- Tool discovery từ external MCP servers
- Tích hợp vào ToolRegistry (verify + fallback)

### Bước 4: Rotation Policy (1 giờ)
Thêm vào memory-store.ts:
- `RotatableStore` interface
- `rotateBlocks()` gọi trước mỗi write
- TTL 30d + importance filter

---

> **Generated: 2026-05-16 | Roadmap v2.0 | Optimized after codebase reassessment**