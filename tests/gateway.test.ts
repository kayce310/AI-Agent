import { describe, it, expect, vi } from 'vitest';
import { KatoGateway } from '../src/core/gateway/index.js';
import { PlatformAdapter, AdapterMessage, AdapterStatus } from '../src/core/gateway/types.js';

describe('KatoGateway', () => {
  // ── Basic Message Processing ──

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

  // ── Adapter Registration ──

  it('should register a platform adapter', () => {
    const mockEngine = { process: vi.fn() } as any;
    const gateway = new KatoGateway(mockEngine);

    const mockAdapter: PlatformAdapter = {
      platform: 'test-platform',
      status: 'stopped' as AdapterStatus,
      start: vi.fn().mockResolvedValue(undefined),
      stop: vi.fn().mockResolvedValue(undefined),
      sendMessage: vi.fn().mockResolvedValue('msg-1'),
      onMessage: vi.fn(),
    };

    gateway.register(mockAdapter);

    expect(gateway.registeredPlatforms).toContain('test-platform');
    expect(gateway.adapterCount).toBe(1);
    expect(mockAdapter.onMessage).toHaveBeenCalled();
  });

  it('should warn on duplicate adapter registration', () => {
    const mockEngine = { process: vi.fn() } as any;
    const gateway = new KatoGateway(mockEngine);
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const adapter: PlatformAdapter = {
      platform: 'dup',
      status: 'stopped' as AdapterStatus,
      start: vi.fn().mockResolvedValue(undefined),
      stop: vi.fn().mockResolvedValue(undefined),
      sendMessage: vi.fn().mockResolvedValue(null),
      onMessage: vi.fn(),
    };

    gateway.register(adapter);
    gateway.register(adapter);

    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('already registered'));
    warnSpy.mockRestore();
  });

  it('should retrieve a registered adapter by platform name', () => {
    const mockEngine = { process: vi.fn() } as any;
    const gateway = new KatoGateway(mockEngine);

    const adapter: PlatformAdapter = {
      platform: 'retrievable',
      status: 'stopped' as AdapterStatus,
      start: vi.fn().mockResolvedValue(undefined),
      stop: vi.fn().mockResolvedValue(undefined),
      sendMessage: vi.fn().mockResolvedValue(null),
      onMessage: vi.fn(),
    };

    gateway.register(adapter);
    const retrieved = gateway.getAdapter('retrievable');
    expect(retrieved).toBe(adapter);
  });

  it('should return undefined for unregistered adapter', () => {
    const mockEngine = { process: vi.fn() } as any;
    const gateway = new KatoGateway(mockEngine);
    expect(gateway.getAdapter('nonexistent')).toBeUndefined();
  });

  // ── Adapter Lifecycle ──

  it('should start a specific adapter', async () => {
    const mockEngine = { process: vi.fn() } as any;
    const gateway = new KatoGateway(mockEngine);

    const adapter: PlatformAdapter = {
      platform: 'lifecycle',
      status: 'stopped' as AdapterStatus,
      start: vi.fn().mockResolvedValue(undefined),
      stop: vi.fn().mockResolvedValue(undefined),
      sendMessage: vi.fn().mockResolvedValue(null),
      onMessage: vi.fn(),
    };

    gateway.register(adapter);
    await gateway.startAdapter('lifecycle');

    expect(adapter.start).toHaveBeenCalledOnce();
  });

  it('should stop a specific adapter', async () => {
    const mockEngine = { process: vi.fn() } as any;
    const gateway = new KatoGateway(mockEngine);

    const adapter: PlatformAdapter = {
      platform: 'stoppable',
      status: 'running' as AdapterStatus,
      start: vi.fn().mockResolvedValue(undefined),
      stop: vi.fn().mockResolvedValue(undefined),
      sendMessage: vi.fn().mockResolvedValue(null),
      onMessage: vi.fn(),
    };

    gateway.register(adapter);
    await gateway.stopAdapter('stoppable');

    expect(adapter.stop).toHaveBeenCalledOnce();
  });

  it('should throw when starting unregistered adapter', async () => {
    const mockEngine = { process: vi.fn() } as any;
    const gateway = new KatoGateway(mockEngine);

    await expect(gateway.startAdapter('ghost')).rejects.toThrow('not registered');
  });

  it('should start all registered adapters', async () => {
    const mockEngine = { process: vi.fn() } as any;
    const gateway = new KatoGateway(mockEngine);

    const adapter1: PlatformAdapter = {
      platform: 'adapter-a',
      status: 'stopped' as AdapterStatus,
      start: vi.fn().mockResolvedValue(undefined),
      stop: vi.fn().mockResolvedValue(undefined),
      sendMessage: vi.fn().mockResolvedValue(null),
      onMessage: vi.fn(),
    };

    const adapter2: PlatformAdapter = {
      platform: 'adapter-b',
      status: 'stopped' as AdapterStatus,
      start: vi.fn().mockResolvedValue(undefined),
      stop: vi.fn().mockResolvedValue(undefined),
      sendMessage: vi.fn().mockResolvedValue(null),
      onMessage: vi.fn(),
    };

    gateway.register(adapter1);
    gateway.register(adapter2);

    const result = await gateway.startAll();

    expect(result.success).toContain('adapter-a');
    expect(result.success).toContain('adapter-b');
    expect(result.failed).toHaveLength(0);
    expect(adapter1.start).toHaveBeenCalledOnce();
    expect(adapter2.start).toHaveBeenCalledOnce();
    expect(gateway.isRunning).toBe(true);
  });

  it('should report failed adapters during startAll', async () => {
    const mockEngine = { process: vi.fn() } as any;
    const gateway = new KatoGateway(mockEngine);

    const goodAdapter: PlatformAdapter = {
      platform: 'good',
      status: 'stopped' as AdapterStatus,
      start: vi.fn().mockResolvedValue(undefined),
      stop: vi.fn().mockResolvedValue(undefined),
      sendMessage: vi.fn().mockResolvedValue(null),
      onMessage: vi.fn(),
    };

    const badAdapter: PlatformAdapter = {
      platform: 'bad',
      status: 'stopped' as AdapterStatus,
      start: vi.fn().mockRejectedValue(new Error('Connection refused')),
      stop: vi.fn().mockResolvedValue(undefined),
      sendMessage: vi.fn().mockResolvedValue(null),
      onMessage: vi.fn(),
    };

    gateway.register(goodAdapter);
    gateway.register(badAdapter);

    const result = await gateway.startAll();

    expect(result.success).toEqual(['good']);
    expect(result.failed[0].platform).toBe('bad');
    expect(result.failed[0].error).toContain('Connection refused');
    expect(gateway.isRunning).toBe(true);
  });

  it('should stop all adapters', async () => {
    const mockEngine = { process: vi.fn() } as any;
    const gateway = new KatoGateway(mockEngine);

    const adapter: PlatformAdapter = {
      platform: 'cleanup',
      status: 'running' as AdapterStatus,
      start: vi.fn().mockResolvedValue(undefined),
      stop: vi.fn().mockResolvedValue(undefined),
      sendMessage: vi.fn().mockResolvedValue(null),
      onMessage: vi.fn(),
    };

    gateway.register(adapter);
    await gateway.startAll();
    await gateway.stopAll();

    expect(adapter.stop).toHaveBeenCalledOnce();
    expect(gateway.isRunning).toBe(false);
  });

  // ── Message Routing ──

  it('should route AdapterMessage through engine and send response', async () => {
    const mockEngine = {
      process: vi.fn().mockResolvedValue({ content: 'Hello from Engine' }),
    } as any;

    const gateway = new KatoGateway(mockEngine);
    const sendMessage = vi.fn().mockResolvedValue('sent-1');

    const adapter: PlatformAdapter = {
      platform: 'router',
      status: 'running' as AdapterStatus,
      start: vi.fn().mockResolvedValue(undefined),
      stop: vi.fn().mockResolvedValue(undefined),
      sendMessage,
      onMessage: vi.fn(),
    };

    // Capture the handler that the gateway registers
    let capturedHandler: ((msg: AdapterMessage) => Promise<any>) | null = null;
    adapter.onMessage = vi.fn().mockImplementation((handler) => {
      capturedHandler = handler;
    });

    gateway.register(adapter);

    // Simulate an incoming message
    const testMsg: AdapterMessage = {
      messageId: 'msg-1',
      userId: 'user-1',
      channelId: 'channel-1',
      text: 'Hello Kato',
      platform: 'router',
      isMention: true,
      timestamp: Date.now(),
    };

    // Invoke the captured handler (as the adapter would)
    expect(capturedHandler).not.toBeNull();
    const response = await capturedHandler!(testMsg);

    expect(mockEngine.process).toHaveBeenCalled();
    expect(sendMessage).toHaveBeenCalledWith('channel-1', 'Hello from Engine');
    expect(response).not.toBeNull();
    expect(response!.output).toBe('Hello from Engine');
  });

  it('should handle engine errors gracefully in message routing', async () => {
    const mockEngine = {
      process: vi.fn().mockRejectedValue(new Error('Engine failure')),
    } as any;

    const gateway = new KatoGateway(mockEngine);

    const adapter: PlatformAdapter = {
      platform: 'error-handler',
      status: 'running' as AdapterStatus,
      start: vi.fn().mockResolvedValue(undefined),
      stop: vi.fn().mockResolvedValue(undefined),
      sendMessage: vi.fn().mockResolvedValue(null),
      onMessage: vi.fn(),
    };

    let capturedHandler: ((msg: AdapterMessage) => Promise<any>) | null = null;
    adapter.onMessage = vi.fn().mockImplementation((handler) => {
      capturedHandler = handler;
    });

    gateway.register(adapter);

    const testMsg: AdapterMessage = {
      messageId: 'err-1',
      userId: 'user-1',
      channelId: 'channel-1',
      text: 'Trigger error',
      platform: 'error-handler',
      isMention: true,
      timestamp: Date.now(),
    };

    const response = await capturedHandler!(testMsg);
    expect(response).toBeNull();
  });
});
