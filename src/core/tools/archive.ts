/**
 * @file Archive Tools Plugin
 * @layer core
 * @depends-on src/core/tools/tool-gateway.ts
 * @owner core-tools
 *
 * ZERO-TRUST: All file I/O routes through secureRuntime (tool-gateway.ts).
 */

import * as path from 'path';
import { ToolPlugin } from './tool-registry.js';
import { BASE_PATH, isPathSafe } from './_shared.js';
import { secureRuntime } from './tool-gateway.js';

function scanRawMdFiles(dir: string, results: string[] = []): string[] {
  const entries = secureRuntime.safeReaddir(dir);
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      scanRawMdFiles(fullPath, results);
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      results.push(fullPath);
    }
  }
  return results;
}

const plugin: ToolPlugin = {
  name: 'archive',
  tools: [
    {
      name: 'search_archived_md',
      description: 'Tìm kiếm trong knowledge/raw-md/ theo keyword hoặc regex',
      schema: {
        type: 'object',
        properties: {
          keyword: { type: 'string', description: 'Từ khóa hoặc biểu thức regex cần tìm' },
          regex: { type: 'boolean', description: 'Dùng regex hay substring', default: false },
          max_results: { type: 'number', description: 'Số kết quả tối đa', default: 20 }
        },
        required: ['keyword']
      },
      execute(args: Record<string, any>) {
        const keyword = String(args.keyword || '').trim();
        const useRegex = Boolean(args.regex);
        const maxResults = Number(args.max_results) || 20;

        if (!keyword) {
          return { error: 'keyword không được để trống' };
        }

        const archiveDir = path.join(BASE_PATH, 'knowledge', 'raw-md');
        if (!secureRuntime.safeExists(archiveDir)) {
          return { keyword, total_results: 0, results: [] };
        }

        let matcher: RegExp;
        try {
          matcher = useRegex ? new RegExp(keyword, 'i') : new RegExp(keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
        } catch (err: any) {
          return { error: `Regex không hợp lệ: ${err.message}` };
        }

        const files = scanRawMdFiles(archiveDir);
        const results: any[] = [];

        for (const file of files) {
          const content = secureRuntime.safeReadFile(file);
          if (!matcher.test(content)) continue;

          const snippets: string[] = [];
          const lines = content.split(/\r?\n/);
          for (let i = 0; i < lines.length && snippets.length < 3; i++) {
            if (matcher.test(lines[i])) {
              const start = Math.max(0, i - 2);
              const end = Math.min(lines.length - 1, i + 2);
              snippets.push(lines.slice(start, end + 1).join('\n'));
            }
          }

          results.push({
            path: path.relative(BASE_PATH, file),
            matches: snippets,
          });
          if (results.length >= maxResults) break;
        }

        return {
          keyword,
          total_results: results.length,
          results,
        };
      }
    },
    {
      name: 'quote_from_source',
      description: 'Trích dẫn chính xác từ raw-md kèm context lines',
      schema: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Đường dẫn file raw-md tương đối hoặc tuyệt đối' },
          keyword: { type: 'string', description: 'Từ khóa hoặc regex cần trích dẫn' },
          context_lines: { type: 'number', description: 'Số dòng context xung quanh', default: 2 },
          regex: { type: 'boolean', description: 'Dùng regex hay substring', default: false }
        },
        required: ['path', 'keyword']
      },
      execute(args: Record<string, any>) {
        const rawPath = String(args.path || '').trim();
        const keyword = String(args.keyword || '').trim();
        const contextLines = Number(args.context_lines) || 2;
        const useRegex = Boolean(args.regex);

        if (!rawPath) {
          return { error: 'path không được để trống' };
        }
        if (!keyword) {
          return { error: 'keyword không được để trống' };
        }

        const archiveBase = path.resolve(BASE_PATH, 'knowledge', 'raw-md');
        let candidatePath = path.resolve(rawPath);
        if (!candidatePath.startsWith(archiveBase)) {
          candidatePath = path.resolve(archiveBase, rawPath);
        }

        if (!candidatePath.startsWith(archiveBase)) {
          return { error: 'Đường dẫn file chỉ được phép nằm trong knowledge/raw-md/' };
        }
        if (!secureRuntime.safeExists(candidatePath)) {
          return { error: `File ${candidatePath} không tồn tại` };
        }
        if (!secureRuntime.safeStat(candidatePath).isFile()) {
          return { error: `${candidatePath} không phải là file` };
        }
        if (!isPathSafe(candidatePath)) {
          return { error: `Đường dẫn ${candidatePath} không được phép truy cập` };
        }

        const content = secureRuntime.safeReadFile(candidatePath);
        let matcher: RegExp;
        try {
          matcher = useRegex ? new RegExp(keyword, 'i') : new RegExp(keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
        } catch (err: any) {
          return { error: `Regex không hợp lệ: ${err.message}` };
        }

        const lines = content.split(/\r?\n/);
        const matches: any[] = [];
        for (let i = 0; i < lines.length; i++) {
          if (matcher.test(lines[i])) {
            const start = Math.max(0, i - contextLines);
            const end = Math.min(lines.length - 1, i + contextLines);
            matches.push({
              line: i + 1,
              snippet: lines.slice(start, end + 1).join('\n')
            });
          }
          if (matches.length >= 20) break;
        }

        return {
          path: path.relative(BASE_PATH, candidatePath),
          keyword,
          total_matches: matches.length,
          matches,
        };
      }
    }
  ]
};

export default plugin;
