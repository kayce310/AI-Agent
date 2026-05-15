// Direct test of read_pdf tool using the same temp script approach
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE_PATH = path.resolve(__dirname, '..');

function findPdf(dir) {
  const items = fs.readdirSync(dir, { withFileTypes: true });
  for (const item of items) {
    const fullPath = path.join(dir, item.name);
    if (item.isDirectory()) {
      const found = findPdf(fullPath);
      if (found) return found;
    }
    if (item.name.toLowerCase().endsWith('.pdf')) return fullPath;
  }
  return null;
}

const pdfPath = findPdf(path.join(BASE_PATH, 'knowledge'));
console.log(`PDF: ${pdfPath}`);
if (!pdfPath) { console.log('No PDF found'); process.exit(0); }

const maxPages = 2;
const tmpScriptPath = path.join(BASE_PATH, '.tmp-read-pdf-test.mjs');
const pdfPathJs = path.resolve(pdfPath).replace(/\\/g, '/');

const tmpScript = `
import { PDFParse } from 'pdf-parse';
import fs from 'fs';
const buf = fs.readFileSync('${pdfPathJs}');
const parser = new PDFParse({ data: buf });
const textResult = await parser.getText({ first: ${maxPages} });
let text = textResult.text || '';
const numPages = textResult.pages?.length || 0;
if (text.length > 20000) {
  text = text.substring(0, 20000) + '\\n\\n[... truncated at 20000 chars]';
}
process.stdout.write(JSON.stringify({ success: true, content: text, pageCount: numPages }));
`;

fs.writeFileSync(tmpScriptPath, tmpScript, 'utf8');
console.log('Running temp script...');

try {
  const output = execSync(`node "${tmpScriptPath}"`, {
    cwd: BASE_PATH,
    encoding: 'utf8',
    timeout: 60000,
    maxBuffer: 5 * 1024 * 1024,
    windowsHide: true
  });
  const result = JSON.parse(output.trim());
  if (result.error) {
    console.log('ERROR:', result.error);
  } else {
    console.log('SUCCESS!');
    console.log('Pages:', result.pageCount);
    console.log('Content length:', result.content.length);
    console.log('Preview:', result.content.substring(0, 300));
  }
} catch (err) {
  console.error('EXEC ERROR:', err.message);
} finally {
  try { fs.unlinkSync(tmpScriptPath); } catch {} 
  // Clean up temp files
  try { fs.unlinkSync(path.join(BASE_PATH, '.tmp-read-pdf.mjs')); } catch {}
  try { fs.unlinkSync(path.join(BASE_PATH, '.tmp-read-pdf.cjs')); } catch {}
}