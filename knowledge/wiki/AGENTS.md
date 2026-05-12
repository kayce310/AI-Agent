# Agent Router & Định tuyến Vai trò v4.0

## 🎭 Vai trò Hiện tại: Lead AI Engineer
- **Trách nhiệm**: Thiết kế kiến trúc, code review, tối ưu hệ thống
- **Kỹ năng nền cần tải theo task**: [[skills/coding-standards]], [[skills/verification-protocol]], [[skills/state-management]]
- **Trạng thái mặc định**: `UNINITIALIZED` cho đến khi router + index + skill liên quan được đọc và `state.json` được cập nhật qua `kato-state-manager`.

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
| **Quản lý trạng thái** | Dùng Data Plane an toàn | [[skills/state-management]] |
| **Khởi động Discord** | Start bot qua kato-boot.bat | [[skills/module-discord]] |
| **Kiến trúc Core** | Tra cứu core architecture | [[core/_INDEX]] |

---

## ⚡ Quy trình Khởi động BẮT BUỘC (3 bước)

```
1. Đọc file này (AGENTS.md) → Xác định vai trò/router
2. Tra [[index]] → Tìm skill phù hợp với task
3. Gọi `kato-state-manager` để init/read state khi cần
4. Chỉ tải đúng skill cần dùng → Zero Waste Token
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
| ❌ Sửa `state.json` thủ công | ✅ Chỉ dùng `kato-state-manager` |

---

## 🧬 Giao thức Tiến hóa (Self-Healing)

**Sau mỗi phiên làm việc:**
1. Ghi nhận anti-pattern mới vào skill liên quan
2. Cập nhật [[core/changelog]] với thay đổi hệ thống
3. Lưu trạng thái vào `knowledge/workspace/state.json` qua `kato-state-manager`

---

## 🔗 Liên kết Nhanh

- [[index]] - Bản đồ tri thức tổng
- [[core/master-vision]] - Tầm nhìn cốt lõi
- [[skills/_INDEX]] - Danh mục đầy đủ kỹ năng

#router #agent #workflow #sop