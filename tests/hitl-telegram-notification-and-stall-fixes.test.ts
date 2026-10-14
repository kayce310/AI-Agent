/**
 * @file Tests for Telegram HITL Notification, Inline Keyboard, and Task-Stall Fixes
 * @layer tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { HITLManager } from '../src/core/security/hitl.js';
import { getHITLManager, resetHITLManager } from '../src/core/security/hitl-manager.js';
import {
  formatApprovalMessage,
  buildApprovalKeyboard,
  registerHITLCallbackHandler,
  escapeHtml,
} from '../src/modules/telegram/hitl-handler.js';
import { resolveDecision, isSafeOrchestrationOrReadTool } from '../src/core/memory/consequence-read-path.js';
import { userManager } from '../src/modules/telegram/user-manager.js';

describe('Priority 1: Telegram HITL Notification & Inline Keyboard Flow', () => {
  let hitl: HITLManager;

  beforeEach(() => {
    resetHITLManager();
    hitl = getHITLManager();
    // Register an admin in userManager for testing
    userManager.registerUser('admin_123', 'admin', 'adminuser', 'Admin');
    userManager.registerUser('regular_456', 'user', 'regularuser', 'Regular');
  });

  afterEach(() => {
    hitl.getQueue().cleanup();
    resetHITLManager();
    userManager.unregisterUser('admin_123');
    userManager.unregisterUser('regular_456');
    vi.restoreAllMocks();
  });

  it('1. formatApprovalMessage produces valid HTML containing action name, description, user, and requestId', () => {
    const req = hitl.getQueue().create('admin_123', {
      type: 'tool_call',
      name: 'update_plan',
      args: {},
      description: 'Cập nhật kế hoạch thực thi',
    }, {
      triggerReason: 'Thao tác cần duyệt',
      correlation: { sessionId: 'sess-1' },
    });

    const msg = formatApprovalMessage(req);
    expect(msg).toContain('<b>⛔ YÊU CẦU PHÊ DUYỆT (HITL)</b>');
    expect(msg).toContain('<code>update_plan</code>');
    expect(msg).toContain('Cập nhật kế hoạch thực thi');
    expect(msg).toContain(req.id);
    expect(msg).toContain('admin_123');
    expect(msg).toContain('Thao tác cần duyệt');
  });

  it('2. buildApprovalKeyboard creates inline keyboard with Approve and Reject buttons linking requestId and token', () => {
    const kb = buildApprovalKeyboard('hitl:12345:1', 'secrettoken999');
    expect(kb.inline_keyboard).toBeDefined();
    expect(kb.inline_keyboard).toHaveLength(1);
    const row = kb.inline_keyboard[0];
    expect(row).toHaveLength(2);

    expect(row[0].text).toContain('Approve');
    expect(row[0].callback_data).toBe('hitl:approve:secretto:hitl:12345:1');

    expect(row[1].text).toContain('Reject');
    expect(row[1].callback_data).toBe('hitl:reject:secretto:hitl:12345:1');
  });

  it('3. Admin callback Approve resolves request and updates UI state', async () => {
    let callbackHandler: ((ctx: any) => Promise<void>) | null = null;
    const mockBot = {
      on: vi.fn((event: string, handler: any) => {
        if (event === 'callback_query:data') {
          callbackHandler = handler;
        }
      }),
    };

    registerHITLCallbackHandler(mockBot as any, hitl);
    expect(callbackHandler).not.toBeNull();

    // Create a pending request
    const checkPromise = hitl.checkAndRequest(
      { type: 'tool_call', name: 'execute_command', args: {}, description: 'Chạy lệnh nguy hiểm' },
      { userId: 'admin_123', forceHITL: true },
    );

    const pending = hitl.getQueue().getPending();
    expect(pending).toHaveLength(1);
    const req = pending[0];
    const token8 = req.correlationToken?.slice(0, 8);

    let answeredText = '';
    let editedMessageText = '';
    let editedReplyMarkup: any = null;

    const mockCtx = {
      callbackQuery: {
        data: `hitl:approve:${token8}:${req.id}`,
        from: { id: 'admin_123', username: 'adminuser' },
        message: { message_id: 101 },
      },
      answerCallbackQuery: vi.fn(async (opts: any) => { answeredText = opts.text; }),
      deleteMessage: vi.fn(async () => true),
      editMessageReplyMarkup: vi.fn(),
    };

    await callbackHandler!(mockCtx);

    const status = await checkPromise;
    expect(status).toBe('approved');
    expect(mockCtx.answerCallbackQuery).toHaveBeenCalled();
    expect(mockCtx.deleteMessage).toHaveBeenCalled();
    expect(answeredText).toContain('execute_command');
  });

  it('4. Non-admin user callback is denied with alert and does NOT resolve request', async () => {
    let callbackHandler: ((ctx: any) => Promise<void>) | null = null;
    const mockBot = {
      on: vi.fn((event: string, handler: any) => {
        if (event === 'callback_query:data') callbackHandler = handler;
      }),
    };

    registerHITLCallbackHandler(mockBot as any, hitl);

    let resolved = false;
    const checkPromise = hitl.checkAndRequest(
      { type: 'tool_call', name: 'execute_command', args: {}, description: 'test' },
      { userId: 'admin_123', forceHITL: true },
    ).then((res) => { resolved = true; return res; });

    const req = hitl.getQueue().getPending()[0];
    const token8 = req.correlationToken?.slice(0, 8);

    const mockCtx = {
      callbackQuery: {
        data: `hitl:approve:${token8}:${req.id}`,
        from: { id: 'regular_456', username: 'regularuser' }, // NOT ADMIN
        message: { message_id: 101 },
      },
      answerCallbackQuery: vi.fn(),
      editMessageText: vi.fn(),
      editMessageReplyMarkup: vi.fn(),
    };

    await callbackHandler!(mockCtx);

    expect(mockCtx.answerCallbackQuery).toHaveBeenCalledWith(expect.objectContaining({
      show_alert: true,
      text: expect.stringContaining('Bạn không có quyền'),
    }));
    expect(resolved).toBe(false); // Request is still pending
    expect(req.status).toBe('pending');

    // Clean up
    hitl.cancel(req.id);
    await checkPromise;
  });

  it('5. Callback with wrong token cannot resolve request', async () => {
    let callbackHandler: ((ctx: any) => Promise<void>) | null = null;
    const mockBot = {
      on: vi.fn((event: string, handler: any) => {
        if (event === 'callback_query:data') callbackHandler = handler;
      }),
    };

    registerHITLCallbackHandler(mockBot as any, hitl);

    const checkPromise = hitl.checkAndRequest(
      { type: 'tool_call', name: 'execute_command', args: {}, description: 'test' },
      { userId: 'admin_123', forceHITL: true },
    );

    const req = hitl.getQueue().getPending()[0];

    const mockCtx = {
      callbackQuery: {
        data: `hitl:approve:WRONGTOK:${req.id}`, // INVALID TOKEN
        from: { id: 'admin_123', username: 'adminuser' },
        message: { message_id: 101 },
      },
      answerCallbackQuery: vi.fn(),
      editMessageText: vi.fn(),
      editMessageReplyMarkup: vi.fn(),
    };

    await callbackHandler!(mockCtx);

    expect(mockCtx.answerCallbackQuery).toHaveBeenCalledWith(expect.objectContaining({
      show_alert: true,
      text: expect.stringContaining('Yêu cầu đã được quyết định, đã hết hạn hoặc token không hợp lệ'),
    }));
    expect(req.status).toBe('pending'); // Still pending

    // Clean up
    hitl.cancel(req.id);
    await checkPromise;
  });

  it('6. Notification delivery failure immediately cancels and rejects request instead of waiting TTL', async () => {
    hitl.onPending = vi.fn(async () => {
      throw new Error('Telegram bot network unreachable');
    });

    const status = await hitl.checkAndRequest(
      { type: 'tool_call', name: 'execute_command', args: {}, description: 'test' },
      { userId: 'admin_123', forceHITL: true },
    );

    expect(status).toBe('rejected');
    expect(hitl.getQueue().getPending()).toHaveLength(0);
  });
});

describe('Priority 2: Task-Stall Fixes', () => {
  beforeEach(() => {
    resetHITLManager();
  });

  afterEach(() => {
    resetHITLManager();
    vi.restoreAllMocks();
  });

  it('1. isSafeOrchestrationOrReadTool correctly classifies orchestration and read tools as safe', () => {
    expect(isSafeOrchestrationOrReadTool('update_plan')).toBe(true);
    expect(isSafeOrchestrationOrReadTool('manage_plan')).toBe(true);
    expect(isSafeOrchestrationOrReadTool('read_file')).toBe(true);
    expect(isSafeOrchestrationOrReadTool('list_directory')).toBe(true);
    expect(isSafeOrchestrationOrReadTool('search_files')).toBe(true);
    expect(isSafeOrchestrationOrReadTool('grep_search')).toBe(true);
    expect(isSafeOrchestrationOrReadTool('memory_search')).toBe(true);
    expect(isSafeOrchestrationOrReadTool('web_search')).toBe(true);

    // Destructive or modifying tools are NOT safe
    expect(isSafeOrchestrationOrReadTool('execute_command')).toBe(false);
    expect(isSafeOrchestrationOrReadTool('write_file')).toBe(false);
    expect(isSafeOrchestrationOrReadTool('delete_file')).toBe(false);
    expect(isSafeOrchestrationOrReadTool('deploy')).toBe(false);
  });

  it('2. update_plan with high historical failCountWindow is NOT escalated to require_hitl, but returns suggest', () => {
    const decision = resolveDecision(
      {
        maxPolicy: 'record_only',
        failCountSession: 0,
        failCountWindow: 32, // 32 historical fails
        evidenceIds: ['ev-1', 'ev-2'],
      },
      { toolName: 'update_plan', hitlFailThresholdWindow: 3 },
    );

    // Must NOT be require_hitl
    expect(decision.action).toBe('suggest');
    expect(decision.reasonCode).toBe('consequence_suggest_safe_tool');
  });

  it('3. read_file with high historical failCountWindow is NOT escalated to require_hitl, but returns suggest', () => {
    const decision = resolveDecision(
      {
        maxPolicy: 'record_only',
        failCountSession: 1,
        failCountWindow: 16, // 16 historical fails
        evidenceIds: ['ev-1'],
      },
      { toolName: 'read_file', hitlFailThresholdWindow: 3 },
    );

    expect(decision.action).toBe('suggest');
    expect(decision.reasonCode).toBe('consequence_suggest_safe_tool');
  });

  it('4. Destructive tool execute_command WITH failCountWindow >= threshold DOES escalate to require_hitl', () => {
    const decision = resolveDecision(
      {
        maxPolicy: 'record_only',
        failCountSession: 0,
        failCountWindow: 5,
        evidenceIds: ['ev-1'],
      },
      { toolName: 'execute_command', hitlFailThresholdWindow: 3 },
    );

    expect(decision.action).toBe('require_hitl');
    expect(decision.reasonCode).toBe('consequence_require_hitl_window');
  });

  it('5. Pending HITL Promise is released immediately when AbortSignal fires', async () => {
    const hitl = getHITLManager();
    const abortController = new AbortController();

    const checkPromise = hitl.checkAndRequest(
      { type: 'tool_call', name: 'execute_command', args: {}, description: 'test' },
      { userId: 'admin_123', forceHITL: true, signal: abortController.signal },
    );

    expect(hitl.getQueue().getPending()).toHaveLength(1);

    // Abort execution
    abortController.abort(new Error('Operation cancelled by timeout'));

    const status = await checkPromise;
    expect(status).toBe('cancelled');
    expect(hitl.getQueue().getPending()).toHaveLength(0);
  });

  it('6. Concurrent requests on different controllers do not cancel each other', async () => {
    const hitl = getHITLManager();
    const ctrl1 = new AbortController();
    const ctrl2 = new AbortController();

    const p1 = hitl.checkAndRequest(
      { type: 'tool_call', name: 'execute_command', args: {}, description: 'p1' },
      { userId: 'admin_123', forceHITL: true, signal: ctrl1.signal },
    );

    const p2 = hitl.checkAndRequest(
      { type: 'tool_call', name: 'execute_command', args: {}, description: 'p2' },
      { userId: 'admin_123', forceHITL: true, signal: ctrl2.signal },
    );

    const pending = hitl.getQueue().getPending();
    expect(pending).toHaveLength(2);

    // Abort only ctrl1
    ctrl1.abort();

    const res1 = await p1;
    expect(res1).toBe('cancelled');

    // p2 is still pending
    expect(hitl.getQueue().getPending()).toHaveLength(1);
    expect(hitl.getQueue().getPending()[0].action.description).toBe('p2');

    // Clean up p2
    ctrl2.abort();
    const res2 = await p2;
    expect(res2).toBe('cancelled');
  });
});
