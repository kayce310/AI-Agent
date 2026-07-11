/**
 * Runtime instrumentation — lightweight state-transition logger.
 * Logs EVERY state change as a JSON line to STATE_LOG_FILE.
 * NOT removed by any production guard — designed to be removed when investigation is complete.
 *
 * Usage: import { R } from './runtime-instrumentation.js';
 *        R.state({ event: 'CALL_MODEL', requestId, cycle });
 *        R.waitBegin({ ... });
 *        R.waitEnd({ ... });
 *
 * Output: /tmp/coral-state-log.ndjson  (recreated each run)
 */

import * as fs from 'fs';
import * as path from 'path';

const LOG_FILE = 'D:/hermes/coral-runtime-log.ndjson';

// Clear on first import
let initialized = false;
function init() {
  if (initialized) return;
  try { fs.writeFileSync(LOG_FILE, ''); } catch {}
  initialized = true;
}

// In-memory buffer for elapsed tracking
const _requestStart = new Map<string, number>();
const _cycleStart = new Map<string, number>();
const _waitStart = new Map<string, { requestId: string; at: string; label: string; _ts: number }>();

function now(): number { return Date.now(); }
function ts(): string { return new Date().toISOString(); }

function write(entry: Record<string, any>): void {
  init();
  entry._ts = now();
  try {
    fs.appendFileSync(LOG_FILE, JSON.stringify(entry) + '\n', 'utf8');
  } catch {
    // silent — don't break production if /tmp is unwritable
  }
}

export const R = {
  /** Log a state transition */
  state(opts: {
    event: string;
    requestId?: string;
    taskId?: string;
    cycle?: number;
    finishReason?: string;
    toolCallsCount?: number;
    error?: string;
    finalContent?: string;
    content?: string;
  }) {
    const elapsed = opts.requestId && _requestStart.has(opts.requestId)
      ? now() - _requestStart.get(opts.requestId)!
      : undefined;
    const cycleElapsed = opts.requestId && opts.cycle !== undefined && _cycleStart.has(`${opts.requestId}:${opts.cycle}`)
      ? now() - _cycleStart.get(`${opts.requestId}:${opts.cycle}`)!
      : undefined;
    write({
      type: 'state',
      event: opts.event,
      requestId: opts.requestId,
      taskId: opts.taskId,
      cycle: opts.cycle,
      cycleElapsedMs: cycleElapsed,
      elapsedMs: elapsed,
      finishReason: opts.finishReason,
      toolCallsCount: opts.toolCallsCount,
      error: opts.error,
      ts: ts(),
    });
  },

  /** Set the request start time — call once on RECEIVED */
  startRequest(requestId: string) {
    _requestStart.set(requestId, now());
  },

  /** Mark cycle start for elapsed tracking */
  startCycle(requestId: string, cycle: number) {
    _cycleStart.set(`${requestId}:${cycle}`, now());
  },

  /** Record a wait.begin event */
  waitBegin(opts: {
    requestId?: string;
    taskId?: string;
    label: string;       // what we're waiting for
    callerFile?: string;
    callerLine?: number;
  }) {
    const id = `${opts.requestId || '?'}:${opts.label}`;
    _waitStart.set(id, { requestId: opts.requestId || '?', at: opts.label, label: opts.label, _ts: now() });
    write({
      type: 'wait',
      event: 'WAIT_BEGIN',
      requestId: opts.requestId,
      taskId: opts.taskId,
      label: opts.label,
      callerFile: opts.callerFile,
      callerLine: opts.callerLine,
      ts: ts(),
    });
  },

  /** Record a wait.end event */
  waitEnd(opts: {
    requestId?: string;
    taskId?: string;
    label: string;
    callerFile?: string;
    callerLine?: number;
  }) {
    const id = `${opts.requestId || '?'}:${opts.label}`;
    const startInfo = _waitStart.get(id);
    const elapsed = startInfo ? now() - _waitStart.get(id)!._ts! : undefined;
    _waitStart.delete(id);
    write({
      type: 'wait',
      event: 'WAIT_END',
      requestId: opts.requestId,
      taskId: opts.taskId,
      label: opts.label,
      elapsedMs: elapsed,
      callerFile: opts.callerFile,
      callerLine: opts.callerLine,
      ts: ts(),
    });
  },

  /** Log a tool call detail */
  toolCall(opts: {
    requestId?: string;
    cycle?: number;
    toolName: string;
    toolCallId?: string;
    rawArgs?: string;
    parsedArgsCount?: number;
    status: 'BEFORE_PARSE' | 'AFTER_PARSE' | 'BEFORE_EXECUTE' | 'AFTER_EXECUTE' | 'ERROR';
    error?: string;
  }) {
    write({
      type: 'toolcall',
      event: `TOOLCALL_${opts.status}`,
      requestId: opts.requestId,
      cycle: opts.cycle,
      toolName: opts.toolName,
      toolCallId: opts.toolCallId,
      rawArgs: opts.rawArgs,
      parsedArgsCount: opts.parsedArgsCount,
      error: opts.error,
      ts: ts(),
    });
  },

  /** Session lock event */
  sessionLock(opts: {
    event: 'LOCK_ACQUIRE' | 'LOCK_ACQUIRED' | 'LOCK_RELEASE';
    userId?: string;
  }) {
    write({
      type: 'session',
      event: opts.event,
      userId: opts.userId,
      ts: ts(),
    });
  },

  /** PendingRequest lifecycle */
  pendingReq(opts: {
    event: 'CREATE' | 'DELETE' | 'STALE_CLEANUP' | 'COALESCE';
    cacheKey?: string;
  }) {
    write({
      type: 'pending',
      event: opts.event,
      cacheKey: opts.cacheKey,
      ts: ts(),
    });
  },

  /** Provider request/response metadata */
  providerCall(opts: {
    event: 'PROVIDER_REQUEST' | 'PROVIDER_RESPONSE' | 'PROVIDER_ERROR';
    requestId?: string;
    provider?: string;
    model?: string;
    durationMs?: number;
    inputTokens?: number;
    outputTokens?: number;
    error?: string;
  }) {
    write({
      type: 'provider',
      event: opts.event,
      requestId: opts.requestId,
      provider: opts.provider,
      model: opts.model,
      durationMs: opts.durationMs,
      inputTokens: opts.inputTokens,
      outputTokens: opts.outputTokens,
      error: opts.error,
      ts: ts(),
    });
  },

  /** Final event — raw tool_calls dump before/after parser */
  rawToolCalls(opts: {
    requestId?: string;
    cycle?: number;
    raw: string;         // JSON.stringify of raw tool calls from model
    status: 'RAW_FROM_MODEL' | 'AFTER_PARSER' | 'TOOL_RESULT';
  }) {
    write({
      type: 'raw',
      event: opts.status,
      requestId: opts.requestId,
      cycle: opts.cycle,
      raw: opts.raw,
      ts: ts(),
    });
  },

  /** Write a generic meta line */
  meta(opts: Record<string, any>) {
    write({ type: 'meta', ...opts, ts: ts() });
  },
};
