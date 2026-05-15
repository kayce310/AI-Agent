/**
 * Kato Agent — Tool Definitions & Execution
 * Framework 6 Layers — Lớp Lõi (Shared Tools)
 * 
 * Định nghĩa tools chuẩn OpenAI format + hàm execute.
 * Dùng chung cho cả Engine (ReAct loop) và LLM Core.
 * 
 * Tools hiện có (14 tools):
 * - list_directory        : Liệt kê file/thư mục
 * - read_file             : Đọc file text
 * - search_knowledge_graph : Tìm kiếm tri thức
 * - write_wiki_page       : Ghi trang wiki
 * - read_pdf              : Đọc nội dung file PDF
 * - read_docx             : Đọc nội dung file DOCX
 * - extract_pdf_to_md     : Parse PDF → lưu knowledge/raw-md/
 * - extract_docx_to_md    : Parse DOCX → lưu knowledge/raw-md/
 * - archive_document      : Parse + archive tài liệu vào raw-md + wiki (Phase 2)
 * - search_archived_md    : Tìm kiếm trong raw-md archive (Phase 2)
 * - quote_from_source     : Trích dẫn chính xác từ raw-md (Phase 2)
 * - extract_formulas      : Trích xuất công thức từ raw-md đã archive (Phase 2c)
 * - load_skill            : Lazy-load chi tiết một 9router skill (Phase 2c)
 * - check_stale_skills    : Kiểm tra skills cũ, cần review lại (Phase 2c)
 * - fetch_url             : Truy cập internet
 * - process_new_raw       : Quét + xử lý file mới
 * - execute_command       : Chạy lệnh hệ thống (guard)
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import { execSync } from 'child_process';
import { createRequire } from 'module';
import { getSkillContent, findStaleSkills } from './skills-index-manager.js';
const _require = createRequire(import.meta.url);

const BASE_PATH = process.cwd();

/**
 * Chuyển đường dẫn Windows tuyệt đối thành file:// URL cho ESM import
 * Node 24.x ESM loader yêu cầu file:// scheme trên Windows
 */
function toFileUrl(p: string): string {
  const resolved = path.resolve(p).replace(/\\/g, '/');
  // Nếu đã có file:// thì giữ nguyên
  if (resolved.startsWith('file://')) return resolved;
  return 'file:///' + resolved;
}

/**
 * TOOLS_DEFINITION — ChatCompletionTool[] format
 * Áp dụng cho bất kỳ LLM nào support OpenAI-compatible tool calling.
 */
export const TOOLS_DEFINITION: any[] = [
  {
    type: 'function',
    function: {
      name: 'list_directory',
      description: 'Liệt kê các file và thư mục trong một đường dẫn',
      parameters: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'Đường dẫn thư mục cần liệt kê'
          }
        },
        required: ['path']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'read_file',
      description: 'Đọc nội dung của một file văn bản (.md, .ts, .json, .txt, .m, .bat, .ps1, .yml, .yaml, .env, .gitignore)',
      parameters: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'Đường dẫn file cần đọc'
          }
        },
        required: ['path']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'search_knowledge_graph',
      description: 'Tìm kiếm trong cơ sở tri thức (knowledge/wiki/ + knowledge/blueprints/)',
      parameters: {
        type: 'object',
        properties: {
          keyword: {
            type: 'string',
            description: 'Từ khóa cần tìm kiếm'
          }
        },
        required: ['keyword']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'write_wiki_page',
      description: 'Tạo hoặc cập nhật một trang wiki trong knowledge/wiki/',
      parameters: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'Đường dẫn file wiki cần tạo (vd: projects/ovap-x1.md)'
          },
          content: {
            type: 'string',
            description: 'Nội dung markdown của trang wiki'
          },
          tags: {
            type: 'string',
            description: 'Các tag phân cách bởi dấu cách'
          }
        },
        required: ['path', 'content']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'read_pdf',
      description: 'Đọc nội dung văn bản từ một file PDF. Dùng khi cần đọc tài liệu PDF (báo cáo, tài liệu kỹ thuật, sách, paper)',
      parameters: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'Đường dẫn file PDF cần đọc'
          },
          max_pages: {
            type: 'number',
            description: 'Số trang tối đa cần đọc (mặc định 10, 0 = tất cả)',
            default: 10
          }
        },
        required: ['path']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'read_docx',
      description: 'Đọc nội dung văn bản từ một file DOCX. Hỗ trợ heading, bold, italic, table. Dùng khi cần đọc tài liệu Word.',
      parameters: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'Đường dẫn file DOCX cần đọc'
          },
          max_length: {
            type: 'number',
            description: 'Số ký tự tối đa trả về (mặc định 20000)',
            default: 20000
          }
        },
        required: ['path']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'extract_pdf_to_md',
      description: 'Parse toàn bộ file PDF → markdown và lưu vào knowledge/raw-md/. Dùng khi cần archive tài liệu PDF dài để tra cứu sau.',
      parameters: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'Đường dẫn file PDF cần parse'
          }
        },
        required: ['path']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'extract_docx_to_md',
      description: 'Parse toàn bộ file DOCX → markdown và lưu vào knowledge/raw-md/. Dùng khi cần archive tài liệu Word để tra cứu sau.',
      parameters: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'Đường dẫn file DOCX cần parse'
          }
        },
        required: ['path']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'archive_document',
      description: 'Parse file PDF/DOCX → lưu raw-md và tạo wiki summary. Dùng khi muốn archive tài liệu vào hệ thống tri thức.',
      parameters: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'Đường dẫn file PDF hoặc DOCX cần archive'
          },
          topic: {
            type: 'string',
            description: 'Tên chủ đề cho wiki page (optional, nếu không cung cấp sẽ chỉ lưu raw-md)'
          }
        },
        required: ['path']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'search_archived_md',
      description: 'Tìm kiếm trong knowledge/raw-md/ (các file .md đã convert từ PDF/DOCX) bằng từ khóa hoặc regex pattern',
      parameters: {
        type: 'object',
        properties: {
          keyword: {
            type: 'string',
            description: 'Từ khóa hoặc regex pattern cần tìm kiếm'
          },
          max_results: {
            type: 'number',
            description: 'Số kết quả tối đa trả về (mặc định 20)',
            default: 20
          }
        },
        required: ['keyword']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'quote_from_source',
      description: 'Trích dẫn chính xác từ file .md trong knowledge/raw-md/, hiển thị context xung quanh để xác thực nguồn',
      parameters: {
        type: 'object',
        properties: {
          mdPath: {
            type: 'string',
            description: 'Tên file .md (vd: report.md) hoặc đường dẫn đầy đủ trong raw-md'
          },
          keyword: {
            type: 'string',
            description: 'Từ khóa cần trích dẫn'
          },
          context_lines: {
            type: 'number',
            description: 'Số dòng context xung quanh (mặc định 5)',
            default: 5
          }
        },
        required: ['mdPath', 'keyword']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'fetch_url',
      description: 'Truy cập một URL và lấy nội dung văn bản (dùng fetch built-in Node 18+)',
      parameters: {
        type: 'object',
        properties: {
          url: {
            type: 'string',
            description: 'URL cần truy cập (http hoặc https)'
          },
          max_length: {
            type: 'number',
            description: 'Số ký tự tối đa trả về (mặc định 15000)',
            default: 15000
          }
        },
        required: ['url']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'process_new_raw',
      description: 'Quét knowledge/raw/ và knowledge/blueprints/ phát hiện file mới chưa xử lý, đề xuất xử lý',
      parameters: {
        type: 'object',
        properties: {
          directory: {
            type: 'string',
            description: 'Thư mục cần quét (raw, blueprints, hoặc all)',
            enum: ['raw', 'blueprints', 'all']
          }
        },
        required: ['directory']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'generate_report',
      description: 'Sinh báo cáo text từ outline + sources + style. Output ready-to-copy với citations. Dùng khi user yêu cầu viết báo cáo từ tài liệu đã archive.',
      parameters: {
        type: 'object',
        properties: {
          outline: {
            type: 'string',
            description: 'Sườn báo cáo (text outline với các section headings)'
          },
          sources: {
            type: 'array',
            items: { type: 'string' },
            description: 'Danh sách đường dẫn file .md trong knowledge/raw-md/ hoặc knowledge/wiki/'
          },
          style: {
            type: 'string',
            enum: ['technical', 'scientific', 'daily', 'custom'],
            description: 'Phong cách báo cáo: technical (kỹ thuật), scientific (khoa học), daily (công việc), custom (tùy chỉnh)'
          },
          title: {
            type: 'string',
            description: 'Tiêu đề báo cáo (optional)'
          },
          author: {
            type: 'string',
            description: 'Tác giả báo cáo (optional)'
          }
        },
        required: ['outline', 'sources', 'style']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'execute_command',
      description: 'Chạy một lệnh hệ thống trong whitelist an toàn (npm, git, docker-compose, npx tsx, node, cd, ls, dir, cat)',
      parameters: {
        type: 'object',
        properties: {
          command: {
            type: 'string',
            description: 'Lệnh cần chạy (phải khớp whitelist guard)'
          },
          description: {
            type: 'string',
            description: 'Mô tả ngắn về mục đích chạy lệnh'
          }
        },
        required: ['command', 'description']
      }
    }
  },

  // ──────────────────────────────────────────────
  // Phase 2c: Formula Extractor & Skills Manager
  // ──────────────────────────────────────────────

  {
    type: 'function',
    function: {
      name: 'extract_formulas',
      description: 'Trích xuất công thức (LaTeX, OMML, symbols) từ file .md trong knowledge/raw-md/. Dùng khi cần phân tích công thức toán học từ tài liệu đã archive.',
      parameters: {
        type: 'object',
        properties: {
          mdPath: {
            type: 'string',
            description: 'Đường dẫn file .md trong raw-md (vd: report.md hoặc path đầy đủ)'
          }
        },
        required: ['mdPath']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'load_skill',
      description: 'Lazy-load chi tiết một 9router skill (file skill.md) từ thư mục 9router/skills/. Chỉ tải đúng skill cần dùng, tránh đọc toàn bộ skills.',
      parameters: {
        type: 'object',
        properties: {
          skill_name: {
            type: 'string',
            description: 'Tên skill cần load (vd: "typescript-best-practices", "react-patterns")'
          }
        },
        required: ['skill_name']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'check_stale_skills',
      description: 'Kiểm tra danh sách skills đã lâu không được review/cập nhật (>30 ngày). Dùng để phát hiện skills cũ cần review lại.',
      parameters: {
        type: 'object',
        properties: {
          stale_days: {
            type: 'number',
            description: 'Số ngày không thay đổi để coi là stale (mặc định 30)',
            default: 30
          }
        },
        required: []
      }
    }
  }
];

/**
 * Kiểm tra đường dẫn có nằm trong dự án không (chống path traversal)
 */
function isPathSafe(targetPath: string): boolean {
  const resolved = path.resolve(BASE_PATH, targetPath);
  return resolved.startsWith(BASE_PATH);
}

/**
 * Whitelist các lệnh an toàn cho execute_command
 */
const COMMAND_WHITELIST_PREFIXES = [
  'npm', 'git', 'node', 'npx tsx', 'npx',
  'docker-compose', 'docker',
  'cd', 'dir', 'ls', 'cat', 'type', 'echo',
  'cmd /c', 'powershell',
  'code',
  'python', 'python3', 'pip', 'pip3',
  'pdftotext',
  'curl',
  'wget',
];

function isCommandSafe(command: string): boolean {
  const trimmed = command.trim().toLowerCase();
  // Chỉ cho phép các lệnh bắt đầu bằng whitelist prefix
  return COMMAND_WHITELIST_PREFIXES.some(prefix => trimmed.startsWith(prefix));
}

/**
 * Đọc processed-files.json để biết file nào đã xử lý rồi
 */
function loadProcessedFiles(): string[] {
  try {
    const pfPath = path.join(BASE_PATH, 'knowledge/workspace/processed-files.json');
    if (fs.existsSync(pfPath)) {
      const data = JSON.parse(fs.readFileSync(pfPath, 'utf8'));
      // FIX: processed-files.json có cấu trúc { files: [...] } KHÔNG phải { processed: [...] }
      if (data.files && Array.isArray(data.files)) {
        return data.files.map((f: any) => f.path);
      }
      return data.processed || [];
    }
  } catch { /* ignore */ }
  return [];
}

/**
 * Ghi một entry vào processed-files.json (auto-mark sau khi xử lý)
 * Tuân thủ CLINE.md Rule #4: dùng kato-state-manager để đọc/ghi state
 */
function addProcessedFile(entry: {
  path: string;
  type: string;
  action: string;
  destination?: string;
  checksum?: string;
  notes?: string;
}): boolean {
  try {
    const pfPath = path.join(BASE_PATH, 'knowledge/workspace/processed-files.json');
    let data: any = { schemaVersion: '1.0', files: [], meta: { lastUpdated: new Date().toISOString() } };
    
    if (fs.existsSync(pfPath)) {
      data = JSON.parse(fs.readFileSync(pfPath, 'utf8'));
    }
    
    // Kiểm tra duplicate (cùng path + action)
    if (data.files && Array.isArray(data.files)) {
      const dup = data.files.find((f: any) => f.path === entry.path && f.action === entry.action);
      if (dup) {
        // Update existing
        Object.assign(dup, entry, { processedAt: new Date().toISOString() });
      } else {
        data.files.push({
          ...entry,
          checksum: entry.checksum || '',
          processedAt: new Date().toISOString()
        });
      }
    } else {
      data.files = [{ ...entry, checksum: entry.checksum || '', processedAt: new Date().toISOString() }];
    }
    
    // Recalculate stats
    data.meta.lastUpdated = new Date().toISOString();
    const byType: Record<string, number> = {};
    for (const f of data.files) {
      byType[f.type] = (byType[f.type] || 0) + 1;
    }
    data.stats = {
      totalProcessed: data.files.length,
      byType
    };
    
    fs.writeFileSync(pfPath, JSON.stringify(data, null, 2), 'utf8');
    console.log(`📝 auto-mark processed: ${entry.path} (${entry.action})`);
    return true;
  } catch (err: any) {
    console.error(`❌ Failed to mark processed file: ${err.message}`);
    return false;
  }
}

/**
 * Thực thi một tool call và trả về kết quả.
 * LƯU Ý: Hàm này là synchronous. Các tool async (như pdf-parse) phải được
 * wrap bằng execSync hoặc xử lý đồng bộ tương tự.
 * @param toolCall - Tool call từ LLM response
 * @returns Kết quả thực thi (JSON-serializable)
 */
export function executeToolCall(toolCall: any): any {
  try {
    const functionName = toolCall.function.name;
    const args = JSON.parse(toolCall.function.arguments);

    console.log(`🔧 Executing tool ${functionName} with args:`, args);

    // ── list_directory ──
    if (functionName === 'list_directory') {
      const targetPath = args.path;
      if (!isPathSafe(targetPath)) {
        return { error: `Đường dẫn ${targetPath} không được phép truy cập` };
      }
      if (!fs.existsSync(targetPath)) {
        return { error: `Thư mục ${targetPath} không tồn tại` };
      }
      return fs.readdirSync(targetPath, { withFileTypes: true }).map(item => ({
        name: item.name,
        type: item.isDirectory() ? 'directory' : 'file'
      }));
    }

    // ── read_file ──
    if (functionName === 'read_file') {
      const targetPath = args.path;
      if (!isPathSafe(targetPath)) {
        return { error: `Đường dẫn ${targetPath} không được phép truy cập` };
      }
      if (!fs.existsSync(targetPath)) {
        return { error: `File ${targetPath} không tồn tại` };
      }
      if (!fs.statSync(targetPath).isFile()) {
        return { error: `${targetPath} không phải là file` };
      }
      return { content: fs.readFileSync(targetPath, 'utf8') };
    }

    // ── search_knowledge_graph ──
    if (functionName === 'search_knowledge_graph') {
      const keyword = args.keyword.toLowerCase();
      const results: any[] = [];

      const scanPaths = ['knowledge/wiki/', 'knowledge/blueprints/', 'knowledge/raw-md/'];

      for (const baseDir of scanPaths) {
        const fullDir = path.join(BASE_PATH, baseDir);
        if (!fs.existsSync(fullDir)) continue;

        scanDir(fullDir, baseDir, keyword, results);
      }

      results.sort((a, b) => b.priority - a.priority);

      return {
        keyword: args.keyword,
        total_results: results.length,
        results: results.slice(0, 20)
      };
    }

    // ── write_wiki_page ──
    if (functionName === 'write_wiki_page') {
      const relativePath = args.path.replace(/^\/+/, '');
      // Kiểm tra path không thoát khỏi knowledge/wiki/
      const fullPath = path.resolve(BASE_PATH, 'knowledge/wiki/', relativePath);
      if (!fullPath.startsWith(path.resolve(BASE_PATH, 'knowledge/wiki/'))) {
        return { error: 'Đường dẫn không được phép thoát khỏi knowledge/wiki/' };
      }

      const dirPath = path.dirname(fullPath);
      fs.mkdirSync(dirPath, { recursive: true });

      let content = args.content;
      if (args.tags) {
        content += `\n\n---\n#${args.tags.split(' ').join(' #')}`;
      }

      fs.writeFileSync(fullPath, content, 'utf8');

      // Auto-mark vào processed-files.json
      const wikiRelPath = path.join('knowledge/wiki/', relativePath);
      addProcessedFile({
        path: wikiRelPath,
        type: 'document',
        action: 'wiki_created',
        notes: args.tags ? `tags: ${args.tags}` : undefined,
      });

      return { success: true, path: wikiRelPath };
    }

    // ── read_pdf ──
    if (functionName === 'read_pdf') {
      const targetPath = args.path;
      if (!isPathSafe(targetPath)) {
        return { error: `Đường dẫn ${targetPath} không được phép truy cập` };
      }
      if (!fs.existsSync(targetPath)) {
        return { error: `File PDF ${targetPath} không tồn tại` };
      }
      if (!fs.statSync(targetPath).isFile()) {
        return { error: `${targetPath} không phải là file` };
      }

      try {
        // pdf-parse v2 là ESM only. Dùng temp file .mjs + execSync để đọc PDF đồng bộ.
        // KHÔNG dùng inline base64 vì file lớn sẽ gây ENAMETOOLONG.
        const maxPages = args.max_pages || 10;
        const tmpScriptPath = path.join(BASE_PATH, '.tmp-read-pdf.mjs');
        const pdfPathJs = path.resolve(targetPath).replace(/\\/g, '/');

        const tmpScript = `
import { PDFParse } from 'pdf-parse';
import fs from 'fs';
const buf = fs.readFileSync('${pdfPathJs}');
const parser = new PDFParse({ data: buf });
const textResult = await parser.getText({ first: ${maxPages} });
let text = textResult.text || '';
const pages = textResult.pages || [];
const numPages = pages.length || 0;
// Page break markers
if (pages.length > 1) {
  text = pages.map((p, idx) => {
    const pageText = (p.text || '').trim();
    if (!pageText) return '';
    const prefix = idx === 0 ? '' : '\\n\\n--- Page ' + (idx + 1) + ' ---\\n\\n';
    return prefix + pageText;
  }).filter(Boolean).join('');
}
if (text.length > 20000) {
  text = text.substring(0, 20000) + '\\n\\n[... truncated at 20000 chars]';
}
process.stdout.write(JSON.stringify({
  content: text,
  pageCount: numPages
}));
`;
        fs.writeFileSync(tmpScriptPath, tmpScript, 'utf8');

        const output = execSync(`node "${tmpScriptPath}"`, {
          cwd: BASE_PATH,
          encoding: 'utf8',
          timeout: 30000,
          maxBuffer: 5 * 1024 * 1024, // 5MB
          windowsHide: true
        });

        // Clean up temp file
        try { fs.unlinkSync(tmpScriptPath); } catch {}

        const result = JSON.parse(output.trim());
        if (result.error) {
          return { error: `Không thể đọc PDF: ${result.error}` };
        }
        return result;
      } catch (err: any) {
        return { error: `Không thể đọc PDF: ${err.message}` };
      }
    }

    // ── read_docx ──
    if (functionName === 'read_docx') {
      const targetPath = args.path;
      if (!isPathSafe(targetPath)) {
        return { error: `Đường dẫn ${targetPath} không được phép truy cập` };
      }
      if (!fs.existsSync(targetPath)) {
        return { error: `File DOCX ${targetPath} không tồn tại` };
      }
      if (!fs.statSync(targetPath).isFile()) {
        return { error: `${targetPath} không phải là file` };
      }

      try {
        const maxLength = args.max_length || 20000;
        // Gọi docx-parser qua execSync temp script
        // QUAN TRỌNG: viết temp script trong project root (có package.json + node_modules)
        // Nếu viết trong os.tmpdir() sẽ không có module resolution cho mammoth
        const tmpDir = path.join(BASE_PATH, '.tmp-docx-' + Date.now());
        fs.mkdirSync(tmpDir, { recursive: true });
        const tmpScriptPath = path.join(tmpDir, 'parse-docx.mjs');
        const docxPathJs = path.resolve(targetPath).replace(/\\/g, '/');

        const scriptContent = `
import mammoth from 'mammoth';
import fs from 'fs';
const buf = fs.readFileSync('${docxPathJs}');
const result = await mammoth.convertToRawText({ buffer: buf });
let text = result.value || '';
if (text.length > ${maxLength}) {
  text = text.substring(0, ${maxLength}) + '\\n\\n[... truncated at ${maxLength} chars]';
}
process.stdout.write(JSON.stringify({ content: text }));
`;
        fs.writeFileSync(tmpScriptPath, scriptContent, 'utf8');

        const output = execSync(`node "${tmpScriptPath}"`, {
          cwd: BASE_PATH,
          encoding: 'utf8',
          timeout: 60000,
          maxBuffer: 50 * 1024 * 1024,
          windowsHide: true
        });

        // Cleanup
        try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}

        const result = JSON.parse(output.trim());
        if (result.error) {
          return { error: `Không thể đọc DOCX: ${result.error}` };
        }
        return result;
      } catch (err: any) {
        return { error: `Không thể đọc DOCX: ${err.message}` };
      }
    }

    // ── extract_pdf_to_md ──
    if (functionName === 'extract_pdf_to_md') {
      const targetPath = args.path;
      if (!isPathSafe(targetPath)) {
        return { error: `Đường dẫn ${targetPath} không được phép truy cập` };
      }
      if (!fs.existsSync(targetPath)) {
        return { error: `File PDF ${targetPath} không tồn tại` };
      }

      try {
        // Chạy converter qua execSync (giống pattern read_pdf/read_docx)
        // Converter là ESM module, không thể require() từ CJS context
        const pdfPathJs = path.resolve(targetPath).replace(/\\/g, '/');
        const tmpDir = path.join(BASE_PATH, '.tmp-convert-' + Date.now());
        fs.mkdirSync(tmpDir, { recursive: true });
        const tmpScriptPath = path.join(tmpDir, 'convert-pdf.mjs');

        const scriptContent = `
import { convertDocumentToMd } from '${toFileUrl(BASE_PATH)}/src/modules/document/converter.js';
const result = convertDocumentToMd('${pdfPathJs}');
process.stdout.write(JSON.stringify(result));
`;
        fs.writeFileSync(tmpScriptPath, scriptContent, 'utf8');

        const output = execSync(`node "${tmpScriptPath}"`, {
          cwd: BASE_PATH,
          encoding: 'utf8',
          timeout: 120000,
          maxBuffer: 50 * 1024 * 1024,
          windowsHide: true
        });

        try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}

        const result = JSON.parse(output.trim());

        // Auto-mark vào processed-files.json
        addProcessedFile({
          path: targetPath,
          type: 'pdf',
          action: 'extracted_to_md',
          destination: result.mdPath,
        });

        return {
          success: true,
          message: `✅ Đã chuyển đổi PDF → Markdown`,
          mdPath: result.mdPath,
          fileName: result.fileName,
          sizeKB: Math.round(result.size / 1024)
        };
      } catch (err: any) {
        return { error: `Không thể chuyển đổi PDF: ${err.message}` };
      }
    }

    // ── extract_docx_to_md ──
    if (functionName === 'extract_docx_to_md') {
      const targetPath = args.path;
      if (!isPathSafe(targetPath)) {
        return { error: `Đường dẫn ${targetPath} không được phép truy cập` };
      }
      if (!fs.existsSync(targetPath)) {
        return { error: `File DOCX ${targetPath} không tồn tại` };
      }

      try {
        const docxPathJs = path.resolve(targetPath).replace(/\\/g, '/');
        const tmpDir = path.join(BASE_PATH, '.tmp-convert-' + Date.now());
        fs.mkdirSync(tmpDir, { recursive: true });
        const tmpScriptPath = path.join(tmpDir, 'convert-docx.mjs');

        const scriptContent = `
import { convertDocumentToMd } from '${toFileUrl(BASE_PATH)}/src/modules/document/converter.js';
const result = convertDocumentToMd('${docxPathJs}');
process.stdout.write(JSON.stringify(result));
`;
        fs.writeFileSync(tmpScriptPath, scriptContent, 'utf8');

        const output = execSync(`node "${tmpScriptPath}"`, {
          cwd: BASE_PATH,
          encoding: 'utf8',
          timeout: 120000,
          maxBuffer: 50 * 1024 * 1024,
          windowsHide: true
        });

        try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}

        const result = JSON.parse(output.trim());

        // Auto-mark vào processed-files.json
        addProcessedFile({
          path: targetPath,
          type: 'document',
          action: 'extracted_to_md',
          destination: result.mdPath,
        });

        return {
          success: true,
          message: `✅ Đã chuyển đổi DOCX → Markdown`,
          mdPath: result.mdPath,
          fileName: result.fileName,
          sizeKB: Math.round(result.size / 1024)
        };
      } catch (err: any) {
        return { error: `Không thể chuyển đổi DOCX: ${err.message}` };
      }
    }

    // ── archive_document ──
    if (functionName === 'archive_document') {
      const targetPath = args.path;
      if (!isPathSafe(targetPath)) {
        return { error: `Đường dẫn ${targetPath} không được phép truy cập` };
      }
      if (!fs.existsSync(targetPath)) {
        return { error: `File ${targetPath} không tồn tại` };
      }

      try {
        const tmpDir = path.join(BASE_PATH, '.tmp-archive-' + Date.now());
        fs.mkdirSync(tmpDir, { recursive: true });
        const tmpScriptPath = path.join(tmpDir, 'archive.mjs');
        const filePathJs = path.resolve(targetPath).replace(/\\/g, '/');
        const topic = args.topic || '';

        const scriptContent = `
import { archiveDocument } from '${toFileUrl(BASE_PATH)}/src/modules/knowledge/md-archiver.js';
const result = archiveDocument('${filePathJs}', ${topic ? `'${topic.replace(/'/g, "\\'")}'` : undefined});
process.stdout.write(JSON.stringify(result));
`;
        fs.writeFileSync(tmpScriptPath, scriptContent, 'utf8');

        const output = execSync(`node "${tmpScriptPath}"`, {
          cwd: BASE_PATH,
          encoding: 'utf8',
          timeout: 120000,
          maxBuffer: 50 * 1024 * 1024,
          windowsHide: true
        });

        try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}

        const result = JSON.parse(output.trim());
        if (!result.success) {
          return { error: result.error || 'Không thể archive tài liệu' };
        }

        // Auto-mark vào processed-files.json
        addProcessedFile({
          path: targetPath,
          type: 'document',
          action: 'archived',
          destination: result.rawMdPath,
          notes: result.wikiPath ? `wiki: ${result.wikiPath}` : undefined,
        });

        return {
          success: true,
          message: `✅ Đã archive tài liệu`,
          rawMdPath: result.rawMdPath,
          wikiPath: result.wikiPath || undefined,
          summary: result.summary ? result.summary.substring(0, 500) : undefined,
        };
      } catch (err: any) {
        return { error: `Không thể archive tài liệu: ${err.message}` };
      }
    }

    // ── search_archived_md ──
    if (functionName === 'search_archived_md') {
      try {
        const tmpDir = path.join(BASE_PATH, '.tmp-search-' + Date.now());
        fs.mkdirSync(tmpDir, { recursive: true });
        const tmpScriptPath = path.join(tmpDir, 'search.mjs');
        const keyword = args.keyword.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
        const maxResults = args.max_results || 20;

        const scriptContent = `
import { searchArchivedMd } from '${toFileUrl(BASE_PATH)}/src/modules/knowledge/md-archiver.js';
const result = searchArchivedMd('${keyword}', ${maxResults});
process.stdout.write(JSON.stringify(result));
`;
        fs.writeFileSync(tmpScriptPath, scriptContent, 'utf8');

        const output = execSync(`node "${tmpScriptPath}"`, {
          cwd: BASE_PATH,
          encoding: 'utf8',
          timeout: 30000,
          maxBuffer: 10 * 1024 * 1024,
          windowsHide: true
        });

        try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}

        const result = JSON.parse(output.trim());
        if (result.total === 0) {
          return `🔍 Không tìm thấy kết quả cho "${args.keyword}" trong archived documents.`;
        }
        return {
          keyword: args.keyword,
          total: result.total,
          results: result.results.map((r: any) => ({
            file: r.file,
            line: r.line,
            context: r.context,
          })),
        };
      } catch (err: any) {
        return { error: `Không thể tìm kiếm: ${err.message}` };
      }
    }

    // ── quote_from_source ──
    if (functionName === 'quote_from_source') {
      try {
        const tmpDir = path.join(BASE_PATH, '.tmp-quote-' + Date.now());
        fs.mkdirSync(tmpDir, { recursive: true });
        const tmpScriptPath = path.join(tmpDir, 'quote.mjs');
        const mdPath = args.mdPath.replace(/\\/g, '/').replace(/'/g, "\\'");
        const keyword = args.keyword.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
        const contextLines = args.context_lines || 5;

        const scriptContent = `
import { quoteFromSource } from '${toFileUrl(BASE_PATH)}/src/modules/knowledge/md-archiver.js';
const result = quoteFromSource('${mdPath}', '${keyword}', ${contextLines});
process.stdout.write(JSON.stringify(result));
`;
        fs.writeFileSync(tmpScriptPath, scriptContent, 'utf8');

        const output = execSync(`node "${tmpScriptPath}"`, {
          cwd: BASE_PATH,
          encoding: 'utf8',
          timeout: 30000,
          maxBuffer: 10 * 1024 * 1024,
          windowsHide: true
        });

        try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}

        const result = JSON.parse(output.trim());
        if (result.total === 0) {
          return `📝 Không tìm thấy trích dẫn nào cho "${args.keyword}" trong "${args.mdPath}".`;
        }
        return {
          source: args.mdPath,
          keyword: args.keyword,
          total: result.total,
          quotes: result.quotes,
        };
      } catch (err: any) {
        return { error: `Không thể trích dẫn: ${err.message}` };
      }
    }

    // ── fetch_url ──
    if (functionName === 'fetch_url') {
      const url = args.url;
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        return { error: 'URL phải bắt đầu bằng http:// hoặc https://' };
      }

      // Sync fetch via child_process (vì executeToolCall là sync)
      // Dùng Node inline script để fetch và in ra stdout
      // KHÔNG truncation — trả full content. LLM cần đủ context để không hallucinate.
      // maxBuffer 500KB là giới hạn system, không phải max_length.
      const script = `
const fetch = globalThis.fetch;
const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 10000);
fetch('${url.replace(/'/g, "\\'")}', {
  signal: controller.signal,
  headers: { 'User-Agent': 'Kato-Agent/1.0' }
}).then(async r => {
  clearTimeout(timeout);
  if (!r.ok) { process.exit(1); }
  const txt = await r.text();
  process.stdout.write(txt);
}).catch(() => process.exit(1));
`;

      try {
        const output = execSync(`node -e "${script.replace(/"/g, '\\"').replace(/\n/g, ' ')}"`, {
          cwd: BASE_PATH,
          encoding: 'utf8',
          timeout: 15000, // 15s timeout
          maxBuffer: 1024 * 1024, // 1MB — đủ cho Wikipedia full article
          windowsHide: true
        });

        if (!output || output.trim().length === 0) {
          return `❌ Không thể truy cập ${url} (HTTP error hoặc timeout)`;
        }

        return `📄 Nội dung từ ${url}:\n\n${output.substring(0, 102400)}` + (output.length > 102400 ? '\n\n[... trang quá dài, đã cắt ở 100KB]' : '');
      } catch (err: any) {
        return { error: `Lỗi fetch ${url}: ${err.message}` };
      }
    }

    // ── process_new_raw ──
    if (functionName === 'process_new_raw') {
      const processed = loadProcessedFiles();
      const scanDirs: string[] = [];

      if (args.directory === 'raw' || args.directory === 'all') {
        scanDirs.push('knowledge/raw/');
      }
      if (args.directory === 'blueprints' || args.directory === 'all') {
        scanDirs.push('knowledge/blueprints/');
      }

      const unprocessed: any[] = [];

      for (const scanDir of scanDirs) {
        const fullDir = path.join(BASE_PATH, scanDir);
        if (!fs.existsSync(fullDir)) continue;

        const items = fs.readdirSync(fullDir, { withFileTypes: true });
        for (const item of items) {
          const relativePath = scanDir + item.name;
          if (!processed.includes(relativePath) && !item.isDirectory()) {
            const ext = path.extname(item.name).toLowerCase();
            const fileSize = fs.statSync(path.join(fullDir, item.name)).size;
            unprocessed.push({
              path: relativePath,
              type: ext === '.pdf' ? 'pdf' : ext === '.md' ? 'markdown' : ext,
              sizeBytes: fileSize,
              suggested: ext === '.md' ? 'Ingest vào wiki' : ext === '.pdf' ? 'Dùng read_pdf để đọc' : 'Cần xác định cách xử lý'
            });
          }
        }
      }

      return {
        scanned_directories: scanDirs,
        total_unprocessed: unprocessed.length,
        files: unprocessed,
        note: unprocessed.length === 0 ? '✅ Không có file mới cần xử lý.' : undefined
      };
    }

    // ── generate_report ──
    if (functionName === 'generate_report') {
      try {
        // Dùng execSync vì generator module là ESM (createRequire không load được)
        const tmpDir = path.join(BASE_PATH, '.tmp-report-' + Date.now());
        fs.mkdirSync(tmpDir, { recursive: true });
        const tmpScriptPath = path.join(tmpDir, 'report.mjs');

        const outline = args.outline.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
        const sources = (args.sources || []).map((s: string) => `'${s.replace(/'/g, "\\'")}'`).join(',');
        const style = args.style || 'technical';
        const title = (args.title || '').replace(/'/g, "\\'");
        const author = (args.author || '').replace(/'/g, "\\'");

        const scriptContent = `
import { generateReport } from '${toFileUrl(BASE_PATH)}/src/modules/report/generator.js';
const result = generateReport({
  outline: '${outline}',
  sources: [${sources}],
  style: '${style}',
  title: '${title}',
  author: '${author}',
});
process.stdout.write(JSON.stringify(result));
`;
        fs.writeFileSync(tmpScriptPath, scriptContent, 'utf8');

        const output = execSync(`node "${tmpScriptPath}"`, {
          cwd: BASE_PATH,
          encoding: 'utf8',
          timeout: 30000,
          maxBuffer: 10 * 1024 * 1024,
          windowsHide: true
        });

        try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}

        const result = JSON.parse(output.trim());
        if (!result.success) {
          return { error: `Không thể tạo báo cáo: ${result.error}` };
        }

        return {
          success: true,
          title: result.title,
          style: result.style,
          markdown: result.markdown,
          totalWords: result.totalWords,
          citationsUsed: result.citationsUsed,
          message: `✅ Đã tạo báo cáo "${result.title}" (${result.style}, ${result.totalWords} từ, ${result.citationsUsed.length} citations)`,
        };
      } catch (err: any) {
        return { error: `Không thể tạo báo cáo: ${err.message}` };
      }
    }

    // ── execute_command ──
    if (functionName === 'execute_command') {
      const command = args.command;
      const description = args.description;

      if (!isCommandSafe(command)) {
        return {
          error: `Lệnh không được phép: "${command}". Chỉ chấp nhận: ${COMMAND_WHITELIST_PREFIXES.join(', ')}`
        };
      }

      try {
        const output = execSync(command, {
          cwd: BASE_PATH,
          encoding: 'utf8',
          timeout: 15000, // 15s timeout
          maxBuffer: 50 * 1024, // 50KB
          windowsHide: true
        });

        // Giới hạn output
        const truncated = output.length > 2000
          ? output.substring(0, 2000) + '\n\n[... output truncated at 2000 chars]'
          : output;

        return {
          description,
          command,
          exitCode: 0,
          output: truncated
        };
      } catch (err: any) {
        const stderr = err.stderr || err.message || 'Unknown error';
        return {
          description,
          command,
          exitCode: err.status || 1,
          error: stderr.substring(0, 2000)
        };
      }
    }

    // ──────────────────────────────────────────────
    // Phase 2c: Formula Extractor & Skills Manager
    // ──────────────────────────────────────────────

    // ── extract_formulas ──
    if (functionName === 'extract_formulas') {
      try {
        const mdPath = args.mdPath.replace(/\\/g, '/').replace(/'/g, "\\'");
        const tmpDir = path.join(BASE_PATH, '.tmp-formula-' + Date.now());
        fs.mkdirSync(tmpDir, { recursive: true });
        const tmpScriptPath = path.join(tmpDir, 'extract-formula.mjs');

        const scriptContent = `
import { extractFormulasFromMd, formatFormulasToMd } from '${toFileUrl(BASE_PATH)}/src/modules/document/formula-extractor.js';
const result = extractFormulasFromMd('${mdPath}');
const formatted = formatFormulasToMd(result);
process.stdout.write(JSON.stringify({ total: result.length, formulas: result, markdown: formatted }));
`;
        fs.writeFileSync(tmpScriptPath, scriptContent, 'utf8');

        const output = execSync(`node "${tmpScriptPath}"`, {
          cwd: BASE_PATH,
          encoding: 'utf8',
          timeout: 30000,
          maxBuffer: 10 * 1024 * 1024,
          windowsHide: true
        });

        try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}

        const result = JSON.parse(output.trim());
        if (result.total === 0) {
          return `📐 Không tìm thấy công thức nào trong "${args.mdPath}".`;
        }
        return {
          source: args.mdPath,
          total_formulas: result.total,
          formulas: result.formulas.map((f: any) => ({
            type: f.type,
            line: f.lineNumber,
            content: f.content,
            normalized: f.normalized,
          })),
          markdown_section: result.markdown,
        };
      } catch (err: any) {
        return { error: `Không thể trích xuất công thức: ${err.message}` };
      }
    }

    // ── load_skill ──
    if (functionName === 'load_skill') {
      try {
        // Delegate sang skills-index-manager (lazy-load từ knowledge/wiki/skills/)
        const { skill, content, error } = getSkillContent(args.skill_name);
        
        if (error || !skill || !content) {
          // Fallback sang 9router/skills/ (skill cũ)
          const skillNameClean = args.skill_name.replace(/[^a-zA-Z0-9_\-]/g, '');
          const skillsBase = path.join(BASE_PATH, '9router/skills');
          if (fs.existsSync(skillsBase)) {
            const items = fs.readdirSync(skillsBase, { withFileTypes: true });
            let skillFile: string | null = null;
            for (const item of items) {
              if (item.isDirectory() && item.name.includes(skillNameClean)) {
                const possibleFiles = ['skill.md', 'README.md', `${skillNameClean}.md`];
                for (const f of possibleFiles) {
                  const fp = path.join(skillsBase, item.name, f);
                  if (fs.existsSync(fp)) { skillFile = fp; break; }
                }
              } else if (item.isFile() && item.name.includes(skillNameClean) && item.name.endsWith('.md')) {
                skillFile = path.join(skillsBase, item.name);
              }
              if (skillFile) break;
            }
            if (skillFile) {
              const fallbackContent = fs.readFileSync(skillFile, 'utf8');
              const stat = fs.statSync(skillFile);
              return {
                skill_name: args.skill_name,
                source: '9router/skills/ (legacy)',
                file: path.relative(skillsBase, skillFile),
                last_modified: stat.mtime.toISOString(),
                size: stat.size,
                content: fallbackContent.substring(0, 30000) + (fallbackContent.length > 30000 ? '\n\n[... skill truncated at 30000 chars]' : ''),
              };
            }
          }
          return { error: error || `Không tìm thấy skill "${args.skill_name}"` };
        }

        return {
          skill_name: args.skill_name,
          source: 'knowledge/wiki/skills/',
          file: skill.relativePath,
          display_name: skill.displayName,
          generated_at: skill.generatedAt,
          last_modified: skill.lastModified,
          tags: skill.tags,
          summary: skill.summary,
          size: skill.size,
          content: content.substring(0, 30000) + (content.length > 30000 ? '\n\n[... skill truncated at 30000 chars]' : ''),
        };
      } catch (err: any) {
        return { error: `Không thể load skill: ${err.message}` };
      }
    }

    // ── check_stale_skills ──
    if (functionName === 'check_stale_skills') {
      try {
        const staleDays = args.stale_days || 30;
        
        // Delegate sang skills-index-manager (dùng **Generated:** frontmatter + mtime fallback)
        const { stale, fresh, total } = findStaleSkills(staleDays);
        
        if (total === 0) {
          // Fallback sang 9router/skills/ (legacy)
          const skillsBase = path.join(BASE_PATH, '9router/skills');
          if (fs.existsSync(skillsBase)) {
            const legacySkills: Array<{ name: string; last_modified: string; days_since_update: number }> = [];
            const items = fs.readdirSync(skillsBase, { withFileTypes: true });
            for (const item of items) {
              if (item.isDirectory()) {
                const subItems = fs.readdirSync(path.join(skillsBase, item.name));
                for (const sub of subItems) {
                  if (sub.endsWith('.md')) {
                    const fp = path.join(skillsBase, item.name, sub);
                    const stat = fs.statSync(fp);
                    const daysSince = Math.floor((Date.now() - stat.mtimeMs) / (24 * 60 * 60 * 1000));
                    legacySkills.push({ name: `${item.name}/${sub}`, last_modified: stat.mtime.toISOString(), days_since_update: daysSince });
                  }
                }
              } else if (item.name.endsWith('.md')) {
                const fp = path.join(skillsBase, item.name);
                const stat = fs.statSync(fp);
                const daysSince = Math.floor((Date.now() - stat.mtimeMs) / (24 * 60 * 60 * 1000));
                legacySkills.push({ name: item.name, last_modified: stat.mtime.toISOString(), days_since_update: daysSince });
              }
            }
            const legacyStale = legacySkills.filter(s => s.days_since_update >= staleDays).sort((a, b) => b.days_since_update - a.days_since_update);
            const legacyFresh = legacySkills.filter(s => s.days_since_update < staleDays).sort((a, b) => a.days_since_update - b.days_since_update);
            return {
              total_skills: legacySkills.length,
              stale_count: legacyStale.length,
              fresh_count: legacyFresh.length,
              source: '9router/skills/ (legacy)',
              stale_days_threshold: staleDays,
              stale_skills: legacyStale.length > 0 ? legacyStale : undefined,
              fresh_skills: legacyFresh.length > 0 ? legacyFresh.slice(0, 10) : undefined,
              message: legacyStale.length === 0
                ? `✅ Tất cả ${legacySkills.length} skills đều cập nhật trong ${staleDays} ngày qua.`
                : `⚠️ Có ${legacyStale.length}/${legacySkills.length} skills cũ hơn ${staleDays} ngày, cần review lại.`,
            };
          }
          return { error: 'Không có skills nào để kiểm tra.' };
        }

        return {
          total_skills: total,
          stale_count: stale.length,
          fresh_count: fresh.length,
          source: 'knowledge/wiki/skills/',
          stale_days_threshold: staleDays,
          stale_skills: stale.length > 0 ? stale.map(s => ({
            name: s.displayName,
            last_modified: s.lastModified,
            generated_at: s.generatedAt,
            tags: s.tags,
            summary: s.summary,
          })) : undefined,
          fresh_skills: fresh.length > 0 ? fresh.slice(0, 10).map(s => ({
            name: s.displayName,
            last_modified: s.lastModified,
            generated_at: s.generatedAt,
          })) : undefined,
          message: stale.length === 0
            ? `✅ Tất cả ${total} skills đều cập nhật trong ${staleDays} ngày qua.`
            : `⚠️ Có ${stale.length}/${total} skills cũ hơn ${staleDays} ngày, cần review lại.`,
        };
      } catch (err: any) {
        return { error: `Không thể kiểm tra stale skills: ${err.message}` };
      }
    }

    return { error: `Công cụ ${functionName} không tồn tại` };

  } catch (error: any) {
    console.error(`❌ Tool execution error:`, error.message);
    return { error: error.message };
  }
}

/**
 * Quét thư mục tìm kiếm keyword (dùng cho search_knowledge_graph)
 */
function scanDir(dir: string, prefix: string, keyword: string, results: any[]): void {
  const items = fs.readdirSync(dir, { withFileTypes: true });

  for (const item of items) {
    const fullPath = path.join(dir, item.name);
    const relativePath = prefix + item.name;

    if (item.isDirectory()) {
      scanDir(fullPath, relativePath + '/', keyword, results);
    } else if (item.name.endsWith('.md')) {
      const content = fs.readFileSync(fullPath, 'utf8').toLowerCase();

      // Ưu tiên backlink Obsidian [[keyword]]
      if (content.includes(`[[${keyword}]]`)) {
        results.push({
          path: relativePath,
          match_type: 'backlink',
          priority: 10
        });
        continue;
      }

      // Tag #keyword
      if (content.includes(`#${keyword}`)) {
        results.push({
          path: relativePath,
          match_type: 'tag',
          priority: 8
        });
        continue;
      }

      // Nội dung chứa keyword
      const regex = new RegExp(`(.{0,100}${keyword}.{0,100})`, 'i');
      const match = content.match(regex);
      if (match) {
        results.push({
          path: relativePath,
          match_type: 'content',
          priority: 5,
          context: '...' + match[1].trim() + '...'
        });
      }
    }
  }
}