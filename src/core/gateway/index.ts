/**
 * @file Kato Gateway
 * @layer core
 * @depends-on src/core/engine/engine.ts, src/core/gateway/types.ts
 * @imported-by src/index.ts
 * @owner core-gateway
 */

import Engine from '../engine/engine.js';
import { KatoRequest, KatoResponse, PlatformAdapter } from './types.js';

export class KatoGateway {
  private _engine: Engine;
  private adapters: Map<string, PlatformAdapter> = new Map();

  constructor(engine: Engine) {
    this._engine = engine;
  }

  get engine(): Engine {
    return this._engine;
  }

  onEngineEvent(event: string, handler: Function): void {
    this._engine.on(event, handler as any);
  }

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

  register(adapter: PlatformAdapter): void {
    this.adapters.set(adapter.platform, adapter);
  }
}
