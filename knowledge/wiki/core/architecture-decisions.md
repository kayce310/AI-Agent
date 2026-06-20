# Architecture Decision Records (ADR)

> **Mục đích:** Ghi lại các quyết định kiến trúc quan trọng của Coral Agent,
> lý do chọn giải pháp, và hệ quả. Mỗi ADR là bất biến — nếu quyết định thay đổi,
> tạo ADR mới thay vì sửa ADR cũ.
>
> **Format:** ADR-XXX: Title (Status: Accepted | Deprecated | Superseded)
>
> **Nguyên tắc:** Chỉ ghi các quyết định kiến trúc có impact cross-module.
> Quyết định implementation chi tiết ghi trong code comments.

---

## ADR-001: Deterministic Orchestration — Decomposer → PlanExecutor → ResultSynthesizer

**Status:** Accepted  
**Date:** 2026-05-14  
**Context:** Single LLM call xử lý task phức tạp dẫn đến:
- Hallucination do thiếu structured reasoning
- Token waste vì LLM tự planning trong response
- Không có khả năng parallel execution

**Decision:** Tách task processing thành 3-stage pipeline:
1. **Decomposer** (`src/core/engine/decomposer.ts`) — 1 LLM call → structured task list
2. **PlanExecutor** (`src/core/engine/plan-executor.ts`) — execute tasks tuần tự/parallel
3. **ResultSynthesizer** (`src/core/engine/result-synthesizer.ts`) — 1 LLM call → human response

Mỗi stage có single responsibility, testable riêng biệt.

**Consequences:**
- Positive: Giảm 50% LLM calls cho task phức tạp (không cần planning trong response)
- Positive: Parallel execution cho tasks độc lập
- Positive: Mỗi stage có thể được optimize/thay thế độc lập
- Negative: Tăng latency cho task đơn giản (có thể bypass qua `fastMode` flag)

**Related Files:**
| File | Role |
|------|------|
| [`src/core/engine/decomposer.ts`](src/core/engine/decomposer.ts) | Task decomposition |
| [`src/core/engine/plan-executor.ts`](src/core/engine/plan-executor.ts) | Task execution |
| [`src/core/engine/result-synthesizer.ts`](src/core/engine/result-synthesizer.ts) | Result synthesis |
| [`src/core/engine/orchestrator.ts`](src/core/engine/orchestrator.ts) | Orchestration + cycle detection |

---

## ADR-002: ADD-only Memory with Append-Log Persistence

**Status:** Accepted  
**Date:** 2026-05-16  
**Context:** Memory store ban đầu dùng `JSON.stringify` full-rewrite mỗi lần flush:
- O(n) I/O per write — không scale với 10k+ blocks
- Crash = mất dữ liệu từ lần flush cuối
- Không có khả năng replay/recover

**Decision:** Implement 2-layer memory architecture:
1. **In-memory ADD-only store** (`src/core/memory/memory-store.ts`) — không update/delete, chỉ append
2. **Append-log persistence** (`src/core/memory/memory-log.ts`) — mỗi operation ghi 1 dòng JSON (O(1))

Với:
- **Replay**: startup đọc log → rebuild in-memory state
- **Snapshot**: periodic (1000 ops) để tránh replay quá dài
- **Atomic write**: write + fsync để durable (chống crash)
- **Rotation**: tự động rotate khi log > 10MB, giữ 5 archives
- **Legacy backup**: vẫn ghi store.json cho backward compat

**Consequences:**
- Positive: O(1) per write — không phụ thuộc vào số blocks
- Positive: Durable — dữ liệu không mất nếu crash
- Positive: Replayable — có thể rebuild state từ log
- Positive: Audit trail — mọi operation đều được log
- Negative: Tốn disk (nhưng log được rotate + compress)

**Related Files:**
| File | Role |
|------|------|
| [`src/core/memory/memory-store.ts`](src/core/memory/memory-store.ts) | ADD-only in-memory store |
| [`src/core/memory/memory-log.ts`](src/core/memory/memory-log.ts) | Append-log persistence layer |
| [`src/core/memory/memory-temporal.ts`](src/core/memory/memory-temporal.ts) | Temporal query |
| [`src/core/memory/memory-agentic.ts`](src/core/memory/memory-agentic.ts) | Agentic memory |

---

## ADR-003: Tool Plugin Registry with AST Auto-Discovery

**Status:** Accepted  
**Date:** 2026-05-18  
**Context:** Tool system ban đầu dùng 1 file `tools.ts` (1444 lines) với tất cả tools hardcode:
- Không scalable — thêm tool mới phải sửa nhiều files
- Không có discovery mechanism — tools phải được register thủ công
- Không có checksum cache — phải scan lại mỗi lần khởi động

**Decision:** Implement 3-layer tool architecture:
1. **ToolPlugin interface** (`src/core/tools/tool-registry.ts`) — mỗi plugin export `{ name, tools[] }`
2. **ToolRegistry class** — central registry với `use()`, `getDefinitions()`, `execute()`
3. **AST Scanner** (`src/core/tools/ast-scanner.ts`) — auto-discover plugins via TypeScript AST parse

Với:
- **Checksum cache**: chỉ re-scan khi source file thay đổi (file hash)
- **Plugin isolation**: mỗi plugin file tự quản lý dependencies
- **Security gateway**: tất cả file I/O route qua `tool-gateway.ts` (ZERO-TRUST)

**Consequences:**
- Positive: Thêm tool mới = tạo 1 file + plugin tự động được phát hiện
- Positive: Cold-start performance (checksum cache → 2ms for unchanged files)
- Positive: Mỗi plugin < 300 lines (so với 1444 lines trong 1 file)
- Positive: Security — file I/O tập trung qua gateway, dễ audit
- Negative: AST scanner cần maintenance khi TypeScript syntax thay đổi

**Related Files:**
| File | Role |
|------|------|
| [`src/core/tools/tool-registry.ts`](src/core/tools/tool-registry.ts) | Central registry |
| [`src/core/tools/ast-scanner.ts`](src/core/tools/ast-scanner.ts) | AST auto-discovery |
| [`src/core/tools/tool-gateway.ts`](src/core/tools/tool-gateway.ts) | Security gateway |
| [`src/core/tools/skills.ts`](src/core/tools/skills.ts) | Example plugin (skills) |
| [`src/core/tools/filesystem.ts`](src/core/tools/filesystem.ts) | Example plugin (filesystem) |

---

## ADR-004: Multi-Platform Gateway with Plugin Adapters

**Status:** Accepted  
**Date:** 2026-05-28  
**Context:** Ban đầu Coral chỉ hỗ trợ Discord qua `DiscordBridge` tightly-coupled:
- Thêm platform mới phải copy-paste code
- Không có lifecycle management (start/stop)
- Message handling logic lẫn trong platform code

**Decision:** Implement Gateway pattern inspired by Hermes Agent:
1. **PlatformAdapter interface** (`src/core/gateway/types.ts`) — contract: `start()`, `stop()`, `sendMessage()`, `onMessage()`
2. **CoralGateway class** (`src/core/gateway/index.ts`) — orchestrator: `register()`, `startAll()`, `stopAll()`
3. **AdapterMessage** — normalized message envelope (`messageId`, `userId`, `channelId`, `text`, `platform`, `isMention`)
4. **DiscordBridge** (`src/modules/discord/index.ts`) — implements PlatformAdapter cho Discord

**Consequences:**
- Positive: Thêm platform mới = implement PlatformAdapter interface + register
- Positive: Lifecycle quản lý tập trung (start/stop tất cả adapters)
- Positive: Message normalization → engine không cần biết platform-specific details
- Positive: Testable — mock adapter dễ dàng
- Negative: Overhead cho platform chỉ có 1 channel (terminal)

**Related Files:**
| File | Role |
|------|------|
| [`src/core/gateway/types.ts`](src/core/gateway/types.ts) | PlatformAdapter interface, AdapterMessage |
| [`src/core/gateway/index.ts`](src/core/gateway/index.ts) | Gateway orchestrator |
| [`src/modules/discord/index.ts`](src/modules/discord/index.ts) | Discord implementation |

---

## ADR-005: Progressive Disclosure Skill System

**Status:** Accepted  
**Date:** 2026-05-28  
**Context:** Khi có 38+ skills (11 wiki + 27 agents-skills), load toàn bộ content vào LLM context window gây tràn token. `list_skills` tool ban đầu trả về full content + file paths.

**Decision:** Implement 3-tier Progressive Disclosure loading inspired by Hermes Agent:
1. **Tier 1 — `list_skills`**: metadata-only (slug, name, description, tags from YAML frontmatter)
2. **Tier 2 — `skill_view`**: lazy-load full SKILL.md content + linked `references/` files
3. **Tier 3 — `skill_view({include_linked: true})`**: load nội dung linked files on demand

Với:
- **YAML Frontmatter Parser** — extract `name`, `description`, `tags` từ SKILL.md metadata
- **Backward compat** — `load_skill` tool vẫn hoạt động (giới hạn 5k chars)
- **Linked files discovery** — tự động scan `references/` directory

**Consequences:**
- Positive: Token-efficient — context window chỉ chứa metadata khi listing
- Positive: Lazy-load — chỉ tải full content khi LLM thực sự cần
- Positive: LLM tự quyết định skill nào cần xem chi tiết
- Negative: Thêm 1 tool call để xem chi tiết (tăng latency 1 turn)

**Related Files:**
| File | Role |
|------|------|
| [`src/core/tools/skills.ts`](src/core/tools/skills.ts) | Skills plugin với 4 tools |
| `knowledge/agents-skills/*/SKILL.md` | Skill files with YAML frontmatter |

---

## ADR Index

| # | Title | Status | Date |
|---|-------|--------|------|
| 001 | Deterministic Orchestration | ✅ Accepted | 2026-05-14 |
| 002 | ADD-only Memory with Append-Log Persistence | ✅ Accepted | 2026-05-16 |
| 003 | Tool Plugin Registry with AST Auto-Discovery | ✅ Accepted | 2026-05-18 |
| 004 | Multi-Platform Gateway with Plugin Adapters | ✅ Accepted | 2026-05-28 |
| 005 | Progressive Disclosure Skill System | ✅ Accepted | 2026-05-28 |

---

## Template cho ADR mới

```markdown
## ADR-XXX: Title

**Status:** Proposed | Accepted | Deprecated | Superseded  
**Date:** YYYY-MM-DD  
**Context:** (Vấn đề / lý do cần quyết định)

**Decision:** (Giải pháp được chọn, lý do)

**Consequences:**
- Positive: ...
- Negative: ...

**Related Files:**
| File | Role |
|------|------|
| `path/to/file.ts` | Mô tả |
```
