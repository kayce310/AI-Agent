# Kỹ năng Tự động hóa (Automation Directives)

## 🎯 Mục tiêu
Thiết kế hệ thống automation thông minh, tự học, tự cải thiện.

---

## ⚡ Nguyên tắc Thiết kế

### 1. Truy vấn O(1)
- Ưu tiên tool quét liên kết (regex/Node.js thuần)
- Quét index mạng lưới TRƯỚC khi dùng LLM
- **HẠN CHẾ tối đa** dùng LLM đọc mù mờ toàn bộ file

```typescript
// ✅ O(1) lookup qua index
const searchKnowledgeGraph = (keyword) => {
  const index = readFileSync('wiki/index.md');
  return regexSearch(index, keyword); // Fast lookup
};

// ❌ O(n) đọc mù
const badApproach = () => {
  const allFiles = readAllFiles('wiki/');
  return llmSearch(allFiles, keyword); // Slow, expensive
};
```

### 2. Hệ thống Tự sinh (Self-Learning)
- Chạy ngầm ở chế độ Idle/Cron job
- Tự động quét [[orphaned links]] trong wiki
- Tự gọi LLM tổng hợp kiến thức để tạo file điền khuyết
- **Giới hạn an toàn**: 5 file/ngày

### 3. Human-in-the-Loop
- Task nhạy cảm → Trạng thái `[?] REQUIRE_APPROVAL`
- DỪNG HOÀN TOÀN, chờ user xác nhận
- Không bao giờ tự động bypass approval

---

## 🗺️ Kiến trúc Orchestrator-Worker

```
┌─────────────┐    ┌──────────────┐    ┌─────────────┐
│ Orchestrator│ →  │ Worker Queue │ →  │   Workers   │
│   (Brain)   │    │  (Tasks)     │    │ (Executors) │
└─────────────┘    └──────────────┘    └─────────────┘
        ↓
┌─────────────┐
│  Aggregator │
│  (Results)  │
└─────────────┘
```

**Quy tắc:**
- ❌ Nghiêm cấm hardcode timer/setInterval
- ✅ Đảm bảo đồng bộ bằng Promise/Await
- ✅ Chỉ xử lý 1 task mỗi thời điểm
- ✅ Worker chạy xong 100% trước khi tiếp tục

---

## 📋 Checklist Thiết kế Automation

- [ ] Có O(1) lookup thay vì O(n) scan
- [ ] Có cơ chế self-learning ở idle mode
- [ ] Có human-in-the-loop cho task nhạy cảm
- [ ] Dùng orchestrator-worker pattern
- [ ] Không hardcode timers
- [ ] Có rate limiting (5 files/day cho auto-fill)

---

## ⚠️ Anti-Patterns

| Anti-Pattern | Giải pháp |
|--------------|-----------|
| ❌ Dùng LLM scan toàn bộ codebase | ✅ Index-based O(1) lookup |
| ❌ Hardcode `setInterval(5000)` | ✅ Event-driven hoặc cron-based |
| ❌ Xử lý song song không kiểm soát | ✅ Orchestrator-worker với sync |
| ❌ Auto-fill không giới hạn | ✅ Rate limit 5 files/day |
| ❌ Bypass approval workflow | ✅ Luôn REQUIRE_APPROVAL cho敏感 tasks |

---

## 🔗 Liên kết

- [[big-data-processing]] - Chunking & processing
- [[knowledge-management]] - Wiki structure
- [[evolution-protocol]] - Self-healing mechanisms

#skill #automation #workflow #sop