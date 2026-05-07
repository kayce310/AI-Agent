# Kỹ năng Tiến hóa (Evolution Protocol)

## 🎯 Mục tiêu
Đảm bảo hệ thống ngày càng thông minh hơn sau mỗi phiên làm việc. Không chỉ tiêu hao token, phải để lại tài sản.

---

## ⚡ Quy trình Đóng gói (Commit Memory)

**BẮT BUỘC thực hiện TRƯỚC KHI tuyên bố hoàn thành:**

### Bước 1: Ghi Kiến thức Mới
- Tạo/cập nhật file trong `knowledge/wiki/` tương ứng với insight
- File thuộc đúng thư mục (projects/, troubleshooting/, core/, skills/)
- Dùng wiki-links và tags chuẩn Obsidian

### Bước 2: Cập nhật Trạng thái
- Ghi tiến độ (Task done/todo) vào `state.md` của dự án
- Nếu là bug fix → Cập nhật `troubleshooting/`
- Nếu là feature mới → Cập nhật `projects/[project]/state.md`

### Bước 3: Cập nhật Index
- Thêm link file mới vào `knowledge/wiki/index.md`
- Đảm bảo graph weaving với các file liên quan

### Bước 4: Gom Pattern
- Nếu phát hiện pattern lặp lại → Tạo quy tắc mới
- Ghi vào `core/changelog.md` với timestamp chính xác

---

## 🗺️ Changelog Entry Format

```markdown
## [YYYY-MM-DD HH:mm] - [Task Name]

### Changes
- Added: [[file-path]] - Description
- Updated: [[file-path]] - What changed
- Fixed: Issue #X - Root cause & solution

### Anti-Patterns Learned
- ❌ [What went wrong]
- ✅ [How to avoid next time]

### Next Steps
- [ ] Todo item 1
- [ ] Todo item 2
```

---

## 📋 Checklist Tiến hóa

- [ ] Kiến thức mới đã được ghi vào wiki/
- [ ] State.md đã được cập nhật
- [ ] Index.md có link mới
- [ ] Changelog.md có entry với timestamp
- [ ] Anti-patterns đã được ghi nhận
- [ ] Không có thông tin duplicate

---

## ⚠️ Anti-Patterns

| Anti-Pattern | Giải pháp |
|--------------|-----------|
| ❌ Hoàn thành task nhưng không ghi wiki | ✅ Luôn commit memory trước khi done |
| ❌ Ghi changelog chung chung | ✅ Chi tiết: what, why, how, next steps |
| ❌ Quên cập nhật index.md | ✅ Index update là bắt buộc |
| ❌ Ghi trùng thông tin ở nhiều nơi | ✅ SSOT - mỗi thông tin 1 nơi |
| ❌ Không ghi anti-patterns | ✅ Lessons learned là tài sản quý |

---

## 🔗 Liên kết

- [[knowledge-management]] - Quản lý wiki structure
- [[communication-protocol]] - Báo cáo không fluff
- [[verification-protocol]] - Kiểm chứng trước khi hoàn thành

#skill #evolution #workflow #sop