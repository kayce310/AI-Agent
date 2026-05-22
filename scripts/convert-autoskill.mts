#!/usr/bin/env node
// @ts-nocheck — Runtime script, not compiled TS module

/**
 * Autoskills → Kato Wiki Converter
 *
 * Chuyển đổi skills từ knowledge/references/autoskills sang format Kato wiki
 * tại knowledge/wiki/skills/ với CLI arguments để tái sử dụng.
 *
 * Usage:
 *   node scripts/convert-autoskill.mts <skill-name>          # Convert 1 skill
 *   node scripts/convert-autoskill.mts --list                # Liệt kê skills có sẵn
 *   node scripts/convert-autoskill.mts --list --filter=next  # Lọc theo tên
 *   node scripts/convert-autoskill.mts --dry-run typescript-advanced-types  # Xem trước
 *   node scripts/convert-autoskill.mts --force shadcn        # Ghi đè nếu tồn tại
 *   node scripts/convert-autoskill.mts --batch P0            # Convert batch theo priority
 *
 * Yêu cầu: Node.js 18+
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ── Paths ─────────────────────────────────────────────────────────────────────
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE = path.resolve(__dirname, '..');
const AUTOSKILLS_DIR = path.join(
  BASE,
  'knowledge/references/autoskills/packages/autoskills/skills-registry',
);
const INDEX_JSON = path.join(AUTOSKILLS_DIR, 'index.json');
const WIKI_SKILLS_DIR = path.join(BASE, 'knowledge/wiki/skills');
const WIKI_INDEX = path.join(WIKI_SKILLS_DIR, '_INDEX.md');

// ── Config ────────────────────────────────────────────────────────────────────
const MAX_STALE_DAYS = 90;
const PRIORITY_MAP = {
  P0: [
    'typescript-advanced-types',
    'shadcn',
    'next-best-practices',
    'accessibility',
    'agents-sdk',
  ],
  P1: [
    'tailwind-css-patterns',
    'react-best-practices',
    'nodejs-best-practices',
    'vitest',
    'vue-best-practices',
  ],
  P2: [
    'astro',
    'angular-developer',
    'svelte5-best-practices',
    'turborepo',
  ],
};

// ── Utilities ─────────────────────────────────────────────────────────────────

function log(...args) {
  console.log(...args);
}

function warn(...args) {
  console.warn('⚠️ ', ...args);
}

function error(...args) {
  console.error('❌ ', ...args);
}

function ok(msg) {
  console.log('✅', msg);
}

function info(msg) {
  console.log('ℹ️ ', msg);
}

/**
 * Parse YAML frontmatter từ nội dung SKILL.md
 */
function parseFrontmatter(content) {
  // Handle both \n (Unix) and \r\n (Windows) line endings
  const normalized = content.replace(/\r\n/g, '\n');
  const match = normalized.match(/^---\n([\s\S]+?)\n---\n?/);
  if (!match) return { frontmatter: {}, body: content };

  const raw = match[1];
  const frontmatter = {};
  let currentKey = null;

  for (const line of raw.split('\n')) {
    const kvMatch = line.match(/^(\w[\w-]*):\s*(.*)/);
    if (kvMatch) {
      currentKey = kvMatch[1];
      let value = kvMatch[2].trim();
      // Xử lý multiline (YAML block scalar) — basic
      if (value === '|' || value === '|-') {
        frontmatter[currentKey] = { _block: true, _lines: [] };
      } else {
        frontmatter[currentKey] = value;
      }
    } else if (currentKey && frontmatter[currentKey]?._block) {
      const trimmed = line.trimEnd();
      if (trimmed === '' || trimmed.startsWith('#')) continue;
      frontmatter[currentKey]._lines.push(trimmed);
    } else if (line.startsWith('  ')) {
      // Indented continuation — skip basic
    }
  }

  // Flatten block scalars
  for (const key of Object.keys(frontmatter)) {
    if (frontmatter[key]?._block) {
      frontmatter[key] = frontmatter[key]._lines.join('\n');
    }
  }

  const body = normalized.slice(match[0].length);
  return { frontmatter, body };
}

/**
 * Lấy review info từ index.json cho skill
 */
function getSkillMeta(skillName) {
  try {
    const idx = JSON.parse(fs.readFileSync(INDEX_JSON, 'utf8'));
    const entry = idx.skills?.[skillName];
    if (!entry) return null;

    // Tính stale date
    const generatedAt = new Date(idx.generatedAt || 0);
    const now = new Date();
    const daysOld = Math.floor((now - generatedAt) / (1000 * 60 * 60 * 24));
    const isStale = daysOld > MAX_STALE_DAYS;

    return {
      source: entry.source || 'unknown',
      skillPath: entry.skillPath || '',
      commitSha: entry.commitSha || '',
      files: entry.files || ['SKILL.md'],
      review: entry.review || { status: 'unreviewed', flags: [], summary: '' },
      generatedAt: idx.generatedAt || '',
      daysOld,
      isStale,
      bundleHash: entry.bundleHash || '',
    };
  } catch {
    return null;
  }
}

/**
 * Danh sách skill có sẵn (từ thư mục, filter theo tên)
 */
function listAvailableSkills(filterStr) {
  const dirs = fs
    .readdirSync(AUTOSKILLS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !d.name.startsWith('.'))
    .map((d) => d.name);

  if (filterStr) {
    return dirs.filter((name) => name.toLowerCase().includes(filterStr.toLowerCase()));
  }
  return dirs.sort();
}

/**
 * Lấy tất cả sub-files của skill (ngoài SKILL.md)
 */
function getSubFiles(skillDir) {
  const files = [];
  const fullDir = path.join(AUTOSKILLS_DIR, skillDir);
  if (!fs.existsSync(fullDir)) return files;

  const entries = fs.readdirSync(fullDir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isFile() && entry.name !== 'SKILL.md') {
      files.push(entry.name);
    }
  }
  return files.sort();
}

// ── Conversion Logic ─────────────────────────────────────────────────────────

/**
 * Convert SKILL.md body → Kato wiki format
 */
function convertBody(skillName, body, meta) {
  const lines = body.split('\n');
  const output = [];

  // Xử lý title (h1 đầu tiên)
  let titleLine = lines.find((l) => l.startsWith('# '));
  const title = titleLine ? titleLine.replace(/^# /, '').trim() : skillName;

  // 🎯 Mục tiêu (từ description)
  output.push(`# ${title}`);
  output.push('');

  // Source attribution header
  output.push(`> **Nguồn:** [${meta?.source || 'autoskills'}](${meta?.skillPath || ''})`);
  if (meta?.commitSha) {
    output.push(`> **Commit:** \`${meta.commitSha.slice(0, 7)}\``);
  }
  if (meta?.generatedAt) {
    const date = new Date(meta.generatedAt).toISOString().slice(0, 10);
    output.push(`> **Generated:** ${date}`);
  }
  output.push('');

  // Stale warning
  if (meta?.isStale) {
    output.push(`> ⏳ **STALE**: Skill này đã ${meta.daysOld} ngày tuổi. Có thể đã lỗi thời.`);
    output.push('');
  }

  // Review status
  if (meta?.review?.status) {
    const statusIcon =
      meta.review.status === 'approved'
        ? '✅'
        : meta.review.status === 'flagged'
          ? '🚫'
          : '⚠️';
    output.push(`> **Review:** ${statusIcon} ${meta.review.status}`);
    if (meta.review.flags?.length > 0) {
      output.push(`> **Flags:** ${meta.review.flags.join(', ')}`);
    }
    output.push('');
  }

  // ⚡ Quy tắc / Nội dung
  output.push('---');
  output.push('');

  // Body content — giữ nguyên, chỉ wrap heading levels
  for (const line of lines) {
    // Bỏ qua title gốc
    if (line.startsWith('# ')) continue;
    // Bỏ qua frontmatter
    if (line.startsWith('---')) continue;

    // Nâng heading level: ## → ###, ### → ####, etc.
    if (line.startsWith('## ')) {
      output.push(`### ${line.slice(3)}`);
    } else if (line.startsWith('### ')) {
      output.push(`#### ${line.slice(4)}`);
    } else {
      output.push(line);
    }
  }

  // Footer
  output.push('');
  output.push('---');
  output.push('');
  output.push(
    `*Converted from autoskills — source: ${meta?.skillPath || skillName} @ ${meta?.commitSha?.slice(0, 7) || 'unknown'}*`,
  );

  return { title, body: output.join('\n') };
}

/**
 * Ghi skill vào knowledge/wiki/skills/
 */
function writeSkill(skillName, title, body, meta, options) {
  const fileName = `${skillName}.md`;
  const filePath = path.join(WIKI_SKILLS_DIR, fileName);

  if (fs.existsSync(filePath) && !options.force) {
    warn(`"${fileName}" đã tồn tại. Dùng --force để ghi đè.`);
    return { skipped: true, filePath };
  }

  if (options.dryRun) {
    info(`[DRY-RUN] Sẽ ghi: ${filePath}`);
    return { skipped: false, dryRun: true, filePath };
  }

  fs.mkdirSync(WIKI_SKILLS_DIR, { recursive: true });
  fs.writeFileSync(filePath, body, 'utf8');
  ok(`Đã ghi: ${fileName}`);
  return { skipped: false, filePath };
}

/**
 * Xử lý sub-files (references) của skill
 */
function writeSubFiles(skillName, subFiles, meta, options) {
  const refDir = path.join(WIKI_SKILLS_DIR, `${skillName}-ref`);
  const written = [];

  if (subFiles.length === 0) return written;

  for (const subFile of subFiles) {
    const srcPath = path.join(AUTOSKILLS_DIR, skillName, subFile);
    const ext = path.extname(subFile);
    let content;

    try {
      content = fs.readFileSync(srcPath, 'utf8');
    } catch {
      warn(`Không đọc được sub-file: ${subFile}`);
      continue;
    }

    // Chỉ xử lý markdown files
    if (ext !== '.md') continue;

    // Convert name
    const refName = subFile.replace(/\.md$/, '');
    const targetName = `${skillName}-ref-${refName}.md`;
    const targetPath = path.join(refDir, targetName);

    // Thêm attribution header
    let newContent = `# ${refName}\n\n`;
    newContent += `> Sub-skill của [[${skillName}]]\n`;
    newContent += `> Nguồn: ${meta?.skillPath || skillName}\n\n`;
    newContent += content;

    if (options.dryRun) {
      info(`[DRY-RUN] Sẽ ghi ref: ${targetName}`);
      written.push({ refName, filePath: targetPath, dryRun: true });
      continue;
    }

    fs.mkdirSync(refDir, { recursive: true });
    fs.writeFileSync(targetPath, newContent, 'utf8');
    ok(`  └─ Đã ghi ref: ${targetName}`);
    written.push({ refName, filePath: targetPath });
  }

  return written;
}

/**
 * Cập nhật _INDEX.md với entry mới
 */
function updateIndex(skillName, title, description, meta) {
  const indexPath = WIKI_INDEX;
  let indexContent = '';

  try {
    indexContent = fs.readFileSync(indexPath, 'utf8');
  } catch {
    warn('Không tìm thấy _INDEX.md. Bỏ qua cập nhật index.');
    return;
  }

  // Kiểm tra nếu đã tồn tại
  if (indexContent.includes(`[[${skillName}]]`)) {
    info(`"${skillName}" đã có trong _INDEX.md. Bỏ qua.`);
    return;
  }

  // Tìm section để thêm
  // Strategy: thêm vào section cuối cùng hoặc tạo section mới
  const category = inferCategory(skillName, description);
  const sectionHeader = `### ${category}`;
  const tableRow = `| [[${skillName}]] | ${description || title} | trigger:${skillName} |`;

  // Tìm vị trí chèn — thêm sau section header cuối cùng hoặc cuối file
  const lines = indexContent.split('\n');
  const sectionIdx = lines.findIndex(
    (l) => l.trim() === sectionHeader || (l.startsWith('###') && category === inferCategoryFromLine(l)),
  );

  let newLines;
  if (sectionIdx >= 0) {
    // Tìm dòng cuối của section
    let insertAt = sectionIdx + 1;
    while (insertAt < lines.length && !lines[insertAt].startsWith('###')) {
      insertAt++;
    }
    // Thêm trước dòng bắt đầu section mới
    newLines = [...lines.slice(0, insertAt), tableRow, ...lines.slice(insertAt)];
  } else {
    // Tìm position của section "## 📚 Danh mục Kỹ năng"
    const catalogIdx = lines.findIndex((l) => l.includes('Danh mục Kỹ năng'));
    if (catalogIdx >= 0) {
      newLines = [
        ...lines.slice(0, catalogIdx + 1),
        '',
        sectionHeader,
        '',
        '| Skill | Mô tả | Trigger |',
        '|-------|-------|---------|',
        `| [[${skillName}]] | ${(description || title).slice(0, 80)} | khi cần "${skillName}" |`,
        '',
        ...lines.slice(catalogIdx + 1),
      ];
    } else {
      newLines = [...lines, '', sectionHeader, '', tableRow];
    }
  }

  fs.writeFileSync(indexPath, newLines.join('\n'), 'utf8');
  ok(`Đã cập nhật _INDEX.md với entry "${skillName}"`);
}

/**
 * Suy luận category cho skill
 */
function inferCategory(skillName, description) {
  const desc = (description || '').toLowerCase();
  const name = skillName.toLowerCase();

  // Backend / Core
  if (
    name.includes('nodejs') ||
    name.includes('nestjs') ||
    name.includes('django') ||
    name.includes('fastapi') ||
    name.includes('golang') ||
    name.includes('rust') ||
    name.includes('dotnet') ||
    name.includes('python') ||
    name.includes('sql') ||
    name.includes('prisma') ||
    name.includes('redis') ||
    name.includes('postgres') ||
    name.includes('stripe')
  )
    return '🖥️ Backend & Database';

  // Frontend / UI
  if (
    name.includes('react') ||
    name.includes('vue') ||
    name.includes('svelte') ||
    name.includes('angular') ||
    name.includes('tailwind') ||
    name.includes('shadcn') ||
    name.includes('next') ||
    name.includes('nuxt') ||
    name.includes('astro') ||
    name.includes('tanstack') ||
    name.includes('threejs') ||
    name.includes('gsap') ||
    name.includes('ui')
  )
    return '🎨 Frontend & UI';

  // DevOps & Cloud
  if (
    name.includes('deploy') ||
    name.includes('docker') ||
    name.includes('cloudflare') ||
    name.includes('azure') ||
    name.includes('aws') ||
    name.includes('terraform') ||
    name.includes('docker') ||
    name.includes('ci') ||
    name.includes('cd')
  )
    return '🚀 DevOps & Cloud';

  // Testing
  if (
    name.includes('test') ||
    name.includes('vitest') ||
    name.includes('playwright') ||
    name.includes('jest') ||
    name.includes('tdd') ||
    name.includes('rspec')
  )
    return '🧪 Testing';

  // Mobile
  if (
    name.includes('flutter') ||
    name.includes('android') ||
    name.includes('ios') ||
    name.includes('swift') ||
    name.includes('kotlin') ||
    name.includes('expo') ||
    name.includes('react-native')
  )
    return '📱 Mobile';

  // AI / ML
  if (
    name.includes('ai') ||
    name.includes('ml') ||
    name.includes('agent') ||
    name.includes('machine-learning') ||
    name.includes('llm') ||
    name.includes('sdk')
  )
    return '🤖 AI & Agents';

  // Security
  if (name.includes('security') || name.includes('auth') || name.includes('clerk'))
    return '🔒 Security & Auth';

  return '🧰 Tools & Libraries';
}

function inferCategoryFromLine(line) {
  return line.replace(/^###\s*/, '').trim();
}

// ── Main ──────────────────────────────────────────────────────────────────────

function printHelp() {
  console.log(`
📦 Autoskills → Kato Wiki Converter

Usage:
  node scripts/convert-autoskill.mts <skill-name>              Convert 1 skill
  node scripts/convert-autoskill.mts --list                    List all available
  node scripts/convert-autoskill.mts --list --filter=<str>     Filter list
  node scripts/convert-autoskill.mts --dry-run <skill>         Preview only
  node scripts/convert-autoskill.mts --force <skill>           Overwrite existing
  node scripts/convert-autoskill.mts --batch P0                Convert priority batch
  node scripts/convert-autoskill.mts --help                    This help

Priorities:
${Object.entries(PRIORITY_MAP)
  .map(([p, skills]) => `  ${p}: ${skills.join(', ')}`)
  .join('\n')}

Examples:
  node scripts/convert-autoskill.mts typescript-advanced-types
  node scripts/convert-autoskill.mts --dry-run shadcn
  node scripts/convert-autoskill.mts --force --batch P0
  node scripts/convert-autoskill.mts --list --filter=clerk
  `);
}

async function main() {
  const args = process.argv.slice(2);

  // Parse flags
  const flags = {
    list: args.includes('--list'),
    all: args.includes('--all'),
    dryRun: args.includes('--dry-run'),
    force: args.includes('--force'),
    help: args.includes('--help'),
    batch: null,
    filter: null,
  };

  const filterIdx = args.findIndex((a) => a.startsWith('--filter='));
  if (filterIdx >= 0) flags.filter = args[filterIdx].split('=')[1];

  const batchIdx = args.findIndex((a) => a.startsWith('--batch='));
  if (batchIdx >= 0) {
    flags.batch = args[batchIdx].split('=')[1].toUpperCase();
  } else if (args.includes('--batch')) {
    const bi = args.indexOf('--batch');
    if (bi + 1 < args.length && !args[bi + 1].startsWith('--')) {
      flags.batch = args[bi + 1].toUpperCase();
    }
  }

  // Non-flag positional args
  const positional = args.filter((a) => !a.startsWith('--'));

  if (flags.help) {
    printHelp();
    process.exit(0);
  }

  // ── List mode ───────────────────────────────────────────────────────────
  if (flags.list) {
    const skills = listAvailableSkills(flags.filter);
    info(`Tổng cộng ${skills.length} skills có sẵn trong autoskills registry.`);

    // Chia theo category
    const groups = {};
    for (const s of skills) {
      const cat = inferCategory(s, '');
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(s);
    }

    for (const [cat, items] of Object.entries(groups).sort()) {
      console.log(`\n${cat}:`);
      for (const item of items) {
        const meta = getSkillMeta(item);
        const status = meta?.review?.status === 'flagged' ? ' 🚫' : '';
        const stale = meta?.isStale ? ' ⏳' : '';
        console.log(`  • ${item}${status}${stale}`);
      }
    }
    console.log('');
    process.exit(0);
  }

  // ── Determine skills to convert ─────────────────────────────────────────
  let skillsToConvert = [];

  if (flags.all) {
    skillsToConvert = listAvailableSkills(null);
    info(`--all: sẽ convert ${skillsToConvert.length} skills (bỏ qua flagged trừ khi --force)`);
  } else if (flags.batch) {
    if (!PRIORITY_MAP[flags.batch]) {
      error(`Priority "${flags.batch}" không hợp lệ. Chọn: ${Object.keys(PRIORITY_MAP).join(', ')}`);
      process.exit(1);
    }
    skillsToConvert = PRIORITY_MAP[flags.batch];
    info(`Batch ${flags.batch}: sẽ convert ${skillsToConvert.length} skills`);
  } else if (positional.length > 0) {
    skillsToConvert = positional;
  } else {
    error('Thiếu tên skill. Dùng --help để xem hướng dẫn.');
    process.exit(1);
  }

  // ── Convert ─────────────────────────────────────────────────────────────
  let converted = 0;
  const opts = { force: flags.force, dryRun: flags.dryRun };

  for (const skillName of skillsToConvert) {
    const skillDir = path.join(AUTOSKILLS_DIR, skillName);
    if (!fs.existsSync(skillDir)) {
      warn(`Skill "${skillName}" không tồn tại. Bỏ qua.`);
      continue;
    }

    // Đọc SKILL.md
    const skillPath = path.join(skillDir, 'SKILL.md');
    if (!fs.existsSync(skillPath)) {
      warn(`Skill "${skillName}" không có SKILL.md. Bỏ qua.`);
      continue;
    }

    const content = fs.readFileSync(skillPath, 'utf8');
    const { frontmatter, body } = parseFrontmatter(content);
    const description = frontmatter.description || '';
    const meta = getSkillMeta(skillName);

    // Check security
    if (meta?.review?.status === 'flagged') {
      warn(
        `🚫 "${skillName}" bị flagged! Lý do: ${meta.review.summary || 'không rõ'}. Bỏ qua. Dùng --force để ép.`,
      );
      if (!flags.force) continue;
    }

    // Convert body
    const { title, body: convertedBody } = convertBody(skillName, body, meta);

    // Ghi file
    const result = writeSkill(skillName, title, convertedBody, meta, opts);
    if (result.skipped || result.dryRun) {
      if (result.dryRun) {
        info(`[DRY-RUN] Sẽ ghi: ${result.filePath}`);
        console.log('─'.repeat(40));
        console.log(convertedBody.slice(0, 500) + '\n...\n');
        console.log('─'.repeat(40));
      }
      continue;
    }

    // Xử lý sub-files
    const subFiles = getSubFiles(skillName);
    if (subFiles.length > 0) {
      const refs = writeSubFiles(skillName, subFiles, meta, opts);
      if (refs.length > 0) {
        info(`  └─ Sub-skill references: ${refs.length} files`);
      }
    }

    // Cập nhật _INDEX.md (không chạy dry-run)
    if (!opts.dryRun) {
      updateIndex(skillName, title, description, meta);
    }

    converted++;
  }

  // ── Summary ─────────────────────────────────────────────────────────────
  if (opts.dryRun) {
    info(`\n[DRY-RUN] Kết thúc. ${converted}/${skillsToConvert.length} skills sẽ được convert.`);
  } else {
    ok(`\nHoàn tất! ${converted}/${skillsToConvert.length} skills đã được convert.`);

    if (converted > 0) {
      console.log('');
      console.log('📂 Output:');
      console.log(`  knowledge/wiki/skills/  — File skill chính`);
      console.log(`  knowledge/wiki/skills/*-ref/  — Sub-skill references`);

      console.log('');
      info('Để xem danh sách skills có sẵn: node scripts/convert-autoskill.mts --list');
      info('Để convert skill khác: node scripts/convert-autoskill.mts <skill-name>');
    }
  }
}

main().catch((err) => {
  error('Fatal:', err.message);
  process.exit(1);
});