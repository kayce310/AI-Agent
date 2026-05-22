/**
 * Direct batch converter - no import of ESM modules.
 * Run: node scripts/batch-convert.mjs
 * Scans knowledge/blueprints for PDF/DOCX and saves to knowledge/raw-md/
 */
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE = path.resolve(__dirname, '..');
const RAW = path.join(BASE, 'knowledge/raw-md');
const DIR = path.join(BASE, 'knowledge/blueprints');

if (!fs.existsSync(RAW)) fs.mkdirSync(RAW, { recursive: true });

const items = fs.readdirSync(DIR, { withFileTypes: true });
let ok = 0, fail = 0;

for (const item of items) {
  if (item.isDirectory()) continue;
  const ext = path.extname(item.name).toLowerCase();
  if (ext !== '.pdf' && ext !== '.docx') continue;

  const fp = path.join(DIR, item.name);
  const baseName = path.basename(item.name, ext).replace(/[^a-zA-Z0-9_\-]/g, '_');
  const mdPath = path.join(RAW, baseName + '.md');
  const fpNorm = fp.replace(/\\/g, '/');

  try {
    console.log(`Processing ${item.name}...`);

    if (ext === '.pdf') {
      const tmp = path.join(BASE, '.tmp-batch-pdf.mjs');
      fs.writeFileSync(tmp, `import { PDFParse } from 'pdf-parse';
import fs from 'fs';
const buf = fs.readFileSync('${fpNorm}');
const p = new PDFParse({ data: buf });
const r = await p.getText({ first: 9999 });
process.stdout.write(JSON.stringify({ c: r.text || '' }));`, 'utf8');
      const out = execSync(`node "${tmp}"`, { cwd: BASE, encoding: 'utf8', timeout: 120000, windowsHide: true });
      try { fs.unlinkSync(tmp); } catch {}
      const content = JSON.parse(out.trim()).c || '';
      const md = `---\nsource: knowledge/blueprints/${item.name}\ntype: pdf\nconverted: ${new Date().toISOString()}\n---\n\n# ${baseName}\n\n${content}`;
      fs.writeFileSync(mdPath, md, 'utf8');
    } else {
      const tmp = path.join(BASE, '.tmp-batch-docx.mjs');
      fs.writeFileSync(tmp, `import mammoth from 'mammoth';
import fs from 'fs';
const buf = fs.readFileSync('${fpNorm}');
const r = await mammoth.convertToMarkdown({ buffer: buf });
process.stdout.write(JSON.stringify({ c: r.value || '' }));`, 'utf8');
      const out = execSync(`node "${tmp}"`, { cwd: BASE, encoding: 'utf8', timeout: 120000, windowsHide: true });
      try { fs.unlinkSync(tmp); } catch {}
      const content = JSON.parse(out.trim()).c || '';
      const md = `---\nsource: knowledge/blueprints/${item.name}\ntype: docx\nconverted: ${new Date().toISOString()}\n---\n\n# ${baseName}\n\n${content}`;
      fs.writeFileSync(mdPath, md, 'utf8');
    }

    console.log(`  OK ${item.name} -> ${baseName}.md`);
    ok++;
  } catch (e) {
    console.log(`  FAIL ${item.name}: ${e.message}`);
    fail++;
  }
}

console.log(`\nDone: ${ok} converted, ${fail} failed`);