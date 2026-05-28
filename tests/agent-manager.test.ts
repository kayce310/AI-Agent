import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AgentManager, SubAgentConfig } from '../src/core/agents/agent-manager.js';

// ── Deferrable mock for Agent.run() ──
// Allows tests to control exactly when the agent "completes"
let agentRunResolver: ((value: any) => void) | null = null;
let agentRunRejecter: ((err: Error) => void) | null = null;

vi.mock('../src/core/engine/agent.js', () => ({
  Agent: vi.fn().mockImplementation(() => ({
    run: vi.fn().mockImplementation(() => new Promise((resolve, reject) => {
      agentRunResolver = resolve;
      agentRunRejecter = reject;
    })),
    on: vi.fn(),
    hookRegistry: { on: vi.fn(), before: vi.fn(), emit: vi.fn() },
  })),
}));

function createMockConfig(overrides?: Partial<SubAgentConfig>): SubAgentConfig {
  return {
    id: 'test-agent-' + Date.now(),
    sessionId: 'session-1',
    task: 'Do something',
    modelRouter: {
      route: vi.fn(),
    } as any,
    toolRegistry: {
      getDefinitions: vi.fn().mockReturnValue([]),
      toolCount: 0,
    } as any,
    maxToolCycles: 3,
    timeoutMs: 5000,
    debug: false,
    ...overrides,
  };
}

describe('AgentManager', () => {
  let manager: AgentManager;

  beforeEach(() => {
    manager = new AgentManager();
    agentRunResolver = null;
    agentRunRejecter = null;
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    agentRunResolver = null;
    agentRunRejecter = null;
  });

  // ── Initial State ──

  it('should start with empty state', () => {
    expect(manager.list()).toHaveLength(0);
    expect(manager.activeCount).toBe(0);
    const stats = manager.getStats();
    expect(stats.total).toBe(0);
    expect(stats.active).toBe(0);
  });

  // ── Spawn ──

  it('should spawn a sub-agent and return its ID', async () => {
    const config = createMockConfig({ id: 'spawn-test' });
    const id = await manager.spawn(config);

    expect(id).toBe('spawn-test');
    expect(manager.get(id)).toBeDefined();
    expect(manager.get(id)!.status).toBe('running'); // Still running because Agent.run is pending
    expect(manager.activeCount).toBe(1);
  });

  it('should throw on duplicate spawn', async () => {
    const config = createMockConfig({ id: 'dup-agent' });
    await manager.spawn(config);

    await expect(manager.spawn(config)).rejects.toThrow('already exists');
  });

  it('should track spawned agents in stats', async () => {
    await manager.spawn(createMockConfig({ id: 'a' }));
    await manager.spawn(createMockConfig({ id: 'b' }));
    await manager.spawn(createMockConfig({ id: 'c' }));

    const stats = manager.getStats();
    expect(stats.total).toBe(3);
    expect(stats.active).toBe(3); // All still running (mock hangs)
  });

  // ── Get / List ──

  it('should retrieve a sub-agent by ID', async () => {
    const config = createMockConfig({ id: 'find-me' });
    await manager.spawn(config);

    const instance = manager.get('find-me');
    expect(instance).toBeDefined();
    expect(instance!.task).toBe('Do something');
    expect(instance!.sessionId).toBe('session-1');
    expect(instance!.status).toBe('running');
  });

  it('should return undefined for non-existent agent', () => {
    expect(manager.get('ghost')).toBeUndefined();
  });

  it('should list all agents', async () => {
    await manager.spawn(createMockConfig({ id: 'a' }));
    await manager.spawn(createMockConfig({ id: 'b' }));

    expect(manager.list()).toHaveLength(2);
  });

  it('should list only active agents', async () => {
    await manager.spawn(createMockConfig({ id: 'active-1' }));
    await manager.spawn(createMockConfig({ id: 'active-2' }));

    expect(manager.listActive()).toHaveLength(2);
    expect(manager.listCompleted()).toHaveLength(0);
  });

  // ── Completion ──

  it('should mark as completed when Agent.run resolves', async () => {
    const config = createMockConfig({ id: 'complete-me', timeoutMs: 60000 });
    await manager.spawn(config);

    // Resolve the Agent.run promise
    agentRunResolver!({
      content: 'Task done',
      modelUsed: 'test-model',
      providerUsed: 'test-provider',
      toolCycles: 2,
      finished: true,
    });

    // Wait for microtasks to process
    await vi.waitFor(() => {
      const instance = manager.get('complete-me')!;
      expect(instance.status).toBe('completed');
    }, { timeout: 1000, interval: 10 });
  });

  // ── Kill ──

  it('should kill a pending sub-agent before execution completes', async () => {
    const config = createMockConfig({ id: 'killable', timeoutMs: 60000 });
    await manager.spawn(config);

    // Agent is still running (mock hasn't resolved yet)
    expect(manager.get('killable')!.status).toBe('running');

    await manager.kill('killable');
    expect(manager.get('killable')!.status).toBe('killed');
    expect(manager.activeCount).toBe(0);
  });

  it('should throw when killing non-existent agent', async () => {
    await expect(manager.kill('ghost')).rejects.toThrow('not found');
  });

  it('should kill all active agents', async () => {
    await manager.spawn(createMockConfig({ id: 'a', timeoutMs: 60000 }));
    await manager.spawn(createMockConfig({ id: 'b', timeoutMs: 60000 }));

    await manager.killAll();

    expect(manager.get('a')!.status).toBe('killed');
    expect(manager.get('b')!.status).toBe('killed');
    expect(manager.activeCount).toBe(0);
  });

  // ── Timeout ──

  it('should time out a sub-agent when timeout fires', async () => {
    const config = createMockConfig({
      id: 'timeout-test',
      timeoutMs: 100, // Short timeout
    });

    await manager.spawn(config);

    // Agent is running (mock hasn't resolved)
    expect(manager.get('timeout-test')!.status).toBe('running');

    // Advance past timeout — the setTimeout inside spawn will fire
    vi.advanceTimersByTime(150);

    // After advancing timers, the timeout handler should have marked it
    // The timeout sets status = 'timed_out' directly on the instance
    await vi.waitFor(() => {
      const instance = manager.get('timeout-test')!;
      expect(instance.status).toBe('timed_out');
    }, { timeout: 1000, interval: 10 });
  });

  // ── Completion / Wait ──

  it('should wait for a sub-agent to complete and return its result', async () => {
    // Use real timers for this test since waitFor uses polling
    vi.useRealTimers();

    const config = createMockConfig({ id: 'waitable', timeoutMs: 60000 });
    await manager.spawn(config);

    // Resolve the Agent.run immediately
    agentRunResolver!({
      content: 'Task done',
      modelUsed: 'test-model',
      providerUsed: 'test-provider',
      toolCycles: 2,
      finished: true,
    });

    // Allow microtasks to process completion handler first
    await new Promise(r => setTimeout(r, 50));

    // waitFor should see the already-completed status immediately
    const result = await manager.waitFor('waitable', 10, 5000);
    expect(result.status).toBe('completed');
    expect(result.result?.content).toBe('Task done');
  });

  it('should return failed status if Agent.run rejects', async () => {
    const config = createMockConfig({ id: 'fail-test', timeoutMs: 60000 });
    await manager.spawn(config);

    // Reject the Agent.run
    agentRunRejecter!(new Error('Intentional failure'));

    await vi.waitFor(() => {
      const instance = manager.get('fail-test')!;
      expect(instance.status).toBe('failed');
      expect(instance.error).toContain('Intentional failure');
    }, { timeout: 1000, interval: 10 });
  });

  // ── Stats ──

  it('should report correct stats after kill', async () => {
    await manager.spawn(createMockConfig({ id: 'a', timeoutMs: 60000 }));
    await manager.spawn(createMockConfig({ id: 'b', timeoutMs: 60000 }));

    // Only kill 'a'
    await manager.kill('a');

    const stats = manager.getStats();
    expect(stats.total).toBe(2);
    expect(stats.active).toBe(1); // 'b' is still running
    expect(stats.killed).toBe(1); // 'a' was killed
  });

  it('should report listFailed correctly after kill', async () => {
    await manager.spawn(createMockConfig({ id: 'fail-me', timeoutMs: 60000 }));
    await manager.kill('fail-me');

    const failed = manager.listFailed();
    expect(failed.some(s => s.id === 'fail-me')).toBe(true);
  });

  it('should report listCompleted correctly after resolution', async () => {
    await manager.spawn(createMockConfig({ id: 'complete-me', timeoutMs: 60000 }));

    // Resolve the agent
    agentRunResolver!({
      content: 'Done',
      modelUsed: 'm',
      providerUsed: 'p',
      toolCycles: 1,
      finished: true,
    });

    await vi.waitFor(() => {
      const completed = manager.listCompleted();
      expect(completed).toHaveLength(1);
      expect(completed[0].id).toBe('complete-me');
    }, { timeout: 1000, interval: 10 });
  });
});
