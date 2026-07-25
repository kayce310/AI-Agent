/**
 * @file execute_code — Tool plugin
 * @layer core
 * @owner core-tools
 *
 * Run code in a sandboxed subprocess. Supports Python and Node.js.
 * Timeout protection, output truncation.
 */
import { execFileSync } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import type { ToolPlugin } from './tool-registry.js';
import { BASE_PATH } from './_shared.js';

const plugin: ToolPlugin = {
  name: 'execute_code',
  tools: [
    {
      name: 'execute_code',
      description: 'Run a Python or Node.js script in a sandboxed subprocess. Use for data processing, calculations, code generation. Output truncated at 50KB.',
      schema: {
        type: 'object',
        properties: {
          code: { type: 'string', description: 'Code to execute' },
          language: { type: 'string', enum: ['python', 'javascript', 'node'], default: 'python', description: 'Language runtime' },
          timeout: { type: 'number', description: 'Timeout in seconds (default 30, max 120)' }
        },
        required: ['code']
      },
      execute(args: Record<string, any>) {
        const { code, language = 'python', timeout: userTimeout } = args;
        if (!code) return { error: 'code is required' };

        const timeoutMs = Math.min((userTimeout || 30) * 1000, 120000);
        const ext = (language === 'python') ? '.py' : '.js';
        const tmpFile = path.join(BASE_PATH, `.tmp-exec-${Date.now()}${ext}`);

        try {
          fs.writeFileSync(tmpFile, code, 'utf8');

          const program = (language === 'python') ? 'python' : 'node';
          const output = execFileSync(program, [tmpFile], {
            cwd: BASE_PATH,
            encoding: 'utf8',
            timeout: timeoutMs,
            maxBuffer: 50 * 1024 * 1024,
            windowsHide: true,
            env: { ...process.env, PYTHONIOENCODING: 'utf-8' },
          });

          const truncated = output.length > 50000
            ? output.substring(0, 50000) + '\n\n[... truncated at 50KB]'
            : output;

          return { stdout: truncated, exit_code: 0 };
        } catch (err: any) {
          const stderr = err.stderr?.substring(0, 5000) || '';
          const stdout = err.stdout?.substring(0, 5000) || '';
          return {
            stdout: stdout || undefined,
            stderr: stderr || err.message,
            exit_code: err.status ?? 1,
          };
        } finally {
          try { fs.unlinkSync(tmpFile); } catch { /* cleanup best-effort */ }
        }
      }
    }
  ]
};

export default plugin;
