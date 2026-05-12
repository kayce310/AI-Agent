@echo off
title Kato Discord Bot
echo 🚀 Kato Bootstrapper v1.3
echo -------------------------

:: 0. Kill tất cả instance Kato cũ (discord bot + tsx)
echo [0/3] Cleaning old instances...
taskkill /F /IM node.exe /FI "WINDOWTITLE eq Kato*" 2>nul
taskkill /F /IM node.exe /FI "WINDOWTITLE eq tsx*" 2>nul
timeout /t 2 /nobreak >nul
echo    Done.

:: 1. Kiểm tra và cài đặt dependencies
echo [1/3] Checking dependencies...
if not exist node_modules (
    echo    Installing dependencies...
    call npm install
) else (
    echo    Dependencies already installed.
)

:: 2. Khởi động bot bằng tsx (tương thích Node v18+)
echo [2/3] Starting Kato Discord Bot...
echo    Bot đang khởi động... Kiểm tra Discord để xác nhận.
npx tsx src/scripts/start-discord.ts

pause
