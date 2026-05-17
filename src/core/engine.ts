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
import MemoryCore from './memory.js';
import MemoryStore, { globalMemoryStore } from './memory-store.js';
import ProviderRegistry from './provider-registry.js';
import PromptBuilder from './prompt-builder.js';
import { ToolRegistry, getDefaultRegistry } from './tool-registry.js';
import { ensureToolDefinitionsLoaded } from './tool-pruner.js';
import { EngineRequest, EngineResponse, ChatMessage } from './types.js';
import { evolutionEngine } from './evolution.js';
import { ModelRouter, buildDefaultRouter } from './model-adapter.js';
import { Agent, AgentConfig } from './agent.js';
import { HookRegistry, globalHooks } from './hooks.js';
import { Orchestrator } from './orchestrator.js';
import { ModelAdapter } from './model-adapter.js';
import { PrivilegeGuard, createDefaultRules, createRestrictedAllowList } from './privilege-guard.js';
import { ResponseCache } from './response-cache.js';
import { Tracer } from './tracer.js';

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

    // Register automatic memory hooks on Agent
    // Memory hook: save tool results as task-type blocks
    this.agent.onEvent('tool:result', async (data) => {
      const sessionId = (data.sessionId as string) || 'default';
      const toolName = (data.toolName as string) || 'unknown';
      const result = JSON.stringify(data.result);
      if (result && result !== 'undefined' && result !== 'null') {
        await globalMemoryStore.add('task', `Tool ${toolName}: ${result.substring(0, 500)}`, {
          tags: ['tool_result', toolName],
          sessionId,
        });
      }
    }, 100);

    // Memory hook: save assistant responses as persona-type blocks
    this.agent.onEvent('model:response', async (data) => {
      const sessionId = (data.sessionId as string) || 'default';
      if (data.finishReason === 'stop') {
        // Final response is saved by saveMessage — no need to duplicate
        return;
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
    console.log(`✅ Engine initialized with ${adapters.length} model adapter(s): ${adapters.map(a => a.name).join(', ') || 'none'}`);
    console.log(`🧬 Evolution: ${evolutionEngine.getStats().totalErrorsTracked} errors tracked, ${evolutionEngine.getStats().activeRules} rules active`);
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

    // ── Task-based routing: use Orchestrator when a structured task is provided ──
    if (request.task && request.task.trim().length > 0) {
      try {
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