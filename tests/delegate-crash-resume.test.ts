/**
 * @file delegate-crash-resume.test.ts — PA-2 resume-policy: crash-restart cấp subagent
 * @layer tests
 *
 * Crash giữa delegate_task (abort signal) → execute() trả status 'crashed' + message
 * user-friendly + partial (phần đã hoàn thành). Parent KHÔNG auto-retry (route không
 * được gọi lại). Lỗi bình thường (model/tool fail) KHÔNG bị đánh dấu crashed.
 * Không checkpoint namespace mới (f3479a8d) — chỉ thay đổi kết quả trả về.
 */
import { describe, it, expect, vi } from 'vitest';
import { createDelegateTool } from '../src/core/agents/delegate.js';
import { requestContext, RequestContext } from '../src/core/request-context.js';

function makeRctx(signal?: AbortSignal): RequestContext {
  return {
    sessionId: 'test-session',
    taskId: 'test-task',
    userId: 'test-user',
    evidenceLog: new Map(),
    onPlanCreated: () => {},
    signal,
  };
}

function makeAgent() {
  return {
    name: 'analyst',
    role: 'Phân tích',
    goal: 'Hoàn thành task',
    backstory: 'Chuyên gia phân tích',
    modelId: 'test-model',
    allowedTools: ['read_file', 'search'],
    maxCycles: 5,
  };
}

describe('delegate_task — PA-2 resume-policy (crash-restart)', () => {
  it('crash giữa lúc subagent đang chạy → status crashed + message user-friendly + partial, KHÔNG auto-retry', async () => {
    const controller = new AbortController();
    const route = vi.fn(async () => ({
      finishReason: 'tool_calls',
      content: '',
      modelUsed: 'm',
      toolCalls: [{
        id: 'tc1',
        type: 'function',
        function: { name: 'read_file', arguments: '{"path":"src/x.ts"}' },
      }],
    }));
    // Tool mock: trả kết quả rồi ABORT ngay — mô phỏng parent bị crash/restart
    // đúng lúc tool vừa chạy xong (subagent kịp ghi 1 phần việc).
    const execute = vi.fn(async () => {
      controller.abort();
      return { content: 'đã đọc xong file src/x.ts' };
    });
    const registry = {
      listAgents: () => ['analyst'],
      getAgent: () => makeAgent(),
      getModelRouter: () => ({ route }),
      getToolsForAgent: () => [{ function: { name: 'read_file' } }],
      getToolRegistry: () => ({ execute }),
    } as any;

    const tool = createDelegateTool(registry as any);
    const result = await requestContext.run(makeRctx(controller.signal), () =>
      tool.execute({ agentName: 'analyst', task: 'phân tích file' }),
    );

    // 1. Đúng trạng thái crashed
    expect(result.status).toBe('crashed');
    expect(result.success).toBe(false);
    expect(result.error).toBe('Task interrupted by system restart');
    // 2. Message user-friendly, không phải log kỹ thuật
    expect(result.content).toContain('bị gián đoạn');
    expect(result.content).toContain('yêu cầu lại');
    expect(result.content).not.toContain('Operation cancelled');
    // 3. Partial: phần việc đã hoàn thành được giữ lại
    expect(result.content).toContain('Phần đã hoàn thành');
    expect(result.content).toContain('đã đọc xong file src/x.ts');
    // 4. KHÔNG auto-retry: route chỉ gọi 1 lần (cycle 2 không xảy ra sau crash)
    expect(route).toHaveBeenCalledTimes(1);
  });

  it('crash TRƯỚC khi subagent chạy → crashed, không partial, message chuẩn không kèm phần đã làm', async () => {
    const controller = new AbortController();
    controller.abort();
    const route = vi.fn(async () => ({ finishReason: 'stop', content: 'x', modelUsed: 'm' }));
    const registry = {
      listAgents: () => ['analyst'],
      getAgent: () => makeAgent(),
      getModelRouter: () => ({ route }),
      getToolsForAgent: () => [],
      getToolRegistry: () => ({ execute: vi.fn() }),
    } as any;

    const tool = createDelegateTool(registry as any);
    const result = await requestContext.run(makeRctx(controller.signal), () =>
      tool.execute({ agentName: 'analyst', task: 'task' }),
    );

    expect(result.status).toBe('crashed');
    expect(result.success).toBe(false);
    expect(result.content).toContain('bị gián đoạn');
    expect(result.content).toContain('yêu cầu lại');
    expect(result.content).not.toContain('Phần đã hoàn thành');
    expect(route).not.toHaveBeenCalled();
  });

  it('lỗi BÌNH THƯỜNG (model fail) → vẫn success=false + error kỹ thuật, KHÔNG đánh dấu crashed', async () => {
    const controller = new AbortController();
    const route = vi.fn(async () => {
      throw new Error('rate limit exceeded');
    });
    const registry = {
      listAgents: () => ['analyst'],
      getAgent: () => makeAgent(),
      getModelRouter: () => ({ route }),
      getToolsForAgent: () => [],
      getToolRegistry: () => ({ execute: vi.fn() }),
    } as any;

    const tool = createDelegateTool(registry as any);
    const result = await requestContext.run(makeRctx(controller.signal), () =>
      tool.execute({ agentName: 'analyst', task: 'task' }),
    );

    expect(result.status).toBeUndefined();
    expect(result.success).toBe(false);
    expect(result.error).toBe('rate limit exceeded');
    expect(result.content).toBe('');
  });
});
