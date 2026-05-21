/**
 * @file Modules Barrel Export — Single entry point for all peripheral modules
 * @layer modules
 * @depends-on src/modules/discord/index.ts, src/modules/document/parser.ts, src/modules/knowledge/md-archiver.ts, src/modules/report/generator.ts
 * @imported-by (none yet — future: engine, scripts)
 * @owner modules
 */

// Discord Bridge
export { DiscordBridge } from './discord/index.js';

// Document Processing — these modules use default exports (no named class exports)
export { detectDocumentType, readDocument, extractToMarkdown, getBaseName } from './document/parser.js';
export { readDocx, extractDocxToMd, extractFormulasFromDocx } from './document/docx-parser.js';
export { readPdf, extractPdfToMd, extractFormulasFromPdf, getPdfBaseName } from './document/pdf-parser.js';
export { extractFormulas, extractFormulasFromMd, formatFormulasToMd } from './document/formula-extractor.js';
export { convertDocumentToMd, batchConvertDirectory, getConvertedSummary, listConvertedFiles } from './document/converter.js';

// Knowledge Archiving
export { archiveDocument, searchArchivedMd, quoteFromSource, listArchivedFiles } from './knowledge/md-archiver.js';

// Report Generation
export { generateReport, ReportInput, ReportOutput } from './report/generator.js';
export { formatCitation, formatHeading, formatDate, STYLE_CONFIGS, ReportStyle, StyleConfig } from './report/style-engine.js';
