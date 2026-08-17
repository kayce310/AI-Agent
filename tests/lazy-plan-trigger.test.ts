/**
 * @file lazy-plan-trigger.test.ts — Hybrid lazy-plan: execution-derived trigger
 * @layer tests
 *
 * Verifies the lazy-plan redesign:
 *   1. Direct-answer request ("ê Coral", "tụ 104 là gì") → KHÔNG tạo plan,
 *      KHÔNG gọi update_plan, KHÔNG nudge.
 *   2. Model tự tạo plan (nhiều bước) → plan flow đầy đủ, KHÔNG nudge thừa.
 *   3. Execution-derived trigger: ≥2 tool call thật mà chưa có plan → inject
 *      [PLAN] directive ĐÚNG 1 lần (không spam, không escalation <8).
 *   4. Nudge chỉ là directive — KHÔNG có code-level force tạo plan (ADR-000
 *      model-discretionary giữ nguyên: model có thể bỏ qua).
 *   5. Plan persistence qua checkpointStore hoạt động xuyên suốt (create →
 *      complete_item → completed).
 */

import { describe, it, expect } from 'vitest';
import { Agent } from '../src/core/engine/agent.js';
import { CheckpointStore } from '../src/core/checkpoint.js';
import type { TaskPlan } from '../src/core/plan/types.js';

function makeStore(): CheckpointStore {
  return new CheckpointStore();
}

/**
 * Tool registry stub: read_file/write_file trả kết quả rỗng; update_plan thao tác
 * checkpointStore thật (giống plugin thật: create → setPlan, complete_item → advance).
 */
function makeAgent(checkpointStore: CheckpointStore, modelRouter: any, sessionId: string): Agent {
  const toolRegistry: any = {
    getDefinitions: () => [],
    executeToolCall: async (tc: any) => {
      const name = tc.function?.name;
      const args = JSON.parse(tc.function?.arguments || '{}');
      if (name === 'update_plan') {
        const existing = checkpointStore.getPlan(sessionId);
        if (args.action === 'create') {
          const plan: TaskPlan = {
            id: `plan-${sessionId}-${Date.now()}`,
            sessionId,
            requestId: `plan-${sessionId}-${Date.now()}`,
            goal: 'Test goal',
            items: (args.items || []).map((d: string, i: number) => ({
              index: i,
              description: d,
              status: 'pending' as const,
              consecutiveFailedAttempts: 0,
            })),
            status: 'pending',
            currentItemIndex: 0,
            createdAt: Date.now(),
            abandonAfterMs: 7200000,
          };
          checkpointStore.setPlan(sessionId, plan);
          return { ok: true, planId: plan.id };
        }
        if (args.action === 'complete_item' && existing) {
          const item = existing.items[args.item_index];
          if (item) {
            item.status = 'completed';
            existing.currentItemIndex = Math.max(args.item_index + 1, existing.currentItemIndex);
            if (existing.items.every(i => i.status === 'completed')) existing.status = 'completed';
            else if (existing.status === 'pending') existing.status = 'running';
            checkpointStore.setPlan(sessionId, existing);
            return { ok: true };
          }
        }
        return { ok: false, error: `unknown update_plan action: ${args.action}` };
      }
      return { ok: true };
    },
    use: () => {},
  };
  return new Agent({ modelRouter, toolRegistry, checkpointStore, maxToolCycles: 10 });
}

function makeRequest(sessionId: string, content = 'Test task'): any {
  return {
    sessionId,
    messages: [{ role: 'user', content }],
    modelId: 'test',
    agentName: 'test',
    protocol: 'test',
    mentionPrefix: '',
    task: content,
  };
}

/** Đếm số system message [PLAN] (nudge execution-derived) trong toàn bộ route calls. */
function countPlanNudges(routeCalls: any[][]): number {
  // Đếm số lần nudge ĐƯỢC INJECT (dedupe theo content — message persist qua nhiều route call)
  const seen = new Set<string>();
  for (const rc of routeCalls) {
    for (const m of rc) {
      if (m.role === 'system' && typeof m.content === 'string' && (typeof m.content === 'string' && m.content.includes('[PLAN]'))) {
        seen.add(m.content);
      }
    }
  }
  return seen.size;
}

function toolCall(name: string, args: any = {}, id = `call-${name}-${Math.random()}`): any {
  return { type: 'function', id, function: { name, arguments: JSON.stringify(args) } };
}

describe('Hybrid lazy-plan: direct-answer-first', () => {
  it('"ê Coral" → trả lời trực tiếp, KHÔNG tạo plan, KHÔNG nudge', async () => {
    const sessionId = `lazy-greet-${Date.now()}`;
    const store = makeStore();
    let routeCalls = 0;
    const modelRouter: any = {
      route: async () => {
        routeCalls++;
        return { content: 'Chào bạn! 👋', modelUsed: 'test', providerUsed: 'test', finishReason: 'stop', toolCalls: [] };
      },
    };
    const agent = makeAgent(store, modelRouter, sessionId);
    const result = await agent.run(makeRequest(sessionId, 'ê Coral'));

    expect(result.content).toContain('Chào bạn');
    expect(routeCalls).toBe(1); // A direct final answer must terminate the task.
    expect(store.getPlan(sessionId)).toBeNull(); // KHÔNG có plan được tạo
  });

  it('"tụ 104 là gì" → trả lời trực tiếp, KHÔNG tạo plan', async () => {
    const sessionId = `lazy-question-${Date.now()}`;
    const store = makeStore();
    const modelRouter: any = {
      route: async () => ({ content: 'Tụ 104 là tụ gốm 100nF.', modelUsed: 'test', providerUsed: 'test', finishReason: 'stop', toolCalls: [] }),
    };
    const agent = makeAgent(store, modelRouter, sessionId);
    const result = await agent.run(makeRequest(sessionId, 'tụ 104 là gì'));

    expect(result.content).toContain('Tụ 104');
    expect(store.getPlan(sessionId)).toBeNull();
  });
});

describe('Hybrid lazy-plan: execution-derived trigger', () => {
  it('≥2 tool call thật chưa có plan → nudge [PLAN] ĐÚNG 1 lần (không spam)', async () => {
    const sessionId = `lazy-nudge-${Date.now()}`;
    const store = makeStore();
    store.start(`req-${sessionId}`, sessionId, 'Test');
    const routeCalls: any[][] = [];
    let callCount = 0;
    const modelRouter: any = {
      route: async (messages: any[]) => {
        routeCalls.push(JSON.parse(JSON.stringify(messages)));
        callCount++;
        if (callCount <= 4) {
          // Model cứ gọi tool (bỏ qua nudge) — kiểm tra trigger không lặp lại
          return { content: '', modelUsed: 'test', providerUsed: 'test', finishReason: 'tool_calls', toolCalls: [toolCall('read_file')] };
        }
        return { content: 'Xong.', modelUsed: 'test', providerUsed: 'test', finishReason: 'stop', toolCalls: [] };
      },
    };
    const agent = makeAgent(store, modelRouter, sessionId);
    const result = await agent.run(makeRequest(sessionId, 'debug nhiều bước'));

    expect(result.content).toContain('Xong');
    // Nudge xuất hiện đúng 1 lần dù có 4+ tool call thật
    expect(countPlanNudges(routeCalls)).toBe(1);
    // Nudge KHÔNG xuất hiện ở call 1-2 (chưa đủ 2 tool call thật)
    expect(routeCalls[0].some((m: any) => (typeof m.content === 'string' && m.content.includes('[PLAN]')))).toBe(false);
    expect(routeCalls[1].some((m: any) => (typeof m.content === 'string' && m.content.includes('[PLAN]')))).toBe(false);
    // Model bỏ qua nudge → KHÔNG có code-level force tạo plan (ADR-000 giữ nguyên)
    expect(store.getPlan(sessionId)).toBeNull();
  });

  it('nudge xuất hiện lần đầu ở lượt model thứ 3 (sau 2 tool call thật)', async () => {
    const sessionId = `lazy-nudge-timing-${Date.now()}`;
    const store = makeStore();
    store.start(`req-${sessionId}`, sessionId, 'Test');
    const routeCalls: any[][] = [];
    let callCount = 0;
    const modelRouter: any = {
      route: async (messages: any[]) => {
        routeCalls.push(JSON.parse(JSON.stringify(messages)));
        callCount++;
        if (callCount <= 3) {
          return { content: '', modelUsed: 'test', providerUsed: 'test', finishReason: 'tool_calls', toolCalls: [toolCall('read_file')] };
        }
        return { content: 'Xong.', modelUsed: 'test', providerUsed: 'test', finishReason: 'stop', toolCalls: [] };
      },
    };
    const agent = makeAgent(store, modelRouter, sessionId);
    await agent.run(makeRequest(sessionId, 'nhiều bước'));

    // Call 1: chưa có tool nào; Call 2: 1 tool; Call 3: đã có 2 tool → nudge ở đây
    expect(routeCalls[0].some((m: any) => (typeof m.content === 'string' && m.content.includes('[PLAN]')))).toBe(false);
    expect(routeCalls[1].some((m: any) => (typeof m.content === 'string' && m.content.includes('[PLAN]')))).toBe(false);
    expect(routeCalls[2].some((m: any) => (typeof m.content === 'string' && m.content.includes('[PLAN]')))).toBe(true);
    expect(countPlanNudges(routeCalls)).toBe(1);
  });
});

describe('Hybrid lazy-plan: model-initiated plan (không nudge thừa)', () => {
  it('model tự tạo plan ở cycle 2 → plan flow đầy đủ, nudge KHÔNG fire', async () => {
    const sessionId = `lazy-planflow-${Date.now()}`;
    const store = makeStore();
    store.start(`req-${sessionId}`, sessionId, 'Kiểm tra codebase và tạo báo cáo');
    const routeCalls: any[][] = [];
    let callCount = 0;
    const modelRouter: any = {
      route: async (messages: any[]) => {
        routeCalls.push(JSON.parse(JSON.stringify(messages)));
        callCount++;
        if (callCount === 1) return { content: '', modelUsed: 'test', providerUsed: 'test', finishReason: 'tool_calls', toolCalls: [toolCall('read_file')] };
        if (callCount === 2) return { content: '', modelUsed: 'test', providerUsed: 'test', finishReason: 'tool_calls', toolCalls: [toolCall('update_plan', { action: 'create', items: ['Đọc code', 'Phân tích', 'Viết báo cáo'] })] };
        if (callCount === 3) return { content: '', modelUsed: 'test', providerUsed: 'test', finishReason: 'tool_calls', toolCalls: [toolCall('read_file')] };
        if (callCount === 4) return { content: '', modelUsed: 'test', providerUsed: 'test', finishReason: 'tool_calls', toolCalls: [toolCall('update_plan', { action: 'complete_item', item_index: 0, result_summary: 'xong' })] };
        if (callCount === 5) return { content: '', modelUsed: 'test', providerUsed: 'test', finishReason: 'tool_calls', toolCalls: [toolCall('update_plan', { action: 'complete_item', item_index: 1, result_summary: 'xong' })] };
        if (callCount === 6) return { content: '', modelUsed: 'test', providerUsed: 'test', finishReason: 'tool_calls', toolCalls: [toolCall('update_plan', { action: 'complete_item', item_index: 2, result_summary: 'xong' })] };
        return { content: 'Báo cáo đã xong.', modelUsed: 'test', providerUsed: 'test', finishReason: 'stop', toolCalls: [] };
      },
    };
    const agent = makeAgent(store, modelRouter, sessionId);
    const result = await agent.run(makeRequest(sessionId, 'kiểm tra codebase và tạo báo cáo'));

    expect(result.content).toContain('Báo cáo');
    // Plan tồn tại + hoàn thành đúng state machine (3/3 items → completed)
    const plan = store.getPlan(sessionId);
    expect(plan).not.toBeNull();
    expect(plan!.status).toBe('completed');
    expect(plan!.items.every(i => i.status === 'completed')).toBe(true);
    // Model chủ động tạo plan → KHÔNG cần nudge execution-derived
    expect(countPlanNudges(routeCalls)).toBe(0);
  });
});
