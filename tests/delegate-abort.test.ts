/**
 * @file delegate-abort.test.ts — AbortSignal propagation xuống subagent (delegate_task)
 * @layer tests
 *
 * Hardening Task 1: parent cancel phải dừng model call trong subagent.
 * Chuỗi: EngineRequest.abortSignal → RequestContext.signal → runSpecialistAgent
 * → route(..., { signal }) → adapter (promise-level withSignal + socket-level Ollama).
 */
import { describe, it, expect, vi } from 'vitest';
import { runSpecialistAgent } from '../src/core/agents/delegate.js';
import { requestContext, RequestContext } from '../src/core/request-context.js';

function makeRctx(signal?: AbortSignal): RequestContext {
  return {
    sessionId: 'test-session',
    taskId: 'test-task',
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

function makeRegistry(router: any) {
  return {
    getModelRouter: () => router,
    getToolsForAgent: () => [{ function: { name: 'read_file' } }],
    getToolRegistry: () => ({ execute: async () => ({ ok: true }) }),
  } as any;
}

describe('delegate_task — AbortSignal propagation', () => {
  it('signal được truyền từ RequestContext xuống route() (cancel lan truyền đúng)', async () => {
    const controller = new AbortController();
    let receivedSignal: AbortSignal | undefined;
    const router = {
      route: vi.fn(async (_msgs: any, opts: any) => {
        receivedSignal = opts.signal;
        return { finishReason: 'stop', content: 'xong', modelUsed: 'm' };
      }),
    };

    await requestContext.run(makeRctx(controller.signal), () =>
      runSpecialistAgent(makeAgent() as any, 'task', makeRegistry(router)),
    );

    expect(receivedSignal).toBe(controller.signal);
  });

  it('signal bị abort TRƯỚC khi chạy → subagent dừng ngay, không gọi model 1 lần nào', async () => {
    const controller = new AbortController();
    controller.abort();
    const router = { route: vi.fn(async () => ({ finishReason: 'stop', content: 'x', modelUsed: 'm' })) };

    await expect(
      requestContext.run(makeRctx(controller.signal), () =>
        runSpecialistAgent(makeAgent() as any, 'task', makeRegistry(router)),
      ),
    ).rejects.toThrow('Operation cancelled');

    expect(router.route).not.toHaveBeenCalled();
  });

  it('parent cancel GIỮA lúc subagent đang chạy → model call trong subagent dừng, không chạy ngầm', async () => {
    const controller = new AbortController();
    // route() giả lập model call đang in-flight: chỉ reject khi signal bị abort
    // (không resolve, không timeout — nếu cancel không lan truyền, test sẽ treo)
    const router = {
      route: vi.fn((_msgs: any, opts: any) =>
        new Promise((_resolve, reject) => {
          opts.signal.addEventListener('abort', () => reject(new Error('Operation cancelled')));
        })),
    };

    const running = requestContext.run(makeRctx(controller.signal), () =>
      runSpecialistAgent(makeAgent() as any, 'task', makeRegistry(router)),
    );

    // Cancel parent sau 20ms — subagent đang giữa model call
    const timer = setTimeout(() => controller.abort(), 20);
    try {
      await expect(running).rejects.toThrow('Operation cancelled');
    } finally {
      clearTimeout(timer);
    }
    expect(router.route).toHaveBeenCalledTimes(1);
  });

  it('không có signal (production hiện tại) → hành vi giữ nguyên, không break', async () => {
    const router = {
      route: vi.fn(async () => ({ finishReason: 'stop', content: 'xong', modelUsed: 'm' })),
    };
    const result = await requestContext.run(makeRctx(undefined), () =>
      runSpecialistAgent(makeAgent() as any, 'task', makeRegistry(router)),
    );
    expect(result.success).toBe(true);
  });
});
