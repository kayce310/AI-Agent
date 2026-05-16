# Architecture Decision Records (ADR)

> **SSOT for architectural decisions.** Mỗi ADR ghi lại một quyết định kiến trúc quan trọng: context, option được cân nhắc, quyết định cuối cùng, và hệ quả.

---

## Active ADRs

| ID | Title | Status | Date |
|----|-------|--------|------|
| ADR-001 | Deterministic Orchestration (Decomposer → PlanExecutor → ResultSynthesizer) | ✅ Accepted | 2026-05-16 |
| ADR-002 | ADD-only Memory + Append-Log Persistence | ✅ Accepted | 2026-05-16 |
| ADR-003 | CodeAgent — Modular Tool Registry (Plugin Architecture) | ✅ Accepted | 2026-05-16 |
| ADR-004 | Multi-Provider Model Abstraction (ModelRouter + Adapters) | ✅ Accepted | 2026-05-16 |
| ADR-005 | Event-Driven Engine (HookRegistry + Tracer) | ✅ Accepted | 2026-05-16 |

---

## ADR-001: Deterministic Orchestration (Decomposer → PlanExecutor → ResultSynthesizer)

### Status
✅ Accepted — 2026-05-16

### Context
LLM agents thường thực hiện 1 tool call, 1 response → không đủ cho task phức tạp. Nhiều research (Bernstein, LangChain, AutoGPT) chỉ ra rằng **decomposition → execution → synthesis** giảm 50% LLM calls và tăng độ chính xác.

### Options Considered

| Option | Pros | Cons |
|--------|------|------|
| **A. 3-stage pipeline** (Decomposer → Executor → Synthesizer) | Clear separation, testable, deterministic | Cần nhiều code hơn |
| **B. Single LLM call** | Đơn giản | Hallucination, thiếu kiểm soát |
| **C. Tree-of-Thought** | Mạnh cho reasoning | Overhead, phức tạp |

### Decision
✅ **Option A — 3-stage pipeline**:
- **Decomposer**: 1 LLM call → structured task list
- **PlanExecutor**: execute tuần tự/parallel
- **ResultSynthesizer**: 1 LLM call → human response

### Consequences
- Positive: Giảm 50% LLM calls, deterministic execution
- Positive: Dễ test từng stage riêng
- Negative: Cần thêm code orchestration
- Mitigation: Implement từng stage độc lập, integration test cuối

### References
- [Bernstein Analysis](knowledge/wiki/repos/bernstein-analysis.md)
- [LangChain Analysis](knowledge/wiki/repos/langchain-analysis.md)

---

## ADR-002: ADD-only Memory + Append-Log Persistence

### Status
✅ Accepted — 2026-05-16

### Context
`memory-store.ts` hiện tại dùng **ADD-only in-memory array**. Khi flush, ghi toàn bộ array xuống disk (`JSON.stringify` + `writeFile`). Vấn đề:
1. Với 10k+ blocks, flush tốn O(n) thời gian và I/O
2. Full-rewrite không durable nếu crash giữa chừng
3. Không thể replay history

### Options Considered

| Option | Pros | Cons |
|--------|------|------|
| **A. WAL (Write-Ahead Log)** | Durable, replayable, O(1) per write | Cần WAL compaction |
| **B. Append-log JSON lines** | Đơn giản, streamable, easy debug | Cần replay toàn bộ trên startup |
| **C. SQLite** | Queryable, transactional | Phụ thuộc native binary |

### Decision
✅ **Option B — Append-log JSON lines**:
- Mỗi operation ghi 1 dòng JSON vào `store.log`
- `flush()` chỉ cần ghi diff blocks
- Startup: replay log → rebuild state
- Snapshot periodic (mỗi 1000 ops) để tránh replay quá dài

### Consequences
- Positive: O(1) per write, durable
- Positive: Có thể audit history từ log
- Negative: Cần replay trên startup (mitigated by snapshot)
- Negative: Double storage (log + snapshot)

### Implementation
- File: `src/core/memory-log.ts`
- Integration: memory-store.ts ghi qua MemoryLog thay vì direct writeFile

---

## ADR-003: CodeAgent — Modular Tool Registry (Plugin Architecture)

### Status
✅ Accepted — 2026-05-16

### Context
Ban đầu tools.ts chứa 1444 lines monolithic với `TOOLS_DEFINITION` + `executeToolCall` + per-tool functions. Khó maintain, mỗi tool mới cần modify tools.ts.

### Options Considered

| Option | Pros | Cons |
|--------|------|------|
| **A. Plugin Registry** (đã chọn) | Mỗi tool 1 file, auto-register | Cần bootstrap pattern |
| **B. Class-based tools** | OOP clean | Overhead cho tool đơn giản |
| **C. Micro-functions** | Đơn giản | Không scalable |

### Decision
✅ **Option A — ToolRegistry + Plugin files**:
- `tool-registry.ts`: Registry quản lý tool lifecycle
- `tools/*.ts`: Mỗi plugin tự register trên export
- `tools.ts`: Barrel re-export (backward compat)

### Consequences
- Positive: 9 plugins, mỗi plugin <100 lines
- Positive: Plugin tự quản lý schema + handler
- Positive: Easy to test (mock registry)
- Negative: Cần verify pattern khi register

### Current Plugins
| Plugin | File | Functions |
|--------|------|-----------|
| filesystem | `tools/filesystem.ts` | list, read, write, search |
| knowledge | `tools/knowledge.ts` | wiki queries |
| document | `tools/document.ts` | pdf/docx |
| archive | `tools/archive.ts` | zip/unzip |
| skills | `tools/skills.ts` | skill management |
| report | `tools/report.ts` | generate_report |
| system | `tools/system.ts` | system info |
| network | `tools/network.ts` | fetch_url |

---

## ADR-004: Multi-Provider Model Abstraction (ModelRouter + Adapters)

### Status
✅ Accepted — 2026-05-16

### Context
Engine cần hỗ trợ nhiều LLM providers: 9router, OpenAI, Anthropic, Ollama, LiteLLM (100+). Không thể hardcode 1 provider.

### Options Considered

| Option | Pros | Cons |
|--------|------|------|
| **A. Adapter Pattern** (đã chọn) | Clean abstraction, thêm provider = thêm adapter | Cần implement mỗi adapter riêng |
| **B. Single LLM wrapper** | Đơn giản | Không fallback được |
| **C. Proxy pattern** | Centralized | SPOF, latency |

### Decision
✅ **Option A — ModelRouter + IModelAdapter**:
- `ModelRouter`: quản lý danh sách adapter + fallback chain
- Mỗi provider implement `IModelAdapter` interface
- Fallback: provider A down → tự động chuyển B

### Consequences
- Positive: 5 adapters (9router, OpenAI, Anthropic, Ollama, LiteLLM)
- Positive: Fallback khi provider down
- Positive: Dễ thêm provider mới
- Negative: Cần maintain adapter compatibility

---

## ADR-005: Event-Driven Engine (HookRegistry + Tracer)

### Status
✅ Accepted — 2026-05-16

### Context
Engine cần lifecycle hooks để:
1. Theo dõi execution (tracer)
2. Error tracking (evolution)
3. Plugin hooks
4. Cost tracking

### Options Considered

| Option | Pros | Cons |
|--------|------|------|
| **A. HookRegistry + EventEmitter** (đã chọn) | Decoupled, testable | Cần careful ordering |
| **B. Middleware chain** | Giống Express | Không async-friendly |
| **C. Direct method override** | Simple | Không extensible |

### Decision
✅ **Option A — HookRegistry wrapping EventEmitter**:
- `Engine` extends `EventEmitter`
- `HookRegistry` quản lý hook lifecycle
- Hook points: beforeTool, afterTool, beforeAgent, afterAgent, onError

### Consequences
- Positive: Tracer.ts attach vào hooks → auto trace
- Positive: Evolution.ts nghe onError → auto learn
- Positive: Plugin có thể đăng ký hook riêng
- Negative: Hook execution order cần documented

### Current Hooks
| Hook | Trigger | Consumer |
|------|---------|----------|
| beforeTool | Trước mỗi tool call | Tracer |
| afterTool | Sau mỗi tool call | Tracer |
| onError | Tool/agent error | Evolution |
| beforeAgent | Trước agent cycle | Tracer |
| afterAgent | Sau agent cycle | Tracer |