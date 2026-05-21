/**
 * @file generator — Peripheral adapter
 * @layer modules
 * @depends-on src/core/index.ts
 * @imported-by src/scripts/start-discord.ts
 * @owner modules
 */

/**
 * Kato Agent — Report Generator (Phase 3.2)
 * 
 * Sinh báo cáo text từ outline + sources + style.
 * Output ready-to-copy với citations.
 */

import fs from 'fs';
import path from 'path';
import {
  ReportStyle,
  StyleConfig,
  STYLE_CONFIGS,
  formatCitation,
  formatHeading,
  formatDate,
} from './style-engine.js';

const BASE_PATH = process.cwd();

export interface ReportInput {
  outline: string;
  sources: string[];
  style: ReportStyle;
  title?: string;
  author?: string;
}

export interface ReportSection {
  title: string;
  level: number;
  content: string;
  citations: string[];
}

export interface ReportOutput {
  success: boolean;
  title: string;
  style: ReportStyle;
  markdown: string;
  sections: ReportSection[];
  totalWords: number;
  citationsUsed: string[];
  error?: string;
}

/**
 * Đọc nội dung từ raw-md sources
 */
function readSources(sources: string[]): Map<string, string> {
  const sourceMap = new Map<string, string>();
  const rawMdDir = path.join(BASE_PATH, 'knowledge/raw-md/');

  for (const src of sources) {
    // Normalize path
    let srcPath = src.replace(/\\/g, '/');
    if (!srcPath.endsWith('.md')) srcPath += '.md';
    if (!srcPath.startsWith('knowledge/raw-md/')) {
      srcPath = path.join('knowledge/raw-md/', path.basename(srcPath));
    }

    const fullPath = path.join(BASE_PATH, srcPath);
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, 'utf8');
      sourceMap.set(src, content.substring(0, 50000)); // limit 50KB/source
    } else {
      // Try wiki
      const wikiPath = path.join(BASE_PATH, 'knowledge/wiki/', path.basename(srcPath));
      if (fs.existsSync(wikiPath)) {
        const content = fs.readFileSync(wikiPath, 'utf8');
        sourceMap.set(src, content.substring(0, 50000));
      }
    }
  }
  return sourceMap;
}

/**
 * Generate report header (title, author, date, style)
 */
function generateHeader(input: ReportInput, config: StyleConfig): string {
  const lines: string[] = [];
  const now = new Date();

  if (input.title) {
    lines.push(`# ${input.title}`);
    lines.push('');
  }

  lines.push(`**Style**: ${input.style}`);
  lines.push(`**Ngày**: ${formatDate(now, config)}`);
  if (input.author) lines.push(`**Tác giả**: ${input.author}`);
  if (input.sources.length > 0) {
    lines.push(`**Nguồn tham khảo**: ${input.sources.length} tài liệu`);
  }
  lines.push('');
  lines.push('---');
  lines.push('');
  return lines.join('\n');
}

/**
 * Generate table of contents (nếu style yêu cầu)
 */
function generateToc(sections: ReportSection[], config: StyleConfig): string {
  if (!config.includeToc) return '';

  const lines: string[] = ['## Mục lục', ''];
  for (const section of sections) {
    const indent = '  '.repeat(Math.max(0, section.level - 2));
    const num = config.numberedSections ? `${sections.indexOf(section) + 1}. ` : '';
    lines.push(`${indent}- ${num}${section.title}`);
  }
  lines.push('');
  lines.push('---');
  lines.push('');
  return lines.join('\n');
}

/**
 * Generate report markdown từ outline + sources
 * Outline được LLM sinh, generator chỉ format + thêm citations
 */
export function generateReport(input: ReportInput): ReportOutput {
  try {
    const config = STYLE_CONFIGS[input.style];
    const sourceMap = readSources(input.sources);

    // Parse outline thành sections
    const outlineLines = input.outline.split('\n').filter(l => l.trim());
    const sections: ReportSection[] = [];
    let currentSection: ReportSection | null = null;

    for (const line of outlineLines) {
      // Detect heading (#, ##, ###, **bold** heading)
      const headingMatch = line.match(/^(#{1,6})\s+(.+)/);
      const boldHeadingMatch = line.match(/^\*\*(.+?)\*\*/);
      const bulletMatch = line.match(/^[-*]\s+(.+)/);
      const numberedMatch = line.match(/^\d+[.)]\s+(.+)/);

      if (headingMatch) {
        // Save previous section
        if (currentSection) sections.push(currentSection);

        const level = headingMatch[1].length;
        const title = headingMatch[2].trim();
        currentSection = {
          title,
          level,
          content: '',
          citations: [],
        };
      } else if (currentSection) {
        // Check for citation markers [source:path/to/file.md]
        const citationMatch = line.match(/\[Nguồn:\s*([^\]]+\.md)\]/gi);
        if (citationMatch) {
          for (const cit of citationMatch) {
            const src = cit.replace(/\[Nguồn:\s*|\]/g, '').trim();
            if (!currentSection.citations.includes(src)) {
              currentSection.citations.push(src);
            }
          }
        }

        // Format content
        let formattedLine = line;
        if (boldHeadingMatch && currentSection.content === '') {
          // First line after heading could be bold heading alternative
          formattedLine = `### ${boldHeadingMatch[1]}`;
        }

        currentSection.content += formattedLine + '\n';
      }
    }
    if (currentSection) sections.push(currentSection);

    // Build markdown
    const mdParts: string[] = [];

    // Header
    mdParts.push(generateHeader(input, config));

    // Abstract (if scientific)
    if (config.includeAbstract) {
      mdParts.push('## Tóm tắt (Abstract)');
      mdParts.push('');
      mdParts.push('_Abstract sẽ được LLM điền vào dựa trên outline và sources._');
      mdParts.push('');
      mdParts.push('---');
      mdParts.push('');
    }

    // Table of Contents
    const toc = generateToc(sections, config);
    if (toc) mdParts.push(toc);

    // Body
    for (let i = 0; i < sections.length; i++) {
      const section = sections[i];
      const heading = formatHeading(section.title, section.level, config);
      mdParts.push(heading);
      mdParts.push('');

      // Thêm citations nếu strict
      if (config.strictCitations && section.citations.length > 0) {
        const citText = section.citations
          .map(c => formatCitation(c, undefined, input.style))
          .join(', ');
        // Inject citation vào đầu section content
        mdParts.push(`*Nguồn: ${citText}*`);
        mdParts.push('');
      }

      mdParts.push(section.content.trim());
      mdParts.push('');
    }

    // References (if style yêu cầu)
    if (config.includeReferences && sourceMap.size > 0) {
      mdParts.push('---');
      mdParts.push('');
      mdParts.push('## Tài liệu tham khảo');
      mdParts.push('');
      let refIndex = 1;
      for (const [src] of sourceMap) {
        const link = src.endsWith('.md') ? src : `${src}.md`;
        if (config.citationFormat === 'numeric') {
          mdParts.push(`[${refIndex}] \`${link}\``);
        } else if (config.citationFormat === 'source-path') {
          mdParts.push(`- Nguồn: \`${link}\``);
        } else {
          mdParts.push(`- ${src}`);
        }
        refIndex++;
      }
    }

    const markdown = mdParts.join('\n');
    const allCitations = [...new Set(sections.flatMap(s => s.citations))];

    return {
      success: true,
      title: input.title || 'Báo cáo',
      style: input.style,
      markdown,
      sections,
      totalWords: markdown.split(/\s+/).length,
      citationsUsed: allCitations,
    };
  } catch (err: any) {
    return {
      success: false,
      title: 'Error',
      style: input.style,
      markdown: '',
      sections: [],
      totalWords: 0,
      citationsUsed: [],
      error: err.message,
    };
  }
}