# 🏗️ Kato Agent — Architecture Snapshot (v6.0)

> **Cập nhật**: 2026-05-21T03:00:00Z
> **Phiên**: gov-phase-8
> **Trạng thái**: Bot Discord đang chạy, 9router external configured

---

## 1. Tổng Quan Kiến Trúc

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        KATO AGENT v6.0                                  │
│                    Framework 6 Layers + Plugin Architecture             │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐              │
│  │   Discord     │───▶│   Engine     │───▶│   LLM        │              │
│  │   Bridge      │    │   (ReAct)    │    │   Providers  │              │
│  │   (Adapter)   │◀───│              │◀───│   (9router)  │              │
│  └──────────────┘    └──────┬───────┘    └──────────────┘              │
│                             │                                           │
│                    ┌────────┴────────┐                                  │
│                    │   Tool System   │                                  │
│                    │   (Plugin-based)│                                  │
│                    └────────┬────────┘                                  │
│                             │                                           │
│         ┌───────────────────┼───────────────────┐                      │
│         │                   │                   │                      │
│    ┌────┴────┐        ┌────┴────┐        ┌────┴────┐                  │
│    │ Security│        │ Memory  │        │Patterns │                  │
│    │ (6 file)│        │ (7 file)│        │(16 file)│                  │
│    └─────────┘        └─────────┘        └─────────┘                  │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                    Knowledge Graph (Read-only)                   │   │
│  │  knowledge/wiki/  │  knowledge/blueprints/  │  knowledge/workspace/ │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Cấu Trúc Thư Mục

### 2.1. Source Code (`src/`)

| Thư mục | Mục đích | Files |
|---------|----------|-------|
| `src/index.ts` | Entry point, barrel export | 1 |
| `src/core/` | Core domain (Engine, Agent, Security, Memory, Patterns, Tools) | ~50 |
| `src/core/engine/` | ReAct loop, Agent lifecycle, Orchestrator | 6 |
| `src/core/tools/` | Tool plugins (filesystem, knowledge, document, network, archive, skills, report, system) | 11 |
| `src/core/security/` | Input/Output guard, Privilege guard, Rate limiter, Security scanner | 6 |
| `src/core/memory/` | Memory core, Store, Temporal, Agentic, Log | 7 |
| `src/core/patterns/` | 16 agent patterns (CoT, ReAct, Reflection, etc.) | 16 |
| `src/core/llm/` | LLM adapter, Model router, Provider registry, Prompt builder, Ollama | 5 |
| `src/core/observability/` | Tracer, Cost tracker, Eval engine, Langfuse, Promptfoo | 5 |
| `src/core/sop/` | SOP engine, Registry, Pattern selector | 4 |
| `src/core/gnap/` | GNAP protocol, Agent card | 2 |
| `src/core/mcp/` | MCP client, MCP server | 2 |
| `src/core/agents/` | Agent manager, Code parser, Janitor, Sandbox, Sub-agent, Skills index | 9 |
| `src/modules/` | Peripheral adapters (Discord, Document, Knowledge, Report) | 10 |
| `src/scripts/` | Startup scripts (Discord, State manager) | 2 |

### 2.2. Knowledge (`knowledge/`)

| Thư mục | Mục đích | Files |
|---------|----------|-------|
| `knowledge/wiki/` | Architecture docs, Skills (~170), Troubleshooting | ~200 |
| `knowledge/blueprints/` | Raw assets, backups, PDFs | ~30 |
| `knowledge/workspace/` | State, checkpoint, evolution, processed-files | ~15 |
| `knowledge/memory/` | Memory store, temporal | ~5 |
| `knowledge/analysis/` | Implementation plans, gap analyses | ~5 |
| `knowledge/raw/` | PDFs, technical docs | ~20 |

### 2.3. Config & Scripts

| Thư mục | Mục đích | Files |
|---------|----------|-------|
| `config/` | Provider configs | 1 |
| `scripts/` | Utility scripts (validate, configure-9router, etc.) | 10 |
| `tests/` | Test files (mirror src/ structure) | 15 |
| `9router/` | 9router source (legacy, runtime at `e:\Test\9router`) | ~20 |
| `.husky/` | Git hooks | 2 |
| `.github/` | CI workflows | ~5 |

---

## 3. Cơ Chế Hoạt Động

### 3.1. Boot Sequence

```
1. 9router-boot.bat
   ├── Check 9router running on port 20128
   ├── If not → start e:\Test\9router (npm run dev)
   ├── Run 9router-select.ps1 (fetch models, select combo)
   └── Call kato-boot.bat

2. kato-boot.bat
   ├── Kill old instances (PID file)
   ├── Check dependencies (npm install)
   └── Start: npx tsx src/scripts/start-discord.ts

3. start-discord.ts
   ├── PID lock (single instance)
   ├── Create Engine → engine.init()
   │   ├── Load providers from config/providers.json
   │   ├── Init evolution engine
   │   ├── Load tool registry (plugins)
   │   ├── Load tool pruner definitions
   │   ├── Build model router
   │   └── Create Agent with config
   ├── Create DiscordBridge(engine)
   └── bridge.start() → Discord.login(token)
```

### 3.2. Message Processing Flow

```
Discord Message
    │
    ▼
DiscordBridge.messageCreate()
    ├── Check: bot message? → skip
    ├── Check: /switch model: → update currentModel
    ├── Check: /list models → reply with models
    ├── Check: @Kato or "kato" in message
    │   ├── Cross-instance dedup (lock file)
    │   ├── In-memory dedup (Set)
    │   ├── Save user message to history
    │   ├── Get channel history
    │   ├── Create EngineRequest
    │   ├── Send "⏳ Đang xử lý..."
    │   └── Call engine.process(request)
    │
    ▼
Engine.process()
    ├── Load KATO identity files (CLINE.md, AGENTS.md, soul.md)
    ├── Build system prompt (PromptBuilder)
    ├── Agent.run() (ReAct loop)
    │   ├── selectRelevantTools(userMessage) → tool-pruner
    │   ├── If 0 tools → fallback to full registry
    │   ├── Cycle >= 3 → restrict to core tools only
    │   ├── ModelRouter.route() → try adapters in tier order
    │   │   ├── 9router (tier 1) → http://localhost:20128/v1
    │   │   └── On failure → cascade to next tier
    │   ├── Parse tool_calls from response
    │   ├── Execute tools via ToolRegistry
    │   │   └── Each tool → secureRuntime (tool-gateway.ts)
    │   └── Loop until max cycles or final response
    │
    ▼
DiscordBridge (callback)
    ├── Save assistant message to history
    ├── Edit "⏳" message with response
    └── Release locks
```

### 3.3. Tool System (Plugin-based)

```
ToolRegistry (singleton)
    ├── registerBuiltInPlugins()
    │   ├── filesystem  → list_directory, read_file
    │   ├── knowledge   → search_knowledge_graph, write_wiki_page
    │   ├── document    → read_pdf, read_docx, extract_formulas, archive_document
    │   ├── network     → fetch_url
    │   ├── archive     → archive_file, extract_archive
    │   ├── skills      → load_skill, check_stale_skills
    │   ├── report      → generate_report, quote_from_source
    │   ├── system      → execute_command, process_new_raw
    │   └── (each plugin: name, tools[], execute())
    │
    ├── getDefinitions() → OpenAI-compatible tool definitions
    ├── execute(name, args) → run tool by name
    └── executeToolCall(toolCall) → backward-compat wrapper

ToolPruner
    ├── ensureToolDefinitionsLoaded() → preload from registry
    ├── selectRelevantTools(userMessage) → keyword matching
    │   └── Categories: core, filesystem, document, knowledge, network, skills, report, archive, system
    └── estimateToolsTokenCount(tools) → token estimation

ToolGateway (Security)
    ├── secureRuntime (singleton)
    │   ├── safeReadFile() → fs.readFileSync (validated path)
    │   ├── safeWriteFile() → fs.writeFileSync (validated path)
    │   ├── safeExists() → fs.existsSync (validated path)
    │   ├── safeReaddir() → fs.readdirSync (validated path)
    │   ├── safeStat() → fs.statSync (validated path)
    │   └── validatePath() → isPathSafe() from privilege-guard
    └── isPathSafe() → 6-layer Zero-Trust path validation
```

### 3.4. Security Layer

```
PrivilegeGuard
    ├── 6-layer isPathSafe():
    │   ├── Layer 1: Normalize path
    │   ├── Layer 2: Reject null bytes
    │   ├── Layer 3: Normalize Windows backslash
    │   ├── Layer 4: Reject traversal (..)
    │   ├── Layer 5: Reject absolute paths
    │   └── Layer 6: Enforce workspace root prefix
    ├── RBAC rules (allow/deny per tool pattern)
    └── Hook-based enforcement

InputGuard  → Prompt injection detection
OutputGuard → Data leakage prevention
RateLimiter → Token bucket (60 req/min, 100k tokens/min)
ResponseCache → LRU cache (500 entries, 5min TTL)
SecurityScanner → Static analysis for tool abuse
```

### 3.5. Memory System

```
MemoryCore       → Channel-based message store
MemoryStore      → ADD-only memory blocks (JSON)
MemoryTemporal   → Time-based retention (30 days)
MemoryAgentic    → Agent-writeable memory
MemoryLog        → Structured memory blocks
```

### 3.6. LLM Provider System

```
ProviderRegistry
    ├── loadFromConfig() → read config/providers.json
    └── Register adapters

ModelRouter
    ├── buildDefaultRouter() → create adapters from registry
    ├── route(messages, options) → try adapters in tier order
    │   ├── Emit cascade events (trying/failed)
    │   └── Return first successful response
    └── Cascade fallback on failure

9router (External)
    ├── Runtime: e:\Test\9router\ (Next.js app)
    ├── API: http://localhost:20128/v1
    ├── Config: config/providers.json
    │   ├── baseUrl: http://localhost:20128/v1
    │   ├── apiKey: local-proxy-key
    │   └── models: openrouter/openrouter/owl-alpha
    └── Skills: e:\Test\9router\skills\ (.kto.md format)
```

---

## 4. Luật Vận Hành (CLINE.md)

| Luật | Mô tả |
|------|--------|
| **Validate Structure** | Trước mỗi tạo/sửa file trong `src/`, chạy validate-structure.ts --strict |
| **Auto-Validate** | Sau MỖI tool call, tự động chạy validate |
| **Auto-Register** | Sau MỖI tool call, tự động cập nhật processed-files.json |
| **Blueprint** | Khi tạo file trong `knowledge/blueprints/`, dùng kato-state-manager |
| **Workspace Path** | Mọi path tính từ gốc repo (e:/Test/AI-Agent) |
| **Skip** | Files trong processed-files.json có thể skip |
| **Checkpoint** | Mỗi tool call phải kèm task_progress |
| **Token Budget** | Kiểm tra context.tokenBudget trước mỗi tool call |
| **Git Commit** | Mỗi khi hoàn thành 1 step, git add + commit |

---

## 5. Pre-commit Hooks

```
.husky/pre-commit     → Shell script (Linux/Mac)
.husky/pre-commit.ps1 → PowerShell script (Windows)
    └── npx tsx scripts/validate-structure.ts --strict
        ├── R1: Folder Ownership
        ├── R2: Import Path Integrity
        ├── R3: Dependency Headers (@depends-on)
        ├── R4: Dead Code Detection
        └── R5: Static Security Scan (raw fs import)
```

---

## 6. State Management

```
knowledge/workspace/state.json
    ├── agent.lifecycle: READY
    ├── agent.role: Lead AI Engineer
    ├── session.id: session-2026-05-14T13-36-00-000Z
    ├── controlPlane.bootloader: CLINE.md
    ├── dataPlane.statePath: knowledge/workspace/state.json
    ├── engineVersion: v5.3.1
    └── critical: memoryCompressor, safeContextTruncator, reactLoopGuard

knowledge/workspace/processed-files.json
    └── Registry of all created/modified files with checksums

knowledge/workspace/checkpoint.json
    └── Session checkpoint for overflow recovery
```

---

## 7. Known Issues

| Issue | Severity | Status |
|-------|----------|--------|
| `read_file` execution failed: Cannot access 'path' before initialization | HIGH | Investigating (circular import in tool-gateway) |
| Tool pruner returns 0 tools for some messages | MEDIUM | Acceptable (fallback to full registry) |
| 84 files missing @depends-on headers | LOW | Pre-existing |
| 16 dead code exports in index.ts | LOW | Pre-existing |
| `src/core/index.ts` has wrong import paths (`../engine` vs `./engine`) | MEDIUM | Pre-existing, doesn't affect runtime |

---

## 8. External Dependencies

| Service | Location | Port | Status |
|---------|----------|------|--------|
| 9router | e:\Test\9router\ | 20128 | Configured |
| Discord | discord.com | 443 | Connected |
| OpenRouter | openrouter.ai | 443 | Via 9router |

---

> 📌 **Next Action**: Fix `read_file` path initialization issue, add @depends-on headers to new files, investigate circular imports
