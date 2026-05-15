/**
 * PDF Parser Module
 * Parse file PDF → text/markdown dùng pdf-parse v2 (ESM)
 * Chạy đồng bộ qua execSync + temp .mjs script
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';

/**
 * Đọc file PDF trả về text, có max_pages + max_length
 * Dùng cho đọc nhanh (giống read_pdf tool cũ)
 */
export function readPdf(pdfPath: string, maxPages: number = 10, maxChars: number = 20000): string {
  const resolvedPath = path.resolve(pdfPath);
  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`File not found: ${resolvedPath}`);
  }

  return execReadPdf(resolvedPath, maxPages, maxChars, false);
}

/**
 * Parse full PDF → markdown (truncate only by maxChars)
 * Lưu vào file .md sau đó
 */
export function extractPdfToMd(pdfPath: string): string {
  const resolvedPath = path.resolve(pdfPath);
  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`File not found: ${resolvedPath}`);
  }

  // parse all pages, no truncation
  const content = execReadPdf(resolvedPath, 9999, 10 * 1024 * 1024, false);
  return content;
}

/**
 * Parse PDF với thông tin page numbers
 */
export function readPdfWithPages(pdfPath: string, maxPages: number = 10): { content: string; pageCount: number } {
  const resolvedPath = path.resolve(pdfPath);
  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`File not found: ${resolvedPath}`);
  }

  return execReadPdfWithMeta(resolvedPath, maxPages, 20000);
}

/**
 * Lấy tên file không extension
 */
export function getPdfBaseName(filePath: string): string {
  return path.basename(filePath, path.extname(filePath));
}

/**
 * Tạo temp script .mjs cho pdf-parse
 */
function buildPdfScript(pdfPath: string, maxPages: number, maxChars: number, returnPages: boolean): string {
  const pdfPathJs = pdfPath.replace(/\\/g, '/');

  const script = `
import { PDFParse } from 'pdf-parse';
import fs from 'fs';

const buf = fs.readFileSync('${pdfPathJs}');
const parser = new PDFParse({ data: buf });
const textResult = await parser.getText({ first: ${maxPages} });
let text = textResult.text || '';
const pages = textResult.pages || [];
const numPages = pages.length || 0;

// Thêm page break markers
if (pages.length > 1) {
  text = pages.map((p, idx) => {
    // Lấy nội dung trang, strip undefined/null
    const pageText = (p.text || '').trim();
    if (!pageText) return '';
    const prefix = idx === 0 ? '' : '\\n\\n--- Page ' + (idx + 1) + ' ---\\n\\n';
    return prefix + pageText;
  }).filter(Boolean).join('');
}

// Giới hạn ký tự
if (text.length > ${maxChars}) {
  text = text.substring(0, ${maxChars}) + '\\n\\n[... truncated at ${maxChars} chars]';
}

const result = { success: true, content: text, pageCount: numPages };
process.stdout.write(JSON.stringify(result));
`;

  return script;
}

/**
 * Thực thi đọc PDF qua temp script + execSync
 */
function execReadPdf(pdfPath: string, maxPages: number, maxChars: number, returnPages: boolean): string {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kato-pdf-'));
  const tmpScriptPath = path.join(tmpDir, 'parse-pdf.mjs');
  const scriptContent = buildPdfScript(pdfPath, maxPages, maxChars, returnPages);

  try {
    fs.writeFileSync(tmpScriptPath, scriptContent, 'utf-8');

    const output = execSync(`node "${tmpScriptPath}"`, {
      cwd: process.cwd(),
      encoding: 'utf8',
      timeout: 120000, // 2 phút cho file lớn
      maxBuffer: 50 * 1024 * 1024,
      windowsHide: true
    });

    const parsed = JSON.parse(output.trim());
    if (parsed.error) {
      throw new Error(parsed.error);
    }
    return parsed.content || '';
  } catch (err: any) {
    throw new Error(`PDF parse failed: ${err.message}`);
  } finally {
    try { fs.unlinkSync(tmpScriptPath); } catch {}
    try { fs.rmdirSync(tmpDir); } catch {}
  }
}

/**
 * Thực thi PDF parse + trả về metadata
 */
function execReadPdfWithMeta(pdfPath: string, maxPages: number, maxChars: number): { content: string; pageCount: number } {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kato-pdf-'));
  const tmpScriptPath = path.join(tmpDir, 'parse-pdf-meta.mjs');
  const pdfPathJs = pdfPath.replace(/\\/g, '/');

  const scriptContent = `
import { PDFParse } from 'pdf-parse';
import fs from 'fs';

const buf = fs.readFileSync('${pdfPathJs}');
const parser = new PDFParse({ data: buf });
const textResult = await parser.getText({ first: ${maxPages} });
let text = textResult.text || '';
const numPages = textResult.pages?.length || 0;

if (text.length > ${maxChars}) {
  text = text.substring(0, ${maxChars}) + '\\n\\n[... truncated at ${maxChars} chars]';
}

const result = { success: true, content: text, pageCount: numPages };
process.stdout.write(JSON.stringify(result));
`;

  try {
    fs.writeFileSync(tmpScriptPath, scriptContent, 'utf-8');

    const output = execSync(`node "${tmpScriptPath}"`, {
      cwd: process.cwd(),
      encoding: 'utf8',
      timeout: 120000,
      maxBuffer: 50 * 1024 * 1024,
      windowsHide: true
    });

    const parsed = JSON.parse(output.trim());
    if (parsed.error) {
      throw new Error(parsed.error);
    }

    return {
      content: parsed.content || '',
      pageCount: parsed.pageCount || 0
    };
  } catch (err: any) {
    throw new Error(`PDF parse failed: ${err.message}`);
  } finally {
    try { fs.unlinkSync(tmpScriptPath); } catch {}
    try { fs.rmdirSync(tmpDir); } catch {}
  }
}

/**
 * Phát hiện công thức trong text PDF
 * 6 patterns cho các định dạng khác nhau:
 * 1. $$...$$ (display LaTeX)
 * 2. \[...\]  (bracket LaTeX)
 * 3. \(...\)  (inline LaTeX)
 * 4. \begin{align}...\end{align} (AMS align)
 * 5. \begin{equation}...\end{equation} 
 * 6. Equation numbering: (1), (eq:...), === Eq ===
 * 7. Multi-line notation: "where: ... = ..."
 */
export function extractFormulasFromPdf(text: string): string[] {
  const formulas: string[] = [];
  const seen = new Set<string>(); // dedup

  /**
   * Helper: thêm formula vào danh sách, tránh trùng
   */
  function add(f: string) {
    const key = f.replace(/\s+/g, ' ').trim();
    if (key.length < 3) return;
    if (seen.has(key)) return;
    seen.add(key);
    formulas.push(f.trim());
  }

  // Pattern 1: $$...$$ (display math)
  const displayRegex = /\$\$([\s\S]*?)\$\$/g;
  let match;
  while ((match = displayRegex.exec(text)) !== null) {
    add(`$$${match[1].trim()}$$`);
  }

  // Pattern 2: \[...\] (bracket math)
  const bracketRegex = /\\\[([\s\S]*?)\\\]/g;
  while ((match = bracketRegex.exec(text)) !== null) {
    add(`\\[${match[1].trim()}\\]`);
  }

  // Pattern 3: \(...\) (inline math)
  const inlineRegex = /\\\(([\s\S]*?)\\\)/g;
  while ((match = inlineRegex.exec(text)) !== null) {
    add(`\\(${match[1].trim()}\\)`);
  }

  // Pattern 4: \begin{align}...\end{align}
  const alignRegex = /\\begin\{align\}([\s\S]*?)\\end\{align\}/g;
  while ((match = alignRegex.exec(text)) !== null) {
    add(`\\begin{align}${match[1].trim()}\\end{align}`);
  }

  // Pattern 5: \begin{equation}...\end{equation}
  const equationRegex = /\\begin\{equation\}([\s\S]*?)\\end\{equation\}/g;
  while ((match = equationRegex.exec(text)) !== null) {
    add(`\\begin{equation}${match[1].trim()}\\end{equation}`);
  }

  // Pattern 6: Equation numbering — "(1)", "(2.3)" ở đầu dòng
  const eqNumRegex = /^\(([\d\.]+)\)\s+(.+)$/gm;
  while ((match = eqNumRegex.exec(text)) !== null) {
    add(`${match[2].trim()}  (${match[1]})`);
  }

  // Pattern 7: "Eq." hoặc "Equation" + number + content
  const eqLabelRegex = /(?:Eq\.|Equation|Phương trình)\s*\(?([\w\.]+)\)?\s*:?\s*(.+?)(?=\n|$)/gi;
  while ((match = eqLabelRegex.exec(text)) !== null) {
    add(`Eq. (${match[1]}): ${match[2].trim()}`);
  }

  // Pattern 8: Dòng bắt đầu với biến số hoặc ký hiệu toán "where a = b"
  const whereRegex = /^(?:where|với|trong đó)\s+(.+?)(?:is|=|:)\s*(.+?)(?=\n|$)/gim;
  while ((match = whereRegex.exec(text)) !== null) {
    add(`${match[1].trim()} = ${match[2].trim()}`);
  }

  // Pattern 9: === Eq X === format (phổ biến trong các tài liệu kỹ thuật)
  const eqBlockRegex = /===\s*(?:Eq|PT|Công.thức)?\s*([\d\.]+)\s*===\s*([\s\S]*?)(?=\n===|\n*$)/g;
  while ((match = eqBlockRegex.exec(text)) !== null) {
    add(`[Eq ${match[1]}] ${match[2].trim()}`);
  }

  // Pattern 10: Dòng chứa "=" với nhiều biến số — heuristic
  // Bắt đầu bằng chữ cái hoa, chứa ít nhất 1 "=", độ dài 20-300 ký tự
  const eqLineRegex = /^([A-Z][a-zA-Z0-9_{}\^]+\s*[:=]\s*.+)$/gm;
  while ((match = eqLineRegex.exec(text)) !== null) {
    const line = match[1].trim();
    if (line.length >= 10 && line.length <= 300 && !line.includes('```')) {
      add(line);
    }
  }

  return formulas;
}

export default {
  readPdf,
  extractPdfToMd,
  readPdfWithPages,
  extractFormulasFromPdf,
  getPdfBaseName
};