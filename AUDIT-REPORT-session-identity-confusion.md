# Audit Report: Session/Identity Confusion in Coral

**Date:** 2026-07-27
**Scope:** Source code audit of `sessionId`/`userId`/`channelId` usage per brief requirements
**Method:** grep + read_file — all findings backed by file:line evidence

---

## Phần 1 — Audit Results

### Câu 1: Audit 12-bug lần trước — coverage thực tế

**Kết luận: Audit 12-bug KHÔNG quét `gateway/`, `platform/telegram/`, `modules/telegram/`.**

**Bằng chứng:**

Audit 12-bug xảy ra trong session `20260727_130524_8469ee` (timestamp 2026-07-27 11:49). Các file được đọc để phân tích bug:

- `src/core/engine/agent.ts` — lines 1-1131 (full file)
- `src/core/engine/engine.ts` — Engine class
- `src/core/checkpoint.ts` — CheckpointStore
- `src/core/plan/update-plan-tool.ts`
- `src/core/plan/types.ts`
- `src/core/context-window.ts`
- `src/core/engine/token-estimator.ts`
- `src/core/hooks.ts`
- `src/core/security/goal-drift-monitor.ts`

**Trích dẫn từ session log:**
```
READ agent.ts, engine.ts, checkpoint.ts, update-plan-tool.ts, types.ts, 
context-window.ts, token-estimator.ts, hooks.ts, goal-drift-monitor.ts 
— full codebase audit [tool: read_file, search_files]
```

**12 bugs phát hiện:**
1. `updatePlanCtx` race (engine.ts)
2. `currentTaskId` race (engine.ts)
3. `evidenceLog` shared (checkpoint.ts)
4. 3 duplicate token estimators (engine.ts, context-window.ts, token-estimator.ts)
5. 2 duplicate sanitize fns (engine.ts)
6. `MAX_READ_CALLS` shadowed (agent.ts)
7. plan state 3 derivations (agent.ts, engine.ts, update-plan-tool.ts)
8. `classifyResponse NEED_TOOL` dead (agent.ts)
9. `Engine.sanitizeResponse` dead (engine.ts)
10. `SAFETY_CEILING` dead import (engine.ts)
11. `errorCategory` unused (update-plan-tool.ts)
12. goal-drift half-implemented (goal-drift-monitor.ts)

**Không có** file nào từ `src/core/gateway/`, `src/platform/telegram/`, `src/modules/telegram/` được đọc hay phân tích. Audit tập trung vào `core/engine/`, `core/plan/`, `core/checkpoint.ts`.

---

### Câu 2: Mức độ lan rộng — danh sách đầy đủ file + dòng

#### `sessionId` — toàn bộ dạng string trần (không branded type)

| File | Dòng | Vai trò |
|------|------|---------|
| `src/core/gateway/types.ts` | 20 | `CoralRequest.sessionId: string` |
| `src/core/gateway/types.ts` | 27 | `CoralResponse.sessionId: string` |
| `src/core/gateway/types.ts` | 42 | Comment: `channelId (used as Coral sessionId)` |
| `src/core/gateway/index.ts` | 260 | `sessionId: msg.channelId` (blocked msg response) |
| `src/core/gateway/index.ts` | 268 | `sessionId: msg.channelId` (normal request) |
| `src/core/checkpoint.ts` | 59 | `sessionId: string` (method param) |
| `src/core/checkpoint.ts` | 129 | `start(requestId, sessionId, currentGoal)` |
| `src/core/checkpoint.ts` | 132 | assignment vào checkpoint |
| `src/core/checkpoint.ts` | 231 | `setPlan(sessionId, plan)` |
| `src/core/checkpoint.ts` | 235+240 | log messages |
| `src/core/checkpoint.ts` | 246 | `getPlan(sessionId)` |
| `src/core/checkpoint.ts` | 255 | `hasActivePlan(sessionId)` |
| `src/core/checkpoint.ts` | 267 | `clearPlan(sessionId)` |
| `src/core/checkpoint.ts` | 284 | filter by sessionId |
| `src/core/checkpoint.ts` | 321+349 | JSON.parse + log |
| `src/core/engine/engine.ts` | 516 | `userId: request.sessionId` — **BUG: dùng sessionId làm userId** |
| `src/core/engine/engine.ts` | 521 | `const userId = request.sessionId` — **BUG** |
| `src/core/engine/agent.ts` | 276-307 | `request.sessionId` được dùng làm `sessionId` trong checkpoint calls |
| `src/core/engine/agent.ts` | 415-420 | `request.sessionId` tạo requestId và sessionStartTimes |
| `src/core/engine/agent.ts` | 596 | `derivePlanState(p, request.sessionId)` |
| `src/core/engine/agent.ts` | 607+615+776+783+801+805+807+818+837+878+922+923 | Thêm 12 chỗ dùng `request.sessionId` |
| `src/core/memory/memory-store.ts` | 420-465 | `getBlocksBySession(sessionId)` — sessionId = channelId |
| `src/core/memory/memory-facade.ts` | 36-52 | `addMessage(channelId, ...)` -> `sessionId: channelId` |
| `src/core/platform/telegram/session-manager.ts` | Toàn bộ | Dùng `session-{userId}-{timestamp}` format |
| `src/modules/telegram/commands.ts` | 74 | `channelId: String(ctx.chat?.id)` |

#### `channelId` — toàn bộ dạng string trần

| File | Dòng | Vai trò |
|------|------|---------|
| `src/core/gateway/types.ts` | 42 | `channelId: string` (AdapterMessage field) |
| `src/core/gateway/index.ts` | 260, 268 | `msg.channelId` được dùng làm `sessionId` |
| `src/modules/telegram/index.ts` | 582, 752 | `channelId: chatId` (AdapterMessage construction) |
| `src/core/commands/types.ts` | 27 | `channelId: string` |
| `src/core/memory/memory-facade.ts` | 36-81 | `channelId` là tên, nhưng lưu với key `sessionId: channelId` |
| `src/core/memory/memory-store.ts` | 420-465 | `migrateFromLegacy(channelId)` — legacy naming |

#### `userId` — toàn bộ dạng string trần (nơi dùng sai scope)

| File | Dòng | Vấn đề |
|------|------|--------|
| `src/core/gateway/index.ts` | 267 | `userId: msg.userId` — đúng (truyền đúng) |
| `src/core/engine/engine.ts` | 516 | **`userId: request.sessionId`** — sessionId (=channelId) được emit làm userId |
| `src/core/engine/engine.ts` | 521 | **`const userId = request.sessionId`** — sessionId (=channelId) dùng làm userId cho per-user rate limit |
| `src/core/engine/engine.ts` | 525 | `userId` (thực chất là channelId) emit alert |

**Tổng số:** Ít nhất 15 file trong production path sử dụng `sessionId`/`userId`/`channelId` dạng string trần. Không có branded type nào.

---

### Câu 3: Boundary serialize/deserialize cho sessionId

#### Boundary #1 — CheckpointStore → JSON file
- **File:** `src/core/checkpoint.ts`
- **Serialize:** dòng 367: `fs.writeFileSync(filePath, JSON.stringify(snapshot, null, 2), 'utf-8')`
- **Deserialize:** dòng 319-320: `fs.readFileSync(...) 'utf-8'` + `JSON.parse(content)`
- **sessionId trong snapshot:** dòng 132: `sessionId` được lưu trong checkpoint object
- **Đường dẫn:** `knowledge/checkpoints/{requestId}.json`

#### Boundary #2 — MemoryStore → Append-log + snapshot
- **File:** `src/core/memory/memory-log.ts`
- **Serialize:** dòng 183: `fs.writeFile(snapshotPath, JSON.stringify(blocks, null, 2))`
- **Deserialize:** `replay()` đọc snapshot + append files, parse JSON
- **File:** `src/core/memory/memory-store.ts`
- **Serialize:** dòng 409: `fs.writeFile(filePath, JSON.stringify(this.blocks, null, 2))`
- **sessionId trong blocks:** dòng 465: `sessionId: channelId` — sessionId là channelId
- **Đường dẫn:** `D:/AI-Agent/data/memories.json`, `data/memory-snapshots/`

#### Boundary #3 — SessionManager → JSON file
- **File:** `src/platform/telegram/session-manager.ts`
- **Serialize:** dòng 366: `fs.writeFileSync(SESSION_FILE, JSON.stringify(data, null, 2))`
- **Deserialize:** dòng 374-375: `fs.readFileSync(SESSION_FILE, 'utf8')` + `JSON.parse(raw)`
- **sessionId format:** `session-{userId}-{timestamp}` — khác hoàn toàn với channelId dùng ở Engine
- **Đường dẫn:** `%TEMP%/coral-sessions.json`

#### Boundary #4 — EventBus → WebSocket
- **File:** `src/core/events/websocket.ts` (EventWebSocket)
- **Serialize:** JSON.stringify(event) trước khi `ws.send()`
- **Deserialize:** Client-side parse
- **sessionId:** Có thể có trong event payload (tool:start, tool:end events có sessionId)
- **Không có Zod validation** tại điểm deserialize

#### Boundary #5 — AuditLogger → JSONL file
- **File:** `src/core/audit-logger.ts`
- **Serialize:** dòng 69-70: `JSON.stringify(e)` + `fs.appendFile(filePath, lines, 'utf-8')`
- **sessionId có trong:** `AuditEvent.sessionId?: string` (dòng 23)
- **Đường dẫn:** `logs/audit/audit-{date}.jsonl`

#### Boundary #6 — TaskQueue → JSON file
- **File:** `src/core/task-queue.ts`
- **Serialize:** dòng 263: `fs.writeFileSync(filePath, JSON.stringify(task, null, 2))`
- **Đường dẫn:** `data/task-queue/` (trong `pendingTasks` và `activeTask`)

#### Boundary #7 — RiskGate → pending file
- **File:** `src/core/risk-gate.ts`
- **Serialize:** dòng 63: `fs.writeFileSync(pendingPath(), JSON.stringify(items, null, 2))`
- **sessionId:** Có thể có trong pending items (từ context của risk assessment)

#### Boundary #8 — SQLite (better-sqlite3)
- **File:** `src/core/memory/sqlite-storage.ts`
- **sessionId dùng làm key:** dòng 163-167: `addSessionMessage(sessionId, userId, ...)` lưu vào `session_messages` table
- **Deserialize:** SQLite query trả về string, không parse hay validate

#### Boundary #9 — CommandContext → JSON
- **File:** `src/modules/telegram/commands.ts`
- **sessionId/channelId truyền qua:** `ctx.chat?.id` → string → không có validate

#### Boundary #10 — ProviderRegistry → JSON config
- **File:** `config/providers.json`
- **Không chứa sessionId trực tiếp** nhưng chứa metadata có thể ảnh hưởng session routing

---

## Key Architectural Finding

**Hai hệ thống session song song, dùng ID format khác nhau:**

| Hệ thống | File | sessionId format | Ví dụ |
|-----------|------|------------------|-------|
| SessionManager | `platform/telegram/session-manager.ts` | `session-{userId}-{timestamp}` | `session-8967780585-1743082800000` |
| Gateway → Engine | `gateway/index.ts` → `engine/engine.ts` | Telegram `chat.id` (số) | `8967780585` |

**Tại `gateway/index.ts:268`:** `sessionId: msg.channelId` — chat ID được dùng làm sessionId. Chat ID không đổi khi `/new` tạo session mới. Do đó, sessionId ở Engine level *không bao giờ thay đổi*, khiến `/new` không có hiệu lực ở Engine/memory.

**Tại `engine/engine.ts:521`:** `const userId = request.sessionId` — sessionId (=chatId) lại được dùng làm userId cho rate limiting. Điều này có nghĩa rate limit được tính theo chatId, không phải userId thật.

---

## Phần 2 — Fix Plan (based on above evidence)

### Scope: chỉ fix các chỗ đã tìm thấy bằng grep thật ở Phần 1

#### 2.1 Tách scope: in-session vs cross-session

Theo LangGraph pattern (`thread_id` = in-session, `user_id` = cross-session):

| Identifier | Semantic | Giá trị thực tế | Source |
|-----------|----------|----------------|--------|
| `threadId` | In-session scope | `SessionManager.sessionId` | `platform/telegram/session-manager.ts` |
| `userId` | Cross-session user identity | `msg.userId` (Telegram user ID) | `gateway/index.ts:267` |
| `channelId` | Platform channel/chat | `msg.channelId` (Telegram chat ID) | `gateway/index.ts:268` |

**Fix cụ thể:**

1. **Gateway** (`src/core/gateway/index.ts:265-268`):
   - Đổi `sessionId: msg.channelId` → `sessionId: actualSessionId` (lấy từ SessionManager)
   - Giữ `userId: msg.userId` (đã đúng)
   - Thêm `channelId: msg.channelId` (để gateway vẫn biết channel gốc)

2. **Engine** (`src/core/engine/engine.ts:516, 521`):
   - Dòng 516: đổi `userId: request.sessionId` → `userId: request.userId`
   - Dòng 521: đổi `const userId = request.sessionId` → `const userId = request.userId`

3. **CheckpointStore** (`src/core/checkpoint.ts`):
   - Key bằng `sessionId` → OK (là sessionId mới từ SessionManager)
   - Không thay đổi logic

4. **MemoryFacade** (`src/core/memory/memory-facade.ts`):
   - `addMessage(channelId, ...)` → cache key bằng `sessionId`, cần đổi thành `sessionId` thay vì `channelId`
   - Hoặc giữ `channelId` làm key nếu muốn memory scope theo channel, không phải session

#### 2.2 Branded type + Zod validate tại deserialize

**Chỉ có tác dụng compile-time** — theo đúng giới hạn đã ghi nhận (viprasol.com). Cần thêm validate tại mỗi boundary runtime:

| Boundary | File | Deserialize point | Validate thêm |
|----------|------|-------------------|---------------|
| #1 Checkpoint | checkpoint.ts:320 | `JSON.parse(content)` | Zod schema kiểm tra `sessionId` format |
| #2 Memory | memory-store.ts:409 | `JSON.parse` từ snapshot | Zod schema kiểm tra sessionId trong blocks |
| #3 Session | session-manager.ts:375 | `JSON.parse(raw)` | Zod schema kiểm tra format `session-{userId}-{ts}` |
| #4 WebSocket | websocket.ts | `ws.on('message')` parse | Zod schema kiểm tra event payload |
| #5 Audit | audit-logger.ts:69 | JSON.stringify output | Optional (log only, không critical) |
| #6 TaskQueue | task-queue.ts:263 | JSON file write/read | Zod schema |
| #7 RiskGate | risk-gate.ts:63 | JSON pending file | Zod schema |
| #8 SQLite | sqlite-storage.ts | `sessionId` param | Validate tại SQL parameter binding |

#### 2.3 Các file cần sửa (theo grep thật)

**Minimum set (P0 — gây lỗi runtime):**
1. `src/core/gateway/index.ts` — lấy sessionId từ SessionManager, không dùng channelId
2. `src/core/gateway/types.ts` — thêm `channelId` vào CoralRequest (tách khỏi sessionId)
3. `src/core/engine/engine.ts` — sửa 2 chỗ dùng sessionId làm userId (dòng 516, 521)
4. `src/modules/telegram/index.ts` — truyền sessionId từ SessionManager vào adapterMsg

**Serialization boundaries (P1 — validate tại runtime):**
5. `src/core/memory/memory-facade.ts` — dùng sessionId thay channelId làm key
6. `src/core/checkpoint.ts` — thêm Zod validate sessionId format
7. `src/platform/telegram/session-manager.ts` — thêm Zod validate tại load

**Không mở rộng ra ngoài danh sách này** — nếu nghi ngờ còn chỗ khác, ghi vào mục "Cần audit thêm".

---

## Cần audit thêm

- **`src/core/memory/memory-temporal.ts`** — 11 chỗ dùng `sessionId`, chưa kiểm tra hết scope
- **`src/core/memory/sqlite-storage.ts`** — lưu `sessionId` vào DB, cần kiểm tra format consistency
- **`src/core/memory/MemoryStore.ts`** (PascalCase) — cognitive memory store, chưa kiểm tra sessionId usage
- **Cron scheduler** (`src/core/cron/cron-scheduler.ts:150`) — ghi `sessionId: 'system'`, cần kiểm tra có leak qua memory không
- **Behavior engine** (`src/core/behavior/`), **World model** (`src/core/world/`) — chưa grep
