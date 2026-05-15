/**
 * Kato Universal LLM Core with Agent Loop & Tool Calling
 * Framework 6 Layers Claude Code - Lớp Lõi
 * 
 * Tương thích 100%: OpenAI, Claude, Gemini, DeepSeek, Llama, Local AI
 * Hoạt động qua bất kỳ Proxy nào: LiteLLM, OpenRouter, Ollama, Local Server
 * 
 * Sử dụng TOOLS_DEFINITION + executeToolCall từ tools.ts (shared)
 * cho tất cả tool execution. Giữ lại singleton local fallback trong LLMCore.
 */

import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import MemoryCompressor from './memory-compressor.js';
import { Message } from './memory.js';
import { TOOLS_DEFINITION as SHARED_TOOLS, executeToolCall } from './tools.js';
import 'dotenv/config';

type FunctionToolCall = OpenAI.Chat.Completions.ChatCompletionMessageFunctionToolCall;

const SYSTEM_PROMPT_TEMPLATE = `Bạn là {AGENT_NAME}, hệ thống Tác tử Điều phối (Orchestrator Agent).
Hoạt động theo Hiến pháp Kato v2.2.

Bạn được gọi qua giao thức {PROTOCOL}. Người dùng đang gọi bạn bằng cách: {MENTION_PREFIX}.

⚠️ QUY TẮC QUAN TRỌNG NHẤT:
Khi người dùng viết {MENTION_PREFIX} trong câu hỏi, đó là HỌ ĐANG GỌI BẠN. ĐÓ KHÔNG PHẢI LÀ MỘT CHỦ ĐỀ, KHÔNG PHẢI LÀ TỪ KHÓA, ĐÓ LÀ TÊN CỦA BẠN.

Bạn CÓ TRUY CẬP ĐẦY ĐỦ vào toàn bộ lịch sử hội thoại phía trên. Tất cả những gì user nói trước đó đều nằm trong context messages. Bạn phải đọc và nhớ toàn bộ chúng.

Bạn có quyền sử dụng các công cụ sau để thực thi lệnh trên hệ thống:
1. list_directory - Liệt kê nội dung thư mục
2. read_file - Đọc nội dung file
3. process_new_raw_data - Xử lý tự động các file dữ liệu mới trong thư mục knowledge/raw/
4. write_wiki_page - Tạo hoặc cập nhật một trang wiki trong thư mục knowledge/wiki/
5. search_knowledge_graph - Tìm kiếm cực nhanh trong cơ sở tri thức Obsidian
6. fetch_url - Truy cập internet (Wikipedia, web, API) để lấy thông tin thực tế, thời gian thực
7. read_pdf - Đọc nội dung file PDF
8. read_docx - Đọc nội dung file DOCX
9. execute_command - Chạy lệnh hệ thống (npm, git, node...)
10. extract_pdf_to_md - Parse PDF → lưu knowledge/raw-md/
11. extract_docx_to_md - Parse DOCX → lưu knowledge/raw-md/
12. archive_document - Parse PDF/DOCX → lưu raw-md + tạo wiki summary
13. search_archived_md - Tìm kiếm trong raw-md archive (hỗ trợ regex)
14. quote_from_source - Trích dẫn chính xác kèm context từ raw-md

⚠️ QUY TẮC FETCH_URL (SOUL.md — TUYỆT ĐỐI TUÂN THỦ):
- Khi cần thông tin thực tế (địa lý, lịch sử, thời tiết, tin tức, con người, sự kiện, du lịch, đặc sản, văn hóa): BẮT BUỘC gọi fetch_url trước.
- CẤM TUYỆT ĐỐI trả lời dựa trên training data của bạn.
- fetch_url trả về nội dung → nội dung đó LÀ câu trả lời, KHÔNG tự ý thêm/bớt/sửa.
- Nếu fetch_url thất bại → nói "không có thông tin" + đề xuất user tự kiểm tra.
- KHÔNG BAO GIỜ tự bịa thông tin. Nói "không biết" còn hơn nói sai.

---

✅ QUY TẮC BẮT BUỘC KHI TẠO NỘI DUNG:
🔗 DỆT MẠNG LƯỚI (Graph Weaving):
Khi tóm tắt tài liệu hoặc viết nội dung mới, BẮT BUỘC chủ động nhận diện các thực thể quan trọng:
- Danh từ riêng, tên thuật toán, linh kiện phần cứng, tên dự án
- BẮT BUỘC bọc chúng trong định dạng [[Tên Thực Thể]]
- NGAY CẢ KHI file markdown đó chưa tồn tại (tạo Orphaned Links)
- Tuyệt đối không để các thực thể kỹ thuật ở dạng text phẳng.

⚡ XỬ LÝ DỮ LIỆU THÔ:
- Đối chiếu mọi file raw với processed_log.md
- Chỉ xử lý những file chưa có trong log
- Sau khi xử lý xong, BẮT BUỘC ghi tên file vào log.

🚀 TRUY VẤN O(1):
- Luôn dùng search_knowledge_graph để tra mục lục trước
- Hạn chế tối đa đọc mù mờ toàn bộ file bằng LLM

Khi cần thông tin, HÃY GỌI CÔNG CỤ. ĐƯỢC PHÉP KHÔNG BAO GIỜ bịa đặt thông tin.
Nếu bạn không biết thông tin, hãy gọi công cụ để đọc file. Nếu file không tồn tại, nói rõ điều đó.

Quy tắc hoạt động cốt lõi:
1. Ngôn ngữ: Luôn phản hồi bằng tiếng Việt ngắn gọn, súc tích (trừ khi user yêu cầu khác).
2. Tuân thủ Framework 6 Lớp: Bạn hoạt động dựa trên cấu trúc Luật - Bộ Nhớ - Kỹ Năng - Tác Tử - Kiểm Chứng - Tiến Hóa.
3. Định hướng Dữ liệu (Bộ nhớ): Bạn KHÔNG là 'AI biết tuốt'. Kiến thức và ngữ cảnh dự án của bạn nằm trên ổ cứng (trong knowledge/wiki/). Tùy thuộc vào câu hỏi của user, hãy sử dụng công cụ (Tools) để đọc đúng file tài liệu cần thiết trước khi trả lời. Tuyệt đối không bịa đặt (hallucinate) thông tin.
4. Phong cách: Đặt sự thật và tính chính xác lên trên tốc độ (Truth > Speed). Không dùng các từ ngữ phỏng đoán như 'có vẻ', 'có thể'.
5. QUAN TRỌNG: BẠN ĐÃ CÓ TOÀN BỘ LỊCH SỬ HỘI THOẠI. ĐỪNG BAO GIỜ NÓI BẠN KHÔNG NHỚ GÌ.
6. IDENTITY: Bạn là {AGENT_NAME}. Khi user tag {MENTION_PREFIX} đó là họ đang gọi bạn.`;

export class LLMCore {
  private client: OpenAI;
  private modelIndex: number = 0;
  private memoryCompressor: MemoryCompressor;
  private basePath: string = process.cwd();

  private readonly FALLBACK_MODELS = [
    "anthropic/claude-3-haiku",
    "meta-llama/llama-3-8b-instruct",
    "mistralai/mistral-7b-instruct-v0.3",
    "google/gemma-2-9b-it",
    "openai/gpt-3.5-turbo"
  ];

  constructor() {
    const baseURL = process.env.OPENAI_BASE_URL || 'http://127.0.0.1:8000/v1';
    const apiKey = process.env.OPENAI_API_KEY || 'dummy';

    this.client = new OpenAI({
      baseURL,
      apiKey,
      timeout: 120000,
      maxRetries: 2,
    });

    this.memoryCompressor = new MemoryCompressor();

    console.log(`✅ LLMCore initialized with endpoint: ${baseURL}`);
  }

  /**
   * Kiểm tra đường dẫn an toàn, không cho phép đi ra ngoài thư mục dự án
   */
  private isPathSafe(targetPath: string): boolean {
    const resolvedPath = path.resolve(this.basePath, targetPath);
    return resolvedPath.startsWith(this.basePath);
  }

  /**
   * Lấy danh sách file đã được xử lý
   */
  private getProcessedFiles(): Set<string> {
    const logPath = path.join(this.basePath, 'knowledge/wiki/processed_log.md');

    if (!fs.existsSync(logPath)) {
      fs.writeFileSync(logPath, '# 📋 Processed Raw Files Log\n\nDanh sách các file trong raw/ đã được xử lý và chuyển đổi thành wiki:\n\n---\n\n', 'utf8');
      return new Set();
    }

    const content = fs.readFileSync(logPath, 'utf8');
    const processed = new Set<string>();

    // Tìm tất cả các dòng - [x] filename
    const regex = /- \[x\] (.+)/g;
    let match;
    while ((match = regex.exec(content)) !== null) {
      processed.add(match[1]);
    }

    return processed;
  }

  /**
   * Đánh dấu file đã được xử lý xong
   */
  private markFileProcessed(filename: string): void {
    const logPath = path.join(this.basePath, 'knowledge/wiki/processed_log.md');
    const currentContent = fs.readFileSync(logPath, 'utf8');
    const updatedContent = currentContent + `- [x] ${filename}\n`;
    fs.writeFileSync(logPath, updatedContent, 'utf8');
  }

  /**
   * Thực thi công cụ được yêu cầu bởi LLM
   * Dùng shared executeToolCall từ tools.ts + fallback local cho các tool đặc thù
   */
  private executeToolCallLocal(toolCall: FunctionToolCall): any {
    try {
      const functionName = toolCall.function.name;
      const args = JSON.parse(toolCall.function.arguments);

      console.log(`🔧 LLMCore executing tool ${functionName} with args:`, args);

      if (args.path && !this.isPathSafe(args.path)) {
        return { error: `Đường dẫn ${args.path} không được phép truy cập` };
      }

      // process_new_raw_data là tool đặc thù chỉ có ở LLMCore
      if (functionName === 'process_new_raw_data') {
        const rawPath = path.join(this.basePath, 'knowledge/raw/');
        const processed = this.getProcessedFiles();

        const allFiles: string[] = [];

        // Quét toàn bộ thư mục raw
        function scanDir(dir: string, prefix: string = '') {
          const items = fs.readdirSync(dir, { withFileTypes: true });
          for (const item of items) {
            const fullPath = path.join(dir, item.name);
            const relativePath = prefix + item.name;

            if (item.isDirectory()) {
              scanDir(fullPath, relativePath + '/');
            } else {
              allFiles.push(relativePath);
            }
          }
        }

        if (fs.existsSync(rawPath)) {
          scanDir(rawPath);
        }

        // Tìm các file mới chưa được xử lý
        const newFiles = allFiles.filter(f => !processed.has(f));

        return {
          total_files: allFiles.length,
          processed_files: processed.size,
          new_files: newFiles,
          new_count: newFiles.length
        };
      }

      // Các tool còn lại dùng shared executeToolCall
      return executeToolCall(toolCall);

    } catch (error: any) {
      console.error(`❌ LLMCore tool execution error:`, error.message);
      return { error: error.message };
    }
  }

  /**
   * Gọi LLM với Agent Loop và Tool Calling
   * Không bao giờ crash hệ thống dù bất kỳ lỗi gì xảy ra
   */
  public async chatCompletion(history: Message[], context: {agentName: string, protocol: string, mentionPrefix: string}): Promise<string> {
    // Nén lịch sử hội thoại bằng Local LLM trước khi gửi lên Cloud LLM
    const compressedContext = await this.memoryCompressor.compressHistory(history);

    // Generate System Prompt with dynamic context
    const systemPrompt = SYSTEM_PROMPT_TEMPLATE
      .replaceAll('{AGENT_NAME}', context.agentName)
      .replaceAll('{PROTOCOL}', context.protocol)
      .replaceAll('{MENTION_PREFIX}', context.mentionPrefix);

    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `CONTEXT HISTORY:\n${compressedContext}\n\nUSER QUESTION: ${history[history.length - 1].content}` }
    ];

    // Dùng SHARED_TOOLS + thêm process_new_raw_data
    const tools = [
      ...SHARED_TOOLS,
      {
        type: 'function',
        function: {
          name: 'process_new_raw_data',
          description: 'Xử lý tự động các file dữ liệu mới trong thư mục knowledge/raw/',
          parameters: {
            type: 'object',
            properties: {},
            required: []
          }
        }
      }
    ];

    // Automatic Model Fallback System - Thử từng model theo thứ tự ưu tiên đến khi thành công
    for (let attempt = 0; attempt < this.FALLBACK_MODELS.length; attempt++) {
      try {
        const model = this.FALLBACK_MODELS[this.modelIndex];

        console.log(`📤 Attempt ${attempt+1}: Trying model ${model}`);

        // Agent Loop - Thực thi đến khi không còn công cụ cần gọi
        while (true) {
          const response = await this.client.chat.completions.create({
            model,
            messages,
            temperature: 0.7,
            max_tokens: 4096, // ← FIX: tăng từ 1024 lên 4096 để tránh finish_reason=length
            tools,
            tool_choice: 'auto'
          });

          const choice = response.choices[0];

          if (choice.finish_reason === 'stop') {
            const result = choice.message.content || '';
            console.log(`✅ Model ${model} worked successfully!`);
            console.log(`📥 Received response from LLM, length: ${result.length}`);
            return result;
          }

          if (choice.finish_reason === 'length') {
            console.error(`❌ Model ${model}: finish_reason=length (output truncation at 4096 tokens)`);
            // Chuyển sang model khác có context lớn hơn
            this.modelIndex = (this.modelIndex + 1) % this.FALLBACK_MODELS.length;
            throw new Error(`finish_reason=length`);
          }

          if (choice.finish_reason === 'tool_calls' && choice.message.tool_calls) {
            messages.push(choice.message);

            for (const toolCall of choice.message.tool_calls) {
              if (!(toolCall.type === 'function')) {
                console.warn(`⚠️ Unsupported non-function tool call skipped: ${toolCall.type}`);
                continue;
              }

              const toolResult = this.executeToolCallLocal(toolCall as FunctionToolCall);

              messages.push({
                role: 'tool',
                tool_call_id: toolCall.id,
                content: JSON.stringify(toolResult)
              });

              console.log(`🔧 Tool ${toolCall.function.name} executed successfully`);
            }

            console.log(`🔄 Re-calling LLM with tool results`);
          }
        }

      } catch (error: any) {
        console.error(`❌ LLM Error with model ${this.FALLBACK_MODELS[this.modelIndex]}:`);

        if (error.name === 'TimeoutError') {
          console.error(`   ⏱️ Timeout: Server không phản hồi trong thời gian cho phép`);
        } else if (error.status === 429) {
          console.error(`   🚦 Rate Limit: Quá nhiều yêu cầu, vui lòng thử lại sau`);
        } else if (error.status >= 500) {
          console.error(`   🔌 Server Error: Hệ thống AI đang gặp sự cố`);
        } else {
          console.error(`   ❌ Unknown Error: ${error.message}`);
        }

        // Chuyển sang model tiếp theo
        this.modelIndex = (this.modelIndex + 1) % this.FALLBACK_MODELS.length;
        console.log(`🔄 Auto switching to next model: ${this.FALLBACK_MODELS[this.modelIndex]}`);
      }
    }

    // Fallback an toàn khi tất cả model đều lỗi
    return "⚠️ Tất cả các hệ thống AI hiện đang bận. Vui lòng thử lại sau vài phút.";
  }
}

export default LLMCore;