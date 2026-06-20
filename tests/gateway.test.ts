/**
 * @file CoralGateway Tests
 * @layer tests
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CoralGateway } from '../src/core/gateway/index.js';
import { PlatformAdapter, AdapterMessage, AdapterStatus, PlatformMeta } from '../src/core/gateway/types.js';

function createMockAdapter(platform: string): PlatformAdapter {
  let messageHandler: ((msg: AdapterMessage) => Promise<any>) | null = null;
  return {
    platform,
    status: 'disconnected' as AdapterStatus,
    start: vi.fn(async () => {}),
    stop: vi.fn(async () => {}),
    onMessage: vi.fn((handler: any) => { messageHandler = handler; }),
    sendMessage: vi.fn(async () => {}),
    platformMeta: { platform, channelId: 'test', chatType: 'private', userId: '123' } as PlatformMeta,
    _getMessageHandler: () => messageHandler,
  } as any;
}

describe('CoralGateway', () => {
  let mockEngine: any;
  let gateway: CoralGateway;

  beforeEach(() => {
    mockEngine = {
      process: vi.fn(async () => ({ content: 'hello' })),
      getHistory: vi.fn(async () => []),
      saveMessage: vi.fn(async () => {}),
      on: vi.fn(),
    };
    gateway = new CoralGateway(mockEngine);
  });

  describe('adapter registration', () => {
    it('should register adapter', () => {
      const adapter = createMockAdapter('telegram');
      gateway.register(adapter);
      expect(gateway.adapterCount).toBe(1);
      expect(gateway.registeredPlatforms).toContain('telegram');
    });

    it('should overwrite duplicate adapter with warning', () => {
      const a1 = createMockAdapter('telegram');
      const a2 = createMockAdapter('telegram');
      gateway.register(a1);
      gateway.register(a2);
      expect(gateway.adapterCount).toBe(1);
    });

    it('should register multiple adapters', () => {
      gateway.register(createMockAdapter('telegram'));
      gateway.register(createMockAdapter('discord'));
      expect(gateway.adapterCount).toBe(2);
    });

    it('should get adapter by platform', () => {
      const adapter = createMockAdapter('telegram');
      gateway.register(adapter);
      expect(gateway.getAdapter('telegram')).toBe(adapter);
      expect(gateway.getAdapter('discord')).toBeUndefined();
    });
  });

  describe('lifecycle', () => {
    it('should start adapter by platform', async () => {
      const adapter = createMockAdapter('telegram');
      gateway.register(adapter);
      await gateway.startAdapter('telegram');
      expect(adapter.start).toHaveBeenCalled();
    });

    it('should throw on start of unregistered adapter', async () => {
      await expect(gateway.startAdapter('telegram')).rejects.toThrow('not registered');
    });

    it('should start all adapters', async () => {
      const a1 = createMockAdapter('telegram');
      const a2 = createMockAdapter('discord');
      gateway.register(a1);
      gateway.register(a2);
      const result = await gateway.startAll();
      expect(result.success).toContain('telegram');
      expect(result.success).toContain('discord');
    });

    it('should handle adapter start failure gracefully', async () => {
      const good = createMockAdapter('telegram');
      const bad = createMockAdapter('discord');
      (bad.start as any).mockRejectedValue(new Error('conn failed'));
      gateway.register(good);
      gateway.register(bad);
      const result = await gateway.startAll();
      expect(result.success).toContain('telegram');
      expect(result.failed).toHaveLength(1);
      expect(result.failed[0].platform).toBe('discord');
    });

    it('should set isRunning after startAll', async () => {
      gateway.register(createMockAdapter('telegram'));
      expect(gateway.isRunning).toBe(false);
      await gateway.startAll();
      expect(gateway.isRunning).toBe(true);
    });

    it('should stopAll and set isRunning false', async () => {
      const adapter = createMockAdapter('telegram');
      gateway.register(adapter);
      await gateway.startAll();
      await gateway.stopAll();
      expect(gateway.isRunning).toBe(false);
      expect(adapter.stop).toHaveBeenCalled();
    });
  });

  describe('process', () => {
    it('should call engine.process with correct request', async () => {
      const response = await gateway.process({
        input: 'hello',
        userId: 'user-1',
        sessionId: 'test-session',
        platform: 'telegram',
      });
      expect(mockEngine.process).toHaveBeenCalled();
      expect(response.output).toBe('hello');
    });
  });
});
