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
| **AI Gateway** | Gọi 9Router APIs | [[skills/9router]] |

---

## ⚡ Quy trình Khởi động BẮT BUỘC (Boot with KATO v7.1)

```
1. Đọc file này (AGENTS.md) → Xác định vai trò/router
2. Tra [[index]] → Tìm skill phù hợp với task
3. Kiểm tra /.kato/state/current.json trước (single source of truth):
   - Nếu có → dùng làm state chính
   - Nếu không có → fallback sang state.json, checkpoint.json, processed-files.json riêng lẻ
4. Nếu /.kato/snapshots/ có snapshot *_resumed.json không tồn tại (pending_resume):
   - Chạy node scripts/kato-resume.mjs --dry-run để xem thông tin
   - Hỏi user: "Overflow recovery: snapshot found. Resume?"
   - Nếu đồng ý: node scripts/kato-resume.mjs --apply
5. Gọi `kato-state-manager` để init/read state khi cần
6. Chỉ tải đúng skill cần dùng → Zero Waste Token
```

## ✅ State Verification

Chạy các lệnh kiểm tra định kỳ để đảm bảo tính nhất quán:

- `kato-state-manager verify` — So sánh current.json với các legacy file (state.json, checkpoint.json, processed-files.json). Báo WARNING nếu khác nhau.
- `npx tsx scripts/validate-structure.ts --strict` — Kiểm tra cấu trúc import, folder ownership, security.
- `node scripts/kato-resume.mjs` — Dry-run: hiển thị snapshot mới nhất (nếu có) mà không apply.

Nếu `verify` báo inconsistency, chạy `kato-state-manager repair` để rebuild current.json từ legacy files, sau đó verify lại.

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