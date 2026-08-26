// R1-F.2 evidence runner — behavioral tests against the REAL built module
// (dist/core/tools/process.js) exercising REAL OS processes on Windows.
// Every assertion decides PASS/FAIL. No mocks for liveness — tasklist is the oracle.
// Pre-kill liveness is a REQUIRED precondition in every test (guards against
// spurious passes from processes that died early for unrelated reasons).
const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');

const DIR = __dirname;
const ROOT = path.resolve(DIR, '..', '..', '..');
const MOD = path.join(ROOT, 'dist', 'core', 'tools', 'process.js');

const RAW = [];
const _log = console.log.bind(console);
console.log = (...a) => { const s = a.map(x => typeof x === 'string' ? x : JSON.stringify(x)).join(' '); RAW.push(s); _log(s); };
const writeJson = (n, o) => fs.writeFileSync(path.join(DIR, n), JSON.stringify(o, null, 2));
const sleep = ms => new Promise(r => setTimeout(r, ms));

// ── fixture: CommonJS (.cjs — repo package.json has "type":"module") worker ──
// Writes its own PID to argv[2], then sleeps forever.
const FIXTURE = path.join(DIR, 'fixture-sleeper.cjs');
fs.writeFileSync(FIXTURE, [
  '// R1-F.2 evidence fixture: write own PID to argv[2], then sleep forever',
  "const fs = require('fs');",
  "try { fs.writeFileSync(process.argv[2], String(process.pid)); } catch (e) {}",
  'setInterval(() => {}, 60000000);',
  ''
].join('\n'));

// ── OS-level liveness oracle ──
function osAlive(pid) {
  return new Promise(res => {
    execFile('tasklist', ['/FI', `PID eq ${pid}`, '/FO', 'CSV', '/NH'],
      { windowsHide: true, timeout: 10000 }, (err, so) => {
        if (err) return res(false);
        const out = String(so);
        res(!/INFO:\s*No tasks/i.test(out) && new RegExp(`"${pid}"`).test(out));
      });
  });
}
async function waitForGone(pid, timeoutMs = 10000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    if (!(await osAlive(pid))) return Date.now() - t0;
    await sleep(250);
  }
  return -1; // still alive
}
function forceKill(pid) {
  return new Promise(res => {
    execFile('taskkill', ['/F', '/PID', String(pid)], { windowsHide: true, timeout: 10000 },
      () => res());
  });
}

async function gitInfo() {
  const g = c => new Promise(r => execFile('git', c.split(' '), { cwd: ROOT }, (e, so) => r(e ? 'unknown' : String(so).trim())));
  return { timestamp: new Date().toISOString(), branch: await g('branch --show-current'),
    head: await g('rev-parse HEAD'), status_short: await g('status --porcelain').then(s => s.split('\n').filter(l => /process\.ts|process\.js/.test(l))), log3: await g('log --oneline -3') };
}

// Start a sleeper session via the PRODUCTION plugin path (shell:true -> cmd.exe
// root R tracked by the module; worker node W records its own pid to a file).
// Throws unless BOTH root and worker are verified alive before returning.
async function startSleeper(plugin, tag) {
  const pidFile = path.join(DIR, `.${tag}.worker.pid`);
  try { fs.unlinkSync(pidFile); } catch {}
  const startFn = plugin.default.tools.find(t => t.name === 'process_start').execute;
  const r = startFn({ command: `node "${FIXTURE}" "${pidFile}"`, timeout: 120000 });
  if (r.error || !r.session_id) throw new Error(`startSleeper failed: ${JSON.stringify(r)}`);
  let worker = null;
  for (let i = 0; i < 25 && worker === null; i++) {
    await sleep(200);
    try { worker = parseInt(fs.readFileSync(pidFile, 'utf8').trim(), 10); } catch {}
  }
  if (!worker) throw new Error(`startSleeper(${tag}): fixture never registered its PID — process died at startup`);
  const [rootAlive, workerAlive] = [await osAlive(r.pid), await osAlive(worker)];
  if (!rootAlive || !workerAlive) throw new Error(`startSleeper(${tag}): precondition failed rootAlive=${rootAlive} workerAlive=${workerAlive}`);
  return {
    session_id: r.session_id, rootPid: r.pid, workerPid: worker,
    killFn: plugin.default.tools.find(t => t.name === 'process_kill').execute,
    pollFn: plugin.default.tools.find(t => t.name === 'process_poll').execute,
  };
}

(async () => {
  writeJson('environment.json', { timestamp: new Date().toISOString(), platform: process.platform,
    node: process.version, moduleUnderTest: MOD, gracePeriodMs: require(MOD).KILL_GRACE_PERIOD_MS });
  writeJson('git-info.json', await gitInfo());

  const plugin = require(MOD);
  const results = {};
  const cleanupPids = new Set();

  const record = (name, passed, details) => {
    results[name] = { passed: !!passed, ...details };
    console.log(`RESULT ${name}: ${passed ? 'PASS' : 'FAIL'}`);
    return !!passed;
  };

  // ════ T1: regression — process_kill without signal keeps default SIGTERM ════
  try {
    console.log('\n===== T1 default-signal-regression =====');
    const s = await startSleeper(plugin, 't1');
    cleanupPids.add(s.workerPid);
    const r = s.killFn({ session_id: s.session_id });            // NO signal arg
    const postPoll = s.pollFn({ session_id: s.session_id });     // immediate-delete semantics
    const goneMs = await waitForGone(s.rootPid);
    record('T1-default-signal-regression',
      r.success === true && r.signal === 'SIGTERM' && !r.error && r.grace_period_ms === 5000
        && postPoll.error !== undefined
        && goneMs >= 0 && goneMs <= 3000,
      { response: r, rootPid: s.rootPid, workerPid: s.workerPid,
        pollAfterKill: postPoll.error ?? 'still-tracked', rootGoneMs: goneMs,
        note: 'pre-kill aliveness enforced by startSleeper; worker survival expected (mechanism 1 = direct child only)' });
    await forceKill(s.workerPid);
  } catch (e) { record('T1-default-signal-regression', false, { setupError: String(e.message || e) }); }

  // ════ T2: explicit SIGKILL ════
  try {
    console.log('\n===== T2 explicit-SIGKILL =====');
    const s = await startSleeper(plugin, 't2');
    cleanupPids.add(s.workerPid);
    const r = s.killFn({ session_id: s.session_id, signal: 'SIGKILL' });
    const goneMs = await waitForGone(s.rootPid);
    record('T2-explicit-SIGKILL',
      r.success === true && r.signal === 'SIGKILL' && r.grace_period_ms === null && goneMs >= 0 && goneMs <= 3000,
      { response: r, rootGoneMs: goneMs });
    await forceKill(s.workerPid);
  } catch (e) { record('T2-explicit-SIGKILL', false, { setupError: String(e.message || e) }); }

  // ════ T3: invalid signal rejected WITHOUT killing ════
  try {
    console.log('\n===== T3 invalid-signal-rejected-no-kill =====');
    const s = await startSleeper(plugin, 't3');                  // aliveness pre-verified
    const r = s.killFn({ session_id: s.session_id, signal: 'SIGSTOP' });
    await sleep(400);                                            // give any wrongful kill time to land
    const rootStillAlive = await osAlive(s.rootPid), workerStillAlive = await osAlive(s.workerPid);
    const rk = s.killFn({ session_id: s.session_id, tree: true }); // proper cleanup
    const rootGone = await waitForGone(s.rootPid), workerGone = await waitForGone(s.workerPid);
    record('T3-invalid-signal-rejected-no-kill',
      !!r.error && /Unsupported signal/.test(r.error) && r.success === undefined
        && rootStillAlive === true && workerStillAlive === true
        && rk.tree_kill === true && rootGone >= 0 && workerGone >= 0,
      { rejectResponse: r, rootStillAlive, workerStillAlive, cleanupResponse: rk, rootGoneMs: rootGone, workerGoneMs: workerGone });
  } catch (e) { record('T3-invalid-signal-rejected-no-kill', false, { setupError: String(e.message || e) }); }

  // ════ T4: tree:true — BOTH parent (cmd root) and child (node worker) gone ════
  try {
    console.log('\n===== T4 tree-kill-parent-and-child-gone =====');
    const s = await startSleeper(plugin, 't4');                  // both verified alive pre-kill
    const r = s.killFn({ session_id: s.session_id, tree: true });
    const rootGone = await waitForGone(s.rootPid, 12000);
    const workerGone = await waitForGone(s.workerPid, 12000);
    record('T4-tree-kill-parent-and-child-gone',
      r.success === true && r.tree_kill === true && /taskkill \/F \/T/.test(r.method || '')
        && rootGone >= 0 && workerGone >= 0,
      { response: r, rootPid: s.rootPid, workerPid: s.workerPid, rootGoneMs: rootGone, workerGoneMs: workerGone });
  } catch (e) { record('T4-tree-kill-parent-and-child-gone', false, { setupError: String(e.message || e) }); }

  // ════ T5: WITHOUT tree — parent dies, child survives (mechanisms are separate) ════
  try {
    console.log('\n===== T5 no-tree-gap-child-survives =====');
    const s = await startSleeper(plugin, 't5');
    const r = s.killFn({ session_id: s.session_id });            // plain kill, no tree
    const rootGone = await waitForGone(s.rootPid);
    await sleep(600);                                            // settle; survivor must persist
    const workerStillAlive = await osAlive(s.workerPid);
    record('T5-no-tree-gap-child-survives',
      r.signal === 'SIGTERM' && rootGone >= 0 && workerStillAlive === true,
      { response: r, rootGoneMs: rootGone, workerPid: s.workerPid, workerSurvivesAfterParentDeath: workerStillAlive,
        note: 'documents the Windows orphan gap that tree:true exists to close' });
    await forceKill(s.workerPid);
  } catch (e) { record('T5-no-tree-gap-child-survives', false, { setupError: String(e.message || e) }); }

  // ════ T6: start-timeout full flow (SIGTERM at expiry; escalation ladder armed) ════
  try {
    console.log('\n===== T6 timeout-full-flow =====');
    const pidFile = path.join(DIR, '.t6.worker.pid');
    try { fs.unlinkSync(pidFile); } catch {}
    const startFn = plugin.default.tools.find(t => t.name === 'process_start').execute;
    const pollFn = plugin.default.tools.find(t => t.name === 'process_poll').execute;
    const st = startFn({ command: `node "${FIXTURE}" "${pidFile}"`, timeout: 800 });
    const t0 = Date.now();                                       // clock origin = start moment
    let worker = null;
    for (let i = 0; i < 25 && worker === null; i++) { await sleep(150); try { worker = parseInt(fs.readFileSync(pidFile, 'utf8').trim(), 10); } catch {} }
    if (!worker) throw new Error('T6: worker never registered PID');
    cleanupPids.add(worker);
    const aliveBeforeTimeout = await osAlive(st.pid) && await osAlive(worker); // PREcondition
    if (!aliveBeforeTimeout) throw new Error('T6: process not alive while timeout pending');
    const rootGoneIn = await waitForGone(st.pid, 9000);          // 800ms timeout + 5s grace + slack
    const elapsed = Date.now() - t0;                             // measured FROM PROCESS START
    await sleep(1300);                                           // exit-event delete delay (1s)
    const postPoll = pollFn({ session_id: st.session_id });
    record('T6-timeout-full-flow',
      st.session_id && rootGoneIn >= 0 && elapsed >= 700 && elapsed <= 6300
        && postPoll.error !== undefined,
      { sessionId: st.session_id, rootPid: st.pid, workerPid: worker,
        aliveWhilePendingConfirmed: aliveBeforeTimeout,
        rootGoneMsFromStart: rootGoneIn, wallElapsedMsFromStart: elapsed,
        stage1Sufficed_beforeGraceExpiry: elapsed < 800 + 5000,
        pollAfterCleanupDelay: postPoll.error ?? 'STILL TRACKED',
        note: 'on win32 SIGTERM==TerminateProcess so death occurs in stage 1 (~800ms mark); escalation timer is the safety net' });
    const workerDeadIn = await waitForGone(worker, 4000);
    if (workerDeadIn < 0) await forceKill(worker);               // win32 orphan semantics
  } catch (e) { record('T6-timeout-full-flow', false, { setupError: String(e.message || e) }); }

  // ════ T7: escalation branch — REAL OS effect after 5s grace ════
  try {
    console.log('\n===== T7 escalation-branch-real-os =====');
    const { spawn } = require('child_process');
    const sched = plugin.scheduleKillEscalation;                 // exported production fn
    const victim = spawn('ping', ['-n', '60', '127.0.0.1'], { windowsHide: true, stdio: 'ignore' });
    const vpid = victim.pid;
    const stubTracked = { process: victim, exitCode: null, killed: false, lastSignal: 'SIGTERM' };
    const alivePre = await osAlive(vpid);
    const t0 = Date.now();
    sched(stubTracked);                                          // arms the 5s production timer
    await sleep(plugin.KILL_GRACE_PERIOD_MS + 1500);             // outlast the grace period
    const goneMs = await waitForGone(vpid, 6000);
    record('T7-escalation-branch-real-os',
      alivePre === true && typeof sched === 'function' && goneMs >= 0
        && stubTracked.lastSignal === 'SIGKILL' && (Date.now() - t0) >= 4900,
      { victimPid: vpid, alivePreEscalation: alivePre, victimGoneMsPostGrace: goneMs,
        stubLastSignal: stubTracked.lastSignal, waitedMs: Date.now() - t0,
        note: 'production timer body executed taskkill /F /T against a real live process after the 5s grace' });
  } catch (e) { record('T7-escalation-branch-real-os', false, { setupError: String(e.message || e) }); }

  // ════ T8: empirical Windows SIGTERM vs SIGKILL mapping ════
  try {
    console.log('\n===== T8 win32-signal-mapping-empirical =====');
    async function timeToDeath(signalName, tag) {
      const s = await startSleeper(plugin, tag);                 // aliveness pre-verified inside
      cleanupPids.add(s.workerPid);
      const confirmedAlivePreKill = await osAlive(s.rootPid);    // explicit re-check at kill moment
      const t0 = Date.now();
      s.killFn({ session_id: s.session_id, signal: signalName });
      const gone = await waitForGone(s.rootPid, 4000);
      const d = gone >= 0 ? Date.now() - t0 : -1;
      await forceKill(s.workerPid);
      return { signal: signalName, aliveJustBeforeKill: confirmedAlivePreKill, diedInMs: d };
    }
    const a = await timeToDeath('SIGTERM', 't8a');
    const b = await timeToDeath('SIGKILL', 't8b');
    const delta = Math.abs(a.diedInMs - b.diedInMs);
    record('T8-win32-signal-mapping-empirical',
      a.aliveJustBeforeKill && b.aliveJustBeforeKill
        && a.diedInMs > 0 && b.diedInMs > 0 && a.diedInMs <= 1500 && b.diedInMs <= 1500 && delta <= 1200,
      { sigterm_death_ms: a.diedInMs, sigkill_death_ms: b.diedInMs, abs_delta_ms: delta,
        conclusion: 'On win32 both signals produce immediate TerminateProcess-style death of the direct child; timing indistinguishable. Node maps any signal != 0 to unconditional termination. Source: header comment in src/core/tools/process.ts + https://nodejs.org/api/child_process.html#subprocesskillsignal' });
  } catch (e) { record('T8-win32-signal-mapping-empirical', false, { setupError: String(e.message || e) }); }

  // ════ teardown sweep ════
  const leaked = [];
  for (const pid of cleanupPids) if (await osAlive(pid)) { await forceKill(pid); leaked.push(pid); }
  for (const f of fs.readdirSync(DIR)) if (/^\.(t\d+\w*|diag\w*)\.worker\.pid$/.test(f)) { try { fs.unlinkSync(path.join(DIR, f)); } catch {} }

  const names = Object.keys(results).filter(k => k.startsWith('T'));
  const passedCount = names.filter(n => results[n].passed).length;
  const summary = { total: names.length, passed: passedCount, failed: names.length - passedCount,
    leaked_after_force_cleanup: leaked, finishedAt: new Date().toISOString() };
  writeJson('results.json', { summary, results });
  console.log(`\nSUMMARY: ${passedCount}/${names.length} PASS | leaked-after-cleanup: ${leaked.length ? leaked.join(',') : 'none'}`);
  process.exit(passedCount === names.length && leaked.length === 0 ? 0 : 1);
})().catch(e => { _log('HARNESS ERROR:', e && e.stack || e); process.exit(2); });
