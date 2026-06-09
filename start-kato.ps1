kat#!/usr/bin/env pwsh
# Kato Bootloader - Start Script v1.11 (port binding)
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope Process

# 0. Kill old instances via port binding
Write-Host "[0/3] Cleaning old instances..."
$lockPort = 47832
$connections = netstat -ano | Select-String ":$lockPort"
if ($connections) {
    foreach ($conn in $connections) {
        $parts = $conn -split '\s+'
        $procId = $parts[-1]
        Write-Host "    Killing stale instance on port $lockPort (PID $procId)..."
        Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
    }
    Start-Sleep -Seconds 2
}

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
Write-Host "    Bot dang khoi dong... Kiem tra Discord de xac nhan."
npm run start
