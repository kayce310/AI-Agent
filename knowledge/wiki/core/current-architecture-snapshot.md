# 📸 Architecture Snapshot — Ground Truth Baseline

> Generated: 2026-05-08T08:12:00Z
> Purpose: Pre-review baseline for external architecture assessment

---

## Task 1: Directory Structure Scan

### 1.1 src/core/ — Lõi xử lý (Depth 2)

```
src/core/
├── agents/                    # Agent runtime & management
│   ├── agent-manager.ts
│   ├── code-parser.ts
│   ├── docker-sandbox.ts
│   ├── failure-classifier.ts
│   ├── janitor.ts
│   ├── sandbox-executor.ts
│   ├── skill-runtime.ts
│   ├── skills-index-manager.ts
│   └── sub-agent.ts
├── engine/                   # Execution engine
│   ├── agent.ts
│   ├── decomposer.ts
│   ├── engine.ts
│   ├── orchestrator.ts
│   ├── plan-executor.ts
│   └── result-synthesizer.ts
├── gnap/                     # GNAP protocol
│   ├── gnap-agent-card.ts
│   └── gnap-queue.ts
├── llm/                      # LLM abstraction layer
│   ├── llm.ts
│   ├── model-adapter.ts
│   ├── ollama-adapter.ts
│   ├── prompt-builder.ts
│   └── provider-registry.ts
├── mcp/                      # MCP client/server
│   ├── mcp-client.ts
│   └── mcp-server.ts
├── memory/                   # Memory subsystems
│   ├── memory-agentic.ts
│   ├── memory-compressor.ts
│   ├── memory-log.ts
│   ├── memory-store.ts
│   ├── memory-temporal.ts
│   ├── memory.ts
│   └── state-manager.ts
├── observability/            # Metrics & tracing
│   ├── cost-tracker.ts
│   ├── eval-engine.ts
│   ├── langfuse-client.ts
│   ├── promptfoo-client.ts
│   └── tracer.ts
├── patterns/                 # Thinking patterns (20 files)
│   ├── adaptive-thinking.ts
│   ├── agent-workforce.ts
│   ├── chain-of-thought.ts
│   ├── chaining.ts
│   ├── code-exec.ts
│   ├── context-compression.ts
│   ├── dynamic-scaffolding.ts
│   ├── evaluation.ts
│   ├── human-in-the-loop.ts
│   ├── index.ts
│   ├── memory-augmented.ts
│   ├── multi-agent.ts
│   ├── orchestrator-workforce.ts
│   ├── parallel.ts
│   ├── reflection.ts
│   ├── routing.ts
│   ├── self-consistency.ts
│   ├── self-discovery.ts
│   ├── supervisor.ts
│   ├── tool-arbiter.ts
│   └── tool-augmented.ts
├── security/                 # Security layer
│   ├── input-guard.ts
│   ├── output-guard.ts
│   ├── privilege-guard.ts
│   ├── rate-limiter.ts
│   ├── response-cache.ts
│   └── security-scanner.ts
├── sop/                      # SOP engine
│   ├── pattern-registry.ts
│   ├── pattern-selector.ts
│   ├── sop-engine.ts
│   └── sop-registry.ts
├── tools/                    # Tool plugins (10 plugins)
│   ├── _shared.ts
│   ├── archive.ts
│   ├── document.ts
│   ├── filesystem.ts
│   ├── knowledge.ts
│   ├── network.ts
│   ├── report.ts
│   ├── skills.ts
│   ├── system.ts
│   ├── tool-pruner.ts
│   ├── tool-registry.ts
│   └── tools.ts
├── evolution.ts              # Self-evolution logic
├── hooks.ts                  # Lifecycle hooks
├── index.ts                  # Core barrel export
└── types.ts                  # Shared type definitions
```

**Core stats**: 11 subdirectories, ~65 TypeScript files

---

### 1.2 src/modules/ — Module ngoại vi (Depth 2)

```
src/modules/
├── discord/                   # Discord bot integration
│   └── index.ts
├── document/                  # Document processing pipeline
│   ├── converter.ts
│   ├── docx-parser.ts
│   ├── formula-extractor.ts
│   ├── parser.ts
│   └── pdf-parser.ts
├── knowledge/                 # Knowledge archiving
│   └── md-archiver.ts
└── report/                    # Report generation
    ├── generator.ts
    └── style-engine.ts
```

**Modules stats**: 4 modules, 9 TypeScript files

---

### 1.3 knowledge/ — Tri thức (Depth 2)

```
knowledge/
├── analysis/                  # Analysis documents
│   ├── skill-system-implementation-plan.md
│   └── v5.0-vs-skill-framework-gap-analysis.md
├── blueprints/                # Raw blueprints & backups
│   ├── queue/                 # Chunked processing queue
│   ├── *.pdf, *.docx, *.json # Mixed raw assets
│   └── 9router-backup-*.json  # Router config backups
├── memory/                    # Agent memory
│   └── *.json
├── memory-store/              # Memory store manifest
│   └── manifest.json
├── memory-temporal/           # Temporal memory
│   └── manifest.json
├── raw/                       # Raw source documents (PDFs)
│   └── *.pdf, *.txt
├── raw-md/                    # Raw markdown conversions
├── references/                # Reference materials
├── wiki/                      # Structured knowledge base
│   ├── AGENTS.md              # Role router
│   ├── architecture.md        # Architecture overview
│   ├── index.md               # Knowledge base index
│   ├── blueprints/            # Architecture blueprints (2 files)
│   ├── core/                  # Core architecture docs (7 files + _INDEX)
│   ├── knowledge/             # Domain knowledge (3 files)
│   ├── projects/              # Project profiles (2 files)
│   ├── prompts/               # Prompt templates (3 files)
│   ├── repos/                 # Repo analysis (10+ analysis files)
│   ├── rules/                 # Governance rules
│   ├── scripts/               # Script documentation
│   ├── skills/                # Skill library (~170 skill files + _INDEX)
│   ├── tools/                 # Tool definitions
│   └── troubleshooting/       # Troubleshooting guides (5 files + _INDEX)
└── workspace/                 # Runtime state
    ├── audit-findings-sprintA.md
    ├── checkpoint.json
    ├── checkpoint.bak.json
    ├── evolution.json
    ├── priority-plan.md
    ├── processed-files.json
    ├── restructure-plan-remaining.md
    ├── state.json
    └── state.md
```

**Knowledge stats**: ~200+ files across 12 subdirectories

---

## Task 2: Governance Check

### 2.1 Folder Code Ownership Rules

**Status: ⚠️ PARTIAL — No explicit folder-to-code mapping document exists**

| Folder | Expected Content | Enforced? |
|--------|-----------------|-----------|
| `src/core/` | Core engine, agents, LLM, memory, security, tools | ❌ No hard rule |
| `src/modules/` | Peripheral integrations (Discord, docs, reports) | ❌ No hard rule |
| `knowledge/wiki/` | Structured knowledge, skills, architecture docs | ❌ No hard rule |
| `knowledge/blueprints/` | Raw assets, backups, queue | ❌ No hard rule |
| `knowledge/workspace/` | Runtime state only | ❌ No hard rule |
| `scripts/` | Utility scripts | ❌ No hard rule |
| `tests/` | Test files | ❌ No hard rule |

**Finding**: CLINE.md defines operational laws (checkpoint, token budget, git commit) but does NOT specify which folder can contain what code type. No `.gitkeep` or `README.md` in subdirectories to enforce boundaries.

---

### 2.2 Tool/Module Registration Process

**Status: ✅ DEFINED — Plugin-based registration via ToolRegistry**

From `src/core/tools/tool-registry.ts`:

```typescript
// Registration API:
registry.use(plugin)       // Register a tool plugin
registry.getDefinitions()  // Get OpenAI-compatible definitions
registry.execute(name, args) // Execute by name
```

**Built-in plugins** (auto-registered in `registerBuiltInPlugins`):
- `filesystem`, `knowledge`, `document`, `network`, `archive`, `skills`, `report`, `system`

**Process**:
1. Create plugin file in `src/core/tools/`
2. Export default `ToolPlugin` with `name`, `tools[]`, optional `onRegister`
3. Add entry to `pluginModules` map in `registerBuiltInPlugins()`
4. Singleton `getDefaultRegistry()` auto-loads all plugins

**Finding**: No formal documentation of this process exists outside the code itself. No `CONTRIBUTING.md` or registration guide.

---

### 2.3 Skills Inventory Management

**Status: ✅ DEFINED — Centralized index at `knowledge/wiki/skills/_INDEX.md`**

**Structure**:
- `knowledge/wiki/skills/` contains ~170 skill files
- `_INDEX.md` is the master catalog with categories:
  - 🔒 Security & Auth (5 skills)
  - 🚀 DevOps & Cloud (10 skills)
  - 📱 Mobile (12 skills)
  - 🤖 AI & Agents (5 skills)
  - 🧪 Testing (10 skills)
  - 🖥️ Backend & Database (25 skills)
  - 🎨 Frontend & UI (50+ skills)
  - 🧰 Tools & Libraries (40+ skills)
  - 🧱 Nền tảng / Platform (4 core skills)
  - 🧠 Quản trị Tri thức / Knowledge Mgmt (2 skills)
  - ⚙️ Xử lý Nâng cao / Advanced (3 skills)
  - 🎨 Giao diện / UI (1 skill)
  - 🔒 Bảo mật / Security (1 skill)
  - 🧬 Tiến hóa / Evolution (1 skill)
  - 🚀 Deployment (1 skill)

**Core platform skills** (Kato-specific):
- `coding-standards` — Module hóa, MCP compatibility
- `verification-protocol` — Testing, validation
- `communication-protocol` — Ultra-Terse Mode
- `state-management` — Data Plane, atomic writes
- `knowledge-management` — Wiki, indexing
- `obsidian-formatting` — Wiki-links, tags
- `big-data-processing` — Chunking, orchestrator-worker
- `automation-directives` — O(1) query, self-learning
- `ui-vibe-coding` — Design system
- `security-sandbox` — Docker isolation
- `evolution-protocol` — Changelog, memory commit
- `module-discord` — Discord bot startup

**Finding**: Skills are well-cataloged but many appear to be third-party (Clerk, Cloudflare, etc.) — unclear which are actively used vs. reference.

---

## Task 3: Baseline Summary

### System Version
- **Kato Bootloader**: v5.0
- **Knowledge Base**: v4.0
- **Architecture**: Agentic Workspace with Control/Data Plane separation

### Key Architectural Patterns
1. **Plugin-based tool system** — Tools registered via `ToolRegistry.use()`
2. **Modular skills** — Each skill = 1 file, 1 task
3. **State management** — `state.json` via `kato-state-manager` (no direct edits)
4. **Checkpoint protocol** — Anti-overflow with `checkpoint.json`
5. **Zero Waste Token** — Load only what's needed

### Governance Gaps Identified
| Gap | Severity | Location |
|-----|----------|----------|
| No folder-to-code ownership rules | Medium | Missing doc |
| No tool registration guide | Low | Code-only |
| No skill lifecycle management | Medium | `_INDEX.md` only |
| No architecture decision records (ADR) | Medium | `core/architecture-decisions.md` exists but not linked from index |
| Mixed third-party vs core skills | Low | `knowledge/wiki/skills/` |

### File Counts
| Area | Files |
|------|-------|
| `src/core/` | ~65 .ts |
| `src/modules/` | ~9 .ts |
| `src/scripts/` | ~3 .ts/.js |
| `knowledge/wiki/skills/` | ~170 .md |
| `knowledge/wiki/core/` | 7 .md |
| `knowledge/wiki/repos/` | 12 .md |
| `knowledge/blueprints/` | ~30+ mixed |
| `knowledge/raw/` | ~30+ PDFs |
| `tests/` | 18 .test.ts |

---

> 📸 Snapshot complete. Ready for external architecture review.
