/**
 * @file PrivilegeGuard Tests
 * @layer tests
 */
import { describe, it, expect, beforeEach } from 'vitest';

let PrivilegeGuard: any;

beforeEach(async () => {
  const mod = await import('../src/core/security/privilege-guard.js');
  PrivilegeGuard = mod.PrivilegeGuard;
});

describe('PrivilegeGuard', () => {
  it('should be importable', () => {
    expect(PrivilegeGuard).toBeDefined();
  });

  it('should allow by default in standalone mode', () => {
    const guard = new PrivilegeGuard({ defaultEffect: 'allow' });
    const result = guard.check('read_file');
    expect(result.allowed).toBe(true);
  });

  it('should deny by default in restricted mode', () => {
    const guard = new PrivilegeGuard({ defaultEffect: 'deny' });
    const result = guard.check('read_file');
    expect(result.allowed).toBe(false);
  });

  it('should allow specific tool via rule', () => {
    const guard = new PrivilegeGuard({
      defaultEffect: 'deny',
      rules: [
        { toolPattern: 'read_file', effect: 'allow', reason: 'file access allowed' },
      ],
    });
    const result = guard.check('read_file');
    expect(result.allowed).toBe(true);
    expect(result.reason).toBe('file access allowed');
  });

  it('should deny specific tool via rule', () => {
    const guard = new PrivilegeGuard({
      defaultEffect: 'allow',
      rules: [
        { toolPattern: 'execute_command', effect: 'deny', reason: 'system blocked' },
      ],
    });
    const result = guard.check('execute_command');
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('system blocked');
  });

  it('should match glob pattern with *', () => {
    const guard = new PrivilegeGuard({
      defaultEffect: 'deny',
      rules: [
        { toolPattern: 'read_*', effect: 'allow' },
      ],
    });
    expect(guard.check('read_file').allowed).toBe(true);
    expect(guard.check('read_pdf').allowed).toBe(true);
    expect(guard.check('write_file').allowed).toBe(false);
  });

  it('should check path traversal via args', () => {
    const guard = new PrivilegeGuard({
      defaultEffect: 'allow',
      workspaceRoot: '/workspace',
    });
    const result = guard.check('read_file', [], { path: '/workspace/../../../etc/passwd' });
    expect(result.allowed).toBe(false);
  });

  it('should allow safe relative paths', () => {
    const guard = new PrivilegeGuard({
      defaultEffect: 'allow',
      workspaceRoot: '/workspace',
    });
    const result = guard.check('read_file', [], { path: 'src/file.ts' });
    expect(result.allowed).toBe(true);
  });
});
