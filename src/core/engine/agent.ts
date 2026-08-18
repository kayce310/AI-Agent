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
import { checkGoalDrift } from '../security/goal-drift-monitor.js';
import type { PrivilegeGuard } from '../security/privilege-guard.js';
import { missionLock } from '../security/mission-lock.js';
import { STAGNATION_THRESHOLD, MAX_TRANSIENT_RETRY, ABSOLUTE_SAFETY_CEILING, validateTransition } from '../plan/types.js';
import { classifyError } from '../plan/error-classifier.js';
import { derivePlanState, isGuardActive } from '../plan/plan-state.js';
import { recordGateReject } from '../memory/consequence-write-path.js';
import { renderConsequenceHint } from '../memory/consequence-read-path.js';
import { parseEmotionTag, stripEmotionTag } from '../behavior/emotion-tag-parser.js';
import { getRequestContext } from '../request-context.js';
import type { ConsequenceHint } from '../request-context.js';
import { ProgressTracker, type ProgressEvidenceInput } from '../progress/progress-monitor.js';

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
type ResponseType = 'FINAL_ANSWER' | 'UNPARSEABLE';

/**
 * Classify model text response — pure structure-based, no NLP heuristics.
 * Tool calls are handled upstream (finishReason !== 'stop'), so when we
 * reach here the model wrote text. Check if the text is meaningful.
 * NEVER needed for tool call routing — that's handled by the API's built-in
 * tool_call mechanism (format instruction in system prompt).
 */
function classifyResponse(content: string): ResponseType {
  // Empty / garbage content — no meaningful response at all
  const trimmed = (content || '').trim();
  if (!trimmed || trimmed.length < 3) return 'UNPARSEABLE';

  // Everything else is FINAL_ANSWER — No NLP, no regex, no content-length threshold.
  return 'FINAL_ANSWER';
}

/**
 * Phase 7 — Consequence hint consumer (ADR-003 Phase 3b).
 *
 * Gắn consequenceHint của request (set bởi read-path guard khi suggest /
 * HITL-approve) vào messages của lượt gọi model HIỆN TẠI dưới dạng system
 * message transient. Dùng renderConsequenceHint() có sẵn — KHÔNG đổi logic
 * quyết định của read-path.
 *
 * Hint absent → trả về messages gốc (prompt KHÔNG đổi — requirement 9).
 */
export function buildCycleMessagesWithHint(
  messages: any[],
  hint?: ConsequenceHint | null,
): any[] {
  if (!hint) return messages;
  const hintText = renderConsequenceHint(hint);
  if (!hintText) return messages;
  // Transient: KHÔNG push vào messages gốc — hint chỉ áp cho lượt gọi này,
  // không nhiễm vào history/compression của các cycle sau.
  return [...messages, { role: 'system', content: `[Consequence]\n${hintText}` }];
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
  /** PrivilegeGuard for direct tool authorization (defense-in-depth) */
  privilegeGuard?: PrivilegeGuard;
}

// ── Agent Result ──
export interface AgentResult {
  content: string;
  modelUsed: string;
  providerUsed: string;
  toolCycles: number;
  finished: boolean;
  /** MỚI — true when the ReAct loop exited because maxToolCycles was hit (not a normal finish) */
  cycleLimitReached?: boolean;
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
    /** PrivilegeGuard reference for direct tool authorization checks */
    private enginePrivilegeGuard?: PrivilegeGuard;

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
    this.enginePrivilegeGuard = config.privilegeGuard;

    // Auto-attach tracer to hooks if provided
    if (this.tracer) {
      this.tracer.attachToHooks(this.hooks);
    }

    // Janitor available for manual/opt-in use only.
    // NOT auto-wired to task:complete — that would run "npx vitest run" after EVERY response,
    // even for simple conversational queries. Janitor is for verifying system integrity
    // after intentional code/tool write operations, not for chat responses.
  }

  get hookRegistry(): HookRegistry {
    return this.hooks;
  }

  /** Get the engine circuit breaker (for monitoring) */
  get circuitBreakerState() {
    return this.circuitBreaker;
  }

  /**
   * Set max tool cycles at runtime.
   * Used by Engine when a plan is created, so the limit matches plan complexity.
   * The effective cap is ABSOLUTE_SAFETY_CEILING (see plan/types.ts) — this is
   * a hard safety ceiling against runaway loops, not a normal work budget.
   * Returns the new effective limit.
   */
  setMaxToolCycles(newMax: number): number {
    const effective = Math.max(1, Math.min(newMax, ABSOLUTE_SAFETY_CEILING));
    this.maxToolCycles = effective;
    log.info(`[Agent] maxToolCycles set to ${effective} (requested: ${newMax})`);
    return effective;
  }

  /**
   * Get the current max tool cycles limit.
   */
  getMaxToolCycles(): number {
    return this.maxToolCycles;
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
      .replace(/\[EMOTION:\s*\w+\s*\]/gi, '')  // Phase 3: strip emotion tag from user display
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
      // Cleanup per-request session-start bookkeeping (prevents unbounded Map growth)
      if (request.sessionId) {
        this.sessionStartTimes.delete(request.sessionId);
      }
      return result;
    } catch (err: any) {
      await this.hooks.emit('task:error', {
        sessionId: request.sessionId,
        error: err.message,
        stack: err.stack,
      });
      // Cleanup on error path too
      if (request.sessionId) {
        this.sessionStartTimes.delete(request.sessionId);
      }
      throw err;
    }
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

    // 85%+: hard trim via zero-cost eviction FIRST, LLM compression as fallback
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

    // Still over budget after zero-cost eviction → LLM compression as last resort
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
    const progressTracker = new ProgressTracker(request.checkpointRequestId || request.sessionId || requestId, 3);
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

    // ── State-Driven Task Plan handles intent routing ──
    // No more regex-based isSelfReferential shortcut.
    // The LLM decides via update_plan tool based on the plan context in the prompt.
    let toolCallCycles = 0;
    let finalContent = '';
    let readToolCount = 0;      // Track read-heavy tool calls for loop detection
    let readLoopForced = false; // Prevent duplicate force-synthesis injections
    // ── Plan state derived from checkpointStore each iteration (ADR-001) ──
    // Không dùng hasCreatedPlan/executionPhase boolean — derive từ getPlan() mỗi vòng lặp.
    let stallCount = 0;            // số turn liên tiếp KHÔNG có tool call (reset khi có tool call)
    const MAX_STALL = 3;           // stall >= 3 → dừng với lỗi rõ ràng
    let lengthRetryCount = 0;     // số lần retry vì finishReason='length', độc lập stallCount
    let unplannedToolCallCount = 0;
    let planNudgeInjected = false;
    // ── PlanObs: observational logging (HARD-RULE compliance data, NO branching) ──
    // ponytail: chỉ ghi sự kiện thô — update_plan có được gọi ở cycle đầu không.
    // Phân tích sau (tần suất bỏ qua plan theo độ phức tạp) dựa trên log này,
    // không xây heuristic nào ở đây.
    let updatePlanCalledInCycle1 = false;
    // ── Evidence log cho evidence-based completion ──
    // Tự động ghi nhận mỗi tool call thành công, gắn với item đang active trong plan.
    // Lưu vào checkpointStore.evidenceLog — shared với update_plan tool handler.
    const READ_TOOLS = new Set(['read_file', 'list_directory', 'search_knowledge_graph']);
    // Uses this.maxReadCalls (from config.maxReadCalls ?? env CORAL_MAX_READ_CALLS)
    // NOT a local const — the config value respects env var overrides.

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
          // Không hardcode maxTokens — để model-adapter tự quyết theo:
          // (1) options truyền tường minh, (2) config providers.json, (3) fallback 2048
        };

        // Try streaming first, fallback to regular invoke on error
        // Wrapped in circuit breaker — consecutive failures will open the circuit
        R.state({ event: 'CALL_MODEL', requestId, cycle: toolCallCycles, finishReason: selectedTools.length > 0 ? `tools:${selectedTools.length}` : 'no_tools' });
        // ── Phase 7: Consequence hint → model (ADR-003 3b consumer) ──
        // Read-path guard set rctx.consequenceHint khi suggest/HITL-approve.
        // Render + gắn vào messages của lượt gọi model HIỆN TẠI (transient).
        // Consume-once: clear sau khi inject — hint cũ không lặp lại ở cycle
        // sau; guard sẽ set lại khi có suggest mới cho cùng tool.
        // Hint absent → cycleMessages === messages (prompt không đổi).
        const hintRctx = getRequestContext();
        const cycleMessages = buildCycleMessagesWithHint(messages, hintRctx?.consequenceHint);
        if (hintRctx?.consequenceHint) {
          hintRctx.consequenceHint = undefined;
        }

        R.waitBegin({ requestId, label: `modelRouter.invoke.cycle${toolCallCycles}`, callerFile: 'agent.ts', callerLine: 476 });
        modelResult = await this.circuitBreaker.execute(async () => {
          try {
            if ((this.modelRouter as any).getAdapter('9router')?.invokeStreaming) {
              const adapter = (this.modelRouter as any).getAdapter('9router');
              const taskId = request.sessionId;
              
              return await adapter.invokeStreaming(
                cycleMessages,
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
              return await this.modelRouter.route(cycleMessages, modelOptions);
            }
          } catch (err: any) {
            // Streaming path failed — fall back to plain invoke.
            // NOTE: If the streaming failure is itself a provider outage, the fallback
            // route() call will throw and THAT error propagates to the circuit breaker
            // (no silent swallow). If route() succeeds, the provider is healthy and the
            // circuit stays closed — correct behavior.
            log.warn(`[STREAMING] Failed, falling back to invoke(): ${err.message}`);
            return await this.modelRouter.route(cycleMessages, modelOptions);
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

          // Phase 3: Extract emotion_tag BEFORE sanitization
          const parsedEmotion = parseEmotionTag(rawContent);
          if (parsedEmotion.valid) {
            log.info(`[EMOTION] Parsed emotion_tag: ${parsedEmotion.tag}`);
          }

          rawContent = rawContent.replace(/^[\w\/\.-]+:\s*/m, '');
          finalContent = this.sanitizeFinalResponse(rawContent);

          // Phase 3: Publish emotion annotation via hooks (→ EventBus)
          if (parsedEmotion.valid && parsedEmotion.tag) {
            this.hooks.emit('emotion:annotated' as any, {
              sessionId: request.sessionId,
              emotionTag: parsedEmotion.tag,
              sourceEventId: requestId,
            }).catch(() => {});
          }

          const responseType = classifyResponse(finalContent);

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

          // ── Stall Detection (model-agnostic): thay thế IntentionGuard cũ ──
          // Duy nhất nguồn sự thật: cấu trúc response có tool call hay không.
          // Không dùng finish_reason, không regex text.
          const turnHasAction = (modelResult.toolCalls?.length > 0) || false;

          // ── Derive plan state từ checkpointStore (ADR-001: single source of truth) ──
          const planState = derivePlanState(this.checkpointStore, request.sessionId);
          const planIsActive = isGuardActive(planState);

          if (!turnHasAction && planIsActive) {
            stallCount++;
            log.warn(`[Stall] Cycle ${toolCallCycles} — stallCount=${stallCount}/${MAX_STALL} (planState=${planState.kind})`);
          } else {
            if (stallCount > 0) {
              log.info(`[Stall] Cycle ${toolCallCycles} — tool call detected, resetting stall counter`);
            }
            stallCount = 0;
          }

          // Xử lý leo thang theo stallCount
          if (stallCount >= MAX_STALL && planIsActive) {
            // stall >= 3 mà đã có plan → dừng với lỗi rõ ràng (không trả text làm FINAL_ANSWER)
            log.warn(`[Stall] Max stalls (${MAX_STALL}) reached — aborting`);
            R.state({
              event: 'STALL_EXCEEDED', requestId, cycle: toolCallCycles,
            });
            return {
              content: `[E3] ❌ Agent stalled after plan creation: ${stallCount} consecutive turns without tool execution. Plan may need to be simplified or re-created.`,
              modelUsed: modelResult.modelUsed || 'unknown',
              providerUsed: modelResult.providerUsed || 'unknown',
              toolCycles: toolCallCycles,
              finished: true,
            };
          }

          if (stallCount === 1 && planIsActive) {
            // A plan still has pending work, so a text-only turn cannot finish it.
            const msg = '[GUARD] Bạn đã tạo plan nhưng chưa thực thi. Không mô tả plan bằng văn bản. Gọi NGAY tool để thực thi item hiện tại của plan.';
            messages.push({ role: 'system', content: msg });
            // Ép tool_choice='required' cho lần gọi kế tiếp (nếu provider hỗ trợ)
            (modelOptions as any).toolChoice = 'required';
            log.warn(`[Stall] Cycle ${toolCallCycles}: stallCount=1 — injected guard message`);
            toolCallCycles++;
            continue;
          }

          if (stallCount === 2 && planIsActive) {
            // stall lần 2 với plan: ép cứng tool_choice='required'
            (modelOptions as any).toolChoice = 'required';
            messages.push({
              role: 'system',
              content: '[GUARD] Lần thứ hai: bạn KHÔNG được trả lời bằng text. Gọi tool ngay lập tức. Không mô tả, không giải thích, không xin lỗi. Chỉ gọi tool.'
            });
            log.warn(`[Stall] Cycle ${toolCallCycles}: stallCount=2 — forcing tool_choice=required`);
            toolCallCycles++;
            continue;
          }

          /* final response — no stall, treat as valid FINAL_ANSWER */
          // ── Goal-drift check for text responses ──
          // Only meaningful for multi-step tasks (active plan). For plain chat
          // ("này Coral" → "Chào bạn!") the keyword overlap is ~0, which would
          // prepend a [GOAL REMINDER] to EVERY reply — a 100% false positive.
          const textDriftState = derivePlanState(this.checkpointStore, request.sessionId);
          if (isGuardActive(textDriftState)) {
            const task = request.task || '';
            if (task) {
              const driftReminder = checkGoalDrift(task, finalContent);
              if (driftReminder) {
                log.warn(`[Engine] Goal drift detected in text response: "${finalContent.slice(0, 80)}..."`);
                // Prepend goal reminder to the response so the user sees it
                finalContent = driftReminder + '\n' + finalContent;
              }
            }
          }

          // ── MissionLock: validate response for identity drift (R1.5) ──
          const missionCheck = missionLock.validateResponse(finalContent);
          if (!missionCheck.allowed) {
            log.warn(`MissionLock blocked response: ${missionCheck.reason}`);
            return {
              content: `[GUARD] Response blocked: ${missionCheck.reason}`,
              modelUsed: modelResult.modelUsed,
              providerUsed: modelResult.providerUsed,
              toolCycles: toolCallCycles,
              finished: true,
            };
          }

          evolutionEngine.recordSuccess(modelResult.modelUsed, 0).catch(() => {});

          R.state({
            event: 'RETURN_FINISHED',
            requestId, cycle: toolCallCycles,
            finishReason: 'stop',
            finalContent: finalContent.slice(0, 100),
          });
          // ── PlanObs: log sự kiện hoàn thành — dữ liệu thô cho phân tích HARD-RULE ──
          // ponytail: chỉ log, không branch. user_msg_len = proxy thô độ phức tạp.
          log.info(`[PlanObs] session=${request.sessionId} finish=stop cycles=${toolCallCycles} cycle1_update_plan=${updatePlanCalledInCycle1} user_msg_len=${String(request.task || messages[0]?.content || '').length}`);
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

          // ── LengthGuard: retry nếu chưa có plan active và chưa retry lần nào ──
          // Nếu đã có plan active, giữ nguyên hành vi cũ (return truncation ngay)
          const lengthGuardPlanState = derivePlanState(this.checkpointStore, request.sessionId);
          if (!isGuardActive(lengthGuardPlanState) && lengthRetryCount < 1) {
            log.warn(`[LengthGuard] Cycle ${toolCallCycles}: truncated before plan created — retrying (attempt ${lengthRetryCount + 1}/1)`);
            lengthRetryCount++;
            // KHÔNG giữ partialContent bị cắt vào history — tránh model tiếp nối câu dở dang
            messages.push({
              role: 'system',
              content: '[GUARD] Phản hồi trước bị cắt vì vượt giới hạn độ dài trước khi bạn kịp hành động. QUY TẮC:\n'
                + '1. Nếu cần lập kế hoạch nhiều bước, gọi update_plan(action=\'create\', items=[...]) NGAY — đừng viết mô tả kế hoạch bằng văn bản dài.\n'
                + '2. Nếu là tác vụ đơn giản, thực hiện bằng tool call trực tiếp, không mô tả ý định trước.'
            });
            toolCallCycles++;
            R.state({ event: 'LENGTH_GUARD_RETRY', requestId, cycle: toolCallCycles });
            continue; // Quay lại đầu vòng lặp
          }

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
             // Phase 3: Extract emotion from pre-tool-call text
             const parsedEmotion = parseEmotionTag(modelResult.content);
             if (parsedEmotion.valid && parsedEmotion.tag) {
               this.hooks.emit('emotion:annotated' as any, {
                 sessionId: request.sessionId,
                 emotionTag: parsedEmotion.tag,
                 sourceEventId: requestId,
               }).catch(() => {});
             }

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

          // A3: Set current plan item to in_progress if tools are NOT just update_plan
          let prevItemIndex = -1;
          if (this.checkpointStore && request.sessionId) {
            try {
              const activePlan = this.checkpointStore.getPlan(request.sessionId);
              if (activePlan && (activePlan.status === 'pending' || activePlan.status === 'running')) {
                const currentItem = activePlan.items[activePlan.currentItemIndex];
                if (currentItem && currentItem.status === 'pending') {
                  // Check if at least one tool call is NOT update_plan (actual work starting)
                  const hasRealWork = modelResult.toolCalls?.some(
                    (tc: any) => tc.function?.name !== 'update_plan'
                  );
                  if (hasRealWork) {
                    currentItem.status = 'in_progress';
                    if (activePlan.status === 'pending') {
                      // ponytail: route qua validateTransition — pending→running hợp lệ,
                      // fail-loud nếu state machine đổi (đừng silent-write như cũ)
                      const transErr = validateTransition(activePlan.status, 'running');
                      if (transErr) {
                        log.warn(`⚠️ [Agent A3] REFUSED illegal transition ${activePlan.status} → running: ${transErr}`);
                      } else {
                        activePlan.status = 'running';
                      }
                    }
                    this.checkpointStore.setPlan(request.sessionId, activePlan);
                    log.info(`[Agent A3] Plan item ${currentItem.index} → in_progress`);
                  }
                }
                prevItemIndex = activePlan.currentItemIndex;
              }
            } catch (_) { /* non-critical — plan tracking best-effort */ }
          }

          // Collect tool call data for checkpoint
          const executedToolCalls: Array<{id: string; name: string; args: Record<string, unknown>}> = [];
          const executedToolResults: Array<{id: string; result: unknown}> = [];
          // Error category of THIS cycle's tool calls — used by stagnation tracking below.
          // Declared at cycle scope so the stagnation block (outside the tool loop) can read it.
          // If multiple tools ran, the LAST failing category wins (worst-case approximation).
          let cycleErrorCategory: 'transient' | 'permanent' | 'security' | undefined;

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
              // ADR-003 Phase 2: ghi denial vào Consequence Memory (outcome 'rejected_by_gate')
              recordGateReject({
                sessionId: request.sessionId,
                toolName: toolCall.function.name,
                reason: `TOOL_BLOCKED: ${toolCall.function.name} was blocked by security guard`,
                cycle: toolCallCycles,
              });
              continue;
            }

            // ── Direct PrivilegeGuard check (defense-in-depth, independent of hook guard) ──
            if (this.enginePrivilegeGuard) {
              const pgCheck = this.enginePrivilegeGuard.check(toolCall.function.name);
              if (!pgCheck.allowed) {
                messages.push({
                  role: 'tool',
                  tool_call_id: toolCall.id,
                  content: JSON.stringify({
                    error: `TOOL_BLOCKED_BY_POLICY: ${toolCall.function.name} is not permitted — ${pgCheck.reason}`,
                  }),
                });
                // ADR-003 Phase 2: ghi denial vào Consequence Memory (outcome 'rejected_by_gate')
                recordGateReject({
                  sessionId: request.sessionId,
                  toolName: toolCall.function.name,
                  reason: `TOOL_BLOCKED_BY_POLICY: ${toolCall.function.name} is not permitted — ${pgCheck.reason}`,
                  cycle: toolCallCycles,
                });
                continue;
              }
            }

            // ── Checkpoint: mark tool as running (prevents duplicate re-execution on crash) ──
            if (this.checkpointStore && request.checkpointRequestId) {
              this.checkpointStore.markToolRunning(request.checkpointRequestId, toolCall.id);
            }

            // ── Plan state is now derived from checkpointStore each iteration (ADR-001) ──
            // Không cần set hasCreatedPlan — derivePlanState() đọc từ checkpointStore
            // trực tiếp. Block này giữ lại để log nhưng không set flag.
            if (toolCall.function.name === 'update_plan') {
              // PlanObs: ghi nhận update_plan ở cycle đầu (cycle 1 = sau increment đầu)
              if (toolCallCycles === 1) updatePlanCalledInCycle1 = true;
              try {
                const planArgs = JSON.parse(toolCall.function.arguments || '{}');
                if (planArgs.action === 'create') {
                  log.info(`[Plan] update_plan(create) called — plan state will be derived on next iteration`);
                }
              } catch { /* ignore parse errors */ }
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
            // ── Error category decision: annotate tool result for the model ──
            // transient: retriable, no note needed (model can retry)
            // permanent: clear note so the model does NOT waste turns retrying the same call
            // security: unchanged (engine.ts tool:result handler aborts the plan)
            if (toolResult && typeof toolResult === 'object' && 'error' in toolResult) {
              const errMsg = String((toolResult as any).error || '');
              cycleErrorCategory = classifyError(errMsg);
              if (cycleErrorCategory === 'permanent') {
                log.info(`[ErrorCategory] permanent: ${toolCall.function.name} — ${errMsg.slice(0, 100)}`);
              }
            }
            let toolMsgContent = cappedResult;
            if (cycleErrorCategory === 'permanent') {
              toolMsgContent = cappedResult + '\n\n⚠️ [ERROR_CATEGORY=permanent] Lỗi này là permanent (không phải do mạng/tạm thời) — thử lại với CÙNG tham số sẽ tiếp tục thất bại. Cân nhắc cách tiếp cận khác hoặc báo cáo không thể hoàn thành.';
            }
            messages.push({
              role: 'tool',
              tool_call_id: toolCall.id,
              content: toolMsgContent,
            });
            // ── Goal-drift check: inject reminder if agent deviates from task ──
            // Only when a plan is active (multi-step task). Plain chat tool
            // calls (search "này Coral") would otherwise false-positive.
            const toolDriftState = derivePlanState(this.checkpointStore, request.sessionId);
            const task = request.task || '';
            if (task && isGuardActive(toolDriftState) && toolCallCycles > 1) {
              const driftReminder = checkGoalDrift(task, cappedResult);
              if (driftReminder) {
                messages.push({ role: 'system', content: driftReminder });
              }
            }

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

            // ── Evidence logging: ghi tool call vào evidenceLog cho item đang active ──
            try {
              if (this.checkpointStore && request.sessionId) {
                const sp = this.checkpointStore.getPlan(request.sessionId);
                if (sp && (sp.status === 'pending' || sp.status === 'running')) {
                  const idx = sp.currentItemIndex;
                  if (!getRequestContext()?.evidenceLog.has(idx)) getRequestContext()?.evidenceLog.set(idx, []);
                  const success = !(toolResult && typeof toolResult === 'object' && 'error' in toolResult);
                  getRequestContext()?.evidenceLog.get(idx)!.push({
                    toolName: toolCall.function.name,
                    args: toolCall.function.arguments as Record<string, unknown>,
                    result: toolResult,
                    timestamp: Date.now(),
                    success,
                  });
                }
              }
            } catch (_) { /* non-critical */ }

            // This is request-local coordination only, not plan lifecycle state.
            // After real work has begun without a plan, nudge the model once to
            // establish one before the next model turn.
            const planStateAfterTool = derivePlanState(this.checkpointStore, request.sessionId);
            if (toolCall.function.name !== 'update_plan' && !isGuardActive(planStateAfterTool)) {
              unplannedToolCallCount++;
            }

          }
          const planStateAfterCycle = derivePlanState(this.checkpointStore, request.sessionId);
          if (!planNudgeInjected && unplannedToolCallCount >= 2 && !isGuardActive(planStateAfterCycle)) {
            messages.push({
              role: 'system',
              content: '[PLAN] Bạn đã thực thi từ hai tool calls cho request này nhưng chưa có plan. Nếu công việc còn nhiều bước, hãy gọi update_plan(action=\'create\', items=[...]) trước khi tiếp tục; nếu đã đủ kết quả, hãy trả lời trực tiếp.',
            });
            planNudgeInjected = true;
            log.info(`[Plan] Injected execution-derived plan nudge after ${unplannedToolCallCount} unplanned tool calls`);
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
            if (readToolCount >= this.maxReadCalls) {
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

          // ── Progress observation (signal-only) ──
          try {
            const currentPlanState = derivePlanState(this.checkpointStore, request.sessionId);
            const transitionObserved =
              planStateAfterCycle.kind !== currentPlanState.kind ||
              ('planId' in planStateAfterCycle &&
                'planId' in currentPlanState &&
                planStateAfterCycle.planId !== currentPlanState.planId);

            const progressEvidence: ProgressEvidenceInput[] = executedToolCalls.map((tc) => ({
              kind: tc.name === 'update_plan' ? 'plan_transition' : 'tool_call',
              toolName: tc.name,
              args: tc.args,
              cycleId: toolCallCycles,
            }));

            const progressResult = progressTracker.evaluate({
              runId: request.checkpointRequestId || request.sessionId || requestId,
              cycleId: toolCallCycles,
              transitionObserved,
              evidence: progressEvidence,
            });

            await this.hooks.emit('progress:signal', {
              sessionId: request.sessionId,
              runId: request.checkpointRequestId || request.sessionId || requestId,
              cycle: toolCallCycles,
              signalType: progressResult.signal.type,
              counter: progressResult.window.counter,
              thresholdReached: progressResult.window.thresholdReached,
              observedNovelEvidence: progressResult.observation.observedNovelEvidence,
              observedPlanTransition: progressResult.observation.observedPlanTransition,
              evidenceFingerprint: progressResult.observation.evidenceFingerprint,
            });
          } catch (_) {
            // signal-only path; never interfere with agent execution
          }

          // ── Stagnation tracking: increment consecutiveFailedAttempts if no progress ──
          // TRANSIENT errors (timeout/network/rate-limit) do NOT count toward the main
          // counter — they can self-heal, so they must not trigger 'stuck' early.
          // They get their own counter (consecutiveTransientAttempts) with a separate
          // limit (MAX_TRANSIENT_RETRY); when exceeded, fall back to main counter.
          if (this.checkpointStore && request.sessionId && prevItemIndex >= 0) {
            try {
              const sp = this.checkpointStore.getPlan(request.sessionId);
              if (sp && (sp.status === 'running' || sp.status === 'pending')) {
                // Check if currentItemIndex changed OR current item was completed
                const currentIdx = sp.currentItemIndex;
                const currentItem = sp.items[currentIdx];
                const wasItemCompleted = currentIdx !== prevItemIndex ||
                  (currentItem && currentItem.status === 'completed');
                if (wasItemCompleted) {
                  // Progress made — reset counters on the item that was completed (previous index)
                  const prevItem = sp.items[prevItemIndex];
                  if (prevItem) {
                    prevItem.consecutiveFailedAttempts = 0;
                    prevItem.consecutiveTransientAttempts = 0;
                    log.info(`[Stagnation] Item ${prevItemIndex} completed → counter reset`);
                  }
                } else {
                  // No progress — decide which counter to increment based on error category
                  if (currentItem && currentItem.status !== 'completed' && currentItem.status !== 'skipped') {
                    if (cycleErrorCategory === 'transient' && (currentItem.consecutiveTransientAttempts || 0) < MAX_TRANSIENT_RETRY) {
                      // Transient: count separately, do NOT trigger stuck
                      currentItem.consecutiveTransientAttempts = (currentItem.consecutiveTransientAttempts || 0) + 1;
                      log.info(`[Stagnation] Item ${currentIdx} transient attempt ${currentItem.consecutiveTransientAttempts}/${MAX_TRANSIENT_RETRY} (not counted as stuck)`);
                      if (currentItem.consecutiveTransientAttempts >= MAX_TRANSIENT_RETRY) {
                        log.warn(`[Stagnation] Item ${currentIdx} exceeded MAX_TRANSIENT_RETRY (${MAX_TRANSIENT_RETRY}) — promoting to permanent, next failure counts toward stuck`);
                      }
                    } else {
                      // Permanent OR security OR transient-exceeded-limit: count toward stuck
                      currentItem.consecutiveFailedAttempts = (currentItem.consecutiveFailedAttempts || 0) + 1;
                      log.info(`[Stagnation] Item ${currentIdx} attempt ${currentItem.consecutiveFailedAttempts}/${STAGNATION_THRESHOLD} (category=${cycleErrorCategory || 'unknown'})`);
                      if (currentItem.consecutiveFailedAttempts >= STAGNATION_THRESHOLD) {
                        // ponytail: route qua validateTransition — pending/running→stuck
                        // hợp lệ (types.ts); fail-loud nếu state machine đổi
                        const transErr = validateTransition(sp.status, 'stuck');
                        if (transErr) {
                          log.warn(`⚠️ [Stagnation] REFUSED illegal transition ${sp.status} → stuck: ${transErr}`);
                        } else {
                          sp.status = 'stuck';
                          sp.stopReason = `stagnation: item ${currentIdx} failed ${currentItem.consecutiveFailedAttempts} consecutive attempts`;
                          log.warn(`[Stagnation] Plan ${sp.id} → stuck (item ${currentIdx}: ${currentItem.consecutiveFailedAttempts} consecutive failures)`);
                        }
                      }
                    }
                  }
                }
                this.checkpointStore.setPlan(request.sessionId, sp);
              }
            } catch (_) { /* non-critical */ }
          }

          R.state({ event: 'CONTINUE', requestId, cycle: toolCallCycles, finishReason: 'tool_calls' });
          continue;
        }

        // ponytail: tool_calls reported but not parsed (streaming delta issue) — retry with text-only instruction
        if (modelResult.finishReason === 'tool_calls' && !modelResult.toolCalls && toolCallCycles < 2) {
          log.warn(`[TOOL_CALLS_NO_PARSED] finishReason=tool_calls but toolCalls empty — retrying`);
          messages.push({ role: 'system', content: '[SYSTEM] Response had tool_calls but arguments were lost. Please respond with a direct text answer.' });
          toolCallCycles++;
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

    // ── Max cycles exceeded → Report back so Engine can decide pause/continue ──
    R.state({ event: 'FINISHED', requestId, cycle: toolCallCycles, finishReason: 'max_cycles' });
    R.state({ event: 'RETURN_MAX_CYCLES', requestId, cycle: toolCallCycles });
    // ── PlanObs: case loop dài — bỏ qua plan có dẫn tới loop không kiểm soát? ──
    log.info(`[PlanObs] session=${request.sessionId} finish=max_cycles cycles=${toolCallCycles} cycle1_update_plan=${updatePlanCalledInCycle1} user_msg_len=${String(request.task || messages[0]?.content || '').length}`);

    return {
      content: '',
      modelUsed: 'unknown',
      providerUsed: 'unknown',
      toolCycles: toolCallCycles,
      finished: false,
      cycleLimitReached: true,
    };
  }
}

export default Agent;
