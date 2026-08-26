/**
 * @file Process Tool CLI — R1-E.1 standalone command-line access to the 5 process tools.
 * @layer scripts
 * @depends-on src/core/tools/tool-registry.ts (production registry via executeToolCall)
 *
 * Usage:
 *   node dist/scripts/process-cli.js start --command "<cmd>" [--workdir dir] [--timeout ms] [--json]
 *   node dist/scripts/process-cli.js poll  <session_id> [--json]
 *   node dist/scripts/process-cli.js log   <session_id> [--limit N] [--json]
 *   node dist/scripts/process-cli.js kill  <session_id> [--json]
 *   node dist/scripts/process-cli.js list  [--json]
 *
 * All invocations go through ToolRegistry.executeToolCall() — same path as the agent
 * ReAct loop. No direct process.ts import, no REPL, no extra timeout/cancellation.
 *
 * Guard note (R1-E.1 audit): executeToolCall applies registry lookup + runtime
 * instrumentation only; no Agent-only context is required (proven by R1-D.1 Tier 4).
 * The _shared.ts command whitelist is not part of the process tool execute path by
 * existing design — CLI neither adds nor removes guards.
 */

import { getDefaultRegistry } from '../core/tools/tool-registry.js';

const TOOL_BY_CMD: Record<string, string> = {
  start: 'process_start',
  poll: 'process_poll',
  log: 'process_log',
  kill: 'process_kill',
  list: 'process_list',
};

interface Parsed {
  cmd: string;
  toolName: string;
  args: Record<string, any>;
  json: boolean;
}

function parseArgv(argv: string[]): Parsed | null {
  const json = argv.includes('--json');
  const rest = argv.filter(a => a !== '--json');
  const [cmd, ...tail] = rest;
  if (!cmd || !TOOL_BY_CMD[cmd]) return null;

  const args: Record<string, any> = {};
  switch (cmd) {
    case 'start': {
      // supports: --command "x" AND positional fallback: start -- "long command"
      let sepIdx = rest.indexOf('--');
      if (sepIdx !== -1 && tail.length) {
        args.command = rest.slice(sepIdx + 1).join(' ');
      }
      for (let i = 0; i < tail.length; i++) {
        if (tail[i] === '--command' && tail[i + 1]) { args.command = tail[++i]; }
        else if (tail[i] === '--workdir' && tail[i + 1]) { args.workdir = tail[++i]; }
        else if (tail[i] === '--timeout' && tail[i + 1]) { args.timeout = Number(tail[++i]); }
      }
      break;
    }
    case 'poll':
    case 'kill':
      args.session_id = tail.find(t => !t.startsWith('--'));
      break;
    case 'log': {
      args.session_id = tail.find(t => !t.startsWith('--'));
      const li = tail.indexOf('--limit');
      if (li !== -1 && tail[li + 1]) args.limit = Number(tail[li + 1]);
      break;
    }
    case 'list':
      break;
  }
  return { cmd, toolName: TOOL_BY_CMD[cmd], args, json };
}

function usage(): string {
  return [
    'process-cli — access process tools via production Tool Registry',
    '',
    'Usage:',
    '  node dist/scripts/process-cli.js start --command "<cmd>" [--workdir dir] [--timeout ms] [--json]',
    '  node dist/scripts/process-cli.js start -- "<raw command with flags>" [--json]',
    '  node dist/scripts/process-cli.js poll  <session_id> [--json]',
    '  node dist/scripts/process-cli.js log   <session_id> [--limit N] [--json]',
    '  node dist/scripts/process-cli.js kill  <session_id> [--json]',
    '  node dist/scripts/process-cli.js list  [--json]',
  ].join('\n');
}

function human(cmd: string, r: any): string {
  if (!r || typeof r !== 'object') return String(r);
  switch (cmd) {
    case 'start':
      return `started  session=${r.session_id}  pid=${r.pid}\n         command=${r.command}`;
    case 'poll':
      return [
        `session=${r.session_id}  pid=${r.pid}`,
        `running=${r.running}  exit_code=${r.exit_code}  uptime_ms=${r.uptime_ms}`,
        r.stdout ? `stdout:\n${r.stdout}` : 'stdout: (empty)',
      ].join('\n');
    case 'log':
      return [
        `session=${r.session_id}`,
        r.stdout ? `stdout:\n${r.stdout}` : 'stdout: (empty)',
        r.stderr_lines ? `stderr:\n${r.stderr_lines}` : 'stderr: (empty)',
      ].join('\n');
    case 'kill':
      return r.success ? `killed   session=${r.session_id}  signal=${r.signal}` : `kill failed: ${r.error}`;
    case 'list': {
      const procs = r.processes || [];
      if (!procs.length) return 'no tracked processes';
      return ['tracked processes:', ...procs.map((p: any) =>
        `  ${p.id}  pid=${p.pid}  running=${p.running}  ${p.command}`)].join('\n');
    }
    default:
      return JSON.stringify(r);
  }
}

async function main(): Promise<number> {
  const parsed = parseArgv(process.argv.slice(2));
  if (!parsed) {
    console.error(usage());
    console.error(`\nerror: unknown or missing command "${process.argv[2] ?? ''}"`);
    return 2;
  }

  // basic client-side validation mirroring tool schemas (required fields)
  if ((parsed.cmd === 'poll' || parsed.cmd === 'kill' || parsed.cmd === 'log') && !parsed.args.session_id) {
    console.error(usage());
    console.error(`\nerror: ${parsed.cmd} requires <session_id>`);
    return 2;
  }
  if (parsed.cmd === 'start' && !parsed.args.command) {
    console.error(usage());
    console.error('\nerror: start requires --command "<cmd>" or "-- <cmd>"');
    return 2;
  }

  const registry = await getDefaultRegistry(); // production registry path

  const result = await registry.executeToolCall({
    id: `cli-${parsed.cmd}-${Date.now()}`,
    type: 'function',
    function: { name: parsed.toolName, arguments: JSON.stringify(parsed.args) },
  });

  if (result && result.error) {
    if (parsed.json) console.log(JSON.stringify(result));
    else console.error(`error: ${result.error}`);
    return 1;
  }

  if (parsed.json) console.log(JSON.stringify(result, null, 2));
  else console.log(human(parsed.cmd, result));
  return 0;
}

main().then(code => process.exit(code)).catch(err => {
  console.error('fatal:', err && err.message);
  process.exit(1);
});
