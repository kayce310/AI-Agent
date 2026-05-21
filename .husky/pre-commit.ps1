# Husky pre-commit hook — Governance validation (Windows PowerShell)
# Runs structure validation before allowing commits

Write-Host "🔍 Running structure validation..." -ForegroundColor Cyan

# Run validate-structure.ts with tsx
npx tsx scripts/validate-structure.ts --strict
$EXIT_CODE = $LASTEXITCODE

if ($EXIT_CODE -ne 0) {
    Write-Host ""
    Write-Host "🛑 COMMIT REJECTED — structure violations detected." -ForegroundColor Red
    Write-Host "   Fix errors above, then retry commit."
    Write-Host "   To bypass (NOT recommended): git commit --no-verify"
    exit 1
}

Write-Host "✅ Structure validation passed." -ForegroundColor Green
