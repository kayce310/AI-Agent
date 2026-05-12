import fs from 'fs';
import path from 'path';

const FILE_PATH = process.argv[2];
const CHUNK_LINES = 200;
const OUTPUT_DIR = path.join(__dirname, '../../knowledge/blueprints/queue/');

if (!FILE_PATH) {
  console.error('Usage: node chunker.js <file-path>');
  process.exit(1);
}

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

const content = fs.readFileSync(FILE_PATH, 'utf8');
const lines = content.split('\n');
const chunks = [];

for (let i = 0; i < lines.length; i += CHUNK_LINES) {
  chunks.push(lines.slice(i, i + CHUNK_LINES).join('\n'));
}

chunks.forEach((chunk, index) => {
  const filename = path.join(OUTPUT_DIR, `chunk_${index + 1}.md`);
  fs.writeFileSync(filename, chunk);
});

console.log(`✅ Chunk hoàn tất: ${chunks.length} file đã tạo`);