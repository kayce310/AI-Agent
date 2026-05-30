/**
 * @file Kato Gateway — Multi-Platform Orchestrator
 * @layer core
 * @depends-on src/core/engine/engine.ts, src/core/gateway/types.ts
 * @imported-by src/index.ts
 * @owner core-gateway
 *
 * Hermes-inspired multi-platform gateway.
 * Adapters register themselves, gateway handles lifecycle + message routing.
 */

import Engine from '../engine/engine.js';
import { KatoRequest, KatoResponse, PlatformAdapter, AdapterMessage } from './types.js';
import { EngineRequest } from '../types.js';

export class KatoGateway {
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

  // ──────────────────────────────────────────────
  // Adapter Registration
  // ──────────────────────────────────────────────

  /**
   * Register a platform adapter.
   * The adapter must implement the PlatformAdapter interface.
   * After registration, the adapter's onMessage handler is wired to the gateway.
   */
  register(adapter: PlatformAdapter): void {
    if (this.adapters.has(adapter.platform)) {
      console.warn(`⚠️ Gateway: adapter "${adapter.platform}" already registered, replacing`);
    }

    // Wire message handler: adapter → gateway → engine
    // Returns KatoResponse so the adapter can handle its own platform-specific UI
    adapter.onMessage(async (msg: AdapterMessage) => {
      try {
        const response = await this.handleAdapterMessage(adapter, msg);
        return response;
      } catch (err: any) {
        console.error(`❌ Gateway: error handling message from "${adapter.platform}": ${err.message}`);
        return null;
      }
    });

    this.adapters.set(adapter.platform, adapter);
    console.log(`🔌 Gateway: platform "${adapter.platform}" registered`);
  }

  // ──────────────────────────────────────────────
  // Lifecycle Management
  // ──────────────────────────────────────────────

  /**
   * Start a specific adapter by platform name.
   */
  async startAdapter(platform: string): Promise<void> {
    const adapter = this.adapters.get(platform);
    if (!adapter) throw new Error(`Adapter "${platform}" not registered`);
    console.log(`🚀 Gateway: starting "${platform}" adapter...`);
    await adapter.start();
    console.log(`✅ Gateway: "${platform}" adapter started`);
  }

  /**
   * Stop a specific adapter by platform name.
   */
  async stopAdapter(platform: string): Promise<void> {
    const adapter = this.adapters.get(platform);
    if (!adapter) throw new Error(`Adapter "${platform}" not registered`);
    console.log(`🛑 Gateway: stopping "${platform}" adapter...`);
    await adapter.stop();
    console.log(`✅ Gateway: "${platform}" adapter stopped`);
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
        console.log(`🚀 Gateway: starting "${adapter.platform}" adapter...`);
        await adapter.start();
        results.push(adapter.platform);
        console.log(`✅ Gateway: "${adapter.platform}" adapter started`);
      } catch (err: any) {
        errors.push({ platform: adapter.platform, error: err.message });
        console.error(`❌ Gateway: "${adapter.platform}" adapter failed: ${err.message}`);
      }
    });

    await Promise.all(promises);
    return { success: results, failed: errors };
  }

  /**
   * Stop all registered adapters.
   */
  async stopAll(): Promise<void> {
    console.log('🛑 Gateway: stopping all adapters...');
    const promises = Array.from(this.adapters.values()).map(adapter =>
      adapter.stop().catch(err => console.warn(`⚠️ Gateway: "${adapter.platform}" stop error: ${err.message}`))
    );
    await Promise.all(promises);
    this._isRunning = false;
    console.log('✅ Gateway: all adapters stopped');
  }

  // ──────────────────────────────────────────────
  // Message Processing
  // ──────────────────────────────────────────────

  /**
   * Process a raw KatoRequest through the engine.
   * Used for programmatic access or testing.
   */
  async process(request: KatoRequest): Promise<KatoResponse> {
    const engineRequest: EngineRequest = {
      sessionId: request.sessionId,
      messages: [{ role: 'user', content: request.input }],
      modelId: 'default',
      agentName: 'Kato',
      protocol: 'gateway',
      mentionPrefix: '',
      task: request.input,
    };

    const result = await this._engine.process(engineRequest);

    return {
      output: result.content,
      sessionId: request.sessionId,
      platform: request.platform,
    };
  }

  /**
   * Convert an AdapterMessage to KatoRequest and process it.
   * Returns the KatoResponse — the adapter is responsible for sending
   * the response back through its own platform-specific UI.
   *
   * NOTE: Do NOT call adapter.sendMessage() here — that would cause a
   * double response. The adapter's onMessage handler already handles
   * sending the response via its own platform-specific UI (edit, reply, etc.).
   */
  async handleAdapterMessage(adapter: PlatformAdapter, msg: AdapterMessage): Promise<KatoResponse | null> {
    try {
      const request: KatoRequest = {
        input: msg.text,
        userId: msg.userId,
        sessionId: msg.channelId,
        platform: msg.platform as KatoRequest['platform'],
        metadata: msg.metadata,
      };

      const response = await this.process(request);
      // ADAPTER handles its own UI — do NOT call sendMessage here
      return response;
    } catch (err: any) {
      console.error(`❌ Gateway: engine processing failed for ${adapter.platform}: ${err.message}`);
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
