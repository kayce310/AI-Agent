/**
 * @file System Tools Plugin
 * @layer core
 * @depends-on src/core/tools/tool-gateway.ts
 * @owner core-tools
 *
 * ZERO-TRUST: All file I/O routes through secureRuntime (tool-gateway.ts).
 * execFileSync is used instead of execSync to prevent shell injection.
 */

import * as path from 'path';
import { execFileSync } from 'child_process';
import type { ToolPlugin } from './tool-registry.js';
import { isPathSafe, isCommandSafe, toFileUrl, addProcessedFile, BASE_PATH } from './_shared.js';
import { secureRuntime } from './tool-gateway.js';

/** Validate filename contains only safe characters (no shell metacharacters) */
function isFilenameSafe(name: string): boolean {
  return /^[a-zA-Z0-9._\-\u00C0-\u024F\u1E00-\u1EFF\s()]+$/.test(name);
}

/** Shared logic for processing a single document via Node script */
function processDocument(
  absPath: string,
  type: 'pdf' | 'document'
): { success: boolean; mdPath?: string; error?: string } {
  const fileName = path.basename(absPath);

  if (!isFilenameSafe(fileName)) {
    return { success: false, error: `Tên file chứa ký tự không an toàn: ${fileName}` };
  }

  const tmpDir = path.join(BASE_PATH, '.tmp-convert-' + Date.now() + '-' + Math.random().toString(36).slice(2));
  const tmpScriptPath = path.join(tmpDir, 'process.mjs');

  try {
    secureRuntime.safeMkdir(tmpDir);

    // Escape path properly using JSON.stringify — prevents injection via single quotes
    const pdfPathJs = absPath.replace(/\\/g, '/');
    const scriptContent = [
      `import { convertDocumentToMd } from ${JSON.stringify(toFileUrl(BASE_PATH) + '/src/modules/document/converter.js')};`,
      `const result = convertDocumentToMd(${JSON.stringify(pdfPathJs)});`,
      `process.stdout.write(JSON.stringify(result));`,
    ].join('\n');

    secureRuntime.safeWriteFile(tmpScriptPath, scriptContent);

    // Use execFileSync — no shell interpretation, no injection
    const output = execFileSync(process.execPath, [tmpScriptPath], {
      cwd: BASE_PATH,
      encoding: 'utf8',
      timeout: 120000,
      maxBuffer: 50 * 1024 * 1024,
      windowsHide: true,
    });

    const result = JSON.parse(output.trim());
    return { success: true, mdPath: result.mdPath };
  } catch (err: any) {
    return { success: false, error: err.message };
  } finally {
    try { secureRuntime.safeRm(tmpDir); } catch { /* cleanup best-effort */ }
  }
}

const plugin: ToolPlugin = {
  name: 'system',
  tools: [
    {
      name: 'process_new_raw',
      description: 'Quét + xử lý file mới (PDF, DOCX) trong thư mục raw input',
      schema: {
        type: 'object',
        properties: {
          input_dir: { type: 'string', description: 'Thư mục chứa file cần xử lý (mặc định: knowledge/raw-input/)' }
        },
        required: ['input_dir']
      },
      execute(args: Record<string, any>) {
        const inputDir = args.input_dir || path.join(BASE_PATH, 'knowledge/raw-input/');
        const absInputDir = path.resolve(BASE_PATH, inputDir);

        if (!secureRuntime.safeExists(absInputDir)) {
          return { error: `Thư mục input ${absInputDir} không tồn tại` };
        }

        const files = secureRuntime.safeReaddir(absInputDir);
        const pdfs = files.filter(f => f.name.toLowerCase().endsWith('.pdf'));
        const docxs = files.filter(f => f.name.toLowerCase().endsWith('.docx'));

        if (pdfs.length === 0 && docxs.length === 0) {
          return `✅ Không có file mới (PDF/DOCX) trong ${inputDir}`;
        }

        const processed: string[] = [];
        const errors: string[] = [];

        for (const pdfFile of pdfs) {
          const pdfPath = path.join(absInputDir, pdfFile.name);
          const result = processDocument(pdfPath, 'pdf');
          if (result.success) {
            addProcessedFile({ path: pdfPath, type: 'pdf', action: 'process_new_raw', destination: result.mdPath });
            processed.push(`✅ ${pdfFile.name} → ${result.mdPath}`);
          } else {
            errors.push(`❌ ${pdfFile.name}: ${result.error}`);
          }
        }

        for (const docxFile of docxs) {
          const docxPath = path.join(absInputDir, docxFile.name);
          const result = processDocument(docxPath, 'document');
          if (result.success) {
            addProcessedFile({ path: docxPath, type: 'document', action: 'process_new_raw', destination: result.mdPath });
            processed.push(`✅ ${docxFile.name} → ${result.mdPath}`);
          } else {
            errors.push(`❌ ${docxFile.name}: ${result.error}`);
          }
        }

        const summary: string[] = [];
        if (processed.length > 0) summary.push(`✅ Đã xử lý ${processed.length} file:`);
        processed.forEach(p => summary.push(p));
        if (errors.length > 0) {
          summary.push(`\n⚠️ Có ${errors.length} lỗi:`);
          errors.forEach(e => summary.push(e));
        }
        return summary.join('\n');
      }
    },
    {
      name: 'execute_command',
      description: 'Chạy lệnh hệ thống (với guard: chỉ cho phép lệnh an toàn)',
      schema: {
        type: 'object',
        properties: {
          command: { type: 'string', description: 'Lệnh cần chạy' }
        },
        required: ['command']
      },
      execute(args: Record<string, any>) {
        const cmd = args.command;
        if (!cmd || cmd.trim().length === 0) {
          return { error: 'Lệnh không được để trống' };
        }
        if (!isCommandSafe(cmd)) {
          return { error: `Lệnh "${cmd}" không nằm trong whitelist các lệnh được phép.` };
        }

        // Parse command into program + args array
        // This prevents shell injection since no shell is involved
        const parts = cmd.match(/(?:[^\s"]+|"[^"]*")+/g) || [cmd];
        const program = parts[0].replace(/^"|"$/g, '');
        const execArgs: string[] = parts.slice(1).map((a: string) => a.replace(/^"|"$/g, ''));

        // Validate program path — must be basename only, no path traversal
        const programName = path.basename(program);
        if (programName !== program || /\.\./.test(program)) {
          return { error: 'Chương trình không được chứa đường dẫn hoặc ..' };
        }

        try {
          const output = execFileSync(programName, execArgs, {
            cwd: BASE_PATH,
            encoding: 'utf8',
            timeout: 60000,
            maxBuffer: 1024 * 1024,
            windowsHide: true,
            // NO shell — execFileSync runs the binary directly
            // This eliminates shell injection vectors
          });
          if (!output || output.trim().length === 0) {
            return `✅ Lệnh chạy thành công (không có output)`;
          }
          return output.substring(0, 50000) + (output.length > 50000 ? '\n\n[... output truncated at 50000 chars]' : '');
        } catch (err: any) {
          return { error: `Lỗi khi chạy lệnh: ${err.message}`, stderr: err.stderr?.substring(0, 1000) };
        }
      }
    },
    {
      name: 'extract_formulas',
      description: 'Trích xuất công thức từ raw-md đã archive (Phase 2c)',
      schema: {
        type: 'object',
        properties: {
          mdPath: { type: 'string', description: 'Đường dẫn file raw-md cần trích xuất' }
        },
        required: ['mdPath']
      },
      execute(args: Record<string, any>) {
        try {
          const fullPath = path.resolve(BASE_PATH, args.mdPath);
          if (!isPathSafe(fullPath)) {
            return { error: `Đường dẫn ${args.mdPath} không được phép truy cập` };
          }
          if (!secureRuntime.safeExists(fullPath)) {
            return { error: `File ${args.mdPath} không tồn tại` };
          }

          const content = secureRuntime.safeReadFile(fullPath);

          // Extract LaTeX formulas (inline $...$ and display $$...$$)
          const displayFormulas: string[] = [];
          const displayRegex = /\$\$([\s\S]*?)\$\$/g;
          let match;
          while ((match = displayRegex.exec(content)) !== null) {
            displayFormulas.push(match[1].trim());
          }

          const inlineFormulas: string[] = [];
          const inlineRegex = /\$(.+?)\$/g;
          while ((match = inlineRegex.exec(content)) !== null) {
            inlineFormulas.push(match[1].trim());
          }

          return {
            source: args.mdPath,
            totalDisplay: displayFormulas.length,
            totalInline: inlineFormulas.length,
            displayFormulas,
            inlineFormulas
          };
        } catch (err: any) {
          return { error: `Lỗi trích xuất công thức: ${err.message}` };
        }
      }
    }
  ]
};

export default plugin;
