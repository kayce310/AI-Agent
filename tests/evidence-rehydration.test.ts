/**
 * Evidence Rehydration Test — verifies persisted evidence is restored to RequestContext after restart.
 *
 * Process A:
 *   1. Create a CheckpointStore and persist a checkpoint with PlanItem + evidence
 *   2. Exit
 *
 * Process B:
 *   3. Fresh Engine init (same storage path) → should restore checkpoint
 *   4. Verify RequestContext.evidenceLog is populated from restored checkpoint
 *   5. Verify canCompleteItem() recognizes the evidence
 */
import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import { execFileSync } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

const REPO = path.resolve(__dirname, '..');
const HELPER = path.join(REPO, 'tests', 'evidence-rehydration-helper.ts');
const CHECKPOINT_DIR = path.join(REPO, 'knowledge', 'evidence-rehydration-test-checkpoints');

interface WriteResult {
  ok: boolean;
  planItemId: string;
  sessionId: string;
  evidenceToolName: string;
}

interface VerifyResult {
  ok: boolean;
  restoredPlanItemId: string;
  evidenceLogSize: number;
  hasEvidenceForItem: boolean;
  canCompleteOk: boolean;
  canCompleteReason?: string;
}

function runChild(mode: 'write' | 'verify', checkpointDir: string): WriteResult | VerifyResult {
  const stdout = execFileSync(
    process.execPath,
    [path.join(REPO, 'node_modules', 'tsx', 'dist', 'cli.mjs'), HELPER, mode, checkpointDir],
    { cwd: REPO, encoding: 'utf8', timeout: 60_000, stdio: ['ignore', 'pipe', 'pipe'] },
  );
  return JSON.parse(stdout.trim().split('\n').pop() ?? '{}') as WriteResult | VerifyResult;
}

describe('Evidence Rehydration — persistence across real process restart', () => {
  let writeResult: WriteResult;
  let verifyResult: VerifyResult;

  beforeAll(() => {
    // Clean up any stale checkpoint files
    if (fs.existsSync(CHECKPOINT_DIR)) {
      for (const file of fs.readdirSync(CHECKPOINT_DIR)) {
        try { fs.unlinkSync(path.join(CHECKPOINT_DIR, file)); } catch { /* not exists */ }
      }
    } else {
      fs.mkdirSync(CHECKPOINT_DIR, { recursive: true });
    }

    // Process A: create PlanItem, record evidence, persist, terminate
    writeResult = runChild('write', CHECKPOINT_DIR) as WriteResult;

    // Process B: fresh Engine init → verify RequestContext evidence is restored
    verifyResult = runChild('verify', CHECKPOINT_DIR) as VerifyResult;
  });

  afterAll(() => {
    // Clean up temp checkpoint directory
    if (fs.existsSync(CHECKPOINT_DIR)) {
      for (const file of fs.readdirSync(CHECKPOINT_DIR)) {
        try { fs.unlinkSync(path.join(CHECKPOINT_DIR, file)); } catch { /* not exists */ }
      }
      try { fs.rmdirSync(CHECKPOINT_DIR); } catch { /* ignore */ }
    }
  });

  it('Process A: creates PlanItem with UUID, records evidence, persists successfully', () => {
    expect(writeResult.ok).toBe(true);
    expect(writeResult.planItemId).toBeDefined();
    expect(writeResult.planItemId).toMatch(/^plan-item-/);
    expect(writeResult.evidenceToolName).toBe('test_tool');
  });

  it('Process B: restores PlanItem with SAME UUID after restart', () => {
    expect(verifyResult.ok).toBe(true);
    expect(verifyResult.restoredPlanItemId).toBe(writeResult.planItemId);
  });

  it('Process B: RequestContext.evidenceLog contains restored evidence', () => {
    expect(verifyResult.evidenceLogSize).toBe(1);
    expect(verifyResult.hasEvidenceForItem).toBe(true);
  });

  it('Process B: canCompleteItem() recognizes restored evidence', () => {
    expect(verifyResult.canCompleteOk).toBe(true);
    expect(verifyResult.canCompleteReason).toBeUndefined();
  });
});