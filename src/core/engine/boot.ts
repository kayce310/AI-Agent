/**
 * @file boot — Boot Sequence Executor
 * @layer core
 * @depends-on src/core/memory/state-manager.ts
 * @imported-by src/core/engine/orchestrator.ts
 * @owner core-engine
 */

/**
 * Kato Agent — Boot Sequence v7.1
 *
 * Reusable boot sequence that checks snapshot recovery state,
 * unified state validity, agent lifecycle, and P0 items.
 * Designed to be called by Orchestrator before processing tasks.
 */

import { KatoStateManager } from '../memory/state-manager.js';
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { execSync } from 'node:child_process';

export interface BootResult {
  blocked: boolean;
  reason?: string;
  p0Items?: Array<{ id: string; priority: string; description: string }>;
}

/**
 * Execute the boot sequence before processing any task.
 *
 * Steps:
 *   1. Check for pending snapshots (overflow recovery).
 *   2. Read unified state from current.json (fallback to legacy files).
 *   3. If lifecycle is not READY, attempt to mark ready via CLI.
 *   4. Check for P0 tech debt items.
 *
 * @param workspaceRoot — Absolute path to the project root directory.
 * @returns BootResult indicating whether the system is blocked.
 */
export async function executeBootSequence(
  workspaceRoot: string
): Promise<BootResult> {
  // ── Step 1: Check pending snapshots ──
  const snapshotsDir = join(workspaceRoot, '.kato', 'snapshots');
  if (existsSync(snapshotsDir)) {
    const files = readdirSync(snapshotsDir);
    const pending = files.find(
      f => f.endsWith('.json') && !f.includes('_resumed')
    );
    if (pending) {
      return {
        blocked: true,
        reason: `Pending snapshot detected: ${pending}. Run 'node scripts/kato-resume.mjs --apply' to resume.`,
      };
    }
  }

  // ── Step 2: Read unified state ──
  const stateManager = new KatoStateManager();
  const current = await stateManager.readCurrentState();
  if (!current.ok) {
    return {
      blocked: true,
      reason: `Unified state not found or corrupt (${current.error.message}). Run 'kato-state-manager repair'.`,
    };
  }

  // ── Step 3: Check lifecycle ──
  if (current.data.state?.agent?.lifecycle !== 'READY') {
    try {
      execSync(
        'npx tsx src/scripts/kato-state-manager.ts ready',
        { cwd: workspaceRoot, stdio: 'pipe', timeout: 15_000 }
      );
    } catch (err: any) {
      return {
        blocked: true,
        reason: `Failed to mark agent READY: ${err.message}`,
      };
    }
  }

  // ── Step 4: Check P0 tech debt items ──
  const p0Items = (current.data.checkpoint?.techDebt?.openItems || []).filter(
    (item: { priority: string }) => item.priority === 'P0'
  );
  if (p0Items.length > 0) {
    return {
      blocked: true,
      reason: `Found ${p0Items.length} P0 tech debt item(s). Please resolve before proceeding.`,
      p0Items,
    };
  }

  return { blocked: false };
}
