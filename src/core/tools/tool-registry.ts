/**
 * @file Tool Registry â€” Central Registry For All Tools
 * @layer core
 * @depends-on src/core/tools/tool-gateway.ts, src/core/tools/_shared.ts
 * @imported-by src/core/engine/engine.ts, src/core/tools/tool-pruner.ts, src/core/tools/tools.ts
 * @owner core-tools
 *
 * Phase 3.1a: Plugin-based tool registration
 * Phase 3.1b: AST-based auto-discovery (Micro-Task 50)
 *
 * API:
 *   registry.use(plugin)             â€” Register a tool plugin
 *   registry.registerAll(scanner?)   â€” Auto-discover & register via AST scan
 *   registry.getDefinitions()        â€” Get OpenAI-compatible tool definitions
 *   registry.execute(name, args)     â€” Execute a tool by name
 *   registry.executeToolCall(toolCall) â€” Backward-compat wrapper for ReAct loop
 */

import { fileURLToPath } from 'url';
import * as path from 'path';
import { secureRuntime, WORKSPACE_ROOT } from './tool-gateway.js';

// â”€â”€ Types â”€â”€

export interface ToolSchema {
  type: 'object';
  properties: Record<string, any>;
  required?: string[];
  [key: string]: any;
}

export interface Tool {
  name: string;
  description: string;
  schema: ToolSchema;
  execute(args: Record<string, any>): Promise<any> | any;
}

export interface ToolPlugin {
  name: string;
  tools: Tool[];
  onRegister?(registry: ToolRegistry): void;
}

// â”€â”€ Forward declarations (avoid circular dep) â”€â”€
import type { ASTScanner, ScannerManifest } from './ast-scanner.js';

// â”€â”€ Base Constants â”€â”€

export const BASE_PATH = path.resolve(process.cwd());
const PROCESSED_FILES_PATH = path.join(BASE_PATH, 'knowledge/workspace/processed-files.json');

// â”€â”€ Shared Utilities â”€â”€

const SAFE_PATHS = [
  // âš ï¸ ROOT repo path REMOVED â€” too permissive, bypasses all restrictions
  path.resolve(BASE_PATH, 'src'),
  path.resolve(BASE_PATH, 'knowledge'),
  path.resolve(BASE_PATH, 'config'),
  path.resolve(BASE_PATH, 'scripts'),
  path.resolve(BASE_PATH, 'docker'),
  path.resolve(BASE_PATH, '9router'),
  path.resolve(BASE_PATH, 'tests'),
];

function isPathSafe(targetPath: string): boolean {
  const resolved = path.resolve(targetPath);
  return SAFE_PATHS.some(safe => resolved.startsWith(safe));
}

function addProcessedFile(entry: {
  path: string;
  type: string;
  action: string;
  destination?: string;
  notes?: string;
}): void {
  try {
    let data: { files: any[] } = { files: [] };
    if (secureRuntime.safeExists(PROCESSED_FILES_PATH)) {
      data = JSON.parse(secureRuntime.safeReadFile(PROCESSED_FILES_PATH));
    }
    data.files.push({
      ...entry,
      timestamp: new Date().toISOString(),
    });
    secureRuntime.safeWriteFile(PROCESSED_FILES_PATH, JSON.stringify(data, null, 2));
  } catch (err) {
    /* error handling */
  }
}

function toFileUrl(filePath: string): string {
  const resolved = path.resolve(filePath).replace(/\\/g, '/');
  return 'file:///' + resolved;
}

// â”€â”€ ToolRegistry Class â”€â”€

export class ToolRegistry {
  private toolsMap = new Map<string, Tool>();
  private plugins: ToolPlugin[] = [];

  /**
   * Register a plugin. All tools in the plugin become available.
   */
  use(plugin: ToolPlugin): void {
    this.plugins.push(plugin);

    for (const tool of plugin.tools) {
      if (this.toolsMap.has(tool.name)) {
        console.warn(`[ToolRegistry] Overwriting duplicate tool: ${tool.name}`);
      }
      this.toolsMap.set(tool.name, tool);
    }

    if (plugin.onRegister) {
      plugin.onRegister(this);
    }
  }

  /**
   * Get OpenAI-compatible tool definitions array for LLM API calls.
   */
  getDefinitions(): any[] {
    const defs: any[] = [];
    for (const tool of this.toolsMap.values()) {
      defs.push({
        type: 'function',
        function: {
          name: tool.name,
          description: tool.description,
          parameters: tool.schema,
        },
      });
    }
    return defs;
  }

  /**
   * Execute a tool by name with given args.
   * Returns the tool result (any serializable value).
   */
  async execute(name: string, args: Record<string, any>): Promise<any> {
    const tool = this.toolsMap.get(name);
    if (!tool) {
      return { error: `Tool "${name}" not found in registry` };
    }
    try {
      return await tool.execute(args);
    } catch (err: any) {
      return { error: `Tool "${name}" execution failed: ${err.message}` };
    }
  }

  /**
   * Backward-compatible wrapper for the ReAct loop.
   * Accepts { id, type, function: { name, arguments } } format from LLM.
   */
  async executeToolCall(toolCall: {
    id: string;
    type?: string;
    function: { name: string; arguments?: string };
  }): Promise<any> {
    const functionName = toolCall.function.name;
    let args: Record<string, any> = {};
    if (toolCall.function.arguments) {
      try {
        args = JSON.parse(toolCall.function.arguments);
      } catch {
        args = {};
      }
    }
    const tool = this.toolsMap.get(functionName);
    if (!tool) {
      return { error: `Tool "${functionName}" not found` };
    }
    try {
      const result = await tool.execute(args);
      return result;
    } catch (err: any) {
      return { error: `Tool "${functionName}" execution failed: ${err.message}` };
    }
  }

  /**
   * Auto-discover and register tool plugins using AST Scanner.
   *
   * Scans configured directories, parses AST to detect ToolPlugin exports,
   * then dynamically imports and registers valid plugins.
   *
   * Uses checksum-based caching to skip re-scanning when source files
   * have not changed â€” ensuring minimal cold-start overhead.
   *
   * @param scanner Optional ASTScanner instance (defaults to singleton)
   * @returns ScannerManifest with full scan report
   */
  async registerAll(scanner?: ASTScanner): Promise<ScannerManifest> {
    const { ASTScanner: ScannerCls, getDefaultScanner } = await import('./ast-scanner.js');
    const engine = scanner ?? getDefaultScanner();

    // Phase 1: Scan directories + AST parse (cached if unchanged)
    const manifest = await engine.registerAll(this);

    // Phase 2: Report results
    if (manifest.errors.length > 0) {
      for (const err of manifest.errors) {
        console.error(`[ToolRegistry] Plugin error: ${err}`);
      }
    }
    if (manifest.imported > 0) {
      console.log(`[ToolRegistry] Auto-discovered ${manifest.imported} plugin(s)`);
    }

    return manifest;
  }

  /**
   * List all registered tool names.
   */
  listTools(): string[] {
    return Array.from(this.toolsMap.keys());
  }

  /**
   * Get all registered tool objects (name, description, schema).
   */
  getAllTools(): Tool[] {
    return Array.from(this.toolsMap.values());
  }

  /**
   * Get count of registered tools.
   */
  get toolCount(): number {
    return this.toolsMap.size;
  }
}

// â”€â”€ Singleton Instance â”€â”€
// All built-in plugins are auto-registered here.
// Engine imports this singleton.

let _defaultRegistry: ToolRegistry | null = null;

export async function getDefaultRegistry(): Promise<ToolRegistry> {
  if (!_defaultRegistry) {
    _defaultRegistry = new ToolRegistry();
    await registerBuiltInPlugins(_defaultRegistry);
  }
  return _defaultRegistry;
}

async function registerBuiltInPlugins(registry: ToolRegistry, enableAutoDiscovery = true): Promise<void> {
  // Dynamic imports: all tool plugins are discovered and registered
  const pluginModules: Record<string, string> = {
    filesystem: './filesystem.js',
    knowledge: './knowledge.js',
    document: './document.js',
    network: './network.js',
    archive: './archive.js',
    skills: './skills.js',
    report: './report.js',
    system: './system.js',
    search: './search.js',
  };
  for (const [name, modulePath] of Object.entries(pluginModules)) {
    try {
      const mod = await import(modulePath);
      if (mod.default && mod.default.name && mod.default.tools) {
        registry.use(mod.default);
        console.log(`[ToolRegistry] Loaded plugin: ${mod.default.name}`);
      } else {
        console.warn(`[ToolRegistry] Plugin ${name} has no valid default export`);
      }
    } catch (err: any) {
      console.warn(`[ToolRegistry] Failed to import plugin ${name}: ${err.message}`);
    }
  }
  // Phase 2a: Auto-discovery via AST Scanner (Micro-Task 50)
  if (enableAutoDiscovery) {
    try {
      await registry.registerAll();
    } catch (err: any) {
      console.error(`[ToolRegistry] Auto-discovery failed: ${err.message}`);
    }
  }

  console.log(`[ToolRegistry] getDefaultRegistry complete: ${registry.getDefinitions().length} tool(s) registered`);
}

// Re-export safe utilities only (NO raw fs/execSync â€” use tool-gateway.ts)
export { addProcessedFile, isPathSafe, toFileUrl, secureRuntime, WORKSPACE_ROOT };
export default ToolRegistry;
