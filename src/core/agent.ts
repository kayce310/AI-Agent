/**
 * Kato Agent — Agent Lifecycle Orchestration
 * Phase 3.3 — Async Engine
 *
 * Wraps the ReAct loop with:
 * - HookRegistry for event-driven lifecycle
 * - ModelRouter for multi-provider fallback
 * - ToolRegistry for plugin-based tool execution
 *
 * Maintains backward compatibility with Engine.
 */

import { EventEmitter } from 'events';
import { HookRegistry, globalHooks, EventType } from './hooks.js';
import { ModelRouter } from './model-adapter.js';
import { ToolRegistry } from './tool-registry.js';
import { selectRelevantTools, estimateToolsTokenCount } from './tool-pruner.js';
import { evolutionEngine } from './evolution.js';
import { EngineRequest, EngineResponse, ChatMessage } from './types.js';

// ── Constants ──
const MAX_TOOL_CALL_CYCLES = 10;

// ── AgentConfig ──
export interface AgentConfig {
  modelRouter: ModelRouter;
  toolRegistry: ToolRegistry;
  hooks?: HookRegistry;
  maxToolCycles?: number;
  debug?: boolean;
}

// ── Agent Result ──
export interface AgentResult {
  content: string;
  modelUsed: string;
  providerUsed: string;
  toolCycles: number;
  finished: boolean;
}

// ── Agent Class ──
export class Agent extends EventEmitter {
  private modelRouter: ModelRouter;
  private toolRegistry: ToolRegistry;
  private hooks: HookRegistry;
  private maxToolCycles: number;
  private debug: boolean;

  constructor(config: AgentConfig) {
    super();
    this.modelRouter = config.modelRouter;
    this.toolRegistry = config.toolRegistry;
    this.hooks = config.hooks ?? globalHooks;
    this.maxToolCycles = config.maxToolCycles ?? MAX_TOOL_CALL_CYCLES;
    this.debug = config.debug ?? false;
  }

  get hookRegistry(): HookRegistry {
    return this.hooks;
  }

  /**
   * Register a lifecycle hook.
   * Wraps a simple data handler into a full HookHandler.
   */
  onEvent(event: EventType, handler: (data: Record<string, unknown>) => Promise<void>, priority = 0): () => void {
    return this.hooks.on(event, async (ctx) => {
      await handler(ctx.data);
    }, priority);
  }

  /**
   * Run the agent with a given request.
   * This is the main entry point — replaces Engine.process().
   */
  async run(request: EngineRequest): Promise<AgentResult> {
    // Build messages from request
    const messages = this.buildMessages(request);

    // Emit task:start
    await this.hooks.emit('task:start', {
      sessionId: request.sessionId,
      task: request.task,
      messageCount: messages.length,
    });

    try {
      const result = await this.executeReActLoop(request, messages);
      await this.hooks.emit('task:complete', {
        sessionId: request.sessionId,
        result,
      });
      return result;
    } catch (err: any) {
      await this.hooks.emit('task:error', {
        sessionId: request.sessionId,
        error: err.message,
        stack: err.stack,
      });
      throw err;
    }
  }

  // ── Private: Build Messages ──
  private buildMessages(request: EngineRequest): any[] {
    const recentMessages = request.messages.slice(-5);
    const historyMessages: any[] = [];

    for (const msg of recentMessages) {
      const sanitized: any = { role: msg.role };

      // Tool messages from ReAct cycles — content=null → placeholder
      if (msg.role === 'assistant' && (msg.content === null || msg.content === undefined)) {
        sanitized.content = '[tool call]';
      } else {
        sanitized.content = msg.content || '';
      }

      // Preserve reasoning_content (DeepSeek thinking mode)
      if ((msg as any).reasoning_content) {
        sanitized.reasoning_content = (msg as any).reasoning_content;
      }

      historyMessages.push(sanitized);
    }

    // System prompt will be prepended by the caller
    return historyMessages;
  }

  // ── Private: ReAct Loop ──
  private async executeReActLoop(request: EngineRequest, historyMessages: any[]): Promise<AgentResult> {
    const systemPrompt = request.systemPrompt || '';
    const messages: any[] = systemPrompt
      ? [{ role: 'system', content: systemPrompt }, ...historyMessages]
      : historyMessages;

    let toolCallCycles = 0;
    let finalContent = '';

    while (toolCallCycles < this.maxToolCycles) {
      try {
        // ── Select relevant tools ──
        const lastUserMsg = messages.filter((m: any) => m.role === 'user').pop()?.content || '';
        let selectedTools = selectRelevantTools(lastUserMsg);

        // Cycle >= 3: restrict to core tools only
        if (toolCallCycles >= 3) {
          const coreNames = ['list_directory', 'read_file', 'search_knowledge_graph', 'write_wiki_page', 'fetch_url'];
          selectedTools = selectedTools.filter((t: any) => coreNames.includes(t.function.name));
        }

        const toolsTokenEstimate = estimateToolsTokenCount(selectedTools);
        if (this.debug) {
          console.log(`📤 Tools selected: ${selectedTools.length}/${this.toolRegistry.toolCount} (~${toolsTokenEstimate} tokens)`);
        }

        // ── Invoke model via ModelRouter with fallback ──
        await this.hooks.emit('model:invoke', {
          sessionId: request.sessionId,
          toolCount: selectedTools.length,
          cycle: toolCallCycles,
        });

        const modelResult = await this.modelRouter.route(messages, {
          tools: selectedTools,
          maxTokens: 4096,
        });

        await this.hooks.emit('model:response', {
          sessionId: request.sessionId,
          modelUsed: modelResult.modelUsed,
          providerUsed: modelResult.providerUsed,
          finishReason: modelResult.finishReason,
          cycle: toolCallCycles,
        });

        if (this.debug) {
          console.log(`📤 Router used: ${modelResult.providerUsed}/${modelResult.modelUsed} (cycle ${toolCallCycles})`);
        }

        // ── Handle finish_reason ──
        if (modelResult.finishReason === 'stop') {
          finalContent = modelResult.content || '';
          finalContent = finalContent.replace(/^[\w\/\.-]+:\s*/m, '');

          if (this.debug) {
            console.log(`✅ Final response after ${toolCallCycles} tool cycles`);
          }

          evolutionEngine.recordSuccess(modelResult.modelUsed, 0).catch(() => {});

          return {
            content: finalContent,
            modelUsed: modelResult.modelUsed,
            providerUsed: modelResult.providerUsed,
            toolCycles: toolCallCycles,
            finished: true,
          };
        }

        // ── Tool calls ──
        if (modelResult.finishReason === 'tool_calls' && modelResult.toolCalls) {
          const assistantMsg: any = {
            role: 'assistant',
            content: modelResult.content || null,
            tool_calls: modelResult.toolCalls,
          };
          if (modelResult.reasoningContent) {
            assistantMsg.reasoning_content = modelResult.reasoningContent;
          }
          messages.push(assistantMsg);
          toolCallCycles++;

          for (const toolCall of modelResult.toolCalls) {
            if (toolCall.type !== 'function') {
              console.warn(`⚠️ Non-function tool call skipped: ${toolCall.type}`);
              continue;
            }

            await this.hooks.emit('tool:call', {
              sessionId: request.sessionId,
              toolName: toolCall.function.name,
              toolArgs: toolCall.function.arguments,
              cycle: toolCallCycles,
            });

            const toolResult = this.toolRegistry.executeToolCall(toolCall);

            await this.hooks.emit('tool:result', {
              sessionId: request.sessionId,
              toolName: toolCall.function.name,
              result: toolResult,
              cycle: toolCallCycles,
            });

            messages.push({
              role: 'tool',
              tool_call_id: toolCall.id,
              content: JSON.stringify(toolResult),
            });

            if (this.debug) {
              console.log(`🔧 Tool ${toolCall.function.name} executed (cycle ${toolCallCycles})`);
            }
          }

          this.emit('cascade', {
            sessionId: request.sessionId,
            type: 'trying',
            modelUsed: modelResult.modelUsed,
            tier: 3,
          });

          continue;
        }

        // ── Unknown finish_reason ──
        console.warn(`⚠️ Unknown finish_reason: ${modelResult.finishReason}`);
        finalContent = modelResult.content ||
          (modelResult.toolCalls?.length ? '⚠️ Đang xử lý yêu cầu...' : '❌ Phản hồi không mong đợi.');

        return {
          content: finalContent,
          modelUsed: modelResult.modelUsed,
          providerUsed: modelResult.providerUsed,
          toolCycles: toolCallCycles,
          finished: true,
        };

      } catch (err: any) {
        await this.hooks.emit('model:error', {
          sessionId: request.sessionId,
          error: err.message,
          cycle: toolCallCycles,
        });

        console.error(`❌ Model error (cycle ${toolCallCycles}):`, err.message);

        evolutionEngine.recordError({
          modelId: 'unknown',
          errorType: 'MODEL_ERROR',
          errorMessage: err.message,
          stackTrace: err.stack,
          sessionId: request.sessionId || 'unknown',
          contextSnippet: request.messages[request.messages.length - 1]?.content?.substring(0, 200),
        }).catch(() => {});

        // If there's a fallback, the ModelRouter already tried it.
        // If we get here, all adapters failed.
        return {
          content: `❌ Lỗi khi gọi model: ${err.message}`,
          modelUsed: 'none',
          providerUsed: 'none',
          toolCycles: toolCallCycles,
          finished: true,
        };
      }
    }

    // ── Max cycles exceeded ──
    return {
      content: '⚠️ Đã vượt quá số lần gọi công cụ cho phép. Vui lòng thử lại với yêu cầu đơn giản hơn.',
      modelUsed: 'unknown',
      providerUsed: 'unknown',
      toolCycles: toolCallCycles,
      finished: true,
    };
  }
}

export default Agent;