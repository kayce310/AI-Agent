const fs = require('fs');
const path = require('path');

const CHUNK_FILE = process.argv[2];
const LIBRARY_FILE = path.join(__dirname, '../../knowledge/wiki/prompts/gpt-image-library.md');

function main() {
  if (!CHUNK_FILE) {
    console.error('Usage: node extract_worker.cjs <chunk-file>');
    process.exit(1);
  }

  const content = fs.readFileSync(path.join(__dirname, '../../knowledge/blueprints/queue/', CHUNK_FILE), 'utf8');
  
  // Regex trích xuất tất cả Case
  const caseMatches = [...content.matchAll(/Case \d+:.+?\(by @[\w_]+\)/g)];
  const extracted = caseMatches.map(match => `- [[${match[0]}]]`).join('\n');

  // Ghi nối vào thư viện
  fs.appendFileSync(LIBRARY_FILE, `\n---\n\n## 📦 ${CHUNK_FILE}\n\n${extracted}\n`);
  
  console.log(`✅ Trích xuất xong: ${caseMatches.length} prompt từ ${CHUNK_FILE}`);
}

main();