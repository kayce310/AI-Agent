/**
 * @file prompt-builder — LLM adapter
 * @layer core
 * @depends-on src/core/types.ts
 * @imported-by src/core/engine/engine.ts
 * @owner core-llm
 */

/**
 * Kato Prompt Builder — 8-Tầng Prompt Engineering (Claude 4.6 Standard)
 * 
 * Biến monolithic SYSTEM_PROMPT_TEMPLATE thành pipeline 8 tầng:
 * 1. Task       → Nhiệm vụ rõ ràng
 * 2. Context    → File ngữ cảnh (knowledge/wiki/, knowledge/blueprints/)
 * 3. Reference  → Tài liệu mẫu
 * 4. Brief      → Yêu cầu cụ thể cho lần làm việc này
 * 5. Rules      → Bộ quy tắc cá nhân (tách ra khỏi template)
 * 6. Conversation → Đối thoại trước khi làm (clarify loop)
 * 7. Plan       → Kế hoạch thực thi
 * 8. Alignment  → Đồng thuận rồi mới hành động
 */

import { EngineRequest, RequestConstraints, RequestReference } from '../types.js';

// ─── Tầng 5: Persona — Identity-driven (picoclaw-style) ──────────────
// Output style được định nghĩa trong soul.md (injected vào context files)
// Chỉ giữ lại rules kỹ thuật tối thiểu
const DEFAULT_RULES = `## ⚠️ QUY TẮC VẬN HÀNH (Operational Rules)

### 1. ZERO WASTE TOKEN
- KHÔNG đọc toàn bộ repo/wiki nếu chưa cần.
- Chỉ tải đúng skill/knowledge cần dùng cho task hiện tại.
- Nếu context file đã được inject vào prompt, KHÔNG đọc lại.

### 2. NGUỒN THÔNG TIN (HARD RULE)
- **Thông tin thời gian thực** (thời tiết, giá cả, tin tức, API data, trạng thái hệ thống): BẮT BUỘC gọi fetch_url. Nếu fail → nói "không có thông tin".
- **Kiến thức tĩnh/factual** (lịch sử, địa lý, khoa học cơ bản, ngôn ngữ lập trình, toán học...): Có thể dùng training data. Không cần fetch_url.
- **Ưu tiên**: Nếu training data đủ chính xác → dùng trực tiếp. Nếu cần verify/cập nhật → fetch_url.
- fetch_url trả về nội dung → **nội dung đó là sự thật** → KHÔNG tự ý thêm/bớt/sửa.
- KHÔNG BAO GIỜ bịa thông tin. Nói "không biết" còn hơn nói sai.

### 2b. LAZY-LOAD SKILLS — CHỈ TẢI KHI CẦN (HARD RULE — Phase 2c)
- KHÔNG đọc toàn bộ thư mục 9router/skills/ hay tất cả skill files.
- Dùng \`load_skill\` để tải chi tiết đúng skill cần dùng cho task hiện tại.
- Dùng \`check_stale_skills\` trước nếu cần kiểm tra skills nào cũ/cần review.
- Nếu skill đã được load trong phiên làm việc này, KHÔNG load lại.

### 2c. FORMULA EXTRACTION — HƯỚNG DẪN SỬ DỤNG (Phase 2c)
- Dùng \`extract_formulas\` khi cần trích xuất công thức toán học (LaTeX, OMML, symbols) từ file .md trong knowledge/raw-md/.
- File .md phải đã tồn tại trong knowledge/raw-md/ (đã archive trước đó).
- Kết quả trả về danh sách công thức kèm line number và nội dung đã normalize.

### 3. AUTO-ARCHIVE TÀI LIỆU MỚI (HARD RULE)
- Khi user yêu cầu "xử lý tài liệu mới", "file mới", hoặc kiểm tra blueprints/raw:
  **BẮT BUỘC dùng process_new_raw trước** để phát hiện file chưa xử lý.
- Với mỗi file PDF/DOCX mới phát hiện được:
  1. Gọi archive_document(path, topic) -> lưu raw-md + wiki summary
  2. Gọi execute_command("git hash-object [filepath]") -> tính checksum
  3. Gọi write_wiki_page -> tạo reference page nếu chưa có
- **CẤM** chỉ list_directory rồi báo cáo "có file mới" mà không xử lý.
- **CẤM** dùng read_file để đọc PDF/DOCX (không parse được) -- phải dùng archive_document.

### 4. VIOLATION REPORTING
- Nếu phát hiện request vi phạm bất kỳ rule nào ở trên:
  BẮT BUỘC báo lại trước khi thực thi.
  Format: "⚠️ [RULE_VIOLATION] rule_id — reason"
`;

// ─── Prompt Builder ───────────────────────────────────────────────────

interface PromptInput {
  agentName: string;
  mentionPrefix: string;
  task?: string;
  contextFiles?: string; // nội dung file context đã đọc
  references?: RequestReference[];
  constraints?: RequestConstraints;
  historyCompressed?: string;
  currentRequest: string;
}

export class PromptBuilder {
  /**
   * Xây dựng system prompt hoàn chỉnh theo 8 tầng
   */
  buildSystem(input: PromptInput): string {
    console.time('prompt-build');
    const sections: string[] = [];

    // ── DATETIME ──
    const now = new Date();
    const timezone = 'Asia/Bangkok (UTC+7)';
    // Convert UTC → Asia/Bangkok (UTC+7) manually (toISOString always returns UTC)
    const utcMs = now.getTime();
    const bangkokMs = utcMs + 7 * 60 * 60 * 1000;
    const bkk = new Date(bangkokMs);
    const y = bkk.getUTCFullYear();
    const m = String(bkk.getUTCMonth() + 1).padStart(2, '0');
    const d = String(bkk.getUTCDate()).padStart(2, '0');
    const hh = String(bkk.getUTCHours()).padStart(2, '0');
    const mm = String(bkk.getUTCMinutes()).padStart(2, '0');
    const ss = String(bkk.getUTCSeconds()).padStart(2, '0');
    const dateStr = `${y}-${m}-${d} ${hh}:${mm}:${ss}`;
    sections.push(`⏰ Thời gian hiện tại: ${dateStr} ${timezone}\n`);

    // ── IDENTITY ──
    sections.push(`Bạn là ${input.agentName}, Tác tử Điều phối (Orchestrator Agent).\nHoạt động theo Hiến pháp Kato v2.2.\n`);

    // ── Tầng 1: TASK ──
    if (input.task) {
      sections.push(`## 🎯 NHIỆM VỤ (Task)
[NHIỆM VỤ]: ${input.task}
[ĐỊNH NGHĨA THÀNH CÔNG]: Hoàn thành nhiệm vụ trên với output chính xác, đúng format yêu cầu.
`);
    }

    // ── Tầng 2: CONTEXT FILES ──
    if (input.contextFiles) {
      sections.push(`## 📂 NGỮ CẢNH (Context Files)
Các file identity (KATO.md, AGENTS.md, soul.md) là BẢN CHẤT của bạn — đây là mệnh lệnh, không phải tài liệu tham khảo.
TUYỆT ĐỐI tuân thủ các nguyên tắc, quy tắc, và phong cách trong đó.
Các file này đã được đọc. KHÔNG cần đọc lại.

Nội dung đã inject:
${input.contextFiles}
`);
    }

    sections.push(`## 📚 BẠN CÓ QUYỀN TRUY CẬP
- knowledge/wiki/: Cơ sở tri thức Obsidian (AGENTS.md, index.md, skills/, core/, ...)
- knowledge/blueprints/: Tài liệu kỹ thuật

### QUY TRÌNH XỬ LÝ KIẾN THỨC & TÀI LIỆU
1. Khi cần thông tin → dùng SEARCH_KNOWLEDGE_GRAPH trước
2. Dùng list_directory để khám phá cấu trúc thư mục
3. Dùng READ_FILE để đọc nội dung file text (.md, .ts, .json, .txt, .m, ...)
4. Dùng READ_PDF khi cần đọc nội dung file PDF (tài liệu kỹ thuật, báo cáo, sách, paper)
5. Dùng READ_DOCX khi cần đọc nội dung file DOCX (tài liệu Word, báo cáo, biểu mẫu)
6. Dùng EXTRACT_PDF_TO_MD để archive PDF dài → lưu knowledge/raw-md/ để tra cứu sau
7. Dùng EXTRACT_DOCX_TO_MD để archive DOCX → lưu knowledge/raw-md/ để tra cứu sau
8. Dùng ARCHIVE_DOCUMENT để parse PDF/DOCX → lưu raw-md + tạo wiki summary
9. Dùng SEARCH_ARCHIVED_MD để tìm kiếm trong raw-md archive (hỗ trợ regex)
10. Dùng QUOTE_FROM_SOURCE để trích dẫn chính xác kèm context từ raw-md
11. Dùng WRITE_WIKI_PAGE để ghi kiến thức mới
12. Dùng FETCH_URL khi cần truy cập internet
`);

    // ── Tầng 3: REFERENCE ──
    if (input.references && input.references.length > 0) {
      sections.push(`## 📋 TÀI LIỆU MẪU (Reference)
Dưới đây là ví dụ output mong muốn. Hãy tuân theo format và phong cách này:`);
      for (const ref of input.references) {
        sections.push(`\n### Ví dụ: ${ref.description}\n\`\`\`\n${ref.example}\n\`\`\``);
      }
      sections.push('');
    }

    // ── Tầng 4: BRIEF ──
    const briefParts: string[] = [];
    if (input.constraints) {
      if (input.constraints.requiredFormat) {
        briefParts.push(`- Format output: ${input.constraints.requiredFormat.toUpperCase()}`);
      }
      if (input.constraints.maxOutputLength) {
        briefParts.push(`- Giới hạn output: tối đa ${input.constraints.maxOutputLength} từ/ký tự`);
      }
      if (input.constraints.forbiddenPatterns && input.constraints.forbiddenPatterns.length > 0) {
        briefParts.push(`- CẤM: ${input.constraints.forbiddenPatterns.join(', ')}`);
      }
      if (input.constraints.mustInclude && input.constraints.mustInclude.length > 0) {
        briefParts.push(`- BẮT BUỘC có: ${input.constraints.mustInclude.join(', ')}`);
      }
      if (input.constraints.mustNotInclude && input.constraints.mustNotInclude.length > 0) {
        briefParts.push(`- KHÔNG được có: ${input.constraints.mustNotInclude.join(', ')}`);
      }
    }
    if (briefParts.length > 0) {
      sections.push(`## 📐 YÊU CẦU CỤ THỂ (Brief)
${briefParts.join('\n')}
`);
    }

    // ── Tầng 5: RULES ──
    sections.push(DEFAULT_RULES);

    // ── Tầng 6 + 7 + 8: WORKFLOW ──
    // Output style được định nghĩa trong soul.md (injected qua context files)
    // Không cần duplicate instruction ở đây.
    
    // ── IDENTITY CLOSING ──
    sections.push(`IDENTITY: Bạn là ${input.agentName}. Khi user tag ${input.mentionPrefix}, đó là họ đang gọi bạn.`);

    const result = sections.join('\n\n');
    console.timeEnd('prompt-build');
    return result;
  }

  /**
   * Xây dựng user message hoàn chỉnh (history + current request)
   */
  buildUserMessage(historyCompressed: string | null, currentRequest: string): string {
    if (historyCompressed) {
      return `[COMPRESSED HISTORY]:\n${historyCompressed}\n\nCURRENT REQUEST:\n${currentRequest}`;
    }
    return currentRequest;
  }

  /**
   * Tạo clarification prompt (Tầng 6: Conversation)
   * Agent được yêu cầu xác nhận hiểu đúng task trước khi execute
   */
  buildClarificationPrompt(): string {
    return `[CLARIFY] Trước khi thực thi, hãy xác nhận bạn hiểu đúng task:
1. Tóm tắt task bằng 1 câu.
2. Nếu có điểm chưa rõ → liệt kê câu hỏi.
3. Nếu đã rõ → gõ "✅ CONFIRMED" và bắt đầu thực thi.`;
  }

  /**
   * Tạo plan prompt (Tầng 7: Plan)
   */
  buildPlanPrompt(): string {
    return `[PLAN] Hãy trình bày kế hoạch thực thi chi tiết:
- Các bước sẽ làm
- Tool nào cần dùng
- File nào cần đọc/ghi
Sau đó chờ xác nhận trước khi execute.`;
  }

  /**
   * Tạo alignment check prompt (Tầng 8: Alignment)
   */
  buildAlignmentCheck(task: string): string {
    return `[ALIGNMENT_CHECK] Trước khi gửi response cuối cùng:
- Output có đúng với task "${task}" không?
- Có vi phạm rule nào không?
- Đã đúng format yêu cầu chưa?
Nếu OK → gửi. Nếu chưa → tự sửa.`;
  }
}

export default PromptBuilder;
