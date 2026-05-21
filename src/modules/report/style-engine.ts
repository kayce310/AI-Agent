/**
 * @file style-engine — Peripheral adapter
 * @layer modules
 * @depends-on src/core/index.ts
 * @imported-by src/scripts/start-discord.ts
 * @owner modules
 */

/**
 * Kato Agent — Style Engine (Phase 3.1)
 * 
 * Định nghĩa 4 styles cho report generator:
 * - technical: Báo cáo kỹ thuật (numbered sections, formal)
 * - scientific: Báo khoa học (abstract, methods, results, references)
 * - daily: Báo cáo công việc (bullet points, concise)
 * - custom: Tự định nghĩa (YAML/JSON config)
 */

export type ReportStyle = 'technical' | 'scientific' | 'daily' | 'custom';

export interface StyleConfig {
  /** Có số thứ tự section không */
  numberedSections: boolean;
  /** Format citation: [1], [Author, year], (Nguồn: file.md) */
  citationFormat: 'numeric' | 'author-year' | 'source-path';
  /** Có abstract/executive summary không */
  includeAbstract: boolean;
  /** Có mục lục không */
  includeToc: boolean;
  /** Có references/bibliography không */
  includeReferences: boolean;
  /** Style headings (##, ###, **bold**) */
  headingStyle: 'atx' | 'setext' | 'bold';
  /** Format date trong header */
  dateFormat: 'dd/mm/yyyy' | 'yyyy-mm-dd' | 'verbal';
  /** Yêu cầu trích dẫn nguồn tài liệu */
  strictCitations: boolean;
  /** Ngôn ngữ mặc định */
  language: 'vi' | 'en';
}

export const STYLE_CONFIGS: Record<ReportStyle, StyleConfig> = {
  technical: {
    numberedSections: true,
    citationFormat: 'numeric',
    includeAbstract: false,
    includeToc: true,
    includeReferences: true,
    headingStyle: 'atx',
    dateFormat: 'dd/mm/yyyy',
    strictCitations: true,
    language: 'vi',
  },
  scientific: {
    numberedSections: true,
    citationFormat: 'author-year',
    includeAbstract: true,
    includeToc: true,
    includeReferences: true,
    headingStyle: 'atx',
    dateFormat: 'yyyy-mm-dd',
    strictCitations: true,
    language: 'en',
  },
  daily: {
    numberedSections: false,
    citationFormat: 'source-path',
    includeAbstract: false,
    includeToc: false,
    includeReferences: false,
    headingStyle: 'bold',
    dateFormat: 'verbal',
    strictCitations: false,
    language: 'vi',
  },
  custom: {
    numberedSections: false,
    citationFormat: 'numeric',
    includeAbstract: false,
    includeToc: false,
    includeReferences: false,
    headingStyle: 'atx',
    dateFormat: 'dd/mm/yyyy',
    strictCitations: false,
    language: 'vi',
  },
};

/**
 * Format citation text theo style
 */
export function formatCitation(
  source: string,
  page?: number,
  style: ReportStyle = 'technical'
): string {
  switch (STYLE_CONFIGS[style].citationFormat) {
    case 'numeric':
      return `[${source}${page ? `, tr.${page}` : ''}]`;
    case 'author-year':
      return `(${source}${page ? `, p.${page}` : ''})`;
    case 'source-path':
      return `[Nguồn: ${source}${page ? `, trang ${page}` : ''}]`;
  }
}

/**
 * Generate section heading theo style
 */
export function formatHeading(
  text: string,
  level: number,
  config: StyleConfig
): string {
  switch (config.headingStyle) {
    case 'atx':
      return `${'#'.repeat(Math.min(level, 6))} ${text}`;
    case 'bold':
      return `**${text}**`;
    case 'setext':
      return level <= 2
        ? `${text}\n${level === 1 ? '='.repeat(text.length) : '-'.repeat(text.length)}`
        : `### ${text}`;
  }
}

/**
 * Date format helper
 */
export function formatDate(date: Date, config: StyleConfig): string {
  const d = date.getDate().toString().padStart(2, '0');
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  const y = date.getFullYear();
  const months = [
    'tháng 1', 'tháng 2', 'tháng 3', 'tháng 4', 'tháng 5', 'tháng 6',
    'tháng 7', 'tháng 8', 'tháng 9', 'tháng 10', 'tháng 11', 'tháng 12',
  ];

  switch (config.dateFormat) {
    case 'dd/mm/yyyy': return `${d}/${m}/${y}`;
    case 'yyyy-mm-dd': return `${y}-${m}-${d}`;
    case 'verbal': return `${d} ${months[date.getMonth()]} năm ${y}`;
  }
}