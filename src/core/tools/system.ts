/**
 * System Tools Plugin
 * Provides: process_new_raw, execute_command, extract_formulas
 */
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { ToolPlugin } from '../tool-registry.js';
import { isPathSafe, isCommandSafe, toFileUrl, addProcessedFile, BASE_PATH } from './_shared.js';

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

        if (!fs.existsSync(absInputDir)) {
          return { error: `Thư mục input ${absInputDir} không tồn tại` };
        }

        const files = fs.readdirSync(absInputDir);
        const pdfs = files.filter(f => f.toLowerCase().endsWith('.pdf'));
        const docxs = files.filter(f => f.toLowerCase().endsWith('.docx'));

        if (pdfs.length === 0 && docxs.length === 0) {
          return `✅ Không có file mới (PDF/DOCX) trong ${inputDir}`;
        }

        const processed: string[] = [];
        const errors: string[] = [];

        for (const pdfFile of pdfs) {
          try {
            const pdfPath = path.join(absInputDir, pdfFile);
            const tmpDir = path.join(BASE_PATH, '.tmp-convert-' + Date.now());
            fs.mkdirSync(tmpDir, { recursive: true });
            const tmpScriptPath = path.join(tmpDir, 'process.mjs');
            const pdfPathJs = pdfPath.replace(/\\/g, '/');

            const scriptContent = `
import { convertDocumentToMd } from '${toFileUrl(BASE_PATH)}/src/modules/document/converter.js';
const result = convertDocumentToMd('${pdfPathJs}');
process.stdout.write(JSON.stringify(result));
`;
            fs.writeFileSync(tmpScriptPath, scriptContent, 'utf8');
            const output = execSync(`node "${tmpScriptPath}"`, { cwd: BASE_PATH, encoding: 'utf8', timeout: 120000, maxBuffer: 50 * 1024 * 1024, windowsHide: true });
            try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
            const result = JSON.parse(output.trim());

            addProcessedFile({ path: pdfPath, type: 'pdf', action: 'process_new_raw', destination: result.mdPath });
            processed.push(`✅ ${pdfFile} → ${result.mdPath}`);
          } catch (err: any) {
            errors.push(`❌ ${pdfFile}: ${err.message}`);
          }
        }

        for (const docxFile of docxs) {
          try {
            const docxPath = path.join(absInputDir, docxFile);
            const tmpDir = path.join(BASE_PATH, '.tmp-convert-' + Date.now());
            fs.mkdirSync(tmpDir, { recursive: true });
            const tmpScriptPath = path.join(tmpDir, 'process.mjs');
            const docxPathJs = docxPath.replace(/\\/g, '/');

            const scriptContent = `
import { convertDocumentToMd } from '${toFileUrl(BASE_PATH)}/src/modules/document/converter.js';
const result = convertDocumentToMd('${docxPathJs}');
process.stdout.write(JSON.stringify(result));
`;
            fs.writeFileSync(tmpScriptPath, scriptContent, 'utf8');
            const output = execSync(`node "${tmpScriptPath}"`, { cwd: BASE_PATH, encoding: 'utf8', timeout: 120000, maxBuffer: 50 * 1024 * 1024, windowsHide: true });
            try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
            const result = JSON.parse(output.trim());

            addProcessedFile({ path: docxPath, type: 'document', action: 'process_new_raw', destination: result.mdPath });
            processed.push(`✅ ${docxFile} → ${result.mdPath}`);
          } catch (err: any) {
            errors.push(`❌ ${docxFile}: ${err.message}`);
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
        try {
          const output = execSync(cmd, {
            cwd: BASE_PATH,
            encoding: 'utf8',
            timeout: 60000,
            maxBuffer: 1024 * 1024,
            windowsHide: true,
            shell: 'powershell.exe'
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
          if (!fs.existsSync(fullPath)) {
            return { error: `File ${args.mdPath} không tồn tại` };
          }

          const content = fs.readFileSync(fullPath, 'utf8');

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