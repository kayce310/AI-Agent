# RESUME BOOTLOADER v1.0 — Anti-Context-Overflow Protocol

> ⚠️ Nếu bạn đang đọc file này, context window của phiên trước đã bị overflow.
> Bạn (CLINE Extension) đã khởi động lại với zero context.
> Đừng hoảng. Mọi thứ đã được checkpoint.

## Bước 1: Đọc checkpoint ngay lập tức

```bash
cat knowledge/workspace/checkpoint.json
cat knowledge/workspace/state.json
```
→ Đây là trạng thái cuối cùng trước khi overflow.

## Bước 2: Xác định vị trí đang dở

Check `checkpoint.json → progress`:
- `currentStep`: bước đang làm dở
- `completedSteps[]`: các bước đã hoàn thành
- `pendingSteps[]`: các bước chưa làm
- `context.tokenBudget.emergencySaved`: `true` nếu checkpoint được save khẩn cấp

## Bước 3: Kiểm tra Git state

```bash
git status --porcelain
```
→ So sánh với `checkpoint.json → dependencies` để biết files nào đã sửa/chưa commit.

## Bước 4: Khôi phục context

Đọc các file trong `checkpoint.json → resumeInstructions.mustReadFilesFirst[]`:
- Những file này là tối thiểu để hiểu đang làm gì
- Sau đó đọc `changelog.md` để biết lịch sử gần đây

## Bước 5: Tiếp tục

- Nếu task bị dở → gọi `checkpoint:progress --update currentStep=<next>` rồi tiếp tục
- Nếu task đã hoàn thành nhưng chưa commit → `git add -A && git commit -m "..."` rồi kết thúc
- Nếu lỗi → ghi vào `evolution.json` trước khi làm lại

---

## File checkpoint tự động được tạo sau mỗi tool call

| File | Mục đích |
|------|----------|
| `knowledge/workspace/checkpoint.json` | Trạng thái step-by-step, token budget, files đã sửa |
| `knowledge/workspace/state.json` | Session metadata, lifecycle, priorities |
| `knowledge/workspace/evolution.json` | Lỗi + pattern cho self-healing |

## Rules cho CLINE khi đọc file này

1. **KHÔNG tự ý tạo session mới** — dùng `checkpoint.json.session.id` để nối tiếp session cũ
2. **Kiểm tra `resumeCount`** — nếu > 3 lần resume, có thể task quá lớn, cần báo user chia nhỏ hơn
3. **Đọc `tokenBudget` trước khi làm bất kỳ tool call nào** — nếu đã > criticalThreshold (240k), ưu tiên checkpoint + git commit trước
4. **Khi `currentEstimateUsage` > 200k**: mỗi tool call phải kèm `task_progress` và checkpoint update
5. **Khi `emergencySaved === true`**: context đã được emergency save, nên ưu tiên commit để giải phóng

---

*Generated: 2026-05-15 | v1.0 | Anti-Overflow Protocol*