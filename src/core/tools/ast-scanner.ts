/**
 * @file AST Scanner â€” Auto-discovery Engine for Tool Plugins
 * @layer core
 * @depends-on 
 * @owner core-tools
 *
 * ZERO-TRUST: This is an ENGINE component, not a tool plugin. It reads
 * source code (.ts files) from the project's own source tree â€” not user
 * data. Uses raw `fs` for performance and to avoid secureRuntime path
 * validation (which would block reading source code from outside the
 * workspace during testing).
 *
 * No runtime code execution â€” AST parse only (syntax-safe).
 * `crypto` is a Node.js built-in â€” no file I/O.
 *
 * INSPIRED BY Hermes Agent (Nous Research v0.14.0):
 *   tools/registry.py â†’ _module_registers_tools() + discover_builtin_tools()
 *   Uses `ast` (Python) â†’ adapted to `typescript` Compiler API (TS)
 *
 * CACHE STRATEGY:
 *   Computes a checksum of { filename + mtimeMs } for every .ts file in scanDirs.
 *   If unchanged â†’ loads cached manifest from knowledge/workspace/.kato-ast-cache.json.
 *   Only re-parses AST when content has changed (new/modified/deleted files).
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import * as ts from 'typescript';
import type { ToolPlugin, ToolRegistry } from './tool-registry.js';
import { Logger } from '../logger.js';

const log = new Logger({ module: 'ASTScanner' });

// â”€â”€ Public Types â”€â”€

/** Structured result of a complete scan + registration pass */
export interface ScannerManifest {
  /** Total plugin files discovered by AST scan */
  discovered: number;
  /** Total plugins successfully imported and registered */
  imported: number;
  /** List of all scanned plugins (whether registered or not) */
  plugins: ScannedPlugin[];
  /** Files that failed AST parse or dynamic import */
  errors: ScannerError[];
  /** Cache status */
  cache: 'HIT' | 'MISS' | 'DISABLED';
  /** Elapsed wall-clock time for the scan phase (ms) */
  scanMs: number;
}

export interface ScannedPlugin {
  /** Plugin name â€” extracted from AST or cached */
  name: string;
  /** Absolute path to the source file */
  sourceFile: string;
  /** Number of tools declared */
  toolCount: number;
  /** Tool names (extracted from AST or cached) */
  toolNames: string[];
  /** Whether the plugin was successfully registered */
  registered: boolean;
}

export interface ScannerError {
  /** Source file that caused the error */
  file: string;
  /** Human-readable error description */
  message: string;
  /** Optional error code */ // eslint-disable-line @typescript-eslint/no-unused-vars
  code?: number;
}

/** Runtime configuration for the scanner */
export interface ScannerConfig {
  /** Directories to scan for plugin files */
  scanDirs: string[];
  /** File basenames to exclude (e.g. index.ts, tool-registry.ts) */
  excludes: string[];
  /** File extensions to consider */
  extensions: string[];
  /** Path for the cache file */
  cachePath: string;
  /** Set to true to skip cache entirely */
  noCache: boolean;
}

// â”€â”€ Defaults â”€â”€

const DEFAULT_CONFIG: Required<ScannerConfig> = {
  scanDirs: [
    path.resolve(process.cwd(), 'src/core/tools'),
  ],
  excludes: [
    'index.ts',
    'tool-registry.ts',
    'tool-gateway.ts',
    'tool-pruner.ts',
    'tools.ts',
    '_shared.ts',
    'path-utils.ts',
    'ast-scanner.ts',   // never scan self
  ],
  extensions: ['.ts'],
  cachePath: path.resolve(process.cwd(), 'knowledge/workspace/.kato-ast-cache.json'),
  noCache: false,
};

// â”€â”€ Cache entry shape â”€â”€

interface CacheEntry {
  checksum: string;
  scannedAt: string;          // ISO-8601
  plugins: ScannedPlugin[];
}

// â”€â”€ AST Scanner â”€â”€

export class ASTScanner {
  private config: Required<ScannerConfig>;

  constructor(config?: Partial<ScannerConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // Public API â€” scan directories, return manifest
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  /**
   * Scan configured directories, parse AST of candidate files,
   * and return the list of discovered plugin metadata.
   *
   * Uses cache when possible. Call this before `registerAll()`.
   */
  scan(): ScannedPlugin[] {
    const start = performance.now();

    // 1. Compute directory checksum
    const checksum = this.computeChecksum();

    // 2. Try cache
    if (!this.config.noCache) {
      const cached = this.tryLoadCache(checksum);
      if (cached) {
        log.info(`[ASTScanner] Cache hit: ${cached.plugins.length} plugins`);
        return cached.plugins;
      }
    }

    // 3. Cache miss â†’ full AST scan
    const pluginFiles = this.findCandidateFiles();
    const plugins: ScannedPlugin[] = [];

    for (const filePath of pluginFiles) {
      const scanned = this.parsePluginFile(filePath);
      if (scanned) {
        plugins.push(scanned);
      }
    }

    // 4. Persist cache
    if (!this.config.noCache) {
      this.saveCache(checksum, plugins);
    }

    const elapsed = Math.round(performance.now() - start);
    if (plugins.length > 0) {
      log.info(`[ASTScanner] Discovered ${plugins.length} plugin(s) in ${elapsed}ms`);
    }

    return plugins;
  }

  /**
   * High-level convenience: scan + dynamic-import + register all discovered
   * plugins into the given registry. Returns a full manifest.
   */
  async registerAll(registry: ToolRegistry): Promise<ScannerManifest> {
    const scanStart = performance.now();
    const plugins = this.scan();
    const scanMs = Math.round(performance.now() - scanStart);

    const manifest: ScannerManifest = {
      discovered: plugins.length,
      imported: 0,
      plugins: [],
      errors: [],
      cache: this.config.noCache ? 'DISABLED' : 'HIT',
      scanMs,
    };

    // Determine actual cache status
    if (plugins.length > 0) {
      try {
        const raw = fs.readFileSync(this.config.cachePath, 'utf-8');
        const entry: CacheEntry = JSON.parse(raw);
        if (entry && entry.plugins && entry.plugins.length === plugins.length) {
          manifest.cache = 'HIT';
        }
      } catch { manifest.cache = 'MISS'; }
    }

    for (const candidate of plugins) {
      try {
        const mod = await import(this.fileToUrl(candidate.sourceFile));
        if (mod.default && typeof mod.default.name === 'string' && Array.isArray(mod.default.tools)) {
          registry.use(mod.default);
          candidate.registered = true;
          manifest.imported++;
        } else {
          manifest.errors.push({
            file: candidate.sourceFile,
            message: `Module has no valid default export matching ToolPlugin interface`,
          });
        }
      } catch (err: any) {
        manifest.errors.push({
          file: candidate.sourceFile,
          message: `Dynamic import failed: ${err.message}`,
          code: err.code,
        });
      }
      manifest.plugins.push(candidate);
    }

    return manifest;
  }

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // Checksum / Cache
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  /**
   * Compute a combined SHA-256 hash of all relevant .ts files:
   *   hash = SHA256( join('\n', sorted: "basename|mtimeMs") )
   *
   * If a file is deleted, the checksum changes. If a file is added,
   * the checksum changes. If mtime changes, checksum changes.
   */
  computeChecksum(): string {
    const hash = crypto.createHash('sha256');
    const parts: string[] = [];

    for (const dir of this.config.scanDirs) {
      let dirContents: string[];
      try {
        dirContents = fs.readdirSync(dir);
      } catch {
        continue;
      }

      for (const name of dirContents) {
        const ext = path.extname(name).toLowerCase();
        if (!this.config.extensions.includes(ext)) continue;
        if (this.config.excludes.includes(name)) continue;

        const fullPath = path.join(dir, name);
        try {
          const stat = fs.statSync(fullPath);
          if (!stat.isFile()) continue;
          parts.push(`${name}|${stat.mtimeMs}`);
        } catch { /* race: file deleted between readdir and stat */ }
      }
    }

    parts.sort();
    hash.update(parts.join('\n'));
    return hash.digest('hex');
  }

  private tryLoadCache(checksum: string): CacheEntry | null {
    const cacheFile = this.config.cachePath;
    try {
      const raw = fs.readFileSync(cacheFile, 'utf-8');
      const entry: CacheEntry = JSON.parse(raw);
      if (entry && entry.checksum === checksum) {
        return entry;
      }
    } catch { /* corrupted or missing cache â†’ treat as miss */ }
    return null;
  }

  private saveCache(checksum: string, plugins: ScannedPlugin[]): void {
    const cacheFile = this.config.cachePath;
    try {
      const dir = path.dirname(cacheFile);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const entry: CacheEntry = {
        checksum,
        scannedAt: new Date().toISOString(),
        plugins,
      };
      fs.writeFileSync(cacheFile, JSON.stringify(entry, null, 2), 'utf-8');
    } catch (err) {
      log.error("Cache write failed", { error: (err as Error).message });
    }
  }

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // File Discovery
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  private findCandidateFiles(): string[] {
    const candidates: string[] = [];

    for (const dir of this.config.scanDirs) {
      let entries: string[];
      try {
        entries = fs.readdirSync(dir);
      } catch {
        continue;
      }

      for (const name of entries) {
        const ext = path.extname(name).toLowerCase();

        // Extension filter
        if (!this.config.extensions.includes(ext)) continue;

        // Exclude list
        if (this.config.excludes.includes(name)) continue;

        const fullPath = path.join(dir, name);
        if (!fs.statSync(fullPath).isFile()) continue;

        if (this.isPluginFile(fullPath)) {
          candidates.push(fullPath);
        }
      }
    }

    return candidates;
  }

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // AST Parsing
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  /**
   * Parse a single .ts file and check whether it exports a ToolPlugin.
   *
   * A valid plugin file has:
   *   const plugin: ToolPlugin = { name: '...', tools: [...] };
   *   export default plugin;
   *
   * OR:
   *   export default { name: '...', tools: [...] };
   */
  private isPluginFile(filePath: string): boolean {
    try {
      const source = fs.readFileSync(filePath, 'utf-8');
      const sourceFile = ts.createSourceFile(
        filePath,
        source,
        ts.ScriptTarget.Latest,
        true,
      );
      return this.hasPluginExport(sourceFile);
    } catch {
      return false;
    }
  }

  /**
   * Full parse: return metadata struct for a plugin file.
   * Returns null if the file doesn't export a valid ToolPlugin.
   */
  parsePluginFile(filePath: string): ScannedPlugin | null {
    try {
      const source = fs.readFileSync(filePath, 'utf-8');
      const sourceFile = ts.createSourceFile(
        filePath,
        source,
        ts.ScriptTarget.Latest,
        true,
      );
      return this.extractPluginMeta(filePath, sourceFile);
    } catch {
      return null;
    }
  }

  private hasPluginExport(sourceFile: ts.SourceFile): boolean {
    // Skip files with syntax errors (TS Compiler API doesn't throw on parse)
    if ((sourceFile as any).parseDiagnostics && (sourceFile as any).parseDiagnostics.length > 0) {
      return false;
    }
    return this.extractPluginMetaInternal(sourceFile) !== null;
  }

  /**
   * Walk the AST to find and extract plugin metadata.
   *
   * Supports two patterns:
   *   1. `export default { name: 'foo', tools: [...] }`
   *   2. `const plugin = { name: 'foo', tools: [...] }; export default plugin;`
   */
  private extractPluginMetaInternal(sourceFile: ts.SourceFile): { name: string; toolCount: number; toolNames: string[] } | null {
    // Skip files with parse errors
    if ((sourceFile as any).parseDiagnostics && (sourceFile as any).parseDiagnostics.length > 0) {
      return null;
    }

    let result: { name: string; toolCount: number; toolNames: string[] } | null = null;

    // Pattern 1: direct `export default { ... }`
    ts.forEachChild(sourceFile, (node) => {
      if (result) return;
      if (ts.isExportAssignment(node) && !node.isExportEquals) {
        const meta = this.parseObjectAsPlugin(node.expression);
        if (meta) result = meta;
      }
    });

    // Pattern 2: `const plugin = { ... }; export default plugin;`
    if (!result) {
      const defaultExportIdent = this.findDefaultExportIdentifier(sourceFile);
      if (defaultExportIdent) {
        result = this.findVariableInitializer(sourceFile, defaultExportIdent);
      }
    }

    return result;
  }

  private extractPluginMeta(filePath: string, sourceFile: ts.SourceFile): ScannedPlugin | null {
    const meta = this.extractPluginMetaInternal(sourceFile);
    if (!meta) return null;

    return {
      name: meta.name,
      sourceFile: filePath,
      toolCount: meta.toolCount,
      toolNames: meta.toolNames,
      registered: false,
    };
  }

  private parseObjectAsPlugin(expr: ts.Expression): { name: string; toolCount: number; toolNames: string[] } | null {
    if (!ts.isObjectLiteralExpression(expr)) return null;

    let name: string | null = null;
    let toolNames: string[] = [];
    let toolsFound = false;

    for (const prop of expr.properties) {
      if (!ts.isPropertyAssignment(prop)) continue;
      if (!ts.isIdentifier(prop.name)) continue;

      const key = prop.name.text;

      if (key === 'name' && ts.isStringLiteral(prop.initializer)) {
        name = prop.initializer.text;
      }

      if (key === 'tools' && ts.isArrayLiteralExpression(prop.initializer)) {
        toolsFound = true;
        toolNames = this.extractToolNames(prop.initializer);
      }
    }

    // Must have name, tools array found, AND at least one tool
    if (name && toolsFound && toolNames.length > 0) {
      return { name, toolCount: toolNames.length, toolNames };
    }

    return null;
  }

  private extractToolNames(arrayExpr: ts.ArrayLiteralExpression): string[] {
    const names: string[] = [];
    for (const element of arrayExpr.elements) {
      if (ts.isObjectLiteralExpression(element)) {
        for (const prop of element.properties) {
          if (
            ts.isPropertyAssignment(prop) &&
            ts.isIdentifier(prop.name) &&
            prop.name.text === 'name' &&
            ts.isStringLiteral(prop.initializer)
          ) {
            names.push(prop.initializer.text);
          }
        }
      }
    }
    return names;
  }

  private findDefaultExportIdentifier(sourceFile: ts.SourceFile): string | null {
    let ident: string | null = null;
    ts.forEachChild(sourceFile, (node) => {
      if (ident) return;
      if (ts.isExportAssignment(node) && !node.isExportEquals) {
        if (ts.isIdentifier(node.expression)) {
          ident = node.expression.text;
        }
      }
    });
    return ident;
  }

  private findVariableInitializer(sourceFile: ts.SourceFile, varName: string): { name: string; toolCount: number; toolNames: string[] } | null {
    let result: { name: string; toolCount: number; toolNames: string[] } | null = null;
    ts.forEachChild(sourceFile, (node) => {
      if (result) return;
      if (ts.isVariableStatement(node)) {
        for (const decl of node.declarationList.declarations) {
          if (ts.isIdentifier(decl.name) && decl.name.text === varName && decl.initializer) {
            result = this.parseObjectAsPlugin(decl.initializer);
          }
        }
      }
    });
    return result;
  }

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // Helpers
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  private fileToUrl(filePath: string): string {
    const normalized = filePath.replace(/\\/g, '/');
    if (normalized.startsWith('file://')) return normalized;
    return 'file:///' + normalized;
  }
}

// â”€â”€ Module-level singleton â”€â”€
let _defaultScanner: ASTScanner | null = null;

export function getDefaultScanner(config?: Partial<ScannerConfig>): ASTScanner {
  if (!_defaultScanner) {
    _defaultScanner = new ASTScanner(config);
  }
  return _defaultScanner;
}

export default ASTScanner;

