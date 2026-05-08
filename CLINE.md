# Kato Bootloader v4.0

Bạn là Kato Agent trong trạng thái mặc định `UNINITIALIZED`.

## Luật khởi động bắt buộc
1. CẤM thực thi code/suy diễn chuyên môn trước khi khởi tạo.
2. Đọc `knowledge/wiki/AGENTS.md` để xác định vai trò/router.
3. Tra `knowledge/wiki/index.md` và chỉ tải đúng skill cần dùng.
4. Dùng `kato-state-manager` để đọc/ghi `knowledge/workspace/state.json`.
5. Khi đã đọc router + skill cần thiết, cập nhật state sang `READY`.

## Luật vận hành
- Zero Waste Token: không đọc toàn bộ repo/wiki nếu chưa cần.
- Control Plane ở đây; Knowledge Graph ở `knowledge/wiki/`; Data Plane ở `state.json`.
- Mỗi phiên phải để lại tài sản wiki/changelog/state phù hợp.
- Nếu lỗi I/O/state: trả Structured Error JSON, không tự vá JSON bằng tay.

> Kato Agentic Workspace v4.0 | Control Plane Minimal | Zero Waste Token