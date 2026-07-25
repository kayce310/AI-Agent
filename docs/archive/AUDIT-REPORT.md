# Coral Agent — Full System Audit Report

**Date:** 2026-07-12  
**Auditor:** Principal Software Architect (AI Agent focus)  
**Repository:** D:\AI-Agent  
**Language:** TypeScript (NodeNext, ES2022)  
**Runtime:** Node.js 24.15.0  
**DB:** better-sqlite3 (WAL mode)  
**Entry Point:** src/scripts/start-telegram.ts  

---

## 1. Executive Summary

Coral là hệ thống AI Agent daemon hoàn chỉnh, đã chạy production. Architecture nhìn chung **tốt** — tách layer, event-driven, có circuit breaker, graceful shutdown, checkpoint. 

### Số liệu tổng quan

| Metric | Value |
|--------|-------|
| Source files | 124 |
| Source lines | 29,773 |
| Test files | 55 |
| Test lines | 13,789 |
| Build status | ✅ 0 tsc errors |
| Test pass | ✅ 52/55 pass (3 fail — import debt) |
| Dead code | ~4,404 lines source + ~1,966 lines tests |
| Dependencies | 12 production + 5 dev |
| Circular deps | **0** |

### Vấn đề thật sự (không phải vấn đề bạn nghĩ)

1. **Dead code** — 4,404 dòng source không ai gọi (chiếm ~15% codebase)
2. **Import debt** — 3 test file import module đã xoá
3. **Tool always-all** — bạn tưởng load all tools tốn token, nhưng thực tế tool-pruner đã được simplify thành "luôn gửi tất cả" (~900 tokens overhead / 128K context = 0.7%). **Đây là intentional trade-off, không phải bug.**

> **Memory context phình?** Memory recall cố định topK=10, history cố định 20 messages, context auto-compress tại 75%/85%. Không có growth unbounded.
>
> **Tool load all?** 9 plugins, ~900 tokens, intentional. LLM tự chọn tool tốt hơn keyword matching.

---

## 2. Kiến trúc hiện tại

### Layer Map

```
start-telegram.ts
    │
    ├── Engine (init → process → cleanup)
    │     ├── ToolRegistry (plugin-based, 9 plugins)
    │     ├── Agent (ReAct loop, streaming, circuit breaker)
    │     ├── PromptBuilder (system prompt assembly)
    │     ├── ModelRouter / ProviderRegistry (LLM routing)
    │     ├── MemoryFacade → globalMemoryStore (append-log, 5000 block cap)
    │     ├── EventBus / EventStore (structured event pipeline)
    │     ├── CheckpointStore (file-based cycle persistence)
    │     ├── SelfEvolutionLearner (max 5 experiences)
    │     ├── TaskQueue (background task worker)
    │     └── ContextWindowManager (token eviction)
    │
    ├── CoralGateway → PlatformAdapter (TelegramBridge)
    │     ├── MissionLock (inbound validation)
    │     ├── SessionManager (mutex-protected)
    │     └── MessageHandler (streaming wrapper)
    │
    ├── DashboardServer (HTTP/WS, off by default)
    ├── CronScheduler (health-check, memory-flush, proactive)
    ├── WorldModel (system probes, off by default)
    ├── HITLManager (approval flow)
    └── MemoryExtractor → MemoryStore (background)
```

### Ưu điểm

- **Single entry point** — engine.ts là nơi duy nhất xử lý request. Mọi change gói gọn.
- **Plugin-based tool architecture** — mỗi tool plugin độc lập, đăng ký qua `registry.use(plugin)`.
- **EventBus pattern** — modules giao tiếp qua events, không direct coupling.
- **Circuit breaker** — LLM calls được bảo vệ, tự động open khi degradation.
- **Graceful shutdown** — 30s timeout, flush memory → stop gateway → release lock.
- **File lock** — single-instance guarantee, auto-kill old process.
- **Request coalescing** — duplicate requests chờ cùng 1 promise.
- **Smart cache** — 2 phút TTL cho response không tool call.

### Nhược điểm

- **Dead code ~15%** — nhiều module built xong nhưng không bao giờ được gọi.
- **Singleton explosion** — globalMemoryStore, missionLock, evolutionEngine, engineCircuitBreaker, worldModel, globalHooks. Khó test isolation.
- **globalThis pollution** — 5 mutable globals gán trên `(globalThis as any)` cho dashboard/tunnel interactions.
- **Tool selection always-all** — không dynamic, dù chỉ ~900 tokens overhead.
- **No health/liveness endpoint** — không có HTTP endpoint cho container orchestration.
- **Config file-based** — chỉ ProviderRegistry đọc config, không centralized config.

### Dependencies (production)

| Package | Purpose | Risk |
|---------|---------|------|
| grammy | Telegram Bot API | Low |
| better-sqlite3 | SQLite storage | Low |
| zod | Schema validation | Low |
| openai | OpenAI SDK (9router proxy) | Low |
| ws | WebSocket server | Low |
| langfuse | LLM observability (optional) | Low |
| mammoth + pdf-parse | Document parsing | Low |
| sanitize-html | Output sanitization | Low |
| dotenv | .env loading | Low |

---

## 3. Root Cause Analysis

### RCA-1: Dead code accumulation
**Root cause:** Feature-driven development không có cleanup phase. Modules được xây, deploy, sau đó thay thế bằng implementation mới nhưng file cũ không xoá.

**Chain:**
- react-loop.ts → replaced by agent.ts (Hermes-style loop) → **file vẫn tồn tại**
- agent-loop.ts → planned wrapper, never integrated → **file vẫn tồn tại**
- knowledge/ (entity-extractor, entity-store, graph-query, semantic-memory) → built v1, superseded by memory-store append-log pattern → **files vẫn tồn tại**
- sentiment/ → disabled 23/06 → **files vẫn tồn tại**
- smarthome/ → stub, never connected → **files vẫn tồn tại**

**Impact:** Cognitive load ~15% code không cần đọc, maintenance overhead, test bloat.

### RCA-2: Import debt from deletion without test cleanup
**Root cause:** Modules bị xoá (src/observability/event-store, metrics-collector, integration) nhưng test files import chúng không được cập nhật.

**Files affected:**
- tests/event-store.test.ts → imports `../src/observability/event-store` (deleted)
- tests/metrics-collector.test.ts → imports `../src/observability/metrics-collector` (deleted)
- tests/observability-integration.test.ts → imports `../src/observability/integration` (deleted)

**Impact:** CI/CD blocked. Mỗi `vitest run` luôn fail 3 tests.

### RCA-3: No centralized configuration
**Root cause:** Config rải rác — ProviderRegistry đọc `providers.json`, Engine dùng `env`, memory-store dùng `env`, gateway dùng `env`. Không có single source of truth.

**Impact:** Khó debug config issue, không thể hot-reload.

---

## 4. Technical Debt Ranking

### Critical

| # | Item | Lines | Why Critical |
|---|------|-------|-------------|
| C1 | 3 failing tests | 3 files | CI always red. Mất tín hiệu test regression. |
| C2 | Dead react-loop.ts | 587L | Code tồn tại, có thể confuse developer. File không dùng. |
| C3 | Dead agent-loop.ts | 452L | Same — built, never wired. |

### High

| # | Item | Lines | Why High |
|---|------|-------|---------|
| H1 | Dead knowledge/ subgraph | ~2,007L | entity-extractor, entity-store, graph-query, semantic-memory, entity-approval*, hitl-manager. 9 files, zero callers. |
| H2 | Dead sentiment/ | 471L | Disabled 23/06. 2 files, zero callers. |
| H3 | Dead smarthome/ | ~500L | 5 files, zero callers. |
| H4 | Dead delegation-orchestrator.ts | 59L | 1 file, zero callers. |
| H5 | Dead tests for dead modules | ~1,966L | 8 test files test modules nobody uses. |

### Medium

| # | Item | Why Medium |
|---|------|-----------|
| M1 | globalThis pollution | 5 mutable globals (`__coral_tunnelUrl`, `__coral_dashboardReady`, `__coral_dashboardServer`, `__coral_startTunnel`, `__coral_stopTunnel`). Không type-safe. |
| M2 | No health endpoint | Không thể integrate với container orchestrator. |
| M3 | SessionManager mutex lock | Đã từng gây deadlock (fix in recent commits). Fragile. |
| M4 | MemoryStore 4838/5000 blocks | Đang tiến gần cap. Không critical vì có cleanup cron. |

### Low

| # | Item | Why Low |
|---|------|---------|
| L1 | 9 TODO/FIXME comments | All minor. |
| L2 | Dashboard disabled by default | Intentional design. |
| L3 | World Model disabled by default | Intentional design. |
| L4 | No linter config | Prettier/eslint chưa setup. Không block build. |

---

## 5. Risk Matrix

| Debt Item | Not Fixing → Impact | Fixing Wrong → Impact |
|-----------|--------------------|----------------------|
| 3 failing tests | ❌ Mất confidence ở test suite. Mới phát sinh bugs không biết. | 🟢 Fix = xoá test file hoặc update import. Không thể sai. |
| Dead react-loop.ts | 🟡 Developer confusion. Mất ~5 phút/tuần verify nó live/dead. | 🟢 Delete file. Nếu có import không detect được, build sẽ fail ngay. |
| Dead knowledge/ subgraph | 🟡 Same. 9 files != 0 cognitive cost. | 🟢 Same. Build sẽ fail nếu còn import. |
| Dead tests | 🟢 Chỉ tốn CI time (seconds/test). | 🟢 Delete file. Test không còn reference nữa. |
| globalThis pollution | 🟡 Không type safety. Runtime error khi global undefined. | 🟢 Extract module. Nếu sai, dashboard/tunnel bị lỗi — dễ detect. |
| No health endpoint | 🟡 Không auto-restart khi crash trong container. | 🟢 Add GET /health → trả về status. Không ảnh hưởng existing flow. |

---

## 6. Master Fix Plan

### Phase 0 — Clean Build (30 phút)

**Mục tiêu:** 0 tsc errors + 0 failing tests

| Step | Action | Files |
|------|--------|-------|
| 0.1 | Delete 3 test files importing deleted modules | tests/event-store.test.ts, tests/metrics-collector.test.ts, tests/observability-integration.test.ts |
| 0.2 | Run `npx vitest run` — verify 52/52 pass | — |
| 0.3 | Run `npx tsc --noEmit` — verify 0 errors | — |

**Risk:** 🟢 None. Test files reference modules đã xoá — không thể fix bằng cách khác.  
**Rollback:** `git checkout -- tests/`  
**Acceptance:** `npx vitest run` → 52/52 pass (0 fail)

### Phase 1 — Xoá Dead Source Code (1 giờ)

**Mục tiêu:** Xoá ~4,404 lines dead code, giảm codebase 15%

| Step | Action | Files |
|------|--------|-------|
| 1.1 | Xoá dead agent modules | `src/core/agent/react-loop.ts`, `src/core/agent/agent-loop.ts` |
| 1.2 | Xoá dead knowledge/ subgraph | `src/core/knowledge/entity-extractor.ts`, `entity-store.ts`, `graph-query.ts`, `semantic-memory.ts`, `entity-approval.ts`, `entity-approval-queue.ts`, `entity-approval-simple.ts`, `hitl-manager.ts` |
| 1.3 | Xoá dead sentiment/ | `src/core/sentiment/sentiment-analyzer.ts`, `sentiment-api.ts` |
| 1.4 | Xoá dead smarthome/ | Whole `src/core/smarthome/` directory |
| 1.5 | Xoá dead delegation-orchestrator | `src/core/orchestrator/delegation-orchestrator.ts` |
| 1.6 | Run `npx tsc --noEmit` + `npx vitest run` | — |

**Risk:** 🟢 Low. Các module này **không được import bởi bất kỳ code live nào**. Build sẽ fail ngay nếu thiếu.  
**Rollback:** `git checkout -- src/`  
**Acceptance:** Build + all tests pass. Zero "unused module" mental overhead.

### Phase 2 — Xoá Dead Tests (30 phút)

**Mục tiêu:** Xoá ~1,966 lines test cho module đã xoá

| Step | Action | Files |
|------|--------|-------|
| 2.1 | Xoá dead tests | `tests/react-loop.test.ts`, `tests/react-loop-demo.test.ts`, `tests/semantic-memory.test.ts`, `tests/entity-extractor.test.ts`, `tests/entity-store.test.ts`, `tests/graph-query.test.ts`, `tests/sentiment-analyzer.test.ts`, `tests/smarthome.test.ts` |
| 2.2 | Run `npx vitest run` — verify remaining tests pass | — |

**Risk:** 🟢 None.  
**Rollback:** `git checkout -- tests/`  
**Acceptance:** All remaining tests pass.

### Phase 3 — globalThis Sanitization (30 phút)

**Mục tiêu:** Loại bỏ `(globalThis as any)` pattern, thay bằng exported module

| Step | Action | Files |
|------|--------|-------|
| 3.1 | Tạo `src/core/bridge.ts` export startTunnel, stopTunnel, dashboardReady, dashboardServer, cronScheduler | New file |
| 3.2 | Update start-telegram.ts thay vì gán globalThis | `src/scripts/start-telegram.ts` |
| 3.3 | Update commands.ts (Telegram) dùng bridge thay vì (globalThis as any).__coral_* | `src/modules/telegram/commands.ts` |

**Risk:** 🟡 Medium. Nếu có plugin/script khác truy cập globalThis, có thể break. Cần grep toàn bộ.  
**Rollback:** Revert start-telegram.ts + commands.ts  
**Acceptance:** Dashboard on/off vẫn hoạt động qua Telegram command.

### Phase 4 — Health Endpoint (30 phút)

**Mục tiêu:** Thêm GET /health cho container orchestration

| Step | Action | Files |
|------|--------|-------|
| 4.1 | Add health route trong DashboardServer | `src/core/events/http-server.ts` |
| 4.2 | Expose engine status, memory, uptime | — |

**Risk:** 🟢 None. Dashboard server đã có HTTP + WS.  
**Acceptance:** `curl localhost:8766/health` trả về JSON status.

### Phase 5 — Centralized Memory Cap Config (Optional, 30 phút)

**Mục tiêu:** MemoryStore cap config qua env thay vì hardcode

| Step | Action | Files |
|------|--------|-------|
| 5.1 | Đọc CORAL_MAX_MEMORY_BLOCKS từ env | `src/core/memory/memory-store.ts` |
| 5.2 | Fallback 5000 nếu không set | — |

**Risk:** 🟢 None.  
**Acceptance:** Set env → cap thay đổi mà không cần sửa code.

---

## 7. Refactor Recommendation

### KHÔNG refactor các vấn đề bạn lo lắng

| Vấn đề bạn nêu | Thực tế | Quyết định |
|---------------|---------|-----------|
| Memory phình to | Recapped topK=10, history=20, auto-compress. Đã có cap. | **Không refactor** |
| Tool load all | Intentional. 9 plugins, ~900 tokens, 0.7% của 128K. | **Không refactor** |
| Routing layer / classifier | Thêm complexity không cần thiết. Overhead > lợi ích. | **Không refactor** |
| Sliding window | Đã có context compression + eviction. | **Không refactor** |

### NÊN refactor (có bằng chứng)

| Refactor | Bằng chứng | Lợi ích |
|----------|-----------|---------|
| Xoá dead code | 4,404 dòng, zero callers. Xác minh qua grep. | -15% cognitive load, -15% maintenance |
| globalThis → module | 5 mutable globals, not type-safe | Type safety, testable |
| Health endpoint | Container không auto-detect được trạng thái | Production readiness |

### KHÔNG làm (bằng chứng chưa đủ)

- **Agent v2 rewrite** — no evidence current agent.ts is bottleneck
- **Memory vector store** — memory recall đã ổn, latency không phải vấn đề
- **Dynamic tool registration** — overhead 0.7%, effort > benefit
- **Multi-region / multi-process** — chưa có evidence cần scale

---

## 8. Kết luận

### Bạn hỏi sai câu hỏi

Bạn hỏi "memory phình" và "tool load all" — nhưng **không phải vấn đề thật**.

### Vấn đề thật

```
1. Dead code 4,404 lines (15% codebase vô dụng)  → cleanup
2. 3 tests fail (import debt)                     → delete + verify
3. globalThis pollution                           → extract module
4. No health endpoint                             → add simple route
```

### Execution time estimate

| Phase | Effort | Risk |
|-------|--------|------|
| P0: Fix tests | 30 phút | 🟢 None |
| P1: Xoá dead source | 1 giờ | 🟢 Low (build bảo vệ) |
| P2: Xoá dead tests | 30 phút | 🟢 None |
| P3: globalThis sanitize | 30 phút | 🟡 Medium |
| P4: Health endpoint | 30 phút | 🟢 None |
| **Total** | **3 giờ** | |

Không cần routing layer. Không cần classifier. Không cần memory optimization.

### Câu nói tóm tắt

> **"Hệ thống đang ổn. 15% code chết là vấn đề thật, không phải memory phình. Dọn dẹp trước khi xây mới."**
