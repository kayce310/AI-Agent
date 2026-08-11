/**
 * @file engine-cancel.test.ts — Gateway-cancel-source P1: abort giữa chừng request
 * @layer tests
 *
 * Test 1: agent loop THẬT — cancel giữa lúc tool call đang chạy → cycle kế tiếp
 *         checkAbort throw 'Operation cancelled' → KHÔNG gọi model call mới (không mồ côi).
 * Test 2: engine.process + cancelRequest(sessionId) → response '🛑 Đã hủy', controller
 *         được cleanup (map rỗng) — cancel wire đúng, không rò rỉ state.
 */
import { describe, it, expect, vi } from 'vitest';
import { Agent } from '../src/core/engine/agent.js';
import { CheckpointStore } from '../src/core/checkpoint.js';

function makeRequest(sessionId: string): any {
  return {
    sessionId,
    messages: [{ role: 'user', content: 'Chạy tác vụ dài' }],
    modelId: 'test',
    agentName: 'test',
    protocol: 'test',
    mentionPrefix: '',
    task: 'Tác vụ dài',
  };
}

// ── Test 1: agent loop dừng đúng khi abort giữa tool call ──

describe('gateway-cancel-source: agent loop abort giữa tool call', () => {
  it('abort → dừng ở cycle kế, KHÔNG gọi model call mới (không process mồ côi)', async () => {
    const sessionId = 'cancel-agent-1';
    const store = new CheckpointStore();
    store.start(`req-${sessionId}`, sessionId, 'Tác vụ dài');

    // Router: luôn trả tool call — mỗi lần gọi là 1 model call (cần đếm)
    const route = vi.fn(async () => ({
      content: '',
      modelUsed: 'test',
      providerUsed: 'test',
      finishReason: 'tool_calls',
      toolCalls: [{
        id: 'tc1',
        type: 'function',
        function: { name: 'read_file', arguments: '{"path":"x"}' },
      }],
    }));

    // Tool đang chạy — chậm, mô phỏng side-effect đang diễn ra khi cancel
    let toolRunning = false;
    const toolRegistry: any = {
      getDefinitions: () => [{
        type: 'function',
        function: { name: 'read_file', description: 'Đọc file', parameters: { type: 'object', properties: { path: { type: 'string' } } } },
      }],
      use: () => {},
      executeToolCall: vi.fn(async () => {
        toolRunning = true;
        await new Promise(r => setTimeout(r, 80)); // tool call "thật" đang chạy
        toolRunning = false;
        return { content: 'file content' };
      }),
    };

    const modelRouter: any = { route };
    const agent = new Agent({
      modelRouter,
      toolRegistry,
      checkpointStore: store,
      maxToolCycles: 10,
    });

    const controller = new AbortController();
    const runPromise = agent.run(makeRequest(sessionId), controller.signal);

    // Chờ tool call bắt đầu (đang chạy giữa chừng) rồi cancel
    await vi.waitFor(() => expect(toolRegistry.executeToolCall).toHaveBeenCalled());
    expect(toolRunning).toBe(true);
    controller.abort();

    // Tool xong → cycle kế → checkAbort throw
    await expect(runPromise).rejects.toThrow('Operation cancelled');

    // Model call thứ 2 KHÔNG được gọi — không để lại model-call mồ côi
    expect(route).toHaveBeenCalledTimes(1);
  });
});

// ── Test 2: engine.process + cancelRequest wire + cleanup ──

describe('gateway-cancel-source: engine.cancelRequest wire', () => {
  it('cancelRequest(sessionId) → process trả "Đã hủy", controller cleanup sạch', async () => {
    const { Engine } = await import('../src/core/engine/engine.js');
    const engine = new Engine() as any;

    // Mock agent.run — mô phỏng đúng hành vi agent loop thật: chờ abort rồi throw
    engine.agent = {
      circuitBreakerState: { isHealthy: () => true },
      setMaxToolCycles: vi.fn(),
      run: vi.fn(async (_req: any, signal?: AbortSignal) => {
        await new Promise<void>(resolve => {
          if (signal?.aborted) return resolve();
          signal?.addEventListener('abort', () => resolve());
        });
        throw new Error('Operation cancelled');
      }),
    };

    const sessionId = 'cancel-engine-1';
    const processPromise = engine.process({
      sessionId,
      userId: 'u1',
      messages: [{ role: 'user', content: 'Làm gì đó lâu' }],
      modelId: 'test',
      agentName: 'Coral',
      protocol: 'test',
      mentionPrefix: '',
    });

    // Đợi request đi vào agent.run (controller đã được tạo)
    await vi.waitFor(() => expect(engine.agent.run).toHaveBeenCalled());

    // /cancel: abort theo sessionId
    expect(engine.cancelRequest(sessionId)).toBe(true);
    // Cancel lần 2 — không còn controller (đã cleanup sau khi process settle) → false
    const result = await processPromise;
    expect(result.content).toBe('🛑 Đã hủy yêu cầu.');
    expect(engine.cancelRequest(sessionId)).toBe(false);
    // Không rò rỉ state: controller map + pendingRequests đều rỗng
    expect(engine.requestControllers.size).toBe(0);
    expect(engine.pendingRequests.size).toBe(0);
  });

  it('cancelRequest cho session không có request → false', async () => {
    const { Engine } = await import('../src/core/engine/engine.js');
    const engine = new Engine() as any;
    expect(engine.cancelRequest('no-such-session')).toBe(false);
  });
});
