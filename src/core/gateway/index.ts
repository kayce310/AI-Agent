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
  private engine: Engine;
  private adapters: Map<string, PlatformAdapter> = new Map();

  constructor(engine: Engine) {
    this.engine = engine;
  }

  async process(request: KatoRequest): Promise<KatoResponse> {
    // Call engine.run() or engine.process()
    // For now, assuming engine.run(task, context)
    const result = await this.engine.run(request.input, request.sessionId);
    
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
