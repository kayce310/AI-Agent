/**
 * @file verify-architecture-tool.test.ts — Verify Lớp 2: load_architecture_rules
 * @layer tests
 *
 * Kiểm tra tool load_architecture_rules được auto-register qua AST scanner
 * và trả về nội dung ADR-000 từ file gốc.
 */
import { describe, it, expect } from 'vitest';
import { getDefaultRegistry } from '../src/core/tools/tool-registry.js';
import { readFileSync } from 'fs';
import * as path from 'path';

describe('Lớp 2 — load_architecture_rules tool', () => {
  it('should be registered in the default registry', async () => {
    const registry = await getDefaultRegistry();
    const tools = registry.listTools();
    expect(tools).toContain('load_architecture_rules');
  });

  it('should return full ADR-000 content from the source file', async () => {
    const registry = await getDefaultRegistry();
    const result = await registry.execute('load_architecture_rules', { scope: 'state' });
    expect(result).toBeTruthy();
    expect(result.content).toContain('ADR-000');
    expect(result.content).toContain('Một state, một nguồn sự thật');
    // Không được chứa nội dung CORAL.md khi scope=state
    expect(result.content).not.toContain('Bootloader');
  });

  it('should return CORAL.md pointer when scope=coralmd', async () => {
    const registry = await getDefaultRegistry();
    const result = await registry.execute('load_architecture_rules', { scope: 'coralmd' });
    expect(result.content).toContain('CORAL.md');
  });

  it('should not derive plan state (enforcement only — read only)', async () => {
    const adrContent = readFileSync(
      path.join(process.cwd(), 'docs/adr/ADR-000-state-principles.md'),
      'utf8',
    );
    expect(adrContent).toContain('derivePlanState');
    // Single source of truth vẫn nằm ở plan-state.ts
    const planStateSrc = readFileSync(
      path.join(process.cwd(), 'src/core/plan/plan-state.ts'),
      'utf8',
    );
    expect(planStateSrc).toContain('export function derivePlanState');
  });
});
