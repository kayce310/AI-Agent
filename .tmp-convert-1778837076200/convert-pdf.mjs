
import { convertDocumentToMd } from 'file:///E:/Test/AI-Agent/src/modules/document/converter.js';
const result = convertDocumentToMd('E:/Test/AI-Agent/knowledge/blueprints/Tai-lieu-he-thong-AI-Agent.pdf');
process.stdout.write(JSON.stringify(result));
