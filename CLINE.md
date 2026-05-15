# Kato Bootloader v5.0 — Checkpoint Protocol

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
- **Luật Blueprint**: Khi tạo file mới trong `knowledge/blueprints/`, dùng `kato-state-manager scan` để kiểm tra untracked files và `mark` để cập nhật `knowledge/workspace/processed-files.json`.
- **Luật Workspace Path Consistency**: Mọi đường dẫn trong kết quả tool call PHẢI tính từ gốc repo (`e:/Test/AI-Agent`). CẤM trả lời path kiểu tương đối theo workspace của Kato. `processed-files.json` chỉ tồn tại duy nhất ở `knowledge/workspace/processed-files.json`.
- **Luật Skip**: Files trong `processed-files.json` (đã processed) có thể skip không cần quét lại trừ khi checksum thay đổi.

## Luật Checkpoint & Anti-Overflow ⚡
1. **Luật Checkpoint bắt buộc**: Mỗi tool call PHẢI kèm `task_progress` parameters. Đây không phải optional — dây là anti-overflow bắt buộc.
2. **Luật checkpoint.json**: Trước mỗi tool call, đọc `knowledge/workspace/checkpoint.json`. Sau mỗi tool call, JSON UPDATE `checkpoint.json`:
   - `.progress.currentStep` + `.completedSteps[]` + `.pendingSteps[]` — cập nhật danh sách
   - `.context.filesModifiedThisSession` — add file path vừa tạo/sửa
   - `.checkpoint.lastSavedAt` — timestamp
   - `.checkpoint.totalSaves` — increment
3. **Luật Token Budget**: Kiểm tra `context.tokenBudget` trước mỗi tool call:
   - Nếu `currentEstimateUsage` > 200k (warning): bắt đầu rút gọn mô tả, giảm verbose
   - Nếu `currentEstimateUsage` > 240k (critical): **DỪNG tool call**, chạy emergency: `node scripts/checkpoint-emergency.mjs` → git add + commit ngay. Sau đó báo user
4. **Luật Resume Detection**: Khi khởi động, kiểm tra `RESUME.md` tồn tại → ĐÃ overflow trước đó:
   - Đọc `checkpoint.json`, so sánh `session.id` với `state.json`
   - Nếu session cũ bị mất → `resumeCount++` → chạy resume protocol
   - Không tạo session mới cho tới khi xác nhận với user
5. **Luật emergency-save**: Khi token budget > criticalThreshold (240k) HOẶC tool call fail → chạy ngay emergency checkpoint trước khi làm bất kỳ action nào khác.
6. **Luật git commit milestone**: Mỗi khi hoàn thành 1 step (kể cả trong process): `git add -A && git commit -m "step X: <mô tả ngắn>"` — giải phóng context, tạo recovery point.
7. **Luật Auto-Cleanup**: Khi **tất cả task đã hoàn thành** (`.pendingSteps` rỗng VÀ `.completedSteps` có items):
   - Gọi `node scripts/checkpoint-emergency.mjs task_complete` để tự động cleanup bộ đếm
   - Hoặc set reason = `"task_complete"` trong tool call cuối cùng
   - Script sẽ: reset `resumeCount` → 0, xóa `sessionHistory`, xóa `completedSteps`/`pendingSteps`, xóa `filesModifiedThisSession`, set `currentEstimateUsage` → 0
   - Git commit với message `[CLEANUP] task complete — checkpoint auto-reset`
   - Checkpoint sạch sẽ, sẵn sàng cho task mới

## Resume Procedure (khi overflow đã xảy ra)
1. Đọc toàn bộ `RESUME.md`
2. Đọc `checkpoint.json` + `state.json`
3. Kiểm tra `git status --porcelain` → so sánh với checkpoint
4. Đọc `changelog.md` để biết history gần nhất
5. Thông báo user: "🔄 Context overflow detected at step [X]. resumeCount=[N]. Continue?"
6. Khi user xác nhận: cập nhật checkpoint, set `currentEstimateUsage` về 0 (session mới), tiếp tục

> Kato Agentic Workspace v5.0 | Control Plane Minimal | Zero Waste Token | Checkpoint Protocol v1.0 | Updated: 2026-05-15
