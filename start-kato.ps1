#!/usr/bin/env pwsh
# Kato Bootloader - Start Script
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope Process

# 0. Kill old instances
Write-Host "[0/3] Cleaning old instances..."
$pidFile = Join-Path $env:TEMP "kato-discord.pid"
if (Test-Path $pidFile) {
    $oldPid = Get-Content $pidFile
    try {
        Stop-Process -Id $oldPid -Force -ErrorAction SilentlyContinue
    } catch {}
    Remove-Item $pidFile -ErrorAction SilentlyContinue
}
Get-Process -Name node -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowTitle -like "Kato*" } | Stop-Process -Force -ErrorAction SilentlyContinue

# 1. Check dependencies
Write-Host "[1/3] Checking dependencies..."
if (!(Test-Path "node_modules")) {
    Write-Host "    Installing dependencies..."
    npm install
} else {
    Write-Host "    Dependencies already installed."
}

# 2. Start bot
Write-Host "[2/3] Starting Kato Discord Bot..."
npm run start
