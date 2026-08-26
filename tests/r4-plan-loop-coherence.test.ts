/**
 * @file r4-plan-loop-coherence.test.ts — R4-F.1 Planning Loop Coherence
 * @layer tests
 * @spec docs/evidence/R4/R4_V1_SPEC.md
 *
 * Drives the REAL Agent.run() loop with a scripted modelRouter and a REAL
 * ToolRegistry (real update_plan plugin + real deterministic work tool).
 * Assertions target observable end-state only: CheckpointStore contents,
 * EvidenceLog records, and tool-result payloads observed in model messages.
 * Per spec: NOT a re-run of state-machine unit tests.
 */

import { describe, it, expect } from 'vitest';
import { Agent } from '../src/core/engine/agent.js';
import { ToolRegistry } from '../src/core/tools/tool-registry.js';
import { CheckpointStore } from '../src/core/checkpoint.js';
import { createUpdatePlanPlugin } from '../src/core/plan/update-plan-tool.js';
import { requestContext, type RequestContext } from '../src/core/request-context.js';
import { validateTransition, type PlanStatus, type EvidenceLog } from '../src/core/plan/types.js';

const SID = 'r4-f1-session';

interface ModelTurn {
  content?: string;
  finishReason?: string;
  toolCalls?: { id: string; type: string; function: { name: string; arguments: string } }[];
}

function makeCtx(sessionId: string, evidenceLog: EvidenceLog): RequestContext {
  return {
    sessionId,
    taskId: `task-${sessionId}`,
    evidenceLog,
    onPlanCreated: () => {},
    userId: 'r4-tester',
  };
}

/** Real registry: real update_plan plugin + one deterministic work tool. */
function makeRegistry(store: CheckpointStore): ToolRegistry {
  const registry = new ToolRegistry();
  registry.use(createUpdatePlanPlugin(store));
  registry.use({
    name: 'r4_work',
    tools: [
      {
        name: 'r4_work',
        description: 'Deterministic work tool — returns fixed artifact',
        schema: { type: 'object', properties: { step: { type: 'number' } }, required: ['step'] },
        execute: async (args: Record<string, any>) => ({ ok: true, step: args.step, artifact: `artifact-${args.step}` }),
      },
    ],
  });
  return registry;
}

function makeAgent(store: CheckpointStore, queue: ModelTurn[], opts?: {
  statusJourney?: (PlanStatus | undefined)[];
  toolPayloads?: string[];
  evidenceLog?: EvidenceLog;
  beforeTurn?: () => void;
}): Agent {
  const route = async (messages: any[]) => {
    opts?.beforeTurn?.();
    opts?.statusJourney?.push(store.getPlan(SID)?.status);
    for (const m of messages) {
      if (m.role === 'tool') {
        opts?.toolPayloads?.push(typeof m.content === 'string' ? m.content : JSON.stringify(m.content));
      }
    }
    return queue.shift()!;
  };
  return new Agent({
    modelRouter: { route },
    toolRegistry: makeRegistry(store),
    checkpointStore: store,
    maxToolCycles: 15,
  } as any);
}

function run(agent: Agent, evidenceLog: EvidenceLog): Promise<any> {
  const req = {
    sessionId: SID,
    messages: [{ role: 'user', content: 'R4 multi-step task' }],
    modelId: 'test',
    agentName: 'test',
    protocol: 'test',
    mentionPrefix: '',
    task: 'R4 multi-step task',
  };
  return requestContext.run(makeCtx(SID, evidenceLog), () => agent.run(req as any));
}

function tc(name: string, args: Record<string, unknown>, id: string): ModelTurn {
  return {
    finishReason: 'tool_calls',
    toolCalls: [{ id, type: 'function', function: { name, arguments: JSON.stringify(args) } }],
  };
}

const STOP: ModelTurn = { content: 'done', finishReason: 'stop' };

/** F1-AC4 helper: every consecutive observed status pair must be a legal transition. */
function assertNoInvalidTransition(journey: (PlanStatus | undefined)[]): void {
  for (let i = 1; i < journey.length; i++) {
    const from = journey[i - 1];
    const to = journey[i];
    if (!from || !to || from === to) continue;
    expect(validateTransition(from, to), `illegal transition ${from} → ${to} at observation ${i}`).toBeNull();
  }
}

describe('R4-F.1 planning loop coherence (scripted model through real loop)', () => {

  it('S1 happy path: create → 3 items executed with real tool calls → completed, evidence intact', async () => {
    const store = new CheckpointStore();
    store.start(`req-${SID}`, SID, 'R4 multi-step task');
    const evidenceLog: EvidenceLog = new Map();
    const statusJourney: (PlanStatus | undefined)[] = [];

    const agent = makeAgent(store, [
      tc('update_plan', { action: 'create', items: ['step-0', 'step-1', 'step-2'], goal: 'R4 S1' }, 't1'),
      tc('r4_work', { step: 0 }, 't2'),
      tc('update_plan', { action: 'complete_item', item_index: 0, result_summary: 'did step 0' }, 't3'),
      tc('r4_work', { step: 1 }, 't4'),
      tc('update_plan', { action: 'complete_item', item_index: 1, result_summary: 'did step 1' }, 't5'),
      tc('r4_work', { step: 2 }, 't6'),
      tc('update_plan', { action: 'complete_item', item_index: 2, result_summary: 'did step 2' }, 't7'),
      STOP,
    ], { statusJourney });

    await run(agent, evidenceLog);
    statusJourney.push(store.getPlan(SID)?.status); // final observation

    const plan = store.getPlan(SID)!;
    // F1-AC5: terminal consistency
    expect(plan.status).toBe('completed');
    expect(plan.completedAt).toBeDefined();
    expect(plan.items.every(i => i.status === 'completed')).toBe(true);
    expect(plan.currentItemIndex).toBe(3);

    // F1-AC2 + F1-AC6: every completed item has ≥1 successful REAL work record
    for (let i = 0; i < 3; i++) {
      const ev = evidenceLog.get(i) ?? [];
      expect(ev.length, `item ${i} evidence`).toBeGreaterThan(0);
      expect(ev.some(e => e.success && e.toolName === 'r4_work'), `item ${i} has r4_work success`).toBe(true);
      // F1-AC6: no completion claim without evidence — summary present implies work evidence present
      expect(plan.items[i].resultSummary).toContain(`step ${i}`);
    }

    // F1-AC4: no invalid transition across the whole journey
    assertNoInvalidTransition(statusJourney);
    // sanity: journey actually traversed pending→running→completed
    expect(statusJourney).toContain('pending');
    expect(statusJourney).toContain('running');
    expect(statusJourney[statusJourney.length - 1]).toBe('completed');
  });

  it('S2 gate-in-loop: premature complete_item rejected inside full loop, accepted only after real work', async () => {
    const store = new CheckpointStore();
    store.start(`req-${SID}-s2`, SID, 'R4 S2');
    const evidenceLog: EvidenceLog = new Map();
    const statusJourney: (PlanStatus | undefined)[] = [];
    const toolPayloads: string[] = [];
    let prematureItemStillPending = false;
    let prematureEvidenceEmpty = false;

    const queue: ModelTurn[] = [
      tc('update_plan', { action: 'create', items: ['item-a', 'item-b'], goal: 'R4 S2' }, 'u1'),
      tc('update_plan', { action: 'complete_item', item_index: 0, result_summary: 'claiming without work' }, 'u2'),
      tc('r4_work', { step: 0 }, 'u3'),
      tc('update_plan', { action: 'complete_item', item_index: 0, result_summary: 'now legit' }, 'u4'),
      tc('r4_work', { step: 1 }, 'u6'),
      tc('update_plan', { action: 'complete_item', item_index: 1, result_summary: 'did step 1' }, 'u7'),
      STOP,
    ];

    const agent = makeAgent(store, queue, {
      statusJourney,
      toolPayloads,
      evidenceLog,
      beforeTurn: () => {
        // Observation point: right before u3 (first real work call) — premature
        // completion (u2) must have been rejected without touching state.
        if (queue[0]?.toolCalls?.[0]?.id === 'u3') {
          const p = store.getPlan(SID)!;
          prematureItemStillPending = p.items[0].status === 'pending';
          prematureEvidenceEmpty = (evidenceLog.get(0)?.length ?? 0) === 0;
        }
      },
    });

    await run(agent, evidenceLog);
    statusJourney.push(store.getPlan(SID)?.status);

    // F1-AC3: gate rejection happened INSIDE the loop and reached the model as tool payload
    const rejectionSeen = toolPayloads.some(p => p.includes('No evidence of tool execution'));
    expect(rejectionSeen, 'gate rejection payload reached the model').toBe(true);
    expect(prematureItemStillPending, 'item NOT marked completed by premature claim').toBe(true);
    expect(prematureEvidenceEmpty, 'evidence log empty before real work').toBe(true);

    // End-state: consistent closure via legitimate paths only
    const plan = store.getPlan(SID)!;
    expect(plan.status).toBe('completed');
    expect(plan.items[0].status).toBe('completed');
    expect(plan.items[0].resultSummary).toBe('now legit'); // rejected claim's summary discarded
    expect(plan.items[1].status).toBe('completed');
    expect(plan.items[1].resultSummary).toBe('did step 1');

    // Evidence integrity: item-0 log contains ONLY the real work call (no bookkeeping pollution)
    const ev0 = evidenceLog.get(0)!;
    expect(ev0.map(e => e.toolName)).toEqual(['r4_work']);
    expect(ev0[0].success).toBe(true);

    assertNoInvalidTransition(statusJourney);
  });
});
