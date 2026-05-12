/**
 * Kato Agent — Tool Definitions & Execution
 * Framework 6 Layers — Lớp Lõi (Shared Tools)
 * 
 * Định nghĩa tools chuẩn OpenAI format + hàm execute.
 * Dùng chung cho cả Engine (ReAct loop) và LLM Core.
 * 
 * Tools hiện có (8 tools):
 * - list_directory      : Liệt kê file/thư mục
 * - read_file           : Đọc file text
 * - search_knowledge_graph : Tìm kiếm tri thức
 * - write_wiki_page     : Ghi trang wiki
 * - read_pdf            : Đọc nội dung file PDF
 * - fetch_url           : Truy cập internet
 * - process_new_raw     : Quét + xử lý file mới
 * - execute_command     : Chạy lệnh hệ thống (guard)
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { createRequire } from 'module';
const _require = createRequire(import.meta.url);

const BASE_PATH = process.cwd();

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
      description: 'Đọc nội dung văn bản từ một file PDF',
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
            description: 'Số ký tự tối đa trả về (mặc định 5000)',
            default: 5000
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
      return data.processed || [];
    }
  } catch { /* ignore */ }
  return [];
}

/**
 * Thực thi một tool call và trả về kết quả.
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

      const scanPaths = ['knowledge/wiki/', 'knowledge/blueprints/'];

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

      return { success: true, path: path.join('knowledge/wiki/', relativePath) };
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
        const pdfParse = _require('pdf-parse');
        const pdfBuffer = fs.readFileSync(targetPath);
        const data = pdfParse(pdfBuffer);

        let text = data.text || '';
        const numPages = data.numpages || 0;
        const maxPages = args.max_pages || 10;

        // Giới hạn số trang nếu maxPages > 0
        if (maxPages > 0 && numPages > maxPages) {
          text = text.split('\n').slice(0, maxPages * 40).join('\n');
          text += `\n\n[... truncated to ${maxPages}/${numPages} pages]`;
        }

        // Giới hạn độ dài (max 20000 ký tự)
        if (text.length > 20000) {
          text = text.substring(0, 20000) + '\n\n[... truncated at 20000 chars]';
        }

        return {
          content: text,
          pageCount: numPages,
          truncated: text.includes('truncated')
        };
      } catch (err: any) {
        return { error: `Không thể đọc PDF: ${err.message}` };
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
  process.stdout.write(txt.substring(0, ${args.max_length || 5000}));
}).catch(() => process.exit(1));
`;

      try {
        const output = execSync(`node -e "${script.replace(/"/g, '\\"').replace(/\n/g, ' ')}"`, {
          cwd: BASE_PATH,
          encoding: 'utf8',
          timeout: 15000, // 15s timeout
          maxBuffer: 200 * 1024, // 200KB
          windowsHide: true
        });

        if (!output || output.trim().length === 0) {
          return `❌ Không thể truy cập ${url} (HTTP error hoặc timeout)`;
        }

        const maxLen = args.max_length || 5000;
        const truncated = output.length > maxLen
          ? output.substring(0, maxLen) + '\n\n[... truncated]'
          : output;

        return `📄 Nội dung từ ${url}:\n\n${truncated}`;
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
          context: match[0].trim(),
          priority: 5
        });
      }
    }
  }
}

export default TOOLS_DEFINITION;