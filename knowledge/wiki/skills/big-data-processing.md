# Kỹ năng Xử lý Dữ liệu Lớn (Big Data Processing)

## 🎯 Mục tiêu
Xử lý file > 50KB mà không làm tràn bộ nhớ ngữ cảnh (context window).

---

## ⚡ Nguyên tắc Vàng

### Big Data Principle
> ❌ **NGHIÊM CẤM**: Dùng `read_file` để đọc toàn bộ file > 50KB vào ngữ cảnh
>
> ✅ **BẮT BUỘC**:
> 1. Viết code chia nhỏ file thành chunks
> 2. Đưa vào [[Task Queue]] hệ thống
> 3. Xử lý tuần tự từng phần
> 4. Không làm tràn context window

---

## 🗺️ Quy trình Xử lý

### Bước 1: Phát hiện File Lớn
```typescript
const THRESHOLD = 50 * 1024; // 50KB
const stats = await fs.stat(filePath);
if (stats.size > THRESHOLD) {
  // Kích hoạt big data processing
}
```

### Bước 2: Chunking Strategy
```typescript
// Chia file thành chunks ~10KB mỗi chunk
const chunks = splitIntoChunks(content, 10000);
for (const chunk of chunks) {
  await processChunk(chunk); // Xử lý tuần tự
}
```

### Bước 3: Orchestrator-Worker Pattern
```
Orchestrator → Phân chia task → Worker Queue
Worker 1 → Xử lý chunk 1 → Kết quả
Worker 2 → Xử lý chunk 2 → Kết quả
...
Aggregator → Tổng hợp kết quả
```

---

## 📋 Checklist Xử lý File Lớn

- [ ] Kiểm tra kích thước file trước khi đọc
- [ ] Nếu > 50KB → Áp dụng chunking
- [ ] Dùng orchestrator-worker pattern
- [ ] Đảm bảo worker chạy xong 100% trước khi tiếp tục
- [ ] Không hardcode timer/interval
- [ ] Dùng Promise/Await cho đồng bộ

---

## ⚠️ Anti-Patterns

| Anti-Pattern | Giải pháp |
|--------------|-----------|
| ❌ `read_file` toàn bộ file 100KB+ | ✅ Chia chunks, xử lý tuần tự |
| ❌ `setInterval` hardcode timer | ✅ Dùng Promise/Await synchronization |
| ❌ Xử lý nhiều task cùng lúc | ✅ 1 task tại 1 thời điểm |
| ❌ Không chờ worker xong đã tiếp tục | ✅ Đảm bảo worker finish 100% |
| ❌ Nhồi nhiều chunks vào 1 context | ✅ Mỗi chunk 1 context riêng |

---

## 🔗 Liên kết

- [[coding-standards]] - Module hóa processing logic
- [[automation-directives]] - Orchestrator architecture
- [[verification-protocol]] - Kiểm chứng kết quả processing

#skill #bigdata #processing #workflow