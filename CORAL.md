# Coral — Architecture Overview & Onboarding Guide

> Coral Agent: AI-powered Telegram bot (extensible to other platforms) with a layered
> TypeScript monorepo architecture. Routes user requests through 9router (multi-provider
> LLM gateway), manages task plans via state-driven Plan lifecycle, and persists session
> context across conversations.

---
**Before editing any state-related code (plan, session, task, item, evidence):** read
`docs/adr/ADR-000-state-principles.md` first. These rules are mandatory, not advisory.
Violations caused 3 cascading bugs (evidenceLog scope, plan-state derive, concurrency race).

---

## 1. Tong quan

- **Muc dich:** Orchestration agent cho tac vu phuc tap — nhan tin nhan Telegram, lap ke hoach (plan), thuc thi tool, tra loi.
- **Nen tang:** Telegram bot (grammy SDK) — kien truc adapter cho phep mo rong Discord/CLI (CoralGateway + PlatformAdapter).
- **Model LLM:** Qua 9router (`src/core/llm/model-adapter.ts`) — multi-provider (OpenAI, Anthropic, Google, v.v.), cau hinh trong `config/providers.json`.
- **Tech stack:** TypeScript (ESM), better-sqlite3, grammy, Zod, Vitest.

---

## 2. Kien truc tong the — luong 1 request

```
Telegram message
 -> modules/telegram/index.ts (message:text handler)
   -> SessionManager.getOrCreateSession(userId) -> tao/lay sessionId (UUID)
   -> Gateway.handleAdapterMessage(adapter, msg) -> gateway/index.ts
     -> missionLock.validateMessage() -> kiem tra bao mat
     -> Gateway.process(request) -> build history, goi engine
       -> Engine.process(engineRequest) -> rate limit, cache check
         -> Engine.processInner() -> tao RequestContext (AsyncLocalStorage)
           -> Memory recall (memory-store query)
           -> CheckpointStore.start()
           -> Agent.run() -> build messages + system prompt
             -> Agent.executeReActLoop() -> vong lap:
               while (toolCallCycles < maxToolCycles):
                 1. selectRelevantTools (tool-pruner)
                 2. modelRouter.route(messages, tools) -> LLM response
                 3. if finishReason='stop' -> FINAL_ANSWER
                 4. if has toolCalls -> execute tung tool
                 5. ghi evidenceLog, emit tool:call/tool:result hooks
                 6. derivePlanState(checkpointStore, sessionId)
                 7. check stallCount, readToolCount, goal-drift
                 8. lap lai
           -> CheckpointStore.complete()
         -> Cache response (neu an toan)
       -> Engine.saveMessage -> MemoryStore
   -> TelegramBridge.sendMessage() -> gui response
```

**Luong tao plan (task phuc tap):**
```
Agent loop iteration:
  LLM goi update_plan(action='create', items=[...]) -> plan tao
  Engine setMaxToolCycles(ABSOLUTE_SAFETY_CEILING=200)
  LLM thuc thi tool cho item 0 -> evidenceLog ghi nhan
  LLM goi update_plan(action='complete_item', item_index=0, result_summary=...)
    -> canCompleteItem() kiem tra evidenceLog co tool call that khong
    -> Neu OK, chuyen item sang completed
  Lap cho den het items -> plan status = 'completed'
```

---

## 3. Cac khai niem cot loi

### Plan lifecycle state machine -> `docs/adr/ADR-000-state-principles.md` (muc 4: ADR-001)

- PlanState la discriminated union: `none | planning | executing | completed | failed | aborted`
- Ham `derivePlanState()` o `src/core/plan/plan-state.ts` — MODULE DUY NHAT duoc phep derive state.
- `canCompleteItem()` kiem tra evidenceLog truoc khi cho phep complete_item.
- `isGuardActive()` kiem tra planning/executing — dung cho stall detection.

### Session/Identity model

- **ConversationSessionId** (`types/branded.ts`): UUID tao boi `SessionManager`, reset qua `/new`. Dung cho checkpoint, memory, plan.
- **UserId** (`types/branded.ts`): Telegram user ID (vinh vien). Dung cho rate limit, access control.
- **channelId:** Telegram chat ID (group/private). Khong duoc dung lam sessionId.
- Ly do tach: tranh loi cu (Audit 2026-07-27) — `gateway/index.ts` dung `msg.channelId` lam sessionId, lam `/new` mat tac dung o Engine level. **Da fix (e8d17ff4):** gateway doc `msg.metadata.sessionId` (UUID tu SessionManager), telegram adapter gui `session.sessionId` qua metadata; gateway fail-loud neu thieu.
- **MemoryFacade scope** (`memory-facade.ts`): `addMessage(sessionId, ...)` va `getChannelHistory(sessionId)` nhan **ConversationSessionId** (UUID) lam key — KHONG phai channelId. Day la bo nho hoi thoai **ngan han, scope theo session** (reset khi `/new`), tuong duong checkpointer/thread-scoped trong LangGraph. Lua y: ten ham `getChannelHistory` la di san tu cu (MemoryCore) — thuc chat nhan sessionId, khong phai channelId.
- **Memory dai han** (`globalMemoryStore`): van dung `sessionId` lam scope khi ghi tu gateway (`human`/`persona` tags). Neu can hoc xuyen session ve user (long-term), can dung `userId` rieng — chua implement.
- **BUG da biet (chua fix):** `daily-digest.ts:17` (cron 24h) goi `getChannelHistory(channelId)` voi channelId tu env `KNOWLEDGE_CHANNEL_ID` — nhung ham nay tra ve blocks theo `sessionId` (UUID). Digest se khong tim thay messages. Can chinh lai: hoac digest doc theo sessionId, hoac them method rieng scope theo channelId. (Ghi nhan 2026-07-31 — ngoai pham vi task hien tai.)

### Per-request state isolation -> `request-context.ts`

- `AsyncLocalStorage<RequestContext>` — chua `sessionId`, `taskId`, `evidenceLog`, `onPlanCreated`.
- Fixes 3 concurrency bugs (evidenceLog scope, currentTaskId race, updatePlanCtx race).
- `update-plan-tool.ts` doc `getRequestContext().sessionId` — KHONG tu LLM args (bao mat).
- Engine tao context o dau `processInner()` qua `requestContext.enterWith({sessionId, taskId, evidenceLog, onPlanCreated})` (engine.ts:640). Luu y: dung `enterWith()` thay vi `run()` vi `processInner` co nhieu diem return — context tu dong ap dung cho cac event handler async trong cung luong.

### Evidence-based plan completion

- `complete_item` yeu cau bang chung tool call that trong `evidenceLog` (`Map<itemIndex, ToolCallRecord[]>`).
- `evidenceLog` duoc agent loop tu dong ghi nhan moi tool call thanh cong.
- `canCompleteItem()` kiem tra: neu evidenceLog rong -> tu choi.
- Khong tin `result_summary` model tu viet.

### 5 nguyen tac chung ve state -> `docs/adr/ADR-000-state-principles.md`

1. Mot state, mot nguon su that
2. Khong dung co boolean set-once cho vong doi nhieu giai doan
3. State per-request khong song tren object dung chung
4. Model khong tu y tao transition
5. Khong tin noi dung text model tu viet lam bang chung

---

## 4. Ban do module/thu muc

```
src/
  core/                        # Layer loi — khong import modules/
    engine/
      engine.ts                # Engine class: init, process(), processInner(), rate limit, cache
      agent.ts                 # Agent class: executeReActLoop(), stall/read-loop guard
      token-estimator.ts       # Token estimation (approx 4 chars/token)
    plan/
      types.ts                 # TaskPlan, PlanItem, PlanStatus, EvidenceLog
      plan-state.ts            # derivePlanState(), canCompleteItem() — ADR-001
      update-plan-tool.ts      # Tool handler cho update_plan
      error-classifier.ts      # Static pattern-matching: transient/permanent/security
    gateway/
      index.ts                 # CoralGateway: adapter registry, message routing
      types.ts                 # PlatformAdapter, CoralRequest/Response contracts
    checkpoint.ts              # CheckpointStore: persist request cycles to JSON
    session-manager.ts         # Re-export tu platform/telegram/session-manager.ts
    request-context.ts         # AsyncLocalStorage cho per-request state
    context-window.ts          # Token budget management, importance scoring
    context-compression.ts     # LLM-based context compression
    types.ts                   # EngineRequest, EngineResponse, ChatMessage
    types/branded.ts           # ConversationSessionId, UserId (compile-time only)
    hooks.ts                   # HookRegistry lifecycle events
    runtime-instrumentation.ts # R: request/cycle tracing
    logger.ts                  # Structured logger
    audit-logger.ts            # Audit event logging -> JSONL
    circuit-breaker.ts         # 3 failures -> OPEN -> HALF_OPEN -> CLOSED
    task-queue.ts              # Background task queue
    evolution.ts               # Self-evolution engine
    memory/
      MemoryItem.ts            # Memory data model + scoring
      MemoryStore.ts           # In-memory Map + JSON persistence (legacy)
      memory-store.ts          # Append-log memory store (globalMemoryStore)
      memory-facade.ts         # Unified memory interface
      memory-log.ts            # Append-log persistence
      memory-temporal.ts       # Time-indexed block storage
      memory-consolidation.ts  # LLM-based consolidation
      sqlite-storage.ts        # CoralStorage: SQLite (better-sqlite3)
    tools/
      tool-registry.ts         # Central registry
      tool-pruner.ts           # selectRelevantTools
      tool-gateway.ts          # secureRuntime path safety
      filesystem.ts, search.ts, knowledge.ts, ... (20+ tool impls)
    llm/
      model-adapter.ts         # ModelRouter: multi-provider
      provider-registry.ts     # Load config tu providers.json
      prompt-builder.ts        # System prompt construction
    security/
      mission-lock.ts          # Prevent LLM identity override
      goal-drift-monitor.ts    # Keyword-overlap drift detection (half-done)
      privilege-guard.ts       # Tool access control
      rate-limiter.ts          # Rate limiting
      response-cache.ts        # Response caching + coalescing
      hitl.ts                  # Human-in-the-loop
      secret-rotation.ts       # NGHI DEAD (0 imports)
      consent.ts               # NGHI DEAD (0 imports)
    events/
      bus.ts, store.ts, logger.ts  # Event sourcing
      types.ts                 # Zod schemas
      http-server.ts           # Dashboard server
      websocket.ts             # WebSocket streaming
    agents/
      agent-registry.ts        # CrewAI-style registry
      delegate.ts              # delegate_task tool
      janitor.ts               # Cleanup checks
    behavior/
      behavior-engine.ts       # Rule-based engine
      emotion-tag-parser.ts    # Parse [EMOTION:xxx]
    proactive/
      proactive-engine.ts      # Keyword-triggered suggestions
    self-evolution/            # Learner, experience store
    orchestrator/              # (delegation-orchestrator.ts DA XOA 2026-07-31)
    cron/                      # Cron scheduler
    world/                     # World model
    commands/                  # types.ts, registry.ts, builtins/
    knowledge/                 # Entity store, graph query, semantic memory
  modules/telegram/
    index.ts                   # TelegramBridge: PlatformAdapter implementation
    commands.ts                # Slash command handlers
    user-manager.ts            # Access control
    activity-reporter.ts       # Typing indicator
    hitl-handler.ts            # HITL callbacks
  platform/telegram/
    session-manager.ts         # SessionManager: TTL-based, multi-session
    message-handler.ts         # TelegramMessageHandler (legacy?)
  scripts/
    start-telegram.ts          # Entry point
    validate-structure.ts      # Import validation
    configure-9router.ts       # 9router config
  dashboard/                   # Dashboard UI
```

### Dead code da biet

| File | Trang thai | Ghi chu |
|------|-----------|---------|
| ~~`core/sentiment/`~~ | ~~ORPHAN~~ | **DA XOA (2026-07-31)** — 0 imports, Python dep ngoai |
| `core/security/secret-rotation.ts` | **orphan — instrumented** | 0 imports; da them USAGE-TRACE log (2026-07-31), cho quan sat 1-2 thang |
| `core/security/consent.ts` | **orphan — instrumented** | 0 imports; da them USAGE-TRACE log (2026-07-31), cho quan sat 1-2 thang |
| ~~`core/orchestrator/delegation-orchestrator.ts`~~ | ~~ORPHAN~~ | **DA XOA (2026-07-31)** — intentionally unhooked, zero imports |
| ~~`core/knowledge/entity-approval-queue.ts`~~ | ~~ORPHAN~~ | ~~HITL dependency da xoa~~ **DA XOA (2026-07-29)** |
| `core/tools/report.ts` | BUG | Returns "TODO" placeholder |
| `Engine.sanitizeResponse()` (engine.ts:209) | DEAD | Private, zero callers |
| `SAFETY_CEILING` import (agent.ts:36) | DEAD | Khong dung, chi dung ABSOLUTE_SAFETY_CEILING |
| `computePlanBudget()` (plan/types.ts) | DEAD | Exported nhung khong goi |
| `BASE_PLANNING_BUDGET`, `PLAN_CYCLES_PER_ITEM` | DEAD | Deprecated constants |

---

## 5. Cach chay, test, build

### Lenh

| Muc dich | Lenh |
|----------|------|
| Cai dat | `npm install` |
| Chay dev | `npx tsx src/scripts/start-telegram.ts` |
| Build | `npx tsc` |
| Test | `npx vitest run` |
| Test (watch) | `npx vitest` |
| Type-check | `npx tsc --noEmit` |
| Validate structure | `npx tsx scripts/validate-structure.ts --strict` |

### Test baseline

- **56 test files**, **1008 tests** (2026-07-29)
- Baseline hien tai (2026-07-31, sau khi xoa sentiment test + them error-category test): 59 files / 1027 passed / 0 failed-pre-existing-trong-suite (sentiment-analyzer test da xoa cung module)
- Duration: ~20s

### Security notes

- **Rate-limit bypass fixed (2026-07-29):** `Engine.process()` used `request.sessionId`
  as per-user rate-limit key. After session/identity fix, sessionId became a UUID (changes
  on `/new`), making `/new` a free rate-limit reset. Fixed by adding `userId` field to
  `EngineRequest` and using it (`request.userId`) for rate limiting instead.

### Bien moi truong quan trong

| Bien | Mac dinh | Tac dung |
|------|----------|----------|
| `TELEGRAM_BOT_TOKEN` | -- | Telegram bot token (bat buoc) |
| `CORAL_MAX_READ_CALLS` | `12` | Bi shadow boi `const MAX_READ_CALLS = 8` trong agent.ts:467 (P2) |
| `CORAL_WARMUP` | `true` | Bo qua warmup neu set `false` |
| `CORAL_TELEGRAM_USERS` | -- | Danh sach user duoc phep |
| `TELEGRAM_ALWAYS_REPLY_CHANNELS` | -- | Channel IDs luon reply (group) |

---

## 6. Known issues / tech debt

### Modularity — duplicate code

| Van de | File | Muc do |
|--------|------|--------|
| **3 token estimators** | `engine.ts: estimateTokenCount()`, `token-estimator.ts: estimateTokens()`, `context-window.ts: estimateTokens()` | P3 |
| **2 sanitize functions** | `engine.ts: sanitizeResponse()` (dead), `agent.ts: sanitizeFinalResponse()` (dung) | P3 |
| **MAX_READ_CALLS shadowing** | module-level const (line 110) vs method-level const (line 467) | P2 |

### Flow / dead code

| Van de | Chi tiet | Muc do |
|--------|----------|--------|
| **goal-drift chi check tool result** | `checkGoalDrift()` o agent.ts:896 chi check tool result, khong check text | P2 |
| **classifyResponse NEED_TOOL dead** | Format instruction da thay the, code cu van ton tai | P3 |
| **errorCategory retry logic** | **Da implement (2026-07-31):** transient khong cong vao `consecutiveFailedAttempts` (co counter rieng `consecutiveTransientAttempts`, limit `MAX_TRANSIENT_RETRY=3`, vuot -> coi nhu permanent); permanent -> tool result tra ve model co note "[ERROR_CATEGORY=permanent]" khuyen khong retry cung tham so; security -> abort plan (giu nguyen). Xem `agent.ts` stagnation block + `plan/types.ts` | ✅ done |
| **Session identity confusion** | gateway/index.ts dung `msg.channelId` lam `sessionId`, `/new` khong clear engine state. Engine dung `request.sessionId` lam `userId` | **P1 — da fix rate-limit (`request.userId`), gateway da fail-loud, con cho fail-loud sessionId hoan tat** |

### Orphan modules (can quyet dinh)

- ~~`src/core/sentiment/`~~ **DA XOA (2026-07-31)**
- ~~`src/core/orchestrator/delegation-orchestrator.ts`~~ **DA XOA (2026-07-31)**
- ~~`src/core/knowledge/entity-approval-queue.ts`~~ **DA XOA** (zero imports, HITL dependency da xoa)
- `src/core/security/secret-rotation.ts` — **instrumented (2026-07-31)**: them USAGE-TRACE log o moi export function chinh; xoa sau 1-2 thang neu khong thay log nao
- `src/core/security/consent.ts` — **instrumented (2026-07-31)**: them USAGE-TRACE log o moi export function chinh; xoa sau 1-2 thang neu khong thay log nao

---

## 7. Cam bay da biet (pitfalls)

1. **Dung them co boolean set-once cho vong doi nhieu giai doan.** -> Dung discriminated union + derive tu nguon su that duy nhat (ADR-001). *Tung gay bug: `hasCreatedPlan`, `executionPhase` o agent.ts cu.*

2. **Dung luu state per-request tren `this` cua instance dung chung.** -> Dung `RequestContext` (AsyncLocalStorage). *Tung gay bug: `updatePlanCtx`, `currentTaskId`, `evidenceLog` tren Engine singleton.*

3. **Dung tin `result_summary`/text model tu viet lam bang chung hoan thanh.** -> Can evidence tool call that trong `evidenceLog`. *Tung gay bug: model tu khai "da xong" du chua goi tool.*

4. **Dung dung `channelId`/`userId` lam sessionId cho state hoi thoai.** -> `ConversationSessionId` (UUID) != `UserId` != `channelId`. *Bug con ton tai: gateway/index.ts dung `msg.channelId` lam sessionId.*

5. **Khi them session moi vao checkpoint/memory, kiem tra key dang dung `sessionId` that (tu SessionManager) — khong phai channelId.**

6. **Engine.process -> processInner co request timeout 120s.** Background task dung `taskType: 'background'` de bypass timeout qua TaskQueue.

7. **`selectRelevantTools()` co the tra ve rong** — fallback ve full registry. Neu them tool moi, kiem tra no xuat hien trong `getDefinitions()`.

8. **`ensureToolDefinitionsLoaded()` phai goi SAU KHI register het plugin** — neu khong, tool moi khong duoc gui den LLM.

9. **`session_search` va cac tool tim kiem: luon kiem tra fallback ve query khong gioi han khi thieu tham so scope.** *Lop loi da gap.*

10. **`fromUserId()`, `fromConversationSessionId()` chi strip brand type o compile-time** — khong co runtime validation.

---

## 8. Import Rules

| From | To | Status |
|------|----|--------|
| `modules/` | `core/` | OK via barrel |
| `core/` | `modules/` | FORBIDDEN |
| `scripts/` | `core/` | FORBIDDEN |
| any code | `knowledge/` | FORBIDDEN |

---

## 9. Boot Sequence

1. `scripts/start-telegram.ts` — lock file, kill old instances
2. Create `Engine` -> init: load providers, build ModelRouter, register tools, init checkpoint/memory/event bus
3. Create `CoralGateway` -> register `TelegramBridge` adapter
4. Start adapter -> `bot.start()` long polling
5. Cache warmup — gui 1 ping model call

---

*Coral Architecture Guide — Updated: 2026-07-29*
