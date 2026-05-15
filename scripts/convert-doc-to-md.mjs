/**
 * CLI: node scripts/convert-doc-to-md.mjs <filepath>
 * 
 * Convert PDF/DOCX → Markdown và lưu vào knowledge/raw-md/
 * Dùng cho conversion nhanh từ command line.
 * 
 * Pattern: temp .mjs file + execSync (ESM-safe)
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE_PATH = path.resolve(__dirname, '..');

function printUsage() {
  console.log(`
Usage: node scripts/convert-doc-to-md.mjs <filepath>
       node scripts/convert-doc-to-md.mjs --batch <directory>

Convert PDF/DOCX file to Markdown, save to knowledge/raw-md/

Options:
  --batch <dir>   Batch convert all PDF/DOCX files in directory
  --help          Show this help
`);
}

function callConverter(scriptBody) {
  const tmpDir = path.join(BASE_PATH, '.tmp-cli-' + Date.now());
  fs.mkdirSync(tmpDir, { recursive: true });
  const tmpScriptPath = path.join(tmpDir, 'exec.mjs');
  
  const fullScript = `
${scriptBody}
`;
  fs.writeFileSync(tmpScriptPath, fullScript, 'utf8');
  
  try {
    const output = execSync(`node "${tmpScriptPath}"`, {
      cwd: BASE_PATH,
      encoding: 'utf8',
      timeout: 120000,
      maxBuffer: 50 * 1024 * 1024,
      windowsHide: true
    });
    return output;
  } finally {
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
  }
}

function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === '--help') {
    printUsage();
    process.exit(0);
  }

  if (args[0] === '--batch') {
    const dir = path.resolve(BASE_PATH, args[1] || 'knowledge/raw');
    if (!fs.existsSync(dir)) {
      console.error(`Directory not found: ${dir}`);
      process.exit(1);
    }
    console.log(`\n📁 Batch converting files in: ${dir}\n`);

    // INLINE converter logic (tránh ESM Windows path issue)
    const scriptContent = `
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE_PATH = path.resolve(__dirname);
const dir = '${dir.replace(/\\/g, '/')}';

// Inline detectDocumentType
function detectDocumentType(fp) {
  const ext = path.extname(fp).toLowerCase();
  if (ext === '.pdf') return 'pdf';
  if (ext === '.docx') return 'docx';
  return 'unknown';
}

// Inline extractToMarkdown cho PDF
function extractPdfToMd(pdfPath) {
  const tmpScript = path.join(BASE_PATH, '.tmp-parser-parse.mjs');
  fs.writeFileSync(tmpScript, \`
import { PDFParse } from 'pdf-parse';
import fs from 'fs';
const buf = fs.readFileSync('\${pdfPath.replace(/\\\\\\\\/g, '/')}');
const parser = new PDFParse({ data: buf });
const textResult = await parser.getText({ first: 9999 });
const text = textResult.text || '';
process.stdout.write(JSON.stringify({ content: text }));
\`, 'utf8');
  const out = execSync('node "' + tmpScript + '"', { cwd: BASE_PATH, encoding: 'utf8', timeout: 120000, windowsHide: true });
  try { fs.unlinkSync(tmpScript); } catch {}
  const parsed = JSON.parse(out.trim());
  return parsed.content || '';
}

// Inline extractToMarkdown cho DOCX
function extractDocxToMd(docxPath) {
  const tmpScript = path.join(BASE_PATH, '.tmp-parser-docx.mjs');
  fs.writeFileSync(tmpScript, \`
import mammoth from 'mammoth';
import fs from 'fs';
const buf = fs.readFileSync('\${docxPath.replace(/\\\\\\\\/g, '/')}');
const result = await mammoth.convertToMarkdown({ buffer: buf });
process.stdout.write(JSON.stringify({ content: result.value || '' }));
\`, 'utf8');
  const out = execSync('node "' + tmpScript + '"', { cwd: BASE_PATH, encoding: 'utf8', timeout: 120000, windowsHide: true });
  try { fs.unlinkSync(tmpScript); } catch {}
  const parsed = JSON.parse(out.trim());
  return parsed.content || '';
}

// Main convert
const items = fs.readdirSync(dir, { withFileTypes: true });
const results = [];
for (const item of items) {
  if (item.isDirectory()) continue;
  const ext = path.extname(item.name).toLowerCase();
  if (ext !== '.pdf' && ext !== '.docx') continue;
  
  const fullPath = path.join(dir, item.name);
  try {
    const type = ext === '.pdf' ? 'pdf' : 'docx';
    const rawMdDir = path.join(BASE_PATH, 'knowledge/raw-md');
    if (!fs.existsSync(rawMdDir)) fs.mkdirSync(rawMdDir, { recursive: true });
    
    const baseName = path.basename(item.name, ext).replace(/[^a-zA-Z0-9_\\\\-]/g, '_');
    const mdFileName = baseName + '.md';
    const mdPath = path.join(rawMdDir, mdFileName);
    
    const content = type === 'pdf' ? extractPdfToMd(fullPath) : extractDocxToMd(fullPath);
    const mdContent = [
      '---', 'source: ' + path.relative(BASE_PATH, fullPath), 'type: ' + type,
      'converted: ' + new Date().toISOString(), 'original_name: ' + item.name, '---',
      '', '# ' + baseName, '', '> *Converted from ' + type.toUpperCase() + '*', '', content
    ].join('\\n');
    
    fs.writeFileSync(mdPath, mdContent, 'utf8');
    results.push({ success: true, file: item.name, mdPath });
  } catch (e) {
    results.push({ success: false, file: item.name, error: e.message });
  }
}
process.stdout.write(JSON.stringify(results));
`;
    
    try {
      const output = callConverter(scriptContent);
      const results = JSON.parse(output.trim());
      const success = results.filter((r) => r.success).length;
      const failed = results.filter((r) => !r.success).length;
      
      console.log(`✅ Converted: ${success} file(s)`);
      if (failed > 0) {
        console.log(`❌ Failed: ${failed} file(s):`);
        results.filter((r) => !r.success).forEach((r) => {
          console.log(`   - ${r.file}: ${r.error}`);
        });
      }
    } catch (err) {
      console.error(`❌ Batch conversion failed: ${err.message}`);
    }
    process.exit(0);
  }

  // Single file
  const filePath = path.resolve(BASE_PATH, args[0]);
  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    process.exit(1);
  }

  const ext = path.extname(filePath).toLowerCase();
  if (ext !== '.pdf' && ext !== '.docx') {
    console.error(`Unsupported file type: ${ext}. Only PDF and DOCX supported.`);
    process.exit(1);
  }

  console.log(`\n📄 Converting: ${path.basename(filePath)}...`);

  // INLINE converter logic (single file)
  const scriptContent = `
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE_PATH = path.resolve(__dirname);
const filePath = '${filePath.replace(/\\/g, '/')}';
const type = path.extname(filePath).toLowerCase() === '.pdf' ? 'pdf' : 'docx';

// Extract
function extractToMd(fp, t) {
  const tmpScript = path.join(BASE_PATH, '.tmp-parser-single.mjs');
  if (t === 'pdf') {
    fs.writeFileSync(tmpScript, \`
import { PDFParse } from 'pdf-parse';
import fs from 'fs';
const buf = fs.readFileSync('\${fp.replace(/\\\\\\\\/g, '/')}');
const parser = new PDFParse({ data: buf });
const textResult = await parser.getText({ first: 9999 });
process.stdout.write(JSON.stringify({ content: textResult.text || '' }));
\`, 'utf8');
  } else {
    fs.writeFileSync(tmpScript, \`
import mammoth from 'mammoth';
import fs from 'fs';
const buf = fs.readFileSync('\${fp.replace(/\\\\\\\\/g, '/')}');
const result = await mammoth.convertToMarkdown({ buffer: buf });
process.stdout.write(JSON.stringify({ content: result.value || '' }));
\`, 'utf8');
  }
  const out = execSync('node "' + tmpScript + '"', { cwd: BASE_PATH, encoding: 'utf8', timeout: 120000, windowsHide: true });
  try { fs.unlinkSync(tmpScript); } catch {}
  return JSON.parse(out.trim()).content || '';
}

const rawMdDir = path.join(BASE_PATH, 'knowledge/raw-md');
if (!fs.existsSync(rawMdDir)) fs.mkdirSync(rawMdDir, { recursive: true });
const baseName = path.basename(filePath, path.extname(filePath)).replace(/[^a-zA-Z0-9_\\\\-]/g, '_');
const mdFileName = baseName + '.md';
const mdPath = path.join(rawMdDir, mdFileName);
const content = extractToMd(filePath, type);
const mdContent = [
  '---', 'source: ' + path.relative(BASE_PATH, filePath), 'type: ' + type,
  'converted: ' + new Date().toISOString(), 'original_name: ' + path.basename(filePath), '---',
  '', '# ' + baseName, '', '> *Converted from ' + type.toUpperCase() + '*', '', content
].join('\\n');
fs.writeFileSync(mdPath, mdContent, 'utf8');
process.stdout.write(JSON.stringify({ fileName: mdFileName, mdPath, size: Buffer.byteLength(mdContent, 'utf8') }));
`;

  try {
    const output = callConverter(scriptContent);
    const result = JSON.parse(output.trim());
    console.log(`✅ Converted: ${result.fileName}`);
    console.log(`📁 Path: ${result.mdPath}`);
    console.log(`📏 Size: ${Math.round(result.size / 1024)} KB`);
    process.exit(0);
    } catch (err) {
      console.error(`❌ Conversion failed: ${err.message}`);
    process.exit(1);
  }
}

main();