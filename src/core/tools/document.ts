/**
 * @file Document Tools Plugin
 * @layer core
 * @depends-on src/core/tools/tool-gateway.ts
 * @owner core-tools
 *
 * ZERO-TRUST: All file I/O routes through secureRuntime (tool-gateway.ts).
 * execFileSync used to prevent shell injection. JSON.stringify for script
 * content generation prevents template string injection.
 */

import * as path from 'path';
import { execFileSync } from 'child_process';
import type { ToolPlugin } from './tool-registry.js';
import { isPathSafe, toFileUrl, addProcessedFile, BASE_PATH } from './_shared.js';
import { secureRuntime } from './tool-gateway.js';

/** Validate filename contains only safe characters */
function isFilenameSafe(name: string): boolean {
  return /^[a-zA-Z0-9._\-\u00C0-\u024F\u1E00-\u1EFF\s()]+$/.test(name);
}

/** Generate a unique temp directory path — prevents race conditions */
function uniqueTmpDir(prefix: string): string {
  return path.join(BASE_PATH, `.tmp-${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
}

/**
 * Run a Node.js script file using execFileSync — no shell, no injection.
 * Returns the parsed JSON result of the script.
 */
function runNodeScript(tmpScriptPath: string, options: { cwd?: string; timeout?: number; maxBuffer?: number } = {}): string {
  try {
    const output = execFileSync(process.execPath, [tmpScriptPath], {
      cwd: BASE_PATH,
      encoding: 'utf8',
      timeout: options.timeout || 60000,
      maxBuffer: options.maxBuffer || 5 * 1024 * 1024,
      windowsHide: true,
    });
    return output.trim();
  } finally {
    // Cleanup happens in caller's finally block
  }
}

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
        if (!secureRuntime.safeExists(targetPath)) {
          return { error: `File PDF ${targetPath} không tồn tại` };
        }
        if (!secureRuntime.safeStat(targetPath).isFile()) {
          return { error: `${targetPath} không phải là file` };
        }

        const tmpDir = uniqueTmpDir('read-pdf');
        try {
          const maxPages = args.max_pages || 10;
          const tmpScriptPath = path.join(tmpDir, 'read-pdf.mjs');
          const pdfPathJs = path.resolve(targetPath).replace(/\\/g, '/');

          const tmpScript = [
            `import { PDFParse } from 'pdf-parse';`,
            `import fs from 'fs';`,
            `const buf = fs.readFileSync(${JSON.stringify(pdfPathJs)});`,
            `const parser = new PDFParse({ data: buf });`,
            `const textResult = await parser.getText({ first: ${maxPages} });`,
            `let text = textResult.text || '';`,
            `const pages = textResult.pages || [];`,
            `const numPages = pages.length || 0;`,
            `if (pages.length > 1) {`,
            `  text = pages.map((p, idx) => {`,
            `    const pageText = (p.text || '').trim();`,
            `    if (!pageText) return '';`,
            `    const prefix = idx === 0 ? '' : '\\n\\n--- Page ' + (idx + 1) + ' ---\\n\\n';`,
            `    return prefix + pageText;`,
            `  }).filter(Boolean).join('');`,
            `}`,
            `if (text.length > 20000) {`,
            `  text = text.substring(0, 20000) + '\\n\\n[... truncated at 20000 chars]';`,
            `}`,
            `process.stdout.write(JSON.stringify({ content: text, pageCount: numPages }));`,
          ].join('\n');

          secureRuntime.safeMkdir(tmpDir);
          secureRuntime.safeWriteFile(tmpScriptPath, tmpScript);

          const output = runNodeScript(tmpScriptPath, { timeout: 30000 });

          const result = JSON.parse(output);
          if (result.error) {
            return { error: `Không thể đọc PDF: ${result.error}` };
          }
          return result;
        } catch (err: any) {
          return { error: `Không thể đọc PDF: ${err.message}` };
        } finally {
          try { secureRuntime.safeRm(tmpDir); } catch { /* cleanup best-effort */ }
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
        if (!secureRuntime.safeExists(targetPath)) {
          return { error: `File DOCX ${targetPath} không tồn tại` };
        }
        if (!secureRuntime.safeStat(targetPath).isFile()) {
          return { error: `${targetPath} không phải là file` };
        }

        const tmpDir = uniqueTmpDir('docx');
        try {
          const maxLength = args.max_length || 20000;
          const tmpScriptPath = path.join(tmpDir, 'parse-docx.mjs');
          const docxPathJs = path.resolve(targetPath).replace(/\\/g, '/');

          const scriptContent = [
            `import mammoth from 'mammoth';`,
            `import fs from 'fs';`,
            `const buf = fs.readFileSync(${JSON.stringify(docxPathJs)});`,
            `const result = await mammoth.convertToRawText({ buffer: buf });`,
            `let text = result.value || '';`,
            `if (text.length > ${maxLength}) {`,
            `  text = text.substring(0, ${maxLength}) + '\\n\\n[... truncated at ${maxLength} chars]';`,
            `}`,
            `process.stdout.write(JSON.stringify({ content: text }));`,
          ].join('\n');

          secureRuntime.safeMkdir(tmpDir);
          secureRuntime.safeWriteFile(tmpScriptPath, scriptContent);

          const output = runNodeScript(tmpScriptPath, { timeout: 60000, maxBuffer: 50 * 1024 * 1024 });

          const result = JSON.parse(output);
          if (result.error) {
            return { error: `Không thể đọc DOCX: ${result.error}` };
          }
          return result;
        } catch (err: any) {
          return { error: `Không thể đọc DOCX: ${err.message}` };
        } finally {
          try { secureRuntime.safeRm(tmpDir); } catch { /* cleanup best-effort */ }
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
        if (!secureRuntime.safeExists(targetPath)) {
          return { error: `File PDF ${targetPath} không tồn tại` };
        }

        const tmpDir = uniqueTmpDir('convert-pdf');
        try {
          const pdfPathJs = path.resolve(targetPath).replace(/\\/g, '/');
          const tmpScriptPath = path.join(tmpDir, 'convert-pdf.mjs');

          const scriptContent = [
            `import { convertDocumentToMd } from ${JSON.stringify(toFileUrl(BASE_PATH) + '/src/modules/document/converter.js')};`,
            `const result = convertDocumentToMd(${JSON.stringify(pdfPathJs)});`,
            `process.stdout.write(JSON.stringify(result));`,
          ].join('\n');

          secureRuntime.safeMkdir(tmpDir);
          secureRuntime.safeWriteFile(tmpScriptPath, scriptContent);

          const output = runNodeScript(tmpScriptPath, { timeout: 120000, maxBuffer: 50 * 1024 * 1024 });

          const result = JSON.parse(output);

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
        } finally {
          try { secureRuntime.safeRm(tmpDir); } catch { /* cleanup best-effort */ }
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
        if (!secureRuntime.safeExists(targetPath)) {
          return { error: `File DOCX ${targetPath} không tồn tại` };
        }

        const tmpDir = uniqueTmpDir('convert-docx');
        try {
          const docxPathJs = path.resolve(targetPath).replace(/\\/g, '/');
          const tmpScriptPath = path.join(tmpDir, 'convert-docx.mjs');

          const scriptContent = [
            `import { convertDocumentToMd } from ${JSON.stringify(toFileUrl(BASE_PATH) + '/src/modules/document/converter.js')};`,
            `const result = convertDocumentToMd(${JSON.stringify(docxPathJs)});`,
            `process.stdout.write(JSON.stringify(result));`,
          ].join('\n');

          secureRuntime.safeMkdir(tmpDir);
          secureRuntime.safeWriteFile(tmpScriptPath, scriptContent);

          const output = runNodeScript(tmpScriptPath, { timeout: 120000, maxBuffer: 50 * 1024 * 1024 });

          const result = JSON.parse(output);

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
        } finally {
          try { secureRuntime.safeRm(tmpDir); } catch { /* cleanup best-effort */ }
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
        if (!secureRuntime.safeExists(targetPath)) {
          return { error: `File ${targetPath} không tồn tại` };
        }

        const tmpDir = uniqueTmpDir('archive');
        try {
          const tmpScriptPath = path.join(tmpDir, 'archive.mjs');
          const filePathJs = path.resolve(targetPath).replace(/\\/g, '/');
          const topic = args.topic || '';

          // Validate topic: only alphanumeric, spaces, hyphens, underscores
          if (topic && !/^[a-zA-Z0-9\s\-_.À-ỹ]+$/.test(topic)) {
            return { error: 'Chủ đề chỉ được chứa chữ cái, số và dấu cách' };
          }

          const scriptContent = [
            `import { archiveDocument } from ${JSON.stringify(toFileUrl(BASE_PATH) + '/src/modules/knowledge/md-archiver.js')};`,
            `const result = archiveDocument(${JSON.stringify(filePathJs)}, ${JSON.stringify(topic || undefined)});`,
            `process.stdout.write(JSON.stringify(result));`,
          ].join('\n');

          secureRuntime.safeMkdir(tmpDir);
          secureRuntime.safeWriteFile(tmpScriptPath, scriptContent);

          const output = runNodeScript(tmpScriptPath, { timeout: 120000, maxBuffer: 50 * 1024 * 1024 });

          const result = JSON.parse(output);
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
        } finally {
          try { secureRuntime.safeRm(tmpDir); } catch { /* cleanup best-effort */ }
        }
      }
    }
  ]
};

export default plugin;
