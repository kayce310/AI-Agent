# HỆ THỐNG QUẢN LÝ HÀNG ĐỢI TASK (Task Queue Management System)

## YÊU CẦU CẦN THIẾT

### 1. Đặc điểm Hàng đợi
- ✅ FIFO (First In First Out)
- ✅ Xử lý tuần tự MỘT task mỗi thời điểm
- ✅ Không chạy song song
- ✅ Tự động chuyển sang task tiếp theo khi hoàn thành
- ✅ Giữ trạng thái lịch sử các task đã xử lý

### 2. Chức năng Điều khiển
- [x] `enqueue(task)` - Thêm task vào cuối hàng đợi
- [x] `start()` - Bắt đầu xử lý hàng đợi
- [x] `pause()` - Tạm dừng xử lý sau khi task hiện tại kết thúc
- [x] `resume()` - Tiếp tục xử lý từ vị trí đã dừng
- [x] `cancel(taskId)` - Hủy task cụ thể khỏi hàng đợi
- [x] `clear()` - Xóa toàn bộ hàng đợi
- [x] `getStatus()` - Lấy trạng thái hiện tại của hệ thống

### 3. Trạng thái Hệ thống
```
PENDING  - Chờ xử lý
RUNNING  - Đang xử lý
PAUSED   - Đã tạm dừng
COMPLETED - Hoàn thành
FAILED   - Lỗi
CANCELLED - Đã hủy
```

### 4. Yêu cầu bổ sung
- Mỗi task có unique ID tự tạo
- Ghi log thời gian bắt đầu / kết thúc
- Callback events: onTaskStart, onTaskComplete, onTaskFail, onQueueEmpty
- Có thể thêm task trong khi hàng đợi đang chạy
- Không làm block event loop của NodeJS

---

## ✅ KATO BOT v5.0 — HOÀN THÀNH

### Phase 1: Core Decoupling ✅
- `src/core/types.ts` — Interface chuẩn hóa
- `src/core/provider-registry.ts` — Load provider từ JSON config
- `src/core/engine.ts` — Core Engine platform-agnostic
- `config/providers.json` — Cấu hình provider động (OpenRouter)
- `src/modules/discord/index.ts` — Discord Adapter (xóa LLM coupling)
- `src/index.ts` — init Engine → Discord Bridge

### Phase 2: Proxy Infrastructure ✅
- `docker/free-claude-proxy/server.cjs` — OpenRouter proxy
- `docker/free-claude-proxy/docker-compose.yml`, Dockerfile, setup.sh, README

### Phase 3: Validation ✅
- `scripts/test-engine-cli.ts` — CLI test PASSED
- Auto-detect free model trong engine.ts
- Config path fix: .yaml → .json
- engine.listModels() public method
- state.json via kato-state-manager (CLINE.md Rule 4 fix)
- Changelog + state.md updated

---

## 🚀 KATO BOT v5.1 — ĐỀ XUẤT CẢI TIẾN "BĂNG ĐẠN ĐA TẦNG"

### 🎯 Mục tiêu
Tự động chuyển model khi model hiện tại hết token/lỗi, người dùng không thấy lỗi.

### 📋 Implementation Plan

**Bước 1**: Cập nhật config/providers.json — thêm tier và max_tokens
```json
{
  "name": "openrouter_proxy",
  "tier": 1,
  "label": "The Boss",
  "models": [
    {"id": "anthropic/claude-3.5-sonnet", "maxTokens": 4096}
  ]
}
```

**Bước 2**: ProviderRegistry — thêm resolve bằng tier + cooldown tracking
- `getModelsByTier(tier: number)` — lọc theo tier
- `markCooldown(modelId, durationMs)` — đánh dấu kiệt sức
- `isCooldown(modelId)` — kiểm tra

**Bước 3**: Engine — cascadeWithBroadcast() thay fallbackWithRetry()
- `process()` → T1 → lỗi 429/529 → emit event → T2 → lỗi → emit → T3 → OK
- `MaxRetries = 3`

**Bước 4**: Discord Adapter — subscribe event → edit message real-time
- `message.reply("⏳ Đang xử lý...")` ban đầu
- Khi cascade: edit → "⚠️ Model [T1] hết token, chuyển sang [T2]..."
- Khi thành công: edit → response cuối cùng

**Bước 5**: Context truncation
- Engine tự động trim history xuống `maxTokens` của model đích trước khi gửi

### ⏱ Thời gian ước tính: 2 buổi

### 📌 Ghi chú
- Cooldown timer cần persist vào state.json (qua kato-state-manager) để tồn tại qua restart
- Real-time editing có thể bị Discord rate limit (5 req/channel/5s) → dùng debounce