@echo off
setlocal enabledelayedexpansion
title 9Router Boot Selector v2.1
echo ?? 9Router Boot Selector v2.1
echo -----------------------------
echo.

:: ===== Kiem tra 9router =====
echo [0/3] Checking 9router...
curl -s --max-time 3 -o nul -w "%%{http_code}" http://localhost:20128/v1/models > "%TEMP%\.9router.http" 2>nul
set /p HTTP_CODE=<"%TEMP%\.9router.http"
del "%TEMP%\.9router.http" 2>nul

if "!HTTP_CODE!"=="200" (
    echo    ?? 9router running.
    goto SELECTOR
)

echo    ? Starting 9router from local clone...
if exist "9router\package.json" (
    start "9router" cmd /c "cd /d "%~dp0" && cd 9router && npm run dev"
    timeout /t 20 /nobreak >nul
) else (
    echo [ERROR] Cannot find 9router\
    pause
    exit /b 1
)

:: Verify
echo [1/3] Verifying...
curl -s --max-time 5 -o nul -w "%%{http_code}" http://localhost:20128/v1/models > "%TEMP%\.9router.http" 2>nul
set /p HTTP_CODE=<"%TEMP%\.9router.http"
del "%TEMP%\.9router.http" 2>nul
if not "!HTTP_CODE!"=="200" (
    echo [ERROR] 9router failed to start.
    pause
    exit /b 1
)
echo    ?? 9router started.

:: ===== Chon combo =====
:SELECTOR
echo.
echo [2/3] Fetching combos via 9router-select.ps1...
echo.
powershell -NoProfile -ExecutionPolicy Bypass -File "9router-select.ps1"
set EXIT_CODE=!errorlevel!
if !EXIT_CODE! equ 1 ( echo Cancelled. & pause & exit /b 0 )
if !EXIT_CODE! equ 2 ( echo Invalid. & pause & exit /b 1 )
if !EXIT_CODE! equ 3 ( echo Error. & pause & exit /b 1 )

set /p SID=<"%TEMP%\.9router-sel.txt"
del "%TEMP%\.9router-sel.txt" 2>nul
echo.
echo -----------------------------
echo ?? Combo: !SID!
echo -----------------------------

:: Clean memory
if exist "knowledge\memory\*.json" ( del /q "knowledge\memory\*.json" 2>nul & echo ?? Memory cleaned. )

echo.
set /p GO=Start Kato? (Y/N):
if /i "!GO!"=="Y" ( call kato-boot.bat ) else ( echo Run: kato-boot.bat )
echo.
pause
endlocal