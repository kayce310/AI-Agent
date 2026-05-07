# Kỹ năng Viết Code (Coding Standards)

## 🎯 Mục tiêu
Đảm bảo codebase luôn maintainable, modular và tương thích với các hệ thống mở rộng.

---

## ⚡ Quy tắc Cốt lõi

### 1. Module hóa Cao độ
- Mọi nền tảng giao tiếp (Discord, Telegram, Slack) → Module độc lập trong `src/modules/`
- Core agent không được hardcode phụ thuộc vào bất kỳ platform nào
- Mỗi module có interface rõ ràng, có thể hot-swap

### 2. Tương thích MCP (Model Context Protocol)
- Chức năng mở rộng phải hướng tới chuẩn MCP
- Ưu tiên tool-based architecture over monolithic functions

### 3. Fail-Fast Principle
```typescript
// ❌ KHÔNG ĐƯỢC: Nuốt lỗi
try { doSomething(); } catch (e) {}

// ✅ PHẢI LÀM: Văng lỗi rõ ràng kèm context
try { doSomething(); } catch (e) {
  logger.error(`[ModuleName] Failed at step X: ${e.message}`, { context: {...} });
  throw e; // Re-throw để caller xử lý
}
```

---

## 🗺️ Quy trình Code Review Checklist

1. **Kiến trúc**
   - [ ] Module độc lập, không circular dependency
   - [ ] Interface rõ ràng giữa các layer

2. **Error Handling**
   - [ ] Không swallow errors
   - [ ] Log đầy đủ context
   - [ ] Có plan rollback

3. **Testing**
   - [ ] Có test cho happy path
   - [ ] Có test cho error cases
   - [ ] Chạy test trước khi commit

---

## ⚠️ Anti-Patterns

| Anti-Pattern | Giải pháp |
|--------------|-----------|
| ❌ Hardcode platform-specific logic in core | ✅ Abstract thành interface, inject implementation |
| ❌ Swallow errors silently | ✅ Log + throw với đầy đủ context |
| ❌ Monolithic functions > 50 lines | ✅ Tách thành smaller functions với single responsibility |
| ❌ Magic strings/numbers | ✅ Extract thành constants hoặc enums |

---

## 🔗 Liên kết

- [[verification-protocol]] - Kiểm chứng code trước khi hoàn thành
- [[big-data-processing]] - Xử lý dữ liệu lớn với chunking
- [[automation-directives]] - Thiết kế automation systems

#skill #coding #standards #workflow