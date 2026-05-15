
import { archiveDocument } from 'file:///E:/Test/AI-Agent/src/modules/knowledge/md-archiver.js';
const result = archiveDocument('E:/Test/AI-Agent/knowledge/blueprints/Tai-lieu-he-thong-AI-Agent.pdf', 'AI Agent System Architecture');
process.stdout.write(JSON.stringify(result));
