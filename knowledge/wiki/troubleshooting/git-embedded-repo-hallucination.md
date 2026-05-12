# Troubleshooting: Git Embedded Repo + Hallucination khi Push

> **Severity**: CRITICAL
> **Date**: 2026-05-12
> **Symptom**: AI tự tin báo "push thành công" nhưng thực tế thất bại
> **Root Cause**: Shell Integration Unavailable → AI không thấy lỗi → hallucination

---

## 🔴 Mô tả lỗi

Khi làm việc với Git trên các project có chứa thư mục con đã initialized sẵn (embedded `.git`), AI Agent có thể mắc 4 lỗi mắc xích:

1. **Init sai chỗ**: `git init` ở thư mục cha thay vì thư mục code chính
2. **Xóa sạch lịch sử**: Dùng `Remove-Item -Recurse -Force` để xóa `.git` thư mục con
3. **Unrelated Histories**: Push kho Git mới lên GitHub nhánh cũ → bị reject
4. **Hallucination**: Báo "thành công" dù thực tế thất bại (do terminal không trả output)

---

## ✅ SOP Xử lý Git Clone / Embedded Repo

### Tình huống 1: Clone repo về và thấy `.git` bên trong

```bash
# Sai: init ở thư mục cha
cd E:\Test\AI-Agent-Multi && git init

# Đúng: Chỉ init ở thư mục code chính
cd E:\Test\AI-Agent && git init
```

### Tình huống 2: Phát hiện embedded repo (`.git` con)

```bash
# ❌ Sai: Xóa sạch .git con (mất lịch sử)
Remove-Item -Recurse -Force path\.git

# ✅ Đúng 1: Dùng Git Submodule
git submodule add <repo-url> path/to/submodule

# ✅ Đúng 2: Giữ nguyên, không đụng vào (nếu là dependency)
# Chỉ cần thêm vào .gitignore của project cha

# ✅ Đúng 3: Nếu thực sự muốn gộp (flatten):
# - Clone riêng repo con
# - Copy lịch sử qua bằng git format-patch
# - Hoặc dùng git subtree
git subtree add --prefix=path/to/submodule <repo-url> main
```

### Tình huống 3: Push sau khi Init kho Git mới

```bash
# ❌ Sai: Force push không kiểm tra
git push -u origin main --force

# ✅ Đúng: Kiểm tra remote branch trước
git remote -v
git fetch origin
git branch -a

# Nếu remote đã có code:
git pull origin main --allow-unrelated-histories
# Resolve conflicts, sau đó push
git push -u origin main

# Nếu remote chưa có code:
git push -u origin main
```

---

## 🚨 Phòng chống Hallucination Git

### Luật 1: KHÔNG bao giờ báo "thành công" khi chưa verify

```
B1: Execute command
B2: Chờ và phân tích output (stdout/stderr)
B3: Nếu output trống hoặc không rõ ràng → verify bằng lệnh khác
B4: Chỉ kết luận "thành công" khi có bằng chứng xác thực
```

### Luật 2: Verify command bằng lệnh kiểm tra độc lập

```bash
# Sau khi push, KIỂM TRA:
git status
git log --oneline -3
git remote -v

# Hoặc dùng:
curl -s https://api.github.com/repos/kayce310/AI-Agent/commits | head -5
```

### Luật 3: Nếu thấy "Shell Integration Unavailable"

```
→ KHÔNG trust command output
→ Chạy lệnh dạng: command 2>&1 | Tee-Object -FilePath output.log
→ Đọc file log để check kết quả thực tế
→ Hoặc hỏi user xác nhận kết quả
```

---

## 📋 Checklist cho session làm việc Git

- [ ] Kiểm tra `pwd` trước khi `git init`
- [ ] `git status` kiểm tra trạng thái trước khi xóa
- [ ] `git remote -v` biết mình đang kết nối với remote nào
- [ ] `git branch` xác định nhánh hiện tại
- [ ] Sau mỗi lệnh git quan trọng: verify = `git log` + `git status`
- [ ] KHÔNG xóa `.git` con bằng `Remove-Item -Recurse -Force`
- [ ] Báo cáo lỗi thật, không hallucination "thành công"

---

## 📎 Reference

- [Git Submodules](https://git-scm.com/book/en/v2/Git-Tools-Submodules)
- [Git Subtrees](https://www.atlassian.com/git/tutorials/git-subtree)
- [SOP Handling Terminal](knowledge/wiki/skills/state-management.md)