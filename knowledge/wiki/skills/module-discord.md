# Skill: Khởi động Module Discord

## File khởi động
- `kato-boot.bat` — Script bootstrapper, chạy qua cmd (không qua PowerShell).

## Nguyên tắc
- **KHÔNG** dùng `node --loader ts-node/esm` — broken trên Node.js v18+/v24.
- **LUÔN** dùng `npx tsx` để chạy TypeScript trực tiếp.
- Chạy qua `cmd` thay vì PowerShell để tránh lỗi Execution Policy.
- **Chạy 1 instance DUY NHẤT** — không restart khi instance cũ chưa kill.

## Cách khởi động (theo thứ tự ưu tiên)
1. **Double-click `kato-boot.bat`** — khuyến nghị, tự động kill process cũ + check deps
2. **Qua npm script** (trong cmd, không phải PowerShell):
   ```cmd
   npm run start:discord
   ```
3. **Chạy trực tiếp** (chỉ khi đã kill instance cũ):
   ```cmd
   cmd /c "cd /d e:\Test\AI-Agent && npx tsx src/scripts/start-discord.ts"
   ```

## Single-Instance Enforcement
- `kato-boot.bat` dùng `taskkill /f /im node.exe` trước khi start để kill instance cũ
- `start-discord.ts` có **PID Lock File** (`os.tmpdir()/kato-bot.pid`):
  - Kiểm tra PID file khi khởi động → nếu process cũ còn sống, throw error
  - Tự cleanup PID file khi bot shutdown (SIGINT/SIGTERM/exit)
  - Nếu PID file cũ orphan (process died nhưng file còn), tự ghi đè

## Anti-Patterns Learned
- ❌ Chạy `npx tsx` nhiều lần mà không kill instance trước → nhiều bot cùng token → duplicate reply
- ❌ `Set<messageId>` dedup guard không đủ nếu có >1 instance — mỗi instance có Set riêng
- ✅ PID Lock File guarantee **1 instance duy nhất** trên toàn hệ thống
- ✅ `taskkill /f /im node.exe` trong batch là cách nhanh nhất để clean slate

## Stack kỹ thuật
- Runner: `tsx` v4+ (thay thế `ts-node/esm`)
- Token: `DISCORD_TOKEN` trong file `.env`
- PID Lock: `fs.writeFileSync(path.join(os.tmpdir(), 'kato-bot.pid'), String(process.pid))`
- Node.js: v18+ tương thích

## Khi nào cần dùng
- Khi user yêu cầu start Discord bot
- Khi cần test module Discord trong môi trường Windows

## Lỗi thường gặp
- `[Object: null prototype]` → xem [[troubleshooting/discord-tsnode-esm-node24]]
- `running scripts is disabled` → chạy qua cmd, không qua PowerShell
- Bot reply 2-3 lần → **đã có instance cũ đang chạy** → kill hết trước khi restart
- Lỗi `require is not defined` → **đã chạy instance cũ chưa fix** → kill + restart
- Cascade sai model (dùng "3") → **đã chạy instance cũ với config cũ** → kill + restart

## Debug Checklist khi bot lỗi
Nếu bot có hành vi kỳ lạ (duplicate reply, lỗi tool, sai config):
1. ❓ Kiểm tra có >1 terminal/node process không? `tasklist | findstr node`
2. 🗑 Kill hết: `kato-boot.bat` tự làm hoặc chạy `taskkill /f /im node.exe`
3. 🧹 Xoá PID lock cũ nếu còn: `del %TEMP%\kato-bot.pid`
4. 🚀 Start lại với `kato-boot.bat`


