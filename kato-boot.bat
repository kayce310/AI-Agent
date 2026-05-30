@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul 2>&1
title Kato Discord Bot
echo [START] Kato Bootstrapper v1.13
echo -------------------------

:: 0. Kill ONLY Kato instance (by port lock 47832)
echo [0/3] Cleaning old Kato instances only...
for /f "tokens=5" %%p in ('netstat -ano 2^>nul ^| findstr ":47832" 2^>nul') do (
    echo    Killing Kato PID %%p (port 47832)...
    taskkill /F /PID %%p >nul 2>&1
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

:: 2. Khoi dong bot IN CURRENT TERMINAL
echo [2/3] Starting Kato Discord Bot (THIS TERMINAL)...
echo -------------------------
npx tsx src/scripts/start-discord.ts
endlocal
exit /b
