import { PDFParse } from 'pdf-parse';
import fs from 'fs';
const buf = fs.readFileSync('E:/Test/AI-Agent/knowledge/blueprints/Space Vehicle Dynamics and Control.pdf');
const p = new PDFParse({ data: buf });
const r = await p.getText({ first: 9999 });
process.stdout.write(JSON.stringify({ c: r.text || '' }));