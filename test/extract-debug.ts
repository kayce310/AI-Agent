import { extractKnowledge } from '../src/core/knowledge/memory-extractor.js';
const msgs = [
  { role: 'assistant', content: 'A'.repeat(200) },
  { role: 'assistant', content: 'B'.repeat(101) },
  { role: 'assistant', content: 'short' },
];
const entries = extractKnowledge(msgs, 'test');
console.log('entries:', entries.length);
console.log('content lens:', msgs.map(m => m.content.length));
entries.forEach((e, i) => console.log(`  [${i}] tags:`, e.tags, 'content[0]:', e.content[0]));
