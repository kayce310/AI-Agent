/**
 * @file Knowledge Tools Plugin
 * @layer core
 * @depends-on src/core/tools/tool-gateway.ts
 * @owner core-tools
 *
 * ZERO-TRUST: All file I/O routes through secureRuntime (tool-gateway.ts).
 */

import * as path from 'path';
import type { ToolPlugin } from './tool-registry.js';
import { isPathSafe, addProcessedFile } from './_shared.js';
import { BASE_PATH } from './_shared.js';
import { secureRuntime } from './tool-gateway.js';
import { globalMemoryStore } from '../memory/memory-store.js';
import { getRequestContext } from '../request-context.js';

/**
 * Quét thư mục tìm kiếm keyword (dùng cho search_knowledge_graph)
 */
function scanDir(dir: string, prefix: string, keyword: string, results: any[]): void {
  const items = secureRuntime.safeReaddir(dir);

  for (const item of items) {
    const fullPath = path.join(dir, item.name);
    const relativePath = prefix + item.name;

    if (item.isDirectory()) {
      scanDir(fullPath, relativePath + '/', keyword, results);
    } else if (item.name.endsWith('.md')) {
      const content = secureRuntime.safeReadFile(fullPath).toLowerCase();

      if (content.includes(`[[${keyword}]]`)) {
        results.push({
          path: relativePath,
          match_type: 'backlink',
          priority: 10
        });
        continue;
      }

      if (content.includes(`#${keyword}`)) {
        results.push({
          path: relativePath,
          match_type: 'tag',
          priority: 8
        });
        continue;
      }

      const regex = new RegExp(`(.{0,100}${keyword}.{0,100})`, 'i');
      const match = content.match(regex);
      if (match) {
        results.push({
          path: relativePath,
          match_type: 'content',
          priority: 5,
          context: '...' + match[1].trim() + '...'
        });
      }
    }
  }
}

const plugin: ToolPlugin = {
  name: 'knowledge',
  tools: [
    {
      name: 'search_knowledge_graph',
      description: 'Tìm kiếm trong cơ sở tri thức (knowledge/wiki/ + knowledge/blueprints/)',
      schema: {
        type: 'object',
        properties: {
          keyword: { type: 'string', description: 'Từ khóa cần tìm kiếm' }
        },
        required: ['keyword']
      },
      execute(args: Record<string, any>) {
        const keyword = args.keyword.toLowerCase();
        const results: any[] = [];
        const scanPaths = ['knowledge/wiki/', 'knowledge/blueprints/', 'knowledge/raw-md/'];

        for (const baseDir of scanPaths) {
          const fullDir = path.join(BASE_PATH, baseDir);
          if (!secureRuntime.safeExists(fullDir)) continue;
          scanDir(fullDir, baseDir, keyword, results);
        }

        results.sort((a, b) => b.priority - a.priority);

        return {
          keyword: args.keyword,
          total_results: results.length,
          results: results.slice(0, 20)
        };
      }
    },
    {
      name: 'write_wiki_page',
      description: 'Tạo hoặc cập nhật một trang wiki trong knowledge/wiki/',
      schema: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Đường dẫn file wiki cần tạo (vd: projects/ovap-x1.md)' },
          content: { type: 'string', description: 'Nội dung markdown của trang wiki' },
          tags: { type: 'string', description: 'Các tag phân cách bởi dấu cách' }
        },
        required: ['path', 'content']
      },
      execute(args: Record<string, any>) {
        const relativePath = args.path.replace(/^\/+/, '');
        const fullPath = path.resolve(BASE_PATH, 'knowledge/wiki/', relativePath);
        if (!fullPath.startsWith(path.resolve(BASE_PATH, 'knowledge/wiki/'))) {
          return { error: 'Đường dẫn không được phép thoát khỏi knowledge/wiki/' };
        }

        const dirPath = path.dirname(fullPath);
        secureRuntime.safeMkdir(dirPath);

        let content = args.content;
        if (args.tags) {
          content += `\n\n---\n#${args.tags.split(' ').join(' #')}`;
        }

        secureRuntime.safeWriteFile(fullPath, content);

        const wikiRelPath = path.join('knowledge/wiki/', relativePath);
        addProcessedFile({
          path: wikiRelPath,
          type: 'document',
          action: 'wiki_created',
          notes: args.tags ? `tags: ${args.tags}` : undefined,
        });

        return { success: true, path: wikiRelPath };
      }
    },
    {
      name: 'session_search',
      description: 'Search conversation history across all channels. Uses MemoryStore semantic query. Returns matching messages with session ID, content preview, and relevance score. Use to recall past discussions, decisions, or facts mentioned in previous conversations.',
      schema: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Keywords or phrase to search for in conversation history' },
          limit: { type: 'number', description: 'Max results (default: 10, max: 50)' },
          sessionId: { type: 'string', description: 'Optional: filter by specific channel/session ID' },
        },
        required: ['query'],
      },
      execute: async (args: Record<string, any>) => {
        const query = String(args.query || '');
        if (!query) return { error: 'query không được để trống' };
        const limit = Math.min(Number(args.limit) || 10, 50);
        // ponytail: default to current session — never query global without explicit sessionId
        const sessionId = args.sessionId ? String(args.sessionId) : getRequestContext()?.sessionId;
        if (!sessionId) return { error: 'sessionId không xác định — vui lòng truyền sessionId hoặc chạy trong context request' };

        const opts: any = { topK: limit };
        opts.sessionId = sessionId;

        const results = await globalMemoryStore.query(query, opts);
        return {
          query,
          total: results.length,
          results: results.slice(0, limit).map((r: any) => ({
            content: r.content.slice(0, 500),
            score: r.score ?? 0,
            sessionId: r.sessionId || 'unknown',
            type: r.type,
            tags: r.tags || [],
            timestamp: r.timestamp,
          })),
        };
      }
    },
  ]
};

export default plugin;
