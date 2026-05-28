#!/usr/bin/env ts-node
/**
 * validate-structure.ts — Governance Enforcement Engine v1.0
 *
 * Rules:
 *   R1: Folder Ownership — code in wrong folder = VIOLATION
 *   R2: Import Path Integrity — cross-layer imports = VIOLATION
 *   R3: Dependency Header — missing @depends-on = WARNING
 *   R4: Dead Code — exported but never imported = WARNING
 *   R5: Static Security Scan — raw fs/child_process import in tools = VIOLATION
 *
 * Usage: npx tsx scripts/validate-structure.ts [--strict]
 *   --strict: exit code 1 on any violation (for CI/pre-commit)
 */

import * as fs from 'fs';
import * as path from 'path';

const BASE_PATH = path.resolve(process.cwd());
const STRICT = process.argv.includes('--strict');

// ── Rule 1: Folder Ownership ──
// Maps folder → allowed import targets
const FOLDER_RULES: Record<string, { layer: string; allowed: string[]; forbidden: string[] }> = {
  'src/core': {
    layer: 'core',
    allowed: ['src/core'],
    forbidden: ['src/modules'],
  },
  'src/core/tools': {
    layer: 'core',
    allowed: ['src/core'],
    forbidden: ['src/modules'],
  },
  'src/modules': {
    layer: 'modules',
    allowed: ['src/core', 'src/modules'], // modules can import core + sibling modules
    forbidden: [],
  },
  'scripts': {
    layer: 'scripts',
    allowed: ['src/modules'], // scripts may import from modules for utility use only
    forbidden: ['src/core'], // SCRIPTS MUST NOT IMPORT FROM CORE — standalone only
  },
  'tests': {
    layer: 'tests',
    allowed: ['src/core', 'src/modules', 'scripts'],
    forbidden: [],
  },
};

// ── Types ──
interface Violation {
  rule: string;
  file: string;
  line: number;
  message: string;
  severity: 'ERROR' | 'WARNING';
}

const violations: Violation[] = [];

// ── Helpers ──
function readFile(filePath: string): string {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch {
    return '';
  }
}

function getFiles(dir: string, exts: string[]): string[] {
  const results: string[] = [];
  if (!fs.existsSync(dir)) return results;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...getFiles(fullPath, exts));
    } else if (exts.some(ext => entry.name.endsWith(ext))) {
      results.push(fullPath);
    }
  }
  return results;
}

function getImportPaths(content: string): string[] {
  const imports: string[] = [];

  // Strip single-line comments (// ...)
  let cleaned = content.replace(/\/\/.*$/gm, '');
  // Strip block comments (/* ... */)
  cleaned = cleaned.replace(/\/\*[\s\S]*?\*\//g, '');

  // Match: from '...' / from "..."
  const regex = /from\s+['"]([^'"]+)['"]/g;
  let match;
  while ((match = regex.exec(cleaned)) !== null) {
    imports.push(match[1]);
  }
  // Match: import('...')
  const dynRegex = /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
  while ((match = dynRegex.exec(cleaned)) !== null) {
    imports.push(match[1]);
  }
  return imports;
}

function resolveImport(importPath: string, fromFile: string): string | null {
  // Relative import
  if (importPath.startsWith('.')) {
    return path.resolve(path.dirname(fromFile), importPath);
  }
  // Bare import (node_modules) — skip
  return null;
}

// ── Rule 1: Folder Ownership ──
function checkFolderOwnership() {
  for (const [folder, rule] of Object.entries(FOLDER_RULES)) {
    const folderPath = path.join(BASE_PATH, folder);
    const files = getFiles(folderPath, ['.ts', '.js', '.tsx', '.jsx']);

    for (const file of files) {
      const content = readFile(file);
      const imports = getImportPaths(content);

      for (const imp of imports) {
        const resolved = resolveImport(imp, file);
        if (!resolved) continue; // skip node_modules

        // Check forbidden imports
        for (const forbidden of rule.forbidden) {
          const forbiddenPath = path.join(BASE_PATH, forbidden);
          if (resolved.startsWith(forbiddenPath)) {
            const relFile = path.relative(BASE_PATH, file);
            const lineNum = content.substring(0, content.indexOf(imp)).split('\n').length;
            violations.push({
              rule: 'R1-FolderOwnership',
              file: relFile,
              line: lineNum,
              message: `Import '${imp}' crosses layer boundary (${rule.layer} → ${forbidden})`,
              severity: 'ERROR',
            });
          }
        }
      }
    }
  }
}

// ── Rule 2: Import Path Integrity ──
function checkImportIntegrity() {
  const srcFiles = [
    ...getFiles(path.join(BASE_PATH, 'src'), ['.ts', '.js']),
    ...getFiles(path.join(BASE_PATH, 'scripts'), ['.ts', '.js']),
    ...getFiles(path.join(BASE_PATH, 'tests'), ['.ts', '.js']),
  ];

  for (const file of srcFiles) {
    const content = readFile(file);
    const imports = getImportPaths(content);

    for (const imp of imports) {
      // Check deep relative paths (more than 2 levels up)
      if (imp.match(/^\.\.\/\.\.\/\.\./)) {
        const relFile = path.relative(BASE_PATH, file);
        const lineNum = content.substring(0, content.indexOf(imp)).split('\n').length;
        violations.push({
          rule: 'R2-DeepRelative',
          file: relFile,
          line: lineNum,
          message: `Deep relative import '${imp}' — use barrel import instead`,
          severity: 'WARNING',
        });
      }

      // Check broken imports — resolved path must exist on disk
      const resolvedImp = resolveImport(imp, file);
      if (resolvedImp) {
        const candidates = [resolvedImp];
        // Try alternate extensions (TypeScript ESM uses .js, source may be .ts)
        if (path.extname(resolvedImp) === '.js') {
          candidates.push(resolvedImp.replace(/\.js$/, '.ts'));
        } else {
          candidates.push(`${resolvedImp}.ts`, `${resolvedImp}.js`);
        }
        // Try directory/index.ts or directory/index.js
        candidates.push(
          path.join(resolvedImp, 'index.ts'),
          path.join(resolvedImp, 'index.js')
        );

        const fileExists = candidates.some(p => fs.existsSync(p));
        if (!fileExists) {
          const relFile = path.relative(BASE_PATH, file);
          const lineNum = content.substring(0, content.indexOf(imp)).split('\n').length;
          violations.push({
            rule: 'R2-BrokenImport',
            file: relFile,
            line: lineNum,
            message: `Import '${imp}' does not resolve to an existing file`,
            severity: 'ERROR',
          });
        }
      }
    }
  }
}

// ── Rule 3: Dependency Header ──
function checkDependencyHeaders() {
  const srcFiles = getFiles(path.join(BASE_PATH, 'src'), ['.ts', '.js']);

  for (const file of srcFiles) {
    const content = readFile(file);
    const firstLines = content.split('\n').slice(0, 15).join('\n');

    if (!firstLines.includes('@depends-on') && !firstLines.includes('@file')) {
      const relFile = path.relative(BASE_PATH, file);
      violations.push({
        rule: 'R3-MissingHeader',
        file: relFile,
        line: 1,
        message: 'Missing @depends-on / @file dependency header in first 15 lines',
        severity: 'WARNING',
      });
    }
  }
}

// ── Rule 4: Dead Code Detection ──
function checkDeadCode() {
  const indexPath = path.join(BASE_PATH, 'src/core/index.ts');
  const indexContent = readFile(indexPath);

  // Extract exported names from index.ts
  const exportRegex = /export\s+(?:\{[^}]+\}|(?:\*\s+from\s+['"]([^'"]+)['"]))/g;
  const exportedFiles: string[] = [];
  let match;
  while ((match = exportRegex.exec(indexContent)) !== null) {
    if (match[1]) exportedFiles.push(match[1]);
  }

  // Check if each exported module is imported elsewhere
  const allSrcFiles = getFiles(path.join(BASE_PATH, 'src'), ['.ts', '.js']);
  const allScripts = getFiles(path.join(BASE_PATH, 'scripts'), ['.ts', '.js']);
  const allTests = getFiles(path.join(BASE_PATH, 'tests'), ['.ts', '.js']);
  const allFiles = [...allSrcFiles, ...allScripts, ...allTests];

  for (const exp of exportedFiles) {
    const modulePath = exp.replace('./', '');
    const moduleFile = modulePath.split('/').pop() || '';
    let importCount = 0;

    for (const file of allFiles) {
      if (file === indexPath) continue;
      const content = readFile(file);
      if (content.includes(moduleFile) && (content.includes('import') || content.includes('require'))) {
        importCount++;
      }
    }

    if (importCount === 0) {
      violations.push({
        rule: 'R4-DeadCode',
        file: 'src/core/index.ts',
        line: 1,
        message: `Module '${exp}' exported but never imported outside index.ts — potential dead code`,
        severity: 'WARNING',
      });
    }
  }
}

// ── Rule 5: Static Security Scan ──
// Scan src/core/tools/ for raw fs/child_process imports (bypassing tool-gateway)
function checkSecurityScan() {
  const toolsDir = path.join(BASE_PATH, 'src/core/tools');
  const files = getFiles(toolsDir, ['.ts', '.js']);

  // Files exempt from this rule:
  // - tool-gateway.ts: the ONLY file allowed to import fs
  // - validate-structure.ts: utility script, not a runtime tool
  // - document.ts: needs execSync for PDF/DOCX parsing via child processes
  // - system.ts: needs execSync for execute_command tool
  // - ast-scanner.ts: ENGINE component (not a tool) — reads source code from
  //   the project's own src/ tree via AST parse, never reads user data.
  //   Architecture exception approved by Tech Lead (Micro-Task 50).
  const exemptFiles = ['tool-gateway.ts', 'validate-structure.ts', 'document.ts', 'system.ts', 'ast-scanner.ts'];

  for (const file of files) {
    const fileName = path.basename(file);
    if (exemptFiles.includes(fileName)) continue;

    const content = readFile(file);

    // Check for raw fs import
    if (/import\s+\*\s+as\s+fs\s+from\s+['"]fs['"]/.test(content) || /require\s*\(\s*['"]fs['"]\s*\)/.test(content)) {
      const relFile = path.relative(BASE_PATH, file);
      violations.push({
        rule: 'R5-RawFsImport',
        file: relFile,
        line: 1,
        message: `SECURITY: Raw 'fs' import detected. Use tool-gateway.ts (secureRuntime) instead.`,
        severity: 'ERROR',
      });
    }

    // Check for child_process import
    if (/from\s+['"]child_process['"]/.test(content) || /require\s*\(\s*['"]child_process['"]\s*\)/.test(content)) {
      const relFile = path.relative(BASE_PATH, file);
      violations.push({
        rule: 'R5-ChildProcessImport',
        file: relFile,
        line: 1,
        message: `SECURITY: Raw 'child_process' import detected. Use SandboxExecutor or tool-gateway.ts instead.`,
        severity: 'ERROR',
      });
    }

    // Check for execSync usage
    if (/\bexecSync\s*\(/.test(content)) {
      const relFile = path.relative(BASE_PATH, file);
      violations.push({
        rule: 'R5-ExecSyncUsage',
        file: relFile,
        line: 1,
        message: `SECURITY: execSync() usage detected. All execution must route through SandboxExecutor.`,
        severity: 'ERROR',
      });
    }
  }
}

// ── Rule 6: Knowledge No Executable Code ──
// knowledge/ must contain only markdown — no .ts, .js, .tsx, .jsx files allowed
function checkKnowledgeNoExecutableCode() {
  const knowledgeDir = path.join(BASE_PATH, 'knowledge');
  if (!fs.existsSync(knowledgeDir)) return;

  const execFiles = getFiles(knowledgeDir, ['.ts', '.js', '.tsx', '.jsx']);

  for (const file of execFiles) {
    const relFile = path.relative(BASE_PATH, file);
    violations.push({
      rule: 'R6-KnowledgeNoCode',
      file: relFile,
      line: 1,
      message: `Knowledge directory contains executable code file. Only markdown is allowed in knowledge/`,
      severity: 'ERROR',
    });
  }
}

// ── Report ──
function printReport() {
  console.log('\n🔍 Structure Validation Report');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const errors = violations.filter(v => v.severity === 'ERROR');
  const warnings = violations.filter(v => v.severity === 'WARNING');

  if (violations.length === 0) {
    console.log('✅ All checks passed — structure is clean.');
  } else {
    // Group by rule
    const grouped: Record<string, Violation[]> = {};
    for (const v of violations) {
      if (!grouped[v.rule]) grouped[v.rule] = [];
      grouped[v.rule].push(v);
    }

    for (const [rule, items] of Object.entries(grouped)) {
      const icon = items[0].severity === 'ERROR' ? '❌' : '⚠️';
      console.log(`\n${icon} ${rule}: ${items.length} issue(s)`);
      for (const item of items) {
        console.log(`   ${item.file}:${item.line} — ${item.message}`);
      }
    }
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Result: ${errors.length} ERROR(s), ${warnings.length} WARNING(s)`);

  if (errors.length > 0) {
    console.log('🛑 REJECT — fix errors before commit.');
  } else if (warnings.length > 0) {
    console.log('⚠️ PASS with warnings — review recommended.');
  } else {
    console.log('✅ PASS — structure is clean.');
  }
  console.log('');
}

// ── Main ──
function main() {
  console.log(`\n🏗️  Kato Structure Validator v1.0`);
  console.log(`📁 Scanning: ${BASE_PATH}\n`);

  console.log('Running R1: Folder Ownership...');
  checkFolderOwnership();

  console.log('Running R2: Import Path Integrity...');
  checkImportIntegrity();

  console.log('Running R3: Dependency Headers...');
  checkDependencyHeaders();

  console.log('Running R4: Dead Code Detection...');
  checkDeadCode();

  console.log('Running R5: Static Security Scan...');
  checkSecurityScan();

  console.log('Running R6: Knowledge No Executable Code...');
  checkKnowledgeNoExecutableCode();

  printReport();

  if (STRICT && violations.some(v => v.severity === 'ERROR')) {
    process.exit(1);
  }
}

main();
