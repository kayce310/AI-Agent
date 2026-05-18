/**
 * Skills Index Manager — Phase 2c: Lazy-Load & Stale Tracking
 * 
 * Quản lý index của skills từ knowledge/wiki/skills/ để hỗ trợ lazy-load
 * và phát hiện skills cũ cần review lại.
 * 
 * Tuân thủ CLINE.md Rule: Tra knowledge/wiki/index.md và chỉ tải đúng skill cần dùng.
 * 
 * API đồng bộ, gọi được từ tools.ts (executeToolCall).
 */
import fs from 'fs';
import path from 'path';

const BASE_PATH = process.cwd();
const SKILLS_DIR = path.join(BASE_PATH, 'knowledge/wiki/skills');
const INDEX_FILE = path.join(BASE_PATH, 'knowledge/wiki/skills/.skills-index.json');

export interface SkillEntry {
  name: string;
  displayName: string;
  relativePath: string;
  generatedAt: string | null;  // từ frontmatter **Generated:**
  lastModified: string;        // fs mtime fallback
  size: number;
  tags: string[];
  summary: string;
}

export interface SkillsIndex {
  updated: string;
  skills: SkillEntry[];
}

/**
 * Trích xuất **Generated:** date từ frontmatter của file .md
 */
function extractGeneratedAt(content: string): string | null {
  const match = content.match(/\*\*Generated:\*\*\s*(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : null;
}

/**
 * Trích xuất tags từ nội dung markdown
 */
function extractTags(content: string): string[] {
  const tags: string[] = [];
  const tagMatch = content.match(/tags:\s*\[([^\]]+)\]/i) || content.match(/#([a-zA-Z0-9_\-]+)/g);
  if (tagMatch) {
    if (Array.isArray(tagMatch)) {
      tagMatch.forEach(t => {
        const clean = t.replace(/^#/, '').replace(/[\[\]]/g, '').trim();
        if (clean) tags.push(clean);
      });
    }
  }
  return [...new Set(tags)];
}

/**
 * Trích summary từ nội dung
 */
function extractSummary(content: string, fallback: string): string {
  const lines = content.split('\n');
  return lines.slice(0, 5).filter(l => l.trim() && !l.startsWith('#')).join(' ').substring(0, 200) || fallback;
}

/**
 * Xây dựng index từ thư mục skills (scan thực tế)
 */
function buildIndex(): SkillsIndex {
  const skills: SkillEntry[] = [];

  if (!fs.existsSync(SKILLS_DIR)) {
    return { updated: new Date().toISOString(), skills: [] };
  }

  const items = fs.readdirSync(SKILLS_DIR, { withFileTypes: true });

  for (const item of items) {
    if (item.isDirectory()) {
      // Thư mục con chứa skill.md
      const skillDir = path.join(SKILLS_DIR, item.name);
      const subFiles = fs.readdirSync(skillDir);
      for (const sub of subFiles) {
        if (sub.endsWith('.md')) {
          const fp = path.join(skillDir, sub);
          const stat = fs.statSync(fp);
          const content = fs.readFileSync(fp, 'utf8');
          const generatedAt = extractGeneratedAt(content);
          const tags = extractTags(content);
          const summary = extractSummary(content, sub);

          skills.push({
            name: sub.replace('.md', ''),
            displayName: item.name + '/' + sub,
            relativePath: path.relative(SKILLS_DIR, fp),
            generatedAt,
            lastModified: stat.mtime.toISOString(),
            size: stat.size,
            tags,
            summary,
          });
        }
      }
    } else if (item.name.endsWith('.md') && item.name !== '.gitkeep' && !item.name.startsWith('.')) {
      // File .md trực tiếp trong skills/
      const fp = path.join(SKILLS_DIR, item.name);
      const stat = fs.statSync(fp);
      const content = fs.readFileSync(fp, 'utf8');
      const generatedAt = extractGeneratedAt(content);
      const tags = extractTags(content);
      const summary = extractSummary(content, item.name);

      skills.push({
        name: item.name.replace('.md', ''),
        displayName: item.name,
        relativePath: path.relative(SKILLS_DIR, fp),
        generatedAt,
        lastModified: stat.mtime.toISOString(),
        size: stat.size,
        tags,
        summary,
      });
    }
  }

  // Sắp xếp theo tên
  skills.sort((a, b) => a.displayName.localeCompare(b.displayName));

  return { updated: new Date().toISOString(), skills };
}

/**
 * Đọc cached index (nếu có và còn trong 30 phút)
 */
function readCachedIndex(): SkillsIndex | null {
  try {
    if (!fs.existsSync(INDEX_FILE)) return null;
    const data = JSON.parse(fs.readFileSync(INDEX_FILE, 'utf8'));
    const age = Date.now() - new Date(data.updated).getTime();
    // Cache tồn tại trong 30 phút
    if (age < 30 * 60 * 1000) {
      return data as SkillsIndex;
    }
    return null; // Cache quá cũ
  } catch {
    return null;
  }
}

/**
 * Lấy index skills (cached hoặc rebuild)
 */
export function getSkillsIndex(): SkillsIndex {
  const cached = readCachedIndex();
  if (cached) return cached;

  const index = buildIndex();
  try {
    fs.mkdirSync(path.dirname(INDEX_FILE), { recursive: true });
    fs.writeFileSync(INDEX_FILE, JSON.stringify(index, null, 2), 'utf8');
  } catch { /* ignore write errors */ }
  return index;
}

/**
 * Lazy-load nội dung của 1 skill cụ thể theo tên
 * Tìm kiếm không phân biệt hoa thường, match tên file hoặc tên thư mục
 */
export function getSkillContent(name: string): {
  skill: SkillEntry | null;
  content: string | null;
  error?: string;
} {
  const index = getSkillsIndex();
  const q = name.toLowerCase().replace(/[^a-zA-Z0-9_\-/]/g, '');

  // Tìm trong index trước (nhanh)
  let entry = index.skills.find(s => 
    s.name.toLowerCase() === q || 
    s.displayName.toLowerCase().includes(q)
  );

  if (!entry) {
    // Fallback: scan trực tiếp
    if (!fs.existsSync(SKILLS_DIR)) {
      return { skill: null, content: null, error: `Thư mục skills không tồn tại` };
    }
    const items = fs.readdirSync(SKILLS_DIR, { withFileTypes: true });
    for (const item of items) {
      if (item.isDirectory() && item.name.toLowerCase().includes(q)) {
        const possibleFiles = ['skill.md', 'README.md', `${name}.md`];
        for (const f of possibleFiles) {
          const fp = path.join(SKILLS_DIR, item.name, f);
          if (fs.existsSync(fp)) {
            const content = fs.readFileSync(fp, 'utf8');
            const stat = fs.statSync(fp);
            const generatedAt = extractGeneratedAt(content);
            entry = {
              name: f.replace('.md', ''),
              displayName: item.name + '/' + f,
              relativePath: path.relative(SKILLS_DIR, fp),
              generatedAt,
              lastModified: stat.mtime.toISOString(),
              size: stat.size,
              tags: extractTags(content),
              summary: extractSummary(content, f),
            };
            return { skill: entry, content };
          }
        }
      } else if (item.isFile() && item.name.endsWith('.md') && item.name.toLowerCase().includes(q)) {
        const fp = path.join(SKILLS_DIR, item.name);
        const content = fs.readFileSync(fp, 'utf8');
        const stat = fs.statSync(fp);
        const generatedAt = extractGeneratedAt(content);
        entry = {
          name: item.name.replace('.md', ''),
          displayName: item.name,
          relativePath: path.relative(SKILLS_DIR, fp),
          generatedAt,
          lastModified: stat.mtime.toISOString(),
          size: stat.size,
          tags: extractTags(content),
          summary: extractSummary(content, item.name),
        };
        return { skill: entry, content };
      }
    }
  } else {
    // Found in index, now load content
    const fp = path.join(SKILLS_DIR, entry.relativePath);
    if (fs.existsSync(fp)) {
      const content = fs.readFileSync(fp, 'utf8');
      return { skill: entry, content };
    }
  }

  return { skill: null, content: null, error: `Không tìm thấy skill "${name}" trong knowledge/wiki/skills/` };
}

/**
 * Tìm kiếm skills theo tên hoặc tag (lazy-load lookup)
 * Chỉ trả về metadata, không load nội dung
 */
export function searchSkills(query: string): SkillEntry[] {
  const index = getSkillsIndex();
  const q = query.toLowerCase();

  return index.skills.filter(skill => {
    if (skill.name.toLowerCase().includes(q)) return true;
    if (skill.displayName.toLowerCase().includes(q)) return true;
    if (skill.summary.toLowerCase().includes(q)) return true;
    if (skill.tags.some(t => t.toLowerCase().includes(q))) return true;
    return false;
  });
}

/**
 * Phát hiện skills stale (quá lâu không cập nhật)
 * Dùng **Generated:** frontmatter nếu có, fallback mtime
 */
export function findStaleSkills(days: number = 30): {
  stale: SkillEntry[];
  fresh: SkillEntry[];
  total: number;
} {
  const index = getSkillsIndex();
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;

  const stale = index.skills.filter(s => {
    if (s.generatedAt) {
      return new Date(s.generatedAt).getTime() < cutoff;
    }
    return new Date(s.lastModified).getTime() < cutoff;
  });

  const fresh = index.skills.filter(s => {
    if (s.generatedAt) {
      return new Date(s.generatedAt).getTime() >= cutoff;
    }
    return new Date(s.lastModified).getTime() >= cutoff;
  });

  return {
    stale,
    fresh,
    total: index.skills.length,
  };
}

/**
 * Force rebuild index (khi có skill mới được thêm)
 */
export function rebuildIndex(): SkillsIndex {
  const index = buildIndex();
  try {
    fs.mkdirSync(path.dirname(INDEX_FILE), { recursive: true });
    fs.writeFileSync(INDEX_FILE, JSON.stringify(index, null, 2), 'utf8');
  } catch { /* ignore */ }
  return index;
}

export default {
  getSkillsIndex,
  getSkillContent,
  searchSkills,
  findStaleSkills,
  rebuildIndex,
};