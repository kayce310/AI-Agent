/**
 * Knowledge Tools Plugin
 * Provides: search_knowledge_graph, write_wiki_page
 */
import * as fs from 'fs';
import * as path from 'path';
import { ToolPlugin } from './tool-registry.js';
import { isPathSafe, addProcessedFile } from './_shared.js';
import { BASE_PATH } from './_shared.js';

/**
 * Quét thư mục tìm kiếm keyword (dùng cho search_knowledge_graph)
 */
function scanDir(dir: string, prefix: string, keyword: string, results: any[]): void {
  const items = fs.readdirSync(dir, { withFileTypes: true });

  for (const item of items) {
    const fullPath = path.join(dir, item.name);
    const relativePath = prefix + item.name;

    if (item.isDirectory()) {
      scanDir(fullPath, relativePath + '/', keyword, results);
    } else if (item.name.endsWith('.md')) {
      const content = fs.readFileSync(fullPath, 'utf8').toLowerCase();

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
          if (!fs.existsSync(fullDir)) continue;
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
        fs.mkdirSync(dirPath, { recursive: true });

        let content = args.content;
        if (args.tags) {
          content += `\n\n---\n#${args.tags.split(' ').join(' #')}`;
        }

        fs.writeFileSync(fullPath, content, 'utf8');

        const wikiRelPath = path.join('knowledge/wiki/', relativePath);
        addProcessedFile({
          path: wikiRelPath,
          type: 'document',
          action: 'wiki_created',
          notes: args.tags ? `tags: ${args.tags}` : undefined,
        });

        return { success: true, path: wikiRelPath };
      }
    }
  ]
};

export default plugin;