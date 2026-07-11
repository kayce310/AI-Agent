@echo off
:loop
echo [coral] Starting Coral... %date% %time%
node --max-old-space-size=1024 dist/scripts/start-telegram.js
echo [coral] Exited with code %errorlevel%. Restarting in 3s...
timeout /t 3 /nobreak >nul
goto loop
