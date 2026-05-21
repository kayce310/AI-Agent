/**
 * @file converter — Peripheral adapter
 * @layer modules
 * @depends-on src/core/index.ts
 * @imported-by src/scripts/start-discord.ts
 * @owner modules
 */

/**
 * Document → Markdown Converter
 * Batch convert PDF/DOCX sang .md, lưu vào knowledge/raw-md/
 * Dùng cho CLI tool: node scripts/convert-doc-to-md.mjs <filepath>
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import { detectDocumentType, extractToMarkdown, type DocumentType } from './parser.js';

const BASE_PATH = process.cwd();
const RAW_MD_DIR = path.join(BASE_PATH, 'knowledge/raw-md');

/**
 * Đảm bảo thư mục raw-md tồn tại
 */
function ensureRawMdDir(): void {
  if (!fs.existsSync(RAW_MD_DIR)) {
    fs.mkdirSync(RAW_MD_DIR, { recursive: true });
    // Tạo .gitkeep
    fs.writeFileSync(path.join(RAW_MD_DIR, '.gitkeep'), '', 'utf8');
  }
}

/**
 * Convert một file PDF/DOCX → .md và lưu vào knowledge/raw-md/
 * @returns path file .md đã tạo
 */
export function convertDocumentToMd(filePath: string): { mdPath: string; fileName: string; type: DocumentType; size: number } {
  const resolvedPath = path.resolve(filePath);
  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`File not found: ${resolvedPath}`);
  }

  const type = detectDocumentType(resolvedPath);
  if (type === 'unknown') {
    throw new Error(`Unsupported file type: ${path.extname(resolvedPath)}`);
  }

  ensureRawMdDir();

  const baseName = path.basename(resolvedPath, path.extname(resolvedPath));
  const safeName = baseName.replace(/[^a-zA-Z0-9_\-\.\u00C0-\u024F]/g, '_');
  const mdFileName = `${safeName}.md`;
  const mdPath = path.join(RAW_MD_DIR, mdFileName);

  // Parse full content → markdown
  const { content } = extractToMarkdown(resolvedPath);

  // Format markdown với metadata header
  const now = new Date().toISOString();
  const sourceRelPath = path.relative(BASE_PATH, resolvedPath);
  const mdContent = [
    `---`,
    `source: ${sourceRelPath}`,
    `type: ${type}`,
    `converted: ${now}`,
    `original_name: ${path.basename(resolvedPath)}`,
    `file_size: ${fs.statSync(resolvedPath).size} bytes`,
    `---`,
    ``,
    `# ${baseName}`,
    ``,
    `> *Converted from ${type.toUpperCase()} on ${now}*`,
    ``,
    content,
    ``,
    `---`,
    `*Auto-converted by Kato Document Converter*`,
    ``,
  ].join('\n');

  fs.writeFileSync(mdPath, mdContent, 'utf8');

  return {
    mdPath,
    fileName: mdFileName,
    type,
    size: Buffer.byteLength(mdContent, 'utf8')
  };
}

/**
 * Batch convert tất cả file trong một thư mục
 * @returns danh sách kết quả convert
 */
export function batchConvertDirectory(dirPath: string): Array<{ success: boolean; file: string; mdPath?: string; error?: string }> {
  const resolvedPath = path.resolve(dirPath);
  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`Directory not found: ${resolvedPath}`);
  }

  const results: Array<{ success: boolean; file: string; mdPath?: string; error?: string }> = [];
  const items = fs.readdirSync(resolvedPath, { withFileTypes: true });

  for (const item of items) {
    if (item.isDirectory()) continue;
    const ext = path.extname(item.name).toLowerCase();
    if (ext !== '.pdf' && ext !== '.docx') continue;

    const fullPath = path.join(resolvedPath, item.name);
    try {
      const result = convertDocumentToMd(fullPath);
      results.push({
        success: true,
        file: item.name,
        mdPath: result.mdPath
      });
    } catch (err: any) {
      results.push({
        success: false,
        file: item.name,
        error: err.message
      });
    }
  }

  return results;
}

/**
 * Tạo summary markdown nội dung đã convert
 */
export function getConvertedSummary(mdFileName: string): string | null {
  const mdPath = path.join(RAW_MD_DIR, mdFileName);
  if (!fs.existsSync(mdPath)) return null;

  const content = fs.readFileSync(mdPath, 'utf8');
  // Lấy 1000 ký tự đầu tiên (sau metadata)
  const bodyStart = content.indexOf('\n---\n', content.indexOf('---\n') + 4);
  const body = bodyStart !== -1 ? content.substring(bodyStart + 5) : content;
  const summary = body.substring(0, 1000).trim();
  
  return summary.length > 0 ? summary.substring(0, 1000) : null;
}

/**
 * Liệt kê tất cả file .md trong raw-md
 */
export function listConvertedFiles(): Array<{ name: string; size: number; modified: Date }> {
  ensureRawMdDir();
  const items = fs.readdirSync(RAW_MD_DIR, { withFileTypes: true });

  return items
    .filter(item => item.isFile() && item.name.endsWith('.md'))
    .map(item => {
      const stat = fs.statSync(path.join(RAW_MD_DIR, item.name));
      return {
        name: item.name,
        size: stat.size,
        modified: stat.mtime
      };
    })
    .sort((a, b) => b.modified.getTime() - a.modified.getTime());
}

export default {
  convertDocumentToMd,
  batchConvertDirectory,
  getConvertedSummary,
  listConvertedFiles
};