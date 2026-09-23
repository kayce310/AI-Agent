/**
 * ADMIN Authorization Tests — PrivilegeGuard
 * Verify that ADMIN users can access all tools while path restrictions remain enforced.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { PrivilegeGuard, createDefaultAllowRules } from '../src/core/security/privilege-guard.js';

describe('PrivilegeGuard ADMIN Authorization', () => {
  let guard: PrivilegeGuard;

  beforeEach(() => {
    // Initialize with default deny + default allow rules (mirrors engine.ts:210-215)
    guard = new PrivilegeGuard({
      defaultEffect: 'deny',
      rules: createDefaultAllowRules(),
      workspaceRoot: 'D:/AI-Agent',
    });
  });

  describe('ADMIN network tool (web_search)', () => {
    it('ADMIN + web_search should be allowed', () => {
      const result = guard.check('web_search', undefined, { query: 'volcano' }, 'admin');
      expect(result.allowed).toBe(true);
      expect(result.reason).toBe('ADMIN: allow all tools');
    });

    it('user + web_search should be allowed (read-only network tool)', () => {
      const result = guard.check('web_search', undefined, { query: 'volcano' }, 'user');
      expect(result.allowed).toBe(true);
      expect(result.reason).toContain('Read-only web search');
    });

    it('no role + web_search should be allowed (read-only network tool)', () => {
      const result = guard.check('web_search', undefined, { query: 'volcano' });
      expect(result.allowed).toBe(true);
    });
  });

  describe('ADMIN restricted tool with path restriction', () => {
    it('ADMIN + write_file inside workspace should be allowed', () => {
      const result = guard.check(
        'write_file',
        undefined,
        { path: 'src/temp.txt' },
        'admin'
      );
      expect(result.allowed).toBe(true);
      expect(result.reason).toBe('ADMIN: allow all tools');
    });

    it('ADMIN + write_file outside workspace should be DENIED', () => {
      const result = guard.check(
        'write_file',
        undefined,
        { path: '/etc/passwd' },
        'admin'
      );
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Path traversal detected');
    });

    it('ADMIN + write_file with traversal should be DENIED', () => {
      const result = guard.check(
        'write_file',
        undefined,
        { path: '../../etc/passwd' },
        'admin'
      );
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Path traversal detected');
    });

    it('ADMIN + write_file with absolute path should be DENIED', () => {
      const result = guard.check(
        'write_file',
        undefined,
        { path: 'C:/Windows/System32/config/sam' },
        'admin'
      );
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Path traversal detected');
    });
  });

  describe('Regular user tool restrictions', () => {
    it('user + allowed tool (knowledge:search) should be allowed', () => {
      const result = guard.check('search_knowledge_graph', undefined, undefined, 'user');
      expect(result.allowed).toBe(true);
    });

    it('user + allowed tool (web_search) should be allowed', () => {
      const result = guard.check('web_search', undefined, { query: 'test' }, 'user');
      expect(result.allowed).toBe(true);
    });

    it('user + dangerous tool outside workspace should be denied', () => {
      const result = guard.check(
        'read_file',
        undefined,
        { path: '/etc/passwd' },
        'user'
      );
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Path traversal detected');
    });

    it('user + restricted tool inside workspace should be denied (not in allow list)', () => {
      const result = guard.check(
        'write_file',
        undefined,
        { path: 'src/temp.txt' },
        'user'
      );
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Default effect applied: deny');
    });
  });

  describe('Role provenance (must come from RequestContext, not user input)', () => {
    it('should not accept role from tool arguments', () => {
      // This is a security check: role must come from RequestContext (via UserManager),
      // not from tool arguments or model-generated data.
      // The check() method only accepts userRole as a parameter from the hook payload,
      // which itself comes from RequestContext. Tool args cannot inject role.
      // Use write_file (restricted tool) so we prove role injection doesn't grant access.

      const result = guard.check(
        'write_file',
        undefined,
        { path: 'src/temp.txt', userRole: 'admin' }, // attempted injection in args
        undefined // actual role is undefined
      );
      expect(result.allowed).toBe(false); // Should be denied — role injection ineffective
    });

    it('RequestContext userRole is the single source of truth', () => {
      // Correct flow: userRole comes from RequestContext (populated from UserManager)
      const resultWithAdmin = guard.check(
        'web_search',
        undefined,
        { query: 'volcano' },
        'admin' // from RequestContext.userRole, not from args
      );
      expect(resultWithAdmin.allowed).toBe(true);
    });
  });

  describe('Path validation runs BEFORE ADMIN check', () => {
    it('path violation blocks ADMIN before authorization check', () => {
      // This proves path validation is orthogonal and cannot be bypassed by ADMIN role
      const result = guard.check(
        'write_file',
        undefined,
        { path: '../../../etc/evil.txt' },
        'admin'
      );
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Path traversal detected');
      // Not "ADMIN: allow all tools", but blocked by path check first
    });
  });
});
