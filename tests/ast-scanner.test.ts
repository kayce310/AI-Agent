/**
 * AST Scanner — Unit Tests
 *
 * Covers:
 * - Plugin file detection via AST parsing (Pattern 1 + Pattern 2 exports)
 * - Non-plugin file rejection
 * - Checksum computation (deterministic)
 * - Cache hit/miss behavior
 * - Scan result structure
 * - Exclusion list filtering
 * - Real plugin files from src/core/tools/
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

// ── Helpers ──

function createTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'ast-test-'));
}

function writeFile(dir: string, name: string, content: string): string {
  const fullPath = path.join(dir, name);
  fs.writeFileSync(fullPath, content, 'utf-8');
  return fullPath;
}

function rmdirRecursive(dir: string): void {
  if (fs.existsSync(dir)) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        rmdirRecursive(full);
      } else {
        fs.unlinkSync(full);
      }
    }
    fs.rmdirSync(dir);
  }
}

// ── Test Fixtures ──

/** A valid plugin file — Pattern 1: const + export default */
const VALID_PLUGIN_PATTERN_1 = `
const plugin = {
  name: 'test-plugin',
  tools: [
    {
      name: 'tool_one',
      description: 'First test tool',
      schema: { type: 'object', properties: { input: { type: 'string' } }, required: ['input'] },
      execute(args: Record<string, any>) { return { result: 'ok' }; },
    },
    {
      name: 'tool_two',
      description: 'Second test tool',
      schema: { type: 'object', properties: {} },
      execute() { return { result: 'ok' }; },
    },
  ],
};
export default plugin;
`;

/** A valid plugin file — Pattern 2: inline export default */
const VALID_PLUGIN_PATTERN_2 = `
export default {
  name: 'inline-plugin',
  tools: [
    {
      name: 'inline_tool',
      description: 'Inline tool',
      schema: { type: 'object', properties: { x: { type: 'number' } } },
      execute(args: Record<string, any>) { return { result: x }; },
    },
  ],
};
`;

/** A non-plugin file (no ToolPlugin export) */
const NON_PLUGIN_FILE = `
export function helper() { return 42; }
export const PI = 3.14;
`;

/** A file with syntax error */
const SYNTAX_ERROR_FILE = `
export default {
  name: 'broken'
  tools: [  // missing comma
    { name: 'a', schema: {}, execute() {} },
  ],
};
`;

/** A file with an empty tools array */
const EMPTY_TOOLS_PLUGIN = `
export default {
  name: 'empty-plugin',
  tools: [],
};
`;

// ── Tests ──

describe('ASTScanner — Plugin Detection', () => {
  let ASTScanner: any;

  beforeAll(async () => {
    const mod = await import('../src/core/tools/ast-scanner.js');
    ASTScanner = mod.ASTScanner;
  });

  it('detects Pattern 1 plugin (const + export default)', () => {
    const dir = createTempDir();
    try {
      const file = writeFile(dir, 'test-plugin.ts', VALID_PLUGIN_PATTERN_1);
      const scanner = new ASTScanner({ scanDirs: [dir], excludes: [], noCache: true });
      const plugins = scanner.scan();
      expect(plugins).toHaveLength(1);
      expect(plugins[0].name).toBe('test-plugin');
      expect(plugins[0].toolCount).toBe(2);
      expect(plugins[0].toolNames).toEqual(['tool_one', 'tool_two']);
      expect(plugins[0].sourceFile).toBe(file);
    } finally {
      rmdirRecursive(dir);
    }
  });

  it('detects Pattern 2 plugin (inline export default)', () => {
    const dir = createTempDir();
    try {
      writeFile(dir, 'inline-plugin.ts', VALID_PLUGIN_PATTERN_2);
      const scanner = new ASTScanner({ scanDirs: [dir], excludes: [], noCache: true });
      const plugins = scanner.scan();
      expect(plugins).toHaveLength(1);
      expect(plugins[0].name).toBe('inline-plugin');
      expect(plugins[0].toolCount).toBe(1);
      expect(plugins[0].toolNames).toEqual(['inline_tool']);
    } finally {
      rmdirRecursive(dir);
    }
  });

  it('skips files that do not export a ToolPlugin', () => {
    const dir = createTempDir();
    try {
      writeFile(dir, 'helper.ts', NON_PLUGIN_FILE);
      const scanner = new ASTScanner({ scanDirs: [dir], excludes: [], noCache: true });
      const plugins = scanner.scan();
      expect(plugins).toHaveLength(0);
    } finally {
      rmdirRecursive(dir);
    }
  });

  // Note: TypeScript Compiler API createSourceFile() does NOT throw on
  // syntax errors — it always parses, and reports diagnostics via
  // sourceFile.parseDiagnostics. Our hasPluginExport() rejects files
  // with parseDiagnostics.length > 0.
  it('skips files with syntax errors gracefully', () => {
    const dir = createTempDir();
    try {
      writeFile(dir, 'broken.ts', SYNTAX_ERROR_FILE);
      const scanner = new ASTScanner({ scanDirs: [dir], excludes: [], noCache: true });
      const plugins = scanner.scan();
      expect(plugins).toHaveLength(0);
    } finally {
      rmdirRecursive(dir);
    }
  });

  it('rejects plugin with empty tools array', () => {
    const dir = createTempDir();
    try {
      writeFile(dir, 'empty.ts', EMPTY_TOOLS_PLUGIN);
      const scanner = new ASTScanner({ scanDirs: [dir], excludes: [], noCache: true });
      const plugins = scanner.scan();
      expect(plugins).toHaveLength(0);
    } finally {
      rmdirRecursive(dir);
    }
  });

  it('skips excluded files by basename', () => {
    const dir = createTempDir();
    try {
      writeFile(dir, 'exclude-me.ts', VALID_PLUGIN_PATTERN_1);
      const scanner = new ASTScanner({
        scanDirs: [dir],
        excludes: ['exclude-me.ts'],
        noCache: true,
      });
      const plugins = scanner.scan();
      expect(plugins).toHaveLength(0);
    } finally {
      rmdirRecursive(dir);
    }
  });

  it('only considers configured extensions', () => {
    const dir = createTempDir();
    try {
      writeFile(dir, 'not-scanned.js', VALID_PLUGIN_PATTERN_1);
      const scanner = new ASTScanner({
        scanDirs: [dir],
        excludes: [],
        extensions: ['.ts'],  // .js is not in list
        noCache: true,
      });
      const plugins = scanner.scan();
      expect(plugins).toHaveLength(0);
    } finally {
      rmdirRecursive(dir);
    }
  });

  it('scans multiple directories', () => {
    const dir1 = createTempDir();
    const dir2 = createTempDir();
    try {
      writeFile(dir1, 'plugin-a.ts', VALID_PLUGIN_PATTERN_1);
      writeFile(dir2, 'plugin-b.ts', VALID_PLUGIN_PATTERN_2);
      const scanner = new ASTScanner({
        scanDirs: [dir1, dir2],
        excludes: [],
        noCache: true,
      });
      const plugins = scanner.scan();
      expect(plugins).toHaveLength(2);
      const names = plugins.map(p => p.name).sort();
      expect(names).toEqual(['inline-plugin', 'test-plugin']);
    } finally {
      rmdirRecursive(dir1);
      rmdirRecursive(dir2);
    }
  });

  it('handles non-existent scan directory gracefully', () => {
    const scanner = new ASTScanner({
      scanDirs: ['/nonexistent/path/that/does/not/exist'],
      noCache: true,
    });
    const plugins = scanner.scan();
    expect(plugins).toHaveLength(0);
  });
});

describe('ASTScanner — parsePluginFile()', () => {
  let ASTScanner: any;

  beforeAll(async () => {
    const mod = await import('../src/core/tools/ast-scanner.js');
    ASTScanner = mod.ASTScanner;
  });

  it('returns ScannedPlugin for valid file', () => {
    const dir = createTempDir();
    try {
      const file = writeFile(dir, 'plugin.ts', VALID_PLUGIN_PATTERN_1);
      const scanner = new ASTScanner({ scanDirs: [dir], excludes: [], noCache: true });
      const result = scanner.parsePluginFile(file);
      expect(result).not.toBeNull();
      expect(result!.name).toBe('test-plugin');
      expect(result!.toolCount).toBe(2);
      expect(result!.toolNames).toEqual(['tool_one', 'tool_two']);
      expect(result!.registered).toBe(false);
    } finally {
      rmdirRecursive(dir);
    }
  });

  it('returns null for non-plugin file', () => {
    const dir = createTempDir();
    try {
      const file = writeFile(dir, 'helper.ts', NON_PLUGIN_FILE);
      const scanner = new ASTScanner({ scanDirs: [dir], excludes: [], noCache: true });
      const result = scanner.parsePluginFile(file);
      expect(result).toBeNull();
    } finally {
      rmdirRecursive(dir);
    }
  });

  // parsePluginFile does NOT throw on syntax errors — TS Compiler API
  // always parses. The AST tree will be incomplete, so extractPluginMeta
  // returns null (no valid Plugin object found).
  it('returns null for syntax error file', () => {
    const dir = createTempDir();
    try {
      const file = writeFile(dir, 'broken.ts', SYNTAX_ERROR_FILE);
      const scanner = new ASTScanner({ scanDirs: [dir], excludes: [], noCache: true });
      const result = scanner.parsePluginFile(file);
      expect(result).toBeNull();
    } finally {
      rmdirRecursive(dir);
    }
  });
});

describe('ASTScanner — Checksum', () => {
  let ASTScanner: any;

  beforeAll(async () => {
    const mod = await import('../src/core/tools/ast-scanner.js');
    ASTScanner = mod.ASTScanner;
  });

  it('returns a deterministic hash for the same directory state', () => {
    const dir = createTempDir();
    try {
      writeFile(dir, 'a.ts', VALID_PLUGIN_PATTERN_1);
      writeFile(dir, 'b.ts', VALID_PLUGIN_PATTERN_2);

      const scanner = new ASTScanner({ scanDirs: [dir], noCache: true });
      const hash1 = scanner.computeChecksum();
      const hash2 = scanner.computeChecksum();
      expect(hash1).toBe(hash2);
      expect(hash1.length).toBe(64); // SHA-256 hex
    } finally {
      rmdirRecursive(dir);
    }
  });

  it('changes when a file is added', () => {
    const dir = createTempDir();
    try {
      writeFile(dir, 'a.ts', VALID_PLUGIN_PATTERN_1);
      const scanner = new ASTScanner({ scanDirs: [dir], noCache: true });
      const hash1 = scanner.computeChecksum();

      writeFile(dir, 'c.ts', VALID_PLUGIN_PATTERN_2);
      const hash2 = scanner.computeChecksum();
      expect(hash2).not.toBe(hash1);
    } finally {
      rmdirRecursive(dir);
    }
  });

  it('changes when file content is modified (mtime)', async () => {
    const dir = createTempDir();
    try {
      const file = writeFile(dir, 'a.ts', VALID_PLUGIN_PATTERN_1);
      const scanner = new ASTScanner({ scanDirs: [dir], noCache: true });
      const hash1 = scanner.computeChecksum();

      // Wait to ensure mtime changes (fs resolution is coarse on some systems)
      await new Promise(r => setTimeout(r, 50));
      fs.writeFileSync(file, VALID_PLUGIN_PATTERN_1 + '\n// modified', 'utf-8');
      const hash2 = scanner.computeChecksum();
      expect(hash2).not.toBe(hash1);
    } finally {
      rmdirRecursive(dir);
    }
  });

  it('returns valid hex hash', () => {
    const dir = createTempDir();
    try {
      writeFile(dir, 'z.ts', VALID_PLUGIN_PATTERN_2);
      writeFile(dir, 'a.ts', VALID_PLUGIN_PATTERN_1);

      const scanner = new ASTScanner({ scanDirs: [dir], noCache: true });
      const hash = scanner.computeChecksum();
      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    } finally {
      rmdirRecursive(dir);
    }
  });
});

describe('ASTScanner — Cache', () => {
  let ASTScanner: any;

  beforeAll(async () => {
    const mod = await import('../src/core/tools/ast-scanner.js');
    ASTScanner = mod.ASTScanner;
  });

  let tmpDir: string;
  let cacheFile: string;

  beforeEach(() => {
    tmpDir = createTempDir();
    cacheFile = path.join(tmpDir, '.test-ast-cache.json');
  });

  afterEach(() => {
    rmdirRecursive(tmpDir);
  });

  it('returns cached result when checksum matches', () => {
    writeFile(tmpDir, 'plugin.ts', VALID_PLUGIN_PATTERN_1);

    // First scan (cache miss)
    const scanner1 = new ASTScanner({
      scanDirs: [tmpDir],
      excludes: [],
      cachePath: cacheFile,
      noCache: false,
    });
    const result1 = scanner1.scan();
    expect(result1).toHaveLength(1);

    // Second scan (cache hit — no changes)
    const scanner2 = new ASTScanner({
      scanDirs: [tmpDir],
      excludes: [],
      cachePath: cacheFile,
      noCache: false,
    });
    const result2 = scanner2.scan();
    expect(result2).toHaveLength(1);
    expect(result2[0].name).toBe('test-plugin');
  });

  it('re-scans when checksum changes', async () => {
    writeFile(tmpDir, 'plugin.ts', VALID_PLUGIN_PATTERN_1);

    // First scan
    const scanner = new ASTScanner({
      scanDirs: [tmpDir],
      excludes: [],
      cachePath: cacheFile,
      noCache: false,
    });
    scanner.scan();

    // Modify file
    await new Promise(r => setTimeout(r, 50));
    writeFile(tmpDir, 'plugin.ts', VALID_PLUGIN_PATTERN_2);

    // Re-scan — should detect change
    const scanner2 = new ASTScanner({
      scanDirs: [tmpDir],
      excludes: [],
      cachePath: cacheFile,
      noCache: false,
    });
    const result = scanner2.scan();
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('inline-plugin');
  });

  it('returns empty array and caches it when directory has no plugins', () => {
    writeFile(tmpDir, 'helper.ts', NON_PLUGIN_FILE);

    const scanner = new ASTScanner({
      scanDirs: [tmpDir],
      excludes: [],
      cachePath: cacheFile,
      noCache: false,
    });
    const result = scanner.scan();
    expect(result).toHaveLength(0);

    // Verify cache was written
    expect(fs.existsSync(cacheFile)).toBe(true);
    const cached = JSON.parse(fs.readFileSync(cacheFile, 'utf-8'));
    expect(cached.plugins).toHaveLength(0);
  });

  it('skips cache when noCache=true', () => {
    writeFile(tmpDir, 'plugin.ts', VALID_PLUGIN_PATTERN_1);

    const scanner = new ASTScanner({
      scanDirs: [tmpDir],
      excludes: [],
      cachePath: cacheFile,
      noCache: true,
    });
    scanner.scan();
    expect(fs.existsSync(cacheFile)).toBe(false);
  });

  it('recovers from corrupted cache file', () => {
    writeFile(tmpDir, 'plugin.ts', VALID_PLUGIN_PATTERN_1);

    // Write corrupted cache
    fs.writeFileSync(cacheFile, '{ invalid json', 'utf-8');

    const scanner = new ASTScanner({
      scanDirs: [tmpDir],
      excludes: [],
      cachePath: cacheFile,
      noCache: false,
    });
    // Should not throw
    const result = scanner.scan();
    expect(result).toHaveLength(1);
  });
});

describe('ASTScanner — Real Plugin Files', () => {
  let ASTScanner: any;

  beforeAll(async () => {
    const mod = await import('../src/core/tools/ast-scanner.js');
    ASTScanner = mod.ASTScanner;
  });

  it('detects all real built-in plugins in src/core/tools/', () => {
    const realDir = path.resolve(process.cwd(), 'src/core/tools');
    if (!fs.existsSync(realDir)) {
      return; // Skip if directory doesn't exist
    }

    const scanner = new ASTScanner({ noCache: true });
    const plugins = scanner.scan();

    // Should find at least the 8 hardcoded plugins
    expect(plugins.length).toBeGreaterThanOrEqual(8);
    expect(plugins.some(p => p.name === 'filesystem')).toBe(true);
    expect(plugins.some(p => p.name === 'knowledge')).toBe(true);
    expect(plugins.some(p => p.name === 'skills')).toBe(true);
    expect(plugins.some(p => p.name === 'system')).toBe(true);

    // All plugins should have at least 1 tool
    for (const p of plugins) {
      expect(p.toolCount).toBeGreaterThanOrEqual(1);
      expect(p.toolNames.length).toBe(p.toolCount);
    }
  });
});

describe('ASTScanner — registerAll() integration', () => {
  let ASTScanner: any;
  let ToolRegistry: any;

  beforeAll(async () => {
    const mod = await import('../src/core/tools/ast-scanner.js');
    ASTScanner = mod.ASTScanner;
    const regMod = await import('../src/core/tools/tool-registry.js');
    ToolRegistry = regMod.ToolRegistry;
  });

  it('registers scanned plugins into ToolRegistry', async () => {
    const dir = createTempDir();
    try {
      writeFile(dir, 'plugin.ts', VALID_PLUGIN_PATTERN_1);

      const registry = new ToolRegistry();
      const scanner = new ASTScanner({
        scanDirs: [dir],
        excludes: [],
        noCache: true,
      });

      const manifest = await scanner.registerAll(registry);
      expect(manifest.discovered).toBe(1);
      expect(manifest.imported).toBe(1);
      expect(manifest.errors).toHaveLength(0);
      expect(manifest.plugins[0].registered).toBe(true);

      // Tools should be accessible
      expect(registry.listTools()).toContain('tool_one');
      expect(registry.listTools()).toContain('tool_two');
      expect(registry.toolCount).toBe(2);
    } finally {
      rmdirRecursive(dir);
    }
  });

  it('handles import failures without crashing', async () => {
    const dir = createTempDir();
    try {
      // Write a file that AST detects as plugin but dynamic import will fail
      // because the file path is a temp dir outside the project tree.
      // Node.js may resolve it or not depending on CWD — that's expected.
      writeFile(dir, 'bad-plugin.ts', `
        export default {
          name: 'bad-plugin',
          tools: [
            {
              name: 'bad_tool',
              description: 'This tool will be registered if import succeeds',
              schema: { type: 'object', properties: {} },
              execute() { return {}; },
            },
          ],
        };
      `);

      const registry = new ToolRegistry();
      const scanner = new ASTScanner({
        scanDirs: [dir],
        excludes: [],
        noCache: true,
      });

      const manifest = await scanner.registerAll(registry);
      expect(manifest.discovered).toBe(1);
      // The import may succeed (ESM file:// URL) or fail — either is fine
      // as long as the system doesn't crash
      if (manifest.imported === 1) {
        expect(manifest.plugins[0].registered).toBe(true);
        expect(registry.listTools()).toContain('bad_tool');
      } else {
        // Import failed — verify error is captured
        expect(manifest.errors.length).toBeGreaterThanOrEqual(1);
        expect(manifest.errors[0].file).toContain('bad-plugin.ts');
      }
    } finally {
      rmdirRecursive(dir);
    }
  });
});
