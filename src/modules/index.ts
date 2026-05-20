/**
 * @file Modules Barrel Export — Single entry point for all peripheral modules
 * @layer modules
 * @depends-on src/modules/discord/index.ts, src/modules/document/parser.ts, src/modules/knowledge/md-archiver.ts, src/modules/report/generator.ts
 * @imported-by (none yet — future: engine, scripts)
 * @owner modules
 */

// Discord Bridge
export { DiscordBridge } from './discord/index.js';

// Document Processing
export { DocumentParser } from './document/parser.js';
export { DocxParser } from './document/docx-parser.js';
export { PdfParser } from './document/pdf-parser.js';
export { FormulaExtractor } from './document/formula-extractor.js';
export { DocumentConverter } from './document/converter.js';

// Knowledge Archiving
export { MdArchiver } from './knowledge/md-archiver.js';

// Report Generation
export { ReportGenerator } from './report/generator.js';
export { StyleEngine } from './report/style-engine.js';
