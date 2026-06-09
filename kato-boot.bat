@echo off
title Kato Discord Bot
setlocal enabledelayedexpansion

pushd %~dp0
set PATH=%PATH%;%AppData%\npm

echo ============================================
echo    Kato Bootstrapper v2.1
echo ============================================

:: ─── B1: Kiem tra va kill instance cu ───
echo.
echo [B1] Checking for running Kato instances...

:: Kill by port binding
set "PORT=47832"
for /f "skip=4 tokens=5" %%p in ('netstat -ano ^| find "%PORT%"') do (
    taskkill /F /PID %%p >nul 2>&1
    timeout /t 1 /nobreak >nul
)
echo   [OK] Port %PORT% is free.

:: ─── B2: Chon model tu 9router ───
echo.
echo [B2] Select model from 9router...
echo.

:: Check 9router is running first
powershell -NoProfile -Command "try { Invoke-RestMethod 'http://localhost:20128/v1/models' -EA Stop >$null; exit 0 } catch { exit 1 }"
if errorlevel 1 (
    echo   [ERROR] 9router is not running at http://localhost:20128
    echo   Please start 9router first then try again.
    pause
    exit /b 1
)

:: Run model selector (PS script prompts user to pick)
powershell -NoProfile -ExecutionPolicy RemoteSigned -File "scripts/select-model.ps1"
if errorlevel 1 (
    echo   [ERROR] Model selection failed.
    pause
    exit /b 1
)

:: Read selected model from temp file
if not exist "%TEMP%\kato-selected-model.txt" (
    echo   [ERROR] No model selected.
    pause
    exit /b 1
)
set /p SELECTED_MODEL=<"%TEMP%\kato-selected-model.txt"
del "%TEMP%\kato-selected-model.txt" 2>nul
echo   [OK] Selected model: %SELECTED_MODEL%

:: ─── B3: Khoi dong bot voi model da chon ───
echo.
echo [B3] Updating config and starting Kato...
echo.

:: Update providers.json with selected model
powershell -NoProfile -Command "& { $json = Get-Content 'config/providers.json' -Raw; $p = ConvertFrom-Json -InputObject $json; $mid = '%SELECTED_MODEL%'; $p.providers[0].models[0].id = $mid; $p.providers[0].models[0].label = '9Router - ' + $mid; $out = ConvertTo-Json $p -Depth 10; Set-Content 'config/providers.json' -Value $out -Encoding ASCII; }"
echo   [OK] Model written to config/providers.json

:: Update AI_MODEL in .env
powershell -NoProfile -Command "& { $mid = '%SELECTED_MODEL%'; $envContent = Get-Content '.env' -Raw; if ($envContent -match '(?m)^AI_MODEL=.*$') { $envContent = $envContent -replace '(?m)^AI_MODEL=.*$', ('AI_MODEL=' + $mid); } else { $envContent = $envContent + [Environment]::NewLine + ('AI_MODEL=' + $mid); } Set-Content '.env' -Value $envContent -Encoding ASCII; }"
echo   [OK] Model written to .env
echo.
echo   [B3] Starting Kato Discord Bot...
echo   Live logs below (press Ctrl+C to stop):
echo.

:: Run bot in same window - shows live logs
npx tsx src/scripts/start-discord.ts

echo.
echo   [B3] Bot process ended (exit code: %ERRORLEVEL%).
echo   Scroll up to see full log.
echo   Press any key to close this window.
pause >nul

endlocal