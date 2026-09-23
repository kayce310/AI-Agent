/**
 * Evidence Rehydration Helper — CLI entrypoint for rehydration test.
 *
 * Process A (mode=write):
 *   1. Create PlanItem with UUID
 *   2. Record evidence via CheckpointStore.setEvidence()
 *   3. Persist checkpoint to disk
 *   4. Output result via stdout
 *
 * Process B (mode=verify):
 *   1. Fresh Engine init (simulates process restart)
 *   2. Restore checkpoint from disk
 *   3. Verify RequestContext.evidenceLog is populated
 *   4. Verify canCompleteItem() recognizes the evidence
 */
import { execFileSync } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

const mode = process.argv[2] as 'write' | 'verify';
const checkpointDir = process.argv[3];

if (!mode || !checkpointDir) {
  console.error('Usage: tsx helper.ts <write|verify> <checkpointDir>');
  process.exit(1);
}

// ── Mode: write ────────────────────────────────────────────────────────────────
if (mode === 'write') {
  const { CheckpointStore } = await import('../src/core/checkpoint.js');
  const { TaskPlan, PlanItem, PlanItemStatus } = await import('../src/core/plan/types.js');

  const store = new CheckpointStore({ checkpointDir });
  await store.init();

  const sessionId = 'evidence-rehydration-session';
  const requestId = 'evidence-rehydration-request';

  // Create a PlanItem with UUID
  const planItemId = 'plan-item-' + crypto.randomUUID();
  const planItem: PlanItem = {
    id: planItemId,
    index: 0,
    description: 'Test evidence rehydration',
    status: 'in_progress' as PlanItemStatus,
    consecutiveFailedAttempts: 0,
    criteria: [],
  };

  const taskPlan: TaskPlan = {
    id: 'plan-' + crypto.randomUUID(),
    sessionId,
    requestId,
    goal: 'Test evidence rehydration across restart',
    items: [planItem],
    status: 'running' as any,
    currentItemIndex: 0,
    createdAt: Date.now(),
    abandonAfterMs: 2 * 60 * 60 * 1000,
  };

  // Start checkpoint
  store.start(requestId, sessionId, taskPlan.goal);

  // Save plan
  store.setPlan(sessionId, taskPlan);

  // Record evidence for the plan item
  const evidenceRecord = {
    toolName: 'test_tool',
    timestamp: Date.now(),
    success: true,
  };
  store.setEvidence(planItemId, evidenceRecord);

  // Flush to disk (simulating process termination)
  await store.flush();
  await store.shutdown();

  const result = {
    ok: true,
    planItemId,
    sessionId,
    evidenceToolName: evidenceRecord.toolName,
  };
  console.log(JSON.stringify(result));
  process.exit(0);
}

// ── Mode: verify ───────────────────────────────────────────────────────────────
if (mode === 'verify') {
  const { CheckpointStore } = await import('../src/core/checkpoint.js');
  const { canCompleteItem } = await import('../src/core/plan/plan-state.js');

  // Create a fresh CheckpointStore with the test directory (not the singleton)
  const checkpointStore = new CheckpointStore({ checkpointDir });
  await checkpointStore.init();

  const sessionId = 'evidence-rehydration-session';

  // Get restored plan from checkpoint
  const restoredPlan = checkpointStore.getPlan(sessionId);
  const restoredItem = restoredPlan?.items[0];

  // Simulate what processInner() does: create RequestContext and rehydrate evidence
  const rctxEvidenceLog = new Map();
  const restoredCheckpoint = checkpointStore.getLatestForSession(sessionId);

  if (restoredCheckpoint?.evidenceLog) {
    for (const [itemId, records] of Object.entries(restoredCheckpoint.evidenceLog)) {
      rctxEvidenceLog.set(itemId, records as any);
    }
  }

  // Verify canCompleteItem with the rehydrated evidence log
  const canCompleteResult = canCompleteItem(rctxEvidenceLog, restoredItem?.id ?? '');

  await checkpointStore.shutdown();

  const result = {
    ok: true,
    restoredPlanItemId: restoredItem?.id,
    evidenceLogSize: rctxEvidenceLog.size,
    hasEvidenceForItem: rctxEvidenceLog.has(restoredItem?.id ?? ''),
    canCompleteOk: canCompleteResult.ok,
    canCompleteReason: canCompleteResult.reason,
  };
  console.log(JSON.stringify(result));
  process.exit(0);
}

console.error(`Unknown mode: ${mode}`);
process.exit(1);