import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE_PATH = path.resolve(__dirname, '..');

const pdfPath = path.resolve(BASE_PATH, 'knowledge/blueprints/Tai-lieu-he-thong-AI-Agent.pdf').replace(/\\/g, '/');
const tmpScriptPath = path.join(BASE_PATH, '.tmp-extract-full-pdf.mjs');

const tmpScript = `
import { PDFParse } from 'pdf-parse';
import fs from 'fs';
const buf = fs.readFileSync('${pdfPath}');
const parser = new PDFParse({ data: buf });
const textResult = await parser.getText({ first: 100 });
let text = textResult.text || '';
const numPages = textResult.pages?.length || 0;
process.stdout.write(JSON.stringify({ success: true, content: text, pageCount: numPages }));
`;

fs.writeFileSync(tmpScriptPath, tmpScript, 'utf8');
try {
  const output = execSync(`node "${tmpScriptPath}"`, {
    cwd: BASE_PATH,
    encoding: 'utf8',
    timeout: 120000,
    maxBuffer: 10 * 1024 * 1024,
    windowsHide: true
  });
  const result = JSON.parse(output.trim());
  if (result.success) {
    console.log('PAGES:', result.pageCount);
    console.log('CONTENT_LEN:', result.content.length);
    console.log('---CONTENT_START---');
    console.log(result.content);
    console.log('---CONTENT_END---');
  } else {
    console.log('ERROR:', result.error);
  }
} catch (err) {
  console.error('EXEC ERROR:', err.message);
} finally {
  try { fs.unlinkSync(tmpScriptPath); } catch {} 
}