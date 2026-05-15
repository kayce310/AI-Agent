
import mammoth from 'mammoth';
import fs from 'fs';
const buf = fs.readFileSync('E:/Test/AI-Agent/knowledge/blueprints/Free LLM API Providers List.docx');
const result = await mammoth.convertToRawText({ buffer: buf });
let text = result.value || '';
if (text.length > 20000) {
  text = text.substring(0, 20000) + '\n\n[... truncated at 20000 chars]';
}
process.stdout.write(JSON.stringify({ content: text }));
