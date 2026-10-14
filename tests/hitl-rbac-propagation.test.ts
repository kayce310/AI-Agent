/**
 * @file tests/hitl-rbac-propagation.test.ts
 * Tests for Phase H3: Admin Identity, SQLite Persistence, and RBAC Propagation
 */

import { describe, it, expect, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import * as fs from 'fs';
import * as path from 'path';
import { UserManager } from '../src/modules/telegram/user-manager.js';
import { PrivilegeGuard, createDefaultAllowRules } from '../src/core/security/privilege-guard.js';
import { HookRegistry } from '../src/core/hooks.js';
import { requestContext } from '../src/core/request-context.js';
import type { RequestContext } from '../src/core/request-context.js';
import type { AdapterMessage, CoralRequest } from '../src/core/gateway/types.js';
import { asUserId, asConversationSessionId } from '../src/core/types/branded.js';

describe('Phase H3: Admin Identity & RBAC Propagation', () => {
  let db: Database.Database;

  beforeEach(() => {
    // Create clean in-memory SQLite database
    db = new Database(':memory:');
    delete process.env.CORAL_TELEGRAM_USERS;
  });

  describe('UserManager SQLite Persistence & Migration', () => {
    it('persists registered users to SQLite and rehydrates in new instance', () => {
      const manager1 = new UserManager(db);
      manager1.registerUser('admin_user_1', 'admin', 'kayce_admin', 'Kayce');
      manager1.registerUser('normal_user_2', 'user', 'family_member', 'Alice');

      expect(manager1.isAdmin('admin_user_1')).toBe(true);
      expect(manager1.isAdmin('normal_user_2')).toBe(false);

      // Verify row exists in SQLite table
      const rows = db.prepare('SELECT * FROM telegram_users').all() as any[];
      expect(rows.length).toBe(2);

      // Create manager2 sharing the same db — rehydrates from SQLite
      const manager2 = new UserManager(db);
      expect(manager2.isAllowed('admin_user_1')).toBe(true);
      expect(manager2.isAdmin('admin_user_1')).toBe(true);
      expect(manager2.getUser('admin_user_1')?.role).toBe('admin');
      expect(manager2.getUser('@kayce_admin')?.role).toBe('admin');
      expect(manager2.getUser('normal_user_2')?.role).toBe('user');
    });

    it('migrates legacy JSON file if SQLite table is empty', () => {
      const legacyPath = path.join(
        process.env.TEMP || process.env.TMP || '/tmp',
        'coral-users.json'
      );

      // Write mock legacy file
      fs.writeFileSync(
        legacyPath,
        JSON.stringify({
          bootstrapDone: true,
          users: {
            'legacy_admin': { userId: 'legacy_admin', role: 'admin' },
            'legacy_user': { userId: 'legacy_user', role: 'user' },
          },
        })
      );

      try {
        const manager = new UserManager(db);
        expect(manager.isAdmin('legacy_admin')).toBe(true);
        expect(manager.isAllowed('legacy_user')).toBe(true);
        expect(manager.isAdmin('legacy_user')).toBe(false);

        // Check that SQLite table was populated by migration
        const count = db.prepare('SELECT COUNT(*) as count FROM telegram_users').get() as { count: number };
        expect(count.count).toBe(2);
      } finally {
        if (fs.existsSync(legacyPath)) {
          fs.unlinkSync(legacyPath);
        }
      }
    });

    it('bootstrap sets first user as admin and persists to SQLite', () => {
      const manager = new UserManager(db);
      expect(manager.isBootstrapped()).toBe(false);

      const bootstrapped = manager.bootstrap('1001');
      expect(bootstrapped).toBe(true);
      expect(manager.isBootstrapped()).toBe(true);
      expect(manager.isAdmin('1001')).toBe(true);

      // Verify in SQLite
      const row = db.prepare('SELECT * FROM telegram_users WHERE user_id = ?').get('1001') as any;
      expect(row).toBeDefined();
      expect(row.role).toBe('admin');

      // Second bootstrap attempt is rejected
      expect(manager.bootstrap('1002')).toBe(false);
    });
  });

  describe('PrivilegeGuard Hook Integration with RequestContext RBAC', () => {
    let guard: PrivilegeGuard;
    let hooks: HookRegistry;

    beforeEach(() => {
      guard = new PrivilegeGuard({
        defaultEffect: 'deny',
        rules: createDefaultAllowRules(),
        workspaceRoot: 'D:/AI-Agent',
      });
      hooks = new HookRegistry();
      guard.attachToHooks(hooks);
    });

    it('allows admin in RequestContext to execute restricted tool write_file inside workspace', async () => {
      const adminCtx: RequestContext = {
        sessionId: 'session_1',
        taskId: 'task_1',
        userId: 'admin_1',
        userRole: 'admin',
        evidenceLog: new Map() as any,
        onPlanCreated: () => {},
      };

      await requestContext.run(adminCtx, async () => {
        const allowed = await hooks.emit('tool:call', {
          toolName: 'write_file',
          args: { path: 'src/config.json', content: '{}' },
        });
        expect(allowed).toBe(true);
      });
    });

    it('denies regular user in RequestContext from executing restricted tool write_file', async () => {
      const userCtx: RequestContext = {
        sessionId: 'session_2',
        taskId: 'task_2',
        userId: 'user_1',
        userRole: 'user',
        evidenceLog: new Map() as any,
        onPlanCreated: () => {},
      };

      await requestContext.run(userCtx, async () => {
        const allowed = await hooks.emit('tool:call', {
          toolName: 'write_file',
          args: { path: 'src/config.json', content: '{}' },
        });
        expect(allowed).toBe(false);
      });
    });

    it('denies unauthenticated / no-role caller from executing restricted tool write_file', async () => {
      const anonCtx: RequestContext = {
        sessionId: 'session_3',
        taskId: 'task_3',
        userId: 'anon',
        userRole: undefined,
        evidenceLog: new Map() as any,
        onPlanCreated: () => {},
      };

      await requestContext.run(anonCtx, async () => {
        const allowed = await hooks.emit('tool:call', {
          toolName: 'write_file',
          args: { path: 'src/config.json', content: '{}' },
        });
        expect(allowed).toBe(false);
      });
    });

    it('denies path traversal even when caller is admin (security invariant holds)', async () => {
      const adminCtx: RequestContext = {
        sessionId: 'session_1',
        taskId: 'task_1',
        userId: 'admin_1',
        userRole: 'admin',
        evidenceLog: new Map() as any,
        onPlanCreated: () => {},
      };

      await requestContext.run(adminCtx, async () => {
        const allowed = await hooks.emit('tool:call', {
          toolName: 'write_file',
          args: { path: '../../windows/system32/cmd.exe', content: 'malicious' },
        });
        expect(allowed).toBe(false);
      });
    });
  });

  describe('Gateway AdapterMessage Contract', () => {
    it('AdapterMessage conveys userRole correctly', () => {
      const msg: AdapterMessage = {
        messageId: 'msg_1',
        userId: asUserId('user_admin'),
        channelId: asUserId('chat_1'),
        text: 'hello',
        platform: 'telegram',
        userRole: 'admin',
        isMention: true,
        timestamp: Date.now(),
      };

      expect(msg.userRole).toBe('admin');

      const req: CoralRequest = {
        input: msg.text,
        userId: msg.userId,
        sessionId: asConversationSessionId('sess_1'),
        platform: msg.platform,
        userRole: msg.userRole,
      };

      expect(req.userRole).toBe('admin');
    });
  });

  describe('Correlation Token & Out-of-band Decision Channel', () => {
    it('validates correlation token on approval resolution', async () => {
      const { HITLManager } = await import('../src/core/security/hitl.js');
      const { HITLStore } = await import('../src/core/security/hitl-store.js');
      const { buildApprovalKeyboard } = await import('../src/modules/telegram/hitl-handler.js');

      const hitlManager = new HITLManager({ store: new HITLStore(db) });
      const req = hitlManager.getQueue().create(
        'requester_1',
        { type: 'tool', name: 'delete_file', description: 'delete file' },
        { ttlMs: 60000 }
      );

      expect(req.correlationToken).toBeDefined();

      // Keyboard includes token prefix in callback_data
      const keyboard = buildApprovalKeyboard(req.id, req.correlationToken);
      const approveBtn = keyboard.inline_keyboard[0][0];
      expect(approveBtn.callback_data).toContain(req.correlationToken.slice(0, 8));

      // Attempt resolve with wrong token — must fail
      const wrongTokenResult = hitlManager.resolve(req.id, 'approved', 'admin_1', {
        approverRole: 'admin',
        channel: 'telegram',
        correlationToken: 'bad_token',
      });
      expect(wrongTokenResult).toBe(false);
      expect(hitlManager.getQueue().get(req.id)?.status).toBe('pending');

      // Attempt resolve with correct token — must succeed
      const correctTokenResult = hitlManager.resolve(req.id, 'approved', 'admin_1', {
        approverRole: 'admin',
        channel: 'telegram',
        correlationToken: req.correlationToken.slice(0, 8),
      });
      expect(correctTokenResult).toBe(true);
      expect(hitlManager.getQueue().get(req.id)?.status).toBe('approved');
    });

    it('CLI channel updates HITL status atomically and writes audit record', async () => {
      const { HITLStore } = await import('../src/core/security/hitl-store.js');
      const store = new HITLStore(db);

      const { HITLManager } = await import('../src/core/security/hitl.js');
      const hitlManager = new HITLManager({ store });
      const req = hitlManager.getQueue().create(
        'requester_1',
        { type: 'tool', name: 'format_disk', description: 'format disk' },
        { ttlMs: 60000 }
      );

      // CLI performs out-of-band rejection
      const result = store.updateStatusAtomic(req.id, 'rejected', 'pending', {
        decidedBy: 'local_admin',
        approverRole: 'admin',
        channel: 'cli',
        type: 'reject',
        reason: 'Too dangerous for automated agent',
      });

      expect(result.success).toBe(true);
      const updated = store.get(req.id);
      expect(updated?.status).toBe('rejected');
      expect(updated?.decision?.channel).toBe('cli');
      expect(updated?.decision?.decidedBy).toBe('local_admin');

      // Verify audit log row in SQLite
      const auditLog = db.prepare('SELECT * FROM hitl_audit_log WHERE request_id = ?').all(req.id) as any[];
      expect(auditLog.length).toBe(1);
      expect(auditLog[0].channel).toBe('cli');
      expect(auditLog[0].decision).toBe('reject');
      expect(auditLog[0].reason).toContain('Too dangerous');
    });
  });
});
