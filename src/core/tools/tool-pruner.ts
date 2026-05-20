/**
 * Tool Pruner — Dynamic Tool Selection
 * Chỉ gửi subset tools phù hợp với request context
 * Giảm payload từ 14 tools (~5k tokens) → 4-7 tools (~1.5k tokens)
 */

import { getDefaultRegistry } from './tool-registry.js';

// Tools được phân loại theo ngữ cảnh sử dụng
export const TOOL_CATEGORIES: Record<string, string[]> = {
  // Luôn gửi (core navigation + internet access)
  core: ['list_directory', 'read_file', 'search_knowledge_graph', 'write_wiki_page', 'fetch_url'],
  
  // Document processing (PDF, DOCX) — parse, archive
  document: ['read_pdf', 'read_docx', 'extract_pdf_to_md', 'extract_docx_to_md'],
  
  // Archive & Knowledge Integration (Phase 2)
  archive: ['archive_document', 'search_archived_md', 'quote_from_source'],
  
  // Formula Extraction (Phase 2c) — phân tích công thức từ raw-md
  formula: ['extract_formulas'],
  
  // Skills Manager (Phase 2c) — lazy-load và phát hiện skills cũ
  skills: ['load_skill', 'check_stale_skills'],
  
  // External access (backup — fetch_url đã ở core)
  network: [],
  
  // System operations — chỉ gửi khi cần
  admin: ['process_new_raw', 'execute_command'],
};

/**
 * Keyword patterns để detect context từ user message
 */
const CONTEXT_KEYWORDS: Record<string, RegExp[]> = {
  core: [/^(?!.*(?:pdf|docx|word|download|install|git|npm|docker|archive|raw-md|trích dẫn|tìm.*raw)).*/i],
  document: [/pdf|docx|word|tài liệu|document|báo cáo|report|file|blueprint|raw/i],
  archive: [/archive|raw-md|lưu.*tài liệu|wiki.*tạo|md.?archiver|trích dẫn|tìm.*raw|quote|nguồn.*gốc/i],
  network: [/internet|web|url|http|api|fetch|download|tìm.*(?:hiểu|kiếm)|thông tin.*về|đặc sản|du lịch|văn hóa|địa danh|tỉnh|huyện|xã|nổi tiếng|wiki|google|tin tức|sự kiện|thời tiết|giờ|ngày tháng|năm|bao nhiêu|là gì|ở đâu|như thế nào/i],
  formula: [/công thức|formula|latex|toán|math|equation|ký hiệu.*toán|biểu thức|symbol|OMML/i],
  skills: [/skill|lazy.?load|9router.*skill|kỹ năng|best.?practice|pattern|guide|hướng dẫn|tutorial|workflow/i],
  admin: [/install|npm|git|docker|chạy.*lệnh|run|execute|command|quét|scan|process|xử lý|tài liệu mới|file mới|kiểm tra.*file|phát hiện.*mới|cập nhật.*trạng thái/i],
};

/**
 * Detect context categories từ user message
 */
function detectContext(message: string): string[] {
  const activeCategories: string[] = ['core']; // core luôn active
  
  for (const [category, patterns] of Object.entries(CONTEXT_KEYWORDS)) {
    if (category === 'core') continue; // đã add
    for (const pattern of patterns) {
      if (pattern.test(message)) {
        activeCategories.push(category);
        break;
      }
    }
  }
  
  return activeCategories;
}

// ── Cached tool definitions (lazy-init from ToolRegistry) ──
let _cachedDefinitions: any[] | null = null;
let _registryInitPromise: Promise<any[]> | null = null;

async function loadDefinitionsFromRegistry(): Promise<any[]> {
  if (_cachedDefinitions) return _cachedDefinitions;
  try {
    const registry = await getDefaultRegistry();
    _cachedDefinitions = registry.getDefinitions();
    return _cachedDefinitions;
  } catch {
    return [];
  }
}

/**
 * Lọc tools definitions dựa vào context
 * @param userMessage Message người dùng để detect context
 * @returns Subset các tools định nghĩa
 */
export function selectRelevantTools(userMessage: string): any[] {
  const categories = detectContext(userMessage);
  const allowedToolNames = new Set<string>();
  
  for (const cat of categories) {
    const tools = TOOL_CATEGORIES[cat];
    if (tools) tools.forEach(t => allowedToolNames.add(t));
  }
  
  // Try to load definitions synchronously if cached, or start async init
  if (!_registryInitPromise) {
    _registryInitPromise = loadDefinitionsFromRegistry();
  }
  
  // Use cached definitions if available, otherwise fallback to empty
  const definitions = _cachedDefinitions || [];
  return definitions.filter((tool: any) => 
    allowedToolNames.has(tool.function.name)
  );
}

/**
 * Pre-load tool definitions from registry (call during app startup)
 */
export async function ensureToolDefinitionsLoaded(): Promise<void> {
  await loadDefinitionsFromRegistry();
}

/**
 * Estimate tokens của tools definitions
 */
export function estimateToolsTokenCount(tools: any[]): number {
  const json = JSON.stringify(tools);
  return Math.ceil(json.length / 4);
}

/**
 * Convert selected tool names → human-readable string (cho prompt)
 */
export function listRelevantTools(tools: any[]): string {
  return tools.map(t => `- ${t.function.name}: ${t.function.description}`).join('\n');
}

export default {
  selectRelevantTools,
  estimateToolsTokenCount,
  listRelevantTools,
  TOOL_CATEGORIES,
};