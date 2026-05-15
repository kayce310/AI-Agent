@echo off
rem Kill MATLAB process tree safely
rem Usage: call matlab_kill.bat

rem Attempt to kill all matlab.exe instances and their child processes

rem /F = force, /T = kill child processes, /IM = image name

for /f "tokens=2 delims=," %%i in ('tasklist /fo csv /nh ^| findstr /i "matlab.exe"') do (
    taskkill /F /T /PID %%i 2>nul
)

rem Fallback: kill by image name if above fails (e.g., multiple instances)

taskkill /F /T /IM matlab.exe 2>nul

if %errorlevel%==0 (
    echo [OK] MATLAB process tree terminated.
) else (
    echo [INFO] No running MATLAB process found.
)


---
#batch #script