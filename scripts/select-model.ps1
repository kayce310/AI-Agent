#!/usr/bin/env pwsh
# Kato Model Selector - fetches models from 9router and prompts user
$ErrorActionPreference = "Stop"

try {
    $r = Invoke-RestMethod -Uri "http://localhost:20128/v1/models" -ErrorAction Stop
} catch {
    Write-Host "[ERROR] 9router not running at http://localhost:20128"
    Write-Host "Please start 9router first."
    exit 1
}

$models = $r.data
$i = 0
Write-Host ""
foreach ($m in $models) {
    Write-Host "  $i. $($m.id)"
    $i++
}

Write-Host ""
$sel = Read-Host "Enter model number (0-$($i-1))"
$selected = $models[[int]$sel].id
$selected | Out-File -FilePath "$env:TEMP\kato-selected-model.txt" -Encoding ASCII -Force
Write-Host ""
Write-Host "  [OK] Selected model: $selected"
exit 0