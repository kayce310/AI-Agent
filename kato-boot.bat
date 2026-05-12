@echo off
echo 🚀 Kato Bootstrapper v1.0
echo -------------------------

:: 1. Tự động sửa lỗi Execution Policy cho phiên làm việc hiện tại
echo [1/3] Setting execution policy...
powershell -Command "Set-ExecutionPolicy -Scope Process -ExecutionPolicy RemoteSigned -Force"

:: 2. Kiểm tra và cài đặt dependencies
echo [2/3] Checking dependencies...
if not exist node_modules (
    echo Installing dependencies...
    call npm install
) else (
    echo Dependencies already installed.
)

:: 3. Khởi động bot
echo [3/3] Starting Kato Discord Bot...
call npm run start:discord

pause