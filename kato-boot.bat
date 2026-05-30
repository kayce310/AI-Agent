@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul 2>&1
title Kato Discord Bot
echo [START] Kato Bootstrapper v1.13
echo -------------------------

:: 0. Try to clean old instances
echo [0/3] Cleaning old instances...
taskkill /F /IM node.exe >nul 2>&1
taskkill /F /IM npx.exe >nul 2>&1
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
start "Kato Discord Bot" npx tsx src/scripts/start-discord.ts
echo    Bot dang khoi dong... Kiem tra Discord de xac nhan.
timeout /t 3 /nobreak >nul
endlocal
exit /b 0
