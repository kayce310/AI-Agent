@echo off
setlocal enabledelayedexpansion
title 9Router Boot Selector v2.2 (External)
echo ?? 9Router Boot Selector v2.2 (External Runtime)
echo ----------------------------------------

:: ===== Read external path from env or use default =====
set "NINE_ROUTER_PATH=e:\Test\9router"
if not "%NINE_ROUTER_EXTERNAL_PATH%"=="" set "NINE_ROUTER_PATH=%NINE_ROUTER_EXTERNAL_PATH%"

:: ===== Kiem tra 9router =====
echo [0/3] Checking 9router on port 20128...
curl -s --max-time 3 -o nul -w "%%{http_code}" http://localhost:20128/v1/models > "%TEMP%\.9router.http" 2>nul
set /p HTTP_CODE=<"%TEMP%\.9router.http"
del "%TEMP%\.9router.http" 2>nul

if "!HTTP_CODE!"=="200" (
    echo    ?? 9router running on port 20128.
    goto SELECTOR
)

echo    ? 9router not running. Starting external runtime...
echo    Path: !NINE_ROUTER_PATH!

if exist "!NINE_ROUTER_PATH!\package.json" (
    start "9router-external" cmd /c "cd /d "!NINE_ROUTER_PATH!" && npm run dev"
    echo    Waiting for 9router to start...
    timeout /t 25 /nobreak >nul
) else (
    echo [ERROR] Cannot find 9router runtime at: !NINE_ROUTER_PATH!
    echo    Set NINE_ROUTER_EXTERNAL_PATH env var or update 9router-boot.bat
    pause
    exit /b 1
)

:: Verify
echo [1/3] Verifying...
curl -s --max-time 5 -o nul -w "%%{http_code}" http://localhost:20128/v1/models > "%TEMP%\.9router.http" 2>nul
set /p HTTP_CODE=<"%TEMP%\.9router.http"
del "%TEMP%\.9router.http" 2>nul
if not "!HTTP_CODE!"=="200" (
    echo [ERROR] 9router failed to start on port 20128.
    echo    Check: !NINE_ROUTER_PATH!
    pause
    exit /b 1
)
echo    ?? 9router started on port 20128.

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
echo ----------------------------------------
echo ?? Combo: !SID!
echo ?? 9Router: !NINE_ROUTER_PATH! (external)
echo ----------------------------------------

:: Clean memory
if exist "knowledge\memory\*.json" ( del /q "knowledge\memory\*.json" 2>nul & echo ?? Memory cleaned. )

echo.
set /p GO=Start Kato? (Y/N):
if /i "!GO!"=="Y" ( call kato-boot.bat ) else ( echo Run: kato-boot.bat )
echo.
pause
endlocal
