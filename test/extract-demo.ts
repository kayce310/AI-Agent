/**
 * Self-check for memory-extractor.
 * node --import tsx test/extract-demo.ts
 * ponytail: no test framework, just assert-based demo.
 */
import { extractKnowledge, saveToObsidian, KnowledgeEntry } from '../src/core/knowledge/memory-extractor.js';
import * as fs from 'fs/promises';
import * as path from 'path';
import { tmpdir } from 'os';

async function main() {
  const msgs = [
    { role: 'user', content: 'Cách deploy Node app lên VPS?' },
    { role: 'assistant', content: 'Để deploy Node app lên VPS, bạn cần: 1. Build app với npm run build. 2. Dùng PM2 để quản lý process. 3. Cấu hình Nginx làm reverse proxy. 4. Setup SSL với Certbot. Các bước này đảm bảo app chạy ổn định và bảo mật.' },
    { role: 'user', content: 'PM2 là gì?' },
    { role: 'assistant', content: 'PM2' },
    { role: 'assistant', content: 'Docker cũng là một lựa chọn tốt cho deployment, nhưng đòi hỏi kiến thức về containerization.' },
  ];

  const entries = extractKnowledge(msgs, 'deploy-guide');
  assert(entries.length === 1, `expected 1 entry, got ${entries.length}`);
  assert(entries[0].tags.length > 0, 'tags should not be empty');
  assert(entries[0].tags.includes('deploy'), 'tags should include deploy');
  console.log(`  PASS: extractKnowledge — ${entries.length} entries, tags: ${entries[0].tags}`);

  const vaultPath = path.join(tmpdir(), 'coral-test-vault');
  const files = await saveToObsidian(entries, vaultPath);
  assert(files.length === 1, `expected 1 file, got ${files.length}`);
  const content = await fs.readFile(files[0], 'utf-8');
  assert(content.startsWith('---'), 'should have frontmatter');
  assert(content.includes('type: concept'), 'should have type');
  assert(content.includes('Related:'), 'should have wikilinks');
  console.log(`  PASS: saveToObsidian — ${files.length} files, frontmatter OK`);

  // Cleanup
  for (const f of files) await fs.unlink(f).catch(() => {});
  await fs.rmdir(path.dirname(files[0])).catch(() => {});

  console.log('\n  ALL PASS');
}

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

main().catch(e => { console.error('FAIL:', e.message); process.exit(1); });
