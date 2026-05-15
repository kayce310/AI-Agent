
import { convertDocumentToMd } from 'E:/Test/AI-Agent/src/modules/document/converter.js';
const result = convertDocumentToMd('E:/Test/AI-Agent/knowledge/raw/Phòng Tổng vụ - Thông báo Kế hoạch nghỉ Lễ Giỗ Tổ Hùng Vương và 30.4, 01.5 năm 2026.pdf');
process.stdout.write(JSON.stringify(result));
