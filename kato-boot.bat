@echo off
title Kato Discord Bot
echo 🚀 Kato Bootstrapper v1.13
echo -------------------------

:: 0. Kill cac instance cu bang port binding
echo [0/3] Cleaning old instances...
for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":47832"') do (
    echo    Killing stale instance (PID %%p)...
    taskkill /F /PID %%p >nul 2>&1
    timeout /t 2 /nobreak >nul
)
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
start "Kato Discord Bot" npx tsx src/scripts/start-discord.ts
echo    Bot dang khoi dong... Kiem tra Discord de xac nhan.
timeout /t 3 /nobreak >nul
exit /b
