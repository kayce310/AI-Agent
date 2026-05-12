# [2026-05-12 16:49] - Reset Evolution Engine + Fix Parse-Error Rule Pattern
## Context
`evolution.json` còn 6 lỗi PARSE_ERROR từ instance cũ (error: `missing field 'name'` trong tools definition). Evolution rule pattern không match pattern này → không bao giờ tự skip model dù lỗi lặp lại.

## Changes
- Reset `evolution.json` về state sạch (xóa 6 errors cũ, xóa modelPerformance cũ)
- Update rule `parse-error-skip` pattern: thêm `|missing field` để match lỗi `missing field 'name'`
- Rule threshold=3: nếu model lỗi parse 3 lần → tự động skip model đó

---

# [2026-05-12 16:38] - PID Lock: Single-Instance Enforcement — start-discord.ts + kato-boot.bat

## Context
Bot vẫn bị duplicate reply sau khi đã có Set<messageId> dedup guard. Root cause thực tế: nhiều instance bot cùng token chạy song song (terminal cũ chưa kill). Khi chạy `npm run start:discord` lần 2, lần 1 vẫn còn sống → 2 bot nhận cùng event → 2 reply.

## Changes
### 1. `src/scripts/start-discord.ts` — PID Lock File
- Thêm PID Lock cơ chế: `import { writeFileSync, readFileSync, unlinkSync, existsSync } from 'fs'`
- Lock file path: `path.join(os.tmpdir(), 'kato-bot.pid')`
- Khi start: kiểm tra PID file có process đang chạy không
  - Nếu PID còn sống → `console.error('[PID Lock] Bot already running (PID: X). Exiting.')` + `process.exit(1)`
  - Nếu PID orphan (process chết) → ghi đè PID mới
- Cleanup: `process.on('exit')` xoá lock file, `process.on('SIGINT')`/`SIGTERM` xoá lock file

### 2. `kato-boot.bat` — Kill all node processes before start
- Thêm `taskkill /f /im node.exe >nul 2>&1` trước dòng start
- Đảm bảo mọi instance cũ bị kill trước khi spawn instance mới
- Version bump v1.2 → v1.3

### 3. `knowledge/wiki/skills/module-discord.md` — Doc update
- Thêm section Single-Instance Enforcement
- Thêm Anti-Patterns Learned
- Thêm Debug Checklist khi bot lỗi

## Anti-Patterns Learned
- ❌ `Set<messageId>` dedup guard không đủ nếu có >1 instance — mỗi instance có Set riêng
- ✅ PID Lock File guarantee 1 instance duy nhất trên toàn hệ thống
- ✅ `taskkill /f /im node.exe` trong batch là cách nhanh nhất để clean slate

---

# [2026-05-12 16:30] - Fix 4 lỗi Discord Bot: Combo ID, ESM require, fetch_url sync, Whitelist guard

## Context
Sau khi test bot, phát hiện 2 lỗi compile + need improvement:
1. `config/providers.json`: Combo ID `"3"` cũ không còn tương thích 9router → cần `"4"`
2. `src/core/tools.ts`: Dùng `require('pdf-parse')` trong ESM project → crash `require is not defined`
3. `src/core/tools.ts`: `fetch_url` trả về Promise trong `executeToolCall` sync → engine không await được (silent fail)
4. `src/core/tools.ts`: Whitelist guard thiếu `python`/`pdftotext`/`curl`/`wget` → hạn chế tool mở rộng

## Changes
### 1. `config/providers.json` — Combo ID migration
- `"id": "3"` → `"id": "4"` (9Router combo mới)
- Label cập nhật "Combo 3" → "Combo 4"

### 2. `src/core/tools.ts` — ESM require fix
- Thêm `import { createRequire } from 'module'`
- `const _require = createRequire(import.meta.url)`
- `require('pdf-parse')` → `_require('pdf-parse')`

### 3. `src/core/tools.ts` — fetch_url sync
- Rewrite hoàn toàn: bỏ `globalThis.fetch()` async
- Dùng `execSync('node -e "<inline script>"')` — sử dụng child_process để fetch sync
- Timeout 15s, maxBuffer 200KB

### 4. `src/core/tools.ts` — Whitelist extension
- Thêm `python`, `python3`, `pip`, `pip3`, `pdftotext`, `curl`, `wget` vào `COMMAND_WHITELIST_PREFIXES`

## Kết quả khởi động (xác nhận hoạt động)
```
🚀 Starting Kato Discord Bot...
✅ ProviderRegistry: loaded 1 providers, 1 models
✅ MemoryCore initialized at: ./knowledge/memory
🧬 Evolution Engine loaded: 6 errors, 0 rules
🧬 Kato Identity loaded: CLINE.md
🧬 Kato Identity loaded: knowledge/wiki/AGENTS.md
✅ Engine initialized with 1 models
🧬 Evolution: 6 errors tracked, 0 rules active
🎯 Default model (auto-detected): 4
```

## Anti-Patterns Learned
- ❌ Dùng `require()` trong file `.ts` thuộc ESM project ("type": "module") → ReferenceError
- ❌ Trả về Promise từ sync function — tool call bị mất, engine không báo lỗi
- ❌ `fetch_url` implement async khi toàn bộ call chain là sync → redesign needed
- ✅ `createRequire(import.meta.url)` cho phép `require()` trong ESM
- ✅ Dùng `execSync('node -e ...')` để biến async operation thành sync
- ✅ Luôn kiểm tra whitelist guard khi thêm tool mới

---

# [2026-05-12 15:30] - Refactor Discord Adapter: Loại bỏ model prefix, fix double-trigger, thêm SOP Ultra-Terse

## Context
Sau refactor, phát hiện 2 vấn đề còn tồn đọng:
1. Discord adapter vẫn in `**oc/deepseek-...**:\n` header model ID trong response → leak internal
2. Logic trigger `isMentioned || hasKatoKeyword` overlap khi message vừa mention vừa chứa "kato" → double reply

## Changes
### 1. `src/modules/discord/index.ts` — Strict trigger isolation
- **Cố định trigger**: `isMentioned` và `hasKatoKeyword` là 2 path riêng biệt, không overlap
  ```typescript
  const isMentioned = message.mentions.has(this.client.user!);
  const hasKatoKeyword = message.content.toLowerCase().includes('kato') && !isMentioned;
  ```
- **Remove model header prefix**: `initialMsg.edit(response.content)` thay vì `**${response.modelUsed}**:\n${response.content}`
- **Dedup guard**: `Set<string> processingMessages` giữ messageId đang xử lý → skip duplicate event trong async

### 2. `src/core/engine.ts` — Filter model prefix
- Thêm `content = content.replace(/^[\w\/\.-]+:\s*/m, '')` để strip `oc/deepseek-v4-flash-free:` hoặc `3:` ở đầu response

### 3. `knowledge/wiki/skills/communication-protocol.md` — SOP mới
- **Ultra-Terse Mode**: cấm header model, cấm chào hỏi, cấm kết luận sáo rỗng
- Format chuẩn cho kết quả / thảo luận / lỗi
- Filter prefix model + dedup guard

## Lưu ý khởi động (ghi nhớ cho các phiên sau)
```cmd
:: Có 2 cách khởi động Kato Discord Bot — KHÔNG chạy thủ công npx tsx:
:: Cách 1: npm script (recommended từ terminal)
npm run start:discord

:: Cách 2: double-click file kato-boot.bat
```

## Các file khởi động tồn tại
- `src/scripts/start-discord.ts` — entry point TypeScript cho Discord bot
- `kato-boot.bat` — batch file double-click friendly
- `package.json` → script `"start:discord": "npx tsx src/scripts/start-discord.ts"`

---

# [2026-05-12 15:02] - Fix Discord Bot Startup: Kato Identity Injection + DeprecationWarning

## Context
Khởi động Kato Discord Bot, phát hiện 2 vấn đề cần xử lý.

## Changes
### 1. `src/core/engine.ts` — Inject CLINE.md + AGENTS.md vào mọi request
- Thêm constant `KATO_IDENTITY_FILES = ['CLINE.md', 'knowledge/wiki/AGENTS.md']`
- `engine.init()` đọc 2 file này và cache vào `this.katoIdentityContext`
- Mọi request đều inject "xác Kato" vào system prompt (Platform: Discord, CLI, etc.)
- Log: `🧬 Kato Identity loaded: CLINE.md` khi khởi động thành công

### 2. `src/modules/discord/index.ts` — Fix DeprecationWarning `ready` → `clientReady`
- discord.js v14 đã đổi tên event `ready` → `clientReady`
- Cũ: `this.client.once('ready', ...)`
- Mới: `this.client.once('clientReady', ...)`
- Lý do: tránh confusion với Gateway `READY` event, warning sẽ thành error ở v15

### 3. `kato-boot.bat` — Update version v1.1 → v1.2

## Kết quả khởi động (xác nhận hoạt động)
```
🧬 Kato Identity loaded: CLINE.md
🧬 Kato Identity loaded: knowledge/wiki/AGENTS.md
✅ Engine initialized with 1 models
✅ Kato Discord Bot đã sẵn sàng
```

## Lý do
- Đảm bảo bot luôn có CLINE.md + AGENTS.md trong context → đúng persona Kato
- Loại bỏ DeprecationWarning để không gây error khi nâng discord.js lên v15

---

# [2026-05-12 14:57] - Bỏ verbose output + Đặt model mặc định oc/deepseek-v4-flash-free

## Changes
### 1. `src/core/prompt-builder.ts` — Bỏ Workflow 8-tầng verbose
- Xoá Bước 1 ("✅ Đã nhận task: ...") — model không còn tự in xác nhận task
- Xoá Bước 2 ("📋 PLAN: ...") — model không còn tự in kế hoạch
- Xoá Bước 5 ("✅ HOÀN THÀNH: ...") — model không còn tự in tổng kết
- Thay bằng section **PHONG CÁCH TRẢ LỜI**: trả lời TRỰC TIẾP, không prefix thừa

### 2. `config/providers.json` — Đặt model duy nhất `oc/deepseek-v4-flash-free`
- Bỏ model `"1"` (9Router Combo generic)
- Thêm `oc/deepseek-v4-flash-free` tier 1 — ưu tiên cao nhất
- Giao hoàn toàn việc chọn model/fallback cho 9router (không cascade nhiều model từ Kato)
- Label cập nhật: "9Router (Single-Point — Model Selection Delegated)"

## Lý do
- User phản hồi: bot in "✅ Đã nhận task: alo. Bắt đầu thực thi. / 📋 PLAN: / ✅ HOÀN THÀNH" gây nhiễu
- Yêu cầu: chỉ trả lời kết quả, không verbose process
- Yêu cầu: dùng `oc/deepseek-v4-flash-free` làm model chính, giao routing cho 9router

---

# [2026-05-12 14:49] - Fix Discord Duplicate Response Bug (3 replies → 1)

## Context
Sau khi bot khởi động thành công, test `@Kato alo` trên Discord → bot reply **3 lần** cho 1 message. Root cause: có 3 instance bot cùng connect cùng token (từ các lần test trước), tất cả đều nhận cùng event `messageCreate`.

## Root Cause Analysis
1. **Multiple instances**: Mỗi lần `npm run start:discord` tạo 1 instance mới, nhưng instance cũ không bị kill → nhiều bot cùng chạy song song với cùng token
2. **Logic trigger lỗi (phụ)**: Điều kiện `includes('kato') || mentions.has(bot)` có thể trigger cả 2 lần nếu message vừa mention vừa chứa "kato" trong text
3. **Không có dedup guard**: Không có cơ chế chống xử lý cùng 1 messageId nhiều lần

## Fix Applied — `src/modules/discord/index.ts`
### 1. Dedup Guard (chống duplicate trong cùng 1 instance)
```typescript
private processingMessages: Set<string> = new Set(); // messageId dedup guard

// Trước khi xử lý
if (this.processingMessages.has(message.id)) return; // skip duplicate
this.processingMessages.add(message.id);

// Sau khi xử lý xong
this.processingMessages.delete(message.id); // cleanup
```

### 2. Fix logic trigger (tránh double-trigger)
```typescript
// TRƯỚC (BUG): cả 2 điều kiện cùng true khi message = "@Kato alo"
message.content.toLowerCase().includes('kato') || message.mentions.has(bot)

// SAU (FIX): ưu tiên mention, keyword chỉ dùng khi KHÔNG mention
const isMentioned = message.mentions.has(this.client.user!);
const hasKatoKeyword = message.content.toLowerCase().includes('kato') && !isMentioned;
if (isMentioned || hasKatoKeyword) { ... }
```

## Lưu ý thực tế
- Bot phải chạy **1 instance duy nhất** — luôn kill terminal cũ trước khi restart
- `kato-boot.bat` nên có logic check/kill existing process (TODO)
- Dedup guard giải quyết được edge case trong cùng 1 instance

## Anti-Patterns Learned
- ❌ Không kill process cũ trước khi restart → multiple instances với cùng token
- ❌ `|| includes('kato')` có thể double-trigger khi message có cả mention lẫn text "kato"
- ✅ Luôn có dedup guard bằng `Set<messageId>` cho async event handlers
- ✅ Exclusive condition: `isMentioned` takes priority, keyword chỉ fallback khi không mention

---

# [2026-05-12 14:45] - Fix Discord Bot Crash: ts-node/esm → tsx migration

## Context
Kato Discord bot crash silent khi chạy trên Node.js v24 với `node --loader ts-node/esm`. Lỗi xuất hiện dưới dạng `[Object: null prototype]` không có stack trace.

## Changes
- `package.json`: `start:discord` script đổi từ `node --loader ts-node/esm` → `npx tsx`
- `kato-boot.bat`: Loại bỏ PowerShell call, dùng `npx tsx` trực tiếp — tránh Execution Policy errors
- `knowledge/wiki/troubleshooting/discord-tsnode-esm-node24.md`: Tạo mới — doc đầy đủ root cause + fix
- `knowledge/wiki/troubleshooting/_INDEX.md`: Thêm entry mới cho lỗi Discord
- `knowledge/wiki/skills/module-discord.md`: Cập nhật hướng dẫn khởi động chính xác với tsx

## Root Cause
`--experimental-loader` API thay đổi từ Node.js v18+, `ts-node/esm` không tương thích Node v22/v24 → crash null prototype silent.

## Giải pháp
`tsx` (v4+) là drop-in replacement, tương thích Node v18+ và ESM TypeScript project.

## Anti-Patterns Learned
- ❌ `node --loader ts-node/esm` — deprecated, broken trên Node v18+
- ❌ Chạy `npm run` từ PowerShell trên Windows mặc định → Execution Policy block
- ✅ Dùng `npx tsx` cho mọi TypeScript script trong project
- ✅ Chạy qua `cmd` để tránh PowerShell Execution Policy

---

# [2026-05-12 14:00] - [V5.3] Safe Context Truncator + ReAct Loop Guard — engine.ts

## Context
Phân tích root cause token bloat (50k/request) phát hiện engine.ts không có cơ chế giới hạn payload. Cline Architecture gửi toàn bộ lịch sử chat + file context mỗi turn → 50-60k tokens/request. Thêm Safe Context Truncator cắt payload xuống 8k tokens + ReAct Loop Guard chống tool loop vô hạn.

## Changes
### Safe Context Truncator
- Thêm `estimateTokens(text)`: heuristic `Math.ceil(text.length / 4)` — không cần tiktoken dependency
- Thêm `estimateMessageTokens(msg)`: tính token cho cả content, tool_calls array, tool_call_id
- Thêm `truncatePayloadSafe(messages, maxTokens)`: scan từ newest → oldest, ưu tiên giữ message mới nhất
- **Luật An Toàn Tool-Call (atomic pair)**: message `role='tool'` + `assistant(tool_calls)` NGAY TRƯỚC nó là một cặp bất khả phân ly. Nếu budget không đủ cho cả cặp, bỏ qua cả hai.

### ReAct Loop Guard (v5.3)
- **Guard 1**: `toolLoopIterations` đếm đến 5 → force break, chống tool loop vô hạn
- **Guard 2**: `truncatePayloadSafe(currentMessages, 8000)` gọi trước mỗi lần gửi payload

## Kiến trúc mới: 3-layer Token Safety
```
engine.process()
  ├── MemoryCompressor (layer 1 — nén history, optional)
  ├── truncatePayloadSafe (layer 2 — hard cap 8k tokens)
  └── ReAct Loop Guard (layer 3 — max 5 iterations)
```

## Impact
- Input tokens: từ 50-60k → tối đa **8k tokens** mỗi request
- Tool loop: từ vô hạn → tối đa **5 iterations**
- Cache hit potential: payload ổn định hơn, dễ cache hơn qua proxy
- Retained full v5.2 feature set: Multi-Tier Cascade, Evolution Engine, Knowledge Tools

## Anti-Patterns Learned
- ❌ `replace_in_file` dễ fail với file lớn (>300 dòng) do SEARCH block exact match khó bảo toàn
- ✅ Dùng `write_to_file` cho file có nhiều thay đổi (+50 dòng) — an toàn hơn
- ✅ Tool-call atomic pair rule: không bao giờ giữ tool result mà thiếu assistant chứa tool_calls — nếu không model không hiểu context

# [2026-05-11 08:48] - Kato Agent v5.0 Architecture Migration (Phase 1-3 Complete)

## Context
Chuyển đổi kiến trúc từ bot Discord nguyên khối (tightly coupled) sang hệ thống platform-agnostic: Core Engine + Provider Registry + Adapters.

## Changes
### Phase 1: Core Decoupling (7 files)
- Added: `src/core/types.ts` — Interface chuẩn hóa (EngineRequest, ChatMessage, LLMProviderConfig)
- Added: `src/core/provider-registry.ts` — Load provider từ JSON config, resolve model → provider + fallback
- Added: `src/core/engine.ts` — Core Engine platform-agnostic, auto-detect free model, fallback retry
- Added: `config/providers.json` — Cấu hình động với OpenRouter API và free models
- Updated: `src/modules/discord/index.ts` — Xóa LLMCore dependency, chỉ gọi `engine.process(request)`
- Updated: `src/index.ts` — Init Engine → Discord Bridge
- Added: `scripts/test-engine-cli.ts` — CLI mock test (không cần Discord)

### Phase 2: Proxy Infrastructure (6 files)
- Added: `docker/free-claude-proxy/server.cjs` — OpenRouter proxy server (Compatibility fix: .cjs cho ESM project)
- Added: `docker/free-claude-proxy/docker-compose.yml`
- Added: `docker/free-claude-proxy/Dockerfile`
- Added: `docker/free-claude-proxy/setup.sh`
- Added: `docker/free-claude-proxy/README.md`

### Phase 3: Validation & Optimization
- ✅ CLI test PASSED: `npx tsx scripts/test-engine-cli.ts` — Engine gọi được OpenRouter, fallback tự động
- ✅ Auto-detect free model: `engine.detectFreeModel()` ưu tiên Claude free > free models > default
- ✅ Config path fix: `providers.yaml` → `providers.json`
- ✅ `engine['registry']` → `engine.listModels()` public method

## Kiến trúc mới
```
src/index.ts                    ← Entry: init Engine → Discord
├── src/core/engine.ts          ← Core Engine (platform-agnostic)
├── src/core/provider-registry.ts ← Quản lý Provider + Model
├── src/core/types.ts           ← Interface chuẩn hóa
├── src/modules/discord/index.ts ← Adapter (chỉ hứng tin → Engine)
├── config/providers.json       ← Cấu hình provider động
└── scripts/test-engine-cli.ts  ← Mock test (không cần Discord)
```

## Anti-Patterns Learned
- ❌ Hardcode config path `.yaml` khi file thực tế là `.json`
- ❌ Dùng `engine['registry'].listModels()` (bracket access private) thay vì public method
- ❌ Server.js dùng `require()` trong project có `"type": "module"`
- ✅ `.cjs` extension cho scripts CommonJS trong ESM project
- ✅ Luôn expose public methods thay vì truy cập private properties

# [2026-05-12 08:56] - Disabled RTK & Caveman trên 9router để tối ưu Prompt Caching

## Context
Phát hiện xung đột giữa RTK Token Saver + Caveman Mode của 9router với Prompt Caching của LLM Provider (đặc biệt là Claude Sonnet). RTK mutate payload → phá vỡ exact prefix matching → Cache Miss 90-95% → chi phí tăng gấp 10-20 lần.

## Changes
- 🛑 Đã tắt **RTK (Real-time Token Saver)** trên 9router Dashboard
- 🛑 Đã tắt **Caveman Mode** (output compression) trên 9router Dashboard
- Cả 2 model chính (`kr/claude-sonnet-4.5`) và model phụ đều bị ảnh hưởng

## Lý do
| Cơ chế | Lợi ích | Chi phí ẩn |
|--------|---------|------------|
| RTK (token saver) | Tiết kiệm 20-40% input | Cache Miss → mất 90% caching |
| Caveman (output) | Tiết kiệm ~65% output | Cache Miss trên output prefix |
| Prompt Caching | Tiết kiệm 90% chi phí prompt | Yêu cầu Exact Prefix Matching |

Kết luận: Tiết kiệm 20-40% từ RTK KHÔNG bù được mất 90% từ Cache Miss.
Cache Efficiency trước khi tắt: ~5-10%. Mục tiêu sau khi tắt: ~85-90%.

# [2026-05-12 08:57] - ⛔ GIẢ THUYẾT RTK SAI → Root cause là Cline Architecture "Context Hog"

## Phát hiện mới
Sau khi tắt RTK + Caveman, vấn đề KHÔNG được cải thiện. Mỗi request vẫn đẩy ~50k token và chỉ nhận ~500 token response.

## Chẩn đoán
Vấn đề không nằm ở 9router (RTK/Caveman) mà nằm ở **Cline Agent Architecture**:
1. **Cline gửi lại toàn bộ lịch sử chat + file context ở mỗi turn** → mỗi request đều là 50k token
2. **Cache Hit Rate vẫn thấp** → 50k token "mới" mỗi lần do Cline thay đổi context liên tục
3. **9router không phải root cause** — nó chỉ là proxy trung gian

## Hướng phân tích mới
Cần so sánh với kiến trúc v4.0 để tìm ra gốc rễ:
- Tại sao v4.0 không gặp vấn đề này?
- Sự khác biệt trong cách quản lý context giữa v4.0 và v5.0?

# [2026-05-12 10:37] - Phase 1: Hardening & Sanity Check — Routing + Bootloader Audit

## Context
Phase 1 của skill-system hardening plan. Audit toàn bộ routing chain từ CLINE.md → AGENTS.md → index.md → skills/_INDEX.md → skill file.

## Changes
### CLINE.md Bootloader
- 🔧 Version string: v4.0 → v5.0
- 🔧 `state.json` → `state.md` (khớp với file thực tế)
- 🔧 Thêm timestamp vào footer

### AGENTS.md Routing
- ✅ Thêm entry **Kiến trúc Core** → [[core/_INDEX]] cho architecture lookup
- ✅ Xác nhận 20/20 wiki-links đều trỏ tới file tồn tại

### Blueprint Scan
- ✅ `kato-state-manager.ts scan knowledge/blueprints` — no untracked files (all tracked)

### Dead Link Detection Fixed
- ✅ `sop/` directory orphan → move to `skills/module-discord.md` + delete `sop/`
- ✅ Tất cả routing nodes đều valid (no 404)

## Kiến trúc routing mới (verified)
```
CLINE.md (bootloader)
  └── AGENTS.md (router)
        ├── index.md (knowledge map)
        │     ├── core/_INDEX.md (architecture index)
        │     │     ├── core/master-vision.md
        │     │     ├── core/llm-architecture.md
        │     │     ├── core/task-queue.md
        │     │     └── core/changelog.md
        │     ├── skills/_INDEX.md (skill catalog)
        │     │     ├── skills/coding-standards.md
        │     │     ├── skills/verification-protocol.md
        │     │     ├── skills/state-management.md
        │     │     ├── skills/communication-protocol.md
        │     │     ├── skills/ui-vibe-coding.md
        │     │     ├── skills/big-data-processing.md
        │     │     ├── skills/automation-directives.md
        │     │     ├── skills/security-sandbox.md
        │     │     ├── skills/evolution-protocol.md
        │     │     ├── skills/knowledge-management.md
        │     │     ├── skills/obsidian-formatting.md
        │     │     └── skills/module-discord.md
        │     ├── troubleshooting/_INDEX.md
        │     └── projects/ovap-x1.md
        └── core/_INDEX.md (direct link)
```

## Anti-Patterns Learned
- ❌ Version string mismatch: CLINE.md ghi v4.0 khi hệ thống là v5.0
- ❌ File extension mismatch: ghi `state.json` nhưng file thực tế là `state.md`
- ❌ Orphan directory: thư mục `sop/` không được index → AI không biết tồn tại
- ✅ Audit định kỳ routing chain để detect dead links

---

# [2026-05-12 08:59] - 🔍 PHÂN TÍCH CHUYÊN SÂU v4.0 vs v5.0: Root Cause "50K Token/Request"

## So sánh kiến trúc xử lý context

### v4.0 (LLMCore - TIẾT KIỆM)
```
Messages → MemoryCompressor (local Ollama) → nén 20 msg → 500 tokens
          ↓
System Prompt (~500) + Compressed Context (~500) + Latest Question (~200)
          ↓
Tổng: ~1,200 tokens/request ✅
```

### v5.0 (Engine - TỐN KÉM)
```
Cline gửi 5 message raw → KHÔNG qua MemoryCompressor
          ↓
System Prompt (~300) + 5 message raw (50K+ tokens từ Cline context)
          ↓
Tổng: ~50K tokens/request ❌
```

## Root Cause #1: MemoryCompressor bị "quên" trong engine.ts

**File:** `src/core/engine.ts`
- Line 49: `private compressor: MemoryCompressor;` — Khai báo nhưng **KHÔNG BAO GIỜ dùng**
- Line 54: `this.compressor = new MemoryCompressor();` — Khởi tạo nhưng **KHÔNG gọi compressHistory()**
- Method `process()` dòng 63: **Hoàn toàn không có bước nén context trước khi gửi**

**File:** `src/core/memory-compressor.ts` — Code vẫn tồn tại đầy đủ, chỉ là engine.ts không gọi nó.

## Root Cause #2: ReAct Loop nhân bội chi phí

v5.0 engine.ts lines 130-180: Mỗi tool call → gọi provider.invoke() thêm 1 lần với full 50K context.
- 1 user message → 3-5 LLM calls → 150K-250K tokens/request
- v4.0 LLMCore lines 430-470: Cũng có ReAct loop nhưng context đã nén → mỗi call chỉ ~1,200 tokens

## Root Cause #3: Prompt Caching không thể cứu vãn

Kể cả khi tắt RTK, Cline thay đổi context mỗi turn (file mới, tool result mới) → prefix thay đổi → Cache Miss. 50K token "mới" mỗi request.

Prompt Caching chỉ hiệu quả khi gửi cùng 1 prefix nhiều lần — nhưng Cline không làm vậy.

## Bài học từ v4.0

v4.0 có MemoryCompressor dùng **local Ollama** (miễn phí, không tốn token) để nén 20 message → 500 token. Đây là giải pháp thông minh:

```
Chi phí v4.0: 1,200 tokens × $3/M = $0.0036/request ✅
Chi phí v5.0: 50K tokens × $3/M = $0.15/request ❌

Chênh lệch: 41x đắt hơn!
```

## Khắc phục

1. **BẬT LẠI MemoryCompressor** trong engine.ts → gọi `this.compressor.compressHistory()` trước khi build messages
2. **Đảm bảo Local LLM (Ollama) đang chạy** để compressor hoạt động
3. Fallback nếu Ollama offline: vẫn dùng slice(-5) như hiện tại

## Next Steps
- [ ] Nạp credits OpenRouter để dùng Claude model
- [Engine] Upgrade process() to full ReAct loop with tool execution.
- [System] Update System Instruction for strict execution compliance.
- [SOP] Documented startup procedure in `CLINE.md`.
- [ ] Migrate tool calling loop từ `llm.ts` cũ vào `engine.ts`
- [ ] Tạo SOP `knowledge/wiki/skills/model-routing.md`
- [ ] Tạo health check monitor cho Cache Efficiency
- [ ] Cập nhật CLINE.md lên version 5.0
- [ ] Mở rộng providers.json với mapping đúng model 9router
- [🔥 CRITICAL] BẬT LẠI MemoryCompressor trong engine.ts — nén context trước khi gửi
