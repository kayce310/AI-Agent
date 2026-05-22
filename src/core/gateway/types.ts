/**
 * @file Gateway Types
 * @layer core
 * @depends-on (none)
 * @imported-by src/core/gateway/index.ts
 * @owner core-gateway
 */

export interface KatoRequest {
  input: string;
  userId: string;
  sessionId: string;
  platform: 'discord' | 'terminal' | 'web' | 'api' | 'app';
  metadata?: Record<string, unknown>;
}

export interface KatoResponse {
  output: string;
  sessionId: string;
  platform: string;
  metadata?: Record<string, unknown>;
}

export interface PlatformAdapter {
  platform: string;
  start(): Promise<void>;
  stop(): Promise<void>;
}
