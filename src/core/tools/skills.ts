/**
 * @file Skills Tools Plugin
 * @layer core
 * @depends-on src/core/tools/tool-gateway.ts
 * @owner core-tools
 *
 * ZERO-TRUST: All file I/O routes through secureRuntime (tool-gateway.ts).
 *
 * Scans agent skills from:
 *   - knowledge/agents-skills/{category}/{slug}/SKILL.md  (primary)
 *   - FALLBACK: 9router/skills/{slug}/{slug}.kto.md if NINE_ROUTER_EXTERNAL_PATH is set
 */

import * as path from 'path';
import type { ToolPlugin } from './tool-registry.js';
import { BASE_PATH } from './_shared.js';
import { secureRuntime } from './tool-gateway.js';

/** Primary agents-skills directory */
const AGENTS_SKILLS_DIR = path.join(BASE_PATH, 'knowledge/agents-skills');

/** Known categories inside agents-skills */
const AGENT_CATEGORIES = ['common', 'typescript'];

// ──────────────────────────────────────────────
// Helper — find a skill by slug across all categories
// ──────────────────────────────────────────────
function findSkillPath(slug: string): string | null {
  for (const cat of AGENT_CATEGORIES) {
    const candidate = path.join(AGENTS_SKILLS_DIR, cat, slug, 'SKILL.md');
    if (secureRuntime.safeExists(candidate)) return candidate;
  }
  // Dynamic scan: any top-level directory might be a category
  try {
    const top = secureRuntime.safeReaddir(AGENTS_SKILLS_DIR);
    for (const entry of top) {
      if (!entry.isDirectory()) continue;
      if (AGENT_CATEGORIES.includes(entry.name)) continue; // already checked
      const candidate = path.join(AGENTS_SKILLS_DIR, entry.name, slug, 'SKILL.md');
      if (secureRuntime.safeExists(candidate)) return candidate;
    }
  } catch { /* ignore */ }
  return null;
}

// ──────────────────────────────────────────────
// Helper — list every skill slug + category
// ──────────────────────────────────────────────
interface SkillEntry {
  slug: string;
  category: string;
  fullPath: string;
}

function listAllSkills(): SkillEntry[] {
  const results: SkillEntry[] = [];
  try {
    const cats = secureRuntime.safeReaddir(AGENTS_SKILLS_DIR);
    for (const cat of cats) {
      if (!cat.isDirectory()) continue;
      const category = cat.name;
      const skillDirs = secureRuntime.safeReaddir(path.join(AGENTS_SKILLS_DIR, category));
      for (const sdir of skillDirs) {
        if (!sdir.isDirectory()) continue;
        const skillPath = path.join(AGENTS_SKILLS_DIR, category, sdir.name, 'SKILL.md');
        if (secureRuntime.safeExists(skillPath)) {
          results.push({ slug: sdir.name, category, fullPath: skillPath });
        }
      }
    }
  } catch { /* agents-skills dir may not exist yet */ }
  return results;
}

// ──────────────────────────────────────────────
// Plugin definition
// ──────────────────────────────────────────────
const plugin: ToolPlugin = {
  name: 'skills',
  tools: [
    // ── Tool 1: load_skill ──────────────────────
    {
      name: 'load_skill',
      description: 'Lazy-load chi tiết một agent skill theo tên (slug) từ knowledge/agents-skills/',
      schema: {
        type: 'object',
        properties: {
          slug: { type: 'string', description: 'Tên skill (slug), ví dụ: common-best-practices, typescript-language' }
        },
        required: ['slug']
      },
      execute(args: Record<string, any>) {
        const slug = args.slug;
        try {
          // 1. Try primary agents-skills path
          const skillPath = findSkillPath(slug);
          if (skillPath) {
            const content = secureRuntime.safeReadFile(skillPath);
            return {
              slug,
              source: skillPath,
              content: content.length > 5000
                ? content.substring(0, 5000) + '...\n[Truncated]'
                : content
            };
          }

          // 2. Fallback: 9router external path (legacy)
          const nineRouterPath = process.env.NINE_ROUTER_EXTERNAL_PATH;
          if (nineRouterPath) {
            const legacyPath = path.join(nineRouterPath, 'skills', slug, `${slug}.kto.md`);
            if (secureRuntime.safeExists(legacyPath)) {
              const content = secureRuntime.safeReadFile(legacyPath);
              return {
                slug,
                source: legacyPath,
                content: content.length > 5000
                  ? content.substring(0, 5000) + '...\n[Truncated]'
                  : content
              };
            }
          }

          return { error: `Skill "${slug}" không tồn tại trong agents-skills hoặc 9router.` };
        } catch (err: any) {
          return { error: `Lỗi khi load skill: ${err.message}` };
        }
      }
    },

    // ── Tool 2: list_skills ─────────────────────
    {
      name: 'list_skills',
      description: 'Liệt kê tất cả agent skills có sẵn trong knowledge/agents-skills/',
      schema: {
        type: 'object',
        properties: {
          category: { type: 'string', description: 'Lọc theo category (common, typescript) — không bắt buộc' }
        },
        required: []
      },
      execute(args: Record<string, any>) {
        try {
          let skills = listAllSkills();
          const filterCat = args.category as string | undefined;
          if (filterCat) {
            skills = skills.filter(s => s.category === filterCat);
          }
          return {
            total: skills.length,
            skills: skills.map(s => ({
              slug: s.slug,
              category: s.category,
              path: s.fullPath
            }))
          };
        } catch (err: any) {
          return { error: `Lỗi khi liệt kê skills: ${err.message}` };
        }
      }
    },

    // ── Tool 3: check_stale_skills ──────────────
    {
      name: 'check_stale_skills',
      description: 'Kiểm tra skills cũ, cần review lại (dựa trên ngày sửa đổi SKILL.md)',
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
          const skills = listAllSkills();
          const now = Date.now();
          const staleSkills: any[] = [];

          for (const skill of skills) {
            const stat = secureRuntime.safeStat(skill.fullPath);
            const ageDays = (now - stat.mtimeMs) / (1000 * 60 * 60 * 24);
            if (ageDays > maxAgeDays) {
              staleSkills.push({
                slug: skill.slug,
                category: skill.category,
                daysSinceUpdate: Math.round(ageDays),
                lastModified: stat.mtime.toISOString().split('T')[0]
              });
            }
          }

          if (staleSkills.length === 0) {
            return `✅ Tất cả ${skills.length} skills đều được cập nhật trong vòng ${maxAgeDays} ngày qua.`;
          }
          return {
            message: `⚠️ Có ${staleSkills.length}/${skills.length} skill(s) cần review lại (quá ${maxAgeDays} ngày không cập nhật)`,
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
