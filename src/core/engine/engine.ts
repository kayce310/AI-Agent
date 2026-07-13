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
function estimateTokenCount(text: string): number {
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
function truncatePrompt(prompt: string, maxTokens: number): string {
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
  private currentTaskId: string = 'default';

  private agentRegistry!: AgentRegistry;
  private learner!: SelfEvolutionLearner;
  private checkpointStore: CheckpointStore;
  private taskQueue: TaskQueue;

  /** In-flight promise dedup — same key = same promise */
  private pendingRequests: Map<string, Promise<EngineResponse>> = new Map();

  constructor(registry?: ProviderRegistry) {
    super();
    this.registry = registry ?? new ProviderRegistry();
    this.modelRouter = new ModelRouter();
    this.memory = new MemoryFacade();
    this.hooks = globalHooks;
    this.privilegeGuard = new PrivilegeGuard({
      rules: createDefaultAllowRules(),
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

  private sanitizeResponse(content: string): string {
    if (!content) return content;
    return String(content)
      .replace(/<longcat_tool_call[\s\S]*?<\/longcat_tool_call>/gi, '')
      .replace(/<tool_call[\s\S]*?<\/tool_call>/gi, '')
      .replace(/<longcat_arg_key>[\s\S]*?<\/longcat_arg_key>/gi, '')
      .replace(/<longcat_arg_value>[\s\S]*?<\/longcat_arg_value>/gi, '')
      .trim();
  }

  async init(): Promise<void> {
    this.registry.loadFromConfig();
    await evolutionEngine.init();
    // Note: loadDefaultRules() removed — rule system simplified out
    this.toolRegistry = await getDefaultRegistry();
    await ensureToolDefinitionsLoaded();
    evolutionEngine.attachToHooks(this.hooks);
    this.privilegeGuard.attachToHooks(this.hooks);
    this.modelRouter = await buildDefaultRouter(this.registry);

    // ── CrewAI Delegation: Register specialist agents + delegate_task tool ──
    this.agentRegistry = new AgentRegistry(this.modelRouter, this.toolRegistry);
    const delegatePlugin = createDelegatePlugin(this.agentRegistry);
    this.toolRegistry.use(delegatePlugin);
    log.info(`CrewAI delegation registered: ${this.agentRegistry.listAgents().join(', ')}`);

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
    };
    this.agent = new Agent(agentConfig);

    this.agent.on('cascade', (data: any) => { this.emit('cascade', data); });
    
    // Phase 4E-B.3: Hook reasoning:update events from Agent streaming
    this.agent.on('reasoning:update', (data: any) => {
      const taskId = this.currentTaskId;
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

    // ═══ HEAP MONITOR: warn if heap > 750MB, log every 5min ═══
    const HEAP_WARN_MB = 750;
    setInterval(() => {
      const usage = process.memoryUsage().heapUsed / 1024 / 1024;
      const rss = process.memoryUsage().rss / 1024 / 1024;
      if (usage > HEAP_WARN_MB) {
        log.warn(`HEAP HIGH: ${usage.toFixed(0)}MB used (RSS ${rss.toFixed(0)}MB) — possible leak`);
      } else {
        log.info(`Heap: ${usage.toFixed(0)}MB used / ${rss.toFixed(0)}MB RSS`);
      }
    }, 5 * 60 * 1000).unref();

    // ═══ EVENT BUS: tool:call → tool_called + decision_made ═══
    this.agent.onEvent('tool:call', async (data) => {
      const sessionId = (data.sessionId as string) || 'default';
      const taskId = this.currentTaskId;
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

    // ═══ EVENT BUS: tool:result → tool_finished + file events ═══
    this.agent.onEvent('tool:result', async (data) => {
      const sessionId = (data.sessionId as string) || 'default';
      const taskId = this.currentTaskId;
      const toolName = (data.toolName as string) || 'unknown';
      const toolArgs = parseToolArgs(data.args);
      const result = JSON.stringify(data.result);

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

      // Emit file events for file-writing tools
      const filePath = this.extractFilePath(toolName, toolArgs);
      if (filePath) {
        this.eventLogger.fileCreated(taskId, filePath);
      }

      if (result && result !== 'undefined' && result !== 'null') {
        await globalMemoryStore.add('task', `Tool ${toolName}: ${result.substring(0, 500)}`, {
          tags: ['tool_result', toolName], sessionId,
        });
        await this.agenticMemory.addBlockForAgent('engine', {
          type: 'task', content: `Tool ${toolName}: ${result.substring(0, 500)}`,
          tags: ['tool_result', toolName], sessionId,
        });
      }
    }, 100);

    this.agent.onEvent('model:response', async (data) => {
      const sessionId = (data.sessionId as string) || 'default';
      const taskId = this.currentTaskId;
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
      auditLogger.log({ level: 'warn', category: 'rate_limit', sessionId: request.sessionId, detail: 'Global rate limit exceeded' });
      this.emit('alert:rate_limit', { userId: request.sessionId, type: 'global' });
      return { content: '❌ Rate limit exceeded.', modelUsed: 'none', providerUsed: 'rate-limiter' };
    }

    // Rate limit check (per-user: 20 req/min per user)
    const userId = request.sessionId || 'anonymous';
    if (!this.perUserLimiter.tryConsume(userId)) {
      log.warn(`Per-user rate limit exceeded for ${userId}`);
      auditLogger.log({ level: 'warn', category: 'rate_limit', userId, detail: 'Per-user rate limit exceeded' });
      this.emit('alert:rate_limit', { userId, type: 'per_user' });
      return { content: '❌ Bạn đã gửi quá nhiều tin nhắn. Vui lòng thử lại sau.', modelUsed: 'none', providerUsed: 'rate-limiter' };
    }

    // Circuit breaker check — if open, return friendly error immediately
    if (!this.agent.circuitBreakerState.isHealthy()) {
      log.warn(`Circuit breaker OPEN for ${userId} — request rejected`);
      this.emit('alert:circuit_breaker', { userId });
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
    this.currentTaskId = taskId;
    const sessionId = request.sessionId || 'default';
    const requestId = request.sessionId || `req-${Date.now()}`;
    R.state({ event: 'RECEIVED', requestId, taskId });
    
    // ── CHECKPOINT: Start tracking this request ──
    this.checkpointStore.start(taskId, sessionId, typeof userMessage === 'string' ? userMessage.slice(0, 200) : 'Non-text task');
    
    // Publish task_started event
    this.eventLogger.taskStarted(taskId, typeof userMessage === 'string' ? userMessage.substring(0, 200) : 'Unknown task');

    // ── MEMORY RECALL (Phase 1) ──
    // Query memory store for relevant context before building prompt
    let memoryContext: string | undefined;
    try {
      const memoryBlocks = await globalMemoryStore.query(userMessage, {
        topK: 10,
        sessionId, // Prefer session-specific memories first
      });
      if (memoryBlocks.length > 0) {
        const memoryLines = memoryBlocks.map((block, i) => {
          const timeStr = block.timestamp ? new Date(block.timestamp).toLocaleString('vi-VN', { timeZone: 'Asia/Bangkok' }) : 'unknown';
          const tags = block.tags?.length ? ` [${block.tags.join(', ')}]` : '';
          return `${i + 1}. [${block.type}${tags}] (${timeStr}): ${block.content.substring(0, 200)}`;
        });
        memoryContext = memoryLines.join('\n');
        log.info(`Memory recall: ${memoryBlocks.length} block(s) for "${userMessage.substring(0, 50)}"`);
      }
    } catch (err: any) {
      log.warn(`Memory recall failed: ${err.message}`);
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

    // Build system prompt
    const promptBuilder = new PromptBuilder();
    const systemPrompt = promptBuilder.buildSystem({
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
    });

    // ── Prompt Length Guard (Tier 1 Fix) ──
    const MAX_PROMPT_TOKENS = 3000; // ~safe limit for most models
    const estimatedTokens = estimateTokenCount(systemPrompt);
    if (estimatedTokens > MAX_PROMPT_TOKENS) {
      log.warn(`Prompt too long: ~${estimatedTokens} tokens (max ${MAX_PROMPT_TOKENS}). Truncating context.`);
      this.emit('alert:prompt_truncated', { originalTokens: estimatedTokens, maxTokens: MAX_PROMPT_TOKENS });
      // Truncate contextFiles (largest contributor) to fit
      const truncatedPrompt = truncatePrompt(systemPrompt, MAX_PROMPT_TOKENS);
      const agentRequest: EngineRequest = { ...request, systemPrompt: truncatedPrompt, checkpointRequestId: taskId, currentGoal: typeof userMessage === 'string' ? userMessage.slice(0, 200) : undefined };
      try {
        const result = await this.agent.run(agentRequest); // TODO: Gateway cần pass AbortSignal để cancel hoạt động end-to-end
        if (result.toolCycles === 0) {
          this.responseCache.set(cacheKey, result.content, 120_000);
        }
        const duration = Date.now() - startTime;
        this.eventLogger.taskFinished(taskId, typeof userMessage === 'string' ? userMessage.substring(0, 200) : 'Unknown task', true, duration, result.content.substring(0, 500));
        // ── CHECKPOINT: Mark success ──
        this.checkpointStore.complete(taskId, { content: result.content, modelUsed: result.modelUsed, providerUsed: result.providerUsed });
        return { content: result.content, modelUsed: result.modelUsed, providerUsed: result.providerUsed };
      } catch (agentErr: any) {
        const duration = Date.now() - startTime;
        this.eventLogger.error(agentErr.message, agentErr.stack, 'ENGINE_AGENT_FAILED');
        this.eventLogger.taskFinished(taskId, typeof userMessage === 'string' ? userMessage.substring(0, 200) : 'Unknown task', false, duration, agentErr.message);
        // ── CHECKPOINT: Mark failure ──
        this.checkpointStore.failed(taskId, { message: agentErr.message, stack: agentErr.stack });
        return { content: `❌ Lỗi khi xử lý: ${agentErr.message}`, modelUsed: 'none', providerUsed: 'none' };
      }
    }

    const agentRequest: EngineRequest = { ...request, systemPrompt, checkpointRequestId: taskId, currentGoal: typeof userMessage === 'string' ? userMessage.slice(0, 200) : undefined };

    try {
      R.waitBegin({ requestId, label: 'agent.run', callerFile: 'engine.ts', callerLine: 671 });
      const result = await this.agent.run(agentRequest); // TODO: Gateway cần pass AbortSignal để cancel hoạt động end-to-end

      // Smart cache write: ONLY if no tools were called (pure LLM knowledge response)
      // Side-effect tracking via recordToolCall() handles tool detection in ResponseCache.set()
      if (result.toolCycles === 0) {
        const ttl = 120_000; // 2 min TTL for pure factual responses
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
