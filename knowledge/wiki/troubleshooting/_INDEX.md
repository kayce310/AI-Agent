# 🛠️ Troubleshooting Index - Thư viện Giải pháp Lỗi

Trung tâm giải quyết các lỗi thường gặp trong hệ thống Kato.

---

## ⚡ Nguyên tắc Sử dụng

1. **1 file = 1 lỗi** - Không nhồi nhiều lỗi vào 1 file
2. **Cấu trúc chuẩn**: Error → Root Cause → Solution → Prevention
3. **Wiki-links** cho tất cả thực thể kỹ thuật

---

## 📋 Template Giải pháp Lỗi

```markdown
# [Error Name/Code]

## 🚨 Triệu chứng
- Error message: `[exact error]`
- Khi nào xảy ra: [trigger condition]
- Ảnh hưởng: [impact]

## 🔍 Nguyên nhân Gốc rễ
1. [Root cause 1]
2. [Root cause 2]

## ✅ Giải pháp
```bash
# Step-by-step fix
command1
command2
```

## 🛡️ Phòng ngừa
- [Prevention measure 1]
- [Prevention measure 2]

## 🔗 Liên kết
- [[related-skill]] - Skill liên quan
- [[related-doc]] - Documentation liên quan
```

---

## 📚 Lỗi Đã được Giải quyết

| Lỗi | Mô tả | File |
|-----|-------|------|
| MATLAB `drawnow('nocancel')` unsupported | UI callback báo `Unknown command option` trên một số phiên bản MATLAB | [[matlab-drawnow-nocancel-unsupported]] |

---

## 🔗 Liên kết

- [[../AGENTS]] - Router định tuyến
- [[../skills/_INDEX]] - Danh mục skills
- [[../index]] - Bản đồ tri thức tổng

#troubleshooting #index #error-handling