/**
 * Markdown Archiver — Phase 2: Wiki & Knowledge Integration
 * 
 * Quản lý lưu trữ tài liệu đã convert (raw-md) và tóm tắt wiki.
 * API đồng bộ, gọi được từ temp scripts trong tools.ts.
 */
import fs from 'fs';
import path from 'path';
import { convertDocumentToMd, getConvertedSummary, listConvertedFiles } from '../document/converter.js';

const BASE_PATH = process.cwd();
const RAW_MD_DIR = path.join(BASE_PATH, 'knowledge/raw-md');
const WIKI_DIR = path.join(BASE_PATH, 'knowledge/wiki');

/**
 * Kiểm tra và tạo thư mục nếu chưa tồn tại
 */
function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * 2.1 — Archive Document: Parse file → raw-md + wiki summary
 * 
 * Input:
 *   - filePath: path tới file PDF/DOCX
 *   - topic: (optional) tên topic cho wiki page
 * 
 * Output:
 *   - rawMdPath: path file .md đầy đủ trong raw-md
 *   - wikiPath: path file .md tóm tắt trong wiki (nếu tạo được)
 *   - summary: nội dung tóm tắt
 */
export function archiveDocument(filePath: string, topic?: string): {
  success: boolean;
  rawMdPath: string;
  wikiPath?: string;
  summary?: string;
  error?: string;
} {
  try {
    // 1. Convert file → raw-md
    const result = convertDocumentToMd(filePath);

    // 2. Đọc summary từ raw-md
    const mdFileName = path.basename(result.mdPath);
    const summary = getConvertedSummary(mdFileName);

    // 3. Nếu có topic, tạo wiki page tóm tắt
    let wikiPath: string | undefined;
    if (topic && summary) {
      const safeTopic = topic.replace(/[^a-zA-Z0-9_\-\.\u00C0-\u024F]/g, '_');
      const wikiFileName = `${safeTopic}.md`;
      const wikiFilePath = path.join(WIKI_DIR, wikiFileName);

      // Ghi wiki summary note
      const wikiContent = [
        `# ${topic}`,
        ``,
        `> *Summarized from: ${result.fileName}*`,
        ``,
        `## 📄 Source`,
        `- **Original**: ${result.fileName}`,
        `- **Raw**: \`${result.mdPath}\``,
        `- **Type**: ${result.type}`,
        ``,
        `## 📝 Summary`,
        ``,
        summary,
        ``,
        `---`,
        `*Auto-archived by Kato Document Archiver*`,
        `#${safeTopic.toLowerCase()} #archive #knowledge`,
        ``,
      ].join('\n');

      ensureDir(path.dirname(wikiFilePath));
      fs.writeFileSync(wikiFilePath, wikiContent, 'utf8');
      wikiPath = wikiFilePath;
    }

    return {
      success: true,
      rawMdPath: result.mdPath,
      wikiPath,
      summary: summary || undefined,
    };
  } catch (err: any) {
    return {
      success: false,
      rawMdPath: '',
      error: `Không thể archive tài liệu: ${err.message}`,
    };
  }
}

/**
 * 2.1 — Search trong raw-md bằng keyword (regex)
 * 
 * Input:
 *   - keyword: từ khóa hoặc regex pattern
 *   - maxResults: số kết quả tối đa (default 20)
 * 
 * Output: danh sách { file, line, context }
 */
export function searchArchivedMd(keyword: string, maxResults: number = 20): {
  total: number;
  results: Array<{
    file: string;
    line: number;
    context: string;
    priority: number;
  }>;
} {
  const results: Array<{
    file: string;
    line: number;
    context: string;
    priority: number;
  }> = [];

  if (!fs.existsSync(RAW_MD_DIR)) {
    return { total: 0, results: [] };
  }

  try {
    const regex = new RegExp(keyword, 'gi');
    const files = fs.readdirSync(RAW_MD_DIR, { withFileTypes: true })
      .filter(item => item.isFile() && item.name.endsWith('.md') && item.name !== '_index.md');

    for (const file of files) {
      const filePath = path.join(RAW_MD_DIR, file.name);
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n');

      for (let i = 0; i < lines.length; i++) {
        if (results.length >= maxResults) break;
        if (regex.test(lines[i])) {
          // Lấy context xung quanh (3 dòng trước, 3 dòng sau)
          const start = Math.max(0, i - 3);
          const end = Math.min(lines.length, i + 4);
          const contextLines = lines.slice(start, end);
          const contextStr = contextLines.map((cl, ci) => {
            const lineNum = start + ci + 1;
            const prefix = ci === 3 ? '→ ' : '  ';
            return `${prefix}${lineNum}: ${cl}`;
          }).join('\n');

          results.push({
            file: file.name,
            line: i + 1,
            context: contextStr,
            priority: keyword.length > 3 ? 8 : 5,
          });
        }
        regex.lastIndex = 0; // Reset regex
      }
    }

    // Sắp xếp: file ngắn → dễ đọc hơn (có thể là wiki summary)
    results.sort((a, b) => b.priority - a.priority);
  } catch {
    // Regex lỗi hoặc IO lỗi → trả về rỗng
  }

  return {
    total: results.length,
    results: results.slice(0, maxResults),
  };
}

/**
 * 2.1 — Quote from source: trích dẫn chính xác kèm context
 * 
 * Input:
 *   - mdPath: path file .md trong raw-md (relative hoặc absolute)
 *   - keyword: từ khóa cần trích dẫn
 *   - contextLines: số dòng context xung quanh (default 5)
 * 
 * Output: danh sách quote { line, content, context }
 */
export function quoteFromSource(
  mdPath: string,
  keyword: string,
  contextLines: number = 5
): {
  total: number;
  quotes: Array<{
    line: number;
    content: string;
    context: string;
  }>;
} {
  try {
    // Resolve path
    let fullPath = mdPath;
    if (!path.isAbsolute(mdPath)) {
      fullPath = path.resolve(RAW_MD_DIR, mdPath);
    }
    if (!path.resolve(fullPath).startsWith(path.resolve(RAW_MD_DIR))) {
      return { total: 0, quotes: [] };
    }
    if (!fs.existsSync(fullPath)) {
      fullPath = path.join(RAW_MD_DIR, path.basename(mdPath));
    }
    if (!fs.existsSync(fullPath)) {
      return { total: 0, quotes: [] };
    }

    const content = fs.readFileSync(fullPath, 'utf8');
    const lines = content.split('\n');
    const quotes: Array<{
      line: number;
      content: string;
      context: string;
    }> = [];

    const regex = new RegExp(keyword, 'gi');

    for (let i = 0; i < lines.length; i++) {
      if (regex.test(lines[i])) {
        const start = Math.max(0, i - contextLines);
        const end = Math.min(lines.length, i + contextLines + 1);
        const contextStr = lines.slice(start, end)
          .map((cl, ci) => {
            const lineNum = start + ci + 1;
            const prefix = ci === contextLines ? '→ ' : '  ';
            return `${prefix}line ${lineNum}: ${cl}`;
          })
          .join('\n');

        quotes.push({
          line: i + 1,
          content: lines[i].trim(),
          context: contextStr,
        });
      }
      regex.lastIndex = 0;
    }

    return { total: quotes.length, quotes };
  } catch {
    return { total: 0, quotes: [] };
  }
}

/**
 * Liệt kê tất cả archived files
 */
export function listArchivedFiles(): Array<{ name: string; size: number; modified: Date }> {
  return listConvertedFiles();
}

export default {
  archiveDocument,
  searchArchivedMd,
  quoteFromSource,
  listArchivedFiles,
};