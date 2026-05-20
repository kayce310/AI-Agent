@echo off
title Kato Discord Bot
echo 🚀 Kato Bootstrapper v1.10
echo -------------------------

:: 0. Kill cac instance cu
echo [0/3] Cleaning old instances...

:: Kill by PID from PID file (precise, no collateral damage)
if exist "%TEMP%\kato-discord.pid" (
    for /f "tokens=*" %%a in (%TEMP%\kato-discord.pid) do (
        taskkill /F /PID %%a 2>nul
    )
    del "%TEMP%\kato-discord.pid" 2>nul
    timeout /t 2 /nobreak >nul
)

:: Fallback: kill by window title (legacy)
taskkill /F /FI "WINDOWTITLE eq Kato*" /IM node.exe 2>nul
timeout /t 1 /nobreak >nul

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