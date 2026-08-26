# ADR-003: Consequence Memory

**Status:** Đã chốt kiến trúc — Phase 1 (write path) + Phase 2 (read path + HITL) + Phase 3 (cross-session + narrow block) đã ship 2026-08-06. Phase 3b+ chưa triển khai.
**Date:** 2026-08-06
**Relates to:** ADR-000 (state principles), ADR-002 (memory temporal retention)

> Mục đích: đây là tài liệu định hướng kiến trúc cấp nền tảng, không phải báo cáo code.
> Dev mới đọc 5–10 phút là hiểu Coral là gì, vì sao kiến trúc hiện tại được chọn,
> vấn đề đang gặp, ý tưởng Consequence Memory giải quyết cái gì, và kế hoạch triển khai + ranh giới.

---

## 1. Coral là gì?

Coral **không** được thiết kế như một chatbot chỉ để trả lời hội thoại.

Coral là một agent có khả năng thực hiện nhiệm vụ:

- lập kế hoạch (plan)
- gọi tool
- theo dõi tiến trình
- lưu bằng chứng (evidence)
- phục hồi sau lỗi
- ghi lại trace cho dashboard/audit

Kiến trúc hiện tại đã có các khối quan trọng:

| Khối | Vai trò |
|------|---------|
| **Engine** | ReAct loop có trần an toàn |
| **Plan** | State machine, transition bị kiểm soát |
| **Checkpoint** | Lưu tiến trình theo cycle |
| **Events** | EventBus + SQLite trace |
| **Tools** | Sandbox + risk gate + HITL |
| **Memory** | Conversation + semantic + episodic + consolidation |

> Điểm quan trọng: Coral đã có hạ tầng vận hành mạnh hơn hầu hết chatbot thông thường.

---

## 2. Vấn đề thực tế đang xuất hiện

Khi Coral chạy nhiệm vụ dài hoặc lặp lại loại việc tương tự, có 4 vấn đề lớn.

### 2.1 Lặp lỗi vận hành

Ví dụ:

- cùng tool call đã fail
- cùng hướng xử lý đã bế tắc
- cùng nguyên nhân nhưng vẫn thử lại

### 2.2 Memory hiện tại chủ yếu là "nhắc nhớ"

Conversation memory và semantic memory giúp model biết thông tin.

Nhưng model vẫn có thể:

- bỏ qua memory
- ưu tiên context mới
- lặp lại quyết định cũ

### 2.3 Evidence chưa biến thành kỷ luật

Chúng ta đã lưu:
- checkpoint
- tool result
- event
- trace

Nhưng các dữ liệu này chủ yếu phục vụ **quan sát**, chưa phục vụ **ràng buộc hành vi lần sau**.

### 2.4 Nguy cơ "nồi cám memory"

Trong hệ sinh thái agent 2025–2026 có rất nhiều ý tưởng:
- L0/L1/L2/L3 memory
- vector memory
- native memory
- graph memory
- coach memory
- team memory
- wiki memory
- reflection memory

Nếu gom tất cả vào Coral, kiến trúc sẽ:
- phình rất nhanh
- khó debug
- khó audit
- phụ thuộc ý tưởng bên ngoài
- mất bản sắc của hệ thống hiện có

---

## 3. Ý tưởng cốt lõi

Coral không ưu tiên nhớ mọi thứ đã nói. Coral ưu tiên nhớ **những gì đã làm, trong điều kiện nào, với kết quả nào**.

Tên của ý tưởng này là **Consequence Memory**.

---

## 4. Consequence Memory là gì?

Một record tối thiểu:

| Trường      | Ý nghĩa                                      |
| ----------- | -------------------------------------------- |
| `context`     | Bối cảnh gọn (goal, constraint, môi trường)  |
| `action`      | Hành động đã thực hiện (tool + dạng tham số) |
| `outcome`     | `success` / `fail` / `partial` / `denied`    |
| `evidenceRef` | Con trỏ về checkpoint/event để audit         |
| `lesson`      | Bài học vận hành ngắn, hành động được        |
| `reusePolicy` | Lần sau: `suggest` / `require_hitl` / `block`|

---

## 5. Khác gì với chat memory?

| | **Chat memory** | **Consequence memory** |
|---|---|---|
| **Mục tiêu** | Giúp model hiểu người dùng và hội thoại | Giúp runtime tránh lặp hậu quả xấu và tái sử dụng hành động tốt |
| **Ví dụ** | "User thích nhạc LoFi." | "Build PX4 thất bại khi submodule chưa sync → yêu cầu sync trước khi build lại." |

Một bên phục vụ **hiểu người dùng**. Một bên phục vụ **kỷ luật hành động**.

---

## 6. Vì sao chọn hướng này?

### 6.1 Tận dụng đúng dữ liệu đã có

Coral đã có:
- tool result
- checkpoint
- plan terminal state
- risk gate
- event log

Không cần xây hệ memory mới để thu thập dữ liệu.

### 6.2 Đưa memory vào control plane

Khác biệt quan trọng nhất.

**Memory kiểu prompt:** "Lần trước thất bại nhé…" → Model có thể bỏ qua.

**Consequence Memory:** "Mẫu này đã fail 3 lần → yêu cầu HITL." → Runtime **buộc phải xét**.

### 6.3 White-box và audit được

Mọi quyết định đều truy ngược được:

```
Block / HITL
   └─ Consequence Record
        └─ evidenceRef
             └─ Event / Checkpoint
```

Không có "memory bí ẩn do model tự nghĩ ra".

### 6.4 Giữ độc lập kiến trúc

Không bắt buộc:
- vector DB mới
- graph DB mới
- native memory API
- memory product của hãng khác

Có thể chạy trên **SQLite + event + checkpoint hiện có**.

---

## 7. Cách hoạt động

### Trước khi gọi tool hoặc mở rộng plan

```
lookup similar consequences
  → suggest        : thêm constraint mềm
  → require_hitl   : xin duyệt
  → block          : từ chối
```

### Sau khi có kết quả

Nếu hành động tạo ra hậu quả đáng nhớ:

```
tool fail / plan aborted / risk gate denied / success đáng tái sử dụng
  → tạo ConsequenceRecord
```

---

## 8. Điều gì được ghi?

### Nên ghi

| Loại | Ví dụ |
|------|-------|
| Fail lặp lại | "Tried browser tool without authentication." |
| Risk gate từ chối | "Command denied by privilege policy." |
| Success có giá trị tái sử dụng | "QGC connected reliably after baud=115200 and MAV_0_RATE=5760." |

### Không nên ghi

- ❌ Toàn bộ prompt
- ❌ Secret / API key
- ❌ Payload tool quá lớn
- ❌ Mọi câu chat thông thường

---

## 9. Chính sách tái sử dụng (ban đầu)

| Tình huống                | Policy       |
| ------------------------- | ------------ |
| 1 lần fail                | `suggest`    |
| 2 lần cùng nguyên nhân    | `suggest`    |
| 3 lần cùng nguyên nhân    | `require_hitl` |
| Risk gate DENY            | `require_hitl` |
| Safety/security violation | `block`      |

Nguyên tắc: `block` phải cực kỳ hiếm.

---

## 10. Kiến trúc tích hợp

Consequence Memory **không thay thế** memory hiện tại. Nó đứng cạnh checkpoint và risk gate như một **lớp điều khiển hành vi** (control plane), không phải lớp hiểu người dùng.

---

## 11. Kế hoạch triển khai

### Phase 0 — Chốt hợp đồng dữ liệu

Mục tiêu:
- định nghĩa schema
- định nghĩa khi nào ghi
- định nghĩa khi nào đọc

Chưa sửa runtime.

### Phase 1 — Write path

Ghi record khi:
- plan failed / aborted
- tool fail lặp
- risk gate deny
- success đáng tái sử dụng

Lưu vào SQLite hoặc event store.

Kết quả mong muốn: xem được danh sách consequence và nhảy về evidence.

### Phase 2 — Read path (mềm)

Trước tool call rủi ro:
- lookup đơn giản
- chỉ bật `suggest`
- bật `require_hitl` cho case rõ ràng

Chưa bật block tự động.

### Phase 3 — Cứng hóa
- thống kê false positive
- thống kê số lần tránh lặp lỗi
- tinh chỉnh policy
- bật `block` cho safety/security

### Phase 4 — Mở rộng có chọn lọc

Chỉ làm khi Phase 3 chứng minh có giá trị.

Có thể xem xét:
- chia sẻ consequence giữa specialist agents
- promote lesson thành template/constraint
- analytics

Không mở rộng sang "team social memory" nếu chưa có nhu cầu thực tế.

---

## 12. Nguyên tắc khi có đề xuất memory mới

Hỏi 4 câu:

1. Có giúp tránh lặp hậu quả xấu hoặc tái sử dụng hành động tốt không?
2. Có bám evidence / plan / gate không?
3. Có làm tăng phụ thuộc vào sản phẩm hoặc ý tưởng bên ngoài không?
4. Có giải thích và audit được không?

Nếu câu 1 hoặc 2 yếu → **không làm**, dù xu hướng bên ngoài đang phổ biến.

---

## 13. Thành công được đo bằng gì?

Không phải "nhớ nhiều hơn". Đo bằng:

- **Giảm lặp fail pattern** — không thử lại cùng một đường đã chết
- **Tăng số lần tránh lỗi** — runtime bị chặn hoặc yêu cầu HITL đúng lúc
- **100% quyết định truy vết được** — Block/HITL đều có `evidenceRef` rõ ràng

---

## 14. Tóm tắt cho người mới (30 giây)

Coral đã có plan, tool, checkpoint, event và memory.

Vấn đề còn lại không phải là "nhớ thêm", mà là **không lặp lại hậu quả xấu dù đã có evidence**.

Consequence Memory là lớp ghi `context → action → outcome → lesson`, neo vào evidence, và có thể **gợi ý, yêu cầu HITL hoặc chặn** ở runtime.

Triển khai theo hướng **ghi trước, đọc mềm sau, cứng hóa dần**, tận dụng hạ tầng hiện có và giữ kiến trúc đơn giản, audit được, độc lập với các xu hướng memory bên ngoài.

---

## 15. Implementation Status — Phase 1 shipped (write path only)

**Date:** 2026-08-06

### Đã ship (Phase 0 + Phase 1)

| Deliverable | File | Ghi chú |
|---|---|---|
| Schema `ConsequenceRecord` + enum | `src/core/memory/consequence-types.ts` | zod validate; `outcome`, `reusePolicy` là enum (ADR-000 nguyên tắc 2) |
| Single-writer store | `src/core/memory/consequence-store.ts` | SQLite `data/consequences.db`, bảng `consequences`; `append` là write path DUY NHẤT |
| Redaction | `src/core/memory/consequence-redact.ts` | strip token/apiKey/password/Authorization; argsDigest chỉ giữ key names |
| Write path — tool fail | `src/core/memory/consequence-write-path.ts` | đăng ký `globalHooks.on('tool:result')` — áp cho parent + subagent (một lần) |
| Write path — plan terminal | `recordPlanTerminal()` | gọi từ `update-plan-tool.ts` (failed/aborted) + `engine.ts` (security abort) |
| Write path — gate reject | `recordGateReject()` | gọi từ `agent.ts` khi guard chặn tool (`TOOL_BLOCKED` / `TOOL_BLOCKED_BY_POLICY`) |
| Tests | `tests/consequence-store.test.ts` + `tests/consequence-write-path.test.ts` | 18 tests pass; full suite 1049 pass |

### Quyết định Phase 1

- `reusePolicy` mặc định `record_only`. Fail lặp cùng tool (≥2 lần trong session) → nhãn `suggest` (CHƯA enforce). Gate reject → nhãn `require_hitl` (CHƯA enforce). **Không block runtime trong Phase 1.**
- `lesson` = error message rút gọn (optional). **Không bao giờ là điều kiện an ninh** (ADR-000 nguyên tắc 5) — chỉ `evidenceRef` (tool call thật) mới là nền tảng quyết định.
- EvidenceRef tối thiểu: `cycle` (từ tool:result) hoặc `checkpointId` (taskId/planId). Không có anchor → không ghi.
- Không ghi success tầm thường (tránh spam). Whitelist success có giá trị vận hành: chưa làm (Phase 4).

### Tuân thủ ADR-000

1. **Một state, một nguồn sự thật** — `ConsequenceStore` là module duy nhất ghi/đọc bảng `consequences`. Không expose writer path thứ hai.
2. **Không boolean set-once** — `reusePolicy` là enum `suggest/require_hitl/block/record_only`.
3. **State per-request** — record có `sessionId`/`taskId` nhưng là persisted store, không sống trên singleton sai vòng đời.
4. **Model không tự tạo transition** — policy do code (guard) quyết định, không phải LLM.
5. **Không tin text model làm bằng chứng** — `lesson` chỉ mô tả, không kích hoạt block.

### Chưa làm (Phase 3+) — intentionally NOT in this PR

- Enforce `block` rộng (chỉ allowlist cực hẹp + threshold cao, document riêng — Phase 3)
- Aggregation cross-session (`occurrenceCount` cập nhật tự động) — lookup hiện dùng `listByTool` + failCount trong session/window
- Whitelist success đáng tái sử dụng
- GET /api/consequences endpoint (dashboard) — chưa có pattern API memory; thêm khi có dashboard hook
- Mở rộng GuardResult 3 trạng thái (allow/ask/deny) — Phase 2 dùng Option B (giữ boolean privilege, tách nhánh consequence HITL)

---

## 16. Implementation Status — Phase 2 shipped (read path + HITL)

**Date:** 2026-08-06

### Đã ship (Phase 2)

| Deliverable | File | Ghi chú |
|---|---|---|
| Lookup read API | `consequence-store.ts` → `findRelevantForToolCall()` + `resolveMaxPolicy()` | match theo toolName; ưu tiên cùng session, fallback cross-session; fail-open khi DB lỗi |
| Decision resolver | `consequence-read-path.ts` → `resolveDecision()` | block > require_hitl > suggest > record_only |
| Read path guard | `consequence-read-path.ts` → `registerConsequenceReadPath()` | guard `globalHooks.before('tool:call')` — áp parent + subagent (một lần) |
| HITL singleton | `security/hitl-manager.ts` → `getHITLManager()` | start-telegram + tool path dùng CÙNG instance (tránh "new song song không bridge") |
| Wire | `engine.ts` init (registerConsequenceReadPath), `start-telegram.ts` (dùng singleton) | |
| Tests | `tests/consequence-read-path.test.ts` | 14 tests pass; full suite 1063 pass |

### Decision table (runtime) — Phase 2

| Điều kiện | Hành động |
|---|---|
| Không có record liên quan | Cho qua (allowed) |
| `record_only` | Cho qua (log debug) |
| `suggest` hoặc fail pattern nhẹ | Hint ngắn (log structured) — **không block** |
| `require_hitl` HOẶC fail ≥ 2 lần cùng tool | **HITL** `checkAndRequest` trước execute |
| `block` | Mặc định KHÔNG enforce (fallback require_hitl/allow); chỉ enforce khi `enforceBlock=true` (Phase 3) |

### Threshold constants (explicit trong code)

```ts
// consequence-read-path.ts
const HITL_FAIL_THRESHOLD_SAME_TOOL = 2; // fail cùng tool trong session/window
const LOOKUP_LIMIT = 20;
```

### Quyết định Phase 2 (đã chốt trong code)

- **Chọn Option B** cho guard: giữ `GuardResult {allowed: boolean}` (privilege), tách nhánh consequence HITL riêng trên `tool:call` guard — **không refactor GuardResult** (tránh đụng quá nhiều call site).
- **HITL thật trên tool path**: `checkAndRequest` được gọi từ guard `tool:call` với `type: 'tool_call'`, args redact, reason structured (`consequence_require_hitl` + evidenceIds). Deny/expire → guard trả `{allowed: false}` → agent inject `TOOL_BLOCKED` (reuse đường có sẵn).
- **Fail-open**: lookup/HITL lỗi → `{allowed: true}` (không làm chết request) cho nhánh suggest/allow. HITL deny mới fail-closed (theo policy, không phải lỗi hệ thống).
- **Không double HITL**: singleton HITLManager chia sẻ giữa bridge Telegram + tool path.
- **Không dùng `lesson` làm điều kiện**: decision dựa `outcome + failCount + reusePolicy + evidenceRef` — test "lesson thay đổi không đổi quyết định" đã verify.

### Tuân thủ ADR-000 (Phase 2)

1. **Single-writer nguyên vẹn** — read path chỉ ĐỌC store, không mở path ghi thứ hai.
2. **reusePolicy enum** — không boolean set-once.
3. **Quyết định dựa outcome + evidenceRef + count + policy lưu**, không dựa lesson.
4. **Model không tự ban hành policy** — guard code quyết định.
5. **Fail-open cho suggest; fail-closed chỉ khi HITL deny** (policy yêu cầu, đã document).

### Nợ kỹ thuật / rủi ro còn lại (Phase 2)

- HITL reason dùng `evidenceIds` (id record) — chưa link tới event/checkpoint chi tiết (eventIds rỗng trong hầu hết record Phase 1). Cải thiện khi Phase 3 wire eventIds.
- Lookup failCount đếm trong session trước, cross-session fallback — cross-session aggregation thật cần index + counter (Phase 3).
- Suggest hiện chỉ log structured hint, chưa inject vào prompt/context — inject thật là Phase 3 (cần side-channel đã tồn tại, không invent bus mới).
- `block` enforce mặc định tắt — cần allowlist tool cực nguy hiểm + threshold cao + evidence (Phase 3, document riêng).

### Nợ kỹ thuật / rủi ro còn lại

- `ConsequenceStore` mở DB riêng (`data/consequences.db`), không dùng chung `coral.db` — tránh coupling với CoralStorage schema, nhưng tạo DB file thứ hai. Nếu muốn unified, migrate sang `coral.db` (Phase 4).
- Fail lặp detection hiện dựa `listByTool` trong session — O(n) nhỏ, đủ Phase 1. Cross-session aggregation cần index + counter (Phase 3).
- Tool result bị cắt ngắn 500 ký tự ở event layer — `lesson` chỉ là error message ngắn, không phải full result (chủ đích, tránh lưu PII).

---

## 17. Implementation Status — Phase 3 shipped (cross-session + narrow block)

**Date:** 2026-08-06

### Đã ship (Phase 3)

| Deliverable | File | Ghi chú |
|---|---|---|
| Cross-session window aggregation | `consequence-store.ts` → `findRelevantForToolCall()` | đếm `failCountWindow` trong `windowMs` (mặc định 7 ngày); `failCountSession` riêng; match thêm `argsDigest` |
| Decision table Phase 3 | `consequence-read-path.ts` → `resolveDecision()` | HITL từ window signal; narrow block chỉ khi allowlist + ngưỡng + evidence |
| Narrow block allowlist | `consequence-read-path.ts` → `BLOCK_ALLOWLIST` | **MẶC ĐỊNH RỖNG** `[]` — an toàn |
| Reason codes | `consequence_require_hitl_session` / `_window` / `consequence_block_allowlist` | structured, không dùng lesson |
| Tests | `tests/consequence-phase3.test.ts` (10) + cập nhật `consequence-read-path.test.ts` | full suite 1077 pass |

### Cách aggregate (đã chốt)

**Read-time aggregation** từ DB trong window (không write-time counter):
- Đơn giản, đúng, **không phá single-writer** (không thêm path ghi counter).
- Tradeoff: O(records trong window) mỗi lookup — chấp nhận được nhờ index `(tool_name, created_at)`.
- Không cần update `occurrenceCount`/`lastSeenAt` lúc write (field vẫn tồn tại trong schema, dùng cho Phase 4 nếu cần).

### Threshold constants (explicit trong code)

```ts
// consequence-read-path.ts
const HITL_FAIL_THRESHOLD_SESSION = 2;   // fail cùng tool trong session → HITL
const HITL_FAIL_THRESHOLD_WINDOW = 3;    // fail cùng tool trong 7 ngày → HITL
const BLOCK_FAIL_THRESHOLD_WINDOW = 5;   // fail trong window → block (chỉ khi allowlist)
const AGGREGATION_WINDOW_MS = 7 * 24 * 3600 * 1000; // 7 ngày
const BLOCK_ALLOWLIST: string[] = [];    // MẶC ĐỊNH RỖNG
```

### Decision table Phase 3 (runtime)

| Điều kiện | Hành động |
|---|---|
| miss / `record_only` | allow |
| `suggest` hoặc fail nhẹ | suggest (log hint, không block) |
| `require_hitl` HOẶC failSession ≥ 2 HOẶC failWindow ≥ 3 | **HITL** |
| `block` + tool ∈ allowlist + failWindow ≥ 5 + evidence | **deny** (`allowed:false`) + reason `consequence_block_allowlist` |
| `block` ngoài allowlist | **KHÔNG block** — fallback HITL/allow, log |

### Tuân thủ ADR-000 (Phase 3)

1. **Single-writer nguyên vẹn** — aggregation read-time, không mở path ghi thứ hai.
2. **reusePolicy enum** — không boolean set-once.
3. **Quyết định dựa outcome + failCountSession/Window + reusePolicy + evidenceRef**, không dựa lesson.
4. **Model không tự ban hành policy** — guard code quyết định.
5. **Fail-open suggest/lookup error** giữ nguyên; block chỉ khi điều kiện rõ + allowlist.

### Non-goals Phase 3 (cố ý chưa làm)

- Inject suggest hint vào system prompt / LLM context (Phase 3b)
- GET `/api/consequences` + dashboard tab
- Semantic/embedding similarity
- Bật `block` mặc định cho mọi tool
- Refactor lớn `memory/*` cũ

### Nợ kỹ thuật / rủi ro còn lại (Phase 3)

- `BLOCK_ALLOWLIST` rỗng mặc định — chưa có tool nào được hard-deny. Cần thêm tool cực nguy hiểm (deploy/shell destructive) khi có nhu cầu thật + evidence.
- `argsDigest` match phụ thuộc digest ổn định từ `buildArgsDigest` (chỉ key names) — có thể miss nếu args shape thay đổi.
- Read-time aggregation O(records trong window) — nếu DB lớn cần index thêm hoặc chuyển write-time counter (Phase 4).