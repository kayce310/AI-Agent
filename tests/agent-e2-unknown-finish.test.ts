/**
 * @file agent-e2-unknown-finish.test.ts — Khóa control-flow nhánh UNKNOWN_FINISH / E2
 * @layer tests
 *
 * Pin hành vi HIỆN TẠI của src/core/engine/agent.ts (:1462–1496), không sửa nó:
 *   - T1: content='' + finishReason lạ ('error'), counter = 0 →
 *         4 lần retry tại :1483 (toolCallCycles 0..3), tổng 5 lần gọi router,
 *         counter đạt 4 → :1495 trả marker [E2].
 *     Biến thể production-shape (ca 11/10/2026 task-1791690266420):
 *         fr='error' + toolCall arguments cắt giữa JSON → tool KHÔNG được
 *         thực thi (nhánh :923 yêu cầu fr==='tool_calls'), vẫn đi vào E2.
 *   - T2: counter ĐÃ đạt 4 nhờ 4 tool cycle hợp lệ trước đó → response
 *         UNKNOWN_FINISH trả [E2] ngay, KHÔNG retry tại nhánh, KHÔNG inject
 *         system message "finish_reason không xác định". Chứng minh
 *         toolCallCycles là counter toàn loop, không phải retry-counter của E2.
 *   - T3: content='' + finishReason='stop' → nhánh :692 → UNPARSEABLE (:735),
 *         KHÔNG bao giờ chạm UNKNOWN_FINISH — không system message UNKNOWN,
 *         không [E2]; [E1] mới là hành vi đúng của input này.
 *   - T4: router reject 'All adapters failed' → outer catch :1505 trả
 *         '❌ Lỗi khi gọi model: ...' + success=false, không đi qua E2.
 *         Router-level tests (request-timeout.test.ts) không thay được test
 *         agent-level này.
 *
 * Không gọi provider/network. Fixture route là mock dựng tay.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { Agent } from '../src/core/engine/agent.js';
import { CheckpointStore } from '../src/core/checkpoint.js';
import { engineCircuitBreaker } from '../src/core/circuit-breaker.js';

/** Chuỗi đặc trưng ONLY của system message retry UNKNOWN_FINISH (agent.ts:1487). */
const UNKNOWN_RETRY_TEXT = 'finish_reason không xác định';
/** Chuỗi đặc trưng của system message retry UNPARSEABLE (agent.ts:742). */
const UNPARSEABLE_RETRY_TEXT = 'không có nội dung hợp lệ';

function makeIsolatedStore(): CheckpointStore {
  // Cô lập theo pattern task-outcome.test.ts — không ghi vào knowledge/checkpoints thật.
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cp-e2-'));
  return new CheckpointStore({ checkpointDir: dir });
}

function makeHarness(checkpointStore: CheckpointStore): { agent: Agent; executeToolCall: ReturnType<typeof vi.fn>; request: any } {
  const executeToolCall = vi.fn(async () => ({ ok: true }));
  const toolRegistry: any = {
    getDefinitions: () => [],
    use: () => {},
    executeToolCall,
  };
  const sessionId = `e2-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  checkpointStore.start(`req-${sessionId}`, sessionId, 'Test task');
  const modelRouter: any = {};
  const agent: any = new Agent({ modelRouter, toolRegistry, checkpointStore, maxToolCycles: 10 });
  const request: any = {
    sessionId,
    messages: [{ role: 'user', content: 'Test task' }],
    modelId: 'test',
    agentName: 'test',
    protocol: 'test',
    mentionPrefix: '',
    task: 'Test task',
  };
  return { agent, executeToolCall, request };
}

/** Đếm system message chứa `text` trong snapshot của lần gọi router thứ `callIndex` (0-based).
 *  Snapshot là bắt buộc: Agent MUTATE cùng một mảng `messages` qua các cycle,
 *  vi.fn chỉ giữ reference — đọc lúc assert sẽ thấy trạng thái cuối của mọi call. */
function countSystemText(snapshots: any[][], callIndex: number, text: string): number {
  const msgs = snapshots[callIndex] ?? [];
  return msgs.filter(m => m.role === 'system' && typeof m.content === 'string' && m.content.includes(text)).length;
}

function snapshotInto(snapshots: any[][], messages: any[]) {
  snapshots.push(messages.map((m: any) => ({ role: m.role, content: typeof m.content === 'string' ? m.content : '' })));
}

function EMPTY(fr: string, toolCalls?: any[]) {
  return { content: '', modelUsed: 'test', providerUsed: 'test', finishReason: fr, toolCalls };
}

describe('E2 control-flow: nhánh UNKNOWN_FINISH (agent.ts:1462–1496)', () => {
  beforeEach(() => {
    // Agent dùng engineCircuitBreaker singleton (agent.ts:206); reset để test T4
    // (1 lần fail) không contaminate các test khác trong cùng file.
    engineCircuitBreaker.reset();
  });

  const UNKNOWN_FIXTURE = EMPTY('error');

  it('T1a: content="" + fr="error", counter fresh → 4 retry UNKNOWN, 5 route calls, trả [E2]', async () => {
    const snaps: any[][] = [];
    const route = vi.fn(async (messages: any[]) => { snapshotInto(snaps, messages); return UNKNOWN_FIXTURE; });
    const store = makeIsolatedStore();
    const { agent, executeToolCall, request } = makeHarness(store);
    (agent as any).modelRouter = { route };

    const result = await agent.run(request);

    expect(route).toHaveBeenCalledTimes(5); // call đầu + 4 retries (toolCallCycles 0..3 đều < 4)
    expect(result.content).toContain('[E2]');
    expect(result.toolCycles).toBe(4); // :1495 return — counter đạt 4 ⇒ hết biên retry tại :1483
    expect(executeToolCall).not.toHaveBeenCalled(); // fixture không tool cycle nào
    // Retry injection: call #1 chưa có, call #5 (cuối) đã có 4 system message UNKNOWN trùng content
    expect(countSystemText(snaps, 0, UNKNOWN_RETRY_TEXT)).toBe(0);
    expect(countSystemText(snaps, 4, UNKNOWN_RETRY_TEXT)).toBe(4);
  });

  it('T1b: fr="error" + tool-call args cắt giữa JSON (hình thái ca 11/10) → tool không chạy, vẫn [E2]', async () => {
    const truncated = EMPTY('error', [
      { type: 'function', index: 0, id: 'call-x', function: { name: 'write_file', arguments: '{"path": "GAME_FIX_PLAN.md"' } },
    ]);
    const route = vi.fn(async () => truncated);
    const store = makeIsolatedStore();
    const { agent, executeToolCall, request } = makeHarness(store);
    (agent as any).modelRouter = { route };

    const result = await agent.run(request);

    expect(executeToolCall).not.toHaveBeenCalled(); // :923 đòi fr==='tool_calls' → payload bị丢弃
    expect(route).toHaveBeenCalledTimes(5);
    expect(result.content).toContain('[E2]');
  });

  it('T2: counter đạt 4 do 4 tool cycle TRƯỚC → [E2] ngay, 0 retry UNKNOWN tại nhánh đó', async () => {
    const bad = EMPTY('error');
    let n = 0;
    const snaps: any[][] = [];
    const route = vi.fn(async (messages: any[]) => {
      snapshotInto(snaps, messages);
      n++;
      if (n <= 4) {
        return EMPTY('tool_calls', [{ type: 'function', id: `c${n}`, function: { name: 'read_file', arguments: '{"path":"x.txt"}' } }]);
      }
      return bad;
    });
    const store = makeIsolatedStore();
    const { agent, executeToolCall, request } = makeHarness(store);
    (agent as any).modelRouter = { route };

    const result = await agent.run(request);

    expect(route).toHaveBeenCalledTimes(5); // 4 cycle tool_calls hợp lệ + 1 response UNKNOWN
    expect(executeToolCall).toHaveBeenCalledTimes(4); // counter toàn loop bump bởi tool cycle
    expect(result.content).toContain('[E2]');
    expect(result.toolCycles).toBe(4);
    // Vào :1483 với c=4 → false → E2 ngay, không retry mới, không inject thêm
    expect(countSystemText(snaps, 4, UNKNOWN_RETRY_TEXT)).toBe(0);
  });

  it('T3: content="" + fr="stop" → UNPARSEABLE (:735), không chạm UNKNOWN_FINISH, không [E2]', async () => {
    const stop = EMPTY('stop');
    const snaps: any[][] = [];
    const route = vi.fn(async (messages: any[]) => { snapshotInto(snaps, messages); return stop; });
    const store = makeIsolatedStore();
    const { agent, request } = makeHarness(store);
    (agent as any).modelRouter = { route };

    const result = await agent.run(request);

    expect(route).toHaveBeenCalledTimes(5); // 4 retry UNPARSEABLE (c 0..3) rồi fallback :752
    expect(result.content).toContain('[E1]'); // hành vi ĐÚNG của input này là [E1], không phải [E2]
    expect(result.content).not.toContain('[E2]');
    // Khóa đúng nhánh: retry là UNPARSEABLE, KHÔNG phải UNKNOWN_FINISH
    expect(countSystemText(snaps, 0, UNKNOWN_RETRY_TEXT)).toBe(0);
    expect(countSystemText(snaps, 4, UNKNOWN_RETRY_TEXT)).toBe(0);
    expect(countSystemText(snaps, 4, UNPARSEABLE_RETRY_TEXT)).toBe(4);
  });

  it('T4: route reject "All adapters failed" → outer catch (agent.ts:1505), không phải E2', async () => {
    const route = vi.fn(async () => {
      throw new Error('All adapters failed: [mock] down');
    });
    const store = makeIsolatedStore();
    const { agent, request } = makeHarness(store);
    (agent as any).modelRouter = { route };

    const result = await agent.run(request);

    expect(route).toHaveBeenCalledTimes(1); // circuit breaker re-throw, không retry tại nhánh
    expect(result.content).toContain('❌ Lỗi khi gọi model');
    expect(result.content).not.toContain('[E2]');
    expect(result.success).toBe(false);
    expect(result.modelUsed).toBe('none'); // :1527
  });
});
