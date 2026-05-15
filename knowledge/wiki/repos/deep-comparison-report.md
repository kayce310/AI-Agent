# Deep Implementation Comparison: Kato vs 13 AI Agent Frameworks

> **Phiên bản**: 1.0  
> **Ngày**: 2026-05-15  
> **Mục đích**: So sánh implementation-level giữa Kato và các framework, xác định lỗ hổng và cơ hội cải tiến cụ thể

---

## Tổng Quan Kiến Trúc Kato Hiện Tại

Kato đang ở **Phase 2c** với 6 Framework Layers:

```
┌─────────────────────────────────────────────┐
│  Layer 6: Agent Actions (Cline-bound)        │
├─────────────────────────────────────────────┤
│  Layer 5: Orchestrator Engine (ReAct Loop)   │  ← engine.ts (304 lines)
├─────────────────────────────────────────────┤
│  Layer 4: LLM Core (LLM + Prompt Builder)    │  ← prompt-builder.ts (223 lines)
├─────────────────────────────────────────────┤
│  Layer 3: Skills Index Manager               │  ← skills-index-manager.ts
├─────────────────────────────────────────────┤
│  Layer 2: Knowledge Graph (wiki + raw-md)    │  ← wiki/ + raw-md/ on disk
├─────────────────────────────────────────────┤
│  Layer 1: State Manager + Evolution          │  ← state-manager.ts (339 lines) + evolution.ts
└─────────────────────────────────────────────┘
```

**Vấn đề trung tâm**: Các layer còn ở dạng sơ khai, chưa có separation of concerns rõ ràng, chưa có event-driven, chưa có memory layer thực sự.

---

## 1. Memory & State Management

### Kato Hiện Tại
- **File**: `src/core/state-manager.ts` (339 dòng)
- **Pattern**: JSON file + SHA256 checksum + lock file (stale 30s)
- **State lifecycle**: UNINITIALIZED → INITIALIZING → READY → ERROR
- **Memory**: `memory.ts` (simple channel-based message storage), `memory-compressor.ts` (basic compression)
- **Evolution**: `evolution.ts` — error tracking + rule learning (dùng file JSON)

```typescript
// Kato state schema — toàn bộ state trong 1 file JSON
interface KatoWorkspaceState {
  agent: { lifecycle, role, loadedSkills, lastInitializedAt };
  session: { id, startedAt, updatedAt, currentTask };
  controlPlane: { bootloader, router, index };
  dataPlane: { statePath, manager, checksum };
  notes: string[];
}
```

### So Sánh Chi Tiết

| Khía Cạnh | Kato | Mem0 | Letta | SmolAgents |
|-----------|------|------|-------|------------|
| **Cơ chế ghi** | Overwrite JSON file (mutate) | ADD-only (never overwrite) | Structured memory blocks | In-memory |
| **Truy vấn** | Key-value lookup + regex | Semantic + BM25 + entity + time | Labeled blocks | None |
| **Entity linking** | ❌ Không có | ✅ Entity extraction + linking | ❌ | ❌ |
| **Temporal reasoning** | ❌ Chỉ có timestamp | ✅ Time-aware retrieval | ❌ | ❌ |
| **Checksum** | ✅ SHA256 | ❌ | ❌ | ❌ |
| **Atomic writes** | ✅ Lock + tmp + rename | ❌ | ❌ | ❌ |
| **Backup** | ✅ .bak.1 tự động | ❌ | ❌ | ❌ |
| **Benchmark** | ❌ Không có | ✅ LoCoMo 91.6, LongMemEval 94.8 | ❌ | ❌ |

### 🚨 Lỗ Hổng Chính

**1. ADD-only pattern chưa có** — Kato hiện tại dùng `fs.writeFileSync` để ghi đè JSON. Mem0 chứng minh ADD-only (accumulate, never overwrite) cho kết quả benchmark cao hơn 20-30 điểm.

**2. Không có retrieval layer thực sự** — `search_knowledge_graph` trong `tools.ts` (dòng 581-601) chỉ là grep từ khóa trên filesystem, không có embedding, không có ranking. Trong khi Mem0 có 3 tín hiệu retrieval (semantic + BM25 + entity).

**3. Memory flat, không hierarchical** — Letta dùng `human/persona/world` memory blocks. Kato chỉ có 1 state.json flat + processed-files.json riêng biệt.

### Học Được Gì

```typescript
// Mem0-inspired memory layer cho Kato (cần xây dựng):
interface MemoryBlock {
  id: string;
  type: 'human' | 'persona' | 'session' | 'task' | 'fact';
  content: string;
  timestamp: string;
  entities: string[];
  embedding?: Float32Array;  // future: vector search
}

interface MemoryStore {
  add(memory: Omit<MemoryBlock, 'id' | 'timestamp'>): Promise<MemoryBlock>;
  query(text: string, topK?: number): Promise<MemoryBlock[]>;
  // ADD-only — không có update/delete
}
```

---

## 2. Engine / Agent Loop

### Kato Hiện Tại
- **File**: `src/core/engine.ts` (304 dòng)
- **Pattern**: Simple ReAct loop — synchronous tool calls
- **Max tool cycles**: 10
- **Tool pruning**: Cycle ≥ 3 → chỉ giữ core tools

```typescript
// Engine.process() — ReAct Loop đơn giản
while (toolCallCycles < MAX_TOOL_CALL_CYCLES) {
  // 1. Gọi LLM với messages + tools
  // 2. Nếu finish_reason === 'stop' → return
  // 3. Nếu finish_reason === 'tool_calls' → thực thi → loop
}
```

### So Sánh Chi Tiết

| Khía Cạnh | Kato | SmolAgents | CrewAI | MetaGPT |
|-----------|------|------------|--------|---------|
| **Agent pattern** | Simple ReAct (tool calls) | CodeAgent (code-as-actions) | Event-driven Flows | SOP-driven teams |
| **Code vs JSON actions** | JSON tool calls | Python code snippets | N/A | N/A |
| **Step efficiency** | Baseline | **30% fewer steps** (CodeAgent paper) | N/A | N/A |
| **Parallel execution** | ❌ Sync loop | ❌ | ✅ Event-driven, parallel | ✅ Multi-agent parallel |
| **Subagent support** | ❌ | ❌ | ✅ Hierarchical crews | ✅ Role-based teams |
| **Error recovery** | ❌ Catch → return error | ✅ Sandboxed retry | ✅ Built-in fallback | ✅ SOP retry |
| **Max cycles** | 10 (hardcoded) | Configurable | Unlimited (event-driven) | Unlimited (SOP flow) |

### 🚨 Lỗ Hổng Chính

**1. CodeAgent pattern** — SmolAgents chứng minh code-as-actions giảm 30% số bước so với JSON tool calls. Kato đang dùng JSON tool calls → token waste + nhiều round-trip hơn.

**2. Không có event-driven** — CrewAI Flows cho phép event-driven orchestration (khi A xong → trigger B, C, D song song). Kato chỉ có linear loop.

**3. `execSync` hell** — Toàn bộ tool execution trong `tools.ts` dùng `execSync()` để chạy temp scripts. Dòng 648-1444 có ~20+ chỗ dùng pattern:
```typescript
// Pattern lặp lại khắp tools.ts — anti-pattern nghiêm trọng
const tmpDir = path.join(BASE_PATH, '.tmp-' + Date.now());
fs.mkdirSync(tmpDir, { recursive: true });
const tmpScriptPath = path.join(tmpDir, 'script.mjs');
fs.writeFileSync(tmpScriptPath, scriptContent, 'utf8');
const output = execSync(`node "${tmpScriptPath}"`, { ... });
try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
```

**4. Tool execution không có sandbox** — SmolAgents có E2B, Docker, Modal sandboxing. Kato chạy execSync trực tiếp → security risk (dù có whitelist).

### Học Được Gì

```typescript
// CodeAgent-inspired execution engine
// Thay vì JSON tool_calls → LLM viết code:
async function executeCodeAgent(
  systemPrompt: string,
  tools: ToolDefinition[],
  task: string
): Promise<string> {
  const code = await llm.generateCode(systemPrompt, tools, task);
  // LLM returns Python/TS code that calls tools as functions
  // result = tool_read_file(path)
  // final_answer(result)
  return sandboxedEval(code);
}
```

---

## 3. Tool System

### Kato Hiện Tại
- **File**: `src/core/tools.ts` (1444 dòng — **lớn nhất trong core**)
- **Số tools**: 16 tools (list_directory, read_file, search_knowledge_graph, write_wiki_page, read_pdf, read_docx, extract_pdf_to_md, extract_docx_to_md, archive_document, search_archived_md, quote_from_source, fetch_url, process_new_raw, generate_report, execute_command, extract_formulas, load_skill, check_stale_skills)
- **Implementation**: Function-name matching (`if (functionName === 'xxx')`) — **không có registry pattern**

### So Sánh Chi Tiết

| Khía Cạnh | Kato | SmolAgents | LangChain | CrewAI |
|-----------|------|------------|-----------|--------|
| **Tool format** | OpenAI-compatible JSON | Python functions | LangChain Tool | Custom tool class |
| **Registry** | ❌ if-else chain (dòng 551-1388) | ✅ Function registry | ✅ ToolRegistry | ✅ Tool decorator |
| **Dynamic loading** | ✅ load_skill tool | ✅ MCP servers | ✅ Hub tools | ✅ Custom tools |
| **Sandbox** | ❌ none | ✅ E2B/Docker/Modal | ❌ | ❌ |
| **Async execution** | ❌ execSync (blocking) | ✅ Async | ✅ Async | ✅ Async |
| **Tool chaining** | ❌ Manual loop | ✅ Built-in | ✅ Chain/Sequence | ✅ Sequential |
| **Token efficiency** | ❌ Gửi full tool def mỗi cycle | ✅ Code gen (ngắn hơn) | N/A | N/A |
| **Security** | ⚠️ Command whitelist | ✅ Sandbox | ⚠️ | ⚠️ |

### 🚨 Lỗ Hổng Chính

**1. Anti-pattern if-else chain** — `executeToolCall` là 800+ dòng if-else không có registry. Thêm tool mới = sửa file 1444 dòng.

**2. execSync blocking** — Mọi tool async (pdf-parse, mammoth, fetch) đều chạy qua `execSync` vì `executeToolCall` là synchronous. Điều này:
- Block event loop
- Tạo temp files trên disk (security risk)
- Không scale được

**3. Tool definition trùng lặp** — Mỗi tool có definition trong `TOOLS_DEFINITION` + implementation trong `executeToolCall` — không có single source of truth.

### Học Được Gì

```typescript
// Tool Registry pattern — inspired by smolagents + LangChain
interface Tool {
  name: string;
  description: string;
  schema: JSONSchema;
  execute(args: Record<string, any>): Promise<any>;
}

class ToolRegistry {
  private tools = new Map<string, Tool>();
  
  register(tool: Tool): void {
    this.tools.set(tool.name, tool);
  }
  
  getDefinition(): ChatCompletionTool[] {
    return Array.from(this.tools.values()).map(t => ({
      type: 'function',
      function: { name: t.name, description: t.description, parameters: t.schema }
    }));
  }
  
  async execute(name: string, args: any): Promise<any> {
    const tool = this.tools.get(name);
    if (!tool) throw new Error(`Tool not found: ${name}`);
    return tool.execute(args); // Async!
  }
}
```

---

## 4. Prompt Building & Model Abstraction

### Kato Hiện Tại
- **File**: `src/core/prompt-builder.ts` (223 dòng) + `src/core/provider-registry.ts` 
- **8-layer prompt**: Task → Context → Reference → Brief → Rules → Conversation → Plan → Alignment
- **Model support**: Chỉ 1 model (qua 9router)
- **Provider**: `ProviderRegistry` với `loadFromConfig()`

### So Sánh Chi Tiết

| Khía Cạnh | Kato | LiteLLM | SmolAgents | LangChain |
|-----------|------|---------|------------|-----------|
| **Model providers** | 1 (9router) | **100+** | 100+ (LiteLLM integration) | 50+ |
| **Prompt template** | 8-layer hardcoded | Unified OpenAI format | Model-agnostic | LangChain templates |
| **Dynamic context** | Manual file inject | N/A | N/A | ✅ Context window mgmt |
| **Guardrails** | ❌ None | ✅ Rate limit, content filter | ❌ | ❌ |
| **Token tracking** | ❌ None | ✅ Spend tracking | ❌ | ✅ Callbacks |
| **Latency tracking** | ❌ None | ✅ P95 latency 8ms at 1k RPS | ❌ | ❌ |

### 🚨 Lỗ Hổng Chính

**1. Single provider dependency** — Kato hard-bound vào 9router (một specific model routing service). LiteLLM có 100+ providers.

**2. Prompt builder chưa tận dụng** — 8-layer architecture tốt nhưng implementation chỉ concatenate string sections. Không có:
- Variable interpolation
- Token counting
- Context window management (truncation strategy)
- Template versioning

**3. Không có guardrails** — LiteLLM có rate limiting, content moderation. Kato không có gì — nếu agent gọi LLM loop sai có thể tốn token unlimited.

### Học Được Gì

```typescript
// Model Adapter Pattern — LiteLLM-inspired
interface ModelAdapter {
  invoke(messages: Message[], options?: ModelOptions): Promise<ModelResponse>;
  estimateTokens(messages: Message[]): number;
}

class LiteLLMAdapter implements ModelAdapter {
  private endpoint: string;
  
  async invoke(messages: Message[], options?: ModelOptions): Promise<ModelResponse> {
    // Gọi 9router hoặc LiteLLM proxy
    const response = await fetch(this.endpoint, {
      method: 'POST',
      body: JSON.stringify({
        model: options?.model || 'default',
        messages,
        tools: options?.tools,
      })
    });
    return response.json();
  }
}
```

---

## 5. Observability & Evolution

### Kato Hiện Tại
- **File**: `src/core/evolution.ts`
- **Pattern**: Error tracking → rule learning
- **Data**: `evolution.json` (số lỗi, active rules)

### So Sánh Chi Tiết

| Khía Cạnh | Kato | Langfuse | PromptFoo | 
|-----------|------|----------|-----------|
| **Tracing** | ⚠️ evolution.json (basic) | ✅ Full LLM trace (calls, tokens, latency) | ✅ Prompt eval |
| **Evaluation** | ❌ Manual | ✅ Built-in evals, A/B tests | ✅ Side-by-side comparison |
| **Real-time monitoring** | ❌ | ✅ Dashboard | ❌ |
| **Cost tracking** | ❌ | ✅ Token cost | ✅ Per-prompt cost |
| **User sessions** | ❌ | ✅ Session-level traces | ❌ |

### 🚨 Lỗ Hổng Chính

**1. `evolution.json` quá primitive** — Chỉ đếm lỗi + rule learning đơn giản. Langfuse trace **mọi tool call, token count, latency** → có thể dùng để self-optimize.

**2. Không có evaluation** — Kato không có cách nào benchmark chất lượng. PromptFoo cho phép A/B test prompt templates.

**3. Không có tracing UI** — Langfuse có web dashboard. Kato chỉ có console.log.

### Học Được Gì

```typescript
// Observability Layer — Langfuse-inspired
interface TraceSpan {
  id: string;
  parentId?: string;
  name: string;
  type: 'llm' | 'tool' | 'memory' | 'skill';
  startTime: number;
  endTime?: number;
  input?: any;
  output?: any;
  tokenCount?: { input: number; output: number };
  cost?: number;
  error?: string;
}

class Tracer {
  private spans: TraceSpan[] = [];
  private currentSpan?: TraceSpan;
  
  startSpan(name: string, type: TraceSpan['type']): TraceSpan {
    // Push span + return context
  }
  
  endSpan(span: TraceSpan, output: any): void {
    span.endTime = Date.now();
    span.output = output;
    // Lưu vào trace store (file / DB)
  }
  
  export(): TraceReport {
    // Export để phân tích
  }
}
```

---

## 6. Skills & Knowledge System

### Kato Hiện Tại
- **File**: `src/core/skills-index-manager.ts` + `src/core/tool-pruner.ts`
- **Pattern**: File-based skills index + lazy-load via `load_skill` tool
- **Knowledge**: Obsidian wiki (knowledge/wiki/) + raw-md archive

### So Sánh Chi Tiết

| Khía Cạnh | Kato | Letta | Bernstein | SmolAgents |
|-----------|------|-------|-----------|------------|
| **Skill format** | Markdown files | Pre-built npm/pip packages | Python modules | Python functions |
| **Discovery** | skills-index-manager | CLI list | import | ToolRegistry |
| **Versioning** | mtime + Generated: frontmatter | Package versions | Git | Git |
| **Stale detection** | ✅ check_stale_skills tool | ❌ | ❌ | ❌ |
| **Lazy loading** | ✅ load_skill tool | ✅ Built-in | N/A | N/A |

### 🚨 Lỗ Hổng Chính

**1. Skills không có runtime** — Letta's skills là code packages (npm/pip) có thể chạy. Kato's skills là markdown files — chỉ cung cấp context, không thể thực thi.

**2. Skill format không chuẩn** — Mỗi skill có format khác nhau (không có schema validation). Bernstein có Python module pattern rõ ràng.

**3. Tool pruning còn thô** — `tool-pruner.ts` lọc tools theo từ khóa + cycle count. Chưa có ML-based pruning hay semantic selection.

### Học Được Gì

```typescript
// Skill as Executable Module — Letta-inspired
interface Skill {
  name: string;
  version: string;
  description: string;
  dependencies: string[];
  triggers: SkillTrigger[];   // Khi nào skill được active
  execute(context: SkillContext): Promise<SkillResult>;
}

// SkillTrigger — event-driven activation
interface SkillTrigger {
  type: 'keyword' | 'file_pattern' | 'tool_call' | 'schedule';
  pattern: string;
}
```

---

## 7. Architecture & Design Patterns

### Kato Hiện Tại
- **Pattern**: 6 Framework Layers (linear stack)
- **Dependency**: Tất cả core modules depend vào nhau

```typescript
// engine.ts imports:
import MemoryCore from './memory.js';
import ProviderRegistry from './provider-registry.js';
import PromptBuilder from './prompt-builder.js';
import { TOOLS_DEFINITION, executeToolCall } from './tools.js';
import { selectRelevantTools, estimateToolsTokenCount } from './tool-pruner.js';
import { EngineRequest, EngineResponse, ChatMessage } from './types.js';
import { evolutionEngine } from './evolution.js';
// → Engine phụ thuộc vào 7 modules khác
```

### So Sánh Chi Tiết

| Khía Cạnh | Kato | CrewAI | MetaGPT | SmolAgents |
|-----------|------|--------|---------|------------|
| **Core size** | ~3000 lines (multiple files) | ~5000 lines | ~10,000 lines | **~1,000 lines** (`agents.py`) |
| **Architecture** | Monolithic (import lẫn nhau) | Modular (agents, crews, flows) | Modular (roles, teams, SOPs) | Minimal (1 file core) |
| **Dependency** | 15+ npm packages | Pydantic, rich | Pydantic, fire, rich | transformers, LiteLLM |
| **Design principle** | "Framework 6 Layers" | "Agent teams" | "Code = SOP(Team)" | "Think in code" |

### 🚨 Lỗ Hổng Chính

**1. Monolithic coupling** — Engine import hầu hết core modules. Thay đổi tool-pruner có thể ảnh hưởng engine.

**2. Không có event system** — CrewAI có events, MetaGPT có SOP pipeline. Kato chỉ có `EventEmitter` (dòng 34: `extends EventEmitter`) nhưng chỉ emit 'cascade' event (dòng 228) cho UI biết.

**3. Code complexity không kiểm soát** — `tools.ts` 1444 dòng là dấu hiệu của growing complexity không có kỷ luật. SmolAgents chỉ có ~1000 dòng cho **toàn bộ core agent**, không chỉ tools.

### Học Được Gì

```typescript
// Event-driven Architecture — CrewAI-inspired
interface AgentEvent {
  type: 'task_start' | 'tool_call' | 'memory_write' | 'skill_load' | 'error';
  timestamp: number;
  data: any;
}

interface AgentEventHandler {
  handle(event: AgentEvent): Promise<void>;
}

// Hook system — cho phép plugins can thiệp vào agent lifecycle
class AgentHooks {
  private handlers = new Map<string, AgentEventHandler[]>();
  
  on(eventType: string, handler: AgentEventHandler): void { ... }
  emit(event: AgentEvent): Promise<void> { ... }
}
```

---

## 8. Security & Isolation

### Kato Hiện Tại
- `isPathSafe()` — path traversal protection (dòng 435-438)
- `isCommandSafe()` — command whitelist (dòng 443-459)
- **Không có sandbox, không có rate limiting, không có content filter**

### So Sánh

| Khía Cạnh | Kato | SmolAgents | LangChain | LiteLLM |
|-----------|------|------------|-----------|---------|
| **Command isolation** | ⚠️ whitelist | ✅ E2B/Docker sandbox | ❌ | N/A |
| **Path traversal** | ✅ isPathSafe() | ✅ (sandbox) | ❌ | N/A |
| **Content filtering** | ❌ | ❌ | ❌ | ✅ Guardrails |
| **Rate limiting** | ❌ | ❌ | ❌ | ✅ Virtual keys |
| **Token budget** | 🔄 max_tokens: 4096 | Configurable | Configurable | ✅ Spend tracking |

### 🚨 Lỗ Hổng Chính

**1. execSync không sandbox** — Nếu command whitelist bị bypass (vd: `npm run evil-script`), attacker có thể RCE.

**2. Temp file pattern là security risk** — Pattern `fs.writeFileSync(tmpPath, code)` + `execSync('node ' + tmpPath)` mở ra cơ hội:
- Temp file injection (nếu content chứa code độc)
- Race condition (nếu attacker đọc trước khi cleanup)

---

## 9. Checklist Cải Tiến Cụ Thể

Từ phân tích trên, đây là các cải tiến **theo thứ tự ưu tiên**:

### 🔴 Critical (Phải làm ngay)

- [ ] **Tool Registry Pattern** — Tái cấu trúc `tools.ts`:
  - Tách `executeToolCall` if-else chain thành `ToolRegistry` với `register/execute`
  - Mỗi tool là 1 file riêng trong `src/core/tools/`
  - Async execution (không còn execSync blocking)

- [ ] **Kill execSync pattern** — Chuyển toàn bộ temp-script pattern thành:
  ```typescript
  // Thay vì execSync('node tmp.mjs')
  async function readPdf(path: string): Promise<PdfResult> {
    const parser = new PDFParse(...); // Dynamic import ESM
    return parser.getText({ first: 10 });
  }
  ```

### 🟡 High Priority

- [ ] **Memory Layer ADD-only** — Xây dựng MemoryStore với:
  - Single-pass ADD-only extraction (1 LLM call)
  - Multi-signal retrieval (semantic + keyword + entity)
  - Memory blocks pattern (human/persona/session)

- [ ] **Model Adapter** — Abstract model provider behind `ModelAdapter` interface:
  - LiteLLM integration cho multi-provider support
  - 9router vẫn là default, nhưng có fallback

- [ ] **O11y Layer** — Tracer + Span:
  - Tool call tracing (latency, tokens, cost)
  - Evolution tracking mở rộng (benchmark + eval datasets)

### 🟢 Medium Priority

- [ ] **Event-driven Engine** — Agent lifecycle events:
  - `task:start`, `tool:call`, `tool:result`, `memory:write`, `error:recover`
  - Cho phép plugins/hooks can thiệp

- [ ] **Skill Runtime** — Skill có thể thực thi (không chỉ markdown context):
  - Skill = executable module (TypeScript)
  - Lifecycle hooks: `onActivate`, `onTask`, `onDeactivate`

- [ ] **CodeAgent pattern** — Cho LLM viết code thay vì JSON tool calls:
  - Giảm 30% số bước
  - Clean hơn, ít round-trip hơn

### 🔵 Nice to Have

- [ ] **Sandboxed execution** — Docker/Modal sandbox cho tool execution
- [ ] **Guardrails** — Input/output content filtering
- [ ] **Prompt eval** — A/B test prompt templates (PromptFoo pattern)
- [ ] **Self-hosted dashboard** — Langfuse-inspired tracing UI

---

## 10. Kết Luận

Kato hiện tại có architecture tốt (6 Framework Layers, 8-layer Prompt Builder) nhưng **implementation còn quá raw**:

1. **`tools.ts` 1444 dòng** là điểm nghẽn lớn nhất — cần tách thành Tool Registry ngay
2. **Memory layer không có retrieval** — ADD-only + multi-signal search là must-have
3. **Single provider dependency** — cần model adapter pattern
4. **No async, no events** — engine loop cần event-driven để scale

**Điểm mạnh Kato đang có** (không nên phá vỡ):
- ✅ State manager atomic writes (lock + checksum + backup)
- ✅ Skills lazy-load + stale detection
- ✅ Path traversal protection
- ✅ Knowledge archive pipeline (raw-md → wiki)

**Hướng đi**: Phase 3 nên tập trung vào **refactor core architecture** (Tool Registry, Async Engine, Model Adapter) trước, sau đó mới thêm features mới.

---

*Generated by deep analysis of Kato source vs 13 AI Agent frameworks*