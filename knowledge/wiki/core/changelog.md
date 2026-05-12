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
