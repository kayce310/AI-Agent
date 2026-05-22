# Kỹ năng Quản lý Trạng thái (State Management)

## 🎯 Mục tiêu
Tách Data Plane khỏi Control Plane. Agent không tự sửa JSON bằng tay; mọi thao tác trạng thái đi qua `kato-state-manager`.

---

## 📍 Single Source of Truth

- State file: `knowledge/workspace/state.json`
- Tool/CLI: `npm run state -- <command>`
- Implementation: `src/core/state-manager.ts`
- CLI entry: `src/scripts/kato-state-manager.ts`

---

## ⚡ Commands

```bash
npm run state:init -- "task name"
npm run state:read
npm run state -- ready "Lead AI Engineer" coding-standards verification-protocol state-management
```

---

## 🛡️ Safety Guarantees

- Atomic write qua file `.tmp` rồi rename.
- Backup bản trước đó tại `state.json.bak.1`.
- Concurrency lock bằng `state.json.lock`.
- SHA-256 checksum để phát hiện corruption.
- Structured Error JSON khi đọc/ghi lỗi.

---

## ⚠️ Anti-Patterns

| Anti-Pattern | Giải pháp |
|--------------|-----------|
| ❌ Agent tự edit `state.json` | ✅ Gọi `kato-state-manager` |
| ❌ Ghi state không backup | ✅ Tool tự tạo `.bak.1` |
| ❌ Ignore checksum mismatch | ✅ Dừng và báo Structured Error JSON |
| ❌ Chạy task khi `UNINITIALIZED` | ✅ Đọc router/index/skill rồi mark `READY` |

---

## 🔗 Liên kết

- [[../AGENTS]] - Router khởi động
- [[verification-protocol]] - Kiểm chứng state operations
- [[evolution-protocol]] - Commit memory sau phiên

#skill #state #data-plane #workflow