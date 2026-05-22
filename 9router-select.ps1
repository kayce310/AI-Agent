# 9Router Combo Selector — called by 9router-boot.bat
$ErrorActionPreference = 'Stop'

try {
    $m = Invoke-RestMethod "http://localhost:20128/v1/models" -TimeoutSec 15
    if (-not $m.data -or $m.data.Count -eq 0) { throw "No models returned" }

    $cfgPath = Join-Path (Get-Location) "config/providers.json"
    $c = Get-Content $cfgPath -Raw | ConvertFrom-Json
    $cur = $c.providers[0].models[0].id

    Write-Host "Combos:"
    $i = 1
    foreach ($model in $m.data) {
        $mark = ""
        if ($model.id -eq $cur) { $mark = " <-- current" }
        Write-Host ("  [{0}] {1}{2}" -f $i, $model.id, $mark)
        $i++
    }

    Write-Host ""
    $in = Read-Host "Choice (number or ID)"
    if ([string]::IsNullOrWhiteSpace($in)) { exit 1 }

    $sid = $null
    if ($in -match "^\d+$") {
        $idx = [int]$in - 1
        if ($idx -ge 0 -and $idx -lt $m.data.Count) { $sid = $m.data[$idx].id }
    } else {
        $sid = $in
    }

    if (-not $sid) { Write-Host "Invalid"; exit 2 }
    Write-Host ("Selected: {0}" -f $sid)

    $c.providers[0].models[0].id = $sid
    $c.providers[0].models[0].label = "9Router Combo $sid"
    $c | ConvertTo-Json -Depth 10 | Set-Content $cfgPath
    Write-Host "Saved."

    $sid | Out-File (Join-Path $env:TEMP ".9router-sel.txt") -Encoding ascii
}
catch {
    Write-Host ("ERR: {0}" -f $_.Exception.Message)
    exit 3
}