# 🪸 Báo Cáo Toàn Bộ Codebase Coral AI Agent
### Dành cho người không biết code (No-Code Friendly)
### Ngày: 23/06/2026

---

## 📋 MỤC LỤC
1. [Tổng Quan Dự Án](#1-tổng-quan-dự-án)
2. [Kiến Trúc Tổng Thể (6 Tầng)](#2-kiến-trúc-tổng-thể-6-tầng)
3. [Luồng Hoạt Động: Từ Tin Nhắn Đến Trả Lời](#3-luồng-hoạt-động)
4. [Các Module Chính](#4-các-module-chính)
5. [Hệ Thống Models & Providers](#5-hệ-thống-models--providers)
6. [Cron Jobs — Tác Vụ Tự Động](#6-cron-jobs--tác-vụ-tự-động)
7. [Dashboard — Trung Tâm Điều Hành](#7-dashboard--trung-tâm-điều-hành)
8. [Hệ Thống Bảo Mật](#8-hệ-thống-bảo-mật")
9. [Tình Trạng Hiện Tại & Thống Kê](#9-tình-trạng-hiện-tại--thống-kê)
10. [Bảng Thuật Ngữ Dễ Hiểu](#10-bảng-thuật-ngữ-dễ-hiểu)

---

## 1. Tổng Quan Dự Án

### Coral là gì?
**Coral** là một AI Agent chạy trên Telegram — tức là một **trợ lý ảo thông minh** mà bạn có thể nhắn tin trực tiếp trên Telegram để yêu cầu giúp đỡ.

Ví dụ thực tế:
- 🗣️ *"Tìm thông tin về IoT giúp tôi"* → Coral sẽ tra cứu, phân tích, và trả lời
- 🗣️ *"Tóm tắt file PDF này"* → Coral đọc file và tóm tắt
- 🗣️ *"Giải thích kiến trúc 6-layer"* → Coral trả lời dựa trên kiến thức có sẵn

### Coral khác gì so với ChatGPT thông thường?
| ChatGPT | Coral |
|---------|-------|
| Chỉ trả lời câu hỏi | Có thể **thực thi hành động** (đọc file, tìm kiếm, chạy lệnh) |
| Quên cuộc trò chuyện trước | **Nhớ** thông tin qua nhiều phiên (Memory system) |
| Một model duy nhất | **Nhiều model** — tự chuyển khi model này bị lỗi |
| Không tự học | **Tự học** từ trải nghiệm (Self-Evolution) |
| Không có giao diện quan sát | **Dashboard trực quan** với nhiều chế độ xem |

### Quy Mô Dự Án
| Thống Kê | Số Liệu |
|----------|---------|
| 📁 File mã nguồn TypeScript | **95 file** |
| 📝 Dòng code | **~23,326 dòng** |
| 🧪 File kiểm thử (test) | **52 file, 906+ tests** |
| 📚 File tài liệu & skills | **141 file** |
| 🛠️ Công cụ (tools) có sẵn | **9 nhóm tools** |
| 🧠 Dashboard views | **6 chế độ xem** |
| ⏰ Tác vụ tự động | **3 cron jobs** |

---

## 2. Kiến Trúc Tổng Thể (6 Tầng)

Coral được thiết kế theo kiến trúc **6 tầng** (layer), giống như một tòa nhà — tầng dưới hỗ trợ tầng trên, mỗi tầng có chức năng riêng.

```
┌─────────────────────────────────────────┐
│  🏠 Tầng 6: Dashboard / UI              │  ← Bạn nhìn thấy
├─────────────────────────────────────────┤
│  📱 Tầng 5: Platform (Telegram)         │  ← Nơi nhận/gửi tin nhắn
├─────────────────────────────────────────┤
│  🧩 Tầng 4: Modules                     │  ← Bridge nối platform với core
├─────────────────────────────────────────┤
│  🧠 Tầng 3: Core (Bộ não)              │  ← Xử lý chính
├─────────────────────────────────────────┤
│  ⚙️ Tầng 2: Services (Công cụ)         │  ← Memory, Tools, Security...
├─────────────────────────────────────────┤
│  📦 Tầng 1: Infrastructure              │  ← Database, Files, Config
└─────────────────────────────────────────┘
```

### Giải thích từng tầng:

**Tầng 1 — Infrastructure (Nền tảng)**
> 🔧 *Tương tự: Đất và móng của tòa nhà*

Nơi lưu trữ dữ liệu:
- **SQLite Database** (`data/coral.db`) — lưu lịch sử trò chuyện, sự kiện
- **JSON Files** (`data/memories.json`) — lưu trữ bộ nhớ (memories)
- **Config Files** (`config/providers.json`) — cài đặt các model AI

**Tầng 2 — Services (Dịch vụ)**
> 🔧 *Tương tự: Hệ thống điện, nước trong tòa nhà*

Các dịch vụ hỗ trợ:
- **Memory Store** — Hệ thống "bộ não" nhớ thông tin
- **Tool Registry** — Kho công cụ (đọc file, tìm kiếm web, etc.)
- **Security** — Bảo mật, kiểm soát quyền truy cập
- **Event Bus** — Hệ thống thông báo giữa các phần

**Tầng 3 — Core (Bộ não)**
> 🧠 *Tương tự: Trung tâm điều khiển của tòa nhà*

Nơi xử lý chính:
- **Engine** — "Bộ não trung tâm", nhận yêu cầu → xử lý → trả kết quả
- **Agent (ReAct Loop)** — Vòng lặp suy nghĩ: Nghĩ → Hành động → Quan sát → Lặp
- **LLM Adapter** — Nói chuyện với các model AI (GPT, Claude, Llama...)

**Tầng 4 — Modules (Các khối)**
> 🧩 *Tương từng căn hộ trong tòa nhà*

- **Telegram Bridge** — Nối Telegram với bộ não Coral
- **Command System** — Xử lý lệnh `/model`, `/help`, `/status`
- **User Manager** — Quản lý ai được dùng Coral

**Tầng 5 — Platform (Nền tảng)**
> 📱 *Tương tự: Cửa ra vào của tòa nhà*

- **Message Handler** — Xử lý tin nhắn Telegram
- **Session Manager** — Quản lý "phiên" trò chuyện (TTL-based)

**Tầng 6 — Dashboard (Bảng điều khiển)**
> 📊 *Tương tự: Phòng giám sát camera*

- Giao diện web hiển thị hoạt động real-time
- 6 chế độ xem: Mission, Trace, Focus, Memory, Graph, Hologram

---

## 3. Luồng Hoạt Động

### Khi bạn gửi một tin nhắn trên Telegram, Coral xử lý như thế nào?

```
👤 Bạn gửi tin nhắn trên Telegram
        │
        ▼
📱 [1] Telegram Bridge nhận tin nhắn
        │  "Xin chào Coral!"
        │
        ▼
🔄 [2] Gateway chuyển đổi định dạng
        │  Tin nhắn Telegram → Định dạng chung (AdapterMessage)
        │
        ▼
🛡️ [3] Kiểm tra bảo mật
        │  ✓ Bạn có quyền dùng Coral không?
        │  ✓ Bạn gửi quá nhanh không? (Rate limit: 20 tin/phút)
        │  ✓ Tin nhắn trùng lặp không?
        │
        ▼
🧠 [4] Engine nhận yêu cầu
        │  ✓ Kiểm tra cache (câu trả lời đã có sẵn chưa?)
        │  ✓ Gọi bộ nhớ (Memory Recall) — tìm thông tin liên quan
        │  ✓ Gọi "bộ não học" (Self-Evolution) — kinh nghiệm trước đây
        │
        ▼
📝 [5] Xây dựng "giấy hướng dẫn" (System Prompt)
        │  Kết hợp: Danh tính Coral + Bộ nhớ + Kinh nghiệm + Câu hỏi
        │
        ▼
🤖 [6] Agent chạy vòng lặp ReAct
        │  ┌─ Nghĩ: "Câu hỏi này cần làm gì?"
        │  │  → Có cần dùng tool không?
        │  │  → Hay chỉ cần trả lời trực tiếp?
        │  │
        │  ├─ Hành động: Nếu cần tool → gọi tool
        │  │  → web_search("thông tin về IoT")
        │  │  → read_file("document.pdf")
        │  │
        │  ├─ Quan sát: Nhận kết quả từ tool
        │  │  → "Tìm thấy 5 bài viết về IoT"
        │  │
        │  └─ Lặp lại nếu cần (tối đa 10 lần)
        │
        ▼
💬 [7] Gửi kết quả về cho bạn
        │  ✓ Chia tin nhắn dài (Telegram giới hạn 4096 ký tự)
        │  ✓ Lưu vào bộ nhớ (để lần sau nhớ)
        │  ✓ Lưu vào cache (để câu hỏi giống nhanh hơn)
        │
        ▼
📱 Bạn nhận được câu trả lời trên Telegram ✅
```

### Ví dụ cụ thể:

**Bạn gửi:** *"Tìm giúp tôi 3 bài viết về AI Agent và tóm tắt"*

| Bước | Coral làm gì |
|------|-------------|
| 1 | Nhận tin nhắn từ Telegram |
| 2 | Kiểm tra: Bạn có quyền? ✓ Chưa gửi quá nhanh? ✓ |
| 3 | Gọi Memory: "Có thông tin gì liên quan AI Agent không?" |
| 4 | Agent quyết định: "Cần dùng tool web_search" |
| 5 | **Tool web_search** → Tìm 3 bài viết về AI Agent |
| 6 | Agent nhận kết quả, tổng hợp thành tóm tắt |
| 7 | Lưu vào Memory: "User quan tâm đến AI Agent" |
| 8 | Gửi tóm tắt về Telegram |

---

## 4. Các Module Chính

### 4.1 📱 Telegram Module
**Nơi ở:** `src/modules/telegram/`

Đây là cầu nối giữa bạn và Coral. Bao gồm:

| File | Chức năng |
|------|-----------|
| `index.ts` | **Telegram Bridge** — Kết nối với Telegram, nhận/gửi tin nhắn |
| `commands.ts` | **Command System** — Xử lý lệnh `/model`, `/help`, `/status` với nút bấm (InlineKeyboard) |
| `user-manager.ts` | **User Manager** — Quản lý danh sách người dùng được phép |
| `activity-reporter.ts` | **Activity Reporter** — Báo cáo hoạt động real-time |

**Điểm nổi bật:**
- 🎯 Hỗ trợ cả tin nhắn riêng tư và nhóm (group chat)
- 🔘 InlineKeyboard để chọn model bằng nút bấm
- 🛡️ Bootstrap: Người đầu tiên dùng bot sẽ trở thành Admin
- ⚡ Streaming: Tin nhắn phức tạp sẽ hiển thị real-time (đang xử lý...)

### 4.2 🧠 Engine — Bộ Não Trung Tâm
**Nơi ở:** `src/core/engine/`

Đây là **trái tim** của Coral — nơi xử lý mọi yêu cầu.

| File | Chức năng |
|------|-----------|
| `engine.ts` (662 dòng) | **Engine** — Nhận yêu cầu → Memory Recall → Build Prompt → Agent Run → Cache → Trả kết quả |
| `agent.ts` (657 dòng) | **Agent** — Vòng lặp ReAct (Reasoning + Acting), quản lý tool calls |
| `token-estimator.ts` | Ước tính số token (đơn vị đo độ dài văn bản AI) |

**Cơ chế thông minh:**
- **Smart Cache**: Nếu câu hỏi giống hệt câu đã trả lời → trả ngay không cần gọi AI (tiết kiệm chi phí)
- **Request Coalescing**: Nếu 2 người gửi cùng câu hỏi cùng lúc → chỉ gọi AI 1 lần
- **Context Compression**: Tự động tóm tắt lịch sử对话 khi quá dài

### 4.3 🧩 Agent (ReAct Loop)
**Nơi ở:** `src/core/agent/`

| File | Chức năng |
|------|-----------|
| `react-loop.ts` (581 dòng) | **ReAct Loop** — Vòng lặp suy nghĩ: Think → Act → Observe → Repeat |
| `agent-loop.ts` (452 dòng) | **Agent Loop** — Phân tích task phức tạp thành nhiều bước nhỏ |

**ReAct Loop hoạt động như thế nào?**
```
Câu hỏi: "Tìm file config và giải thích"

Bước 1: 🤔 Nghĩ → "Cần đọc file config trước"
Bước 2: 🔧 Tool: read_file("config.json")
Bước 3: 👁️ Quan sát → Nhận nội dung file
Bước 4: 🤔 Nghĩ → "Đã có nội dung, giờ giải thích"
Bước 5: 💬 Trả lời → Giải thích chi tiết cho user
```

### 4.4 💾 Memory System — Hệ Thống Bộ Nhớ
**Nơi ở:** `src/core/memory/`

Đây là phần **đặc biệt nhất** — Coral có khả năng **nhớ thông tin**!

| File | Chức năng |
|------|-----------|
| `MemoryStore.ts` (436 dòng) | **Bộ nhớ chính** — Lưu/tra cứu/xóa memories với cơ chế decay (quên dần) |
| `MemoryItem.ts` | Định nghĩa 1 "ký ức": fact, belief, preference, skill, summary |
| `MemoryExtractor.ts` | **Trích xuất** ký ức từ cuộc trò chuyện |
| `MemoryAPI.ts` | **API** để Dashboard hiển thị memories |
| `MemorySearch.ts` | **Tìm kiếm** memories liên quan |
| `memory-store.ts` (504 dòng) | **SQLite-backed store** — Lưu blocks vào database |
| `memory-temporal.ts` | **Memory theo thời gian** — Nhớ sự kiện theo thứ tự thời gian |
| `memory-log.ts` (514 dòng) | **Memory Log** — Ghi lại log các thay đổi bộ nhớ |
| `sqlite-storage.ts` | **SQLite Storage** — Lưu trữ持久化 bằng database |

**Cơ chế "Quên" (Decay) — Giống bộ não người:**
- Ký ức mới → **Confidence 100%** (rõ ràng)
- Thời gian trôi qua → Confidence giảm dần (quên dần)
- Được nhắc lại nhiều lần → Confidence tăng lên (nhớ kỹ hơn)
- Quên quá nhiều → Tự động archive (lưu trữ)
- Memory quan trọng → Có thể **pin** (ghim, không bao giờ quên)

**5 loại ký ức:**
| Loại | Ví dụ | Tương tự |
|------|-------|----------|
| 🧩 **Fact** | "User tên Khang" | Ký ức sự kiện |
| 💭 **Belief** | "User thích Python hơn JavaScript" | Nhận định |
| ⭐ **Preference** | "User thích trả lời ngắn gọn" | Sở thích |
| 🛠️ **Skill** | "Coral biết dùng web_search" | Kỹ năng |
| 📝 **Summary** | "Tóm tắt cuộc trò chuyện hôm qua" | Tóm tắt |

### 4.5 🛠️ Tools — Hệ Thống Công Cụ
**Nơi ở:** `src/core/tools/`

Coral có **9 nhóm công cụ** để thực hiện hành động:

| Nhóm Tool | Chức năng | Ví dụ |
|-----------|-----------|-------|
| 📁 **filesystem** | Đọc/ghi file | `read_file`, `write_file`, `list_directory` |
| 🔍 **knowledge** | Truy cập kho tri thức | `search_knowledge_graph`, `read_wiki_page` |
| 📄 **document** | Xử lý tài liệu | `extract_pdf_to_md`, `extract_docx_to_md` |
| 🌐 **network** | Tìm kiếm trên mạng | `web_search`, `fetch_url` |
| 📦 **archive** | Quản lý kho lưu trữ | `archive_document`, `search_archived_md` |
| 🎯 **skills** | Quản lý kỹ năng | `list_skills`, `skill_view`, `load_skill` |
| 📊 **report** | Tạo báo cáo | `generate_report` |
| ⚙️ **system** | Hệ thống | `execute_command`, `get_system_info` |
| 🔎 **search** | Tìm kiếm | `search_files`, `search_content` |

**Cơ chế Plugin:**
Tools được đăng ký theo kiểu "plugin" — dễ dàng thêm tool mới mà không cần sửa code cũ.

**AST Scanner — Tự động phát hiện tools mới:**
Hệ thống tự quét code, tìm các file tool mới, và đăng ký tự động!

### 4.6 🌐 Gateway — Bộ Định Tuyến
**Nơi ở:** `src/core/gateway/`

| File | Chức năng |
|------|-----------|
| `index.ts` | **CoralGateway** — Kết nối nhiều platform (Telegram, Discord...) với Engine |
| `types.ts` | Định nghĩa các kiểu dữ liệu chung |

**Hỗ trợ đa nền tảng:**
Hiện tại Coral đang chạy trên **Telegram**, nhưng kiến trúc cho phép mở rộng sang:
- Discord
- Slack
- Web chat
- Bất kỳ platform nào có thể kết nối

### 4.7 🔐 Security — Hệ Thống Bảo Mật
**Nơi ở:** `src/core/security/`

| File | Chức năng |
|------|-----------|
| `privilege-guard.ts` (364 dòng) | **RBAC** — Kiểm soát quyền truy cập từng tool |
| `rate-limiter.ts` | **Rate Limiter** — Giới hạn số tin nhắn/phút |
| `response-cache.ts` | **Response Cache** — Cache câu trả lời (tránh gọi AI thừa) |
| `mission-lock.ts` | **Mission Lock** — Khóa task đang chạy |

### 4.8 📊 Events — Hệ Thống Sự Kiện
**Nơi ở:** `src/core/events/`

| File | Chức năng |
|------|-----------|
| `bus.ts` | **EventBus** — Hệ thống thông báo giữa các phần |
| `store.ts` | **EventStore** — Lưu sự kiện vào SQLite |
| `logger.ts` | **StructuredLogger** — Ghi log có cấu trúc |
| `http-server.ts` | **Dashboard Server** — Serve Dashboard trên port 8766 |
| `websocket.ts` | **WebSocket** — Cập nhật real-time cho Dashboard |
| `graph-builder.ts` | **Graph Builder** — Xây dựng đồ thị nhận thức |
| `trace-builder.ts` | **Trace Builder** — Theo dõi luồng suy nghĩ |
| `mcp-trace.ts` | **MCP Trace** — Theo dõi tool calls chi tiết |
| `cost-tracker.ts` | **Cost Tracker** — Theo dõi chi phí API |

### 4.9 🧬 Self-Evolution — Tự Học
**Nơi ở:** `src/core/self-evolution/`

| File | Chức năng |
|------|-----------|
| `learner.ts` | **Self-Evolution Learner** — Học từ trải nghiệm quá khứ |
| `experience-store.ts` | **Experience Store** — Lưu kinh nghiệm (thành công/thất bại) |
| `task-tracker.ts` | **Task Tracker** — Theo dõi tiến độ task |

**Cơ chế tự học:**
```
Lần 1: Coral thử dùng tool X → Thành công ✅ → Lưu kinh nghiệm
Lần 2: Coral gặp task tương tự → Nhớ lại kinh nghiệm → Dùng tool X ngay
```

### 4.10 🔄 Circuit Breaker — Bảo Vệ Chống Lỗi Dây Chuyền
**Nơi ở:** `src/core/circuit-breaker.ts`

**Giống cầu dao điện:**
```
Bình thường (CLOSED) → Lỗi liên tiếp 3 lần → Mở cầu dao (OPEN)
     │                                            │
     │                                     Chờ 1 phút
     │                                            │
     │                              Thử lại (HALF-OPEN)
     │                                            │
     │                    Thành công? → Đóng cầu dao (CLOSED)
     │                    Thất bại? → Mở lại (OPEN)
```

Điều này ngăn Coral "spam" các service bên ngoài khi chúng bị lỗi.

---

## 5. Hệ Thống Models & Providers

### Coral dùng model nào?

Coral kết nối qua **9Router** — một proxy trung gian, cho phép truy cập nhiều model AI khác nhau.

| Model | Tier | Mô Tả | Khi nào dùng |
|-------|------|--------|---------------|
| 🦉 **Owl Alpha** | Tier 1 | Model reasoning mạnh | Nhiều task phức tạp |
| 🤖 **Claude 3 Haiku** | Tier 1 | Nhanh, chính xác | Task cần tốc độ |
| 🦙 **Llama 3 8B** | Tier 2 | Model mã nguồn mở | Task trung bình |
| 🔮 **Mistral 7B** | Tier 2 | Model châu Âu | Task trung bình |
| 💎 **Gemma 2 9B** | Tier 2 | Model của Google | Task trung bình |
| 💰 **GPT-3.5 Turbo** | Tier 3 | Rẻ, nhanh | Task đơn giản |
| ⚡ **GPT-4o Mini** | Tier 2 | Thông minh, nhanh | Task cần chất lượng |
| 🔍 **DeepSeek Chat** | Tier 2 | Model Trung Quốc | Task đa ngôn ngữ |
| 🎯 **"all"** | Tier 1 | Router tự chọn | Mặc định |

### Cơ chế Fallback (Tự Chuyển):

```
Model chính bị lỗi?
    │
    ▼
Thử Model Tier 2?
    │
    ▼
Vẫn lỗi? → Thử Model Tier 3
    │
    ▼
Tất cả lỗi? → Circuit Breaker MỞ → Báo lỗi cho user
```

---

## 6. Cron Jobs — Tác Vụ Tự Động

Coral tự chạy các công việc định kỳ mà không cần ai yêu cầu:

| Tác Vụ | Tần Suất | Chức năng |
|--------|----------|-----------|
| 🏥 **Health Check** | Mỗi **6 giờ** | Kiểm tra sức khỏe hệ thống (CPU, RAM, disk) |
| 💾 **Memory Flush** | Mỗi **1 giờ** | Đưa dữ liệu từ bộ nhớ tạm ra database (tiết kiệm RAM) |
| 🧹 **Memory Cleanup** | Mỗi **30 phút** | Dọn dẹp memories hết hạn (expired blocks) |

---

## 7. Dashboard — Trung Tâm Điều Hành

Coral có một **Dashboard web** chạy trên `http://localhost:8766` với **6 chế độ xem**:

### 7.1 🎯 MISSION MODE (Mặc định)
> *Xem Coral đang làm gì*

- **CURRENT MISSION** — Nhiệm vụ hiện tại
- **ACTIVE TOOLS** — Các tool đang chạy
- **CURRENT DECISION** — Coral đang quyết định gì
- **TIMELINE** — Dòng thời gian các sự kiện
- **FILE CHANGES** — Các file đã thay đổi

### 7.2 🧠 TRACE MODE
> *Xem suy nghĩ chi tiết của Coral*

- **Trace Context** — Bối cảnh task
- **Cognitive Trace** — Luồng suy nghĩ (Think → Act → Observe)
- **MCP Trace** — Theo dõi từng tool call chi tiết
- **Cost Tracking** — Chi phí API (budget, tokens, models)

### 7.3 ⚡ FOCUS MODE
> *Chế độ tập trung vào reasoning*

- **Reasoning Panel** — Coral đang suy nghĩ gì
- **Next Action** — Coral sẽ làm gì tiếp
- **Active Tool** — Tool đang chạy
- **Mission Context** — Bối cảnh nhiệm vụ

### 7.4 💾 MEMORY MODE
> *Xem Coral nhớ gì*

- **Memory List** — Danh sách tất cả memories
- **Memory Detail** — Chi tiết từng memory
- **Memory Graph** — Đồ thị liên kết giữa memories
- **Filters** — Lọc theo loại (fact, belief, preference...)
- **Advanced Filters** — Lọc theo confidence, importance

### 7.5 🔗 GRAPH MODE
> *Xem đồ thị nhận thức*

- **Cognitive Graph** — Đồ thị các quyết định, tool calls, kết quả
- **Node Types**: Decision (quyết định), Tool (công cụ), Artifact (kết quả)
- **Edge Types**: Caused (gây ra), Produced (tạo ra)

### 7.6 🧠 HOLOGRAM MODE (Neural Cortex)
> *Chế độ "Jarvis" — Hiển thị 3D*

- **3D Neural Network** — Mạng nơ-ron 3D (dùng Three.js)
- **Activity Bar** — Mức độ hoạt động
- **Neural Activity Log** — Nhật ký hoạt động real-time
- **Readouts**: Events, Tools, Decisions, Memories, Errors

---

## 8. Hệ Thống Bảo Mật

### 8.1 Kiểm Soát Truy Cập (Access Control)
- **Bootstrap mode**: Người đầu tiên dùng bot tự động trở thành Admin
- **Admin** có quyền: `/allow`, `/disallow`, `/users`, `/admin`
- **User** chỉ được nhắn tin và dùng lệnh cơ bản
- **Tin nhắn từ bot bị bỏ qua** (không tự trả lời chính mình)

### 8.2 Rate Limiting (Giới hạn tốc độ)
- **Toàn cục**: 60 requests/phút, 100,000 tokens/phút
- **Per-user**: 20 messages/phút
- **Telegram adapter**: 20 messages/phút riêng biệt

### 8.3 Privilege Guard (Kiểm soát quyền工具)
- Mỗi tool có thể bị allow/deny tùy role
- Path traversal detection (phát hiện truy cập file ngoài workspace)
- Restricted mode (chỉ cho phép dùng tool trong danh sách)

### 8.4 Response Cache
- TTL-based caching (hết hạn tự xóa)
- Real-time queries bypass cache (câu hỏi cần dữ liệu mới nhất)
- Side-effect detection (câu trả lời có dùng tool → không cache)

### 8.5 Circuit Breaker
- Ngăn spam khi provider bị down
- 3 lỗi liên tiếp → Circuit OPEN → Chờ 1 phút → Thử lại

---

## 9. Tình Trạng Hiện Tại & Thống Kê

### Thống Kê Tổng Quan
| Hạng Mục | Số Liệu |
|-----------|---------|
| 📁 Tổng file mã nguồn | **95 file .ts** |
| 📝 Tổng dòng code | **~23,326 dòng** |
| 🧪 Tổng tests | **906+ tests** (52 file test) |
| 📚 File knowledge/skills | **141 file** |
| 🛠️ Groups of tools | **9 nhóm** |
| 🧠 Dashboard views | **6 chế độ** |
| ⏰ Cron jobs | **3 tác vụ tự động** |
| 🔐 Security layers | **5 lớp** (RBAC, Rate Limit, Cache, Circuit Breaker, Mission Lock) |

### Top 10 File Lớn Nhất (Phức tạp nhất)
| File | Dòng Code | Chức năng |
|------|-----------|-----------|
| `telegram/index.ts` | 711 | Telegram Bridge |
| `engine/engine.ts` | 662 | Core Engine |
| `engine/agent.ts` | 657 | Agent ReAct Loop |
| `agent/react-loop.ts` | 581 | ReAct Loop Implementation |
| `llm/model-adapter.ts` | 577 | Multi-Provider Adapter |
| `tools/ast-scanner.ts` | 543 | Auto-discovery Tools |
| `telegram/commands.ts` | 518 | Command System |
| `memory/memory-log.ts` | 514 | Memory Log |
| `memory/memory-store.ts` | 504 | Memory Store (SQLite) |
| `observability/tracer.ts` | 501 | Distributed Tracing |

### Các Chức Năng Đã Hoàn Thành (Phase)
| Phase | Tên | Trạng Thái |
|-------|-----|------------|
| Phase 1 | Memory Recall | ✅ Hoàn thành |
| Phase 2 | Telegram Streaming + InlineKeyboard | ✅ Hoàn thành |
| Phase 3 | Smart Fallback + Circuit Breaker | ✅ Hoàn thành |
| Phase 4 | Cron Scheduler + Dashboard | ✅ Hoàn thành |
| Phase 5 | Security (RBAC, Rate Limit) | ✅ Hoàn thành |
| Phase 6 | Self-Evolution (Tự học) | ✅ Hoàn thành |
| Phase 7 | Event System + Telemetry | ✅ Hoàn thành |
| Phase 8 | Dashboard Redesign (6 views) | ✅ Hoàn thành |

### Dependencies (Thư viện sử dụng)
| Thư viện | Phiên bản | Mục đích |
|-----------|-----------|----------|
| grammy | ^1.44.0 | Kết nối Telegram |
| openai | ^6.37.0 | Gọi API AI models |
| better-sqlite3 | ^12.11.1 | Database SQLite |
| zod | ^4.4.3 | Validate dữ liệu |
| ws | ^8.21.0 | WebSocket (Dashboard real-time) |
| langfuse | ^3.38.20 | Observability/Tracing |
| pdf-parse | ^2.4.5 | Đọc file PDF |
| mammoth | ^1.12.0 | Đọc file DOCX |
| vitest | ^3.2.4 | Testing framework |

---

## 10. Bảng Thuật Ngữ Dễ Hiểu

| Thuật Ngữ Trong Code | Nghĩa Dễ Hiểu |
|-----------------------|----------------|
| **Engine** | "Bộ não" trung tâm xử lý mọi thứ |
| **Agent / ReAct Loop** | Vòng lặp suy nghĩ: Nghĩ → Hành động → Quan sát → Lặp |
| **Tool** | Công cụ mà Coral có thể dùng (đọc file, tìm web, etc.) |
| **Memory** | "Bộ nhớ" — Coral nhớ thông tin qua nhiều lần trò chuyện |
| **Provider** | Nhà cung cấp model AI (như OpenAI, Anthropic, Meta...) |
| **Model** | "Bộ não AI" cụ thể (GPT, Claude, Llama...) |
| **Cascade / Fallback** | Tự chuyển sang model khác khi model hiện tại bị lỗi |
| **Circuit Breaker** | "Cầu dao điện" — Ngăn Coral spam khi service bị lỗi |
| **Rate Limiter** | "Giới hạn tốc độ" — Không cho gửi quá nhanh |
| **Cache** | "Bộ nhớ đệm" — Lưu câu trả lời đã có để trả nhanh hơn |
| **Event Bus** | "Hệ thống thông báo" — Các phần nói chuyện với nhau |
| **Gateway** | "Bộ định tuyến" — Chuyển tin nhắn từ platform vào Engine |
| **Bridge** | "Cầu nối" — Nối platform (Telegram) với core |
| **Plugin** | "Công cụ plug-and-play" — Thêm feature mà không sửa code cũ |
| **RBAC** | "Phân quyền" — Ai được làm gì |
| **Decay** | "Quên dần" — Ký ức cũ mất dần theo thời gian |
| **Reinforcement** | "Củng cố" — Ký ức được nhắc lại sẽ mạnh hơn |
| **Snapshot** | "Ảnh chụp nhanh" — Lưu trạng thái hiện tại |
| **Cron Job** | "Tác vụ định kỳ" — Chạy tự động theo lịch |
| **Workspace** | "Vùng làm việc" — Thư mục nơi Coral hoạt động |
| **Session** | "Phiên" — Một cuộc trò chuyện liên tục |
| **TTL** | "Thời hạn sống" — Dữ liệu tự xóa sau thời gian nhất định |
| **Bootstrap** | "Khởi động lần đầu" — Cài đặt ban đầu |
| **InlineKeyboard** | "Nút bấm trong tin nhắn" — Chọn model bằng cách bấm nút |

---

## 📌 Tóm Tắt Cho Người Không Biết Code

> **Coral** là một **trợ lý AI thông minh** chạy trên Telegram. Khi bạn nhắn tin, Coral sẽ:
>
> 1. 📥 **Nhận tin nhắn** từ Telegram
> 2. 🔍 **Kiểm tra bộ nhớ** — "Mình đã biết gì về việc này?"
> 3. 🤔 **Suy nghĩ** — "Cần làm gì? Dùng tool nào?"
> 4. 🔧 **Hành động** — Đọc file, tìm kiếm web, hoặc gọi AI model
> 5. 💬 **Trả lời** — Gửi kết quả về cho bạn
> 6. 💾 **Nhớ** — Lưu thông tin quan trọng để lần sau nhớ
>
> Coral có thể **tự học**, **tự sửa lỗi**, và **tự chuyển model** khi cần.
> Bạn có thể xem Coral "suy nghĩ" thế nào qua **Dashboard** trên trình duyệt.

---

*Báo cáo được tạo tự động bởi phân tích codebase · 23/06/2026*
*Coral v6.0 · 23,326 dòng code · 906+ tests · 6-layer architecture*
