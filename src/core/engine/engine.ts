/**
 * Kato Agent — Core Engine (ReAct Loop)
 * Framework 6 Layers — Lớp Lõi (Core Domain)
 * 
 * Gọi model với tool calling (ReAct loop) — delegates to Agent for orchestration.
 * Maintains backward compatibility with existing consumers.
 * 
 * Phase 3.3: Engine now wraps Agent internally for hook-driven lifecycle.
 */

import { EventEmitter } from 'events';
import { readFile } from 'fs/promises';
import MemoryCore from '../memory/memory.js';
import MemoryStore, { globalMemoryStore } from '../memory/memory-store.js';
import ProviderRegistry from '../llm/provider-registry.js';
import PromptBuilder from '../llm/prompt-builder.js';
import { ToolRegistry, getDefaultRegistry } from '../tools/tool-registry.js';
import { ensureToolDefinitionsLoaded } from '../tools/tool-pruner.js';
import { EngineRequest, EngineResponse, ChatMessage } from '../core/types.js';
import { evolutionEngine } from '../core/evolution.js';
import { ModelRouter, buildDefaultRouter } from '../llm/model-adapter.js';
import { Agent, AgentConfig } from './agent.js';
import { HookRegistry, globalHooks } from '../core/hooks.js';
import { Orchestrator } from './orchestrator.js';
import { ModelAdapter } from '../llm/model-adapter.js';
import { PrivilegeGuard, createDefaultRules, createRestrictedAllowList } from '../security/privilege-guard.js';
import { ResponseCache } from '../security/response-cache.js';
import { Tracer } from '../observability/tracer.js';
import { RateLimiter, RateLimiterGroup } from '../security/rate-limiter.js';
import { CostTracker } from '../observability/cost-tracker.js';
import { MemoryTemporal, MemoryBlock } from '../memory/memory-temporal.js';
import { MemoryAgentic } from '../memory/memory-agentic.js';
import { GNAPQueue } from '../gnap/gnap-queue.js';

// ── Kato Core Identity Files ──
const KATO_IDENTITY_FILES = [
  'CLINE.md',
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
      rules: createDefaultRules(),
      restrictedMode: false,
      restrictedAllowList: createRestrictedAllowList(),
    });
    this.responseCache = new ResponseCache<string>({
      maxSize: 500,
      defaultTTL: 5 * 60 * 1000,
    });

    // Initialize rate limiter: 60 requests/min, 100k tokens/min
    this.rateLimiter = new RateLimiterGroup();
    this.rateLimiter.add('requests', {
      tokensPerInterval: 60,
      intervalMs: 60_000,
      maxBurst: 10,
    });
    this.rateLimiter.add('tokens', {
      tokensPerInterval: 100_000,
      intervalMs: 60_000,
      maxBurst: 20_000,
    });

    // Initialize temporal + agentic memory
    this.temporalMemory = new MemoryTemporal({ maxRetentionDays: 30 });
    this.agenticMemory = new MemoryAgentic({ maxRetentionDays: 30, allowAgentWrite: true });

    // Initialize GNAP queue
    this.gnapQueue = new GNAPQueue();
  }

  async init(): Promise<void> {
    this.registry.loadFromConfig();
    await evolutionEngine.init();
    await evolutionEngine.loadDefaultRules();

    // Initialize ToolRegistry (auto-registers all built-in plugins)
    this.toolRegistry = await getDefaultRegistry();

    // Pre-load tool definitions into tool-pruner cache
    await ensureToolDefinitionsLoaded();

    // Wire EvolutionEngine to HookRegistry for auto-error tracking
    evolutionEngine.attachToHooks(this.hooks);

    // Wire PrivilegeGuard as guard on tool:call events
    this.privilegeGuard.attachToHooks(this.hooks);

    // Build ModelRouter with registered adapters
    this.modelRouter = await buildDefaultRouter(this.registry);

    // Create Agent instance for ReAct orchestration
    const agentConfig: AgentConfig = {
      modelRouter: this.modelRouter,
      toolRegistry: this.toolRegistry,
      hooks: this.hooks,
      maxToolCycles: 10,
      debug: false,
    };
    this.agent = new Agent(agentConfig);

    // Create Orchestrator for deterministic decompose→execute→synthesize pipeline
    // Wrap ModelRouter as a ModelAdapter since signatures are identical (route == invoke)
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

    // Forward Agent events to Engine consumers
    this.agent.on('cascade', (data: any) => {
      this.emit('cascade', data);
    });

    // Initialize MemoryStore
    await globalMemoryStore.init();

    // ── Load existing blocks into Temporal Memory ──
    try {
      const existingBlocks = await globalMemoryStore.getAll();
      for (const block of existingBlocks) {
        const memBlock: MemoryBlock = {
          id: block.id || `migrated-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
          createdAt: typeof block.timestamp === 'number' ? block.timestamp : Date.now(),
          content: block.content || '',
          metadata: { source: 'migration', sessionId: block.sessionId, tags: block.tags },
        };
        this.temporalMemory.addBlock(memBlock);
      }
      console.log(`🧠 Temporal Memory: loaded ${existingBlocks.length} blocks from MemoryStore`);
    } catch {
      console.warn('⚠️ Could not migrate existing blocks to Temporal Memory');
    }

    // Register automatic memory hooks on Agent
    // Memory hook: save tool results into temporal memory
    this.agent.onEvent('tool:result', async (data) => {
      const sessionId = (data.sessionId as string) || 'default';
      const toolName = (data.toolName as string) || 'unknown';
      const result = JSON.stringify(data.result);
      if (result && result !== 'undefined' && result !== 'null') {
        // Save to legacy MemoryStore
        await globalMemoryStore.add('task', `Tool ${toolName}: ${result.substring(0, 500)}`, {
          tags: ['tool_result', toolName],
          sessionId,
        });
        // Save to Temporal Memory
        await this.agenticMemory.addBlockForAgent('engine', {
          id: `tool-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
          createdAt: Date.now(),
          content: `Tool ${toolName}: ${result.substring(0, 500)}`,
          metadata: { type: 'tool_result', toolName, sessionId },
        });
      }
    }, 100);

    // Memory hook: save assistant final responses into temporal memory
    this.agent.onEvent('model:response', async (data) => {
      const sessionId = (data.sessionId as string) || 'default';
      if (data.finishReason === 'stop' && data.content) {
        await this.agenticMemory.addBlockForAgent('engine', {
          id: `resp-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
          createdAt: Date.now(),
          content: String(data.content).substring(0, 1000),
          metadata: { type: 'assistant_response', sessionId },
        });
      }
    }, 100);

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

    const adapters = this.modelRouter.listAdapters();
    // ── Cold start warmup: pre-warm the primary model ──
    this.warmup().catch(() => {});

    console.log(`✅ Engine initialized with ${adapters.length} model adapter(s): ${adapters.map(a => a.name).join(', ') || 'none'}`);
    console.log(`🧬 Evolution: ${evolutionEngine.getStats().totalErrorsTracked} errors tracked, ${evolutionEngine.getStats().activeRules} rules active`);
  }

  /**
   * Warmup: send a minimal ping to the primary model to pre-load it.
   * Non-blocking — fails silently.
   */
  private async warmup(): Promise<void> {
    try {
      const start = Date.now();
      await this.modelRouter.route(
        [{ role: 'user', content: 'ping' }],
        { maxTokens: 10 },
      );
      const ms = Date.now() - start;
      console.log(`🔥 Cold start warmup: ${ms}ms (model pre-loaded)`);
    } catch {
      // Silent — warmup is best-effort
    }
  }

  /**
   * Check if a tool is allowed by PrivilegeGuard.
   * Exposed for testing.
   */
  checkPrivilege(toolName: string, tags?: string[]): { allowed: boolean; reason?: string } {
    return this.privilegeGuard.check(toolName, tags);
  }

  /**
   * Enable/disable restricted mode.
   * Exposed for testing.
   */
  setRestrictedMode(enabled: boolean, allowList?: string[]): void {
    this.privilegeGuard.setRestrictedMode(enabled, allowList);
  }

  /**
   * Set restricted mode allow list.
   * Exposed for testing.
   */
  setRestrictedAllowList(allowList: string[]): void {
    this.privilegeGuard.setRestrictedMode(this.privilegeGuard.isRestrictedMode(), allowList);
  }

  /**
   * Get response cache for performance.
   * Exposed for testing.
   */
  getCache(): ResponseCache<string> {
    return this.responseCache;
  }

  /**
   * Get privilege guard reference.
   */
  getPrivilegeGuard(): PrivilegeGuard {
    return this.privilegeGuard;
  }

  /**
   * Get temporal memory reference.
   */
  getTemporalMemory(): MemoryTemporal {
    return this.temporalMemory;
  }

  /**
   * Get agentic memory reference.
   */
  getAgenticMemory(): MemoryAgentic {
    return this.agenticMemory;
  }

  /**
   * Get GNAP queue reference.
   */
  getGNAPQueue(): GNAPQueue {
    return this.gnapQueue;
  }

  async process(request: EngineRequest): Promise<EngineResponse> {
    // Rate limit check — deny if exceeded
    if (!this.rateLimiter.tryAll(1)) {
      const states = this.rateLimiter.getAllStates();
      return {
        content: `❌ Rate limit exceeded. Requests: ${states.requests?.denied ?? 0} denied, Tokens: ${states.tokens?.denied ?? 0} denied. Try again later.`,
        modelUsed: 'none',
        providerUsed: 'rate-limiter',
      };
    }
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

    // ── Task-based routing: use Orchestrator when a structured task is provided ──
    if (request.task && request.task.trim().length > 0) {
      try {
        // Log task to GNAP queue
        await this.gnapQueue.commitTask({
          name: request.task.substring(0, 100),
          sessionId: request.sessionId,
          timestamp: Date.now(),
        });

        const orchestratorResult = await this.orchestrator.run(
          request.task,
          systemPrompt,  // pass full system prompt as context
        );

        return {
          content: orchestratorResult.content,
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

        // Fall back to Agent-based ReAct loop
        console.warn('⚠️ Orchestrator failed, falling back to Agent ReAct loop');
      }
    }

    // ── Agent-based ReAct loop (default / fallback) ──
    const agentRequest: EngineRequest = {
      ...request,
      systemPrompt,
    };

    try {
      const result = await this.agent.run(agentRequest);

      return {
        content: result.content,
        modelUsed: result.modelUsed,
        providerUsed: result.providerUsed,
      };
    } catch (err: any) {
      console.error(`❌ Agent error:`, err.message);

      evolutionEngine.recordError({
        modelId: request.messages[request.messages.length - 1]?.content?.substring(0, 100) || 'unknown',
        errorType: 'ENGINE_AGENT_FAILED',
        errorMessage: err.message,
        stackTrace: err.stack,
        sessionId: request.sessionId || 'unknown',
        contextSnippet: request.messages[request.messages.length - 1]?.content?.substring(0, 200),
      }).catch(() => {});

      return {
        content: `❌ Lỗi khi xử lý: ${err.message}`,
        modelUsed: 'none',
        providerUsed: 'none',
      };
    }
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