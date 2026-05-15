@echo off
title Kato Discord Bot
echo 🚀 Kato Bootstrapper v1.10
echo -------------------------

:: 0. Kill cac instance cu
echo [0/3] Cleaning old instances...
taskkill /F /FI "WINDOWTITLE eq Kato*" /IM node.exe 2>nul
taskkill /F /FI "WINDOWTITLE eq tsx*" /IM node.exe 2>nul
timeout /t 2 /nobreak >nul

:: Clean stale PID file
if exist "%TEMP%\kato-discord.pid" del "%TEMP%\kato-discord.pid" 2>nul

echo    Done.

:: 1. Kiem tra dependencies
echo [1/3] Checking dependencies...
if not exist node_modules (
    echo    Installing dependencies...
    call npm install
) else (
    echo    Dependencies already installed.
)

:: 2. Khoi dong bot
echo [2/3] Starting Kato Discord Bot...
echo    Bot dang khoi dong... Kiem tra Discord de xac nhan.
npx tsx src/scripts/start-discord.ts

echo.
pause