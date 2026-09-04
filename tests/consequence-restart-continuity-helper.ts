/**
 * R6-C Helper — CLI entrypoint for restart continuity test.
 *
 * Process A (mode=write):  write consequence record to file-backed SQLite
 * Process B (mode=verify): restart Engine, check guard reflects persisted data
 *
 * Usage: tsx tests/consequence-restart-continuity-helper.ts <mode> <dbPath>
 *   mode    = 'write' | 'verify'
 *   dbPath  = absolute path to SQLite file
 */

import { execFileSync } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

const mode = process.argv[2] as 'write' | 'verify';
const dbPath = process.argv[3];

if (!mode || !dbPath) {
  console.error('Usage: tsx helper.ts <write|verify> <dbPath>');
  process.exit(1);
}

// ── Mode: write ────────────────────────────────────────────────────────────────
if (mode === 'write') {
  // Use ESM dynamic import for TypeScript source files
  const { ConsequenceStore } = await import('../src/core/memory/consequence-store.js');
  const { requestContext } = await import('../src/core/request-context.js');

  const store = new ConsequenceStore(dbPath);

  // Provide request context for userId stamping
  const ctx = {
    sessionId: 'restart-session',
    taskId: 'restart-task',
    evidenceLog: { items: [] },
    onPlanCreated: () => {},
    userId: 'alice',
  };

  // BLOCK_FAIL_THRESHOLD_WINDOW = 5 — write 5 records to meet block threshold
  for (let i = 0; i < 5; i++) {
    await requestContext.run(ctx, async () => {
      store.append({
        id: `restart-${Date.now()}-${i}`,
        createdAt: Date.now(),
        userId: 'alice',
        sessionId: 'restart-session',
        taskId: 'restart-task',
        context: { tags: ['tool_result'] },
        action: { toolName: 'dangerous_tool' },
        outcome: 'fail',
        evidenceRef: { cycle: 2, checkpointId: `cp-restart-${i}` },
        reusePolicy: 'block',
      });
    });
  }

  store.close();

  const result = { ok: true, toolName: 'dangerous_tool', outcome: 'fail', userId: 'alice' };
  console.log(JSON.stringify(result));
  process.exit(0);
}

// ── Mode: verify ─────────────────────────────────────────────────────────────
if (mode === 'verify') {
  const { ConsequenceStore } = await import('../src/core/memory/consequence-store.js');
  const { registerConsequenceReadPath, resolveDecision } = await import(
    '../src/core/memory/consequence-read-path.js'
  );
  const { requestContext } = await import('../src/core/request-context.js');
  const Engine = (await import('../src/core/engine/engine.js')).default;

  // Fresh store — same file path
  const store = new ConsequenceStore(dbPath);

  // Bootstrap Engine (Telegram/gateway NOT required)
  const engine = new Engine();
  await engine.init();

  // Register read path with the store
  registerConsequenceReadPath({ store });

  // Provide same userId so alice's records are accessible
  const ctx = {
    sessionId: 'restart-session',
    taskId: 'restart-task',
    evidenceLog: { items: [] },
    onPlanCreated: () => {},
    userId: 'alice',
  };

  let allowed: boolean;
  let action: string;
  let reasonCode: string;

  await requestContext.run(ctx, async () => {
    const lookup = store.findRelevantForToolCall({
      toolName: 'dangerous_tool',
      sessionId: 'restart-session',
    });

    const decision = resolveDecision(lookup, {
      toolName: 'dangerous_tool',
      blockAllowlist: ['dangerous_tool'],
      enforceBlock: true,
    });

    allowed = decision.action !== 'block';
    action = decision.action;
    reasonCode = decision.reasonCode ?? '';
  });

  store.close();

  const result = { allowed, action, reasonCode };
  console.log(JSON.stringify(result));
  process.exit(0);
}

console.error(`Unknown mode: ${mode}`);
process.exit(1);
