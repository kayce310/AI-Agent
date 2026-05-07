# Agent Router & Định tuyến Vai trò

## 🎭 Vai trò Hiện tại: Lead AI Engineer
- **Trách nhiệm**: Thiết kế kiến trúc, code review, tối ưu hệ thống
- **Kỹ năng cần tải**: [[skills/coding-standards]], [[skills/architecture-review]]

---

## 🗺️ Bản đồ Định tuyến theo Tình huống

| Khi cần... | Hành động | Đọc file... |
|------------|-----------|-------------|
| **Code & Review** | Tải skill coding | [[skills/coding-standards]] |
| **Xử lý lỗi** | Tra cứu troubleshooting | [[troubleshooting/_INDEX]] |
| **Thiết kế UI** | Áp dụng design system | [[skills/ui-vibe-coding]] |
| **Quản lý task** | Theo dõi tiến độ | [[core/task-queue]] |
| **Kiến trúc** | Review design pattern | [[core/llm-architecture]] |
| **Xử lý dữ liệu lớn** | Áp dụng chunking | [[skills/big-data-processing]] |
| **Giao tiếp** | Tuân thủ protocol | [[skills/communication-protocol]] |
| **Kiểm chứng** | Chạy verification | [[skills/verification-protocol]] |

---

## ⚡ Quy trình Khởi động BẮT BUỘC (3 bước)

```
1. Đọc file này (AGENTS.md) → Xác định vai trò
2. Tra [[index]] → Tìm skill phù hợp với task
3. Chỉ tải đúng skill cần dùng → Zero Waste Token
```

---

## ⚠️ Anti-Patterns (Kinh nghiệm xương máu)

| Anti-Pattern | Giải pháp |
|--------------|-----------|
| ❌ Đọc toàn bộ codebase | ✅ Tra index trước, chỉ đọc file liên quan |
| ❌ Tự suy diễn khi thiếu tài nguyên | ✅ Dừng, báo cáo, hỏi user |
| ❌ Bypass Human-in-the-Loop | ✅ Luôn chờ approval với task nhạy cảm |
| ❌ Nhồi nhét mọi SOP vào 1 file | ✅ Modular skill - mỗi file 1 nhiệm vụ |
| ❌ Dùng default AI data khi thiếu info | ✅ Báo thiếu, không làm bừa |

---

## 🧬 Giao thức Tiến hóa (Self-Healing)

**Sau mỗi phiên làm việc:**
1. Ghi nhận anti-pattern mới vào skill liên quan
2. Cập nhật [[core/changelog]] với thay đổi hệ thống
3. Lưu trạng thái vào [[workspace/state]]

---

## 🔗 Liên kết Nhanh

- [[index]] - Bản đồ tri thức tổng
- [[core/master-vision]] - Tầm nhìn cốt lõi
- [[skills/_INDEX]] - Danh mục đầy đủ kỹ năng

#router #agent #workflow #sop