/**
 * @file Engine — Core ReAct Loop
 * @layer core
 * @depends-on (all core modules)
 * @imported-by src/scripts/start-discord.ts, src/modules/discord/index.ts
 * @owner core-engine
 *
 * Kato Agent — Core Engine (ReAct Loop)
 * Framework 6 Layers — Lớp Lõi (Core Domain)
 *
 * Phase 3: Smart Fallback + DAG Cycle Detection + Hybrid Routing
 */

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
import { HookRegistry, globalHooks } from '../hooks.js';
import { Orchestrator } from './orchestrator.js';
import { ModelAdapter } from '../llm/model-adapter.js';
import { PrivilegeGuard, createDefaultAllowRules, createRestrictedAllowList } from '../security/privilege-guard.js';
import { ResponseCache, isRealTimeQuery } from '../security/response-cache.js';
import { Tracer } from '../observability/tracer.js';
import { RateLimiter, RateLimiterGroup } from '../security/rate-limiter.js';
import { MemoryTemporal } from '../memory/memory-temporal.js';
import { MemoryBlock } from '../memory/memory-log.js';
import { MemoryAgentic } from '../memory/memory-agentic.js';
import { GNAPQueue } from '../gnap/gnap-queue.js';

const KATO_IDENTITY_FILES = [
  'KATO.md',
  'knowledge/wiki/AGENTS.md',
  'knowledge/wiki/core/soul.md',
];

export class Engine extends EventEmitter {
  private registry: ProviderRegistry;
  private modelRouter: ModelRouter;
  private memory: MemoryCore;
  private katoIdentityContext: string = '';
  private toolRegistry!: ToolRegistry;
  private agent!: Agent;
  private orchestrator!: Orchestrator;
  private hooks: HookRegistry;
  private privilegeGuard: PrivilegeGuard;
  private responseCache: ResponseCache<string>;
  private rateLimiter: RateLimiterGroup;
  private temporalMemory: MemoryTemporal;
  private agenticMemory: MemoryAgentic;
  private gnapQueue: GNAPQueue;

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
    this.temporalMemory = new MemoryTemporal({ maxRetentionDays: 30 });
    this.agenticMemory = new MemoryAgentic({ maxRetentionDays: 30, allowAgentWrite: true });
    this.gnapQueue = new GNAPQueue();
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
    await evolutionEngine.loadDefaultRules();
    this.toolRegistry = await getDefaultRegistry();
    await ensureToolDefinitionsLoaded();
    evolutionEngine.attachToHooks(this.hooks);
    this.privilegeGuard.attachToHooks(this.hooks);
    this.modelRouter = await buildDefaultRouter(this.registry);

    const agentConfig: AgentConfig = {
      modelRouter: this.modelRouter,
      toolRegistry: this.toolRegistry,
      hooks: this.hooks,
      maxToolCycles: 10,
      debug: false,
    };
    this.agent = new Agent(agentConfig);

    const orchestratorAdapter: ModelAdapter = {
      name: 'orchestrator-router',
      label: 'Orchestrator (ModelRouter wrapper)',
      invoke: (messages, options) => this.modelRouter.route(messages, options),
      estimateTokens: (messages) => this.modelRouter.estimateTokens(messages),
      isAvailable: () => this.modelRouter.listAdapters().length > 0,
    };
    this.orchestrator = new Orchestrator({
      model: orchestratorAdapter,
      toolRegistry: this.toolRegistry,
      hooks: this.hooks,
      debug: false,
    });

    this.agent.on('cascade', (data: any) => { this.emit('cascade', data); });
    await globalMemoryStore.init();

    try {
      const existingBlocks = await globalMemoryStore.getAll();
      for (const block of existingBlocks) {
        await this.temporalMemory.addBlock(block.content || '', {
          type: block.type, sessionId: block.sessionId, tags: block.tags, entities: block.entities,
        });
      }
      console.log(`🧠 Temporal Memory: loaded ${existingBlocks.length} blocks from MemoryStore`);
    } catch { console.warn('⚠️ Could not migrate existing blocks to Temporal Memory'); }

    this.agent.onEvent('tool:result', async (data) => {
      const sessionId = (data.sessionId as string) || 'default';
      const toolName = (data.toolName as string) || 'unknown';
      const result = JSON.stringify(data.result);
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
    for (const fp of KATO_IDENTITY_FILES) {
      try {
        const content = await readFile(fp, 'utf8');
        identityParts.push(`--- ${fp} ---\n${content}`);
        console.log(`🧬 Kato Identity loaded: ${fp}`);
      } catch { console.warn(`⚠️ Could not load Kato identity file: ${fp}`); }
    }
    this.katoIdentityContext = identityParts.join('\n\n');
    if (process.env.KATO_WARMUP !== 'false') {
      this.warmup().catch(() => {});
    }
    const adapters = this.modelRouter.listAdapters();
    console.log(`✅ Engine initialized with ${adapters.length} model adapter(s)`);
  }

  private async warmup(): Promise<void> {
    try {
      const start = Date.now();
      await this.modelRouter.route([{ role: 'user', content: 'ping' }], { maxTokens: 10 });
      console.log(`🔥 Cold start warmup: ${Date.now() - start}ms`);
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
  getAgenticMemory(): MemoryAgentic { return this.agenticMemory; }
  getGNAPQueue(): GNAPQueue { return this.gnapQueue; }

  // ═══════════════════════════════════════════════════════════════
  // PHASE 3: Smart Fallback + DAG Cycle Detection + Hybrid Routing
  // ═══════════════════════════════════════════════════════════════

  async process(request: EngineRequest): Promise<EngineResponse> {
    // Rate limit check
    if (!this.rateLimiter.tryAll(1)) {
      return { content: '❌ Rate limit exceeded.', modelUsed: 'none', providerUsed: 'rate-limiter' };
    }

    // Cache: begin request tracking for side-effect detection
    this.responseCache.beginRequest();

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

    // ── Hybrid Routing: Fast/Deep mode heuristic ──
    const isFastMode = request.fastMode === true ||
                      (request.task != null && request.task.trim().length < 50);

    if (isFastMode && request.task) {
      console.log(`⚡ [FAST MODE] Câu hỏi đơn giản (${request.task.length} ký tự), kích hoạt ReAct trực tiếp.`);
    }

    // ── Orchestrator path (Deep mode) ──
    let orchestratorResult: import('./orchestrator.js').OrchestrationResult | null = null;
    let completedTasksContext = '';
    let fallbackCount = 0;

    if (request.task && request.task.trim().length > 0 && !isFastMode) {
      try {
        await this.gnapQueue.commitTask({
          name: request.task.substring(0, 100),
          sessionId: request.sessionId,
          timestamp: Date.now(),
        });

        orchestratorResult = await this.orchestrator.run(request.task, systemPrompt);

        // Record tool calls for side-effect detection
        if (orchestratorResult.executionReport?.results) {
          for (const r of orchestratorResult.executionReport.results) {
            if (r.type === 'tool') {
              this.responseCache.recordToolCall(r.description.split('(')[0] || 'unknown');
            }
          }
        }

        // Save to cache (bypassed automatically if side effects detected)
        const cacheKey = ResponseCache.buildKey(
          request.agentName || 'default',
          request.sessionId || 'default',
          JSON.stringify(request.messages),
          undefined
        );
        const sanitized = this.sanitizeResponse(orchestratorResult.content || '');
        this.responseCache.set(cacheKey, sanitized);

        return {
          content: sanitized,
          modelUsed: 'orchestrator-pipeline',
          providerUsed: 'internal',
        };
      } catch (err: any) {
        console.error(`❌ Orchestrator error:`, err.message);

        evolutionEngine.recordError({
          modelId: request.messages[request.messages.length - 1]?.content?.substring(0, 100) || 'unknown',
          errorType: 'ENGINE_ORCHESTRATOR_FAILED',
          errorMessage: err.message,
          stackTrace: err.stack,
          sessionId: request.sessionId || 'unknown',
          contextSnippet: request.messages[request.messages.length - 1]?.content?.substring(0, 200),
        }).catch(() => {});

        // ── Smart Fallback: inherit completed task results ──
        if (orchestratorResult?.executionReport?.results) {
          const completedTasks = orchestratorResult.executionReport.results
            .filter((r: any) => !r.error && r.output && r.output.trim().length > 0);
          fallbackCount = completedTasks.length;
          completedTasksContext = completedTasks
            .map((r: any, idx: number) => `Task ${idx + 1} (${r.type}): ${r.output}`)
            .join('\n');
        }

        if (completedTasksContext) {
          console.log(`⚠️ [FALLBACK] Đã chuyển sang ReAct và kế thừa ${fallbackCount} kết quả từ Orchestrator`);
        } else {
          console.warn('⚠️ Orchestrator failed, falling back to Agent ReAct loop (no completed tasks to inherit)');
        }
      }
    }

    // ── Agent ReAct loop (default / fallback) ──
    const fallbackMessage = completedTasksContext
      ? `[SYSTEM WARNING] Orchestrator failed mid-execution. Inheriting completed task results:\n${completedTasksContext}\n\nNow continuing with Agent ReAct loop to complete remaining tasks...\n`
      : '';

    const agentRequest: EngineRequest = {
      ...request,
      systemPrompt,
      messages: fallbackMessage
        ? [
            ...request.messages.slice(0, -1),
            {
              ...request.messages[request.messages.length - 1],
              content: `${fallbackMessage}${request.messages[request.messages.length - 1].content}`
            }
          ]
        : request.messages,
    };

    const cacheKey = ResponseCache.buildKey(
      request.agentName || 'default',
      request.sessionId || 'default',
      JSON.stringify(agentRequest.messages),
      undefined
    );
    const lastMessage = agentRequest.messages[agentRequest.messages.length - 1]?.content || '';
    const cached = this.responseCache.get(cacheKey, lastMessage);
    if (cached) {
      return { content: cached, modelUsed: 'cache', providerUsed: 'cache' };
    }

    try {
      const result = await this.agent.run(agentRequest);
      // Don't cache real-time queries
      if (!isRealTimeQuery(lastMessage)) {
        this.responseCache.set(cacheKey, result.content);
      }
      return {
        content: result.content,
        modelUsed: result.modelUsed,
        providerUsed: result.providerUsed,
      };
    } catch (agentErr: any) {
      console.error(`❌ Agent error:`, agentErr.message);
      evolutionEngine.recordError({
        modelId: request.messages[request.messages.length - 1]?.content?.substring(0, 100) || 'unknown',
        errorType: 'ENGINE_AGENT_FAILED',
        errorMessage: agentErr.message,
        stackTrace: agentErr.stack,
        sessionId: request.sessionId || 'unknown',
        contextSnippet: request.messages[request.messages.length - 1]?.content?.substring(0, 200),
      }).catch(() => {});
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
}

export default Engine;
