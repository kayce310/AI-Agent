/**
 * Test script: verify read_pdf fix
 * Run: npx tsx scripts/test-pdf-reader.ts
 */
import { executeToolCall } from '../src/core/tools.js';
import fs from 'fs';
import path from 'path';

function findPdf(dir: string): string | null {
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

const base = path.resolve(process.cwd(), 'knowledge');
console.log(`Scanning: ${base}`);
const pdfPath = findPdf(base);

if (!pdfPath) {
  console.log('❌ No PDF found in knowledge/ directory');
  process.exit(0);
}

console.log(`✅ Found PDF: ${pdfPath}`);
console.log(`File size: ${fs.statSync(pdfPath).size} bytes`);

const result = executeToolCall({
  function: { name: 'read_pdf', arguments: JSON.stringify({ path: pdfPath, max_pages: 3 }) }
});

if (result.error) {
  console.log(`❌ ERROR: ${result.error}`);
} else {
  console.log(`✅ SUCCESS!`);
  console.log(`   Pages: ${result.pageCount}`);
  console.log(`   Content length: ${result.content?.length || 0} chars`);
  console.log(`   Truncated: ${result.truncated || false}`);
  console.log(`\n--- Content preview (first 500 chars) ---`);
  console.log(result.content?.substring(0, 500));
}