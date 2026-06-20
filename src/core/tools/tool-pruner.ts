/**
 * @file Tool Pruner — Simplified tool selection + token estimation
 * @layer core
 * @depends-on src/core/tools/tool-registry.ts
 * @owner core-tools
 *
 * Simplified: Always send all tools to the LLM.
 * The LLM is smart enough to pick the right tool — keyword matching is fragile.
 * Token overhead: ~900 tokens for 9 tools (acceptable for 128K context).
 */

import { getDefaultRegistry } from './tool-registry.js';
import { Logger } from '../logger.js';
const log = new Logger({ module: 'ToolPruner' });

// ── All registered tool names (populated after ensureToolDefinitionsLoaded) ──
let _allToolNames: string[] = [];
let _allToolDefinitions: any[] = [];
let _loaded = false;

/**
 * Preload tool definitions from the registry.
 * Called once during engine initialization.
 */
export async function ensureToolDefinitionsLoaded(): Promise<void> {
  if (_loaded) return;
  const registry = await getDefaultRegistry();
  _allToolNames = registry.listTools();
  _allToolDefinitions = registry.getDefinitions();
  _loaded = true;
  log.info(`Loaded ${_allToolDefinitions.length} tool definition(s)`);
}

/**
 * Select relevant tools based on user message.
 * Simplified: Always return all tools — let the LLM decide.
 * The LLM's tool-calling capability is better than keyword matching.
 *
 * Returns array of OpenAI-compatible tool definitions.
 */
export function selectRelevantTools(userMessage: string): any[] {
  if (!_loaded) {
    return [];
  }

  // Always return all tools — LLM handles selection
  // This is simpler, more reliable, and what Hermes/CrewAI/LangGraph do
  return _allToolDefinitions;
}

/**
 * Estimate token count for a set of tool definitions.
 * Rough estimate: ~100 tokens per tool definition.
 */
export function estimateToolsTokenCount(tools: any[]): number {
  if (!tools || tools.length === 0) return 0;
  // Rough estimate: each tool definition is ~100-200 tokens
  // More accurate: count characters / 4 (approx tokens per char)
  let totalChars = 0;
  for (const tool of tools) {
    totalChars += JSON.stringify(tool).length;
  }
  return Math.ceil(totalChars / 4);
}
