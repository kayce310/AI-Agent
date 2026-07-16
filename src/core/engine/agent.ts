/**
 * @file Agent — Agent Lifecycle Orchestration
 * @layer core
 * @depends-on src/core/tools/tool-registry.ts, src/core/tools/tool-pruner.ts, src/core/llm/model-adapter.ts, src/core/hooks.ts
 * @imported-by src/core/engine/engine.ts
 * @owner core-engine
 *
 * Coral Agent — Agent Lifecycle Orchestration
 * Phase 3.3 — Async Engine
 *
 * Wraps the ReAct loop with:
 * - HookRegistry for event-driven lifecycle
 * - ModelRouter for multi-provider fallback
 * - ToolRegistry for plugin-based tool execution
 *
 * Maintains backward compatibility with Engine.
 */

import { Logger } from '../logger.js';
import { EventEmitter } from 'events';
import { HookRegistry, globalHooks, EventType, GuardHandler } from '../hooks.js';
import { ModelRouter } from '../llm/model-adapter.js';
import { ToolRegistry } from '../tools/tool-registry.js';
import { selectRelevantTools, estimateToolsTokenCount } from '../tools/tool-pruner.js';
import { evolutionEngine } from '../evolution.js';
import { Tracer } from '../observability/tracer.js';
import { Janitor } from '../agents/janitor.js';
import { EngineRequest, EngineResponse, ChatMessage } from '../types.js';
import { compressContext } from '../context-compression.js';
import { estimateTokens } from './token-estimator.js';
import { CircuitBreaker, engineCircuitBreaker } from '../circuit-breaker.js';
import type { CheckpointStore } from '../checkpoint.js';
import { ContextWindowManager, getContextManager } from '../context-window.js';
import { R } from '../runtime-instrumentation.js';

/**
 * Find sentence boundary for clean trimming.
 * Returns the index of the last sentence boundary (.!?\n) before maxLength.
 * Returns -1 if no good boundary found.
 */
function findSentenceBoundary(text: string, maxLength: number): number {
  if (text.length <= maxLength) return text.length;
  
  // Look for sentence boundaries in the last 20% of the target range
  const searchStart = Math.max(0, maxLength - Math.floor(maxLength * 0.2));
  const slice = text.slice(searchStart, maxLength);
  
  // Priority: newline > period > exclamation > question mark
  const boundaries = [
    { char: '\n', regex: /\n\s*\n/g },  // Paragraph break
    { char: '.', regex: /[.!?]\s+/g },  // Sentence end
    { char: ',', regex: /,\s+/g },      // Clause break
  ];
  
  for (const { regex } of boundaries) {
    let lastMatch = -1;
    let match;
    while ((match = regex.exec(slice)) !== null) {
      lastMatch = searchStart + match.index + match[0].length;
    }
    if (lastMatch > 0) return lastMatch;
  }
  
  return -1; // No good boundary found
}

const log = new Logger({ module: 'Agent' });

/** Check if the operation has been cancelled via AbortSignal. */
function checkAbort(signal?: AbortSignal): void {
  if (signal?.aborted) throw new Error('Operation cancelled');
}

/**
 * Response-type classification — pure structure-based, no NLP heuristics.
 *
 * The model has exactly TWO valid output paths:
 *   1. Call a tool via the API's built-in tool_call mechanism.
 *   2. Write a direct text answer.
 *
 * There is NO third path for "planning text" or "intent description".
 * If the model wrote text, that text IS the intended answer — no regex guessing,
 * no content-length threshold, no /let me/i pattern detection.
 * This mirrors exactly how Hermes agent handles responses: API structure only.
 */
type ResponseType = 'NEED_TOOL' | 'FINAL_ANSWER' | 'UNPARSEABLE';

function classifyResponse(content: string, toolCalls: any[]): ResponseType {
  // 1. Structured tool calls from API — highest priority
  if (toolCalls.length > 0) return 'NEED_TOOL';

  // 2. Empty / garbage content — no meaningful response at all
  const trimmed = (content || '').trim();
  if (!trimmed || trimmed.length < 3) return 'UNPARSEABLE';

  // 3. Everything else is FINAL_ANSWER
  //    No NLP. No regex. No content-length threshold.
  //    The model either called a tool (handled above) or wrote a text response.
  //    Trust the text as the intended answer — even if it starts with "Let me".
  return 'FINAL_ANSWER';
}

// ── Constants ──
const MAX_TOOL_CALL_CYCLES = 15;
const MAX_READ_CALLS = parseInt(process.env.CORAL_MAX_READ_CALLS || '12');


// ── AgentConfig ──
export interface AgentConfig {
  modelRouter: ModelRouter;
  toolRegistry: ToolRegistry;
  hooks?: HookRegistry;
  tracer?: Tracer;
  maxToolCycles?: number;
  maxReadCalls?: number;
  auxiliaryLlmCall?: (prompt: string) => Promise<string>;
  debug?: boolean;
  /** CheckpointStore reference for cycle-level persistence */
  checkpointStore?: CheckpointStore;
  /** ContextWindowManager for token budget management */
  contextManager?: ContextWindowManager;
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
  private tracer?: Tracer;
  private maxToolCycles: number;
    private maxReadCalls: number;
    private auxiliaryLlmCall?: (prompt: string) => Promise<string>;
    private debug: boolean;
    private janitor?: Janitor;
    private circuitBreaker: CircuitBreaker;
    private checkpointStore?: CheckpointStore;
    private contextManager: ContextWindowManager;
    private sessionStartTimes = new Map<string, number>();

  constructor(config: AgentConfig) {
    super();
    this.modelRouter = config.modelRouter;
    this.toolRegistry = config.toolRegistry;
    this.hooks = config.hooks ?? globalHooks;
    this.tracer = config.tracer;
    this.maxToolCycles = config.maxToolCycles ?? MAX_TOOL_CALL_CYCLES;
        this.maxReadCalls = config.maxReadCalls ?? MAX_READ_CALLS;
        this.auxiliaryLlmCall = config.auxiliaryLlmCall;
        this.debug = config.debug ?? false;
        this.circuitBreaker = engineCircuitBreaker;
        this.checkpointStore = config.checkpointStore;
        this.contextManager = config.contextManager ?? getContextManager();

    // Auto-attach tracer to hooks if provided
    if (this.tracer) {
      this.tracer.attachToHooks(this.hooks);
    }

    // Janitor available for manual/opt-in use only.
    // NOT auto-wired to task:complete — that would run "npx vitest run" after EVERY response,
    // even for simple conversational queries. Janitor is for verifying system integrity
    // after intentional code/tool write operations, not for chat responses.
    this.maxReadCalls = config.maxReadCalls ?? MAX_READ_CALLS;

  }

  get hookRegistry(): HookRegistry {
    return this.hooks;
  }

  /** Get the engine circuit breaker (for monitoring) */
  get circuitBreakerState() {
    return this.circuitBreaker;
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
   * Register a guard for a specific event type.
   * Guards run BEFORE hooks. If any guard returns { allowed: false },
   * the event is blocked.
   */
  onBefore(event: EventType, handler: GuardHandler, priority = 0): () => void {
    return this.hooks.before(event, handler, priority);
  }

  /**
   * Strip consecutive duplicate paragraphs from LLM output.
   * Some providers/models return the same content twice in a single response.
   */
  private deduplicateResponse(content: string): string {
    // Split into paragraph-blocks by blank lines
    const paragraphs = content.split(/\n\s*\n/);
    if (paragraphs.length <= 1) return content; // single paragraph, nothing to dedup

    const seen = new Set<string>();
    const deduped: string[] = [];
    for (const p of paragraphs) {
      const trimmed = p.trim();
      // Normalize: collapse internal whitespace for comparison only
      const normalized = trimmed.replace(/\s+/g, ' ');
      if (!seen.has(normalized)) {
        seen.add(normalized);
        deduped.push(p);
      }
    }
    return deduped.join('\n\n');
  }

  private sanitizeFinalResponse(content: string): string {
    let cleaned = content
      .replace(/<longcat_tool_call[\s\S]*?<\/longcat_tool_call>/gi, '')
      .replace(/<tool_call[\s\S]*?<\/tool_call>/gi, '')
      .trim();
    // Dedup consecutive duplicate paragraphs (provider streaming workaround)
    cleaned = this.deduplicateResponse(cleaned);
    return cleaned;
  }

  /**
   * Run the agent with a given request.
   * This is the main entry point — replaces Engine.process().
   */
  async run(request: EngineRequest, abortSignal?: AbortSignal): Promise<AgentResult> {
    log.info(`agent.run() called — task: "${request.task?.slice(0,50)}" messages: ${request.messages.length} model: ${request.modelId || 'default'}`);
    // Build messages from request
    const messages = this.buildMessages(request);
    checkAbort(abortSignal);

    // Emit task:start
    await this.hooks.emit('task:start', {
      sessionId: request.sessionId,
      task: request.task,
      messageCount: messages.length,
    });

    try {
      const result = await this.executeReActLoop(request, messages, abortSignal);
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

  // ── Private: Check if question is self-referential ──
  private isSelfReferential(message: string): boolean {
    const selfPatterns = [
      /bạn\s+là\s+ai/i,
      /bạn\s+thực\s+hiện\s+.*thế\s+nào/i,
      /kiến\s+trúc/i,
      /cấu\s+trúc/i,
      /tools?\s+của\s+bạn/i,
      /bạn\s+có\s+những/i,
      /flow\s+xử\s+lý/i,
      /quy\s+trình/i,
      /bạn\s+làm\s+gì/i,
      /bạn\s+biết\s+gì/i,
      /hãy\s+giới\s+thiệu\s+bản\s+thân/i,
      /giới\s+thiệu\s+về\s+bạn/i,
      /who\s+are\s+you/i,
      /your\s+architecture/i,
      /your\s+tools/i,
      /how\s+do\s+you\s+work/i,
      /what\s+can\s+you\s+do/i,
    ];
    return selfPatterns.some(p => p.test(message));
  }

  // ── Private: Token-Aware Context Management ──

  /**
   * Check token usage and auto-compress if approaching limit.
   * Returns true if messages were modified.
   */
  private async ensureTokenBudget(
    messages: any[],
    maxContext: number,
    sessionId: string,
    focusTopic?: string,
  ): Promise<boolean> {
    const { total } = estimateTokens(messages);
    const usagePct = (total / maxContext) * 100;

    // Under 75% — no action needed
    if (usagePct < 75) return false;

    log.info(`Token usage: ${total.toLocaleString()}/${maxContext.toLocaleString()} (${usagePct.toFixed(1)}%)`);

    // 75-85%: attempt compression
    if (usagePct < 85) {
      if (!this.auxiliaryLlmCall) return false;

      const result = await compressContext(messages, this.auxiliaryLlmCall, {
        maxContext,
        thresholdPct: 0.75,
        tailProtect: 5,
        focusTopic,
      });

      if (result.compressed) {
        messages.length = 0;
        messages.push(...result.messages);
        log.info(`Compressed: ${result.tokensBefore?.toLocaleString()} → ${result.tokensAfter?.toLocaleString()} tokens`);
        await this.hooks.emit('context:compressed', {
          sessionId,
          tokensBefore: result.tokensBefore,
          tokensAfter: result.tokensAfter,
          newSessionId: result.sessionId,
          cycle: 0,
        });
        return true;
      }
    }

    // 85%+: force compression + hard trim if still over
    if (this.auxiliaryLlmCall) {
      const result = await compressContext(messages, this.auxiliaryLlmCall, {
        maxContext,
        thresholdPct: 0.70,
        tailProtect: 5,
        force: true,
        focusTopic,
      });

      if (result.compressed) {
        messages.length = 0;
        messages.push(...result.messages);
        log.info(`Force compressed: ${result.tokensBefore?.toLocaleString()} → ${result.tokensAfter?.toLocaleString()} tokens`);
      }
    }

    // 85%+: Use ContextWindowManager for importance-scored eviction
    const { total: afterCompress } = estimateTokens(messages);
    if (afterCompress > maxContext * 0.85) {
      const result = this.contextManager.evictToBudget(messages, sessionId);
      if (result.evicted > 0) {
        messages.length = 0;
        messages.push(...result.messages);
        log.info(
          `Context evicted: ${afterCompress.toLocaleString()} → ${this.contextManager.estimateTokens(messages).toLocaleString()} tok ` +
          `(${result.evicted} msg(s) dropped, ${result.saved} kept)`
        );
        await this.hooks.emit('context:evicted', {
          sessionId,
          tokensBefore: afterCompress,
          tokensAfter: this.contextManager.estimateTokens(messages),
          evicted: result.evicted,
          saved: result.saved,
        });
        return true;
      }
    }

    return false;
  }

  // ── Private: Build Messages ──
  private buildMessages(request: EngineRequest): any[] {
    // Use ALL messages from request (history is already loaded by Gateway)
    // Only sanitize — don't slice, Gateway already limits to 20
    const historyMessages: any[] = [];

    for (const msg of request.messages) {
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

    return historyMessages;
  }

  // ── Private: ReAct Loop ──
  private async executeReActLoop(request: EngineRequest, historyMessages: any[], abortSignal?: AbortSignal): Promise<AgentResult> {
    const requestId = request.sessionId || `req-${Date.now()}`;
    R.startRequest(requestId);
    R.state({ event: 'RECEIVED', requestId, cycle: 0 });
    // Track session start time for duration logging
    if (request.sessionId && !this.sessionStartTimes.has(request.sessionId)) {
      this.sessionStartTimes.set(request.sessionId, Date.now());
    }
    const systemPrompt = request.systemPrompt || '';
    // ── Structured response format instruction ──
    // Tells the model exactly what output paths are valid (tool_call or direct answer).
    // Eliminates "Let me look at X" / "tôi sẽ kiểm tra" planning text at the source,
    // so no heuristic classifyResponse is needed downstream.
    // Mirrors the approach of Hermes agent's TOOL_USE_ENFORCEMENT_GUIDANCE.
    const FORMAT_INSTRUCTION =
      '\n\n# Response Format\n' +
      'You must respond in ONE of these two formats, never both in the same response:\n\n' +
      '1. **Tool call** — If you need to take an action (read a file, search, run code, etc.), ' +
      'use the API\'s built-in function/tool_call mechanism with structured arguments. ' +
      'Do NOT describe the tool call in text.\n\n' +
      '2. **Direct answer** — If you already have enough information or the task is complete, ' +
      'write your answer in plain text. This text IS shown verbatim to the user as your final response.\n\n' +
      '**CRITICAL — Never do these:**\n' +
      '- Never write "Let me look at X", "I\'ll search for Y", "để tôi kiểm tra", "tôi sẽ tìm" ' +
      'or any sentence describing a future action.\n' +
      '- Never end a turn with a promise. If you need to do something, do it NOW via a tool call.\n' +
      '- Any text you write without a tool call IS YOUR FINAL ANSWER. The system does not ' +
      'intercept "planning language" — what you write is what the user sees.\n' +
      '- If a tool or operation fails, report the blocker honestly. Do not fabricate results.';
    const fullSystemPrompt = systemPrompt
      ? `${systemPrompt}${FORMAT_INSTRUCTION}`
      : FORMAT_INSTRUCTION;
    const messages: any[] = [{ role: 'system', content: fullSystemPrompt }, ...historyMessages];

    // ── Token-aware context budget check ──
    await this.ensureTokenBudget(messages, 128_000, request.sessionId, (request as any).focusTopic);

    // ── Self-referential shortcut ──
    // If the question is about Coral itself, skip tool loop entirely
    const lastUserMsg = historyMessages.filter((m: any) => m.role === 'user').pop()?.content || '';
    if (this.isSelfReferential(lastUserMsg)) {
      log.info(`Self-referential detected: "${lastUserMsg.slice(0,50)}" → direct LLM call (no tools)`);
      try {
        const modelResult = await this.modelRouter.route(messages, {
          model: request.modelId && request.modelId !== 'default' ? request.modelId : undefined,
          tools: [],  // No tools — answer directly from system prompt
          maxTokens: 4096,
        });
        let content = modelResult.content || '';
        content = content.replace(/^[\w\/\.-]+:\s*/m, '');
        content = this.sanitizeFinalResponse(content);

        evolutionEngine.recordSuccess(modelResult.modelUsed, 0).catch(() => {});

        return {
          content,
          modelUsed: modelResult.modelUsed,
          providerUsed: modelResult.providerUsed,
          toolCycles: 0,
          finished: true,
        };
      } catch (err: any) {
        // Fall through to normal ReAct loop on error
        log.info(`Direct call failed, falling back to ReAct loop: ${err.message}`);
      }
    }

    let toolCallCycles = 0;
    let finalContent = '';
    let readToolCount = 0;      // Track read-heavy tool calls for loop detection
    let readLoopForced = false; // Prevent duplicate force-synthesis injections
    const READ_TOOLS = new Set(['read_file', 'list_directory', 'search_knowledge_graph']);
    const MAX_READ_CALLS = 8;   // Max read-heavy calls before forcing synthesis

    while (toolCallCycles < this.maxToolCycles) {
      checkAbort(abortSignal);
      R.startCycle(requestId, toolCallCycles);
      if (toolCallCycles > 0) R.state({ event: 'NEXT_CYCLE', requestId, cycle: toolCallCycles });
      // ── Circuit breaker: stop if service is degraded ──
      if (!this.circuitBreaker.isHealthy()) {
        log.warn(`Circuit breaker OPEN — stopping after ${toolCallCycles} cycles`);
        R.state({ event: 'FAILED', requestId, cycle: toolCallCycles, error: 'circuit_breaker_open' });
        R.state({ event: 'RETURN_ERROR', requestId, cycle: toolCallCycles, error: 'circuit_breaker_open' });
        return {
          content: '⚠️ Dịch vụ đang gặp sự cố. Vui lòng thử lại sau 1 phút.',
          modelUsed: 'circuit-breaker',
          providerUsed: 'circuit-breaker',
          toolCycles: toolCallCycles,
          finished: true,
        };
      }

      try {
        R.state({ event: 'BUILD_PROMPT', requestId, cycle: toolCallCycles });
        // ── Select relevant tools ──
        const lastUserMsg = messages.filter((m: any) => m.role === 'user').pop()?.content || '';
        let selectedTools = selectRelevantTools(lastUserMsg);
        log.info(`selectRelevantTools("${lastUserMsg.slice(0,50)}") → ${selectedTools.length} tools: [${selectedTools.map((t:any) => t.function?.name).join(', ')}]`);

        // Fallback: if pruner returned empty (cache miss), use full registry
        if (selectedTools.length === 0) {
          selectedTools = this.toolRegistry.getDefinitions();
          /* tool pruner empty, using full registry */
        }

        // Cycle >= 3: restrict to core tools only to prevent runaway loops.
        // However, `read_file`/`list_directory`/`search_knowledge_graph`
        // without `web_search` traps the LLM. Keep all tools available and
        // use read-loop detection (below) to force synthesis instead.
        // NOTE: Removed the coreNames filter — it was causing infinite
        // read-file loops (23+ consecutive read_file calls in the OPi Zero 3 task).

        const toolsTokenEstimate = estimateToolsTokenCount(selectedTools);
        /* tools selected */

        // ── Invoke model via ModelRouter with streaming support (Phase 4E-B.3) ──
        await this.hooks.emit('model:invoke', {
          sessionId: request.sessionId,
          toolCount: selectedTools.length,
          cycle: toolCallCycles,
        });

        if (request.onThinking) {
          const currentGoal = request.currentGoal || request.task || '';
          await request.onThinking(`🤔 ${currentGoal ? `Đang phân tích: "${currentGoal.slice(0, 60)}..."` : 'Đang suy nghĩ...'}`);
        }

        let modelResult: any;
        const modelOptions = {
          model: request.modelId && request.modelId !== 'default' ? request.modelId : undefined,
          tools: selectedTools,
          maxTokens: 4096,
        };

        // Try streaming first, fallback to regular invoke on error
        // Wrapped in circuit breaker — consecutive failures will open the circuit
        R.state({ event: 'CALL_MODEL', requestId, cycle: toolCallCycles, finishReason: selectedTools.length > 0 ? `tools:${selectedTools.length}` : 'no_tools' });
        R.waitBegin({ requestId, label: `modelRouter.invoke.cycle${toolCallCycles}`, callerFile: 'agent.ts', callerLine: 476 });
        modelResult = await this.circuitBreaker.execute(async () => {
          try {
            if ((this.modelRouter as any).getAdapter('9router')?.invokeStreaming) {
              const adapter = (this.modelRouter as any).getAdapter('9router');
              const taskId = request.sessionId;
              
              return await adapter.invokeStreaming(
                messages,
                taskId,
                (chunk: string, isFinal: boolean) => {
                  // Emit reasoning_updated via hooks so listeners can forward to EventBus
                  (this.hooks as any).emit('reasoning:update', {
                    sessionId: taskId,
                    chunk,
                    isFinal,
                  });

                  // Show actual reasoning content live
                  if (request.onThinking && chunk && !isFinal) {
                    const cleanChunk = chunk.replace(/<[^>]*>/g, '').trim();
                    // Skip step/phase headers — not useful as thinking display
                    if (/^(Step|Bước|Phase)\s+\d+/i.test(cleanChunk)) return;
                    if (cleanChunk.length > 10) {
                      request.onThinking(`💭 ${cleanChunk.slice(0, 150)}`);
                    }
                  }
                },
                modelOptions
              );
            } else {
              // Fallback: regular invoke
              return await this.modelRouter.route(messages, modelOptions);
            }
          } catch (err: any) {
            log.warn(`[STREAMING] Failed, falling back to invoke(): ${err.message}`);
            return await this.modelRouter.route(messages, modelOptions);
          }
        });

        R.waitEnd({ requestId, label: `modelRouter.invoke.cycle${toolCallCycles}`, callerFile: 'agent.ts', callerLine: 513 });
        R.state({
          event: 'MODEL_RESPONSE',
          requestId,
          cycle: toolCallCycles,
          finishReason: modelResult.finishReason,
          toolCallsCount: modelResult.toolCalls?.length || 0,
        });
        if (modelResult.toolCalls?.length > 0) {
          R.rawToolCalls({ requestId, cycle: toolCallCycles, raw: JSON.stringify(modelResult.toolCalls), status: 'RAW_FROM_MODEL' });
        }

        await this.hooks.emit('model:response', {
          sessionId: request.sessionId,
          modelUsed: modelResult.modelUsed,
          providerUsed: modelResult.providerUsed,
          finishReason: modelResult.finishReason,
          cycle: toolCallCycles,
          content: modelResult.content || null,
          reasoningContent: modelResult.reasoningContent || null,
        });

        /* router used */

        // ── Handle finish_reason: stop ──
        if (modelResult.finishReason === 'stop') {
          R.state({ event: 'FINISHED', requestId, cycle: toolCallCycles, finishReason: 'stop' });
          let rawContent = modelResult.content || '';
          rawContent = rawContent.replace(/^[\w\/\.-]+:\s*/m, '');
          finalContent = this.sanitizeFinalResponse(rawContent);

          const responseType = classifyResponse(finalContent, modelResult.toolCalls || []);

          if (responseType === 'UNPARSEABLE') {
            if (toolCallCycles < 2) {
              // Reasonable retry: the model returned empty/garbage,
              // give it one more chance with a clear format reminder
              log.warn(`[UNPARSEABLE] Cycle ${toolCallCycles}: empty/garbage content — redirecting with format reminder`);
              R.meta({ event: 'UNPARSEABLE_RESPONSE', requestId, cycle: toolCallCycles, content: (finalContent || '').slice(0, 200) });
              messages.push({
                role: 'system',
                content: '[SYSTEM] Phản hồi trước của bạn không có nội dung hợp lệ (trống hoặc không thể đọc được). Hãy trả lời theo MỘT trong hai dạng sau:\n\n1. Nếu cần gọi tool → dùng API tool_call (có cấu trúc)\n2. Nếu trả lời trực tiếp → viết nội dung rõ ràng bằng văn bản\n\nKHÔNG viết "let me", "I\'ll", "để tôi", "tôi sẽ" hay bất kỳ câu mô tả ý định nào. Nếu cần hành động, hãy gọi tool NGAY. Nếu đã có câu trả lời, hãy viết nó ra NGAY.'
              });
              toolCallCycles++;
              R.state({ event: 'UNPARSEABLE_REDIRECT', requestId, cycle: toolCallCycles, finishReason: 'unparseable_redirect' });
              continue;
            }

            // Redirects exhausted — return a clean fallback instead of garbage
            log.warn(`[UNPARSEABLE] Max redirects (2) reached — returning fallback`);
            R.meta({ event: 'UNPARSEABLE_EXHAUSTED', requestId, cycle: toolCallCycles });
            return {
              content: '[E1] ❌ Coral chưa hoàn tất yêu cầu. Model trả về nội dung rỗng. Vui lòng thử lại với câu hỏi đơn giản hơn hoặc dùng /new để bắt đầu lại.',
              modelUsed: modelResult.modelUsed || 'unknown',
              providerUsed: modelResult.providerUsed || 'unknown',
              toolCycles: toolCallCycles,
              finished: true,
            };
          }

          /* final response — everything reachable here is a valid FINAL_ANSWER */
          evolutionEngine.recordSuccess(modelResult.modelUsed, 0).catch(() => {});

          R.state({
            event: 'RETURN_FINISHED',
            requestId, cycle: toolCallCycles,
            finishReason: 'stop',
            finalContent: finalContent.slice(0, 100),
          });
          return {
            content: finalContent,
            modelUsed: modelResult.modelUsed,
            providerUsed: modelResult.providerUsed,
            toolCycles: toolCallCycles,
            finished: true,
          };
        }

        // ── Model truncated (max_tokens) ──
        if (modelResult.finishReason === 'length') {
          log.warn(`[TRUNCATED] Model hit max_tokens at cycle ${toolCallCycles}`);
          const partialContent = (modelResult.content || '').replace(/^[\w\/\.-]+:\s*/m, '').trim();
          if (partialContent.length > 20) {
            finalContent = this.sanitizeFinalResponse(partialContent);
            R.state({
              event: 'FINISHED', requestId, cycle: toolCallCycles,
              finishReason: 'length_truncated',
              finalContent: finalContent.slice(0, 100),
            });
            return {
              content: finalContent + '\n\n_[⚠️ response bị cắt do giới hạn độ dài — vui lòng hỏi cụ thể hơn nếu cần thêm]_',

              modelUsed: modelResult.modelUsed,
              providerUsed: modelResult.providerUsed,
              toolCycles: toolCallCycles,
              finished: true,
            };
          }
          log.info(`[TRUNCATED] Empty content, continuing loop`);
          toolCallCycles++;
          continue;
        }

        // ── Tool calls ──
         if (modelResult.finishReason === 'tool_calls' && modelResult.toolCalls) {
           R.state({ event: 'TOOL_REQUESTED', requestId, cycle: toolCallCycles, toolCallsCount: modelResult.toolCalls.length });
           R.rawToolCalls({ requestId, cycle: toolCallCycles, raw: JSON.stringify(modelResult.toolCalls), status: 'AFTER_PARSER' });
           // Emit intermediate response if model provided text before tool calls
           if (modelResult.content) {
             await this.hooks.emit('model:intermediate_response', {
               sessionId: request.sessionId,
               content: modelResult.content,
               cycle: toolCallCycles,
             });
           }

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

          // ── Token-aware context budget check (after tool call) ──
          await this.ensureTokenBudget(messages, 128_000, request.sessionId, (request as any).focusTopic);

          // Collect tool call data for checkpoint
          const executedToolCalls: Array<{id: string; name: string; args: Record<string, unknown>}> = [];
          const executedToolResults: Array<{id: string; result: unknown}> = [];

          for (const toolCall of modelResult.toolCalls) {
            if (toolCall.type !== 'function') {
              continue;
            }

            const allowed = await this.hooks.emit('tool:call', {
              sessionId: request.sessionId,
              toolName: toolCall.function.name,
              toolArgs: toolCall.function.arguments,
              cycle: toolCallCycles,
              reasoningContent: modelResult.reasoningContent || null,
            });

            // If guard blocked execution, skip this tool call
            if (!allowed) {
              messages.push({
                role: 'tool',
                tool_call_id: toolCall.id,
                content: JSON.stringify({
                  error: `TOOL_BLOCKED: ${toolCall.function.name} was blocked by security guard`,
                }),
              });
              continue;
            }

            // ── Checkpoint: mark tool as running (prevents duplicate re-execution on crash) ──
            if (this.checkpointStore && request.checkpointRequestId) {
              this.checkpointStore.markToolRunning(request.checkpointRequestId, toolCall.id);
            }

            // Show thinking: tool call starting
            if (request.onThinking) {
              const fnName = toolCall.function.name;
              const args = (toolCall.function.arguments && typeof toolCall.function.arguments === 'string'
                ? toolCall.function.arguments.slice(0, 80) + (toolCall.function.arguments.length > 80 ? '...' : '')
                : '');
              await request.onThinking(`🔧 ${fnName}${args ? `(${args})` : ''}...`);
            }

            R.state({ event: 'TOOL_RUNNING', requestId, cycle: toolCallCycles, finishReason: toolCall.function.name });
            R.waitBegin({ requestId, label: `tool:${toolCall.function.name}[${toolCall.id.slice(0,8)}]`, callerFile: 'agent.ts', callerLine: 614 });
            const toolResult = await this.toolRegistry.executeToolCall(toolCall);
            R.waitEnd({ requestId, label: `tool:${toolCall.function.name}[${toolCall.id.slice(0,8)}]`, callerFile: 'agent.ts', callerLine: 614 });

            const resultStr = JSON.stringify(toolResult);

            await this.hooks.emit('tool:result', {
              sessionId: request.sessionId,
              toolName: toolCall.function.name,
              args: toolCall.function.arguments,
              result: toolResult,
              cycle: toolCallCycles,
            });

            // ponytail: cap tool result at 8KB to prevent OOM from large search/read results
            const rawResult = JSON.stringify(toolResult);
            const cappedResult = rawResult.length > 8192 ? rawResult.slice(0, 8192) + '...[truncated]' : rawResult;
            messages.push({
              role: 'tool',
              tool_call_id: toolCall.id,
              content: cappedResult,
            });

            // Collect for checkpoint
            executedToolCalls.push({
              id: toolCall.id,
              name: toolCall.function.name,
              args: toolCall.function.arguments as Record<string, unknown>,
            });
            executedToolResults.push({ id: toolCall.id, result: toolResult });

            /* tool executed */
            // Show thinking: tool complete
            if (request.onThinking) {
              const resultPreview = typeof toolResult === 'string'
                ? toolResult.slice(0, 60) + (toolResult.length > 60 ? '...' : '')
                : 'ok';
              await request.onThinking(`✅ ${toolCall.function.name} → ${resultPreview}`);
            }

          }
          // ── Read-loop detection ──
          // Count read-heavy tool calls. If they exceed MAX_READ_CALLS,
          // inject a forced-synthesis system message so the LLM stops
          // exploring and produces a final answer.
          if (!readLoopForced) {
            for (const tc of modelResult.toolCalls) {
              if (tc.type === 'function' && READ_TOOLS.has(tc.function.name)) {
                readToolCount++;
              }
            }
            if (readToolCount >= MAX_READ_CALLS) {
              readLoopForced = true;
              messages.push({
                role: 'system',
                content: `[SYSTEM] Bạn đã đọc đủ tài liệu (${readToolCount} lượt). Hãy tổng hợp câu trả lời NGAY. KHÔNG gọi thêm bất kỳ tool nào. Chỉ trả lời trực tiếp bằng văn bản.`
              });
              log.info(`Read-loop detection triggered after ${readToolCount} read calls — forcing synthesis`);
            }
          }

          this.emit('cascade', {
            sessionId: request.sessionId,
            type: 'trying',
            modelUsed: modelResult.modelUsed,
            tier: 3,
          });

          // ── Checkpoint: record completed cycle ──
          if (this.checkpointStore && request.checkpointRequestId) {
            this.checkpointStore.cycle(
              request.checkpointRequestId,
              toolCallCycles,
              request.currentGoal || request.task || 'ReAct cycle',
              executedToolCalls,
              executedToolResults,
            );
          }

          R.state({ event: 'CONTINUE', requestId, cycle: toolCallCycles, finishReason: 'tool_calls' });
          continue;
        }

        // ── Unknown finish_reason ──
        const tokEst = estimateTokens(messages);
        const sessionDur = request.sessionId
          ? ((Date.now() - (this.sessionStartTimes.get(request.sessionId) || Date.now())) / 1000 / 60).toFixed(1)
          : '?';
        log.warn(`[UNKNOWN_FINISH] reason="${modelResult.finishReason}", contentLength=${(modelResult.content || '').length}, messageCount=${messages.length}, estimatedTokens=${tokEst.total}, activeModel="${modelResult.modelUsed}", provider="${modelResult.providerUsed}", sessionDuration=${sessionDur}min, cycle=${toolCallCycles}`);

        // If model returned content despite unknown finish_reason, use it
        if (modelResult.content) {
          finalContent = this.sanitizeFinalResponse(modelResult.content);
          R.state({ event: 'FINISHED', requestId, cycle: toolCallCycles, finishReason: 'stop' });
          return {
            content: finalContent,
            modelUsed: modelResult.modelUsed,
            providerUsed: modelResult.providerUsed,
            toolCycles: toolCallCycles,
            finished: true,
          };
        }

        // Empty content + unknown reason → retry once (like UNPARSEABLE for 'stop')
        if (toolCallCycles < 2) {
          log.warn(`[UNKNOWN_FINISH] Cycle ${toolCallCycles}: empty content with reason="${modelResult.finishReason}" — retrying`);
          messages.push({
            role: 'system',
            content: `[SYSTEM] Model trả về finish_reason không xác định ("${modelResult.finishReason}") với nội dung trống. Hãy trả lời lại câu hỏi trực tiếp bằng văn bản. KHÔNG gọi tool.`,
          });
          toolCallCycles++;
          R.state({ event: 'UNKNOWN_FINISH_RETRY', requestId, cycle: toolCallCycles, finishReason: modelResult.finishReason });
          continue;
        }

        // Retries exhausted
        finalContent = this.sanitizeFinalResponse('[E2] ❌ Coral gặp sự cố khi xử lý yêu cầu. Model trả về phản hồi rỗng. Vui lòng thử lại hoặc đặt câu hỏi khác.');
        R.state({ event: 'FINISHED', requestId, cycle: toolCallCycles, finishReason: modelResult.finishReason || 'unknown' });
        return {
          content: finalContent,
          modelUsed: modelResult.modelUsed,
          providerUsed: modelResult.providerUsed,
          toolCycles: toolCallCycles,
          finished: true,
        };

      } catch (err: any) {
        R.state({ event: 'FAILED', requestId, cycle: toolCallCycles, error: err.message?.slice(0, 200) });
        R.state({ event: 'RETURN_ERROR', requestId, cycle: toolCallCycles, error: err.message?.slice(0, 200) });
        await this.hooks.emit('model:error', {
          sessionId: request.sessionId,
          error: err.message,
          cycle: toolCallCycles,
        });

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

    // ── Max cycles exceeded → Graceful Fallback ──
    R.state({ event: 'FINISHED', requestId, cycle: toolCallCycles, finishReason: 'max_cycles' });
    R.state({ event: 'RETURN_MAX_CYCLES', requestId, cycle: toolCallCycles });
    // Extract recent context from conversation to provide a meaningful response
    const recentUserMessages = messages
      .filter((m: any) => m.role === 'user')
      .slice(-3)
      .map((m: any) => m.content)
      .filter(Boolean);
    const recentAssistant = messages
      .filter((m: any) => m.role === 'assistant' && m.content)
      .slice(-2)
      .map((m: any) => m.content)
      .filter(Boolean);

    let fallbackContent: string;
    if (recentAssistant.length > 0) {
      // We had partial answers — synthesize them
      fallbackContent = recentAssistant[recentAssistant.length - 1];
    } else if (recentUserMessages.length > 0) {
      // No assistant answer yet — provide a brief helpful response
      const lastQuestion = recentUserMessages[recentUserMessages.length - 1];
      fallbackContent = `Câu hỏi của bạn rất chi tiết: "${lastQuestion.slice(0, 100)}"\n\nTôi đã cố gắng tìm thông tin nhưng cần thêm thời gian. Bạn có thể:\n1. Hỏi chi tiết hơn về một phần cụ thể\n2. Đặt câu hỏi đơn giản hơn\n3. Thử lại sau`;
    } else {
      fallbackContent = 'Xin lỗi, tôi gặp khó khăn trong việc xử lý yêu cầu này. Bạn có thể thử lại với câu hỏi đơn giản hơn.';
    }

    return {
      content: fallbackContent,
      modelUsed: 'unknown',
      providerUsed: 'unknown',
      toolCycles: toolCallCycles,
      finished: true,
    };
  }
}

export default Agent;
