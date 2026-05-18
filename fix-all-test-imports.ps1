$testFiles = Get-ChildItem -Path "tests\*.ts" -File

foreach ($file in $testFiles) {
    $content = Get-Content $file.FullName -Raw
    $original = $content

    # Fix leading-slash imports (from '/src/core/...' -> from '../src/core/...')
    $content = $content -replace "from '/src/core/", "from '../src/core/"

    # Fix response-cache -> security/response-cache
    $content = $content -replace "from '\.\./src/core/response-cache\.js'", "from '../src/core/security/response-cache.js'"

    # Fix code-parser -> agents/code-parser
    $content = $content -replace "from '\.\./src/core/code-parser\.js'", "from '../src/core/agents/code-parser.js'"

    # Fix sop-engine -> sop/sop-engine
    $content = $content -replace "from '\.\./src/core/sop-engine'", "from '../src/core/sop/sop-engine.js'"

    # Fix pattern-registry -> patterns/index (or core/pattern-registry)
    $content = $content -replace "from '\.\./src/core/pattern-registry'", "from '../src/core/patterns/index.js'"

    # Fix pattern-selector -> patterns/selector
    $content = $content -replace "from '\.\./src/core/pattern-selector'", "from '../src/core/patterns/index.js'"

    # Fix orchestrator.ts -> engine/orchestrator.js
    $content = $content -replace "from '\.\./src/core/orchestrator\.ts'", "from '../src/core/engine/orchestrator.js'"

    # Fix result-synthes.js -> result-synthesizer.js
    $content = $content -replace "from '\.\./src/core/engine/result-synthes\.js'", "from '../src/core/engine/result-synthesizer.js'"

    # Fix sop-registry -> sop/sop-registry
    $content = $content -replace "from '\.\./src/core/sop-registry'", "from '../src/core/sop/sop-registry.js'"

    if ($content -ne $original) {
        Set-Content $file.FullName -Value $content -NoNewline
        Write-Host "Fixed: $($file.Name)"
    }
}

Write-Host "Done."