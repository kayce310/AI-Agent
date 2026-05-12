# Discord Bot: ts-node/esm Crash on Node.js v18+ (Object: null prototype)

## 🚨 Triệu chứng
- Error message:
  ```
  [Object: null prototype] {
    Symbol(nodejs.util.inspect.custom): [Function: [nodejs.util.inspect.custom]]
  }
  ```
- Khi nào xảy ra: Chạy `npm run start:discord` (dùng `node --loader ts-node/esm`) trên Node.js v18+, đặc biệt v24
- Ảnh hưởng: Bot không khởi động được, process crash ngay lập tức mà không in ra lỗi rõ ràng

## 🔍 Nguyên nhân Gốc rễ
1. **Incompatibility**: `--experimental-loader` API của Node.js thay đổi từ v18+, `ts-node/esm` loader không tương thích với Node.js v22/v24
2. **Silent crash**: Lỗi được throw dưới dạng `null prototype object` — không có stack trace, không có message
3. **Script cũ**: `package.json` script `start:discord` dùng `node --loader ts-node/esm` — deprecated và broken trên Node v24

## ✅ Giải pháp

### Bước 1: Thay thế runner từ `ts-node/esm` sang `tsx`
```json
// package.json (TRƯỚC - BỊ LỖI)
"start:discord": "node --loader ts-node/esm src/scripts/start-discord.ts"

// package.json (SAU - ĐÃ SỬA)
"start:discord": "npx tsx src/scripts/start-discord.ts"
```

### Bước 2: Chạy trực tiếp qua cmd (bypass PowerShell Execution Policy)
```cmd
:: PowerShell block npm.ps1 → dùng cmd thay thế
cmd /c "cd /d e:\Test\AI-Agent && npx tsx src/scripts/start-discord.ts"
```

### Bước 3: Dùng kato-boot.bat (khuyến nghị)
```
kato-boot.bat   ← double-click hoặc chạy từ cmd
```

## 🛡️ Phòng ngừa
- Luôn dùng `tsx` thay vì `ts-node/esm` cho ESM TypeScript project trên Node v18+
- `kato-boot.bat` đã được cập nhật: không còn gọi PowerShell, dùng `npx tsx` trực tiếp
- `package.json` đã được cập nhật: script `start:discord` dùng `npx tsx`
- `tsx` có sẵn trong `devDependencies` — không cần cài thêm

## 📋 Lỗi Phụ: PowerShell Execution Policy
- **Triệu chứng**: `npm : File cannot be loaded because running scripts is disabled on this system`
- **Nguyên nhân**: PowerShell block `.ps1` scripts theo mặc định trên Windows
- **Fix**: Chạy qua `cmd` thay vì PowerShell, hoặc set policy:
  ```powershell
  Set-ExecutionPolicy -Scope Process -ExecutionPolicy RemoteSigned -Force
  ```

## 🔗 Liên kết
- [[../skills/module-discord]] - Hướng dẫn khởi động Discord module
- [[../core/changelog]] - Lịch sử thay đổi

#troubleshooting #discord #nodejs #tsx #typescript
