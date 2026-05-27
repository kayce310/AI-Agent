# Hermes Agent — Phân Tích Kiến Trúc & Tham Chiếu cho Kato

> **Nguồn:** `E:\Test\hermes-agent` (Nous Research, v0.14.0)
> **Mục đích:** Tham chiếu đích cho Kato Agent — so sánh kiến trúc, phát hiện gap, đề xuất cải tiến.

---

## 1. Tổng quan hai hệ thống

| Chiều | Hermes Agent (Nous) | Kato Agent |
|-------|--------------------|------------|
| **Ngôn ngữ** | Python 3.13 | TypeScript (Node.js) |
| **Kiến trúc** | Monolithic Python package với plugin system | Monorepo TypeScript với layered modules |
| **Conversation loop** | `AIAgent` class (~12k LOC, `run_agent.py`) | `Agent.run()` trong `src/core/engine/agent.ts` |
| **Tool system** | Auto-discovery via `tools/registry.py` (import-time self-registration) | Plugin-based `ToolRegistry` (manual registration) |
| **Skills** | `~/.hermes/skills/` — SKILL.md format, Hub ecosystem | `knowledge/agents-skills/` + `knowledge/wiki/skills/` — SKILL.md |
| **Memory** | FTS5 SQLite + LLM summarization + MemoryProvider plugins | 3-layer: Log → Temporal → Store |
| **Platform** | 20+ (Telegram, Discord, Slack, WhatsApp, Signal, ...) | Discord only |
| **Tests** | ~17k tests, pytest | 399 tests, vitest |
| **Hỗ trợ model** | 15+ providers (OpenRouter, Anthropic, OpenAI, Gemini, Nous Portal, ...) | 9Router proxy → OpenRouter |
| **Sub-agents** | Delegate tool + Kanban board | Orchestrator + SOP Engine |

---

## 2. Phân tích chuyên sâu từng layer

### 2.1 Tool System

**Hermes Agent:**
- [`tools/registry.py`](E:\Test\hermes-agent\tools\registry.py) (590 LOC) — central registry with AST-based auto-discovery
- Mỗi tool file gọi `registry.register()` ở module level → tự động được phát hiện khi import
- `discover_builtin_tools()` quét thư mục `tools/`, dùng `ast.parse` để kiểm tra file nào có `registry.register()` trước khi import
- [`model_tools.py`](E:\Test\hermes-agent\model_tools.py) query registry thay vì maintain parallel data structures
- **80+ tool implementations** trong `tools/*.py`
- Toolset system: tools được nhóm thành toolsets (core, devops, research,...) có thể enable/disable

**Kato:**
- [`src/core/tools/tool-registry.ts`](src/core/tools/tool-registry.ts) (248 LOC) — manual plugin registration
- Mỗi tool plugin phải được import và gọi `registry.use(plugin)` thủ công
- `getDefaultRegistry()` + `registerBuiltInPlugins()` hardcode danh sách plugins
- **19 tools** từ 9 plugins

**Gap & Đề xuất:**
```diff
+ Thêm auto-discovery cho tool plugins (scan directory pattern)
+ Thêm toolset system (nhóm tools theo category, enable/disable)
+ Mở rộng từ 19 → 80+ tools
```

### 2.2 Skill System

**Hermes Agent:**
- [`tools/skills_tool.py`](E:\Test\hermes-agent\tools\skills_tool.py) (1,568 LOC) — `skills_list()` + `skill_view()` với progressive disclosure
- [`tools/skills_hub.py`](E:\Test\hermes-agent\tools\skills_hub.py) (3,555 LOC) — Skills Hub: fetch skills từ GitHub repos, agentskills.io, Claude Marketplace, LobeHub, ClawHub
- [`tools/skills_guard.py`](E:\Test\hermes-agent\tools\skills_guard.py) — security scanning cho skills trước khi install
- [`agent/skill_utils.py`](E:\Test\hermes-agent\agent\skill_utils.py) — skill path utilities, exclusion lists
- [`agent/skill_commands.py`](E:\Test\hermes-agent\agent\skill_commands.py) — skill quản lý commands
- Skills hoạt động ở **user space**: `~/.hermes/skills/` — agent có thể tạo, sửa, xóa skills
- **Progressive disclosure**: metadata → full content → references (3 tiers)
- **Self-improvement**: agent tự động tạo skill sau task phức tạp, skill tự cải thiện khi dùng
- [agentskills.io](https://agentskills.io) open standard compatible

**Kato:**
- [`src/core/agents/skill-runtime.ts`](src/core/agents/skill-runtime.ts) (459 LOC) — internal skill execution engine, trigger-based
- [`src/core/tools/skills.ts`](src/core/tools/skills.ts) — tool plugin (đã fix từ 9router → agents-skills)
- Skills là **read-only markdown** trong `knowledge/agents-skills/` (27 SKILL.md files)
- Không có auto skill creation, không có skills hub, không có security scanning

**Gap & Đề xuất:**
```diff
+ Thêm progressive disclosure loading (metadata → content → references)
+ Thêm skills hub (GitHub repos, agentskills.io registry)
+ Thêm skill security scanning (YARA rules, content hash)
+ Cho phép agent tạo skill runtime (write SKILL.md)
+ Implement self-improvement loop cho skills
```

### 2.3 Memory System

**Hermes Agent:**
- [`agent/memory_manager.py`](E:\Test\hermes-agent\agent\memory_manager.py) (610 LOC) — orchestrator cho memory providers
- [`agent/memory_provider.py`](E:\Test\hermes-agent\agent\memory_provider.py) — abstract base class
- FTS5 SQLite full-text search + LLM summarization
- Plugin providers: Honcho (dialectic user modeling), mem0, supermemory
- **Context fencing**: `<memory-context>` tags + sanitize để ngăn memory leak vào response
- **StreamingContextScrubber** — state machine để scrub memory context khỏi stream chunks
- **Prefetch + sync cycle**: `prefetch_all(user_msg)` trước turn → `sync_all(user_msg, response)` sau turn

**Kato:**
- [`src/core/memory/memory-store.ts`](src/core/memory/memory-store.ts) (451 LOC) — query-based store với relevance scoring
- [`src/core/memory/memory-log.ts`](src/core/memory/memory-log.ts) (507 LOC) — append-only log
- [`src/core/memory/memory-temporal.ts`](src/core/memory/memory-temporal.ts) (303 LOC) — temporal query
- [`src/core/memory/memory.ts`](src/core/memory/memory.ts) (131 LOC) — channel history
- 3-layer nhưng **thiếu memory provider abstraction** và plugin support
- **Không có context fencing** — memory context dễ bị lẫn vào response

**Gap & Đề xuất:**
```diff
+ Thêm abstract MemoryProvider interface (plugin pattern)
+ Thêm context fencing (<memory-context> tags + sanitize)
+ Thêm StreamingContextScrubber cho stream responses
+ Implement prefetch/sync cycle cho memory operations
```

### 2.4 System Prompt Architecture

**Hermes Agent:**
- [`agent/system_prompt.py`](E:\Test\hermes-agent\agent\system_prompt.py) (381 LOC)
- **3-tier prompt**: `stable` (identity, tools) + `context` (AGENTS.md, .cursorrules) + `volatile` (memory, timestamp)
- **Prompt caching**: built once per session, reused across turns → keeps upstream prefix cache warm
- Chỉ context compression triggers rebuild
- [`agent/prompt_builder.py`](E:\Test\hermes-agent\agent\prompt_builder.py) — modular prompt parts (SKILLS_GUIDANCE, MEMORY_GUIDANCE, TOOL_USE_ENFORCEMENT_GUIDANCE, ...)

**Kato:**
- [`src/core/llm/prompt-builder.ts`](src/core/llm/prompt-builder.ts) (242 LOC) — single buildSystem() method
- Không có prompt tier separation
- Không có prompt caching
- Không có modular guidance parts

**Gap & Đề xuất:**
```diff
+ Implement 3-tier prompt architecture (stable/context/volatile)
+ Thêm prompt caching reuse accross turns
+ Modularize prompt parts (tách thành guidance modules)
+ Giữ upstream prefix cache warm bằng cách không rebuild prompt mỗi turn
```

### 2.5 Multi-Platform Gateway

**Hermes Agent:**
- [`gateway/`](E:\Test\hermes-agent\gateway/) — single process, multiple platform adapters
- [`gateway/platforms/`](E:\Test\hermes-agent\gateway\platforms/) — 20+ adapters: Telegram, Discord, Slack, WhatsApp, Signal, Matrix, Mattermost, email, SMS, DingTalk, WeCom, Feishu, QQ bot, BlueBubbles, HomeAssistant, webhook, API server...
- Cross-platform conversation continuity
- Voice memo transcription across all platforms

**Kato:**
- [`src/modules/discord/index.ts`](src/modules/discord/index.ts) (275 LOC) — Discord only
- Không có platform adapter abstraction

**Gap & Đề xuất:**
```diff
+ Tạo abstract PlatformAdapter interface
+ Thiết kế gateway layer dạng plugin (mỗi platform là một module)
```

### 2.6 Delegation & Parallelization

**Hermes Agent:**
- [`tools/delegate_tool.py`](E:\Test\hermes-agent\tools\delegate_tool.py) — spawn isolated subagents
- Subagents có iteration budget riêng, không ảnh hưởng đến parent
- Python RPC: tools có thể gọi tools khác qua function call
- [`agent/skill_bundles.py`](E:\Test\hermes-agent\agent\skill_bundles.py) — bundle nhiều steps thành một zero-context-cost turn
- [`cron/`](E:\Test\hermes-agent\cron/) — built-in scheduler: daily reports, nightly backups, weekly audits

**Kato:**
- [`src/core/engine/orchestrator.ts`](src/core/engine/orchestrator.ts) (247 LOC) — orchestration với cycle detection
- [`src/core/engine/decomposer.ts`](src/core/engine/decomposer.ts) (203 LOC) — task decomposition
- [`src/core/engine/plan-executor.ts`](src/core/engine/plan-executor.ts) (260 LOC) — plan execution
- **Không có subagent spawning**, không có RPC tool calling, không có scheduler

**Gap & Đề xuất:**
```diff
+ Implement subagent delegation (spawn isolated agent instances)
+ Thêm iteration budget cho mỗi subagent
+ Tạo tool RPC mechanism (tools gọi tools)
+ Thêm cron/scheduler module
```

### 2.7 Terminal Backends

**Hermes Agent:**
- [`tools/environments/`](E:\Test\hermes-agent\tools\environments\)) — 7 backends:
  1. `local.py` — local terminal
  2. `docker.py` — Docker container
  3. `ssh.py` — SSH remote
  4. `modal.py` — Modal serverless
  5. `daytona.py` — Daytona serverless
  6. `singularity.py` — Singularity containers
  7. `vercel.py` — Vercel Sandbox
- Modal và Daytona có **serverless persistence**: environment hibernates khi idle, wakes on demand

**Kato:**
- [`src/core/agents/sandbox-executor.ts`](src/core/agents/sandbox-executor.ts) (278 LOC) — local terminal (WSL) only
- **Không có Docker, SSH, serverless support**

**Gap & Đề xuất:**
```diff
+ Implement Docker execution backend
+ Thêm SSH remote execution
```

### 2.8 Learning & Evolution

**Hermes Agent:**
- **Self-improving loop**:
  1. Agent thực hiện task phức tạp
  2. Tự động tạo skill mới → `~/.hermes/skills/<new-skill>/SKILL.md`
  3. Skill tự cải thiện trong quá trình sử dụng (frequency-weighted)
  4. Periodic nudges: "bạn có muốn lưu experience này thành skill?"
  5. FTS5 session search + LLM summarization cho cross-session recall
  6. Honcho dialectic user modeling (plugin)

**Kato:**
- [`src/core/evolution.ts`](src/core/evolution.ts) (400 LOC) — Evolution Engine
- Error-driven model routing (rate limit → cooldown, provider down → fallback)
- **Không có auto skill creation**, không có cross-session learning
- Evolution chỉ ảnh hưởng model selection, không ảnh hưởng behavior

**Gap & Đề xuất:**
```diff
+ Thêm auto skill creation từ task experience
+ Implement cross-session recall (FTS5 search + summarization)
+ Thêm periodic nudge mechanism ("lưu thành skill?")
```

### 2.9 Security

**Hermes Agent:**
- [`tools/skills_guard.py`](E:\Test\hermes-agent\tools\skills_guard.py) — YARA-based skill scanning, TRUSTED_REPOS list, content hash
- [`tools/path_security.py`](E:\Test\hermes-agent\tools\path_security.py) — path traversal protection
- [`tools/url_safety.py`](E:\Test\hermes-agent\tools\url_safety.py) — URL safety checking
- [`tools/threat_patterns.py`](E:\Test\hermes-agent\tools\threat_patterns.py) — threat detection patterns
- [`tools/tirith_security.py`](E:\Test\hermes-agent\tools\tirith_security.py) — Tirith policy engine

**Kato:**
- [`src/core/security/security-scanner.ts`](src/core/security/security-scanner.ts) — pattern-based scanning
- [`src/core/security/input-guard.ts`](src/core/security/input-guard.ts) — input validation
- [`src/core/security/output-guard.ts`](src/core/security/output-guard.ts) — output sanitization
- [`src/core/security/privilege-guard.ts`](src/core/security/privilege-guard.ts) — RBAC
- **Không có skill security scanning**, YARA rules, URL safety

**Gap & Đề xuất:**
```diff
+ Thêm skill security scanning (trước khi load SKILL.md)
+ Implement URL safety checking
```

---

## 3. So sánh chi tiết — File-by-file

### Source Lines of Code

| Layer | Hermes Agent | Kato Agent |
|-------|-------------|------------|
| Core loop | ~12k (run_agent.py) | ~1.5k (agent.ts + engine.ts) |
| Tools | ~25k (80+ files) | ~3k (15 files) |
| Skills | ~8k (skills_hub.py + skills_tool.py + skills_guard.py) | ~500 (skill-runtime.ts + skills.ts) |
| Memory | ~1.2k (memory_manager.py + memory_provider.py) | ~1.4k (4 files) |
| Gateway | ~5k (gateway/ structure) | ~275 (discord/index.ts) |
| Agent internals | ~15k (65 files in agent/) | ~2k (agents/ directory) |
| Security | ~3k (5 files) | ~2k (6 files) |
| **Total** | **~70k LOC** | **~10k LOC** |

---

## 4. Roadmap đề xuất cho Kato

### Phase 1 — Nền tảng (Current)
- [✅] Skill scan paths: `knowledge/wiki/skills/` + `knowledge/agents-skills/`
- [✅] Tool plugin `skills.ts`: agents-skills path (đã fix)
- [ ] Progressive disclosure loading cho skills
- [ ] Skills list tool trả về metadata (không load full content)

### Phase 2 — Mở rộng Tool System
- [ ] Auto-discovery pattern cho tool plugins (scan directory)
- [ ] Toolset grouping (core/devops/research)
- [ ] Thêm 10-15 tools cốt lõi (web search, code execution, terminal)

### Phase 3 — Multi-Platform
- [ ] Abstract `PlatformAdapter` interface
- [ ] Gateway layer dạng plugin
- [ ] Platform: Telegram, Discord (hiện tại), CLI

### Phase 4 — Learning Loop
- [ ] Cross-session FTS5 search
- [ ] Auto skill creation từ complex tasks
- [ ] Periodic nudge mechanism

### Phase 5 — Advanced
- [ ] Subagent delegation
- [ ] Cron scheduler
- [ ] Docker execution backend

---

## 5. Key Files tham chiếu

### Hermes Agent — files mẫu cho Kato
| File | LOC | Chức năng | Kato tương đương |
|------|-----|-----------|-----------------|
| [`run_agent.py`](E:\Test\hermes-agent\run_agent.py) | ~12k | Core AIAgent class | [`agent.ts`](src/core/engine/agent.ts) |
| [`tools/registry.py`](E:\Test\hermes-agent\tools\registry.py) | 590 | Tool registry + auto-discovery | [`tool-registry.ts`](src/core/tools/tool-registry.ts) |
| [`tools/skills_tool.py`](E:\Test\hermes-agent\tools\skills_tool.py) | 1,568 | Skills listing + viewing | [`skills.ts`](src/core/tools/skills.ts) |
| [`tools/skills_hub.py`](E:\Test\hermes-agent\tools\skills_hub.py) | 3,555 | Skills Hub (GitHub sources) | — |
| [`tools/skills_guard.py`](E:\Test\hermes-agent\tools\skills_guard.py) | ~800 | Skill security scanning | — |
| [`agent/system_prompt.py`](E:\Test\hermes-agent\agent\system_prompt.py) | 381 | 3-tier prompt assembly | [`prompt-builder.ts`](src/core/llm/prompt-builder.ts) |
| [`agent/memory_manager.py`](E:\Test\hermes-agent\agent\memory_manager.py) | 610 | Memory provider orchestrator | [`memory-store.ts`](src/core/memory/memory-store.ts) |
| [`gateway/`](E:\Test\hermes-agent\gateway\platforms\) | 20+ files | Platform adapters | [`discord/index.ts`](src/modules/discord/index.ts) |
| [`tools/delegate_tool.py`](E:\Test\hermes-agent\tools\delegate_tool.py) | ~1k | Subagent spawning | [`orchestrator.ts`](src/core/engine/orchestrator.ts) |
| [`cron/scheduler.py`](E:\Test\hermes-agent\cron\scheduler.py) | ~500 | Cron scheduler | — |
| [`tools/environments/`](E:\Test\hermes-agent\tools\environments\) | 7 files | Terminal backends | [`sandbox-executor.ts`](src/core/agents/sandbox-executor.ts) |

---

## 6. Kết luận

Hermes Agent là một production-grade agent system với 5 năm phát triển từ Nous Research. 
Kato có lợi thế về TypeScript type safety và kiến trúc gọn nhẹ (~10k LOC vs ~70k LOC),
nhưng thiếu nhiều tính năng quan trọng mà Hermes đã có:

1. **Skill ecosystem** — skills hub, auto-creation, self-improvement
2. **Multi-platform** — 20+ platforms vs 1
3. **Tool diversity** — 80+ tools vs 19
4. **Memory sophistication** — FTS5 + LLM summarization + context fencing
5. **Subagent delegation** — parallel execution
6. **Learning loop** — cross-session, auto-skill creation
7. **Terminal backends** — Docker, SSH, serverless

**Priorities cho Kato:** Tool diversity → Multi-platform → Learning loop → Subagents → Skills Hub
