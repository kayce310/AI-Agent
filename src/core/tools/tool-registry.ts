/**
 * Tool Registry — Central Registry For All Tools
 * Phase 3.1a: Plugin-based tool registration
 * 
 * API:
 *   registry.use(plugin)       — Register a tool plugin
 *   registry.getDefinitions()  — Get OpenAI-compatible tool definitions
 *   registry.execute(name, args) — Execute a tool by name
 *   registry.executeToolCall(toolCall) — Backward-compat wrapper for ReAct loop
 */

import { fileURLToPath } from 'url';
import { secureRuntime, WORKSPACE_ROOT, isPathSafe } from './tool-gateway.js';

// ── Types ──

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

// ── Base Constants ──

export const BASE_PATH = path.resolve(process.cwd());
const PROCESSED_FILES_PATH = path.join(BASE_PATH, 'knowledge/workspace/processed-files.json');

// ── Shared Utilities ──

const SAFE_PATHS = [
  // ⚠️ ROOT repo path REMOVED — too permissive, bypasses all restrictions
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
    if (fs.existsSync(PROCESSED_FILES_PATH)) {
      data = JSON.parse(fs.readFileSync(PROCESSED_FILES_PATH, 'utf8'));
    }
    data.files.push({
      ...entry,
      timestamp: new Date().toISOString(),
    });
    fs.writeFileSync(PROCESSED_FILES_PATH, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.warn('⚠️ Could not write to processed-files.json:', (err as Error).message);
  }
}

function toFileUrl(filePath: string): string {
  const resolved = path.resolve(filePath).replace(/\\/g, '/');
  return 'file:///' + resolved;
}

// ── ToolRegistry Class ──

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
        console.warn(`⚠️ Tool "${tool.name}" already registered. Overwriting.`);
      }
      this.toolsMap.set(tool.name, tool);
    }

    if (plugin.onRegister) {
      plugin.onRegister(this);
    }

    console.log(`🔧 Plugin "${plugin.name}" registered (${plugin.tools.length} tools)`);
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

// ── Singleton Instance ──
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

async function registerBuiltInPlugins(registry: ToolRegistry): Promise<void> {
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
  };
  for (const [name, modulePath] of Object.entries(pluginModules)) {
    try {
      const mod = await import(modulePath);
      if (mod.default && mod.default.name && mod.default.tools) {
        registry.use(mod.default);
      } else {
        console.warn(`⚠️ Plugin "${name}" at ${modulePath} has no valid default export`);
      }
    } catch (err: any) {
      console.warn(`⚠️ Failed to load plugin "${name}" from ${modulePath}: ${err.message}`);
    }
  }
  console.log(`✅ ToolRegistry ready: ${registry.toolCount} tools registered`);
}

// Re-export safe utilities only (NO raw fs/execSync — use tool-gateway.ts)
export { addProcessedFile, isPathSafe, toFileUrl, secureRuntime, WORKSPACE_ROOT };
export default ToolRegistry;