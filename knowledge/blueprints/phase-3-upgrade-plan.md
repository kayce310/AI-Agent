# Phase 3: Kato Core Architecture Upgrade Plan

> **Phiên bản**: 1.0  
> **Ngày**: 2026-05-15  
> **Base trên**: deep-comparison-report.md (analysis of Kato vs 13 frameworks)  
> **Mục tiêu**: Nâng cấp Kato từ Phase 2c (sơ khai) lên Phase 3 (production-ready architecture)

---

## 1. Tổng Quan

### Current State
```
Phase 2c ── 6 Framework Layers ── src/core/ ~3,000 lines
├── engine.ts           (304 lines)  ReAct Loop
├── tools.ts            (1444 lines) ★ chỗ đau nhất
├── state-manager.ts    (339 lines)  Atomic write ✅ tốt
├── prompt-builder.ts   (223 lines)  8-layer template
├── tool-pruner.ts      (?)          Keyword-based pruning
├── skills-index-manager (?)        Lazy-load skills
├── memory.ts           (?)          Channel-based message store
├── memory-compressor.ts (?)        Basic compression
├── evolution.ts        (?)          Error tracking
├── provider-registry.ts (?)        Single provider (9router)
└── types.ts            (?)          Shared types
```

### Target State
```
Phase 3 ── Event-driven Plugin Architecture ── refactored
├── core/
│   ├── engine.ts              (200 lines)  Event-driven, async
│   ├── agent.ts               (NEW)        Agent lifecycle orchestration
│   ├── tool-registry.ts       (NEW)        Tool Registry + Plugin API
│   ├── tools/                 (NEW DIR)    Mỗi tool 1 file
│   │   ├── filesystem.ts      read_file, list_directory...
│   │   ├── knowledge.ts       search_knowledge_graph, write_wiki...
│   │   ├── document.ts        read_pdf, read_docx, archive...
│   │   ├── network.ts         fetch_url
│   │   ├── command.ts         execute_command
│   │   ├── skills.ts          load_skill, check_stale...
│   │   ├── report.ts          generate_report, quote...
│   │   └── system.ts          process_new_raw, extract_formulas...
│   ├── prompt-builder.ts      (150 lines)  Template engine + Token-aware
│   ├── model-adapter.ts       (NEW)        Multi-provider abstraction
│   ├── memory-store.ts        (NEW)        ADD-only memory blocks
│   ├── state-manager.ts       (339 lines)  Giữ nguyên ✅
│   ├── evolution.ts           (200 lines)  Mở rộng tracing
│   └── hooks.ts               (NEW)        Event lifecycle hooks
```

---

## 2. Phân Pha Thực Thi

Chi tiết các phase thực thi theo thứ tự ưu tiên.

---

### 🔴 PHASE 3.1 — Tool Registry Refactor (Critical)

**Mục tiêu**: Tách `tools.ts` 1444 dòng thành Tool Registry + mỗi tool 1 file riêng biệt.

#### Implementation Plan

```
1. New file: src/core/tool-registry.ts
   - class ToolRegistry với register() / execute() / getDefinitions()
   - interface Tool { name, description, schema, execute(args): Promise<any> }
   - Plugin API: registry.use(plugin: ToolPlugin) để bên ngoài đăng ký tool

2. New directory: src/core/tools/
   - filesystem.ts:  list_directory, read_file, write_file, edit_file, execute_command?
   - knowledge.ts:   search_knowledge_graph, write_wiki_page
   - document.ts:    read_pdf, read_docx, extract_pdf_to_md, extract_docx_to_md, archive_document
   - archive.ts:     search_archived_md, quote_from_source
   - network.ts:     fetch_url
   - skills.ts:      load_skill, check_stale_skills
   - report.ts:      generate_report
   - system.ts:      process_new_raw, extract_formulas

3. ToolPlugin interface:
   interface ToolPlugin {
     name: string;
     tools: Tool[];
     onRegister?(registry: ToolRegistry): void;
   }

4. Migrate từng tool từ tools.ts → tools/*.ts
   - Giữ logic giống hệt, chỉ refactor async
   - Convert execSync → await tool.execute()
```

#### File chi tiết mỗi tool

**filesystem.ts** (port from tools.ts lines 565-580, 847-850, etc.)
```typescript
export class FileSystemToolPlugin implements ToolPlugin {
  name = 'filesystem';
  tools: Tool[] = [
    {
      name: 'list_directory',
      description: 'Liệt kê nội dung thư mục',
      schema: { /* OpenAI schema */ },
      async execute(args) { /* logic từ tools.ts */ }
    },
    {
      name: 'read_file',
      description: 'Đọc nội dung file text',
      schema: { ... },
      async execute(args) { /* logic từ tools.ts */ }
    },
    // ...
  ];
}
```

**knowledge.ts** (port from tools.ts lines 581-601, 603-646)
```typescript
export class KnowledgeToolPlugin implements ToolPlugin {
  name = 'knowledge';
  tools: Tool[] = [
    {
      name: 'search_knowledge_graph',
      // scanDir() + backlink/tag/content priority
    },
    {
      name: 'write_wiki_page',
      // Xác thực cấu trúc wiki + Obsidian backlink
    },
  ];
}
```

**document.ts** (port from tools.ts lines 648-846 — lớn nhất)
```typescript
// Convert execSync('node tmp.mjs') → dynamic import ESM
export class DocumentToolPlugin implements ToolPlugin {
  async executeReadPdf(args) {
    const { PDFExtract } = await import('pdf.js-extract');
    // Không cần execSync nữa
  }
}
```

#### Token & Complexity Impact
| Metric | Before (tools.ts) | After (registry) |
|--------|------------------|------------------|
| File size | 1444 dòng | ~150 dòng (registry) + ~100-200 dòng mỗi tool |
| Maintainability | ❌ Sửa tool = sửa 1 file khổng lồ | ✅ Mỗi tool độc lập |
| Async | ❌ execSync blocking | ✅ Full async |
| Plugin API | ❌ Không có | ✅ Bên ngoài đăng ký tool |

---

### 🟡 PHASE 3.2 — Model Adapter (High Priority)

**Mục tiêu**: Abstraction để không phụ thuộc vào 1 provider duy nhất (9router).

#### Implementation Plan

```
File: src/core/model-adapter.ts

interface ModelAdapter {
  readonly name: string;
  invoke(messages: Message[], options?: ModelOptions): Promise<ModelResponse>;
  estimateTokens(messages: Message[]): number;
  isAvailable(): boolean;
}

interface ModelOptions {
  model?: string;
  tools?: ToolDefinition[];
  maxTokens?: number;
  temperature?: number;
}

class RouterAdapter implements ModelAdapter {
  name = '9router';
  async invoke(messages, options) {
    // Logic từ engine.ts hiện tại — gọi 9router API
  }
}

class LiteLLMAdapter implements ModelAdapter {
  name = 'litellm';
  async invoke(messages, options) {
    // Gọi LiteLLM proxy server
    // Cho phép 100+ models
  }
}

class ModelRouter {
  private adapters: ModelAdapter[] = [];
  
  use(adapter: ModelAdapter): void { ... }
  
  async route(messages, options): Promise<ModelResponse> {
    // Fallback chain: try adapter 1 → fail → adapter 2
    for (const adapter of this.adapters) {
      if (await adapter.isAvailable()) {
        return adapter.invoke(messages, options);
      }
    }
    throw new Error('No adapter available');
  }
}
```

#### Benefits
- ✅ Fallback khi 9router down
- ✅ Dùng local models (Ollama) khi offline
- ✅ Dễ dàng thêm provider mới (OpenAI, Anthropic, etc.)

---

### 🟡 PHASE 3.3 — Async Engine (High Priority)

**Mục tiêu**: Convert engine.ts từ synchronous ReAct loop → async event-driven.

#### Implementation Plan

```
File: src/core/engine.ts (refactor)
File: src/core/agent.ts (NEW — orchestration)
File: src/core/hooks.ts (NEW — lifecycle events)

// Hooks System
type EventType = 
  | 'task:start' | 'task:complete' | 'task:error'
  | 'tool:call' | 'tool:result' | 'tool:error'
  | 'memory:write' | 'memory:read'
  | 'model:invoke' | 'model:response'
  | 'skill:load' | 'skill:unload';

interface AgentHook {
  event: EventType;
  handler: (context: HookContext) => Promise<void>;
}

// Async Engine Loop
class Agent {
  async run(task: Task): Promise<Result> {
    await this.hooks.emit('task:start', { task });
    
    while (!task.isComplete()) {
      // 1. Build context (memory + skills + knowledge)
      const context = await this.buildContext(task);
      
      // 2. Model invoke (async, non-blocking)
      const response = await this.model.invoke(context.messages, {
        tools: this.registry.getDefinitions()
      });
      
      await this.hooks.emit('model:response', { response });
      
      // 3. Handle tool calls
      if (response.hasToolCalls()) {
        for (const call of response.toolCalls) {
          await this.hooks.emit('tool:call', { call });
          const result = await this.registry.execute(call.name, call.args);
          await this.hooks.emit('tool:result', { call, result });
          context.addToolResult(call.id, result);
        }
        continue;
      }
      
      // 4. Final response
      await this.hooks.emit('task:complete', { response });
      return response;
    }
  }
}
```

---

### 🟡 PHASE 3.4 — Memory Store (High Priority)

**Mục tiêu**: ADD-only memory blocks + multi-signal retrieval.

#### Implementation Plan

```
File: src/core/memory-store.ts

interface MemoryBlock {
  id: string;
  type: 'human' | 'persona' | 'session' | 'task' | 'fact';
  content: string;
  timestamp: string;
  entities?: string[];
  tags?: string[];
}

class MemoryStore {
  // ADD-only — không có update/delete
  async add(type: MemoryBlock['type'], content: string, opts?: {
    entities?: string[];
    tags?: string[];
  }): Promise<MemoryBlock> { ... }
  
  // Multi-signal retrieval
  async query(text: string, opts?: {
    topK?: number;
    types?: MemoryBlock['type'][];
    timeRange?: [string, string];
  }): Promise<MemoryBlock[]> { ... }
  
  // Legacy migration: import từ memory.ts hiện tại
  async migrateFromLegacy(): Promise<void> { ... }
}
```

#### Migration Path
1. Giữ nguyên `memory.ts` hiện tại → rename `memory-legacy.ts`
2. Tạo `memory-store.ts` mới với ADD-only pattern
3. Engine dùng cả 2: legacy để đọc history cũ, new để ghi memory mới
4. Sau 1 thời gian → drop legacy

---

### 🟢 PHASE 3.5 — Event-driven Engine (Medium)

**Mục tiêu**: Cho phép plugins can thiệp vào agent lifecycle.

#### Implementation Plan

```
File: src/core/hooks.ts

class HookRegistry {
  private hooks = new Map<EventType, AgentHook[]>();
  
  on(event: EventType, handler: AgentHook['handler']): () => void {
    // Register hook, return unsubscribe function
  }
  
  async emit(event: EventType, context: any): Promise<void> {
    for (const hook of this.hooks.get(event) || []) {
      await hook.handler(context);
    }
  }
}

// Use cases:
// 1. Logging hook: log mọi tool call
hooks.on('tool:call', async (ctx) => {
  evolution.recordToolCall(ctx.call);
});

// 2. Guard hook: kiểm tra security trước khi execute
hooks.on('tool:call', async (ctx) => {
  if (!isAllowed(ctx.call.name)) throw new Error('Tool blocked');
});

// 3. Memory hook: tự động lưu context
hooks.on('tool:result', async (ctx) => {
  memory.add('fact', ctx.result);
});
```

---

### 🟢 PHASE 3.6 — O11y Tracing (Medium)

**Mục tiêu**: Trace mọi tool call + LLM invocation để tự optimize.

#### Implementation Plan

```
File: src/core/tracer.ts

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
  error?: string;
}

class Tracer {
  private spans: TraceSpan[] = [];
  private bufferSize = 100; // Lưu 100 spans gần nhất
  
  startSpan(name: string, type: TraceSpan['type']): TraceSpan { ... }
  endSpan(span: TraceSpan, output: any): void { ... }
  
  // Export để phân tích
  toJSON(): TraceSpan[] { ... }
  
  // Tự động detect patterns
  detectAnomalies(): Anomaly[] { ... }
}
```

---

### 🔵 PHASE 3.7 — Skill Runtime (Nice to Have)

**Mục tiêu**: Skill có thể thực thi, không chỉ markdown context.

#### Implementation Plan

```
File: src/core/skill-runtime.ts

interface Skill {
  name: string;
  version: string;
  description: string;
  triggers: SkillTrigger[];
  
  onActivate?(context: SkillContext): Promise<void>;
  onTask?(task: Task): Promise<SkillResult | null>;
  onDeactivate?(): Promise<void>;
}

// Skill Package = Chạy trong worker_threads hoặc sandbox
class SkillRuntime {
  async load(skill: Skill): Promise<void> { ... }
  async unload(name: string): Promise<void> { ... }
  
  // Lazy: only active skills consume memory
  getActiveSkills(): Skill[] { ... }
}
```

---

## 3. Timeline & Dependencies

```mermaid
gantt
    title Phase 3 Upgrade Timeline
    dateFormat  YYYY-MM-DD
    
    section 🔴 Phase 3.1
    Tool Registry Refactor    :3.1a, 3d
    Tool files migration      :3.1b, after 3.1a, 4d
    Test & Stabilize          :3.1c, after 3.1b, 2d
    
    section 🟡 Phase 3.2-3.4
    Model Adapter             :3.2, after 3.1c, 3d
    Async Engine              :3.3, after 3.2, 3d
    Memory Store              :3.4, after 3.3, 2d
    
    section 🟢 Phase 3.5-3.6
    Event Hooks               :3.5, after 3.4, 2d
    O11y Tracing              :3.6, after 3.5, 2d
```

### Dependency Graph
```
3.1 Tool Registry ─── 3.2 Model Adapter ─── 3.3 Async Engine ─── 3.5 Event Hooks
                              │                      │
                              ├── 3.4 Memory Store ───┘
                              └── 3.6 O11y Tracing ──── 3.7 Skill Runtime
```

**Critical path**: 3.1 → 3.2 → 3.3 → 3.5 (2 tuần nếu làm full-time)

---

## 4. API Design — Contract First

### Tool Registry API
```typescript
// Định nghĩa tool plugin
import { ToolRegistry, ToolPlugin } from './tool-registry';

export class MyCustomPlugin implements ToolPlugin {
  name = 'my-custom';
  tools = [{
    name: 'my_tool',
    description: 'Does something cool',
    schema: {
      type: 'object',
      properties: {
        input: { type: 'string' }
      },
      required: ['input']
    },
    async execute(args) {
      // No execSync, no temp files
      return { result: await someAsyncOperation(args.input) };
    }
  }];
}

// Đăng ký vào engine
const registry = new ToolRegistry();
registry.use(new FileSystemToolPlugin());   // built-in
registry.use(new KnowledgeToolPlugin());    // built-in
registry.use(new MyCustomPlugin());         // external plugin!
```

### Event Hook API
```typescript
// Thêm logging plugin
hooks.on('tool:call', async (ctx) => {
  tracer.startSpan(ctx.call.name, 'tool');
});

hooks.on('tool:result', async (ctx) => {
  tracer.endSpan(ctx);
});

hooks.on('model:invoke', async (ctx) => {
  evolution.recordModelCall(ctx.messages, ctx.options);
});
```

### Memory API
```typescript
// Ghi memory
await memory.add('fact', 'User prefers TypeScript over Python', {
  entities: ['User', 'TypeScript', 'Python'],
  tags: ['preference']
});

// Query
const relevant = await memory.query('what does user prefer?', {
  topK: 5,
  types: ['fact', 'session']
});
```

---

## 5. Migration Strategy

### Backward Compatibility

| Component | Legacy | New | Migration |
|-----------|--------|-----|-----------|
| tools.ts | `executeToolCall()` sync | `registry.execute()` async | Adapter wrapper trong 3.1a |
| engine.ts | Process loop sync | Agent class async | Dual mode: 3.3 có flag legacy mode |
| memory.ts | Channel-based | MemoryStore ADD-only | Dual write trong 3.4 |
| provider-registry.ts | 9router only | ModelRouter | Router wraps legacy |

### Rollback Plan
- Mỗi phase merge vào `phase-3/` branch, không ảnh hưởng `main`
- Nếu phase N fail → rollback phase N, keep N-1
- Legacy mode flag `KATO_LEGACY=true` cho phép chạy engine cũ

### Testing Strategy
1. **Unit test**: Mỗi tool plugin test riêng
2. **Integration test**: Engine loop với mock model
3. **Regression test**: Chạy task queue cũ → so sánh output
4. **Benchmark**: So sánh token count, latency, success rate

---

## 6. File-by-File Change List

| File | Action | Lines Before | Lines After | Notes |
|------|--------|-------------|-------------|-------|
| `src/core/tools.ts` | DELETE | 1444 | 0 | Split into registry + tools/ |
| `src/core/tool-registry.ts` | CREATE | - | ~150 | Core registry class |
| `src/core/tools/filesystem.ts` | CREATE | - | ~150 | 3 tools |
| `src/core/tools/knowledge.ts` | CREATE | - | ~80 | 2 tools |
| `src/core/tools/document.ts` | CREATE | - | ~250 | 5 tools (biggest) |
| `src/core/tools/archive.ts` | CREATE | - | ~100 | 2 tools |
| `src/core/tools/network.ts` | CREATE | - | ~50 | 1 tool |
| `src/core/tools/skills.ts` | CREATE | - | ~120 | 2 tools |
| `src/core/tools/report.ts` | CREATE | - | ~80 | 1 tool |
| `src/core/tools/system.ts` | CREATE | - | ~80 | 2 tools |
| `src/core/engine.ts` | MODIFY | 304 | ~200 | Event-driven loop |
| `src/core/agent.ts` | CREATE | - | ~150 | Agent lifecycle |
| `src/core/model-adapter.ts` | CREATE | - | ~100 | ModelRouter |
| `src/core/memory-store.ts` | CREATE | - | ~150 | ADD-only blocks |
| `src/core/hooks.ts` | CREATE | - | ~50 | HookRegistry |
| `src/core/tracer.ts` | CREATE | - | ~80 | Tracing spans |
| `src/core/evolution.ts` | MODIFY | current | +100 | Tracing integration |
| `src/core/prompt-builder.ts` | MODIFY | 223 | ~180 | Token-aware |
| `src/core/provider-registry.ts` | MODIFY | current | +50 | Wrap 9router |

**Total new code**: ~1,500 lines  
**Total removed**: ~1,444 lines (tools.ts) + legacy  
**Net increase**: ~50-100 lines (but much cleaner)

---

## 7. Success Criteria

### Must-Have (Gate để chuyển Phase)
- [ ] `tools.ts` 1444 dòng xóa thành công, không break regression tests
- [ ] Tool Registry có `register/execute/getDefinitions` với ít nhất 1 plugin hoạt động
- [ ] Model Adapter có fallback (9router → Ollama)
- [ ] Engine loop chạy async, không execSync blocking
- [ ] Memory Store ADD-only migrate thành công
- [ ] Context window không vượt 80% sau khi load identity files + 5 history messages

### Should-Have
- [ ] Event hooks có ít nhất 2 use cases hoạt động (logging + security)
- [ ] Tracer export được spans ra JSON
- [ ] Skill Runtime load được ít nhất 1 executable skill

### Nice-to-Have
- [ ] Sandboxed execution (Docker/Modal)
- [ ] Guardrails (input/output filtering)
- [ ] Prompt eval (A/B test templates)

---

## 8. Risks & Mitigation

| Risk | Impact | Likelihood | Mitigation |
|------|--------|-----------|------------|
| Tool Registry refactor breaks existing tools | High | Medium | Regression tests + dual mode |
| Async conversion breaks sync-dependent code | Medium | High | Legacy flag + wrapper adapter |
| Memory migration loses existing history | High | Low | Dual write + backup before migration |
| Model Adapter adds latency | Low | Medium | Caching + connection pool |
| Too aggressive refactor → scope creep | Medium | High | Phase gates: mỗi phase phải pass tests trước khi move |

---

## 9. Next Steps

1. ✅ **Done**: Deep analysis of current state (deep-comparison-report.md)
2. ✅ **Done**: This upgrade plan (phase-3-upgrade-plan.md)
3. ⬜ **Todo**: Start Phase 3.1a — Create Tool Registry class
4. ⬜ **Todo**: Phase 3.1b — Migrate tools/filesystem.ts first (easiest)
5. ⬜ **Todo**: Phase 3.1c — Migrate remaining tools
6. ⬜ **Todo**: Phase 3.1d — Delete tools.ts, connect ToolRegistry to engine

---

*Generated from deep comparison of Kato vs 13 AI Agent frameworks*