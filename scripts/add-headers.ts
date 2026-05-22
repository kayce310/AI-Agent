#!/usr/bin/env tsx
/**
 * @file add-headers.ts — Batch add @depends-on headers to source files
 * @layer scripts
 * @owner infrastructure
 *
 * Usage: npx tsx scripts/add-headers.ts
 */

import * as fs from 'fs';
import * as path from 'path';

const ROOT = process.cwd();
const SRC_DIR = path.join(ROOT, 'src');

interface HeaderTemplate {
  pattern: string;
  header: (filename: string) => string;
}

const TEMPLATES: HeaderTemplate[] = [
  { pattern: 'src/core/engine/', header: (f) => `/**\n * @file ${f} — Core Engine component\n * @layer core\n * @depends-on src/core/tools/tool-registry.ts, src/core/llm/model-adapter.ts\n * @owner core-engine\n */` },
  { pattern: 'src/core/tools/', header: (f) => `/**\n * @file ${f} — Tool plugin\n * @layer core\n * @depends-on src/core/tools/tool-gateway.ts, src/core/tools/_shared.ts\n * @imported-by src/core/tools/tool-registry.ts\n * @owner core-tools\n */` },
  { pattern: 'src/core/security/', header: (f) => `/**\n * @file ${f} — Security module\n * @layer core\n * @depends-on (none — standalone)\n * @imported-by src/core/engine/engine.ts\n * @owner core-security\n */` },
  { pattern: 'src/core/memory/', header: (f) => `/**\n * @file ${f} — Memory module\n * @layer core\n * @depends-on src/core/types.ts\n * @imported-by src/core/engine/engine.ts\n * @owner core-memory\n */` },
  { pattern: 'src/core/patterns/', header: (f) => `/**\n * @file ${f} — Agent pattern\n * @layer core\n * @depends-on (none — standalone)\n * @imported-by src/core/patterns/index.ts\n * @owner core-patterns\n */` },
  { pattern: 'src/core/llm/', header: (f) => `/**\n * @file ${f} — LLM adapter\n * @layer core\n * @depends-on src/core/types.ts\n * @imported-by src/core/engine/engine.ts\n * @owner core-llm\n */` },
  { pattern: 'src/core/observability/', header: (f) => `/**\n * @file ${f} — Observability module\n * @layer core\n * @depends-on src/core/types.ts\n * @imported-by src/core/engine/engine.ts\n * @owner core-observability\n */` },
  { pattern: 'src/core/sop/', header: (f) => `/**\n * @file ${f} — SOP module\n * @layer core\n * @depends-on src/core/types.ts\n * @imported-by src/core/engine/engine.ts\n * @owner core-sop\n */` },
  { pattern: 'src/core/gnap/', header: (f) => `/**\n * @file ${f} — GNAP protocol\n * @layer core\n * @depends-on src/core/types.ts\n * @imported-by src/core/engine/engine.ts\n * @owner core-gnap\n */` },
  { pattern: 'src/core/mcp/', header: (f) => `/**\n * @file ${f} — MCP module\n * @layer core\n * @depends-on src/core/types.ts\n * @imported-by src/core/engine/engine.ts\n * @owner core-mcp\n */` },
  { pattern: 'src/core/agents/', header: (f) => `/**\n * @file ${f} — Agent module\n * @layer core\n * @depends-on src/core/types.ts, src/core/tools/tool-registry.ts\n * @imported-by src/core/engine/engine.ts\n * @owner core-agents\n */` },
  { pattern: 'src/modules/', header: (f) => `/**\n * @file ${f} — Peripheral adapter\n * @layer modules\n * @depends-on src/core/index.ts\n * @imported-by src/scripts/start-discord.ts\n * @owner modules\n */` },
  { pattern: 'src/scripts/', header: (f) => `/**\n * @file ${f} — Startup script\n * @layer scripts\n * @depends-on src/core/index.ts, src/modules/discord/index.ts\n * @owner infrastructure\n */` },
  { pattern: 'src/index.ts', header: (f) => `/**\n * @file ${f} — Entry point\n * @layer core\n * @depends-on (all core modules)\n * @imported-by (none — top-level)\n * @owner core\n */` },
  { pattern: 'src/core/index.ts', header: (f) => `/**\n * @file ${f} — Core barrel export\n * @layer core\n * @depends-on (all core modules)\n * @imported-by src/modules/*\n * @owner core\n */` },
  { pattern: 'src/core/evolution.ts', header: (f) => `/**\n * @file ${f} — Evolution engine\n * @layer core\n * @depends-on src/core/types.ts\n * @imported-by src/core/engine/engine.ts\n * @owner core-evolution\n */` },
  { pattern: 'src/core/hooks.ts', header: (f) => `/**\n * @file ${f} — Event lifecycle hooks\n * @layer core\n * @depends-on (none — standalone)\n * @imported-by src/core/engine/engine.ts\n * @owner core-hooks\n */` },
  { pattern: 'src/core/types.ts', header: (f) => `/**\n * @file ${f} — Core type definitions\n * @layer core\n * @depends-on (none — standalone)\n * @imported-by (all core modules)\n * @owner core-types\n */` },
];

function getHeaderForFile(filePath: string): string | null {
  const relPath = path.relative(ROOT, filePath).replace(/\\/g, '/');
  const filename = path.basename(filePath, '.ts');

  for (const tpl of TEMPLATES) {
    if (relPath === tpl.pattern || relPath.startsWith(tpl.pattern)) {
      return tpl.header(filename);
    }
  }
  return null;
}

function hasHeader(content: string): boolean {
  return content.includes('@file') && content.includes('@depends-on');
}

function addHeaderToFile(filePath: string): boolean {
  const content = fs.readFileSync(filePath, 'utf8');
  if (hasHeader(content)) return false;

  const header = getHeaderForFile(filePath);
  if (!header) return false;

  // Prepend header before any existing content
  const newContent = header + '\n\n' + content;
  fs.writeFileSync(filePath, newContent, 'utf8');
  return true;
}

function walkDir(dir: string, callback: (file: string) => void): void {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkDir(fullPath, callback);
    } else if (entry.name.endsWith('.ts')) {
      callback(fullPath);
    }
  }
}

// Main
let added = 0;
let skipped = 0;

walkDir(SRC_DIR, (file) => {
  if (addHeaderToFile(file)) {
    console.log(`Added: ${path.relative(ROOT, file)}`);
    added++;
  } else {
    skipped++;
  }
});

console.log(`\nSummary: ${added} headers added, ${skipped} skipped`);
