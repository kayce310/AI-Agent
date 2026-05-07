# Kỹ năng Kiểm chứng (Verification Protocol)

## 🎯 Mục tiêu
Đảm bảo mọi tuyên bố hoàn thành đều được kiểm chứng thực tế, không dựa trên suy diễn.

---

## ⚡ Quy tắc Vàng

### 1. No Assumptions
- ❌ **CẤM** các từ: "should be fine", "probably passes", "có vẻ đúng", "I think"
- ✅ **PHẢI** chạy lệnh xác thực, đọc toàn bộ output, kiểm tra exit code

### 2. Truth > Speed
- Ưu tiên độ chính xác hơn tốc độ
- Thà chậm mà đúng còn hơn nhanh mà sai

### 3. Rollback Plan
- Luôn có kế hoạch rollback trước khi thực hiện thay đổi phá hủy
- Test trên môi trường sandbox trước khi production

---

## 🗺️ Quy trình Kiểm chứng

```
1. Chạy lệnh/test → Đọc FULL output (không skip)
2. Kiểm tra exit code → 0 = pass, khác 0 = fail
3. Xác thực kết quả thực tế → Không chỉ dựa vào "test passed"
4. Document kết quả → Ghi rõ pass/fail với bằng chứng
```

---

## 📋 Checklist Trước khi Tuyên bố Hoàn thành

- [ ] Đã chạy test/lệnh xác thực chưa?
- [ ] Đã đọc toàn bộ output chưa (không skip warnings)?
- [ ] Exit code có = 0 không?
- [ ] Đã kiểm tra rollback plan chưa?
- [ ] Có bằng chứng cụ thể (log, screenshot, output)?

---

## ⚠️ Anti-Patterns

| Anti-Pattern | Giải pháp |
|--------------|-----------|
| ❌ "Test passed nên chắc chắn ok" | ✅ Đọc full output, kiểm tra warnings/errors |
| ❌ "Code nhìn có vẻ đúng" | ✅ Chạy actual test, không review bằng mắt |
| ❌ "Sẽ ổn thôi, không cần test" | ✅ Luôn test trước khi commit |
| ❌ Bỏ qua warnings trong output | ✅ Investigate mọi warning, kể cả nhỏ |

---

## 🔗 Liên kết

- [[coding-standards]] - Viết code với fail-fast
- [[communication-protocol]] - Báo cáo kết quả không fluff
- [[evolution-protocol]] - Ghi nhận lessons learned

#skill #verification #testing #workflow