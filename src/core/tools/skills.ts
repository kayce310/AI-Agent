/**
 * @file Skills Tools Plugin — Progressive Disclosure
 * @layer core
 * @depends-on src/core/tools/tool-gateway.ts
 * @owner core-tools
 *
 * ZERO-TRUST: All file I/O routes through secureRuntime (tool-gateway.ts).
 *
 * Progressive Disclosure (Hermes Agent pattern):
 *   Tier 1 — list_skills:     metadata-only (slug, name, description, tags)
 *   Tier 2 — load_skill:      lazy-load full SKILL.md content (legacy compat)
 *   Tier 3 — skill_view:      lazy-load full SKILL.md + linked references/
 *   Tier 4 — check_stale_skills: maintenance helper
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

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

interface SkillEntry {
  slug: string;
  category: string;
  fullPath: string;
}

interface SkillMeta {
  slug: string;
  category: string;
  name: string;
  description: string;
  tags: string[];
}

/** Linked file entry in references/ directory */
interface LinkedFile {
  name: string;
  path: string;
  /** Relative path from skill's SKILL.md directory */
  relativePath: string;
}

// ──────────────────────────────────────────────
// YAML Frontmatter Parser
// ──────────────────────────────────────────────

/**
 * Parse YAML frontmatter from a SKILL.md file.
 * Returns { name, description, tags } from the frontmatter block.
 * Falls back gracefully — never throws.
 */
function parseFrontmatter(content: string): { name: string; description: string; tags: string[] } {
  const result = { name: '', description: '', tags: [] as string[] };

  // Match YAML frontmatter block between --- markers
  const match = content.match(/^---\s*\n([\s\S]*?)\n---/);
  if (!match) return result;

  const yamlBlock = match[1];
  const lines = yamlBlock.split('\n');

  let name = '';
  let description = '';
  const tags: string[] = [];
  let inKeywords = false;
  let inTagsArray = false;

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();

    // Track nesting for keywords list
    if (/^metadata:$/.test(line)) {
      inKeywords = false;
      inTagsArray = false;
      continue;
    }

    if (/^  triggers:$/.test(line)) {
      inKeywords = false;
      inTagsArray = false;
      continue;
    }

    if (/^    keywords:$/.test(line)) {
      inKeywords = true;
      inTagsArray = false;
      continue;
    }

    if (/^    tags:$/.test(line)) {
      inKeywords = false;
      inTagsArray = true;
      continue;
    }

    // Extract name
    const nameMatch = line.match(/^name:\s*(.+)/);
    if (nameMatch) {
      name = nameMatch[1].trim().replace(/^["']|["']$/g, '');
      continue;
    }

    // Extract description
    const descMatch = line.match(/^description:\s*(.+)/);
    if (descMatch) {
      description = descMatch[1].trim().replace(/^["']|["']$/g, '');
      continue;
    }

    // Collect keywords from triggers block
    if (inKeywords) {
      const kwMatch = line.match(/^\s*-\s*(.+)/);
      if (kwMatch) {
        const kw = kwMatch[1].trim().replace(/^["']|["']$/g, '');
        if (kw) tags.push(kw);
      }
    }

    // Collect tags from tags block
    if (inTagsArray) {
      const tagMatch = line.match(/^\s*-\s*(.+)/);
      if (tagMatch) {
        const tg = tagMatch[1].trim().replace(/^["']|["']$/g, '');
        if (tg) tags.push(tg);
      }
    }
  }

  result.name = name;
  result.description = description;
  result.tags = tags;

  return result;
}

// ──────────────────────────────────────────────
// Helpers — skill discovery
// ──────────────────────────────────────────────

/**
 * Find the path to a skill by slug across all categories.
 */
function findSkillPath(slug: string): string | null {
  const cats = listCategories();
  for (const cat of cats) {
    const candidate = path.join(AGENTS_SKILLS_DIR, cat, slug, 'SKILL.md');
    if (secureRuntime.safeExists(candidate)) return candidate;
  }
  return null;
}

/**
 * List all category directories inside agents-skills.
 */
function listCategories(): string[] {
  const cats: string[] = [];
  try {
    const entries = secureRuntime.safeReaddir(AGENTS_SKILLS_DIR);
    for (const entry of entries) {
      if (entry.isDirectory()) cats.push(entry.name);
    }
  } catch { /* agents-skills dir may not exist yet */ }
  return cats;
}

/**
 * List every skill slug + category + fullPath.
 */
function listAllSkills(): SkillEntry[] {
  const results: SkillEntry[] = [];
  try {
    for (const category of listCategories()) {
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

/**
 * Build metadata for a skill by reading only the first 5 lines of its SKILL.md.
 * Progressive disclosure: full content is loaded lazily via load_skill / skill_view.
 * Returns null if the skill cannot be read.
 */
function buildSkillMeta(entry: SkillEntry): SkillMeta | null {
  try {
    const content = secureRuntime.safeReadFile(entry.fullPath);
    const lines = content.split('\n');
    const firstLines = lines.slice(0, 5).join('\n');
    const fm = parseFrontmatter(firstLines);
    return {
      slug: entry.slug,
      category: entry.category,
      name: fm.name || entry.slug,
      description: fm.description || '',
      tags: fm.tags,
    };
  } catch {
    return null;
  }
}

/**
 * Load full SKILL.md content, truncated at 5000 chars for token efficiency.
 */
function loadSkillContent(slug: string): { content: string; source: string } | null {
  const skillPath = findSkillPath(slug);
  if (skillPath) {
    const content = secureRuntime.safeReadFile(skillPath);
    return {
      content: content.length > 5000
        ? content.substring(0, 5000) + '...\n[Truncated — use skill_view() for full content]'
        : content,
      source: skillPath,
    };
  }

  // Fallback: 9router external path (legacy)
  const nineRouterPath = process.env.NINE_ROUTER_EXTERNAL_PATH;
  if (nineRouterPath) {
    const legacyPath = path.join(nineRouterPath, 'skills', slug, `${slug}.kto.md`);
    if (secureRuntime.safeExists(legacyPath)) {
      const content = secureRuntime.safeReadFile(legacyPath);
      return {
        content: content.length > 5000
          ? content.substring(0, 5000) + '...\n[Truncated]'
          : content,
        source: legacyPath,
      };
    }
  }

  return null;
}

/**
 * Discover linked files in the skill's references/ directory.
 * Returns an array of { name, path, relativePath } for each file found.
 */
function findLinkedFiles(skillPath: string): LinkedFile[] {
  const skillDir = path.dirname(skillPath);
  const refDir = path.join(skillDir, 'references');

  if (!secureRuntime.safeExists(refDir)) return [];

  try {
    const entries = secureRuntime.safeReaddir(refDir);
    const files: LinkedFile[] = [];

    for (const entry of entries) {
      if (!entry.isFile()) continue;
      const fullPath = path.join(refDir, entry.name);
      // Compute relative path from the skill's own directory
      const relativePath = path.join('references', entry.name);
      files.push({ name: entry.name, path: fullPath, relativePath });
    }

    return files.sort((a, b) => a.name.localeCompare(b.name));
  } catch {
    return [];
  }
}

// ──────────────────────────────────────────────
// Plugin definition
// ──────────────────────────────────────────────

const plugin: ToolPlugin = {
  name: 'skills',
  tools: [
    // ── Tool 1: load_skill ──────────────────────
    // Legacy tool — kept for backward compatibility.
    // Referenced in: evolution.ts, prompt-builder.ts, privilege-guard.ts, tool-pruner.ts
    {
      name: 'load_skill',
      description: 'Lazy-load chi tiết một agent skill theo tên (slug) từ knowledge/agents-skills/ (Phiên bản cũ, giới hạn 5000 ký tự. Dùng skill_view để xem đầy đủ)',
      schema: {
        type: 'object',
        properties: {
          slug: { type: 'string', description: 'Tên skill (slug), ví dụ: common-best-practices, typescript-language' }
        },
        required: ['slug']
      },
      execute(args: Record<string, any>) {
        try {
          const slug = args.slug as string;
          const result = loadSkillContent(slug);
          if (result) {
            return { slug, source: result.source, content: result.content };
          }
          return { error: `Skill "${slug}" không tồn tại trong agents-skills hoặc 9router.` };
        } catch (err: any) {
          return { error: `Lỗi khi load skill: ${err.message}` };
        }
      }
    },

    // ── Tool 2: list_skills (REFACTORED) ─────────
    // Now returns metadata-only (Tier 1 of Progressive Disclosure).
    // No longer returns full file content or raw paths.
    {
      name: 'list_skills',
      description: 'Liệt kê tất cả agent skills — trả về metadata (name, description, tags) KHÔNG có nội dung. Dùng skill_view(slug) để xem chi tiết.',
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

          const metas: SkillMeta[] = [];
          for (const entry of skills) {
            const meta = buildSkillMeta(entry);
            if (meta) metas.push(meta);
          }

          return {
            total: metas.length,
            skills: metas,
          };
        } catch (err: any) {
          return { error: `Lỗi khi liệt kê skills: ${err.message}` };
        }
      }
    },

    // ── Tool 3: skill_view (NEW) ─────────────────
    // Tier 2-3 of Progressive Disclosure.
    // Lazy-loads full SKILL.md content + lists linked reference files.
    {
      name: 'skill_view',
      description: 'Xem đầy đủ nội dung một agent skill (lazy-load). Trả về: full content SKILL.md + danh sách linked files trong references/.',
      schema: {
        type: 'object',
        properties: {
          slug: { type: 'string', description: 'Tên skill (slug), ví dụ: common-code-review, typescript-language' },
          include_linked: { type: 'boolean', description: 'Có load nội dung linked files không? (mặc định: false — chỉ trả về danh sách)', default: false }
        },
        required: ['slug']
      },
      execute(args: Record<string, any>) {
        try {
          const slug = args.slug as string;
          const includeLinked = args.include_linked === true;
          const skillPath = findSkillPath(slug);

          if (!skillPath) {
            // Fallback: try 9router
            const nineRouterPath = process.env.NINE_ROUTER_EXTERNAL_PATH;
            if (nineRouterPath) {
              const legacyPath = path.join(nineRouterPath, 'skills', slug, `${slug}.kto.md`);
              if (secureRuntime.safeExists(legacyPath)) {
                const content = secureRuntime.safeReadFile(legacyPath);
                return {
                  slug,
                  source: legacyPath,
                  content,
                  metadata: { name: slug, description: '', tags: [] },
                  linked_files: [],
                };
              }
            }
            return { error: `Skill "${slug}" không tồn tại.` };
          }

          // Load full content (no truncation)
          const content = secureRuntime.safeReadFile(skillPath);
          const fm = parseFrontmatter(content);

          // Discover linked files
          const linkedFiles = findLinkedFiles(skillPath);

          // Optionally load linked file content
          let linkedContents: Record<string, string> | undefined;
          if (includeLinked && linkedFiles.length > 0) {
            linkedContents = {};
            for (const lf of linkedFiles) {
              try {
                const lfContent = secureRuntime.safeReadFile(lf.path);
                linkedContents[lf.name] = lfContent.length > 10000
                  ? lfContent.substring(0, 10000) + '...\n[Truncated]'
                  : lfContent;
              } catch {
                linkedContents[lf.name] = '[Error reading file]';
              }
            }
          }

          return {
            slug,
            source: skillPath,
            content,
            metadata: {
              name: fm.name || slug,
              description: fm.description || '',
              tags: fm.tags,
            },
            linked_files: linkedFiles,
            linked_contents: linkedContents,
          };
        } catch (err: any) {
          return { error: `Lỗi khi view skill: ${err.message}` };
        }
      }
    },

    // ── Tool 4: check_stale_skills ──────────────
    // Unchanged — maintenance helper.
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
