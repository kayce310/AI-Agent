/**
 * @file docx-parser — Peripheral adapter
 * @layer modules
 * @depends-on src/core/index.ts
 * @imported-by src/scripts/start-discord.ts
 * @owner modules
 */

/**
 * DOCX Parser Module
 * Parse file .docx → text/markdown dùng mammoth
 * Chạy đồng bộ qua execSync (ESM compatible)
 */
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';

/**
 * Đọc file DOCX trả về text thuần (giữ heading, bold, italic markers)
 */
export function readDocx(docxPath: string, maxLength: number = 20000): string {
  const resolvedPath = path.resolve(docxPath);
  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`File not found: ${resolvedPath}`);
  }

  return execReadDocx(resolvedPath, maxLength, false);
}

/**
 * Parse DOCX → Markdown đầy đủ
 */
export function extractDocxToMd(docxPath: string): string {
  const resolvedPath = path.resolve(docxPath);
  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`File not found: ${resolvedPath}`);
  }

  return execReadDocx(resolvedPath, 0, true);
}

/**
 * Lấy tên file gốc (không extension)
 */
function getDocxBaseName(filePath: string): string {
  return path.basename(filePath, path.extname(filePath));
}

/**
 * Tạo temp script .mjs để parse DOCX bằng mammoth (ESM)
 */
function buildTempScript(docxPath: string, maxLength: number, fullOutput: boolean): string {
  const docxPathNormalized = docxPath.replace(/\\/g, '/');

  if (fullOutput) {
    // Output đầy đủ markdown
    return `
import mammoth from 'mammoth';
import fs from 'fs';

const buf = fs.readFileSync('${docxPathNormalized}');
const result = await mammoth.convertToMarkdown({ buffer: buf });
const markdown = result.value || '';

// Ghi ra stdout dưới dạng JSON
process.stdout.write(JSON.stringify({
  success: true,
  content: markdown,
  warnings: result.messages || []
}));
`;
  }

  // Output có giới hạn
  return `
import mammoth from 'mammoth';
import fs from 'fs';

const buf = fs.readFileSync('${docxPathNormalized}');
const result = await mammoth.convertToRawText({ buffer: buf });
let text = result.value || '';

// Giới hạn độ dài
if (text.length > ${maxLength}) {
  text = text.substring(0, ${maxLength}) + '\\n\\n[... truncated at ${maxLength} chars]';
}

process.stdout.write(JSON.stringify({
  success: true,
  content: text,
  warnings: result.messages || []
}));
`;
}

/**
 * Thực thi đọc DOCX qua temp script + execSync
 */
function execReadDocx(docxPath: string, maxLength: number, fullOutput: boolean): string {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kato-docx-'));
  const tmpScriptPath = path.join(tmpDir, 'parse-docx.mjs');
  const scriptContent = buildTempScript(docxPath, maxLength, fullOutput);

  try {
    fs.writeFileSync(tmpScriptPath, scriptContent, 'utf-8');

    const output = execSync(`node "${tmpScriptPath}"`, {
      cwd: process.cwd(),
      encoding: 'utf8',
      timeout: 60000,
      maxBuffer: 50 * 1024 * 1024,
      windowsHide: true
    });

    const parsed = JSON.parse(output.trim());
    if (parsed.error) {
      throw new Error(parsed.error);
    }
    return parsed.content || '';
  } catch (err: any) {
    throw new Error(`DOCX parse failed: ${err.message}`);
  } finally {
    // Cleanup
    try { fs.unlinkSync(tmpScriptPath); } catch {}
    try { fs.rmdirSync(tmpDir); } catch {}
  }
}

/**
 * Phát hiện công thức trong DOCX (MathType/OMML)
 * mammoth extract text, patterns như $$...$$ hoặc \[...\]
 */
export function extractFormulasFromDocx(docxPath: string): string[] {
  const text = execReadDocx(docxPath, 0, false);
  const formulas: string[] = [];

  // Pattern: $$...$$ hoặc \[...\] hoặc \(...\)
  const displayFormulaRegex = /\$\$([\s\S]*?)\$\$/g;
  const bracketFormulaRegex = /\\\[([\s\S]*?)\\\]/g;
  const inlineFormulaRegex = /\\\(([\s\S]*?)\\\)/g;

  let match;
  while ((match = displayFormulaRegex.exec(text)) !== null) {
    formulas.push(`$$${match[1].trim()}$$`);
  }
  while ((match = bracketFormulaRegex.exec(text)) !== null) {
    formulas.push(`\\[${match[1].trim()}\\]`);
  }
  while ((match = inlineFormulaRegex.exec(text)) !== null) {
    formulas.push(`\\(${match[1].trim()}\\)`);
  }

  return formulas;
}

export default {
  readDocx,
  extractDocxToMd,
  extractFormulasFromDocx,
  getDocxBaseName
};