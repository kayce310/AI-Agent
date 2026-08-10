# Đánh giá tính khả thi — Consequence Memory (ADR-003)

**Date:** 2026-08-06
**Xác minh lại:** 2026-08-06 (đối chiếu ADR-000 + CORAL.md, grep + read_file trực tiếp trên source)
**Phương pháp:** khảo sát codebase thực tế (grep + read_file), mọi kết luận đều có `file:line` bằng chứng.
**Kết luận chung:** **Khả thi cao.** Hầu hết hạ tầng cần thiết đã tồn tại. Không cần xây hệ memory mới, không cần vector/graph DB. Việc chính là *nối dây* (wiring) các khối đã có vào một lớp điều khiển hành vi, đúng như định hướng của ADR-003.

---

## 1. Bản đồ: ADR-003 cần gì vs codebase có gì

| ADR-003 cần | Codebase hiện có | Trạng thái |
|---|---|---|
| Ghi `context → action → outcome` | `tool_called` / `tool_finished` events (`src/core/events/types.ts` L66–89) — đã có `taskId, decisionId, callId, toolName, args, success, durationMs` | ✅ Đủ |
| Outcome success/fail | `success: boolean` trong `tool_finished`; convention `{error}` trong tool result (`tool-registry.ts` L150–165) | ✅ Đủ |
| Neo vào evidence (`evidenceRef`) | `plan.id` (ổn định, `update-plan-tool.ts` L42), `callId` (UUID/call), `requestId` (checkpoint), `MemoryBlock.parentId` | ✅ Đủ (chưa có field tường minh) |
| Runtime gate (suggest/require_hitl/block) | Guard chain `hooks.before('tool:call')` trả `GuardResult {allowed, reason}`, fail-closed (`hooks.ts` L66–175) — **điểm chèn lý tưởng** | ✅ Đủ |
| Persistent store | better-sqlite3 `data/coral.db` (`sqlite-storage.ts`) + append-log pattern (`memory-log.ts`) + bảng `agent_events` | ✅ Đủ |
| Phát hiện fail lặp | `error-classifier.ts`, stagnation counters (`agent.ts` L1098–1160), `CircuitBreaker`, MCP `ToolStats.successRate` | ⚠️ Có nhưng scope theo request/plan, chưa xuyên session |
| HITL | `HITLManager` + `ApprovalQueue` (`hitl.ts`) | ⚠️ Nửa nối dây (xem §4) |

---

## 2. Điểm chèn (insertion points) — đã xác minh

### 2.1 Runtime gate — `hooks.before('tool:call')`

Đây là **điểm chèn duy nhất và lý tưởng** cho lớp suggest/require_hitl/block.

- `agent.ts` L911–917: `const allowed = await this.hooks.emit('tool:call', {...})` — guard chạy **trước khi thực thi tool**.
- Guard trả `{allowed:false}` → tool bị chặn, inject `TOOL_BLOCKED: ...` vào messages (`agent.ts` L918–929) — **đường deny có cấu trúc đã sẵn**.
- Mẫu có sẵn: `PrivilegeGuard.attachToHooks()` (`privilege-guard.ts` L300–330) đăng ký guard y hệt. Consequence Memory chỉ cần bắt chước mẫu này.
- Guard fail-closed (`hooks.ts` L137–175): lỗi guard → block. Đúng nguyên tắc an toàn.

> ⚠️ **Lưu ý 3-trạng thái:** guard hiện tại chỉ có `allowed: boolean`. `suggest` (không chặn, chỉ thêm constraint mềm) cần ngữ nghĩa mới — hoặc là một hook (không phải guard) chèn constraint vào prompt, hoặc guard trả `allowed:true` kèm `reason` để model thấy. `require_hitl`/`block` thì map thẳng vào `allowed:false` + reason.

### 2.2 Outcome capture / học lesson — `tool:result` handler

`engine.ts` L372–438 là **trung tâm hiện có** cho mọi việc: phân loại lỗi, abort security, emit event, ghi memory. Đây là nơi tự nhiên để:

- phát hiện fail lặp (dùng `error-classifier` + counter),
- tạo `ConsequenceRecord` khi đủ điều kiện (fail lặp / risk gate deny / success tái sử dụng).

### 2.3 Persistence — `agent_events` table hoặc append-log

- Bảng `agent_events(id, timestamp, type, payload, metadata)` (`sqlite-storage.ts` L271–281) — có thể thêm cột `lesson`/`reuse_policy` hoặc bảng `consequences` riêng.
- Hoặc dùng append-log pattern (`MemoryLog`) như `MemoryStore`/`MemoryTemporal` — đã có mutex + fsync + snapshot + rotation.

---

## 3. Điểm mạnh — vì sao khả thi cao

1. **Không cần thu thập dữ liệu mới.** `tool_called`/`tool_finished` đã ghi đủ context→action→outcome. Chỉ cần thêm bước "tổng hợp thành lesson".
2. **Điểm chèn guard đã có sẵn và đã được dùng** (PrivilegeGuard). Không phải thiết kế cơ chế chặn mới.
3. **Hạ tầng lưu trữ đã có** (SQLite + append-log). Không cần vector/graph DB.
4. **Đã có sẵn các khối "gần giống"**: `error-classifier` (transient/permanent/security), stagnation counter (fail lặp), `canCompleteItem` (gate dựa evidence). Consequence Memory là **tổng hợp + nâng cấp** các khối này lên tầm cross-session, không phải xây từ đầu.
5. **Phù hợp ADR-000**: mọi quyết định đều neo vào evidence (`evidenceRef`), white-box, audit được — không có "memory bí ẩn".

---

## 4. Điểm yếu / rủi ro — cần xử lý

### 4.1 HITL hiện "nửa nối dây" (quan trọng nhất)

**Trạng thái đã xác minh (2026-08-06):**

- ✅ **Đã nối dây phần "thông báo phê duyệt"**: `HITLManager` được khởi tạo trong `start-telegram.ts` L558–566, nối với Telegram bridge (`registerHITLManager` + `onPending` → gửi keyboard phê duyệt tới admin chat).
- ❌ **Chưa nối dây phần "chặn tool"**: `checkAndRequest()` (`hitl.ts` L270) **không được gọi từ bất kỳ đâu trong đường thực thi tool** — grep chỉ thấy trong `hitl.ts` và docs. Nghĩa là hạ tầng HITL tồn tại đầy đủ (queue, TTL, resolve, notify), nhưng **chưa có guard nào gọi nó để chặn một tool call**.
- **Ngữ cảnh**: HITL hiện chỉ là một module độc lập + UI phê duyệt. Nó **không nằm trong guard chain** `tool:call` (guard chain hiện chỉ có `PrivilegeGuard`).
- → Phase 2 (`require_hitl`) cần **nối dây** `checkAndRequest` vào guard chain. Đây là **việc làm thật, không phải việc đã xong** — nhưng hạ tầng phía sau (queue/notify/resolve) đã sẵn, chỉ thiếu bước gọi.

### 4.2 Guard 3-trạng thái chưa có ngữ nghĩa

`GuardResult` chỉ có `allowed: boolean`. `suggest` (không chặn) cần kênh riêng (thêm constraint vào prompt) — cần thiết kế nhỏ, không phải viết lại guard chain.

### 4.3 Phát hiện fail lặp chưa cross-session

- `stagnation` counter (`agent.ts` L1098–1160) và `error-classifier` đều **scope trong 1 request/1 plan**.
- `ToolStats.successRate` (MCP) tổng hợp theo tool nhưng không lưu "cùng nguyên nhân".
- **Phase 1–2 cần một bộ đếm/aggregation mới** trên `agent_events` để đếm "cùng tool + cùng error pattern" xuyên session. Đây là phần **phải viết mới** nhiều nhất.

### 4.4 Kết quả tool bị cắt ngắn

- `tool_finished` chỉ lưu `result.substring(0, 500)` (`engine.ts` L414).
- `toolResultsSummary` trong checkpoint chỉ 500 ký tự.
- Đủ để phân loại lỗi, nhưng **không đủ để trích lesson chi tiết** — cần giữ `error`/`errorCategory` (đã có) làm nguồn lesson, không dựa vào full result.

### 4.5 Guard chain subagent — ✅ ĐÃ NỐI DÂY (không còn là gap)

**Trạng thái đã xác minh (2026-08-06):**

- Parent loop: `agent.ts` L911 gọi `hooks.emit('tool:call')`.
- Subagent loop: `delegate.ts` L182–205 **đã gọi** `globalHooks.emit('tool:call')` + `tool:result` — cùng guard chain như parent, không bypass.
- CORAL.md ghi nhận fix này ngày 2026-08-06 (trước đây subagent gọi `registry.execute` trực tiếp → BY-PASS guard chain).

> ⚠️ **Sửa so với bản trước**: bản feasibility trước đây (viết trước khi xác minh lại) cho rằng subagent "cần cùng guard" — **sai**. Guard chain subagent đã nối dây. Consequence Memory chỉ cần đăng ký guard **một lần** trên `globalHooks` là áp cho cả parent lẫn subagent.

### 4.6 `block` phải cực hiếm (đúng ADR-003 §9)

Guard fail-closed nghĩa là lỗi guard → block. Cần đảm bảo ConsequenceMemoryGuard **không fail-closed** khi chỉ là `suggest`/`require_hitl` (nếu không sẽ chặn nhầm). Chỉ `block` thật sự mới fail-closed.

---

## 4.7 Kiểm tra tuân thủ ADR-000 (bắt buộc trước khi thêm state mới)

Consequence Memory tạo **state mới** (bảng `consequences` / `ConsequenceRecord`). Đối chiếu với 5 nguyên tắc ADR-000:

| Nguyên tắc ADR-000 | Consequence Memory | Tuân thủ |
|---|---|---|
| **1. Một state, một nguồn sự thật** | Consequence là **store riêng, một nơi duy nhất** ghi/đọc. Không derive song song. | ✅ (cần đảm bảo chỉ 1 module ghi) |
| **2. Không dùng boolean set-once** | `reusePolicy` là enum `suggest/require_hitl/block`, không phải boolean. | ✅ |
| **3. State per-request không trên object dùng chung** | Consequence là **persisted store**, không phải state per-request trên instance. | ✅ |
| **4. Model không tự ý tạo transition** | Consequence là **runtime-enforced** (guard), model không quyết định policy. | ✅ |
| **5. Không tin text model làm bằng chứng** | `lesson` là text model, nhưng **không dùng làm điều kiện chuyển trạng thái** — chỉ `evidenceRef` (tool call thật) mới kích hoạt suggest/require_hitl/block. | ✅ (điểm cần giữ) |

**Kết luận:** ADR-003 **tuân thủ ADR-000**, với 2 điều kiện bắt buộc khi code:
1. Chỉ **1 module duy nhất** được ghi/đọc `consequences` (giống `plan-state.ts` là module duy nhất derive PlanState).
2. `lesson` (text model) **không bao giờ** là điều kiện kích hoạt block — chỉ `evidenceRef` (tool call thật) mới được.

---

## 5. Đánh giá theo từng Phase

| Phase | Khả thi | Lý do |
|---|---|---|
| **Phase 0 — Hợp đồng dữ liệu** | ✅ Rất cao | Chỉ định nghĩa schema, không sửa runtime. Dữ liệu nguồn đã có đủ. |
| **Phase 1 — Write path** | ✅ Cao | `tool:result` handler (`engine.ts` L372) là nơi sẵn. Thêm bảng `consequences` + logic tổng hợp lesson. |
| **Phase 2 — Read path (mềm)** | ✅ Cao | Guard chain `tool:call` đã sẵn (cả parent lẫn subagent). Chỉ cần `suggest` (constraint injection) + `require_hitl` (nối dây `checkAndRequest`). |
| **Phase 3 — Cứng hóa** | ⚠️ Trung bình | Cần aggregation cross-session (viết mới) + thống kê false positive. |
| **Phase 4 — Mở rộng** | ⚠️ Phụ thuộc Phase 3 | Đúng như ADR-003: chỉ làm khi Phase 3 chứng minh giá trị. |

---

## 6. Ước lượng việc cần làm (theo Phase)

**Phase 0–1 (write path):**
- Thêm schema `consequences` (SQLite) hoặc dùng `agent_events` + field mới.
- Trong `tool:result` handler: khi fail lặp / risk gate deny / success tái sử dụng → tạo `ConsequenceRecord` (context, action, outcome, evidenceRef=`callId`/`plan.id`, lesson, reusePolicy).
- Cần: counter/aggregation theo `(toolName, errorCategory)` xuyên session.

**Phase 2 (read path mềm):**
- `ConsequenceMemoryGuard` đăng ký `hooks.before('tool:call')` (mẫu `PrivilegeGuard.attachToHooks`) — **một lần trên `globalHooks` là áp cho cả parent (`agent.ts`) lẫn subagent (`delegate.ts`)**, không cần đăng ký riêng.
- `suggest`: chèn constraint mềm vào prompt (kênh mới).
- `require_hitl`: gọi `HITLManager.checkAndRequest` (nối dây — việc làm thật).

**Phase 3 (cứng hóa):**
- Aggregation + thống kê false positive.
- Bật `block` cho safety/security (fail-closed).

---

## 7. Rủi ro lớn nhất cần chốt trước khi code

| # | Vấn đề | Trạng thái | Việc cần chốt |
|---|---|---|---|
| 1 | **Nối dây HITL** | Hạ tầng HITL đã có (queue/notify/resolve), nhưng `checkAndRequest` **chưa được gọi từ tool path** | Phase 2: gọi `checkAndRequest` trong guard chain |
| 2 | **Guard 3-trạng thái** | `GuardResult` chỉ có `allowed: boolean` | Quyết định `suggest` đi qua kênh nào (guard vs hook) để không chặn nhầm |
| 3 | **Aggregation cross-session** | `stagnation`/`error-classifier` scope trong 1 request/plan | Phase 1–3: viết bộ đếm "cùng tool + cùng nguyên nhân" trên `agent_events` |
| 4 | **Không fail-closed cho `suggest`/`require_hitl`** | Guard chain fail-closed (lỗi guard → block) | Chỉ `block` mới fail-closed; `suggest`/`require_hitl` phải fail-open |
| 5 | **Tuân thủ ADR-000** | Chưa có module ghi/đọc `consequences` | Chỉ 1 module duy nhất ghi/đọc; `lesson` không được làm điều kiện kích hoạt |

---

## 8. Kết luận

**Khả thi, và khả thi cao cho Phase 0–2.** Codebase đã có gần như toàn bộ hạ tầng: guard chain (`tool:call`), outcome capture (`tool_finished`), persistence (SQLite/append-log), HITL manager, error classification, stagnation detection. Consequence Memory đúng là "lớp điều khiển hành vi" đứng cạnh checkpoint và risk gate — không phải hệ memory mới.

Việc thực sự cần làm là **nối dây + tổng hợp**, không phải xây mới. Điểm cần đầu tư nhất là **aggregation cross-session** (Phase 1–3) và **nối dây HITL** (Phase 2). Không có rào cản kiến trúc nào ngăn việc triển khai theo đúng lộ trình ghi trước → đọc mềm → cứng hóa của ADR-003.