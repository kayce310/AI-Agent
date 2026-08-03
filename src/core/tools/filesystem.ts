/**
 * @file Filesystem Tools Plugin
 * @layer core
 * @depends-on src/core/tools/tool-gateway.ts
 * @owner core-tools
 *
 * ZERO-TRUST: All file I/O routes through secureRuntime (tool-gateway.ts).
 * `fs` chỉ dùng cho TYPE (fs.Dirent) — không có runtime fs call.
 */

import type * as fs from 'fs';
import * as path from 'path';
import type { ToolPlugin } from './tool-registry.js';
import { isPathSafe, BASE_PATH } from './_shared.js';
import { isSensitivePath } from './path-utils.js';
import { secureRuntime } from './tool-gateway.js';

/** Recursive directory walk — returns absolute paths matching filter */
function walkDir(dir: string, predicate: (name: string) => boolean, results: string[] = []): string[] {
  let entries: fs.Dirent[];
  try { entries = secureRuntime.safeReaddir(dir); } catch { return results; }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walkDir(full, predicate, results);
    else if (predicate(e.name)) results.push(full);
  }
  return results;
}

const plugin: ToolPlugin = {
  name: 'filesystem',
  tools: [
    {
      name: 'list_directory',
      description: 'Liệt kê các file và thư mục trong một đường dẫn',
      schema: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Đường dẫn thư mục cần liệt kê' }
        },
        required: ['path']
      },
      execute(args: Record<string, any>) {
        const targetPath = args.path;
        if (!isPathSafe(targetPath)) {
          return { error: `Đường dẫn ${targetPath} không được phép truy cập` };
        }
        if (!secureRuntime.safeExists(targetPath)) {
          return { error: `Thư mục ${targetPath} không tồn tại` };
        }
        return secureRuntime.safeReaddir(targetPath).map(item => ({
          name: item.name,
          type: item.isDirectory() ? 'directory' : 'file'
        }));
      }
    },
    {
      name: 'read_file',
      description: 'Đọc nội dung của một file văn bản (.md, .ts, .json, .txt, .m, .bat, .ps1, .yml, .yaml, .env, .gitignore)',
      schema: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Đường dẫn file cần đọc' }
        },
        required: ['path']
      },
      execute(args: Record<string, any>) {
        const targetPath = args.path;
        if (!isPathSafe(targetPath)) {
          return { error: `Đường dẫn ${targetPath} không được phép truy cập` };
        }
        if (isSensitivePath(targetPath)) {
          return { error: `File ${targetPath} bị chặn bởi PrivilegeGuard (credential file)` };
        }
        if (!secureRuntime.safeExists(targetPath)) {
          return { error: `File ${targetPath} không tồn tại` };
        }
        if (!secureRuntime.safeStat(targetPath).isFile()) {
          return { error: `${targetPath} không phải là file` };
        }
        return { content: secureRuntime.safeReadFile(targetPath) };
      }
    },
    {
      name: 'write_file',
      description: 'Ghi nội dung text vào file. Tạo file mới hoặc ghi đè file cũ. Dùng để: tạo script, viết code, lưu report.',
      schema: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Đường dẫn file cần ghi' },
          content: { type: 'string', description: 'Nội dung cần ghi vào file' }
        },
        required: ['path', 'content']
      },
      execute(args: Record<string, any>) {
        const targetPath = args.path;
        const content = args.content;
        if (!content && content !== '') {
          return { error: 'Nội dung không được để trống' };
        }
        // Resolve relative paths against BASE_PATH
        const resolvedPath = path.resolve(BASE_PATH, targetPath);
        if (!isPathSafe(resolvedPath)) {
          return { error: `Đường dẫn ${targetPath} không được phép truy cập` };
        }
        try {
          // Ensure parent directory exists
          const parentDir = path.dirname(resolvedPath);
          if (!secureRuntime.safeExists(parentDir)) {
            secureRuntime.safeMkdir(parentDir);
          }
          secureRuntime.safeWriteFile(resolvedPath, String(content));
          return { success: true, path: resolvedPath, bytes: String(content).length };
        } catch (err: any) {
          return { error: `Lỗi ghi file: ${err.message}` };
        }
      }
    },
    {
      name: 'search_files',
      description: 'Tìm kiếm nội dung trong files bằng regex. Dùng để tìm function, variable, import, config trong codebase. Walk recursive qua thư mục.',
      schema: {
        type: 'object',
        properties: {
          pattern: { type: 'string', description: 'Regex pattern cần tìm (case-insensitive)' },
          path: { type: 'string', description: 'Thư mục gốc (mặc định: BASE_PATH)' },
          file_glob: { type: 'string', description: 'Chỉ tìm trong files khớp glob, vd: *.ts, *.md, *.json' },
          max_results: { type: 'number', description: 'Số kết quả tối đa (mặc định 50)', default: 50 }
        },
        required: ['pattern']
      },
      execute(args: Record<string, any>) {
        const pattern = String(args.pattern || '');
        if (!pattern) return { error: 'pattern không được để trống' };
        let regex: RegExp;
        try { regex = new RegExp(pattern, 'i'); }
        catch (e: any) { return { error: `Regex không hợp lệ: ${e.message}` }; }

        const searchRoot = args.path ? path.resolve(BASE_PATH, args.path) : BASE_PATH;
        if (!isPathSafe(searchRoot)) return { error: `Đường dẫn ${args.path} không được phép` };
        if (!secureRuntime.safeExists(searchRoot)) return { error: `Thư mục ${searchRoot} không tồn tại` };

        const glob = args.file_glob || '';
        const maxResults = Math.min(Number(args.max_results) || 50, 200);
        const results: { file: string; line: number; content: string }[] = [];

        const files = glob
          ? walkDir(searchRoot, name => {
              const globRe = new RegExp('^' + glob.replace(/\./g, '\\.').replace(/\*/g, '.*') + '$', 'i');
              return globRe.test(name);
            })
          : walkDir(searchRoot, () => true);

        for (const file of files) {
          try {
            const content = secureRuntime.safeReadFile(file);
            const lines = content.split(/\r?\n/);
            for (let i = 0; i < lines.length; i++) {
              if (results.length >= maxResults) break;
              if (regex.test(lines[i])) {
                results.push({ file: path.relative(BASE_PATH, file), line: i + 1, content: lines[i].trim() });
              }
            }
          } catch { /* skip unreadable */ }
          if (results.length >= maxResults) break;
        }

        return { pattern, total: results.length, results };
      }
    },
    {
      name: 'patch_file',
      description: 'Tìm và thay thế nội dung trong file. Dùng để sửa code, update config. old_string phải unique trong file — dùng replace_all=true nếu muốn thay tất cả occurrences.',
      schema: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Đường dẫn file cần sửa (relative to BASE_PATH hoặc absolute)' },
          old_string: { type: 'string', description: 'Đoạn text cần tìm — include context lines để đảm bảo unique match' },
          new_string: { type: 'string', description: 'Đoạn text thay thế (để trống để xoá old_string)' },
          replace_all: { type: 'boolean', description: 'Thay tất cả occurrences thay vì yêu cầu unique match', default: false }
        },
        required: ['path', 'old_string', 'new_string']
      },
      execute(args: Record<string, any>) {
        const targetPath = path.resolve(BASE_PATH, args.path);
        if (!isPathSafe(targetPath)) return { error: `Đường dẫn ${args.path} không được phép` };
        if (!secureRuntime.safeExists(targetPath)) return { error: `File ${targetPath} không tồn tại` };

        const content = secureRuntime.safeReadFile(targetPath);
        const oldStr = String(args.old_string || '');
        const newStr = String(args.new_string ?? '');
        const replaceAll = Boolean(args.replace_all);

        if (!oldStr) return { error: 'old_string không được để trống' };

        if (replaceAll) {
          const parts = content.split(oldStr);
          if (parts.length <= 1) return { error: 'old_string không tìm thấy trong file' };
          const newContent = parts.join(newStr);
          secureRuntime.safeWriteFile(targetPath, newContent);
          return {
            success: true,
            replacements: parts.length - 1,
            diff: `--- a/${path.relative(BASE_PATH, targetPath)}\n+++ b/${path.relative(BASE_PATH, targetPath)}\n${parts.length - 1} replacement(s)`,
          };
        }

        const idx = content.indexOf(oldStr);
        if (idx === -1) return { error: 'Không tìm thấy old_string trong file. Thêm context lines để unique match, hoặc dùng replace_all=true.' };
        const secondIdx = content.indexOf(oldStr, idx + 1);
        if (secondIdx !== -1) return { error: `old_string xuất hiện ${content.split(oldStr).length - 1} lần — không unique. Dùng replace_all=true hoặc thêm context.` };

        const newContent = content.slice(0, idx) + newStr + content.slice(idx + oldStr.length);
        secureRuntime.safeWriteFile(targetPath, newContent);

        // Generate simple diff context
        const beforeLines = content.substring(Math.max(0, idx - 40), idx).split('\n');
        const afterLines = content.substring(idx + oldStr.length, idx + oldStr.length + 40).split('\n');
        const contextBefore = beforeLines.slice(-3).filter(Boolean).join('\n');
        const contextAfter = afterLines.slice(0, 3).filter(Boolean).join('\n');
        const diff = [
          `--- a/${path.relative(BASE_PATH, targetPath)}`,
          `+++ b/${path.relative(BASE_PATH, targetPath)}`,
          contextBefore ? ` ${contextBefore}` : '',
          `-${oldStr.split('\n')[0]}${oldStr.includes('\n') ? '...' : ''}`,
          `+${newStr.split('\n')[0]}${newStr.includes('\n') ? '...' : ''}`,
          contextAfter ? ` ${contextAfter}` : '',
        ].filter(Boolean).join('\n');

        return { success: true, path: path.relative(BASE_PATH, targetPath), bytes: newContent.length, diff };
      }
    }
  ]
};

export default plugin;
