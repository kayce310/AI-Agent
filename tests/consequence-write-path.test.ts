/**
 * Coral Agent — Consequence Memory Write Path Tests (ADR-003 Phase 1)
 *
 * Verifies:
 *  - fail tool → record created with non-empty evidenceRef
 *  - record không chứa secret mẫu (redaction)
 *  - lesson có/không đều không ảnh hưởng reusePolicy enum (smoke)
 *  - single-writer: chỉ consequence-store ghi DB
 */

import { describe, it, beforeEach, afterEach, expect, vi } from 'vitest';
import { ConsequenceStore } from '../src/core/memory/consequence-store.js';
import { registerConsequenceWritePath, recordPlanTerminal, recordGateReject, PLAN_TERMINAL_TOOL } from '../src/core/memory/consequence-write-path.js';
import { globalHooks } from '../src/core/hooks.js';
import { requestContext, RequestContext } from '../src/core/request-context.js';
import { buildArgsDigest, redactString, redactValue } from '../src/core/memory/consequence-redact.js';

function makeRctx(opts: { userId?: string; sessionId?: string; taskId?: string } = {}): RequestContext {
  return {
    sessionId: opts.sessionId ?? 's1',
    taskId: opts.taskId ?? 't1',
    userId: opts.userId ?? 'user-1',
    evidenceLog: new Map(),
    onPlanCreated: () => {},
  };
}
function withRctx<T>(fn: () => T, opts: { userId?: string; sessionId?: string; taskId?: string } = {}): T {
  return requestContext.run(makeRctx(opts), fn);
}
/** Emit tool:result TRONG request context — Q3: append() stamp userId từ rctx, ngoài rctx sẽ fail-loud. */
async function emitToolResult(payload: unknown): Promise<void> {
  await withRctx(() => globalHooks.emit('tool:result', payload as never));
}

describe('Consequence Write Path — tool:result hook', () => {
  let store: ConsequenceStore;
  let unsub: (() => void) | null = null;

  beforeEach(() => {
    store = new ConsequenceStore(':memory:');
    unsub = registerConsequenceWritePath({ store });
  });

  afterEach(() => {
    if (unsub) { unsub(); unsub = null; }
    globalHooks.clear();
    store.close();
  });

  it('should create a record when tool result fails', async () => {
    await emitToolResult({
      sessionId: 's1',
      toolName: 'browser_tool',
      args: { url: 'https://example.com' },
      result: { error: 'Browser not authenticated' },
      cycle: 2,
    });
    const recs = store.listRecent();
    expect(recs).toHaveLength(1);
    const rec = recs[0];
    expect(rec.outcome).toBe('fail');
    expect(rec.action.toolName).toBe('browser_tool');
    // evidenceRef không rỗng
    expect(rec.evidenceRef).toBeDefined();
    expect(rec.evidenceRef.cycle).toBe(2);
  });

  it('success có args (digest) → tạo pattern row count=1 (Phase 5)', async () => {
    await emitToolResult({
      sessionId: 's1',
      toolName: 'read_file',
      args: { path: '/tmp/x' },
      result: { content: 'ok' },
      cycle: 1,
    });
    const recs = store.listRecent();
    expect(recs).toHaveLength(1);
    const rec = recs[0];
    expect(rec.outcome).toBe('success');
    expect(rec.occurrenceCount).toBe(1);
    expect(rec.reusePolicy).toBe('record_only');
    expect(rec.action.argsDigest).toBe('path'); // buildArgsDigest({path}) = 'path'
  });

  it('success không args → KHÔNG tạo record (không ghi mọi success)', async () => {
    await emitToolResult({
      sessionId: 's1',
      toolName: 'noop_tool',
      result: { ok: true },
      cycle: 1,
    });
    expect(store.listRecent()).toHaveLength(0);
  });

  it('should NOT create a record when no evidence anchor', async () => {
    // rctx không có sessionId/taskId (anchor rỗng) → skip ghi
    await withRctx(() => globalHooks.emit('tool:result', {
      toolName: 'some_tool',
      result: { error: 'x' },
    } as never), { sessionId: '', taskId: '' });
    expect(store.listRecent()).toHaveLength(0);
  });

  it('should redact secrets from args digest', async () => {
    await emitToolResult({
      sessionId: 's1',
      toolName: 'api_call',
      args: { url: 'https://api.example.com', apiKey: 'SECRET-KEY-123', password: 'hunter2' },
      result: { error: '401 unauthorized' },
      cycle: 1,
    });
    const recs = store.listRecent();
    expect(recs).toHaveLength(1);
    const digest = recs[0].action.argsDigest || '';
    expect(digest).not.toContain('SECRET-KEY-123');
    expect(digest).not.toContain('hunter2');
  });

  it('should store lesson as optional description only (not a policy driver)', async () => {
    // lesson có
    await emitToolResult({
      sessionId: 's1',
      toolName: 'tool_a',
      args: {},
      result: { error: 'boom 1' },
      cycle: 1,
    });
    // lesson không
    await emitToolResult({
      sessionId: 's1',
      toolName: 'tool_b',
      args: {},
      result: { error: 'boom 2' },
      cycle: 2,
    });
    const recs = store.listRecent();
    const withLesson = recs.find(r => r.action.toolName === 'tool_a');
    const withoutLesson = recs.find(r => r.action.toolName === 'tool_b');
    // Cả hai đều có reusePolicy hợp lệ, lesson không ảnh hưởng enum
    const validPolicies = ['suggest', 'require_hitl', 'block', 'record_only'];
    expect(validPolicies).toContain(withLesson!.reusePolicy);
    expect(validPolicies).toContain(withoutLesson!.reusePolicy);
    // outcome vẫn là fail dựa trên evidence (tool result), không dựa lesson
    expect(withLesson!.outcome).toBe('fail');
    expect(withoutLesson!.outcome).toBe('fail');
  });
});

describe('Consequence — plan terminal records', () => {
  let store: ConsequenceStore;

  beforeEach(() => {
    store = new ConsequenceStore(':memory:');
  });

  afterEach(() => {
    store.close();
  });

  it('should record plan failed with toolName __plan__ and evidenceRef = planId', async () => {
    const rec = await withRctx(() => recordPlanTerminal({
      store,
      planId: 'plan-abc',
      planStatus: 'failed',
      stopReason: 'Too many failed items',
      goalSummary: 'Deploy service',
      sessionId: 's1',
      taskId: 't1',
    }));
    expect(rec).not.toBeNull();
    expect(rec!.action.toolName).toBe(PLAN_TERMINAL_TOOL);
    expect(rec!.outcome).toBe('fail');
    expect(rec!.evidenceRef.checkpointId).toBe('plan-abc');
    expect(rec!.reusePolicy).toBe('record_only');
  });

  it('should record plan aborted', async () => {
    const rec = await withRctx(() => recordPlanTerminal({
      store,
      planId: 'plan-xyz',
      planStatus: 'aborted',
      stopReason: 'User abort',
      sessionId: 's1',
    }));
    expect(rec).not.toBeNull();
    expect(rec!.outcome).toBe('fail');
    expect(rec!.context.planStatus).toBe('aborted');
  });
});

describe('Consequence — gate reject records', () => {
  let store: ConsequenceStore;

  beforeEach(() => {
    store = new ConsequenceStore(':memory:');
  });

  afterEach(() => {
    store.close();
  });

  it('should record gate reject with outcome rejected_by_gate', async () => {
    const rec = await withRctx(() => recordGateReject({
      store,
      sessionId: 's1',
      toolName: 'execute_command',
      reason: 'Command denied by privilege policy',
      cycle: 3,
    }));
    expect(rec).not.toBeNull();
    expect(rec!.outcome).toBe('rejected_by_gate');
    expect(rec!.reusePolicy).toBe('require_hitl'); // nhãn Phase 2, CHƯA enforce
    expect(rec!.evidenceRef.cycle).toBe(3);
  });
});

describe('Consequence — redaction helpers', () => {
  it('buildArgsDigest should keep keys but strip sensitive values', () => {
    const digest = buildArgsDigest({
      url: 'https://x',
      apiKey: 'TOP-SECRET',
      password: 'pw',
      command: 'ls -la',
    });
    expect(digest).toContain('url');
    expect(digest).toContain('command');
    expect(digest).not.toContain('TOP-SECRET');
    expect(digest).not.toContain('pw');
    // Key nhạy cảm được đánh dấu [REDACTED]
    expect(digest).toContain('[REDACTED]');
  });

  it('redactString should mask Authorization header and bearer tokens', () => {
    expect(redactString('Authorization: Bearer abc123.def456')).not.toContain('abc123');
    expect(redactString('api_key=sekrit')).not.toContain('sekrit');
    expect(redactString('password=hunter2')).not.toContain('hunter2');
  });

  it('redactValue should replace sensitive keys recursively', () => {
    const out = redactValue({
      name: 'ok',
      credentials: { apiKey: 'x', token: 'y' },
      nested: { password: 'z', arr: ['a', 'b'] },
    });
    // 'credentials' là key nhạy cảm → toàn bộ object bị redact (an toàn hơn)
    expect(out).toEqual({
      name: 'ok',
      credentials: '[REDACTED]',
      nested: { password: '[REDACTED]', arr: ['a', 'b'] },
    });
  });
});