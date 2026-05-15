/**
 * Kato Agent — Core Engine (ReAct Loop)
 * Framework 6 Layers — Lớp Lõi (Core Domain)
 * 
 * Gọi 9router với tool calling (ReAct loop):
 * 1. Gọi LLM với tools definitions
 * 2. Nếu model gọi tool → thực thi → quay lại B1
 * 3. Nếu model trả lời → trả về text
 * 
 * KHÔNG có cascade, KHÔNG có fallback phức tạp.
 * 9router tự xử lý model selection và routing.
 */

import { EventEmitter } from 'events';
import { readFile } from 'fs/promises';
import MemoryCore from './memory.js';
import ProviderRegistry from './provider-registry.js';
import PromptBuilder from './prompt-builder.js';
import { TOOLS_DEFINITION, executeToolCall } from './tools.js';
import { selectRelevantTools, estimateToolsTokenCount } from './tool-pruner.js';
import { EngineRequest, EngineResponse, ChatMessage } from './types.js';
import { evolutionEngine } from './evolution.js';

// ── Kato Core Identity Files ──
const KATO_IDENTITY_FILES = [
  'CLINE.md',
  'knowledge/wiki/AGENTS.md',
  'knowledge/wiki/core/soul.md',
];

// ── ReAct Loop Safety ──
const MAX_TOOL_CALL_CYCLES = 10;

export class Engine extends EventEmitter {
  private registry: ProviderRegistry;
  private memory: MemoryCore;
  private katoIdentityContext: string = '';

  constructor(registry?: ProviderRegistry) {
    super();
    this.registry = registry ?? new ProviderRegistry();
    this.memory = new MemoryCore();
  }

  async init(): Promise<void> {
    this.registry.loadFromConfig();
    await evolutionEngine.init();
    await evolutionEngine.loadDefaultRules();

    // Load Kato Identity Files
    const identityParts: string[] = [];
    for (const fp of KATO_IDENTITY_FILES) {
      try {
        const content = await readFile(fp, 'utf8');
        identityParts.push(`--- ${fp} ---\n${content}`);
        console.log(`🧬 Kato Identity loaded: ${fp}`);
      } catch {
        console.warn(`⚠️ Could not load Kato identity file: ${fp}`);
      }
    }
    this.katoIdentityContext = identityParts.join('\n\n');

    console.log(`✅ Engine initialized with ${this.registry.listModels().length} models`);
    console.log(`🧬 Evolution: ${evolutionEngine.getStats().totalErrorsTracked} errors tracked, ${evolutionEngine.getStats().activeRules} rules active`);
  }

  async process(request: EngineRequest): Promise<EngineResponse> {
    // Build system prompt
    const promptBuilder = new PromptBuilder();
    const systemPrompt = promptBuilder.buildSystem({
      agentName: request.agentName,
      mentionPrefix: request.mentionPrefix,
      task: request.task,
      contextFiles: this.katoIdentityContext || undefined,
      references: request.references,
      constraints: request.constraints,
      currentRequest: request.messages[request.messages.length - 1]?.content || '',
    });

    // Build messages — chỉ lấy 5 message gần nhất
    // Quan trọng: sanitize assistant messages — không gửi content=null nếu không có tool_calls
    // (fix DeepSeek thinking mode error: reasoning_content must be preserved)
    const recentMessages = request.messages.slice(-5);
    const historyMessages: any[] = [];
    for (const msg of recentMessages) {
      const sanitized: any = { role: msg.role };
      
      // Tool messages từ ReAct cycles không được lưu trong memory
      // Nếu content=null (tool call) và role=assistant → thay bằng placeholder
      if (msg.role === 'assistant' && (msg.content === null || msg.content === undefined)) {
        sanitized.content = '[tool call]';
      } else {
        sanitized.content = msg.content || '';
      }
      
      // Preserve reasoning_content nếu có (DeepSeek thinking mode)
      if ((msg as any).reasoning_content) {
        sanitized.reasoning_content = (msg as any).reasoning_content;
      }
      
      historyMessages.push(sanitized);
    }
    const messages: any[] = [
      { role: 'system', content: systemPrompt },
      ...historyMessages,
    ];

    // Resolve provider — dùng model đầu tiên trong registry (9router)
    const models = this.registry.listModels();
    if (models.length === 0) {
      return {
        content: '❌ Không có model nào được cấu hình. Kiểm tra config/providers.json.',
        modelUsed: 'none',
        providerUsed: 'none',
      };
    }

    const modelId = models[0];
    const resolved = this.registry.resolve(modelId);
    if (!resolved) {
      return {
        content: `❌ Không thể resolve model: ${modelId}`,
        modelUsed: 'none',
        providerUsed: 'none',
      };
    }

    // ── ReAct Loop ──────────────────────────────────────────────
    let toolCallCycles = 0;
    let finalContent = '';

    while (toolCallCycles < MAX_TOOL_CALL_CYCLES) {
      try {
        console.log(`📤 Calling 9router with model: ${modelId} (tool cycle ${toolCallCycles})`);

        // Dynamic tool pruning: chỉ gửi tools phù hợp với context
        // Lấy user message cuối cùng để detect context
        const lastUserMsg = messages.filter(m => m.role === 'user').pop()?.content || '';
        // Tool pruning: context detection cho tất cả cycles (không bung full tools)
        // Cycle >= 3: chỉ giữ core + fetch_url để tiết kiệm token
        let selectedTools = selectRelevantTools(lastUserMsg);
        // Nếu cycle >= 3, lọc chỉ giữ core tools (list_directory, read_file, search_knowledge_graph, write_wiki_page) + fetch_url
        if (toolCallCycles >= 3) {
          const coreNames = ['list_directory', 'read_file', 'search_knowledge_graph', 'write_wiki_page', 'fetch_url'];
          selectedTools = selectedTools.filter((t: any) => coreNames.includes(t.function.name));
        }
        
        const toolsTokenEstimate = estimateToolsTokenCount(selectedTools);
        console.log(`📤 Tools selected: ${selectedTools.length}/${TOOLS_DEFINITION.length} (~${toolsTokenEstimate} tokens)`);

        const payload: any = {
          model: modelId,
          messages,
          tools: selectedTools,
          tool_choice: 'auto' as const,
          max_tokens: 4096, // ← FIX: tối ưu cho combo 4 free tier (8192 gây response rỗng)
        };

        const response = await resolved.provider.invoke(payload);
        const rawData = (response as any).data ? (response as any).data : response;

        if (!rawData?.choices?.[0]) {
          return {
            content: '❌ 9router trả về response rỗng. Thử lại sau.',
            modelUsed: modelId,
            providerUsed: resolved.providerName,
          };
        }

        const choice = rawData.choices[0];
        const finishReason = choice.finish_reason;

        // ── Trường hợp 1: Model trả lời trực tiếp (không cần tool) ──
        if (finishReason === 'stop') {
          finalContent = choice.message?.content || '';
          // Clean: loại bỏ prefix model header ở đầu response
          finalContent = finalContent.replace(/^[\w\/\.-]+:\s*/m, '');


          console.log(`✅ Got final response from ${modelId} after ${toolCallCycles} tool cycles`);

          // Evolution tracking: ghi nhận thành công
          evolutionEngine.recordSuccess(modelId, 0).catch(() => {});

          return {
            content: finalContent,
            modelUsed: modelId,
            providerUsed: resolved.providerName,
          };
        }

        // ── Trường hợp 2: Model yêu cầu gọi tool ──────────────────
        if (finishReason === 'tool_calls' && choice.message?.tool_calls) {
          // Push assistant message với tool_calls vào messages
          // Preserve nguyên vẹn tất cả fields (bao gồm reasoning_content cho DeepSeek thinking mode)
          const assistantMsg: any = {
            role: 'assistant',
            content: choice.message.content || null,
            tool_calls: choice.message.tool_calls,
          };
          // DeepSeek thinking mode: phải giữ reasoning_content
          if ((choice.message as any).reasoning_content) {
            assistantMsg.reasoning_content = (choice.message as any).reasoning_content;
          }
          messages.push(assistantMsg);

          toolCallCycles++;

          // Thực thi từng tool
          for (const toolCall of choice.message.tool_calls) {
            if (toolCall.type !== 'function') {
              console.warn(`⚠️ Non-function tool call skipped: ${toolCall.type}`);
              continue;
            }

            const toolResult = executeToolCall(toolCall);

            messages.push({
              role: 'tool',
              tool_call_id: toolCall.id,
              content: JSON.stringify(toolResult),
            });

            console.log(`🔧 Tool ${toolCall.function.name} executed (cycle ${toolCallCycles})`);
          }

          // Emit sự kiện cho UI biết đang xử lý
          this.emit('cascade', {
            sessionId: request.sessionId,
            type: 'trying',
            modelId,
            tier: 3,
          });

          // Quay lại đầu vòng lặp → gọi lại LLM với tool results
          continue;
        }

        // ── Trường hợp 3: finish_reason không xác định ──
        console.warn(`⚠️ Unknown finish_reason from 9router: ${finishReason}`);
        finalContent = choice.message?.content || 
          (choice.message?.tool_calls ? '⚠️ Đang xử lý yêu cầu...' : '❌ Phản hồi không mong đợi từ 9router.');
        finalContent = finalContent.replace(/^[\w\/\.-]+:\s*/m, '');

        return {
          content: finalContent,
          modelUsed: modelId,
          providerUsed: resolved.providerName,
        };

      } catch (err: any) {
        console.error(`❌ 9router error (cycle ${toolCallCycles}):`, err.message);
        
        // Evolution tracking: ghi nhận lỗi
        evolutionEngine.recordError({
          modelId,
          errorType: 'PROVIDER_DOWN',
          errorMessage: err.message,
          stackTrace: err.stack,
          sessionId: request.sessionId || 'unknown',
          contextSnippet: request.messages[request.messages.length - 1]?.content?.substring(0, 200),
        }).catch(() => {});
        
        return {
          content: `❌ Lỗi khi gọi 9router: ${err.message}`,
          modelUsed: 'none',
          providerUsed: 'none',
        };
      }
    }

    // ── Quá số vòng lặp tool call tối đa ──
    finalContent = '⚠️ Đã vượt quá số lần gọi công cụ cho phép. Vui lòng thử lại với yêu cầu đơn giản hơn.';
    return {
      content: finalContent,
      modelUsed: modelId,
      providerUsed: resolved.providerName,
    };
  }

  async saveMessage(sessionId: string, message: ChatMessage): Promise<void> {
    // KHÔNG lưu tool call messages vào memory (content = null, gây lỗi DeepSeek reasoning_content)
    // Chỉ lưu user message và final assistant response có nội dung
    if (message.content === null || message.content === undefined || message.content === '') {
      return;
    }
    await this.memory.addMessage(sessionId, message as any);
  }

  async getHistory(sessionId: string): Promise<ChatMessage[]> {
    return await this.memory.getChannelHistory(sessionId) as any;
  }

  listModels(): string[] {
    return this.registry.listModels();
  }

  detectFreeModel(): string {
    const models = this.listModels();
    return models[0] || 'oc/deepseek-v4-flash-free';
  }
}

export default Engine;