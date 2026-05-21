/**
 * @file Skills Tools Plugin
 * @layer core
 * @depends-on src/core/tools/tool-gateway.ts
 * @owner core-tools
 *
 * ZERO-TRUST: All file I/O routes through secureRuntime (tool-gateway.ts).
 */

import * as path from 'path';
import type { ToolPlugin } from './tool-registry.js';
import { BASE_PATH } from './_shared.js';
import { secureRuntime } from './tool-gateway.js';

const plugin: ToolPlugin = {
  name: 'skills',
  tools: [
    {
      name: 'load_skill',
      description: 'Lazy-load chi tiết một 9router skill (Phase 2c)',
      schema: {
        type: 'object',
        properties: {
          slug: { type: 'string', description: 'Tên skill (slug)' }
        },
        required: ['slug']
      },
      execute(args: Record<string, any>) {
        const slug = args.slug;
        try {
          // Read 9router path from env var (external service)
          const nineRouterPath = process.env.NINE_ROUTER_EXTERNAL_PATH || path.join(BASE_PATH, '9router');
          const skillPath = path.join(nineRouterPath, 'skills', slug, `${slug}.kto.md`);
          if (!secureRuntime.safeExists(skillPath)) {
            return { error: `Skill "${slug}" không tồn tại tại ${skillPath}` };
          }
          const content = secureRuntime.safeReadFile(skillPath);
          return { slug, name: slug, content: content.length > 5000 ? content.substring(0, 5000) + '...\n[Truncated]' : content };
        } catch (err: any) {
          return { error: `Lỗi khi load skill: ${err.message}` };
        }
      }
    },
    {
      name: 'check_stale_skills',
      description: 'Kiểm tra skills cũ, cần review lại (Phase 2c)',
      schema: {
        type: 'object',
        properties: {
          max_age_days: { type: 'number', description: 'Số ngày tối đa cho phép (mặc định 30)' }
        },
        required: ['max_age_days']
      },
      execute(args: Record<string, any>) {
        try {
          const maxAgeDays = args.max_age_days || 30;
          const nineRouterPath = process.env.NINE_ROUTER_EXTERNAL_PATH || path.join(BASE_PATH, '9router');
          const skillsDir = path.join(nineRouterPath, 'skills');
          if (!secureRuntime.safeExists(skillsDir)) {
            return { error: 'Thư mục skills không tồn tại' };
          }
          const staleSkills: any[] = [];
          const entries = secureRuntime.safeReaddir(skillsDir);
          const now = Date.now();
          for (const entry of entries) {
            if (entry.isDirectory()) {
              const skillPath = path.join(skillsDir, entry.name, `${entry.name}.kto.md`);
              if (secureRuntime.safeExists(skillPath)) {
                const stat = secureRuntime.safeStat(skillPath);
                const ageDays = (now - stat.mtimeMs) / (1000 * 60 * 60 * 24);
                if (ageDays > maxAgeDays) {
                  staleSkills.push({ slug: entry.name, daysSinceUpdate: Math.round(ageDays), lastModified: stat.mtime.toISOString().split('T')[0] });
                }
              }
            }
          }
          if (staleSkills.length === 0) {
            return `✅ Tất cả skills đều được cập nhật trong vòng ${maxAgeDays} ngày qua.`;
          }
          return {
            message: `⚠️ Có ${staleSkills.length} skill(s) cần review lại (quá ${maxAgeDays} ngày không cập nhật)`,
            skills: staleSkills
          };
        } catch (err: any) {
          return { error: `Lỗi khi kiểm tra skills: ${err.message}` };
        }
      }
    }
  ]
};

export default plugin;
