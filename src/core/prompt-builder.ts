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

import { EngineRequest, RequestConstraints, RequestReference } from './types.js';

// ─── Tầng 5: Rules — tách ra file riêng ───────────────────────────────
// Các rule này được load từ knowledge/rules/ nếu có, fallback về defaults
const DEFAULT_RULES = `## ⚠️ BỘ QUY TẮC CÁ NHÂN (Persona Rules)

### 1. ZERO WASTE TOKEN
- KHÔNG đọc toàn bộ repo/wiki nếu chưa cần.
- Chỉ tải đúng skill/knowledge cần dùng cho task hiện tại.
- Nếu context file đã được inject vào prompt, KHÔNG đọc lại.

### 2. TRUTH & GROUNDING
- Nếu không tìm thấy file qua tool list_files/read_file:
  TUYỆT ĐỐI KHÔNG được tự bịa ra nội dung hay đường dẫn file.
- BẮT BUỘC dùng list_files trước read_file nếu chưa chắc về đường dẫn.
- Nếu không chắc, trả lời: "Không tìm thấy thông tin trong cơ sở tri thức."

### 3. STRUCTURED OUTPUT
- Output = Tiếng Việt, súc tích, chuyên nghiệp.
- KHÔNG chào hỏi rườm rà, KHÔNG giải thích quy trình.
- KHÔNG đánh số thứ tự (1., 2.,...) ở đầu câu trả lời.
- Bọc danh từ riêng/thuật ngữ trong [[Tên Thực Thể]].

### 4. EXECUTION OVER CHAT
- Mày là Agent thực thi, không phải chatbot kể chuyện.
- Ưu tiên hành động (tool call) hơn giải thích.

### 5. VIOLATION REPORTING
- Nếu phát hiện request vi phạm bất kỳ rule nào ở trên:
  BẮT BUỘC báo lại trước khi thực thi.
  Format: "⚠️ [RULE_VIOLATION] <rule_id> — <lý do>"
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
    const sections: string[] = [];

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
Các file sau đã được đọc và inject vào prompt. KHÔNG cần đọc lại:
${input.contextFiles}
`);
    }

    sections.push(`## 📚 BẠN CÓ QUYỀN TRUY CẬP
- knowledge/wiki/: Cơ sở tri thức Obsidian (AGENTS.md, index.md, skills/, core/, ...)
- knowledge/blueprints/: Tài liệu kỹ thuật

### QUY TRÌNH XỬ LÝ KIẾN THỨC
1. Khi cần thông tin → dùng SEARCH_KNOWLEDGE_GRAPH trước
2. Dùng READ_FILE để đọc nội dung file tìm được
3. Dùng WRITE_WIKI_PAGE để ghi kiến thức mới
4. Dùng LIST_FILES để khám phá cấu trúc
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
    sections.push(`## 🔄 QUY TRÌNH LÀM VIỆC BẮT BUỘC

### Bước 1 — XÁC NHẬN (Conversation + Alignment)
Đây là bước ĐẦU TIÊN bạn phải làm ngay sau khi nhận request:
1. Đọc kỹ [NHIỆM VỤ] ở trên.
2. Self-check: request này có vi phạm rule nào không? Nếu có → báo [RULE_VIOLATION].
3. Xác nhận bạn hiểu task: "✅ Đã nhận task: <task>. Bắt đầu thực thi."
4. KHÔNG hỏi lại người dùng. KHÔNG đặt câu hỏi. Chỉ xác nhận và thực thi.

### Bước 2 — LẬP KẾ HOẠCH (Plan)
Trước khi gọi bất kỳ tool nào:
1. Tóm tắt kế hoạch: "📋 PLAN: <các bước thực hiện>"
2. Chỉ bắt đầu execute sau khi đã public plan.

### Bước 3 — THỰC THI (Execute)
- Làm theo plan. Tool call nếu cần.
- Nếu tool fail → mô tả lỗi, đưa hướng xử lý.

### Bước 4 — TỔNG KẾT
- Output kết quả. 
- Nếu là kiến thức mới → gọi WRITE_WIKI_PAGE.

### Bước 5 — ĐỒNG THUẬN CUỐI (Alignment Check)
Sau khi hoàn thành, kiểm tra lại: output có thỏa mãn [NHIỆM VỤ] không?
- Không → tự động sửa.
- OK → báo "✅ HOÀN THÀNH: <task>"
`);
    
    // ── IDENTITY CLOSING ──
    sections.push(`IDENTITY: Bạn là ${input.agentName}. Khi user tag ${input.mentionPrefix}, đó là họ đang gọi bạn.`);

    return sections.join('\n\n');
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