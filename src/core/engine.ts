/**
 * Kato Agent — Core Engine
 * Framework 6 Layers — Lớp Lõi (Core Domain)
 * 
 * Nhận request từ bất kỳ Adapter nào (Discord, CLI, Telegram...).
 * Hoàn toàn "mù" về platform. Chỉ biết: request → response.
 * 
 * [V5.2] Native Function Calling + Execution Loop
 * [V5.2] Multi-Tier Cascade với cooldown
 * [V5.2] Knowledge Tools: search_knowledge_graph, write_wiki_page, process_new_raw_data
 */

import { EventEmitter } from 'events';
import { readFile } from 'fs/promises';
import MemoryCore from './memory.js';
import MemoryCompressor from './memory-compressor.js';
import ProviderRegistry from './provider-registry.js';
import PromptBuilder from './prompt-builder.js';
import { tools, toolDefinitions } from './tools.js';
import { EngineRequest, EngineResponse, ChatMessage, CascadeEvent } from './types.js';
import { katoStateManager } from './state-manager.js';
import { evolutionEngine } from './evolution.js';

/**
 * Core Engine — trung tâm xử lý, platform-agnostic.
 * V5.2: Native Function Calling + Execution Loop + Knowledge Tools.
 */
export class Engine extends EventEmitter {
  private registry: ProviderRegistry;
  private memory: MemoryCore;
  private compressor: MemoryCompressor;

  constructor(registry?: ProviderRegistry) {
    super();
    this.registry = registry ?? new ProviderRegistry();
    this.memory = new MemoryCore();
    this.compressor = new MemoryCompressor();
  }

  async init(): Promise<void> {
    this.registry.loadFromConfig();
    await evolutionEngine.init();
    await evolutionEngine.loadDefaultRules();
    console.log(`✅ Engine initialized with ${this.registry.listModels().length} models`);
    console.log(`🧬 Evolution: ${evolutionEngine.getStats().totalErrorsTracked} errors tracked, ${evolutionEngine.getStats().activeRules} rules active`);
  }

  /** Thực thi tool call và trả về kết quả dạng string */
  private async executeToolCall(toolCall: { name: string; arguments: string }): Promise<string> {
    const funcName = toolCall.name;
    const funcArgs = JSON.parse(toolCall.arguments);
    const toolFn = (tools as any)[funcName];
    if (!toolFn) {
      return `Error: Tool "${funcName}" không tồn tại. Tools có sẵn: ${Object.keys(tools).join(', ')}`;
    }
    try {
      const result = await toolFn(...Object.values(funcArgs));
      return String(result);
    } catch (e: any) {
      return `Error executing ${funcName}: ${e.message}`;
    }
  }

  /**
   * Đọc context files nếu được yêu cầu (Tầng 2)
   */
  private async loadContextFiles(filePaths: string[]): Promise<string> {
    const contents: string[] = [];
    for (const fp of filePaths) {
      try {
        const content = await readFile(fp, 'utf8');
        contents.push(`--- ${fp} ---\n${content.slice(0, 3000)}`);
      } catch {
        console.warn(`⚠️ Could not read context file: ${fp}`);
      }
    }
    return contents.join('\n\n');
  }

  async process(request: EngineRequest): Promise<EngineResponse> {
    // ── Tầng 2: Load context files ──
    let contextFilesContent = '';
    if (request.requiredContextFiles && request.requiredContextFiles.length > 0) {
      console.log(`📂 Loading ${request.requiredContextFiles.length} context files...`);
      contextFilesContent = await this.loadContextFiles(request.requiredContextFiles);
    }

    // ── Build 8-tầng system prompt ──
    const promptBuilder = new PromptBuilder();
    const systemPrompt = promptBuilder.buildSystem({
      agentName: request.agentName,
      mentionPrefix: request.mentionPrefix,
      task: request.task,
      contextFiles: contextFilesContent || undefined,
      references: request.references,
      constraints: request.constraints,
      currentRequest: request.messages[request.messages.length - 1]?.content || '',
    });

    // 🔥 Nén context bằng MemoryCompressor trước khi gửi
    let compressedContext = "";
    try {
      const mappedMessages = request.messages.map(msg => ({
        role: msg.role === 'tool' ? 'assistant' as const : msg.role as 'user' | 'assistant' | 'system',
        content: msg.content,
        timestamp: Date.now()
      }));
      compressedContext = await this.compressor.compressHistory(mappedMessages);
    } catch {
      console.warn("⚠️ MemoryCompressor failed, falling back to raw slice(-5)");
    }

    // ── Build messages ──
    let messages: any[];
    const promptBuilder2 = new PromptBuilder();
    if (compressedContext) {
      messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: promptBuilder2.buildUserMessage(compressedContext, request.messages[request.messages.length - 1]?.content || '') }
      ];
    } else {
      const recentMessages = request.messages.slice(-5);
      messages = [
        { role: 'system', content: systemPrompt },
        ...recentMessages.map(msg => ({
          role: msg.role,
          content: msg.content
        }))
      ];
    }

    // Multi-Tier Cascade Logic
    const specs = this.registry.getModelSpecs();
    const cooldowns = await this.getCooldowns();
    
    // Sort by tier (1 is highest priority) and filter out cooling down models
    const availableModels = specs
      .filter(s => !this.isCoolingDown(s.id, cooldowns))
      .sort((a, b) => (a.tier || 3) - (b.tier || 3));

    if (availableModels.length === 0) {
      return { content: "⚠️ Tất cả các model đều đang trong thời gian chờ hoặc không khả dụng.", modelUsed: 'none', providerUsed: 'none' };
    }

    const requestContextSnippet = request.messages[request.messages.length - 1]?.content?.slice(0, 200) || '';

    // 🧬 Kiểm tra evolution trước khi loop
    const routingAdvice = evolutionEngine.getRoutingAdvice();
    if (routingAdvice) {
      const advisedModel = availableModels.find(m => m.id === routingAdvice.preferredModel);
      if (advisedModel) {
        console.log(`🧬 Evolution routing: preferring ${routingAdvice.preferredModel} (${routingAdvice.reason})`);
        // Đưa model được đề xuất lên đầu
        const idx = availableModels.indexOf(advisedModel);
        if (idx > 0) {
          availableModels.splice(idx, 1);
          availableModels.unshift(advisedModel);
        }
      }
    }

    for (let i = 0; i < availableModels.length; i++) {
      const modelSpec = availableModels[i];
      const modelId = modelSpec.id;
      const resolved = this.registry.resolve(modelId);
      
      if (!resolved) continue;

      // 🧬 Kiểm tra evolution skip
      if (evolutionEngine.shouldSkipModel(modelId)) {
        console.log(`⏭️ [EVOLUTION] Skipping ${modelId} due to high failure rate`);
        continue;
      }

      try {
        console.log(`📤 [CASCADE] Attempt ${i + 1}: Using ${modelId} (Tier ${modelSpec.tier})`);
        
        const startTime = Date.now();
        
        this.emit('cascade', {
          sessionId: request.sessionId,
          type: 'trying',
          step: i + 1,
          modelId,
          tier: modelSpec.tier
        } as CascadeEvent);

        // ReAct Loop
        let currentMessages = [...messages];
        let finalResponse: EngineResponse | null = null;

        while (true) {
          const payload = { 
            model: modelId, 
            messages: currentMessages,
            tools: toolDefinitions?.map(t => ({
              type: "function",
              function: t
            }))
          };
          
          const response = await resolved.provider.invoke(payload);
          const responseData = (response as any).data ? (response as any).data : response;

          if (!responseData || !responseData.choices || responseData.choices.length === 0) {
            throw new Error("Invalid API response format");
          }

          const responseMessage = responseData.choices[0].message;
          currentMessages.push(responseMessage);

          // Nếu model yêu cầu tool calls → thực thi
          if (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
            console.log(`🔥 [TOOL-CALL] Executing ${responseMessage.tool_calls.length} tools...`);
            
            for (const toolCall of responseMessage.tool_calls) {
              const toolResult = await this.executeToolCall({
                name: toolCall.function.name,
                arguments: toolCall.function.arguments
              });
              
              currentMessages.push({
                role: "tool",
                tool_call_id: toolCall.id,
                content: toolResult
              });
            }
            continue; // Loop back to LLM with tool results
          }

          // Nếu model có text response → done
          if (responseMessage.content) {
            finalResponse = { content: responseMessage.content, modelUsed: modelId, providerUsed: resolved.providerName };
            break;
          } else {
            throw new Error("Empty content from model after tool execution");
          }
        }

        // 🧬 Ghi nhận thành công
        const responseTime = Date.now() - startTime;
        await evolutionEngine.recordSuccess(modelId, responseTime);

        return finalResponse!;

      } catch (err: any) {
        console.error(`❌ [CASCADE] Model ${modelId} failed:`, err.message);

        // 🧬 Ghi nhận lỗi vào evolution engine
        const errorType = err.status === 429 || err.message.includes('rate limit') || err.message.includes('429')
          ? 'RATE_LIMIT'
          : err.message.includes('ETIMEDOUT') || err.message.includes('ECONNREFUSED') || err.message.includes('ENOTFOUND')
          ? 'PROVIDER_DOWN'
          : err.message.includes('Invalid API response') || err.message.includes('JSON')
          ? 'PARSE_ERROR'
          : err.message.includes('Error executing') || err.message.includes('tool_call')
          ? 'TOOL_EXECUTION'
          : 'GENERIC';
        
        await evolutionEngine.recordError({
          modelId,
          errorType,
          errorMessage: err.message,
          stackTrace: err.stack,
          sessionId: request.sessionId,
          contextSnippet: requestContextSnippet,
        });

        // Cooldown nếu rate limit
        if (errorType === 'RATE_LIMIT') {
          await this.setCooldown(modelId);
        }

        this.emit('cascade', {
          sessionId: request.sessionId,
          type: 'failed',
          step: i + 1,
          modelId,
          tier: modelSpec.tier,
          errorMessage: err.message
        } as CascadeEvent);

        continue;
      }
    }

    // 🧬 All models failed — log final error
    await evolutionEngine.recordError({
      modelId: 'ALL',
      errorType: 'CASCADE_EXHAUSTED',
      errorMessage: `All ${availableModels.length} available models exhausted`,
      sessionId: request.sessionId,
      contextSnippet: requestContextSnippet,
    });

    return { content: "❌ Đã thử tất cả các model khả dụng nhưng đều thất bại.", modelUsed: 'none', providerUsed: 'none' };
  }

  async saveMessage(sessionId: string, message: ChatMessage): Promise<void> {
    await this.memory.addMessage(sessionId, message as any);
  }

  async getHistory(sessionId: string): Promise<ChatMessage[]> {
    return await this.memory.getChannelHistory(sessionId) as any;
  }

  listModels(): string[] {
    return this.registry.listModels();
  }

  /** Tự động dò model free khả dụng */
  detectFreeModel(): string {
    const models = this.listModels();
    const claudeFree = models.find(m => m.toLowerCase().includes('claude') && m.endsWith(':free'));
    if (claudeFree) return claudeFree;
    const anyFree = models.find(m => m.endsWith(':free'));
    if (anyFree) return anyFree;
    return models[0] || 'kr/claude-sonnet-4.5';
  }

  private async getCooldowns(): Promise<Record<string, string>> {
    const state = await katoStateManager.read();
    return (state.ok && state.data.modelCooldowns) ? state.data.modelCooldowns : {};
  }

  private async setCooldown(modelId: string): Promise<void> {
    const cooldowns = await this.getCooldowns();
    const end = new Date();
    end.setHours(end.getHours() + 6);
    cooldowns[modelId] = end.toISOString();
    await katoStateManager.update({ modelCooldowns: cooldowns });
    console.log(`❄️ [COOLDOWN] Model ${modelId} is cooling down until ${end.toISOString()}`);
  }

  private isCoolingDown(modelId: string, cooldowns: Record<string, string>): boolean {
    const endStr = cooldowns[modelId];
    if (!endStr) return false;
    const end = new Date(endStr);
    return end > new Date();
  }
}

export default Engine;