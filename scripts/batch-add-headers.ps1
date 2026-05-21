# Batch add @depends-on headers to all source files
$root = "e:\Test\AI-Agent"

# Get all .ts files in src/
$files = Get-ChildItem -Path "$root\src" -Recurse -Filter "*.ts" | Select-Object -ExpandProperty FullName

$added = 0
$skipped = 0

foreach ($file in $files) {
    $content = Get-Content $file -Raw -Encoding UTF8
    
    # Skip if already has @file header
    if ($content -match '@file\s') {
        $skipped++
        continue
    }
    
    $relPath = $file.Substring($root.Length + 1)
    $filename = [System.IO.Path]::GetFileNameWithoutExtension($file)
    
    # Determine header based on path
    $header = switch -Wildcard ($relPath) {
        "src/core/engine/*" {
            "/**
 * @file $filename — Core Engine component
 * @layer core
 * @depends-on src/core/tools/tool-registry.ts, src/core/llm/model-adapter.ts
 * @imported-by src/scripts/start-discord.ts
 * @owner core-engine
 */`n`n"
        }
        "src/core/tools/*" {
            "/**
 * @file $filename — Tool plugin
 * @layer core
 * @depends-on src/core/tools/tool-gateway.ts, src/core/tools/_shared.ts
 * @imported-by src/core/tools/tool-registry.ts
 * @owner core-tools
 */`n`n"
        }
        "src/core/security/*" {
            "/**
 * @file $filename — Security module
 * @layer core
 * @depends-on (none — standalone)
 * @imported-by src/core/engine/engine.ts
 * @owner core-security
 */`n`n"
        }
        "src/core/memory/*" {
            "/**
 * @file $filename — Memory module
 * @layer core
 * @depends-on src/core/types.ts
 * @imported-by src/core/engine/engine.ts
 * @owner core-memory
 */`n`n"
        }
        "src/core/patterns/*" {
            "/**
 * @file $filename — Agent pattern
 * @layer core
 * @depends-on (none — standalone)
 * @imported-by src/core/patterns/index.ts
 * @owner core-patterns
 */`n`n"
        }
        "src/core/llm/*" {
            "/**
 * @file $filename — LLM adapter
 * @layer core
 * @depends-on src/core/types.ts
 * @imported-by src/core/engine/engine.ts
 * @owner core-llm
 */`n`n"
        }
        "src/core/observability/*" {
            "/**
 * @file $filename — Observability module
 * @layer core
 * @depends-on src/core/types.ts
 * @imported-by src/core/engine/engine.ts
 * @owner core-observability
 */`n`n"
        }
        "src/core/sop/*" {
            "/**
 * @file $filename — SOP module
 * @layer core
 * @depends-on src/core/types.ts
 * @imported-by src/core/engine/engine.ts
 * @owner core-sop
 */`n`n"
        }
        "src/core/gnap/*" {
            "/**
 * @file $filename — GNAP protocol
 * @layer core
 * @depends-on src/core/types.ts
 * @imported-by src/core/engine/engine.ts
 * @owner core-gnap
 */`n`n"
        }
        "src/core/mcp/*" {
            "/**
 * @file $filename — MCP module
 * @layer core
 * @depends-on src/core/types.ts
 * @imported-by src/core/engine/engine.ts
 * @owner core-mcp
 */`n`n"
        }
        "src/core/agents/*" {
            "/**
 * @file $filename — Agent module
 * @layer core
 * @depends-on src/core/types.ts, src/core/tools/tool-registry.ts
 * @imported-by src/core/engine/engine.ts
 * @owner core-agents
 */`n`n"
        }
        "src/modules/*" {
            "/**
 * @file $filename — Peripheral adapter
 * @layer modules
 * @depends-on src/core/index.ts
 * @imported-by src/scripts/start-discord.ts
 * @owner modules
 */`n`n"
        }
        "src/scripts/*" {
            "/**
 * @file $filename — Startup script
 * @layer scripts
 * @depends-on src/core/index.ts, src/modules/discord/index.ts
 * @owner infrastructure
 */`n`n"
        }
        "src/index.ts" {
            "/**
 * @file index.ts — Core barrel export
 * @layer core
 * @depends-on (all core modules)
 * @imported-by src/scripts/start-discord.ts, src/modules/*
 * @owner core
 */`n`n"
        }
        "src/core/index.ts" {
            "/**
 * @file index.ts — Core barrel export
 * @layer core
 * @depends-on (all core modules)
 * @imported-by src/modules/*
 * @owner core
 */`n`n"
        }
        "src/core/evolution.ts" {
            "/**
 * @file evolution.ts — Evolution engine
 * @layer core
 * @depends-on src/core/types.ts
 * @imported-by src/core/engine/engine.ts
 * @owner core-evolution
 */`n`n"
        }
        "src/core/hooks.ts" {
            "/**
 * @file hooks.ts — Event lifecycle hooks
 * @layer core
 * @depends-on (none — standalone)
 * @imported-by src/core/engine/engine.ts
 * @owner core-hooks
 */`n`n"
        }
        "src/core/types.ts" {
            "/**
 * @file types.ts — Core type definitions
 * @layer core
 * @depends-on (none — standalone)
 * @imported-by (all core modules)
 * @owner core-types
 */`n`n"
        }
        default {
            "/**
 * @file $filename — Source module
 * @layer core
 * @depends-on src/core/types.ts
 * @owner core
 */`n`n"
        }
    }
    
    # Prepend header to file
    $newContent = $header + $content
    Set-Content $file $newContent -Encoding UTF8 -NoNewline
    Write-Host "Added header: $relPath"
    $added++
}

Write-Host "`nSummary: $added headers added, $skipped skipped"
