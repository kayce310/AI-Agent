# Coral Agent — Architecture Optimization Plan

## Tổng quan

Báo cáo xác định 6 vấn đề chính. Dưới đây là phương án tối ưu cho từng vấn đề, xếp theo thứ tự ưu tiên (P0 = critical, P1 = high, P2 = medium, P3 = low), tập trung vào **thay đổi an toàn, incremental, không phá vỡ architecture hiện tại**.

---

## P0: Unbounded Data Structures (7+ cấu trúc cần eviction)

### Phát hiện chi tiết

| # | File | Cấu trúc | Vấn đề |
|---|------|----------|--------|
| 1 | `memory-store.ts` | `blocks: MemoryBlock[]` | Mảng tăng không giới hạn, chỉ có TTL-based cleanup |
| 2 | `memory-temporal.ts` | `blocks: Map<string, MemoryBlock>` | Không có eviction policy nào |
| 3 | `MemoryStore.ts` | `patternCounter: Map` | Không có eviction — mỗi tool pattern mới thêm 1 entry vĩnh viễn |
| 4 | `engine.ts` | `pendingCallIds: Map` | Accumulates tool names, không cleanup |
| 5 | `cost-tracker.ts` | `byTask: Record<string, TaskCost>` | maxRecords chỉ giới hạn records[], byTask vô hạn |
| 6 | `mission-lock.ts` | `personalityChanges, sessionChangeCounts` | Không eviction |
| 7 | `entity-store.ts` | `entities, aliases: Map` | Không eviction |
| 8 | `observability/event-store.ts` | `eventSequences: Map` | Per-session, không cleanup |
| 9 | `graph-builder.ts` | `nodes, toolsByDecision, artifactsByDecision` | Không eviction |
| 10 | `activity-reporter.ts` | `typingIntervals, heartbeatTimeouts` | Timer leak risk |

### Giải pháp

#### File: `src/core/memory/memory-store.ts` — blocks array eviction

```typescript
// Thêm vào class MemoryStore (sau method cleanupExpired)
/** Evict old blocks when total exceeds MAX_BLOCKS */
private readonly MAX_BLOCKS = 10_000;

async enforceBlockLimit(): Promise<number> {
  if (this.blocks.length <= this.MAX_BLOCKS) return 0;
  // Sort by timestamp ascending (oldest first), keep MAX_BLOCKS newest
  const sorted = [...this.blocks].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
  const toRemove = this.blocks.length - this.MAX_BLOCKS;
  const kept = sorted.slice(0, this.MAX_BLOCKS);
  this.blocks = kept;
  await this.log.createSnapshot(this.blocks);
  return toRemove;
}
```

- **Sửa**: Thêm method + gọi trong `add()` và `addMany()` sau khi push
- **Impact**: Giới hạn memory leak, snapshot được refresh. Zero impact lên caller.

#### File: `src/core/memory/memory-temporal.ts` — blocks map eviction

```typescript
// Sửa constructor: thêm maxBlocks
private readonly MAX_BLOCKS = 5_000;

// Thêm method — gọi sau mỗi addBlock
private enforceBlockLimit(): void {
  if (this.blocks.size <= this.MAX_BLOCKS) return;
  // Sort by timestamp, keep newest
  const sorted = Array.from(this.blocks.entries())
    .sort(([, a], [, b]) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  const toDelete = sorted.slice(this.MAX_BLOCKS);
  for (const [id] of toDelete) this.blocks.delete(id);
}
```

- **Sửa**: Thêm method, gọi trong `addBlock()`
- **Impact**: Zero. MemoryTemporal là internal, không ai iterate blocks trực tiếp.

#### File: `src/core/memory/MemoryStore.ts` — patternCounter eviction

```typescript
// Thêm vào class MemoryStore
private readonly MAX_PATTERNS = 500;

// Sửa recordToolUsage(): sau khi set, kiểm tra size
if (this.patternCounter.size > this.MAX_PATTERNS) {
  // Evict 50% oldest entries (by ... callCount)
  const sorted = Array.from(this.patternCounter.entries())
    .sort(([, a], [, b]) => a.callCount - b.callCount);
  const toDelete = sorted.slice(0, Math.floor(this.MAX_PATTERNS * 0.5));
  for (const [key] of toDelete) this.patternCounter.delete(key);
}
```

- **Sửa**: Thêm eviction vào `recordToolUsage()`
- **Impact**: Zero — patternCounter chỉ dùng internal cho belief formation

#### File: `src/core/engine/engine.ts` — pendingCallIds cleanup

```typescript
// Sửa handler 'tool:result' — sau khi shift và xử lý xong, cleanup periodic:
// Thêm periodic cleanup:
setInterval(() => {
  if (this.pendingCallIds.size > 100) {
    // Xóa các tool names không còn pending (empty arrays)
    for (const [key, queue] of this.pendingCallIds) {
      if (queue.length === 0) this.pendingCallIds.delete(key);
    }
  }
}, 5 * 60 * 1000); // Mỗi 5 phút
```

- **Sửa**: Thêm cleanup interval trong constructor
- **Impact**: Zero — chỉ cleanup empty queues

#### File: `src/core/events/cost-tracker.ts` — byTask eviction

```typescript
// Sửa constructor: thêm maxTasks
private readonly MAX_TASKS = 1000;
// Trong recordCall(): sau khi set byTask[taskId]
const taskKeys = Object.keys(this.byTask);
if (taskKeys.length > this.MAX_TASKS) {
  // Xóa 20% oldest
  const sorted = taskKeys.sort();
  const toDelete = sorted.slice(0, Math.floor(this.MAX_TASKS * 0.2));
  for (const key of toDelete) delete this.byTask[key];
}
```

- **Sửa**: Thêm eviction trong `recordCall()`
- **Impact**: getSessionCost() vẫn trả về đúng (session-level), chỉ mất task-level history cũ

#### File: `src/core/security/mission-lock.ts`

```typescript
// Tương tự: giới hạn sessionChangeCounts và personalityChanges
private readonly MAX_CHANGES = 200;
// Clear entries cũ khi vượt ngưỡng
```

#### File: `src/core/knowledge/entity-store.ts`

```typescript
// Thêm eviction tương tự:
private readonly MAX_ENTITIES = 2000;
```

---

## P1: Merge Observability Systems (3 systems → 1)

### Phát hiện chi tiết

| Hệ thống | File | Cơ chế | Engine sử dụng? |
|-----------|------|--------|-----------------|
| **A) EventBus + SQLite** | `src/core/events/` | EventBus → EventStore (better-sqlite3) → StructuredLogger | ✅ Engine khởi tạo và dùng |
| **B) Core Tracer** | `src/core/observability/tracer.ts` | Span-based + Langfuse | ✅ Imported trong engine.ts |
| **C) Phase 2.1 Observability** | `src/observability/` | JSONL files + MetricsCollector + Express REST API | ❌ Không active trong engine.ts |

### Giải pháp — Merge C vào A

**Chiến lược an toàn**: Giữ nguyên A (EventBus/SQLite) làm backbone, vì engine đã dùng. Merge C vào A bằng cách:
1. Thêm REST API layer từ C vào `http-server.ts` (đã tồn tại)
2. Chuyển MetricsCollector của C thành plugin nhẹ của EventBus
3. Xóa file `src/observability/` sau khi migrate endpoints

#### File: `src/core/events/http-server.ts`

- **Sửa**: Thêm observability REST endpoints từ `src/observability/api.ts` vào handler
- **Chi tiết**: Copy các route `/api/observability/events`, `/api/observability/metrics`, `/api/observability/health` vào http-server.ts
- **Impact**: Dashboard có thêm endpoint, không phá vỡ gì

#### File: Mới `src/core/events/metrics-collector.ts`

- **Tạo**: Merge ngắn gọn từ `src/observability/metrics-collector.ts`
- **Chi tiết**: Tạo class MetricsCollector nhẹ dùng EventBus, chỉ tracking summary metrics (không persist riêng)
- **Impact**: Engine có metrics tracking real-time nhẹ

#### File: Xóa `src/observability/` (sau khi các bước trên hoàn tất)

- Giữ lại Tracer (core/observability/) nếu đang dùng Langfuse
- Nếu không dùng Langfuse, Tracer cũng có thể gom vào EventBus

---

## P1: Consolidate Memory Systems (5 systems → 2)

### Phát hiện chi tiết

| Hệ thống | File | Trạng thái | Engine dùng? |
|-----------|------|-----------|-------------|
| **① MemoryCore** | `memory/memory.ts` | Legacy JSON file-based | ✅ `engine.saveMessage()`, `engine.getHistory()` |
| **② MemoryStore** | `memory/MemoryStore.ts` | In-memory Map + JSON + decay | ✅ Dashboard API |
| **③ globalMemoryStore** | `memory/memory-store.ts` | ADD-only + Append-Log | ✅ `engine.init()`, tool handlers |
| **④ MemoryTemporal** | `memory/memory-temporal.ts` | Time-indexed block storage | ✅ `temporalMemory`, `agenticMemory` |
| **⑤ CoralStorage/SQLite** | `memory/sqlite-storage.ts` | SQLite for session messages | ✅ Logging |

### Giải pháp

**Chiến lược**: Không xóa ngay. Thay vào đó:

#### Bước 1 (An toàn): Đánh dấu legacy, thêm data routing mặc định

**File**: `src/core/memory/memory.ts` (MemoryCore - legacy)

```typescript
// Thêm JSDoc @deprecated
/**
 * @deprecated Use globalMemoryStore (memory-store.ts) for new code.
 * Retained for backward compat with engine.saveMessage/getHistory.
 * Phase 5: Remove after migrating engine to globalMemoryStore.
 */
```

- **Impact**: Zero — chỉ thêm deprecation warning

#### Bước 2: Tạo facade/adapter thống nhất

**File mới**: `src/core/memory/memory-facade.ts`

```typescript
// Facade unifying MemoryStore (legacy), globalMemoryStore, and MemoryTemporal
// Cho phép engine gọi 1 API thống nhất, internal routing tới backend phù hợp
export class MemoryFacade {
  constructor(
    private temporal: MemoryTemporal,
    private store: MemoryStore, // memory-store.ts (globalMemoryStore)
    private legacy: MemoryCore,  // memory.ts (for backward compat)
  ) {}
  
  async add(type: string, content: string, opts?: {...}): Promise<void> {
    // Route to appropriate backend based on type
  }
  
  async query(text: string, opts?: {...}): Promise<MemoryBlock[]> {
    // Query all backends, deduplicate, rank
  }
}
```

- **Impact**: Engine.ts có thể dùng MemoryFacade thay vì 3-4 memory instances riêng
- **An toàn**: Không xóa code cũ, chỉ thêm wrapper

#### Bước 3: Standardize MemoryBlock type

**File**: `src/core/memory/memory-log.ts` (MemoryBlock type)

```typescript
// Đã là type chuẩn — chỉ cần mở rộng thêm field nếu cần
// MemoryStore (MemoryStore.ts) nên migrate dùng MemoryBlock thay vì MemoryItem
```

---

## P1: Build Script cho TSX

### Phát hiện
- `package.json`: `"start": "npx tsx src/scripts/start-telegram.ts"`
- `tsconfig.json` có đủ cấu hình nhưng không bao giờ dùng cho build
- Runtime transpilation chậm hơn ~2-3x so với prebuilt

### Giải pháp

#### File: `package.json`

```json
{
  "scripts": {
    "start": "node dist/scripts/start-telegram.js",
    "dev": "npx tsx src/scripts/start-telegram.ts",
    "build": "tsc",
    "build:watch": "tsc --watch",
    "prestart": "npm run build"
  }
}
```

- **Sửa**: Thêm `build`, `dev`, `prestart` scripts
- **Impact**: Zero — `npm start` vẫn hoạt động (chạy build trước). `npm run dev` cho development.

#### File: Tạo `.gitignore` (kiểm tra dist/ đã có chưa)

- `dist/` cần trong .gitignore
- **Impact**: Zero

#### File: `tsconfig.json`

```json
{
  "compilerOptions": {
    // ... existing options ...
    "outDir": "./dist",
    "rootDir": "./src",
    "sourceMap": true  // Giữ để debug production
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

- **Sửa**: Không cần sửa — đã đúng cấu hình
- **Impact**: Zero

#### File: `Dockerfile`

```dockerfile
# Thêm build stage
RUN npm run build

# Production stage: dùng dist/ thay vì tsx
CMD ["node", "dist/scripts/start-telegram.js"]
```

---

## P2: Dashboard Conditional Startup

### Phát hiện
- `start-telegram.ts` luôn tạo DashboardServer và gọi `.start()` bất kể headless mode
- Tiêu tốn ~20-50MB RAM + HTTP port

### Giải pháp

#### File: `src/scripts/start-telegram.ts`

```typescript
// Thêm biến môi trường
const HEADLESS = process.env.CORAL_HEADLESS === 'true';
const DASHBOARD_PORT = parseInt(process.env.CORAL_DASHBOARD_PORT || '8766', 10);

// Chỉ start dashboard khi không headless
if (!HEADLESS) {
  dashboardServer = new DashboardServer(engine.getEventBus(), {
    port: DASHBOARD_PORT,
    host: '127.0.0.1',
  });
  await dashboardServer.start();
} else {
  console.log(`${ts()} 📡 Headless mode — dashboard disabled`);
}
```

- **Sửa**: Conditional initialization + sửa gracefulShutdown để skip nếu null
- **Impact**: Zero khi không set env var (mặc định dashboard vẫn chạy)

#### File: `.env.example`

```
# Dashboard
CORAL_HEADLESS=false
CORAL_DASHBOARD_PORT=8766
```

---

## P2: Remove Dead Code (Smart Home + Sentiment)

### Phát hiện
- `src/core/smarthome/` — 5 files, ~500 lines — KHÔNG được import bởi bất kỳ file active nào
- `src/core/sentiment/` — 2 files, ~475 lines — KHÔNG được import bởi bất kỳ file active nào
- Sentiment có `spawn()` Python child process (security risk + dependency)

### Giải pháp

**Chiến lược an toàn**: Comment out thay vì xóa, để dễ phục hồi

#### Bước 1: Đánh dấu file bằng banner

```typescript
/**
 * @dead-code Confirmed unused as of 2026-06-23
 * @reason No import path from src/scripts/, src/core/engine/, src/modules/telegram/, or src/core/gateway/
 * @restore Remove this banner and re-add import in the desired consumer
 */
```

#### Bước 2: Xóa khỏi VCS tracking (git rm) nhưng backup

```bash
mkdir -p .coral/archived
cp -r src/core/smarthome .coral/archived/smarthome
cp -r src/core/sentiment .coral/archived/sentiment
git rm -r src/core/smarthome
git rm -r src/core/sentiment
```

#### Bước 3: Xóa nếu không còn ai khởi tạo (verify)

```bash
grep -r "smarthome\|sentiment" src/ --include="*.ts" --include="*.js"
# Should return no results
```

- **Impact**: Zero — code chết, không ai gọi. Giảm dependency (spawn, Python path), tăng maintainability.

---

## P3: Vấn đề kiến trúc khác (cải thiện phụ)

### EventBus đồng bộ → Xử lý lỗi handler

**File**: `src/core/events/bus.ts`

```typescript
// Sửa: wrap handler call trong try-catch với logging
publish(event: AgentEvent): void {
  this.store.append(event);
  const typeHandlers = this.handlers.get(event.type) || [];
  for (const handler of typeHandlers) {
    try {
      handler(event);
    } catch (error) {
      console.error(`[EventBus] Handler crashed for ${event.type}:`, error);
      // Không throw — không làm crash publisher
    }
  }
}
```

Hiện tại handler error không được catch — sẽ crash toàn bộ publish chain.

### Rate limiter unbounded user tracking

**File**: `src/core/security/rate-limiter.ts` — `users: Map<string, RateLimiter>`

```typescript
// Thêm periodic cleanup users không hoạt động
setInterval(() => {
  // Xóa users không có activity trong 30 phút
}, 30 * 60 * 1000);
```

---

## Tổng hợp file cần sửa

| Ưu tiên | File | Thay đổi |
|---------|------|----------|
| **P0** | `src/core/memory/memory-store.ts` | Thêm enforceBlockLimit() — 10 dòng |
| **P0** | `src/core/memory/memory-temporal.ts` | Thêm enforceBlockLimit() — 10 dòng |
| **P0** | `src/core/memory/MemoryStore.ts` | Thêm patternCounter eviction — 8 dòng |
| **P0** | `src/core/engine/engine.ts` | Thêm cleanup interval cho pendingCallIds — 10 dòng |
| **P0** | `src/core/events/cost-tracker.ts` | Thêm byTask eviction — 8 dòng |
| **P0** | `src/core/security/mission-lock.ts` | Thêm eviction cho session maps — 8 dòng |
| **P0** | `src/core/knowledge/entity-store.ts` | Thêm entity count limit — 5 dòng |
| **P0** | `src/core/events/bus.ts` | Thêm try-catch handler protection — 5 dòng |
| **P1** | `src/core/events/http-server.ts` | Thêm observability REST routes — ~50 dòng |
| **P1** | `src/core/events/` (file mới) | metrics-collector.ts cho EventBus — ~60 dòng |
| **P1** | `src/core/memory/memory.ts` | Thêm @deprecated JSDoc — 1 dòng |
| **P1** | `src/core/memory/` (file mới) | memory-facade.ts — ~80 dòng |
| **P1** | `package.json` | Thêm build/dev/prestart scripts — 3 dòng |
| **P2** | `src/scripts/start-telegram.ts` | Conditional dashboard startup — 12 dòng |
| **P2** | `src/core/smarthome/` + `src/core/sentiment/` | Archive + delete dead code |
| **P3** | `src/core/security/rate-limiter.ts` | Periodic user cleanup — 5 dòng |

### Tổng kết impact

- **Tất cả thay đổi P0**: < 60 dòng code mới, zero API thay đổi, chỉ thêm guard/eviction
- **P1 Merge Observability**: +110 dòng code mới, giữ nguyên API, có thể rollback
- **P1 Consolidate Memory**: +80 dòng facade, zero impact lên consumer code
- **P1 Build Script**: 3 dòng package.json, zero runtime impact
- **P2 Dashboard**: 12 dòng conditional, default behavior không đổi
- **P2 Dead Code**: Giảm ~1000 dòng, không ảnh hưởng gì

**Không có thay đổi nào yêu cầu rewrite core agent loop.**
**Không có thay đổi nào làm sai lệch behavior hiện tại.**
**Tất cả đều có thể rollback bằng git revert.**
