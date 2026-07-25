# STATE_AUDIT.md — Event System Audit

> **Phase 0:** Liệt kê toàn bộ event types, payload schema, và state gaps

---

## 1. Event Types (Defined in `types.ts`)

### Base Structure
```ts
{
  id: string (UUID),
  timestamp: number (ms),
  type: string,
  payload: Record<string, unknown>,
  metadata?: { source: string, version: string }
}
```

### Schema Overview

| # | Event Type | Payload Fields | Emitted? | Call Site |
|---|-----------|---------------|----------|-----------|
| 1 | `task_created` | `goal`, `plan?[]`, `constraints?[]` | ❌ **Dead** | — |
| 2 | `task_started` | `taskId`, `goal`, `currentStep?` | ✅ **Active** | `engine.ts:304` |
| 3 | `task_finished` | `taskId`, `goal`, `success`, `duration`, `result?` | ✅ **Active** | `engine.ts:371,392` |
| 4 | `tool_called` | `toolName`, `args`, `taskId?` | ❌ **Dead** | — |
| 5 | `tool_finished` | `toolName`, `args`, `result`, `success`, `duration` | ❌ **Dead** | — |
| 6 | `memory_write` | `key`, `value`, `scope` (user/memory/session) | ❌ **Dead** | — |
| 7 | `error` | `message`, `stack?`, `code?`, `context?` | ✅ **Active** | `engine.ts:391` |

### Active Emissions (engine.ts only)

```
processInner() {
  line 304:  eventLogger.taskStarted(taskId, goal)           // task_started
  line 371:  eventLogger.taskFinished(taskId, goal, true, duration, result)  // task_finished ✓
  line 391:  eventLogger.error(msg, stack, 'ENGINE_AGENT_FAILED')  // error
  line 392:  eventLogger.taskFinished(taskId, goal, false, duration, msg)  // task_finished ✗
}
```

### Dead Emission Paths (defined, never called)

| Method | File | Never Called From |
|--------|------|------------------|
| `logger.taskCreated()` | `logger.ts:18` | Zero call sites |
| `logger.toolCall()` | `logger.ts:30` | Zero call sites |
| `logger.toolResult()` | `logger.ts:34` | Zero call sites |
| `logger.memoryWrite()` | `logger.ts:38` | Zero call sites |

---

## 2. Payload Schema Detail

### task_started (actual payload)
```ts
{
  taskId: string,       // "task-1742618000123"
  goal: string,         // first 200 chars of userMessage
  // currentStep: NOT populated (schema says optional, engine never passes it)
}
```

### task_finished (actual payload)
```ts
{
  taskId: string,
  goal: string,         // first 200 chars of userMessage
  success: boolean,
  duration: number,     // ms
  result?: string,      // first 500 chars of response
}
```

### error (actual payload)
```ts
{
  message: string,      // agentErr.message
  stack?: string,       // agentErr.stack
  code: string,         // "ENGINE_AGENT_FAILED"
  // context: NOT populated
}
```

---

## 3. State Derivation Matrix

| State Field | Derivable? | From Event | Gap |
|------------|-----------|------------|-----|
| `status` (online/offline/working) | 🔶 Partial | task_started → 'working', task_finished → 'idle' | Không có 'offline' event. Cần heartbeat. |
| `currentGoal` | ✅ Yes | task_started.payload.goal | OK |
| `currentTask` | ✅ Yes | task_started.payload.taskId | OK |
| `currentTask.step` | ❌ **No** | — | `currentStep` không bao giờ được emit |
| `currentPlan` | ❌ **No** | — | Không có event nào chứa plan |
| `activeTools` | ❌ **No** | — | tool_called/tool_finished không bao giờ emit |
| `recentFiles` | ❌ **No** | — | Không có file event type nào |
| `lastError` | ✅ Yes | error.payload.message | OK (trừ khi error không emit) |
| `timeline` | ✅ Yes | Tất cả events | OK — cần sort theo timestamp |
| `memoryHistory` | ❌ **No** | — | memory_write không bao giờ emit |
| `taskHistory` | 🔶 Partial | task_started/finished | OK cho task hiện tại, nhưng không có danh sách tổng hợp |
| `toolUsage` | ❌ **No** | — | tool_called/finished là dead events |
| `sessionTime` | N/A | — | Tính từ dashboard mở, không cần event |
| `progress` | ❌ **No** | — | Không có progress/total steps event |

---

## 4. Gaps (State không thể suy ra từ events hiện tại)

### Gap A: `currentStep` không bao giờ populate
- Schema có `currentStep?: number` trên `task_started`
- Engine không bao giờ truyền step nào
- **History:** Engine chỉ có task_started/finished, không có step-tracking

### Gap B: `tool_called`/`tool_finished` không emit
- Schema định nghĩa đầy đủ, Factory + Logger có method
- Engine không emit tool events
- → `activeTools` state không thể suy ra
- → Dashboard Tools tab không có data

### Gap C: `memory_write` không emit
- Schema định nghĩa, Factory + Logger có method
- Không ai gọi `logger.memoryWrite()`
- → Memory tab trên dashboard không có data

### Gap D: Không có `task_created` event
- Schema định nghĩa, Factory + Logger có method
- Engine không emit task_created
- → Không có plan/constraints trong bất kỳ event nào

### Gap E: Không có file events
- Schema không có file events
- → Dashboard Files tab không có data source

### Gap F: Không có decision/reasoning events
- Không có event type cho "tại sao agent chọn tool X"
- → Không thể implement Phase 5 "Why Did Agent Do This" với schema hiện tại

---

## 5. SQLite Schema

```sql
-- Table: agent_events
-- Columns: id, timestamp, type, payload (JSON text), metadata (JSON text nullable)
-- Index: type, timestamp
-- File: sqlite-storage.ts (initEventTables)
```

Không có `agent_state` table — state được tính toán real-time từ events.

---

## 6. Network Transport

| Path | Type | Method | Returns |
|------|------|--------|---------|
| `/api/events/recent` | REST GET | EventApi.getRecent() | last 50 events |
| `/api/events/stats` | REST GET | EventApi.getStats() | count by type |
| `/api/events/task/:id` | REST GET | EventApi.getByTask() | events filtered by taskId |
| `/ws/events` | WebSocket | EventWebSocket | init: last 50 + real-time stream |

Dashboard frontend cũng gọi `POST /api/agent/resume|pause|stop` nhưng server trả về 404.

---

## 7. Questions for Kayce

Trước khi qua Phase 1, cần quyết định:

1. **Tool events:** Có nên emit `tool_called`/`tool_finished` từ Engine không? Engine cần instrumentation ở ReAct loop.
2. **File events:** Cần thêm event type `file_created`/`file_modified`/`file_deleted`? Nếu có, payload thế nào?
3. **Step events:** Engine hiện tại không có khái niệm "step". Có nên thêm `step_started`/`step_finished` event type?
4. **Decision events:** Phase 5 "Why Did Agent Do This" cần decision reason. Cần event type `decision` với payload `{ reason, action, alternatives?[] }`?
5. **Error code list:** Hiện tại chỉ có `ENGINE_AGENT_FAILED`. Cần định nghĩa error codes không?
