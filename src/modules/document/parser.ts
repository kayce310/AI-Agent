/**
 * @file parser — Peripheral adapter
 * @layer modules
 * @depends-on src/core/index.ts
 * @imported-by src/scripts/start-discord.ts
 * @owner modules
 */

/**
 * Document Parser Factory
 * Auto-detect file type (PDF/DOCX) và gọi parser tương ứng
 * Platform-agnostic, dùng chung cho tất cả module (Discord, CLI, Telegram)
 */

import path from 'path';
import { readPdf, extractPdfToMd, extractFormulasFromPdf, getPdfBaseName } from './pdf-parser.js';
import { readDocx, extractDocxToMd, extractFormulasFromDocx } from './docx-parser.js';

export type DocumentType = 'pdf' | 'docx' | 'unknown';

export interface ParseResult {
  content: string;
  type: DocumentType;
  fileName: string;
  pageCount?: number;
  formulas?: string[];
}

/**
 * Phát hiện loại tài liệu dựa vào extension
 */
export function detectDocumentType(filePath: string): DocumentType {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case '.pdf':
      return 'pdf';
    case '.docx':
      return 'docx';
    default:
      return 'unknown';
  }
}

/**
 * Đọc nhanh tài liệu (có giới hạn pages/ký tự)
 */
export function readDocument(filePath: string, maxPages: number = 10, maxChars: number = 20000): ParseResult {
  const type = detectDocumentType(filePath);
  const fileName = path.basename(filePath);
  const baseName = path.basename(filePath, path.extname(filePath));

  switch (type) {
    case 'pdf': {
      const { readPdfWithPages } = require('./pdf-parser.js');
      const result = readPdfWithPages(filePath, maxPages);
      const formulas = extractFormulasFromPdf(result.content);
      const content = result.content.length > maxChars
        ? result.content.substring(0, maxChars) + `\n\n[... truncated at ${maxChars} chars]`
        : result.content;

      return {
        content,
        type,
        fileName,
        pageCount: result.pageCount,
        formulas: formulas.length > 0 ? formulas : undefined
      };
    }

    case 'docx': {
      const content = readDocx(filePath, maxChars);
      const formulas = extractFormulasFromDocx(filePath);

      return {
        content,
        type,
        fileName,
        formulas: formulas.length > 0 ? formulas : undefined
      };
    }

    default:
      throw new Error(`Unsupported document type: ${extname(filePath)}`);
  }
}

/**
 * Parse full tài liệu → markdown (không giới hạn)
 * Dùng cho archive/convert
 */
export function extractToMarkdown(filePath: string): { content: string; type: DocumentType } {
  const type = detectDocumentType(filePath);

  switch (type) {
    case 'pdf': {
      const content = extractPdfToMd(filePath);
      return { content, type };
    }

    case 'docx': {
      const content = extractDocxToMd(filePath);
      return { content, type };
    }

    default:
      throw new Error(`Unsupported document type: ${path.extname(filePath)}`);
  }
}

/**
 * Lấy tên file gốc (không extension)
 */
export function getBaseName(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.pdf') return getPdfBaseName(filePath);
  return path.basename(filePath, ext);
}

// Helper
function extname(filePath: string): string {
  return path.extname(filePath).toLowerCase();
}

export default {
  detectDocumentType,
  readDocument,
  extractToMarkdown,
  getBaseName
};