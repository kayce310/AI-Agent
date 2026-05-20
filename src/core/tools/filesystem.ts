/**
 * @file Filesystem Tools Plugin
 * @layer core
 * @depends-on src/core/tools/tool-gateway.ts
 * @owner core-tools
 *
 * ZERO-TRUST: All file I/O routes through secureRuntime (tool-gateway.ts).
 */

import * as path from 'path';
import { ToolPlugin } from './tool-registry.js';
import { isPathSafe } from './_shared.js';
import { secureRuntime } from './tool-gateway.js';

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
        if (!secureRuntime.safeExists(targetPath)) {
          return { error: `File ${targetPath} không tồn tại` };
        }
        if (!secureRuntime.safeStat(targetPath).isFile()) {
          return { error: `${targetPath} không phải là file` };
        }
        return { content: secureRuntime.safeReadFile(targetPath) };
      }
    }
  ]
};

export default plugin;
