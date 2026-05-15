
const pdfParse = require('pdf-parse');
const fs = require('fs');
const buf = fs.readFileSync('E:/Test/AI-Agent/knowledge/blueprints/AD0758978.pdf');
pdfParse(buf).then(data => {
  let text = data.text || '';
  const numPages = data.numpages || 0;
  const maxPages2 = 3;
  if (maxPages2 > 0 && numPages > maxPages2) {
    text = text.split('\n').slice(0, maxPages2 * 40).join('\n');
    text += '\n\n[... truncated to ' + maxPages2 + '/' + numPages + ' pages]';
  }
  if (text.length > 20000) {
    text = text.substring(0, 20000) + '\n\n[... truncated at 20000 chars]';
  }
  process.stdout.write(JSON.stringify({
    content: text,
    pageCount: numPages
  }));
}).catch(err => {
  process.stdout.write(JSON.stringify({ error: err.message }));
});
