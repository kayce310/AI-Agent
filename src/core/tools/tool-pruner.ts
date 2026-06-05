/**
 * @file Tool Pruner â€” Keyword-based tool selection + token estimation
 * @layer core
 * @depends-on src/core/tools/tool-registry.ts
 * @owner core-tools
 *
 * Selects relevant tools based on user message keywords to reduce token usage.
 * Falls back to full registry if no match found (caller handles fallback).
 */

import { getDefaultRegistry } from './tool-registry.js';

// ── Core Tools (always available) ──
const CORE_TOOLS = ['list_directory', 'read_file', 'search_knowledge_graph', 'write_wiki_page', 'fetch_url', 'web_search'];

// â”€â”€ Tool Categories â”€â”€
// Each category maps to a set of keywords that indicate the user needs these tools
const TOOL_CATEGORIES: Record<string, { tools: string[]; keywords: string[] }> = {
  core: {
    tools: CORE_TOOLS,
    keywords: ['file', 'read', 'directory', 'folder', 'list', 'search', 'find', 'wiki', 'knowledge', 'url', 'fetch', 'http', 'web'],
  },
  search: {
    tools: ['web_search'],
    keywords: ['search', 'find', 'lookup', 'query', 'tìm', 'kiếm', 'tra cứu', 'cập nhật', 'hôm nay', 'hiện tại', 'mới nhất', 'tin tức', 'giá', 'news', 'latest', 'current', 'today', 'price'],
  },
  filesystem: {
    tools: ['list_directory', 'read_file', 'write_file', 'create_directory', 'delete_file', 'move_file', 'copy_file'],
    keywords: ['file', 'read', 'write', 'create', 'delete', 'move', 'copy', 'directory', 'folder', 'path', 'save', 'load'],
  },
  document: {
    tools: ['read_pdf', 'read_docx', 'extract_formulas', 'convert_document', 'archive_document'],
    keywords: ['pdf', 'docx', 'document', 'formula', 'extract', 'convert', 'archive', 'word', 'excel', 'spreadsheet'],
  },
  knowledge: {
    tools: ['search_knowledge_graph', 'write_wiki_page', 'read_wiki_page', 'update_wiki_page', 'delete_wiki_page'],
    keywords: ['wiki', 'knowledge', 'graph', 'search', 'find', 'read', 'write', 'update', 'delete', 'page'],
  },
  network: {
    tools: ['fetch_url', 'download_file', 'upload_file'],
    keywords: ['url', 'http', 'https', 'fetch', 'download', 'upload', 'web', 'api', 'request', 'rest'],
  },
  skills: {
    tools: ['load_skill', 'skill_view', 'check_stale_skills', 'list_skills'],
    keywords: ['skill', 'load', 'check', 'stale', 'list', 'view', 'capability'],
  },
  report: {
    tools: ['generate_report', 'quote_text', 'format_report'],
    keywords: ['report', 'generate', 'quote', 'format', 'document', 'summary', 'export'],
  },
  archive: {
    tools: ['archive_file', 'extract_archive', 'list_archive'],
    keywords: ['archive', 'zip', 'tar', 'gz', 'extract', 'compress', 'decompress', 'backup'],
  },
  system: {
    tools: ['execute_command', 'get_system_info', 'get_process_list', 'kill_process'],
    keywords: ['command', 'execute', 'run', 'system', 'process', 'info', 'kill', 'terminal', 'shell', 'bash'],
  },
};

// â”€â”€ All registered tool names (populated after ensureToolDefinitionsLoaded) â”€â”€
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
  /* debug log removed */
}

/**
 * Select relevant tools based on user message keywords.
 * Returns array of OpenAI-compatible tool definitions.
 * Returns empty array if no keywords match (caller should fallback to full registry).
 */
export function selectRelevantTools(userMessage: string): any[] {
  if (!_loaded) {
    /* initialization required */
    return [];
  }

  const lower = userMessage.toLowerCase();
  const matchedToolNames = new Set<string>();

  // Check each category for keyword matches
  for (const [, category] of Object.entries(TOOL_CATEGORIES)) {
    for (const keyword of category.keywords) {
      if (lower.includes(keyword)) {
        // Add all tools from this category
        for (const toolName of category.tools) {
          if (_allToolNames.includes(toolName)) {
            matchedToolNames.add(toolName);
          }
        }
        break; // One keyword match per category is enough
      }
    }
  }

  // If no keywords matched, return core tools as minimum (not empty)
  if (matchedToolNames.size === 0) {
    const coreSet = new Set(CORE_TOOLS);
    return _allToolDefinitions.filter((t: any) => coreSet.has(t.function?.name));
  }

  // Filter tool definitions to only matched tools
  return _allToolDefinitions.filter((t: any) => matchedToolNames.has(t.function?.name));
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

