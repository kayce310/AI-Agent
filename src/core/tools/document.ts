/**
 * Document Tools Plugin
 * Provides: read_pdf, read_docx, extract_pdf_to_md, extract_docx_to_md, archive_document
 */
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { ToolPlugin } from '../tool-registry.js';
import { isPathSafe, toFileUrl, addProcessedFile, BASE_PATH } from './_shared.js';

const plugin: ToolPlugin = {
  name: 'document',
  tools: [
    {
      name: 'read_pdf',
      description: 'Đọc nội dung văn bản từ một file PDF. Dùng khi cần đọc tài liệu PDF (báo cáo, tài liệu kỹ thuật, sách, paper)',
      schema: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Đường dẫn file PDF cần đọc' },
          max_pages: { type: 'number', description: 'Số trang tối đa cần đọc (mặc định 10)', default: 10 }
        },
        required: ['path']
      },
      execute(args: Record<string, any>) {
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
            maxBuffer: 5 * 1024 * 1024,
            windowsHide: true
          });

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
    },
    {
      name: 'read_docx',
      description: 'Đọc nội dung văn bản từ một file DOCX. Dùng khi cần đọc tài liệu Word.',
      schema: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Đường dẫn file DOCX cần đọc' },
          max_length: { type: 'number', description: 'Độ dài tối đa (mặc định 20000)', default: 20000 }
        },
        required: ['path']
      },
      execute(args: Record<string, any>) {
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
    },
    {
      name: 'extract_pdf_to_md',
      description: 'Parse PDF → lưu knowledge/raw-md/ dưới dạng Markdown',
      schema: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Đường dẫn file PDF cần chuyển đổi' }
        },
        required: ['path']
      },
      execute(args: Record<string, any>) {
        const targetPath = args.path;
        if (!isPathSafe(targetPath)) {
          return { error: `Đường dẫn ${targetPath} không được phép truy cập` };
        }
        if (!fs.existsSync(targetPath)) {
          return { error: `File PDF ${targetPath} không tồn tại` };
        }

        try {
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
    },
    {
      name: 'extract_docx_to_md',
      description: 'Parse DOCX → lưu knowledge/raw-md/ dưới dạng Markdown',
      schema: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Đường dẫn file DOCX cần chuyển đổi' }
        },
        required: ['path']
      },
      execute(args: Record<string, any>) {
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
    },
    {
      name: 'archive_document',
      description: 'Parse + archive tài liệu vào raw-md + wiki (Phase 2)',
      schema: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Đường dẫn file tài liệu cần archive' },
          topic: { type: 'string', description: 'Chủ đề để phân loại' }
        },
        required: ['path']
      },
      execute(args: Record<string, any>) {
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
    }
  ]
};

export default plugin;