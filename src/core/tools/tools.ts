/**
 * @file tools — Tool plugin
 * @layer core
 * @depends-on src/core/tools/tool-gateway.ts, src/core/tools/_shared.ts
 * @imported-by src/core/tools/tool-registry.ts
 * @owner core-tools
 */

/**
 * tools.ts — Backward-compatible re-export adapter
 * 
 * Phase 3.1 migration: tools.ts (monolithic) → ToolRegistry (plugin-based)
 * 
 * This file now re-exports from tool-registry.ts for backward compatibility.
 * All tool definitions are registered in the individual plugin files under src/core/tools/.
 * 
 * Legacy exports:
 *   TOOLS_DEFINITION  → Use getDefaultRegistry().getDefinitions()
 *   executeToolCall()  → Use registry.executeToolCall()
 *   list_directory()   → Use registry.execute('list_directory', ...)
 *   ... per-tool functions → Use registry.execute(name, args)
 */

export {
  ToolRegistry,
  getDefaultRegistry,
  BASE_PATH,
  addProcessedFile,
  isPathSafe,
  toFileUrl,
} from './tool-registry.js';

import { getDefaultRegistry } from './tool-registry.js';

/**
 * Legacy: Synchronous TOOLS_DEFINITION for modules that still import it
 */
export const TOOLS_DEFINITION = await getDefaultRegistry().then(r => r.getDefinitions());

/**
 * Legacy: Synchronous executeToolCall for backward compat
 */
export function executeToolCall(toolCall: {
  id: string;
  type?: string;
  function: { name: string; arguments?: string };
}): any {
  // Must work synchronously for legacy callers
  throw new Error(
    'tools.ts executeToolCall is deprecated. Use ToolRegistry.executeToolCall() instead.\n' +
    'Call getDefaultRegistry() then registry.executeToolCall(toolCall)'
  );
}

export default { TOOLS_DEFINITION, executeToolCall };