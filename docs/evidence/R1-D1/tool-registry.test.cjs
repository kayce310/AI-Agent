// R1-D.1 Tool Registry Integration — 5-tier verification harness.
// Scope: REGISTRY-LEVEL TEST ENTRYPOINT (dist production artifact, direct
// getDefaultRegistry() boot). NOT full production runtime verification.
// No mocking of executeToolCall; no registry bypass; AST discovery out of scope.
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
const { exec } = require('child_process');

const DIR = __dirname; // docs/evidence/R1-D1
const ROOT = path.resolve(DIR, '..', '..', '..');

// ---- raw console tee (Tier 5: raw runtime output) ----
const RAW = [];
const _log = console.log.bind(console), _err = console.error.bind(console);
console.log = (...a) => { const s = a.map(x => typeof x === 'string' ? x : JSON.stringify(x)).join(' '); RAW.push(s); _log(s); };
console.error = (...a) => { const s = '[stderr] ' + a.map(x => typeof x === 'string' ? x : JSON.stringify(x)).join(' '); RAW.push(s); _err(s); };
const writeJson = (name, obj) => fs.writeFileSync(path.join(DIR, name), JSON.stringify(obj, null, 2));
const sleep = ms => new Promise(r => setTimeout(r, ms));

// ---- Tier 3: exception ledger for boot phase ----
const bootExceptions = [];
process.on('uncaughtException', e => { bootExceptions.push(String(e && e.stack || e)); });
process.on('unhandledRejection', e => { bootExceptions.push(String(e && e.stack || e)); });

async function gitInfo() {
  const g = c => new Promise(r => exec(c, { cwd: ROOT }, (e, so) => r(e ? 'unknown' : String(so).trim())));
  return {
    timestamp: new Date().toISOString(),
    branch: await g('git branch --show-current'),
    head: await g('git rev-parse HEAD'),
    status: await g('git status --porcelain'),
    log5: await g('git log --oneline -5'),
  };
}

// ---- Tier 1: static architecture inspection (real line numbers, runtime-scanned) ----
function findLine(file, needle) {
  const p = path.join(ROOT, file);
  const lines = fs.readFileSync(p, 'utf8').split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) if (lines[i].includes(needle)) return { line: i + 1, text: lines[i].trim() };
  return null;
}
function tier1() {
  const checks = [
    ['src/core/tools/tool-registry.ts', 'export async function getDefaultRegistry'],
    ['src/core/tools/tool-registry.ts', 'async function registerBuiltInPlugins'],
    ['src/core/tools/tool-registry.ts', "process: './process.js'"],
    ['src/core/tools/tool-registry.ts', 'registry.use(mod.default)'],
    ['src/core/tools/tool-registry.ts', 'async registerAll(scanner?: ASTScanner)'], // present but NOT wired at startup (orphaned, out of scope)
    ['src/core/engine/engine.ts', 'this.toolRegistry = await getDefaultRegistry()'],
    ['src/core/engine/agent.ts', 'selectedTools = this.toolRegistry.getDefinitions()'],
    ['src/core/engine/agent.ts', 'await this.toolRegistry.executeToolCall(toolCall)'],
  ];
  const results = {};
  let ok = true;
  for (const [f, needle] of checks) {
    const hit = findLine(f, needle);
    results[`${f} :: ${needle}`] = hit;
    if (!hit) ok = false;
  }
  return { passed: ok, evidence: results, note: 'registerAll/AST scanner exists in source but is not invoked by registerBuiltInPlugins — ORPHANED, excluded from R1-D.1 scope.' };
}

(async () => {
  try {
    fs.mkdirSync(DIR, { recursive: true });
    writeJson('environment.json', {
      timestamp: new Date().toISOString(), platform: process.platform, node: process.version,
      root: ROOT, pid: process.pid,
      bootPath: 'REGISTRY_LEVEL_TEST_ENTRYPOINT',
      productionArtifactUsed: 'dist/core/tools/tool-registry.js',
    });
    const git = await gitInfo();
    writeJson('git-info.json', git);

    // ===== Tier 1 =====
    console.log('\n===== TIER 1: CODE / ARCHITECTURE INSPECTION =====');
    const t1 = tier1();
    writeJson('tier1-source-inspection.json', t1);
    console.log(`Tier 1: ${t1.passed ? 'PASS' : 'FAIL'} (${Object.values(t1.evidence).filter(Boolean).length}/${Object.keys(t1.evidence).length} chain markers found)`);

    // ===== Tier 3 (boot) + Tier 2 (assertion) =====
    console.log('\n===== TIER 3: RUNTIME BOOT (registry-level test entrypoint) =====');
    const modUrl = pathToFileURL(path.join(ROOT, 'dist/core/tools/tool-registry.js'));
    console.log(`importing production artifact: ${modUrl.href}`);
    const regMod = await import(modUrl.href);
    const getDefaultRegistry = regMod.getDefaultRegistry;
    if (typeof getDefaultRegistry !== 'function') throw new Error('getDefaultRegistry not exported from dist artifact');

    const bootStart = new Date().toISOString();
    const registry = await getDefaultRegistry(); // production registration path incl. static plugin list
    const bootEnd = new Date().toISOString();

    const defs = registry.getDefinitions();
    const defNames = defs.map(d => d.function && d.function.name || d.name);
    console.log(`boot complete: ${bootStart} -> ${bootEnd}, exceptions=${bootExceptions.length}, definitions=${defNames.length}`);

    const t3 = {
      passed: bootExceptions.length === 0 && defNames.length > 0,
      bootStart, bootEnd,
      uncaughtCount: bootExceptions.length,
      uncaught: bootExceptions,
      totalDefinitions: defNames.length,
      scopeLabel: 'REGISTRY_LEVEL_TEST_ENTRYPOINT — proves registry loads via dist production artifact; does NOT prove full production runtime (engine/agent/platform) boot.',
    };
    writeJson('tier3-boot-evidence.json', t3);
    console.log(`Tier 3: ${t3.passed ? 'PASS' : 'FAIL'}`);

    console.log('\n===== TIER 2: RUNTIME DEFINITION ASSERTION =====');
    const required = ['process_start', 'process_poll', 'process_log', 'process_kill', 'process_list'];
    const found = {}; let t2ok = true;
    for (const n of required) { found[n] = defNames.includes(n); if (!found[n]) t2ok = false; }
    // assertion result DECIDES pass/fail (not just logged)
    const t2 = { passed: t2ok, required, found, definitionCount: defNames.length };
    writeJson('tier2-definition-assertion.json', t2);
    console.log(`Tier 2: ${t2.passed ? 'PASS' : 'FAIL'} — ${JSON.stringify(found)}`);

    // ===== Tier 4: real invocation round-trip via executeToolCall =====
    console.log('\n===== TIER 4: REAL INVOCATION ROUND-TRIP (no mock, no bypass) =====');
    const call = (name, args, id) => registry.executeToolCall({ id, type: 'function', function: { name, arguments: JSON.stringify(args) } });

    const startCall = await call('process_start', { command: 'echo r1-d1-round-trip', workdir: ROOT }, 'r1d1-t4-start');
    console.log('executeToolCall(process_start) ->', JSON.stringify(startCall));
    const startOk = startCall && !startCall.error && startCall.session_id && typeof startCall.pid === 'number';

    // same-path confirmation reads through registry (not gating verdict)
    let pollCall = null, listCall = null;
    if (startOk) {
      await sleep(300);
      pollCall = await call('process_poll', { session_id: startCall.session_id }, 'r1d1-t4-poll');
      listCall = await call('process_list', {}, 'r1d1-t4-list');
      console.log('executeToolCall(process_poll) ->', JSON.stringify(pollCall));
      console.log(`executeToolCall(process_list) -> total=${listCall && listCall.total}`);
      await sleep(1500); // exit + 1s tracking delete; leave clean state
    }

    const t4 = {
      passed: !!startOk,
      proofChain: 'getDefaultRegistry -> registry.use(static process plugin) -> toolsMap -> executeToolCall -> process_start.execute -> result',
      startResult: startCall, pollResult: pollCall, listResult: listCall,
      mockedExecuteToolCall: false, bypassedRegistry: false,
    };
    writeJson('tier4-invocation-roundtrip.json', t4);
    console.log(`Tier 4: ${t4.passed ? 'PASS' : 'FAIL'}`);

    // ===== Verdict =====
    const tiers = { tier1: t1.passed, tier2: t2.passed, tier3: t3.passed, tier4: t4.passed };
    const allPassed = Object.values(tiers).every(Boolean);
    const summary = [
      '# R1-D.1 Tool Registry Integration — Verification Summary',
      '',
      `- Timestamp: ${new Date().toISOString()}`,
      `- Branch: ${git.branch}`,
      `- HEAD: ${git.head}`,
      `- Boot path: REGISTRY_LEVEL_TEST_ENTRYPOINT (dist production artifact, direct getDefaultRegistry())`,
      '',
      '| Tier | Result | Decided by |',
      '|---|---|---|',
      `| 1 Code inspection | ${tiers.tier1 ? 'PASS' : 'FAIL'} | 8/8 source chain markers w/ runtime-scanned line numbers |`,
      `| 2 Definition assertion | ${tiers.tier2 ? 'PASS' : 'FAIL'} | presence of all 5 process tools in getDefinitions() |`,
      `| 3 Runtime boot | ${tiers.tier3 ? 'PASS' : 'FAIL'} | zero uncaught/rejected during boot, defs>0 |`,
      `| 4 Invocation round-trip | ${tiers.tier4 ? 'PASS' : 'FAIL'} | executeToolCall(process_start) returned session_id+pid |`,
      '',
      `## Final status: ${allPassed ? 'VERIFIED' : 'GAP_REMAINS'}`,
      '',
      '## Scope & Limitations',
      '- Registry-level test entrypoint: proves production registry artifact registers, exposes, and invokes process tools.',
      '- Does NOT prove full production runtime boot (start-telegram -> Engine -> Agent loop); that requires a separate runtime-session evidence run.',
      '- Phase 3.1b AST auto-discovery: ORPHANED_IMPLEMENTATION (origin 9d31e81a), not wired into startup; EXCLUDED from R1-D.1.',
      '- Tier 4 uses fixture subprocess (cmd echo); no LLM / ReAct loop involved.',
    ].join('\n');
    fs.writeFileSync(path.join(DIR, 'SUMMARY.md'), summary);
    writeJson('tier-verdict.json', { ...tiers, finalStatus: allPassed ? 'VERIFIED' : 'GAP_REMAINS' });
    fs.writeFileSync(path.join(DIR, 'raw-run.txt'), RAW.join('\n') + '\n');

    console.log('\n===== FINAL =====');
    for (const [k, v] of Object.entries(tiers)) console.log(`${k}: ${v ? 'PASS' : 'FAIL'}`);
    console.log(`R1-D.1 STATUS: ${allPassed ? 'VERIFIED' : 'GAP_REMAINS'}`);
    process.exit(allPassed ? 0 : 2);
  } catch (e) {
    console.error('HARNESS ERROR:', e.message, '\n', e.stack);
    bootExceptions.push(String(e && e.stack || e));
    writeJson('tier-verdict.json', { finalStatus: 'GAP_REMAINS', harnessError: String(e && e.message) });
    fs.writeFileSync(path.join(DIR, 'raw-run.txt'), RAW.join('\n') + '\n');
    process.exit(1);
  }
})();
