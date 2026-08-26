/**
 * R2 §B/§5 Step5 — crash-injection CHILD process (v2).
 * Mirrors PRODUCTION wiring exactly: uses the getCheckpoint() SINGLETON and
 * DEFAULT directory resolution from cwd (like start-telegram.ts does).
 * IMPORTANT: caller must set cwd to a fixture root BEFORE spawning; dynamic
 * imports happen after chdir so DEFAULT_CONFIG picks up the fixture dirs.
 * Layout expected by scenarios: <root>/knowledge/checkpoints, <root>/knowledge/tasks
 * Usage: node scripts/r2-crash-child.mjs <scenario>
 */
const scenario = process.argv[2];

// chdir BEFORE imports so path.join(process.cwd(), 'knowledge', ...) resolves to fixture
const fixtureRoot = process.argv[3];
if (fixtureRoot) process.chdir(fixtureRoot);

const { CheckpointStore, getCheckpoint } = await import('../dist/core/checkpoint.js');
const { installCrashHandler } = await import('../dist/core/crash-handler.js');
const TaskQueue = (await import('../dist/core/task-queue.js')).default;

if (scenario === 's1-flush-on-uncaught') {
  // §A: dirty checkpoint on the SINGLETON + uncaughtException → flushSync BEFORE exit(1)
  installCrashHandler();
  const cp = getCheckpoint(); // same object the crash handler will flush
  await cp.init(); // creates <root>/knowledge/checkpoints
  cp.start('req-s1', 'sess-s1', 's1 goal');
  cp.cycle('req-s1', 1, 's1 goal', [{ id: 'tool-A', name: 'echo', args: {} }], [
    { id: 'tool-A', result: 'done' },
  ]);
  cp.markToolRunning('req-s1', 'tool-B');
  setTimeout(() => {
    throw new Error('R2-INJECTED-CRASH');
  }, 30);
} else if (scenario === 's3-no-dup-restart') {
  // §B/§D: boot AFTER crash (same fixture root) → load persisted state via singleton,
  // annotate recovery, verify Fix C active-task mapping is reused not duplicated.
  installCrashHandler();
  const cp = getCheckpoint();
  await cp.init();
  const recovered = cp.getAllInProgress();
  for (const r of recovered) cp.markRecovered(r.requestId, 'boot-after-crash');
  // R2 §B: persist recovery annotations before exit
  if (recovered.length > 0) await cp.flush();
  const existing = cp.getActiveTaskForSession('sess-s1');
  if (!existing) throw new Error('EXPECTED existing active task for sess-s1');
  if (existing !== 'req-s1') throw new Error(`UNEXPECTED active id ${existing}`);
  console.log('CHILD_RESULT=' + JSON.stringify({ existing, recovered: recovered.length }));
  process.exit(0);
} else if (scenario === 's4-bg-writer') {
  // §C writer: persist a background task in status 'running' (as if crashed mid-run)
  const tq = new TaskQueue();
  await tq.init();
  const id = tq.enqueue({ sessionId: 'sess-s4', task: 'long background job' });
  const t = tq.tasks.get(id);
  t.status = 'running';
  tq.saveToDisk(id);
  console.log('CHILD_RESULT=' + JSON.stringify({ taskId: id }));
  process.exit(0);
} else if (scenario === 's4-seed') {
  // §C setup: seed checkpoint with proven partial completion in this fixture
  const cp = getCheckpoint();
  await cp.init();
  cp.start('req-s4', 'sess-s4', 'bg goal');
  cp.cycle('req-s4', 1, 'bg goal', [{ id: 'tool-P', name: 't', args: {} }], [
    { id: 'tool-P', result: 'done' },
  ]);
  await cp.shutdown();
  console.log('CHILD_RESULT={"seeded":true}');
  process.exit(0);
} else if (scenario === 's4-bg-loader') {
  // §C loader (the "restart"): mirrors production boot ORDER —
  // checkpoint singleton init FIRST (Engine.init), then TaskQueue init.
  const cp = getCheckpoint();
  await cp.init();
  const tq = new TaskQueue();
  await tq.init();
  const tasks = Array.from(tq.listActiveTasks());
  const interrupted = tasks.filter((t) => t.status === 'interrupted');
  const requeued = tasks.filter((t) => t.status === 'queued');
  let provenCompleted = -1;
  if (interrupted.length > 0) {
    const snap = cp.getLatestForSession(interrupted[0].sessionId);
    provenCompleted = snap ? cp.getProvenCompletedToolIds(snap.requestId).size : -1;
  }
  console.log(
    'CHILD_RESULT=' +
      JSON.stringify({
        total: tasks.length,
        interrupted: interrupted.length,
        requeued: requeued.length,
        progress: interrupted[0]?.progress ?? null,
        provenCompleted,
      }),
  );
  process.exit(0);
} else {
  console.error('unknown scenario');
  process.exit(64);
}
