# Claude Code — Chiến lược Context & Prompt Caching

## Tổng quan
Claude Code là CLI agent của Anthropic, không open-source. Phân tích dựa trên tài liệu công khai, blog Anthropic, và hành vi quan sát được.

---

## 1. Cấu trúc Context (Message Lifecycle)

### Static Layers (được cache):
- **System Prompt** — instruction cố định cho agent role, tool definitions (function calling schema)
- **CLAUDE.md** — file luật của project, đọc 1 lần đầu session
- **File system snapshot** — cấu trúc thư mục, file cố định (không đổi giữa các turn)
- **Git context** — diff hiện tại, branch info, commit history

### Dynamic Layers (không cache / thay đổi mỗi turn):
- **Chat history** — toàn bộ hội thoại user ↔ assistant
- **Terminal output** — kết quả command vừa chạy
- **File contents** — nội dung file được đọc/ghi theo yêu cầu

---

## 2. Prompt Caching Strategy

Claude Code tận dụng **Prompt Caching** của Anthropic API (introduced mid-2024):

### Cache Hit Strategy:
- **System prompt** + **Tool definitions** → cache 1 (ổn định suốt session)
- **CLAUDE.md** + **File system tree** → cache 2 (chỉ thay đổi khi project structure thay đổi)
- **Chat history** (từ đầu session đến message gần nhất) → cache 3 (append-only, mỗi turn invalidate phần cuối)

### Placement trên API:
- Các static segment được đặt ở **đầu prompt** (system + tools + project rules)
- Anthropic API cache các token đầu tiên (~4K tokens đầu được cache mặc định)
- Claude Code chủ động gửi các điểm `cache_control` để đánh dấu breakpoints cho cache layer

---

## 3. File vs History Handling

| Feature | File System Context | Chat History |
|---------|-------------------|--------------|
| **Nature** | Static (đọc 1 lần, tái sử dụng) | Dynamic (append mỗi turn) |
| **Cache strategy** | Cache system-level, ko đổi | Chỉ cache phần cũ, phần mới luôn miss |
| **Update trigger** | Git diff, file write | Mỗi user message + assistant response |
| **Cost impact** | Gần như free sau cache hit | Chi phí tăng tuyến tính theo session length |
| **Compaction** | Không cần | Cần khi session quá dài |

---

## 4. Context Window Management Tactics

### Khi vượt quá context window:
1. **Compaction** loại bỏ tool call details cũ, chỉ giữ kết quả text
2. Cắt bỏ lịch sử terminal output cũ (giữ message cuối)
3. Giảm độ chi tiết của file system tree
4. Trong trường hợp extreme: thông báo user "response truncated" hoặc yêu cầu /reset

### Không làm:
- Không có sliding window tự động (không silent drop messages)
- Không ưu tiên message theo role (admin message ≠ important message)
- Không có budget tracking chủ động trước mỗi call

---

## 5. So sánh với Cline / Kato

| Khía cạnh | Claude Code | Cline (hiện tại) | Ghi chú |
|-----------|-------------|------------------|---------|
| Prompt Caching | Có (Anthropic native) | Không dùng | Cline có thể tận dụng Anthropic API cache |
| Tool def caching | Có | Không | Cline rebuild mỗi turn |
| File system tree | Cache 1 lần | Đọc lại mỗi turn (environment_details) | Cơ hội tối ưu |
| Chat compaction | Thủ công (khi gần đầy) | Không | Kato cần implement |
| Session resume | Context được replay từ DB | Không | Nanoclaw có session_state |

---

## 6. Key Takeaways cho Kato Integration

1. **Anthropic API có cache sẵn** — nếu dùng Anthropic, không cần tự cache ở app layer
2. **Tách static/dynamic** — System prompt + tool defs → cache; chat history → không cache
3. **File system tree** — chỉ gửi lại khi thay đổi (dùng git hash hoặc mtime tracking)
4. **Chat compaction** — cần implement khi session > 100 messages hoặc gần đầy context
5. **Session resume** — tái tạo context từ DB (như nanoclaw session_state) là khả thi

---

*Ghi chú: Claude Code không open-source, phân tích dựa trên hành vi bên ngoài và tài liệu Anthropic.*