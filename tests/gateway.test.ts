import { describe, it, expect, vi } from 'vitest';
import { KatoGateway } from '../src/core/gateway/index.js';

describe('KatoGateway', () => {
  it('should normalize KatoRequest and return KatoResponse', async () => {
    const mockEngine = {
      process: vi.fn().mockResolvedValue({ content: 'Hello from Engine' }),
    } as any;

    const gateway = new KatoGateway(mockEngine);
    const request = {
      input: 'Hello',
      userId: 'user-1',
      sessionId: 'session-1',
      platform: 'terminal' as const,
    };

    const response = await gateway.process(request);

    expect(response.output).toBe('Hello from Engine');
    expect(response.sessionId).toBe('session-1');
    expect(response.platform).toBe('terminal');
    expect(mockEngine.process).toHaveBeenCalled();
  });
});
