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
import MemoryCore from '../memory/memory.js';
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
const CORAL_IDENTITY_FILES = [
  'knowledge/wiki/core/soul.md',
];

const log = new Logger({ module: 'Engine' });

export class Engine extends EventEmitter {
  private registry: ProviderRegistry;
  private modelRouter: ModelRouter;
  private memory: MemoryCore;
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
  private eventLogger!: StructuredLogger;

  private agentRegistry!: AgentRegistry;

  /** In-flight promise dedup — same key = same promise */
  private pendingRequests: Map<string, Promise<EngineResponse>> = new Map();

  constructor(registry?: ProviderRegistry) {
    super();
    this.registry = registry ?? new ProviderRegistry();
    this.modelRouter = new ModelRouter();
    this.memory = new MemoryCore();
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
    const eventStore = new EventStore(this.storage.getDb());
    this.eventBus = new EventBus(eventStore);
    this.eventLogger = new StructuredLogger(this.eventBus);
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
    };
    this.agent = new Agent(agentConfig);

    this.agent.on('cascade', (data: any) => { this.emit('cascade', data); });
    await globalMemoryStore.init();

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
      const toolName = (data.toolName as string) || 'unknown';
      const toolArgs = (data.toolArgs as Record<string, unknown>) || {};
      const cycle = (data.cycle as number) || 0;

      // Emit tool_called event
      this.eventLogger.toolCall(sessionId, toolName, toolArgs);

      // Emit decision_made event (what the agent chose to do)
      const argsSummary = Object.keys(toolArgs).slice(0, 3).join(', ');
      this.eventLogger.decisionMade(
        sessionId,
        `Call ${toolName}`,
        `Tool selected (cycle ${cycle})`,
        `Execute ${toolName}(${argsSummary})`
      );
    }, 90);

    // ═══ EVENT BUS: tool:result → tool_finished + file events ═══
    this.agent.onEvent('tool:result', async (data) => {
      const sessionId = (data.sessionId as string) || 'default';
      const toolName = (data.toolName as string) || 'unknown';
      const toolArgs = (data.args as Record<string, unknown>) || {};
      const result = JSON.stringify(data.result);
      const startTime = Date.now();

      // Track tool call on cache — used for side-effect detection to prevent caching tool-heavy responses
      this.responseCache.recordToolCall(toolName);

      // Emit tool_finished event
      const success = !result.includes('"error"');
      this.eventLogger.toolResult(sessionId, toolName, success, 0, toolArgs, result.substring(0, 500));

      // Emit file events for file-writing tools
      const filePath = this.extractFilePath(toolName, toolArgs);
      if (filePath) {
        this.eventLogger.fileCreated(sessionId, filePath);
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
      if (data.finishReason === 'stop' && data.content) {
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

  // ═══════════════════════════════════════════════════════════════
  // PHASE 3: Smart Fallback + DAG Cycle Detection + Hybrid Routing
  // ═══════════════════════════════════════════════════════════════

  async process(request: EngineRequest): Promise<EngineResponse> {
    // Rate limit check (global)
    if (!this.rateLimiter.tryAll(1)) {
      auditLogger.log({ level: 'warn', category: 'rate_limit', sessionId: request.sessionId, detail: 'Global rate limit exceeded' });
      return { content: '❌ Rate limit exceeded.', modelUsed: 'none', providerUsed: 'rate-limiter' };
    }

    // Rate limit check (per-user: 20 req/min per user)
    const userId = request.sessionId || 'anonymous';
    if (!this.perUserLimiter.tryConsume(userId)) {
      log.warn(`Per-user rate limit exceeded for ${userId}`);
      auditLogger.log({ level: 'warn', category: 'rate_limit', userId, detail: 'Per-user rate limit exceeded' });
      return { content: '❌ Bạn đã gửi quá nhiều tin nhắn. Vui lòng thử lại sau.', modelUsed: 'none', providerUsed: 'rate-limiter' };
    }

    // Reset side-effect tracking for this request
    this.responseCache.beginRequest();

    const lastMessage = request.messages[request.messages.length - 1]?.content || '';
    if (!lastMessage.trim()) {
      return { content: '❌ Tin nhắn trống.', modelUsed: 'none', providerUsed: 'none' };
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
    const resultPromise = this.processInner(request, cacheKey);
    this.pendingRequests.set(cacheKey, resultPromise);

    try {
      return await resultPromise;
    } finally {
      this.pendingRequests.delete(cacheKey);
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

    // Build system prompt
    const promptBuilder = new PromptBuilder();
    const systemPrompt = promptBuilder.buildSystem({
      agentName: request.agentName,
      mentionPrefix: request.mentionPrefix,
      task: request.task,
      contextFiles: this.coralIdentityContext || undefined,
      memoryContext,
      references: request.references,
      constraints: request.constraints,
      currentRequest: request.messages[request.messages.length - 1]?.content || '',
    });

    const agentRequest: EngineRequest = { ...request, systemPrompt };

    try {
      const result = await this.agent.run(agentRequest);

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
      
      // Publish error event
      const duration = Date.now() - startTime;
      this.eventLogger.error(agentErr.message, agentErr.stack, 'ENGINE_AGENT_FAILED');
      this.eventLogger.taskFinished(taskId, typeof userMessage === 'string' ? userMessage.substring(0, 200) : 'Unknown task', false, duration, agentErr.message);
      
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
   * Flush all memory stores and release resources.
   * Called during graceful shutdown.
   */
  async cleanup(): Promise<void> {
    log.info('Flushing memory stores...');
    try {
      await Promise.all([
        this.temporalMemory.close().catch(e => log.warn('temporalMemory close failed', { error: String(e) })),
        this.agenticMemory.close().catch(e => log.warn('agenticMemory close failed', { error: String(e) })),
      ]);
      // Close SQLite storage
      try { this.storage.close(); } catch (e) { log.warn('SQLite close failed', { error: String(e) }); }
      log.info('Memory stores flushed');
    } catch (err) {
      log.error('Error during memory cleanup', { error: String(err) });
    }
  }
}

export default Engine;
