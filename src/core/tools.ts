/**
 * Kato Agent — Tool Registry
 * Định nghĩa các công cụ mà Kato có thể sử dụng để tương tác với môi trường.
 * 
 * [V5.2] Khôi phục các công cụ tri thức từ v4.0:
 * - search_knowledge_graph: Tra cứu Obsidian wiki nhanh
 * - write_wiki_page: Ghi kiến thức vào wiki
 * - process_new_raw_data: Xử lý dữ liệu thô
 */

import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';

/** Đọc processed_log.md để biết file nào đã xử lý */
function getProcessedFiles(basePath: string): Set<string> {
  const logPath = path.join(basePath, 'knowledge/wiki/processed_log.md');
  if (!fsSync.existsSync(logPath)) return new Set();
  const content = fsSync.readFileSync(logPath, 'utf8');
  const processed = new Set<string>();
  const regex = /- \[x\] (.+)/g;
  let match;
  while ((match = regex.exec(content)) !== null) processed.add(match[1]);
  return processed;
}

/** Quét thư mục wiki tìm backlinks, tags, nội dung */
function searchWikiGraph(wikiPath: string, keyword: string): any[] {
  const results: any[] = [];
  const kw = keyword.toLowerCase();
  
  function scan(dir: string, prefix: string = '') {
    const items = fsSync.readdirSync(dir, { withFileTypes: true });
    for (const item of items) {
      const fullPath = path.join(dir, item.name);
      const relPath = prefix + item.name;
      if (item.isDirectory()) {
        scan(fullPath, relPath + '/');
      } else if (item.name.endsWith('.md')) {
        const content = fsSync.readFileSync(fullPath, 'utf8');
        const lower = content.toLowerCase();
        if (lower.includes(`[[${kw}]]`)) {
          results.push({ path: relPath, match_type: 'backlink', priority: 10 });
          continue;
        }
        if (lower.includes(`#${kw}`)) {
          results.push({ path: relPath, match_type: 'tag', priority: 8 });
          continue;
        }
        const regex = new RegExp(`(.{0,100}${kw}.{0,100})`, 'i');
        const match = lower.match(regex);
        if (match) {
          results.push({ path: relPath, match_type: 'content', context: match[0].trim(), priority: 5 });
        }
      }
    }
  }
  
  if (fsSync.existsSync(wikiPath)) scan(wikiPath);
  results.sort((a, b) => b.priority - a.priority);
  return results.slice(0, 15);
}

const BASE_PATH = process.cwd();

export const tools = {
  list_files: async (dir: string) => {
    try {
      const files = await fs.readdir(dir);
      return files.join('\n');
    } catch (e) {
      return `Error: ${e}`;
    }
  },
  read_file: async (filePath: string) => {
    try {
      return await fs.readFile(filePath, 'utf-8');
    } catch (e) {
      return `Error: ${e}`;
    }
  },
  /** Tìm kiếm cực nhanh trong cơ sở tri thức Obsidian */
  search_knowledge_graph: async (keyword: string) => {
    try {
      const wikiPath = path.join(BASE_PATH, 'knowledge/wiki');
      const results = searchWikiGraph(wikiPath, keyword);
      return JSON.stringify({
        keyword,
        total_results: results.length,
        results
      }, null, 2);
    } catch (e) {
      return `Error: ${e}`;
    }
  },
  /** Tạo hoặc cập nhật trang wiki */
  write_wiki_page: async (filePath: string, content: string, tags?: string) => {
    try {
      const fullPath = path.join(BASE_PATH, 'knowledge/wiki', filePath);
      await fs.mkdir(path.dirname(fullPath), { recursive: true });
      let finalContent = content;
      if (tags) finalContent += `\n\n---\n#${tags.split(' ').join(' #')}`;
      await fs.writeFile(fullPath, finalContent, 'utf8');
      return JSON.stringify({ success: true, path: filePath });
    } catch (e) {
      return `Error: ${e}`;
    }
  },
  /** Xử lý tự động các file dữ liệu mới trong knowledge/raw/ */
  process_new_raw_data: async () => {
    try {
      const rawPath = path.join(BASE_PATH, 'knowledge/raw');
      const processed = getProcessedFiles(BASE_PATH);
      if (!fsSync.existsSync(rawPath)) {
        return JSON.stringify({ total_files: 0, processed_files: 0, new_files: [], new_count: 0 });
      }
      const allFiles: string[] = [];
      function scanDir(dir: string, prefix: string = '') {
        const items = fsSync.readdirSync(dir, { withFileTypes: true });
        for (const item of items) {
          const fPath = path.join(dir, item.name);
          const relPath = prefix + item.name;
          if (item.isDirectory()) scanDir(fPath, relPath + '/');
          else allFiles.push(relPath);
        }
      }
      scanDir(rawPath);
      const newFiles = allFiles.filter(f => !processed.has(f));
      return JSON.stringify({
        total_files: allFiles.length,
        processed_files: processed.size,
        new_files: newFiles,
        new_count: newFiles.length
      }, null, 2);
    } catch (e) {
      return `Error: ${e}`;
    }
  }
};

export const toolDefinitions = [
  {
    type: "function",
    function: {
      name: "list_files",
      description: "Liệt kê các file và thư mục trong một đường dẫn cụ thể.",
      parameters: {
        type: "object",
        properties: {
          dir: { type: "string", description: "Đường dẫn thư mục cần liệt kê" }
        },
        required: ["dir"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "read_file",
      description: "Đọc nội dung của một file cụ thể.",
      parameters: {
        type: "object",
        properties: {
          filePath: { type: "string", description: "Đường dẫn file cần đọc" }
        },
        required: ["filePath"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "search_knowledge_graph",
      description: "Tìm kiếm cực nhanh trong cơ sở tri thức Obsidian, tìm backlinks, tag và liên kết [[wiki-link]].",
      parameters: {
        type: "object",
        properties: {
          keyword: { type: "string", description: "Từ khóa cần tìm kiếm, có thể là tên trang, tag hoặc thuật ngữ" }
        },
        required: ["keyword"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "write_wiki_page",
      description: "Tạo hoặc cập nhật một trang wiki trong thư mục knowledge/wiki/.",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "Đường dẫn file wiki cần tạo (vd: skills/my-skill.md)" },
          content: { type: "string", description: "Nội dung markdown của trang wiki" },
          tags: { type: "string", description: "Các tag gắn ở cuối file, cách nhau bởi dấu cách (vd: 'kato core')" }
        },
        required: ["path", "content"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "process_new_raw_data",
      description: "Xử lý tự động các file dữ liệu mới trong thư mục knowledge/raw/ — quét và báo cáo file chưa xử lý.",
      parameters: {
        type: "object",
        properties: {},
        required: []
      }
    }
  }
];

export type ToolName = keyof typeof tools;