/**
 * @file delegate-harden.test.ts — allowedTools hard-enforce + guard chain cho subagent
 * @layer tests
 *
 * Hardening Task 2:
 * - registry.execute() chặn tool ngoài allowedTools ở TẦNG THỰC THI (fail-loud),
 *   không chỉ giấu khỏi tầm nhìn LLM (agent-registry.ts:139-142 chỉ filter visibility).
 * - subagent (delegate.ts) chạy cùng guard chain như parent loop (tool:call/tool:result
 *   hooks) — trước fix, subagent gọi registry.execute trực tiếp, BY-PASS PrivilegeGuard.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { runSpecialistAgent } from '../src/core/agents/delegate.js';
import { getDefaultRegistry } from '../src/core/tools/tool-registry.js';
import { globalHooks } from '../src/core/hooks.js';
import { requestContext } from '../src/core/request-context.js';

const rctx = {
  sessionId: 'test-session',
  taskId: 'test-task',
  evidenceLog: new Map(),
  onPlanCreated: () => {},
};

function makeAgent(allowedTools: string[]) {
  return {
    name: 'analyst',
    role: 'Phân tích',
    goal: 'Hoàn thành task',
    backstory: 'Chuyên gia',
    modelId: 'test-model',
    allowedTools,
    maxCycles: 5,
  };
}

function makeRegistry(router: any, toolExecute = async () => ({ ok: true })) {
  const execute = vi.fn(toolExecute);
  return {
    getModelRouter: () => router,
    getToolsForAgent: () => [{ function: { name: 'read_file' } }],
    getToolRegistry: () => ({ execute }),
    _executeSpy: execute,
  } as any;
}

describe('registry.execute — hard-enforce allowedTools (defense-in-depth)', () => {
  it('chặn tool ngoài allowedTools: fail-loud, không âm thầm bỏ qua', async () => {
    const registry = await getDefaultRegistry();
    const result = await registry.execute('write_file', { path: '/tmp/x' }, ['read_file', 'search']);
    expect(result.error).toContain('blocked (hard-enforce)');
  });

  it('tool trong allowedTools vẫn chạy bình thường', async () => {
    const registry = await getDefaultRegistry();
    const result = await registry.execute('read_file', { path: __filename }, ['read_file', 'search']);
    expect(result.error).toBeUndefined();
  });

  it('không truyền allowedTools (parent path) → không giới hạn', async () => {
    const registry = await getDefaultRegistry();
    const result = await registry.execute('write_file', { path: '/tmp/y', content: 'test' });
    // Tool chạy tới validation riêng của nó — guard allowedTools KHÔNG chặn
    expect(result.error).not.toContain('blocked (hard-enforce)');
  });
});

describe('subagent — allowedTools + guard chain', () => {
  beforeEach(() => {
    vi.spyOn(globalHooks, 'emit').mockResolvedValue(true);
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('tool ngoài allowedTools bị chặn trước khi chạy — không gọi execute', async () => {
    const router = {
      route: vi.fn()
        .mockResolvedValueOnce({
          finishReason: 'tool_calls',
          content: null,
          toolCalls: [{ id: 't1', type: 'function', function: { name: 'write_file', arguments: '{"path":"/tmp/evil"}' } }],
        })
        .mockResolvedValueOnce({ finishReason: 'stop', content: 'xong', modelUsed: 'm' }),
    };
    const reg = makeRegistry(router);

    const result = await requestContext.run(rctx, () =>
      runSpecialistAgent(makeAgent(['read_file']) as any, 'task', reg),
    );

    expect(result.success).toBe(true);
    expect(reg._executeSpy).not.toHaveBeenCalled();
    // Policy gate chạy TRƯỚC guard chain — tool ngoài allowedTools bị chặn từ đầu,
    // không tới được hooks (không emit tool:call, không emit tool:result)
    expect((globalHooks.emit as any).mock.calls.filter((c: any[]) => c[0] === 'tool:call').length).toBe(0);
    expect((globalHooks.emit as any).mock.calls.filter((c: any[]) => c[0] === 'tool:result').length).toBe(0);
  });

  it('guard từ chối (tool:call=false) → tool không chạy, lỗi trả về model', async () => {
    (globalHooks.emit as any).mockResolvedValue(false);
    const router = {
      route: vi.fn()
        .mockResolvedValueOnce({
          finishReason: 'tool_calls',
          content: null,
          toolCalls: [{ id: 't1', type: 'function', function: { name: 'read_file', arguments: '{}' } }],
        })
        .mockResolvedValueOnce({ finishReason: 'stop', content: 'xong', modelUsed: 'm' }),
    };
    const reg = makeRegistry(router);

    const result = await requestContext.run(rctx, () =>
      runSpecialistAgent(makeAgent(['read_file']) as any, 'task', reg),
    );

    expect(result.success).toBe(true);
    expect(reg._executeSpy).not.toHaveBeenCalled();
  });

  it('tool được phép chạy + hooks tool:call/tool:result được emit đúng format', async () => {
    const router = {
      route: vi.fn()
        .mockResolvedValueOnce({
          finishReason: 'tool_calls',
          content: null,
          toolCalls: [{ id: 't1', type: 'function', function: { name: 'read_file', arguments: '{}' } }],
        })
        .mockResolvedValueOnce({ finishReason: 'stop', content: 'xong', modelUsed: 'm' }),
    };
    const reg = makeRegistry(router, async () => ({ ok: true, content: 'data' }));

    const result = await requestContext.run(rctx, () =>
      runSpecialistAgent(makeAgent(['read_file']) as any, 'task', reg),
    );

    expect(result.success).toBe(true);
    expect(reg._executeSpy).toHaveBeenCalledTimes(1);
    expect(reg._executeSpy).toHaveBeenCalledWith('read_file', {}, ['read_file']);

    const callEvent = (globalHooks.emit as any).mock.calls.find((c: any[]) => c[0] === 'tool:call');
    expect(callEvent[1]).toMatchObject({ toolName: 'read_file', sessionId: 'test-session' });
    const resultEvent = (globalHooks.emit as any).mock.calls.find((c: any[]) => c[0] === 'tool:result');
    expect(resultEvent[1]).toMatchObject({ toolName: 'read_file', result: { ok: true, content: 'data' } });
  });
});
