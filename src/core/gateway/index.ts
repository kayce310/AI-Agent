/**
 * @file Coral Gateway â€” Multi-Platform Orchestrator
 * @layer core
 * @depends-on src/core/engine/engine.ts, src/core/gateway/types.ts
 * @imported-by src/index.ts
 * @owner core-gateway
 *
 * Hermes-inspired multi-platform gateway.
 * Adapters register themselves, gateway handles lifecycle + message routing.
 */

import { Logger } from '../logger.js';
import Engine from '../engine/engine.js';
import { CoralRequest, CoralResponse, PlatformAdapter, AdapterMessage } from './types.js';
import { EngineRequest, ChatMessage } from '../types.js';
import { globalMemoryStore } from '../memory/memory-store.js';
import { missionLock } from '../security/mission-lock.js';
import { asConversationSessionId, fromUserId } from '../types/branded.js';

const log = new Logger({ module: 'Gateway' });

export class CoralGateway {
  private _engine: Engine;
  private adapters: Map<string, PlatformAdapter> = new Map();
  private _isRunning = false;

  constructor(engine: Engine) {
    this._engine = engine;
  }

  get engine(): Engine {
    return this._engine;
  }

  get isRunning(): boolean {
    return this._isRunning;
  }

  get registeredPlatforms(): string[] {
    return Array.from(this.adapters.keys());
  }

  get adapterCount(): number {
    return this.adapters.size;
  }

  onEngineEvent(event: string, handler: Function): void {
    this._engine.on(event, handler as any);
  }

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // Adapter Registration
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  /**
   * Register a platform adapter.
   * The adapter must implement the PlatformAdapter interface.
   * After registration, the adapter's onMessage handler is wired to the gateway.
   */
  register(adapter: PlatformAdapter): void {
    if (this.adapters.has(adapter.platform)) {
      log.warn(`Adapter "${adapter.platform}" already registered, overwriting`);
    }

    // Wire message handler: adapter → gateway → engine
    // Returns CoralResponse so the adapter can handle its own platform-specific UI
    adapter.onMessage(async (msg: AdapterMessage) => {
      try {
        const response = await this.handleAdapterMessage(adapter, msg);
        return response;
      } catch (err: any) {
        log.error(`Error handling message from ${adapter.platform}: ${err.message}`);
        return null;
      }
    });

    this.adapters.set(adapter.platform, adapter);
    log.info(`Registered adapter: ${adapter.platform}`);
  }

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // Lifecycle Management
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  /**
   * Start a specific adapter by platform name.
   */
  async startAdapter(platform: string): Promise<void> {
    const adapter = this.adapters.get(platform);
    if (!adapter) throw new Error(`Adapter "${platform}" not registered`);
    log.info(`Starting adapter: ${platform}`);
    await adapter.start();
    log.info(`Adapter started: ${platform}`);
  }

  /**
   * Stop a specific adapter by platform name.
   */
  async stopAdapter(platform: string): Promise<void> {
    const adapter = this.adapters.get(platform);
    if (!adapter) throw new Error(`Adapter "${platform}" not registered`);
    log.info(`Stopping adapter: ${platform}`);
    await adapter.stop();
    log.info(`Adapter stopped: ${platform}`);
  }

  /**
   * Start all registered adapters.
   * Resolves once ALL adapters have started.
   * If any adapter fails, others continue but the error is logged.
   */
  async startAll(): Promise<{ success: string[]; failed: { platform: string; error: string }[] }> {
    this._isRunning = true;
    const results: string[] = [];
    const errors: { platform: string; error: string }[] = [];

    const promises = Array.from(this.adapters.values()).map(async (adapter) => {
      try {
        log.info(`Starting adapter: ${adapter.platform}`);
        await adapter.start();
        results.push(adapter.platform);
        log.info(`Adapter started: ${adapter.platform}`);
      } catch (err: any) {
        errors.push({ platform: adapter.platform, error: err.message });
        log.error(`Adapter "${adapter.platform}" failed to start: ${err.message}`);
      }
    });

    await Promise.all(promises);
    return { success: results, failed: errors };
  }

  /**
   * Stop all registered adapters.
   */
  async stopAll(): Promise<void> {
    log.info('Stopping all adapters');
    const promises = Array.from(this.adapters.values()).map(adapter =>
      adapter.stop().catch(() => {})
    );
    await Promise.all(promises);
    this._isRunning = false;
    log.info('All adapters stopped');
  }

  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // Message Processing
  // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  /**
   * Process a raw CoralRequest through the engine.
   * Used for programmatic access or testing.
   */
  async process(request: CoralRequest): Promise<CoralResponse> {
    let requestedModel = typeof request.metadata?.modelId === 'string'
      ? String(request.metadata.modelId)
      : typeof request.metadata?.model === 'string'
      ? String(request.metadata.model)
      : 'default';

    // If model is "all" or "default", get first available model from registry
    if (requestedModel === 'all' || requestedModel === 'default') {
      const { ProviderRegistry } = await import('../llm/provider-registry.js');
      const registry = new ProviderRegistry();
      try {
        registry.loadFromConfig();
        const models = registry.listModels();
        if (models.length > 0) {
          requestedModel = models[0];
        } else {
          requestedModel = 'auto/best-free';
        }
      } catch {
        requestedModel = 'auto/best-free';
      }
    }

    // ── Memory: Load conversation history ──
    const sessionId = request.sessionId;
    let history: ChatMessage[] = [];
    try {
      history = await this._engine.getHistory(sessionId);
    } catch { /* silent — first message for this channel */ }

    // Build messages: history + current user message
    const userMessage: ChatMessage = {
      role: 'user',
      content: request.input,
      timestamp: Date.now(),
    };
    const messages = [...history, userMessage];

    // Limit to last 20 messages (RAM-friendly, like MemoryCore)
    const recentMessages = messages.slice(-20);

    // ── Platform metadata from adapter ──
    const adapter = this.adapters.get(request.platform);
    const platformMeta = adapter?.platformMeta;

    const engineRequest: EngineRequest = {
      sessionId,
      messages: recentMessages,
      modelId: requestedModel,
      agentName: 'Coral',
      protocol: 'gateway',
      mentionPrefix: '',
      task: request.input,
      platformMeta,  // ← Engine can use this for response formatting
      // Streaming: forward onThinking callback from adapter metadata
      onThinking: (typeof request.metadata?.onThinking === 'function' ? request.metadata.onThinking : undefined) as ((text: string) => Promise<void>) | undefined,
    };

    const result = await this._engine.process(engineRequest);

    // ── Memory: Save user message + assistant response ──
    try {
      await this._engine.saveMessage(sessionId, userMessage);
      // Also save to MemoryStore (Phase 1.2: enables memory recall)
      await globalMemoryStore.add('human', typeof request.input === 'string' ? request.input : JSON.stringify(request.input), {
        tags: ['user_message', request.platform || 'unknown'],
        sessionId,
      });
      if (result.content) {
        await this._engine.saveMessage(sessionId, {
          role: 'assistant',
          content: result.content,
          timestamp: Date.now(),
        });
        // Save assistant response to MemoryStore
        await globalMemoryStore.add('persona', result.content.substring(0, 1000), {
          tags: ['assistant_response', request.platform || 'unknown'],
          sessionId,
        });
      }
    } catch { /* silent — logging should never break response */ }

    return {
      output: result.content,
      sessionId: request.sessionId,
      platform: request.platform,
    };
  }

  /**
   * Convert an AdapterMessage to CoralRequest and process it.
   * Returns the CoralResponse â€” the adapter is responsible for sending
   * the response back through its own platform-specific UI.
   *
   * NOTE: Do NOT call adapter.sendMessage() here â€” that would cause a
   * double response. The adapter's onMessage handler already handles
   * sending the response via its own platform-specific UI (edit, reply, etc.).
   */
  async handleAdapterMessage(adapter: PlatformAdapter, msg: AdapterMessage): Promise<CoralResponse | null> {
    try {
      // ── MissionLock: validate every inbound message ──
      const validation = missionLock.validateMessage(msg.text, fromUserId(msg.userId));
      if (!validation.allowed) {
        log.warn(`MissionLock blocked message from ${msg.userId}`, { reason: validation.reason });
        return {
          output: `⚠️ Tin nhắn bị từ chối: ${validation.reason || 'Vi phạm an ninh'}`,
          sessionId: asConversationSessionId(fromUserId(msg.channelId)),
          platform: msg.platform,
        };
      }

      // ponytail: prefer SessionManager UUID (reset via /new) over permanent channelId
      const rawSessionId = (msg.metadata?.sessionId as string) || fromUserId(msg.channelId);
      const request: CoralRequest = {
        input: msg.text,
        userId: msg.userId,
        sessionId: asConversationSessionId(rawSessionId),
        platform: msg.platform as CoralRequest['platform'],
        metadata: msg.metadata,
      };

      const response = await this.process(request);
      // ADAPTER handles its own UI â€” do NOT call sendMessage here
      return response;
    } catch (err: any) {
      log.error(`handleAdapterMessage error: ${err.message}`);
      return null;
    }
  }

  /**
   * Get an adapter by platform name.
   */
  getAdapter(platform: string): PlatformAdapter | undefined {
    return this.adapters.get(platform);
  }
}
