/**
 * @file Engine — Core ReAct Loop
 * @layer core
 * @depends-on (all core modules)
 * @imported-by src/scripts/start-discord.ts, src/modules/discord/index.ts
 * @owner core-engine
 *
 * Coral Agent — Core Engine (ReAct Loop)
 * Framework 6 Layers — Lớp Lõi (Core Domain)
 *
 * Phase 3: Smart Fallback + DAG Cycle Detection + Hybrid Routing
 */

import { Logger } from '../logger.js';
import { EventEmitter } from 'events';
import { readFile } from 'fs/promises';
import { MemoryFacade } from '../memory/memory-facade.js';
import MemoryStore, { globalMemoryStore } from '../memory/memory-store.js';
import ProviderRegistry from '../llm/provider-registry.js';
import PromptBuilder from '../llm/prompt-builder.js';
import { ToolRegistry, getDefaultRegistry } from '../tools/tool-registry.js';
import { ensureToolDefinitionsLoaded } from '../tools/tool-pruner.js';
import { EngineRequest, EngineResponse, ChatMessage } from '../types.js';
import { evolutionEngine } from '../evolution.js';
import { ModelRouter, buildDefaultRouter } from '../llm/model-adapter.js';
import { Agent, AgentConfig } from './agent.js';
import { AgentRegistry } from '../agents/agent-registry.js';
import { createDelegatePlugin } from '../agents/delegate.js';
import { HookRegistry, globalHooks } from '../hooks.js';
import { PrivilegeGuard, createDefaultAllowRules, createRestrictedAllowList } from '../security/privilege-guard.js';
import { ResponseCache, isRealTimeQuery } from '../security/response-cache.js';
import { auditLogger } from '../audit-logger.js';
import { Tracer } from '../observability/tracer.js';
import { RateLimiter, RateLimiterGroup, PerUserRateLimiter } from '../security/rate-limiter.js';
import { MemoryTemporal } from '../memory/memory-temporal.js';
import { CoralStorage, getStorage } from '../memory/sqlite-storage.js';
import { MemoryBlock } from '../memory/memory-log.js';
import { shouldRecallMemory } from '../memory/memory-retrieval-gate.js';
import { MemoryConsolidation } from '../memory/memory-consolidation.js';
import { EventBus } from '../events/bus.js';
import { EventStore } from '../events/store.js';
import { StructuredLogger } from '../events/logger.js';
import { EventType } from '../events/types.js';
import { randomUUID } from 'crypto';
import { ExperienceStore } from '../self-evolution/experience-store.js';
import { SelfEvolutionLearner } from '../self-evolution/learner.js';
import { withTimeout } from '../util/with-timeout.js';
import { CheckpointStore, getCheckpoint } from '../checkpoint.js';
import { getContextManager } from '../context-window.js';
import { TaskQueue, getTaskQueue } from '../task-queue.js';
import { worldModel } from '../world/model.js';
import { R } from '../runtime-instrumentation.js';
import { requestContext, getRequestContext } from '../request-context.js';
import { ABSOLUTE_SAFETY_CEILING, STAGNATION_THRESHOLD } from '../plan/types.js';
import { classifyError } from '../plan/error-classifier.js';
import { derivePlanState, isGuardActive } from '../plan/plan-state.js';
const CORAL_IDENTITY_FILES = [
  'knowledge/wiki/core/soul.md',
];

const log = new Logger({ module: 'Engine' });

/** Maximum total time for a single request (120s = 2 minutes) */
const REQUEST_TIMEOUT_MS = 120_000;

/**
 * Summarize LLM reasoning into a short reason string.
 * Strategy: extract first sentence if ≤160 chars, else truncate to 157 chars + '...'.
 * No external model call — pure string operation, cheap and deterministic.
 */
function summarizeReasoning(text: string | null | undefined): string | null {
  if (!text) return null;
  const cleaned = text.trim();
  const match = cleaned.match(/^(.+?[.!?])(?:\s|$)/);
  if (match && match[1].length <= 160) {
    return match[1];
  }
  return cleaned.length > 160
    ? cleaned.slice(0, 157) + '...'
    : cleaned;
}

/**
 * Parse tool arguments from model adapter.
 * OpenAI API returns toolCall.function.arguments as a JSON string,
 * but our Zod schemas expect a Record<string, unknown> object.
 */
function parseToolArgs(raw: unknown): Record<string, unknown> {
  if (!raw) return {};
  // Already a Record (not array, not null)
  if (typeof raw === 'object' && !Array.isArray(raw) && raw !== null) return raw as Record<string, unknown>;
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      // Must be a plain object (not array, string, number, boolean, null)
      if (typeof parsed === 'object' && !Array.isArray(parsed) && parsed !== null) {
        return parsed as Record<string, unknown>;
      }
      // Array or primitive → wrap so Zod's record() accepts it
      return { _raw: raw, _value: parsed };
    } catch {
      return { _raw: raw };
    }
  }
  return {};
}

/**
 * Fast token estimation (heuristic).
 * Vietnamese: ~2-3 chars/token; English: ~4 chars/token.
 * Slightly overestimates to be safe. No external model call.
 */
export function estimateTokenCount(text: string): number {
  if (!text) return 0;
  const cjkChars = (text.match(/[㐀-鿿]/g) || []).length;
  const otherChars = text.length - cjkChars;
  // CJK: ~2 chars/token; Latin: ~4 chars/token
  return Math.ceil(cjkChars / 2 + otherChars / 4);
}

/**
 * Truncate prompt to fit within token budget.
 * Strategy: truncate contextFiles section (separated by '--- ' markers).
 * Falls back to truncating the last 30% of the whole prompt.
 */
export function truncatePrompt(prompt: string, maxTokens: number): string {
  const tokens = estimateTokenCount(prompt);
  if (tokens <= maxTokens) return prompt;

  // Try to truncate session/context blocks (between '--- ' markers)
  const sections = prompt.split(/--- /);
  // Remove pairs from the end (keep identity/soul at top)
  while (sections.length > 2 && estimateTokenCount(sections.join('--- ')) > maxTokens) {
    sections.splice(-2, 2); // Remove last 2 sections
  }
  const rejoined = sections.join('--- ');
  if (estimateTokenCount(rejoined) <= maxTokens) return rejoined;

  // Fallback: truncate last 30% of text
  const targetLen = Math.floor(prompt.length * (maxTokens / tokens));
  const truncated = prompt.slice(0, targetLen);
  return truncated + '\n\n[Context truncated due to length...]';
}

export class Engine extends EventEmitter {
  private registry: ProviderRegistry;
  private modelRouter: ModelRouter;
  private memory: MemoryFacade;
  private coralIdentityContext: string = '';
  private toolRegistry!: ToolRegistry;
  private agent!: Agent;
  private hooks: HookRegistry;
  private privilegeGuard: PrivilegeGuard;
  private responseCache: ResponseCache<string>;
  private rateLimiter: RateLimiterGroup;
  private perUserLimiter: PerUserRateLimiter;
  private temporalMemory: MemoryTemporal;
  private agenticMemory: MemoryTemporal;
  private storage!: CoralStorage;
  private eventBus!: EventBus;
  private eventStore!: EventStore;
  private eventLogger!: StructuredLogger;
  private pendingCallIds: Map<string, Array<{callId: string; decisionId: string}>> = new Map();
  private tasksWithToolCalls: Set<string> = new Set();
  // currentTaskId removed — now per-request via requestContext (AsyncLocalStorage)
  private agentRegistry!: AgentRegistry;
  private learner!: SelfEvolutionLearner;
  private checkpointStore: CheckpointStore;
  private taskQueue: TaskQueue;

  // updatePlanCtx removed — now per-request via requestContext (AsyncLocalStorage)

  /** In-flight promise dedup — same key = same promise */
  private pendingRequests: Map<string, Promise<EngineResponse>> = new Map();
  private consolidation!: MemoryConsolidation;

  constructor(registry?: ProviderRegistry) {
    super();
    this.registry = registry ?? new ProviderRegistry();
    this.modelRouter = new ModelRouter();
    this.consolidation = new MemoryConsolidation(this.modelRouter);
    this.memory = new MemoryFacade();
    this.hooks = globalHooks;
    this.privilegeGuard = new PrivilegeGuard({
      rules: createDefaultAllowRules(),
      defaultEffect: 'deny',  // Zero-Trust: reject unknown tools by default
      restrictedMode: false,
      restrictedAllowList: createRestrictedAllowList(),
    });
    this.responseCache = new ResponseCache<string>({
      maxSize: 500,
      defaultTTL: 5 * 60 * 1000,
    });
    this.rateLimiter = new RateLimiterGroup();
    this.rateLimiter.add('requests', { tokensPerInterval: 60, intervalMs: 60_000, maxBurst: 10 });
    this.rateLimiter.add('tokens', { tokensPerInterval: 100_000, intervalMs: 60_000, maxBurst: 20_000 });
    this.perUserLimiter = new PerUserRateLimiter({ tokensPerInterval: 20, intervalMs: 60_000, maxBurst: 5 });
    this.temporalMemory = new MemoryTemporal({ maxRetentionDays: 30 });
    this.agenticMemory = new MemoryTemporal({ maxRetentionDays: 30 });
    this.storage = getStorage();
    // Initialize event tables
    this.storage.initEventTables();
    this.eventStore = new EventStore(this.storage.getDb());
    this.eventBus = new EventBus(this.eventStore);
    this.eventLogger = new StructuredLogger(this.eventBus);
    this.checkpointStore = getCheckpoint();
    this.taskQueue = getTaskQueue();
  }

  async init(): Promise<void> {
    this.registry.loadFromConfig();
    await evolutionEngine.init();
    // Note: loadDefaultRules() removed — rule system simplified out
    this.toolRegistry = await getDefaultRegistry();
    evolutionEngine.attachToHooks(this.hooks);
    this.privilegeGuard.attachToHooks(this.hooks);
    this.modelRouter = await buildDefaultRouter(this.registry);

    // ── CrewAI Delegation: Register specialist agents + delegate_task tool ──
    this.agentRegistry = new AgentRegistry(this.modelRouter, this.toolRegistry);
    const delegatePlugin = createDelegatePlugin(this.agentRegistry);
    this.toolRegistry.use(delegatePlugin);
    log.info(`CrewAI delegation registered: ${this.agentRegistry.listAgents().join(', ')}`);

    // ── State-Driven Task Plan: Register update_plan tool ──
    const { createUpdatePlanPlugin } = await import('../plan/update-plan-tool.js');
    // updatePlanCtx removed — tool reads from getRequestContext() directly
    this.toolRegistry.use(createUpdatePlanPlugin(this.checkpointStore));
    log.info('State-Driven Task Plan registered (update_plan tool)');

    // ── Preload tool definitions AFTER all plugins are registered ──
    // BUG FIX: ensureToolDefinitionsLoaded() snapshot tool list at call time.
    // Must be called AFTER delegatePlugin + updatePlanPlugin are registered,
    // otherwise delegate_task and update_plan are never sent to the LLM.
    await ensureToolDefinitionsLoaded();

    // ── Auxiliary LLM call for context compression ──
    // Uses a separate LLM call with lower max_tokens for summarization
    const auxiliaryLlmCall = async (prompt: string): Promise<string> => {
      try {
        const response = await this.modelRouter.route(
          [{ role: 'user', content: prompt }],
          {
            maxTokens: 2000,          // Summaries should be concise
            temperature: 0.3,         // Lower temperature for factual summaries
            // Don't pass tools — summarization doesn't need them
          },
        );
        return response.content || '';
      } catch (err: any) {
        log.error(`Auxiliary LLM call failed: ${err.message}`);
        return '';
      }
    };

    const agentConfig: AgentConfig = {
      modelRouter: this.modelRouter,
      toolRegistry: this.toolRegistry,
      hooks: this.hooks,
      maxToolCycles: 10,
      debug: false,
      auxiliaryLlmCall,            // ← Context compression now works!
      checkpointStore: this.checkpointStore, // ← Cycle-level persistence
      contextManager: getContextManager(),  // ← Token budget management
      privilegeGuard: this.privilegeGuard,  // ← Direct tool authorization (defense-in-depth)
    };
    this.agent = new Agent(agentConfig);

    this.agent.on('cascade', (data: any) => { this.emit('cascade', data); });
    
    // Phase 4E-B.3: Hook reasoning:update events from Agent streaming
    this.agent.on('reasoning:update', (data: any) => {
      const taskId = getRequestContext()?.taskId ?? 'unknown';
      const chunk = (data.chunk as string) || '';
      const isFinal = (data.isFinal as boolean) || false;
      
      if (taskId && chunk) {
        console.log(`[ENGINE] Reasoning task=${taskId} final=${isFinal} len=${chunk.length}`);
        if (isFinal) {
          console.log(`[ENGINE] Reasoning complete for task ${taskId}: ${chunk.length} chars`);
        }
      }
    });
    
    await globalMemoryStore.init();

    // ═══ SELF-EVOLUTION LEARNER (Phase 6) ═══
    this.learner = new SelfEvolutionLearner(new ExperienceStore(), {
      maxExperiences: 5,
    });
    log.info('Self-Evolution Learner initialized');

    // ── CHECKPOINTSTORE: Initialize and restore in-progress tasks ──
    await this.checkpointStore.init();
    const inProgressCheckpoints = this.checkpointStore.getAllInProgress();
    if (inProgressCheckpoints.length > 0) {
      log.warn(`Found ${inProgressCheckpoints.length} in-progress checkpoint(s) from previous run:`);
      for (const cp of inProgressCheckpoints) {
        log.warn(`  ${cp.requestId} — ${cp.sessionId}, ${cp.cycles.length} cycle(s)`);
      }
    }

    // ── TASK QUEUE: Initialize and start background worker ──
    await this.taskQueue.init();
    // Wire engine's processInner as the executor for background tasks
    this.taskQueue['config'].executor = async (req: any) => {
      // Execute background task via processInner (no timeout)
      return this.processInner(req, `bg-${Date.now()}`);
    };
    this.taskQueue.start();
    log.info('TaskQueue background worker started');

    try {
      const existingBlocks = await globalMemoryStore.getAll();
      for (const block of existingBlocks) {
        await this.temporalMemory.addBlock(block.content || '', {
          type: block.type, sessionId: block.sessionId, tags: block.tags, entities: block.entities,
        });
      }
    } catch { /* silent */ }

    // ═══ EVENT BUS: tool:call → tool_called + decision_made ═══
    this.agent.onEvent('tool:call', async (data) => {
      const sessionId = (data.sessionId as string) || 'default';
      const taskId = getRequestContext()?.taskId ?? 'unknown';
      const toolName = (data.toolName as string) || 'unknown';
      const toolArgs = parseToolArgs(data.toolArgs);
      const cycle = (data.cycle as number) || 0;

      // Generate unique callId for this tool invocation
      const callId = randomUUID();

      // Track that this task used tools
      this.tasksWithToolCalls.add(taskId);

      // Generate decisionId for this tool call
      const decisionId = randomUUID();

      // Store callId + decisionId in queue for tool:result to pick up
      const queue = this.pendingCallIds.get(toolName) || [];
      queue.push({ callId, decisionId });
      this.pendingCallIds.set(toolName, queue);

      // Derive reasoning from upstream model response (agent.ts passes it through hook)
      const reasoningContent = (data.reasoningContent as string | null) || null;
      const reason = summarizeReasoning(reasoningContent) || `Tool selected (cycle ${cycle})`;
      const reasoningSnippet = reasoningContent?.slice(0, 1000);

      // Emit decision_made event — links reasoning to this tool call via decisionId
      const argsSummary = Object.keys(toolArgs).slice(0, 3).join(', ');
      this.eventLogger.decisionMade(
        taskId,
        decisionId,
        `Call ${toolName}`,
        reason,
        `Execute ${toolName}(${argsSummary})`,
        reasoningSnippet
      );

      // Emit tool_called event with callId + decisionId
      this.eventLogger.toolCall(taskId, decisionId, callId, toolName, toolArgs);
    }, 90);

    // ═══ EVENT BUS: tool:result → tool_finished + file events + error classification ═══
    this.agent.onEvent('tool:result', async (data) => {
      const sessionId = (data.sessionId as string) || 'default';
      const taskId = getRequestContext()?.taskId ?? 'unknown';
      const toolName = (data.toolName as string) || 'unknown';
      const toolArgs = parseToolArgs(data.args);
      const rawResult = data.result;
      const result = JSON.stringify(rawResult);

      // Fetch callId + decisionId from queue (FIFO — matches call order)
      const queue = this.pendingCallIds.get(toolName) || [];
      const entry = queue.shift() || { callId: randomUUID(), decisionId: randomUUID() };
      const { callId, decisionId } = entry;
      if (queue.length === 0) this.pendingCallIds.delete(toolName);

      // Track tool call on cache — used for side-effect detection to prevent caching tool-heavy responses
      this.responseCache.recordToolCall(toolName);

      // Emit tool_finished event with callId
      const success = !result.includes('"error"');
      this.eventLogger.toolResult(taskId, decisionId, callId, toolName, success, 0, toolArgs, result.substring(0, 500));

      // A1: Classify errors and attach to active plan item
      if (!success) {
        let errorMsg = '';
        if (rawResult && typeof rawResult === 'object' && 'error' in rawResult) {
          errorMsg = String((rawResult as any).error);
        } else {
          errorMsg = result.slice(0, 500);
        }
        const category = classifyError(errorMsg);
        // Store errorCategory in the current plan item if there's an active plan
        const plan = this.checkpointStore.getPlan(sessionId);
        if (plan && (plan.status === 'running' || plan.status === 'pending')) {
          const currentItem = plan.items[plan.currentItemIndex];
          if (currentItem && currentItem.status !== 'completed') {
            currentItem.errorCategory = category;
            currentItem.error = errorMsg.slice(0, 300);
            if (category === 'security') {
              // Security error → abort entire plan
              plan.status = 'aborted';
              plan.stopReason = `security_error: ${toolName} — ${errorMsg.slice(0, 200)}`;
              log.warn(`[Engine] Plan ${plan.id} ABORTED due to security error in ${toolName}`);
            }
            this.checkpointStore.setPlan(sessionId, plan);
            log.info(`[Engine A1] Tool ${toolName} error classified as "${category}": ${errorMsg.slice(0, 100)}`);
          }
        }
      }

      // Emit file events for file-writing tools
      const filePath = this.extractFilePath(toolName, toolArgs);
      if (filePath) {
        this.eventLogger.fileCreated(taskId, filePath);
      }

      if (result && result !== 'undefined' && result !== 'null') {
        await globalMemoryStore.add('task', `Tool ${toolName}: ${result.substring(0, 500)}`, {
          tags: ['tool_result', toolName], sessionId,
          source: { type: 'tool', uri: toolName },
        });
        await this.agenticMemory.addBlockForAgent('engine', {
          type: 'task', content: `Tool ${toolName}: ${result.substring(0, 500)}`,
          tags: ['tool_result', toolName], sessionId,
        });
      }
    }, 100);

    this.agent.onEvent('model:response', async (data) => {
      const sessionId = (data.sessionId as string) || 'default';
      const taskId = getRequestContext()?.taskId ?? 'unknown';
      if (data.finishReason === 'stop' && data.content) {
        // Direct response path: no tools were called → emit decision_made so Mission Mode is never blind
        if (!this.tasksWithToolCalls.has(taskId)) {
          const decisionId = randomUUID();
          const reasoningContent = (data.reasoningContent as string | null) || null;
          const reason = summarizeReasoning(reasoningContent) || 'Respond directly';
          const reasoningSnippet = reasoningContent?.slice(0, 1000);

          this.eventLogger.decisionMade(
            taskId,
            decisionId,
            'Respond directly',
            reason,
            'Generate response',
            reasoningSnippet
          );
        }

        await this.agenticMemory.addBlockForAgent('engine', {
          type: 'session', content: String(data.content).substring(0, 1000),
          tags: ['assistant_response'], sessionId,
        });
      }
    }, 100);

    const identityParts: string[] = [];
    for (const fp of CORAL_IDENTITY_FILES) {
      try {
        const content = await readFile(fp, 'utf8');
        identityParts.push(`--- ${fp} ---\n${content}`);
      } catch { /* silent */ }
    }
    this.coralIdentityContext = identityParts.join('\n\n');
    if (process.env.CORAL_WARMUP !== 'false') {
      this.warmup().catch(() => {});
    }
    const adapters = this.modelRouter.listAdapters();
    /* Engine initialized */
  }

  private async warmup(): Promise<void> {
    try {
      const start = Date.now();
      await this.modelRouter.route([{ role: 'user', content: 'ping' }], { maxTokens: 10 });
      /* warmup complete */
    } catch { /* silent */ }
  }

  checkPrivilege(toolName: string, tags?: string[]): { allowed: boolean; reason?: string } {
    return this.privilegeGuard.check(toolName, tags);
  }

  setRestrictedMode(enabled: boolean, allowList?: string[]): void {
    this.privilegeGuard.setRestrictedMode(enabled, allowList);
  }

  setRestrictedAllowList(allowList: string[]): void {
    this.privilegeGuard.setRestrictedMode(this.privilegeGuard.isRestrictedMode(), allowList);
  }

  getCache(): ResponseCache<string> { return this.responseCache; }
  getPrivilegeGuard(): PrivilegeGuard { return this.privilegeGuard; }
  getTemporalMemory(): MemoryTemporal { return this.temporalMemory; }
  getAgenticMemory(): MemoryTemporal { return this.agenticMemory; }
  getMemoryFacade(): MemoryFacade { return this.memory; }

  // ═══════════════════════════════════════════════════════════════
  // PHASE 3: Smart Fallback + DAG Cycle Detection + Hybrid Routing
  // ═══════════════════════════════════════════════════════════════

  async process(request: EngineRequest): Promise<EngineResponse> {
    // Rate limit check (global)
    if (!this.rateLimiter.tryAll(1)) {
      auditLogger.log({ level: 'warn', category: 'rate_limit', sessionId: request.sessionId, userId: request.userId, detail: 'Global rate limit exceeded' });
      this.emit('alert:rate_limit', { userId: request.userId || request.sessionId, type: 'global' });
      return { content: '❌ Rate limit exceeded.', modelUsed: 'none', providerUsed: 'rate-limiter' };
    }

    // Rate limit check (per-user: 20 req/min per user)
    // WARNING: Must use request.userId (not request.sessionId) — sessionId is a
    // ConversationSessionId (UUID) that changes on /new, while userId is permanent.
    // Using sessionId here would allow /new to bypass rate limits.
    const actualUserId = request.userId || 'anonymous';
    if (!this.perUserLimiter.tryConsume(actualUserId)) {
      log.warn(`Per-user rate limit exceeded for ${actualUserId}`);
      auditLogger.log({ level: 'warn', category: 'rate_limit', userId: actualUserId, detail: 'Per-user rate limit exceeded' });
      this.emit('alert:rate_limit', { userId: actualUserId, type: 'per_user' });
      return { content: '❌ Bạn đã gửi quá nhiều tin nhắn. Vui lòng thử lại sau.', modelUsed: 'none', providerUsed: 'rate-limiter' };
    }

    // Circuit breaker check — if open, return friendly error immediately
    if (!this.agent.circuitBreakerState.isHealthy()) {
      log.warn(`Circuit breaker OPEN for ${actualUserId} — request rejected`);
      this.emit('alert:circuit_breaker', { userId: actualUserId });
      return {
        content: '⚠️ Hệ thống đang bận. Vui lòng thử lại sau 1 phút.',
        modelUsed: 'none',
        providerUsed: 'circuit-breaker',
      };
    }

    // Reset side-effect tracking for this request
    this.responseCache.beginRequest();

    const lastMessage = request.messages[request.messages.length - 1]?.content || '';
    if (!lastMessage.trim()) {
      return { content: '❌ Tin nhắn trống.', modelUsed: 'none', providerUsed: 'none' };
    }

    // ── BACKGROUND TASK ROUTING ──
    // If the request is explicitly marked as background, route to TaskQueue instead
    // of running synchronously with REQUEST_TIMEOUT_MS.
    if (request.taskType === 'background') {
      const taskId = this.taskQueue.enqueue(request);
      log.info(`Routed to background queue: ${taskId} — "${lastMessage.slice(0, 50)}"`);
      return {
        content: `✅ Nhiệm vụ nền đã được tạo với ID: \`${taskId}\`\nDùng /status ${taskId} để theo dõi tiến độ.`,
        modelUsed: 'task-queue',
        providerUsed: 'task-queue',
      };
    }

    // ── SMART CACHE: content-based key + request coalescing ──
    const cacheKey = ResponseCache.buildKey(
      request.modelId || 'default',
      request.sessionId || 'default',
      lastMessage.toLowerCase().trim(),  // Normalized for exact-match dedup
    );

    // Coalesce: if same request is in-flight, reuse its result
    const pending = this.pendingRequests.get(cacheKey);
    if (pending) {
      log.info(`Coalescing duplicate request: "${lastMessage.slice(0, 50)}"`);
      return await pending;
    }

    // Cache read: get() auto-bypasses for real-time queries (isRealTimeQuery)
    const cachedContent = this.responseCache.get(cacheKey, lastMessage);
    if (cachedContent) {
      log.info(`HIT for: "${lastMessage.slice(0, 50)}"`);
      return { content: cachedContent, modelUsed: 'cache', providerUsed: 'cache' };
    }

    // Cache MISS — create in-flight promise for coalescing
    // Wrap with request-level timeout to prevent unbounded hanging
    const requestId = request.sessionId || `req-${Date.now()}`;
    R.pendingReq({ event: 'CREATE', cacheKey });
    R.waitBegin({ requestId, label: 'processInner', callerFile: 'engine.ts', callerLine: 533 });
    const resultPromise = this.processInner(request, cacheKey).catch((err: any) => {
      // If timeout from inner layer, return friendly error instead of propagating
      if (err.message?.includes('timed out')) {
        this.emit('alert:timeout', { sessionId: request.sessionId, message: err.message });
        return {
          content: '⚠️ Yêu cầu xử lý quá lâu. Vui lòng thử lại.',
          modelUsed: 'none',
          providerUsed: 'timeout',
        };
      }
      throw err;
    });
    this.pendingRequests.set(cacheKey, resultPromise);

    // ── PendingRequests TTL Cleanup (Tier 2 Fix) ──
    // If this entry doesn't settle within REQUEST_TIMEOUT_MS + 10s, force-cleanup
    // This prevents memory leaks when LLM hangs indefinitely
    const pendingKey = cacheKey;
    const cleanupTimer = setTimeout(() => {
      if (this.pendingRequests.has(pendingKey)) {
        log.warn(`PendingRequest stale cleanup: "${pendingKey.slice(0, 60)}"`);
        this.emit('alert:stale_cleanup', { key: pendingKey });
        this.pendingRequests.delete(pendingKey);
      }
    }, REQUEST_TIMEOUT_MS + 10_000);
    // Don't keep the event loop alive just for cleanup
    if (typeof cleanupTimer === 'object' && 'unref' in cleanupTimer) {
      (cleanupTimer as NodeJS.Timeout).unref();
    }

    try {
      return await resultPromise;
    } finally {
      R.waitEnd({ requestId, label: 'processInner', callerFile: 'engine.ts', callerLine: 564 });
      this.pendingRequests.delete(cacheKey);
      R.pendingReq({ event: 'DELETE', cacheKey });
      clearTimeout(cleanupTimer);
    }
  }

  /**
   * Inner processing logic — runs after cache miss.
   * Builds system prompt, runs agent, writes to cache if safe.
   */
  private async processInner(request: EngineRequest, cacheKey: string): Promise<EngineResponse> {
    const startTime = Date.now();
    const userMessage = request.messages[request.messages.length - 1]?.content || '';
    const taskId = `task-${Date.now()}`;
    const sessionId = request.sessionId || 'default';
    const requestId = request.sessionId || `req-${Date.now()}`;
    R.state({ event: 'RECEIVED', requestId, taskId });
    
    // ── Per-request context via AsyncLocalStorage (eliminates concurrent-request races) ──
    requestContext.enterWith({
      sessionId,
      taskId,
      evidenceLog: new Map() as import('../plan/types.js').EvidenceLog,
      onPlanCreated: (_itemCount: number) => {
        this.agent.setMaxToolCycles(ABSOLUTE_SAFETY_CEILING);
      },
    });

    // ── CHECKPOINT: Start tracking this request ──
    this.checkpointStore.start(taskId, sessionId, typeof userMessage === 'string' ? userMessage.slice(0, 200) : 'Non-text task');
    
    // Publish task_started event
    this.eventLogger.taskStarted(taskId, typeof userMessage === 'string' ? userMessage.substring(0, 200) : 'Unknown task');

    // ── MEMORY RECALL (Phase 1) ──
    // Query memory store for relevant context before building prompt
    let memoryContext: string | undefined;
    // Waku-inspired retrieval gate: skip memory for trivial messages (greetings, fillers)
    const msgStr = typeof userMessage === 'string' ? userMessage : '';
    const gateDecision = shouldRecallMemory(msgStr);
    if (gateDecision.shouldRetrieve) {
      try {
        const memoryBlocks = await globalMemoryStore.query(userMessage, {
          topK: 10,
          sessionId,
          sourceTypes: ['user', 'web', 'cron', 'legacy'], // ponytail: exclude raw tool blocks — noisy + injection risk
        });
        if (memoryBlocks.length > 0) {
          const memoryLines = memoryBlocks.map((block, i) => {
            const timeStr = block.timestamp ? new Date(block.timestamp).toLocaleString('vi-VN', { timeZone: 'Asia/Bangkok' }) : 'unknown';
            const tags = block.tags?.length ? ` [${block.tags.join(', ')}]` : '';
            return `${i + 1}. [${block.type}${tags}] (${timeStr}): ${block.content.substring(0, 200)}`;
          });
          memoryContext = memoryLines.join('\n');
          log.info(`Memory recall: ${memoryBlocks.length} block(s) for "${msgStr.substring(0, 50)}"`);
        }
      } catch (err: any) {
        log.warn(`Memory recall failed: ${err.message}`);
      }
    } else {
      log.debug(`Memory gate: skipped recall (reason: ${gateDecision.reason})`);
    }

    // ── LEARNING CONTEXT (Phase 6) ──
    let learningContext: string | null = null;
    try {
      const taskStr = request.task || request.messages[request.messages.length - 1]?.content?.substring(0, 200) || '';
      if (taskStr) {
        learningContext = await this.learner.getContext(taskStr);
      }
    } catch (err: any) {
      log.warn(`Learning context fetch failed: ${err.message}`);
    }

    // ponytail: inject cached world state (no re-probe)
    const worldState = worldModel.getState();

    // ── STATE-DRIVEN TASK PLAN: Check for active plan ──
    // ADR-001: Use derivePlanState + isGuardActive instead of truthy-check on getPlan().
    // A completed/failed/aborted plan is NOT active — only planning/executing states are.
    let planContext: string | undefined;
    const planState = derivePlanState(this.checkpointStore, sessionId);
    const activePlan = isGuardActive(planState) ? this.checkpointStore.getPlan(sessionId) : null;
    if (activePlan) {
      // Resume paused_limit automatically (no user input needed)
      if (activePlan.status === 'paused_limit') {
        activePlan.status = 'running';
        this.checkpointStore.setPlan(sessionId, activePlan);
        log.info(`[Engine] Auto-resumed plan ${activePlan.id} from paused_limit → running`);
      }

      // Nếu plan bị stuck → inject thông điệp khác hẳn (output contract)
      if (activePlan.status === 'stuck') {
        const stuckItem = activePlan.items[activePlan.currentItemIndex];
        const completedItems = activePlan.items.filter(i => i.status === 'completed');
        const completedStr = completedItems.length > 0
          ? completedItems.map(i => `- ✅ Item ${i.index}: ${i.description}`).join('\n')
          : '(chưa có)';
        const stuckLines = stuckItem
          ? `⚠️ Đang bị kẹt ở bước: ${stuckItem.description}
Đã thử ${stuckItem.consecutiveFailedAttempts || 0} lần liên tiếp không thành công.
Lỗi gần nhất: ${stuckItem.error || 'N/A'}

Để tiếp tục, bạn có thể:
- (a) Thử cách khác → gọi tool mới
- (b) Bỏ qua bước này → update_plan(action='skip_item', item_index=${stuckItem.index}, reason="...")
- (c) Dừng hẳn → update_plan(action='abort', reason="...")`
          : '';

        planContext = `## 📋 PLAN BỊ KẸT (Stuck Task Plan)
ID: ${activePlan.id}
Mục tiêu: ${activePlan.goal}
Trạng thái: stuck (bị kẹt), cần bạn quyết định hướng đi khác.
Các bước trước đó đã hoàn thành:
${completedStr}

${stuckLines}
`;
        log.info(`[Engine] Plan ${activePlan.id} is stuck at item ${activePlan.currentItemIndex}`);
      } else {
        // Build normal active plan context
        const itemLines = activePlan.items.map(item => {
          const check = item.status === 'completed' ? '[✅]' :
                        item.status === 'in_progress' ? '[🔄]' :
                        item.status === 'failed' ? '[❌]' :
                        item.status === 'skipped' ? '[⏭️]' :
                        item.status === 'pending' ? '[⬜]' : '[⬜]';
          const result = item.resultSummary ? ` — ${item.resultSummary}` : '';
          const err = item.error ? ` ⚠️ ${item.error}` : '';
          return `${check} Item ${item.index}: ${item.description}${result}${err}`;
        }).join('\n');

        planContext = `## 📋 KẾ HOẠCH HIỆN TẠI (Active Task Plan)
ID: ${activePlan.id}
Mục tiêu: ${activePlan.goal}
Trạng thái: ${activePlan.status}
Vị trí hiện tại: item ${activePlan.currentItemIndex}/${activePlan.items.length}

Các item:
${itemLines}

⚠️ QUY TẮC: Bạn ĐANG thực thi plan này.
- Item đang làm: ${activePlan.items[activePlan.currentItemIndex]?.description || 'N/A'}
- Item đã hoàn thành: GIỮ NGUYÊN, không làm lại.
- Để đánh dấu item hoàn thành: update_plan(action='complete_item', item_index=N, result_summary="...")
- Để bỏ qua item lỗi: update_plan(action='skip_item', item_index=N, reason="...")
- KHÔNG tạo plan mới. KHÔNG gọi update_plan(action='create') khi đã có plan active.
`;
      }

      // maxToolCycles luôn là ABSOLUTE_SAFETY_CEILING (cầu chì tuyệt đối, không phải budget công việc)
      this.agent.setMaxToolCycles(ABSOLUTE_SAFETY_CEILING);
      log.info(`[Engine] Plan ${activePlan.id}: maxToolCycles set to absolute ceiling ${ABSOLUTE_SAFETY_CEILING} (stagnation tracking is primary)`);
    } else {
      // No active plan → Planning Phase: instruct LLM to create one
      // maxToolCycles cũng là ABSOLUTE_SAFETY_CEILING — stagnation tracking là tín hiệu dừng chính
      this.agent.setMaxToolCycles(ABSOLUTE_SAFETY_CEILING);
      log.info(`[Engine] No active plan: maxToolCycles set to ${ABSOLUTE_SAFETY_CEILING}`);

      planContext = `## 📋 LẬP KẾ HOẠCH (Planning Phase) — BẮT BUỘC

⚠️ Đây là request MỚI. Bạn PHẢI gọi \`update_plan\` NGAY để tạo kế hoạch trước khi làm bất kỳ việc gì khác.

QUY TRÌNH BẮT BUỘC:
1. Cycle đầu tiên: gọi \`update_plan(action='create', items=[...])\` với danh sách các bước cần làm.
2. SAU KHI tạo plan, KHÔNG mô tả lại plan bằng văn bản. Gọi NGAY tool thực thi item đầu tiên.
3. Dùng \`update_plan(action='complete_item', item_index=N, result_summary="...")\` sau mỗi bước.
4. Khi hết items → plan tự động completed.

VÍ DỤ SAI: gọi update_plan(create) → viết text dài "Kế hoạch của tôi là 1. ... 2. ... 3. ..." và dừng.
VÍ DỤ ĐÚNG: gọi update_plan(create) → gọi ngay tool để thực thi item 0 → complete_item(0) → item 1 → ... → hết items thì plan tự completed.

LƯU Ý:
- Kể cả request chỉ có 1 bước (VD: trả lời câu hỏi đơn giản) cũng PHẢI gọi update_plan(action='create', items=['Trả lời câu hỏi: ...']).
- items là mảng các string mô tả bước công việc.
- KHÔNG có exception. KHÔNG có fast path.
`;
    }

    // Build system prompt WITHOUT planContext first (B1: protect from truncation)
    const promptBuilder = new PromptBuilder();
    const basePrompt = promptBuilder.buildSystem({
      agentName: request.agentName,
      mentionPrefix: request.mentionPrefix,
      task: request.task,
      contextFiles: this.coralIdentityContext || undefined,
      memoryContext,
      learningContext: learningContext || undefined,
      references: request.references,
      constraints: request.constraints,
      currentRequest: request.messages[request.messages.length - 1]?.content || '',
      worldContext: worldState,
      platformMeta: request.platformMeta,
      // planContext deliberately omitted — appended AFTER truncation below
    });

    // ── Prompt Length Guard — planContext APPENDED AFTER truncation (B1) ──
    const MAX_PROMPT_TOKENS = 3000;
    let promptBody = basePrompt;
    const estimatedBaseTokens = estimateTokenCount(promptBody);
    if (estimatedBaseTokens > MAX_PROMPT_TOKENS) {
      log.warn(`Prompt too long: ~${estimatedBaseTokens} tokens (max ${MAX_PROMPT_TOKENS}). Truncating context.`);
      this.emit('alert:prompt_truncated', { originalTokens: estimatedBaseTokens, maxTokens: MAX_PROMPT_TOKENS });
      promptBody = truncatePrompt(promptBody, MAX_PROMPT_TOKENS);
    }
    // B1: Append planContext AFTER truncation — guaranteed not to be cut
    const systemPrompt = planContext ? `${promptBody}\n\n${planContext}` : promptBody;

    // B2: context for update_plan tool is set via requestContext.enterWith() at processInner top.
    // onPlanCreated callback was also set there. updatePlanCtx on Engine singleton is removed.

    // ── B4: Shared handler for cycle-limit-hit (cầu chì tuyệt đối chống runaway) ──
    const handleCycleLimit = (result: any): EngineResponse | null => {
      if (!result.cycleLimitReached) return null;
      const plan = activePlan ? this.checkpointStore.getPlan(sessionId) : null;
      if (plan && (plan.status === 'running' || plan.status === 'pending')) {
        const hitAbsoluteCeiling = result.toolCycles >= ABSOLUTE_SAFETY_CEILING;
        if (hitAbsoluteCeiling) {
          log.warn(`⚠️⚠️⚠️ [Engine] Plan ${plan.id} hit ABSOLUTE_SAFETY_CEILING (${ABSOLUTE_SAFETY_CEILING}) — possible bug! Counter stagnation logic may be broken.`);
        }
        plan.status = 'paused_limit';
        plan.stopReason = hitAbsoluteCeiling ? `absolute_safety_ceiling (${result.toolCycles})` : `maxToolCycles (${result.toolCycles})`;
        this.checkpointStore.setPlan(sessionId, plan);
        log.info(`[Engine] Plan ${plan.id} → paused_limit after ${result.toolCycles} cycles`);
      }
      // B3: Structured output contract
      let contract = `⏸️ **Plan paused** — đã dùng ${result.toolCycles} tool cycles (giới hạn ${this.agent.getMaxToolCycles()}).\n\n`;
      if (plan) {
        const stats = { completed: 0, skipped: 0, failed: 0, inProgress: 0, pending: 0 };
        for (const i of plan.items) {
          if (i.status === 'completed') stats.completed++;
          else if (i.status === 'skipped') stats.skipped++;
          else if (i.status === 'failed') stats.failed++;
          else if (i.status === 'in_progress') stats.inProgress++;
          else if (i.status === 'pending') stats.pending++;
        }
        contract += `**Tiến độ:** ${stats.completed} ✅ | ${stats.skipped} ⏭️ | ${stats.failed} ❌ | ${stats.inProgress} 🔄 | ${stats.pending} ⬜ (tổng ${plan.items.length})\n`;
        if (plan.currentItemIndex < plan.items.length) {
          const current = plan.items[plan.currentItemIndex];
          contract += `**Đang dở:** Item ${current.index}: ${current.description}\n`;
          const remaining = plan.items.filter(i => i.status === 'pending' || i.status === 'in_progress').map(i => `- Item ${i.index}: ${i.description}`);
          if (remaining.length > 0) {
            contract += `**Còn lại:**\n${remaining.join('\n')}\n`;
          }
        }
        contract += `**Lý do dừng:** ${plan.stopReason || 'maxToolCycles'}\n`;
        contract += `_Gửi tin nhắn mới để tiếp tục._`;
      }
      return { content: contract, modelUsed: 'paused_limit', providerUsed: 'paused_limit' };
    };

    const agentRequest: EngineRequest = { ...request, systemPrompt, checkpointRequestId: taskId, currentGoal: typeof userMessage === 'string' ? userMessage.slice(0, 200) : undefined };

    try {
      R.waitBegin({ requestId, label: 'agent.run', callerFile: 'engine.ts', callerLine: 700 });
      const result = await this.agent.run(agentRequest);

      // ── Handle cycle limit hit mid-plan → paused_limit (B4: shared handler) ──
      const pausedResponse = handleCycleLimit(result);
      if (pausedResponse) return pausedResponse;

      // Smart cache write: ONLY if no tools were called (pure LLM knowledge response)
      if (result.toolCycles === 0) {
        const ttl = 120_000;
        this.responseCache.set(cacheKey, result.content, ttl);
        log.info(`Stored (no tools, TTL=${ttl/1000}s): "${result.content.slice(0, 50)}"`);
      } else {
        log.info(`Skipped cache (${result.toolCycles} tool cycles)`);
      }

      // Log session to SQLite for persistence
      try {
        const sessionId = request.sessionId || 'default';
        if (request.messages.length > 0) {
          const lastMsg = request.messages[request.messages.length - 1];
          this.storage.addSessionMessage(sessionId, sessionId, lastMsg.role, 
            typeof lastMsg.content === 'string' ? lastMsg.content : String(lastMsg.content || ''), 0);
          this.storage.addSessionMessage(sessionId, sessionId, 'assistant', 
            result.content, 0);
        }
      } catch (e) {
        log.warn('SQLite session log failed', { error: String(e) });
      }

      // Publish task_finished event
      const duration = Date.now() - startTime;
      this.eventLogger.taskFinished(taskId, typeof userMessage === 'string' ? userMessage.substring(0, 200) : 'Unknown task', true, duration, result.content.substring(0, 500));

      // ── CHECKPOINT: Mark success ──
      this.checkpointStore.complete(taskId, { content: result.content, modelUsed: result.modelUsed, providerUsed: result.providerUsed });

      return {
        content: result.content,
        modelUsed: result.modelUsed,
        providerUsed: result.providerUsed,
      };
    } catch (agentErr: any) {
      log.error(`Agent run failed: ${agentErr.message}`);
      evolutionEngine.recordError({
        modelId: request.messages[request.messages.length - 1]?.content?.substring(0, 100) || 'unknown',
        errorType: 'ENGINE_AGENT_FAILED',
        errorMessage: agentErr.message,
        stackTrace: agentErr.stack,
        sessionId: request.sessionId || 'unknown',
        contextSnippet: request.messages[request.messages.length - 1]?.content?.substring(0, 200),
      }).catch(() => {});

      // Emit alert event (event-based, no coupling)
      this.emit('alert:agent_error', {
        message: agentErr.message,
        sessionId: request.sessionId,
        errorType: 'ENGINE_AGENT_FAILED',
      });

      // Publish error event
      const duration = Date.now() - startTime;
      this.eventLogger.error(agentErr.message, agentErr.stack, 'ENGINE_AGENT_FAILED');
      this.eventLogger.taskFinished(taskId, typeof userMessage === 'string' ? userMessage.substring(0, 200) : 'Unknown task', false, duration, agentErr.message);
      
      // ── CHECKPOINT: Mark failure ──
      this.checkpointStore.failed(taskId, { message: agentErr.message, stack: agentErr.stack });

      return {
        content: `❌ Lỗi khi xử lý: ${agentErr.message}`,
        modelUsed: 'none',
        providerUsed: 'none',
      };
    }
  }

  async saveMessage(sessionId: string, message: ChatMessage): Promise<void> {
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

  getEventBus(): EventBus {
      return this.eventBus;
    }

    getTaskQueue(): TaskQueue {
      return this.taskQueue;
    }

    /**
     * Get AgentRegistry for delegation (used by TelegramMessageHandler)
     */
    getAgentRegistry(): AgentRegistry {
      return this.agentRegistry;
    }

    // ── File Event Helpers ──

  /**
   * Extract file path from tool name + args for file event emission.
   * Returns the path if the tool is known to write/create files, or null.
   */
  private extractFilePath(toolName: string, args: Record<string, unknown>): string | null {
    switch (toolName) {
      case 'write_wiki_page':
        return (args.path as string) || null;
      case 'extract_pdf_to_md':
      case 'extract_docx_to_md':
        return (args.outputPath as string) || (args.path as string) || null;
      case 'archive_document':
        return (args.path as string) || null;
      case 'read_file':
      case 'list_directory':
      case 'search_knowledge_graph':
      case 'search_archived_md':
      case 'quote_from_source':
      case 'load_skill':
      case 'list_skills':
      case 'skill_view':
      case 'web_search':
      case 'fetch_url':
      case 'execute_command':
      case 'generate_report':
        return null; // read-only or non-file tools
      default:
        return null;
    }
  }

  // ── Graceful Cleanup ──

  /**
   * Flush in-memory stores to disk without closing database connections.
   * Safe to call periodically (e.g. cron job memory-flush).
   */
  async flush(): Promise<void> {
    log.info('Flushing memory stores...');
    try {
      await Promise.all([
          this.temporalMemory.flush().catch((e: any) => log.warn('temporalMemory flush failed', { error: String(e) })),
          this.agenticMemory.flush().catch((e: any) => log.warn('agenticMemory flush failed', { error: String(e) })),
          this.checkpointStore.flush().catch((e: any) => log.warn('checkpointStore flush failed', { error: String(e) })),
          this.taskQueue.flush().catch((e: any) => log.warn('taskQueue flush failed', { error: String(e) })),
        ]);
        // Periodically prune stale events from SQLite
        try {
          const pruned = this.eventStore.prune(14, 10000);
          if (pruned.deletedOld > 0 || pruned.deletedOver > 0) {
            log.info(`Event store pruned: ${pruned.deletedOld} old + ${pruned.deletedOver} excess events removed`);
          }
        } catch (e: any) {
          log.warn('Event store prune failed', { error: String(e) });
        }
        // Trim in-flight tracking maps to prevent unbounded growth
      if (this.tasksWithToolCalls.size > 1000) {
        log.warn(`Clearing ${this.tasksWithToolCalls.size} stale tasksWithToolCalls`);
        this.tasksWithToolCalls.clear();
      }
      if (this.pendingCallIds.size > 100) {
        log.warn(`Clearing ${this.pendingCallIds.size} stale pendingCallIds`);
        this.pendingCallIds.clear();
      }
      log.info('Memory stores flushed');
    } catch (err) {
      log.error('Error during memory flush', { error: String(err) });
    }
  }

  /**
   * Flush all memory stores and release resources.
   * Called during graceful shutdown ONLY — closes DB connections permanently.
   */
  async cleanup(): Promise<void> {
    log.info('Performing cleanup...');
    try {
      await Promise.all([
        this.temporalMemory.close().catch((e: any) => log.warn('temporalMemory close failed', { error: String(e) })),
        this.agenticMemory.close().catch((e: any) => log.warn('agenticMemory close failed', { error: String(e) })),
        this.checkpointStore.shutdown().catch((e: any) => log.warn('checkpointStore shutdown failed', { error: String(e) })),
        this.taskQueue.stop().catch((e: any) => log.warn('taskQueue stop failed', { error: String(e) })),
      ]);
      // Close SQLite storage
      try { this.storage.close(); } catch (e) { log.warn('SQLite close failed', { error: String(e) }); }
      log.info('Cleanup complete');
    } catch (err) {
      log.error('Error during cleanup', { error: String(err) });
    }
  }
}

export default Engine;
