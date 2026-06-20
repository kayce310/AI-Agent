# Deep Analysis Plan — Coral Agent System v6.0

> **Purpose:** Phân tích toàn diện hệ thống Coral Agent đến lớp sâu nhất, hiểu rõ từng khía cạnh kiến trúc, nguyên lý vận hành, và cách các thành phần tương tác.
>
> **Methodology:** Mỗi mặt sẽ được phân tích theo cấu trúc: Khái niệm → Cấu trúc code → Nguyên lý hoạt động → Luồng dữ liệu → Điểm mạnh/yếu → Liên kết với các mặt khác.
>
> **Created:** 2026-06-05 | **Author:** Coral Analysis Agent

---

## Tổng quan: 16 mặt phân tích của một Agent System

Một hệ thống agent hoàn chỉnh cần được xét trên các mặt sau:

| # | Mặt phân tích | Mô tả | File/Vị trí chính |
|---|---|---|---|
| 1 | **Identity & Soul** | Bản sắc, mục đích, vai trò của agent | `KATO.md`, `AGENTS.md`, `core/soul.md` |
| 2 | **Architecture Layers** | Các tầng kiến trúc, phân tách Control/Data Plane | `KATO.md` (Structure Map), toàn bộ `src/` |
| 3 | **Engine & ReAct Loop** | Vòng lặp suy luận-hành động cốt lõi | `src/core/engine/engine.ts`, `agent.ts` |
| 4 | **Orchestration Pipeline** | Decompose → Execute → Synthesize | `src/core/engine/orchestrator.ts` |
| 5 | **Memory Systems** | Cách agent ghi nhớ (3+ loại memory) | `src/core/memory/*` |
| 6 | **Tool System** | Plugin tools, registry, pruning, security | `src/core/tools/*` |
| 7 | **LLM & Model Routing** | Multi-provider, cascade fallback | `src/core/llm/*` |
| 8 | **Security System** | Privilege guard, rate limiter, response cache | `src/core/security/*` |
| 9 | **Event System (Hooks)** | Lifecycle events, guards, plugins | `src/core/hooks.ts` |
| 10 | **Gateway & Adapters** | Multi-platform (Discord, CLI, etc.) | `src/core/gateway/*`, `src/modules/*` |
| 11 | **Evolution Engine** | Self-improvement từ lỗi, DAG cycle detection | `src/core/evolution.ts` |
| 12 | **Skill System** | Agent skills library (27+ skills) | `knowledge/agents-skills/*` |
| 13 | **State & Checkpoint** | Persistence, recovery, snapshot | `knowledge/workspace/`, `scripts/` |
| 14 | **Observability** | Tracing, metrics, monitoring | `src/core/observability/*` |
| 15 | **Knowledge Base** | Wiki, memory stores, vector store | `knowledge/wiki/*`, `knowledge/memory-store/*` |
| 16 | **Configuration & Providers** | LLM providers, runtime config | `config/providers.json`, `src/core/llm/provider-registry.ts` |

---

## Phân tích chi tiết từng mặt

### Mặt 1: Identity & Soul — Bản sắc Agent

**Khái niệm:**
Agent không chỉ là code — nó có **bản sắc** (identity) được định nghĩa qua các file triết lý. Coral định nghĩa mình là "Coral Agent — an orchestration agent managing a TypeScript monorepo with layered architecture".

**Cấu trúc:**
- `KATO.md` — Bootloader Protocol: Control Plane, luật vận hành, checkpoint protocol
- `knowledge/wiki/AGENTS.md` — Agent Router & Role Routing: định nghĩa role, trạng thái, hành vi
- `knowledge/wiki/core/soul.md` — Triết lý sâu: Zero Waste Token, Plane Separation

**Nguyên lý:**
1. **Trạng thái khởi tạo:** `UNINITIALIZED` → boot sequence → `READY`
2. **Role hiện tại:** Lead AI Engineer
3. **Triết lý tối thượng:** Zero Waste Token (không load file không cần thiết)
4. **Phân tách:** Control Plane (KATO.md) vs Data Plane (knowledge base)

**Liên kết:**
- Identity quyết định skill nào được load (Mặt 12)
- Boot sequence định nghĩa trong KATO.md điều khiển Engine (Mặt 3)
- Triết lý Zero Waste Token ảnh hưởng mọi quyết định

---

### Mặt 2: Architecture Layers — Các tầng kiến trúc

**Khái niệm:**
Hệ thống được tổ chức theo **6 tầng (Framework 6 Layers)** + **Plane Separation** (Control/Data).

**Cấu trúc:**

```
┌──────────────────────────────────────────────────────┐
│                   GATEWAY LAYER                       │
│          (src/core/gateway/, src/modules/)            │
│   DiscordBridge · CoralGateway · PlatformAdapter       │
├──────────────────────────────────────────────────────┤
│                    CORE ENGINE                        │
│  ┌──────────────────────────────────────────────────┐│
│  │   ENGINE LAYER (engine/)                         ││
│  │   Engine · Agent · Orchestrator · Decomposer     ││
│  │   PlanExecutor · ResultSynthesizer · Boot        ││
│  ├──────────────────────────────────────────────────┤│
│  │   LLM LAYER (llm/)                               ││
│  │   ModelRouter · ProviderRegistry · PromptBuilder ││
│  ├──────────────────────────────────────────────────┤│
│  │   MEMORY LAYER (memory/)                         ││
│  │   MemoryCore · MemoryStore · MemoryTemporal      ││
│  │   MemoryAgentic · MemoryLog · CoralStateManager   ││
│  ├──────────────────────────────────────────────────┤│
│  │   TOOLS LAYER (tools/)                           ││
│  │   ToolRegistry · ToolGateway · 8 tool plugins    ││
│  ├──────────────────────────────────────────────────┤│
│  │   SECURITY LAYER (security/)                     ││
│  │   PrivilegeGuard · RateLimiter · ResponseCache   ││
│  ├──────────────────────────────────────────────────┤│
│  │   CROSS-CUTTING                                  ││
│  │   Hooks (event system) · Evolution (self-fix)    ││
│  │   Observability (tracing) · GNAP (git queue)     ││
│  └──────────────────────────────────────────────────┘│
├──────────────────────────────────────────────────────┤
│                   DATA PLANE                          │
│   knowledge/wiki/ · knowledge/agents-skills/         │
│   knowledge/memory-store/ · knowledge/workspace/     │
└──────────────────────────────────────────────────────┘
```

**Import Rules (Nghiêm ngặt):**
- `core/` → KHÔNG được import `modules/`
- `modules/` → chỉ được import `core/` qua barrel
- `scripts/` → KHÔNG được import `core/`
- Code → KHÔNG được import `knowledge/`
- `tests/` → được import `src/`

**Điểm mạnh:**
- Import rules bảo vệ kiến trúc khỏi dependency hell
- Plane separation giữ control logic tách biệt khỏi dữ liệu

**Điểm yếu:**
- Nhiều layer có thể gây overhead cho request đơn giản

---

### Mặt 3: Engine & ReAct Loop — Vòng lặp cốt lõi

**Khái niệm:**
`Agent.run()` thực thi vòng lặp **ReAct (Reasoning + Acting)**:
1. Gửi messages + tools đến LLM
2. Model trả lời hoặc yêu cầu gọi tool
3. Nếu tool_calls → execute tool → quay lại bước 1
4. Nếu finish_reason = 'stop' → trả về kết quả

**Luồng chi tiết (Agent.run):**

```
EngineRequest
    │
    ▼
buildMessages() ────► Lấy 5 messages gần nhất
    │
    ▼
executeReActLoop()
    │
    ├───► SelectRelevantTools() ────► ToolPruner cache
    │         │
    │         ▼
    │    ModelRouter.route(messages, tools)
    │         │
    │         ▼
    │    finishReason?
    │         │
    │    ├── 'stop' ─────► return finalContent (sanitized)
    │    │
    │    ├── 'tool_calls' ──► for each toolCall:
    │    │      │
    │    │      ├──► Hooks.emit('tool:call') ──► Guard check
    │    │      │
    │    │      ├──► ToolRegistry.executeToolCall()
    │    │      │
    │    │      └──► Push result → messages → continue loop
    │    │
    │    └── unknown ──► return fallback content
    │
    └─── Max 10 cycles ──► warning + return
```

**Fast Mode Heuristic:**
- Nếu `task.trim().length < 50` → bypass Orchestrator
- Chỉ chạy Agent ReAct loop (nhanh hơn)

**Smart Fallback (Phase 3):**
- Nếu Orchestrator thất bại giữa chừng → kế thừa completed task results
- Fallback vào Agent ReAct loop với context đã hoàn thành

---

### Mặt 4: Orchestration Pipeline — Bernstein Deterministic

**Khái niệm:**
Orchestrator triển khai **3-phase pipeline**: Decompose → Execute → Synthesize.

**Luồng:**

```
Task: "Phân tích code và tạo báo cáo"
    │
    ▼
┌─────────────────────────────────────────────────┐
│ Phase 1: DECOMPOSER                              │
│ Phân rã task thành DAG các sub-task              │
│ Output: { subTasks: [{id, description,           │
│          requires[], tool, input}],               │
│          parallelGroups: [[], []] }               │
├─────────────────────────────────────────────────┤
│ Phase 1.5: DAG CYCLE DETECTION                   │
│ DFS cycle detection trên dependency graph        │
│ Nếu cycle → throw error                          │
├─────────────────────────────────────────────────┤
│ Phase 2: PLAN EXECUTOR                           │
│ Execute từng sub-task theo thứ tự DAG            │
│ Mỗi task: tool call hoặc LLM call               │
│ Output: ExecutionReport { results[], success,    │
│          errorCount, totalDurationMs }            │
├─────────────────────────────────────────────────┤
│ Phase 3: RESULT SYNTHESIZER                      │
│ Tổng hợp kết quả thành response hoàn chỉnh       │
│ Fallback: ghép raw output nếu LLM fail           │
└─────────────────────────────────────────────────┘
    │
    ▼
OrchestrationResult { content, decomposition,
                      executionReport, totalDurationMs }
```

**Hooks emitted:**
- `orchestrator:decompose-start/end`
- `orchestrator:execute-start/end`
- `orchestrator:synthesize-start/end`

---

### Mặt 5: Memory Systems — Đa tầng bộ nhớ

**Khái niệm:**
Coral có **5 loại memory** phục vụ các mục đích khác nhau:

| Loại | File | Mục đích | Lưu trữ | Ghi được bởi Agent? |
|---|---|---|---|---|
| **MemoryCore** | `memory/memory.ts` | Legacy 3-layer (Channel/Message/Session) | In-memory Map | Có (legacy) |
| **MemoryStore** | `memory/memory-store.ts` | Modern ADD-only store | File JSON (`knowledge/memory-store/`) | Có (thêm mới) |
| **MemoryTemporal** | `memory/memory-temporal.ts` | Thời gian, retention 30 ngày | In-memory Map | Có |
| **MemoryAgentic** | `memory/memory-agentic.ts` | Agent tự ghi, retention 30 ngày | In-memory Map + callback | Có |
| **MemoryLog** | `memory/memory-log.ts` | Append-log persistence | File JSON | Chỉ đọc |

**Luồng ghi nhớ tự động (Event-driven):**
```
tool:result event ──► MemoryStore.add('task', ...)
                  ──► MemoryAgentic.addBlockForAgent('engine', ...)

model:response event ──► MemoryAgentic.addBlockForAgent('engine', ...)
```

---

### Mặt 6: Tool System — Plugin kiến trúc

**Khái niệm:**
Tool system gồm 3 lớp: **Registry** (đăng ký) → **Gateway** (bảo vệ) → **Pruner** (tối ưu).

**Cấu trúc tools (8 plugins):**

| Tool | File | Chức năng |
|---|---|---|
| `filesystem` | `tools/fs/*` | Đọc/ghi file, liệt kê thư mục |
| `knowledge` | `tools/knowledge-graph.ts` | Tra cứu knowledge graph |
| `document` | `tools/document-tools.ts` | Xử lý tài liệu (PDF, DOCX) |
| `exec` | `tools/exec-tools.ts` | Thực thi lệnh CLI |
| `network` | `tools/network-tools.ts` | Fetch URL |
| `wiki` | `tools/wiki-tools.ts` | Ghi wiki page |
| `agenda` | `tools/agenda-tools.ts` | Task queue tracking |
| `vector-search` | `tools/search.ts` | Vector search |

**ToolGateway (Zero-Trust Security):**
- Intercept mọi tool call trước khi đến registry
- Kiểm tra `toolName` trong allow list
- Chặn tool lạ → trả về `TOOL_NOT_FOUND`

**ToolPruner (Optimization):**
- Cache-based: lưu tool frequency score
- Cycle ≥ 3: restrict to core tools (5 tools cơ bản)
- Giảm token consumption cho tool definitions

---

### Mặt 7: LLM & Model Routing — Cascade Fallback

**Khái niệm:**
ModelRouter quản lý **multi-provider** với cơ chế cascade: nếu provider đầu fail → tự động fallback sang provider khác.

**Luồng routing:**

```
ModelRouter.route(messages, options)
    │
    ▼
Lấy danh sách adapters từ provider-registry
    │
    ▼
Sắp xếp theo tier (0 = primary, 1 = fallback, ...)
    │
    ▼
for each adapter (theo thứ tự tier):
    ├── adapter.isAvailable()?
    │   ├── No → skip
    │   └── Yes → gọi adapter.invoke()
    │
    ├── Success → return modelResult
    │
    └── Error → evolutionEngine.recordError()
                continue (thử adapter tiếp theo)
    │
    ▼
Nếu ALL fail → return error message
```

**ProviderRegistry:**
- Load từ `config/providers.json`
- Hỗ trợ `type: 'proxy' | 'direct'`
- Mỗi provider có: name, baseUrl, apiKey, models, tier, timeout

**PromptBuilder — 8-layer system prompt:**
1. Personality (tính cách)
2. Task (nhiệm vụ)
3. Reference (ví dụ output)
4. Brief (ràng buộc)
5. Context Files
6. Rules (luật cố định)
7. History (lịch sử)
8. Constraints (giới hạn kỹ thuật)

---

### Mặt 8: Security System — 3 lớp bảo vệ

**Khái niệm:**
Bảo mật 3 lớp: **PrivilegeGuard** (quyền) → **RateLimiter** (tần suất) → **ResponseCache** (bộ nhớ đệm).

**1. PrivilegeGuard:**
- Allow/Deny rules cho từng tool
- Restricted mode: chỉ cho phép danh sách hẹp
- Hook-based: attach vào `tool:call` event
- Mặc định: `createDefaultAllowRules()` — cho phép tất cả tool core

**2. RateLimiter:**
- `requests`: 60 requests/phút, burst 10
- `tokens`: 100,000 tokens/phút, burst 20,000
- Group rate limiting (RateLimiterGroup)

**3. ResponseCache:**
- Cache response theo key: `agentName + sessionId + messages`
- Max 500 entries, TTL 5 phút
- Side-effect detection: ghi nhận tool calls trong request
- Nếu có side effects → bypass cache (không serve cached response cho request có mutation)

---

### Mặt 9: Event System (Hooks) — Plugin lifecycle

**Khái niệm:**
HookRegistry là **event bus** trung tâm cho toàn bộ agent lifecycle. Mọi thành phần đều giao tiếp qua events.

**Event types (20 events):**

```
task:*          │ tool:*           │ model:*          │ memory:*
────────────────┼──────────────────┼──────────────────┼────────────────
task:start      │ tool:call        │ model:invoke     │ memory:write
task:complete   │ tool:result      │ model:response   │ memory:read
task:error      │ tool:error       │ model:error      │
                │                  │ model:intermediate_response
skill:*         │ orchestrator:*
────────────────┼────────────────────────────────────────────────
skill:load      │ orchestrator:decompose-start/end
skill:unload    │ orchestrator:execute-start/end
                │ orchestrator:synthesize-start/end
```

**Cơ chế:**
1. **Guards** — chạy TRƯỚC hooks, có thể BLOCK event
2. **Hooks** — chạy SAU guards, không block được
3. **Priority** — số cao chạy trước (mặc định 0)
4. **Fail-closed** — nếu guard throw → tự động block

**Singleton:** `globalHooks` dùng chung toàn hệ thống

---

### Mặt 10: Gateway & Adapters — Multi-platform

**Khái niệm:**
CoralAgent là **platform-agnostic**. Gateway layer trừu tượng hóa platform cụ thể.

**Cấu trúc:**

```typescript
interface PlatformAdapter {
  platform: string;
  start(): Promise<void>;
  stop(): Promise<void>;
  send(platformRequest: PlatformRequest): void;
}
```

**CoralGateway:**
- `register(adapter)` — đăng ký platform adapter
- `startAll()` — khởi động tất cả adapter
- `broadcast(event, data)` — gửi event đến tất cả platform

**Adapters hiện tại:**
| Adapter | File | Trạng thái |
|---|---|---|
| DiscordBridge | `src/modules/discord/index.ts` | ✅ Hoạt động |
| CLI | (qua scripts/start-discord.ts) | ⚠️ Phụ thuộc Discord |

**DiscordBridge:**
- Nhận message từ Discord → tạo `EngineRequest`
- Gọi `Engine.process(request)`
- Gửi response về Discord channel

---

### Mặt 11: Evolution Engine — Tự cải thiện từ lỗi

**Khái niệm:**
Evolution Engine ghi nhận lỗi và điều chỉnh hành vi dựa trên patterns lỗi.

**Cấu trúc:**
```
evolution.ts
    │
    ├── evolutionEngine (singleton)
    │
    ├── init() — load rules từ evolution.json
    ├── loadDefaultRules() — rules mặc định
    ├── recordError(errorData) — ghi lỗi
    ├── recordSuccess(modelId, latencyMs) — ghi thành công
    ├── getSuggestions(errorType) — đề xuất hướng xử lý
    └── attachToHooks(hooks) — tự động capture lỗi từ hooks
```

**DAG Cycle Detection (trong Orchestrator):**
- DFS-based cycle detection trên task dependency graph
- Nếu phát hiện cycle → throw error với path cycle
- Ngăn chặn deadlock trong orchestration

---

### Mặt 12: Skill System — 27+ Agent Skills

**Khái niệm:**
Skills là các module kiến thức có cấu trúc, mỗi skill là một file SKILL.md với sections cụ thể.

**Cấu trúc SKILL.md:**
```markdown
# Skill: <name>
## Description
## Dependencies
## Steps
## Examples
## References
```

**Phân loại skills:**
| Category | Số lượng | Ví dụ |
|---|---|---|
| **common/** | 23 skills | `read-file`, `search-files`, `analyze-project`, `manage-state`... |
| **typescript/** | 4 skills | `debug-typescript`, `refactor-code`, `run-tests`, `write-tests` |

**Global Gatekeeper Rule:**
File `agent-skill-standard-rule.md` quy định standard operation procedure cho mọi session.

---

### Mặt 13: State & Checkpoint — Persistence

**Khái niệm:**
Hệ thống state management đảm bảo **session persistence** và **overflow recovery**.

**Cấu trúc state:**
```
knowledge/workspace/
    ├── state.json           — Runtime state (legacy)
    ├── checkpoint.json      — Checkpoint + tech debt (legacy)
    ├── processed-files.json — Files đã xử lý (legacy)
    └── (unified: /.coral/state/current.json)
```

**CoralStateManager (CLI tool):**
- `scan` — quét tất cả file, cập nhật checksum
- `mark <file>` — đánh dấu file đã xử lý
- `verify` — kiểm tra consistency unified vs legacy
- `repair` — rebuild unified từ legacy

**Checkpoint Protocol:**
- Boot: đọc state, kiểm tra P0 items
- Every 5-10 steps: cập nhật progress
- Git commit sau mỗi step
- Overflow recovery: snapshot → resume

---

### Mặt 14: Observability — Tracing

**Khái niệm:**
Tracer cung cấp **distributed tracing** cho agent operations.

**Cấu trúc:**
```typescript
class Tracer {
  constructor(options: TracerOptions);
  startSpan(name, context?): Span;
  attachToHooks(hooks: HookRegistry): void;
  // Tự động capture từ hooks events
}
```

**Hook auto-wiring:**
```typescript
this.hooks.on('model:invoke', (ctx) => {
  // Tạo span cho model invocation
});
this.hooks.on('tool:call', (ctx) => {
  // Tạo span cho tool execution
});
```

---

### Mặt 15: Knowledge Base — Wiki & Memory Stores

**Khái niệm:**
Knowledge base là **Data Plane** — read-only, không bao giờ được import bởi code.

**Cấu trúc:**
```
knowledge/
    ├── wiki/              — Architecture docs, skill library (read-only)
    │   ├── index.md       — Knowledge Base Index
    │   ├── AGENTS.md      — Agent Role & Routing
    │   ├── core/          — Core architecture (soul.md, etc.)
    │   ├── projects/      — Project documentation
    │   ├── skills/        — Wiki-style skills (11 files)
    │   ├── troubleshooting/
    │   └── workspace/
    ├── agents-skills/     — Agent skills (27+ SKILL.md)
    ├── blueprints/        — Raw assets, queue, backups
    ├── memory-store/      — MemoryStore persistence (vector store)
    ├── memory-temporal/   — Temporal memory persistence
    └── workspace/         — Runtime state files
```

---

### Mặt 16: Configuration & Providers

**Khái niệm:**
Cấu hình hệ thống tập trung tại `config/providers.json`.

**Cấu trúc providers.json:**
```json
{
  "providers": [
    {
      "name": "openchia",
      "baseUrl": "https://api.openchia.io/v1",
      "apiKey": "${OPENCHIA_API_KEY}",
      "models": ["oc/deepseek-v4-flash-free"],
      "type": "proxy",
      "tier": 1
    }
  ]
}
```

**Provider fields:**
| Field | Mô tả |
|---|---|
| `name` | Tên provider (unique key) |
| `baseUrl` | API endpoint |
| `apiKey` | API key (env var reference) |
| `models` | Danh sách models hỗ trợ |
| `type` | `proxy` (OpenAI-compatible) hoặc `direct` |
| `tier` | Thứ tự ưu tiên (0=primary, 1=fallback) |
| `maxRetries` | Số lần retry tối đa |
| `timeout` | Timeout (ms) |

---

## Luồng dữ liệu tổng thể (End-to-End)

```
User Input (Discord/CLI)
    │
    ▼
DiscordBridge ──► tạo EngineRequest
    │
    ▼
CoralGateway ──► dispatch đến Engine
    │
    ▼
Engine.process(request)
    │
    ├── Rate limiter check
    ├── ResponseCache check (có cached? → return ngay)
    ├── Build system prompt (PromptBuilder)
    │
    ├── FAST MODE? (task < 50 ký tự)
    │   └── Yes → Agent.run() [ReAct loop]
    │
    └── DEEP MODE?
        └── Yes → Orchestrator.run()
            ├── Decomposer: phân rã task
            ├── DAG Cycle Detection
            ├── PlanExecutor: execute sub-tasks
            └── ResultSynthesizer: tổng hợp response
                │
                ├── Success → return OrchestrationResult
                └── Fail → Smart Fallback → Agent.run()
                    └── (kế thừa completed tasks context)
    │
    ▼
EngineResponse { content, modelUsed, providerUsed }
    │
    ▼
Gateway → DiscordBridge → send về user
```

---

## Kết luận & Points cần deep-dive thêm

### Điểm mạnh kiến trúc:
1. **Plane Separation** — Control/Data plane rõ ràng
2. **Event-driven** — Mọi thành phần giao tiếp qua hooks
3. **Multi-provider cascade** — Không single point of failure
4. **Security layers** — Zero-trust tool gateway + privilege guard
5. **Memory diversity** — 5 loại memory cho 5 use case khác nhau
6. **Deterministic orchestration** — DAG cycle detection ngăn deadlock
7. **Smart fallback** — Orchestrator fail → ReAct loop kế thừa context

### Điểm cần chú ý:
1. **Overhead** — Nhiều layer có thể chậm cho request đơn giản
2. **Single entry point** — Hiện tại chỉ có Discord adapter hoạt động
3. **State complexity** — Unified state + 3 legacy files cần sync
4. **Token management** — ToolPruner cần cải thiện (hiện tại cache miss → full registry)

### Kế hoạch deep-dive tiếp theo:
- [ ] Mổ xẻ PromptBuilder — 8 layers system prompt chi tiết
- [ ] Phân tích ToolGateway zero-trust implementation
- [ ] Test coverage analysis (20+ test files)
- [ ] Performance profiling của ModelRouter cascade
- [ ] Security audit: path traversal, injection patterns
- [ ] Memory consistency: unified state vs legacy sync
- [ ] Docker deployment analysis

---

*Coral Agent v6.0 — Deep Analysis Plan · Compiled: 2026-06-05 · Next: Deep-dive từng mặt chi tiết*