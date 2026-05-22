@echo off
echo ?? 9Router Updater v2.0
echo -----------------------

:: Lay source moi nhat tu repo chinh thuc
echo [1/3] Clone latest source...
git clone --depth 1 https://github.com/decolua/9router.git "%TEMP%\9router-update-temp"

:: Copy vao local
echo [2/3] Apply to local folder...
if exist "%TEMP%\9router-update-temp\package.json" (
    xcopy /e /y "%TEMP%\9router-update-temp" "9router\" ^
        /EXCLUDE:9router\.gitignore 2>nul
    rmdir /s /q "%TEMP%\9router-update-temp" 2>nul
    echo    ?? Source updated.
) else (
    echo    ?? Clone failed. Check internet.
    rmdir /s /q "%TEMP%\9router-update-temp" 2>nul
    pause
    exit /b 1
)

:: Cai dependencies
echo [3/3] Install dependencies...
pushd 9router
call npm install
popd

echo.
echo ?? Done. Version moi da san sang.
pause