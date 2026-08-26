/**
 * @file process — Tool plugin
 * @layer core
 * @owner core-tools
 *
 * Background process management: spawn, poll, kill, log.
 * Lightweight — tracks processes in-memory.
 *
 * R1-F.2 — Advanced Process Management Features:
 *   Mechanism 1 (signal control): process_kill accepts optional `signal`
 *     ('SIGTERM' default | 'SIGKILL') applied to the DIRECT child only.
 *   Mechanism 2 (tree kill): process_kill with `tree: true` terminates the
 *     ENTIRE descendant tree. Windows: `taskkill /F /T /PID <pid>`.
 *   Extended timeout semantics: any first-stage SIGTERM (manual kill,
 *     AbortSignal, or start-timeout) is followed by a 5s grace period; if the
 *     process is still alive after the grace period it is escalated
 *     (win32: taskkill /F /T — see below; posix: SIGKILL).
 *
 * ── Windows signal behaviour mapping (Node.js child_process, win32) ──
 * POSIX signals do not exist on Windows. Node maps child.kill(signal):
 *   - ANY signal argument other than 0 → TerminateProcess → immediate,
 *     forceful, abrupt termination of the direct child.
 *   - Therefore SIGTERM and SIGKILL are BEHAVIOURALLY IDENTICAL on win32:
 *     no graceful phase runs, cleanup handlers of the target do not run,
 *     typical exit code is 1.
 *   - Consequence 1: on win32 the SIGTERM→grace→escalation ladder normally
 *     completes at stage 1 (the process cannot survive TerminateProcess),
 *     so escalation is a safety net rather than an observable stage.
 *   - Consequence 2: killing the direct child does NOT kill its descendants
 *     (cmd.exe children survive their shell being terminated). That gap is
 *     addressed exclusively by Mechanism 2 (tree kill), which uses
 *     `taskkill /F /T`: /F = TerminateProcess (forceful), /T = whole tree.
 * Verified empirically in docs/evidence/R1-F2 (test T8).
 */
import { spawn, ChildProcess } from 'child_process';
import type { ToolPlugin } from './tool-registry.js';
import { BASE_PATH } from './_shared.js';

// Default subprocess timeout (3 minutes)
const DEFAULT_SUBPROCESS_TIMEOUT_MS = 3 * 60 * 1000;

// R1-F.2: grace period between first-stage SIGTERM and escalation
export const KILL_GRACE_PERIOD_MS = 5000;

// R1-F.2: signals accepted by process_kill
const VALID_KILL_SIGNALS = ['SIGTERM', 'SIGKILL'] as const;
type KillSignal = typeof VALID_KILL_SIGNALS[number];

interface TrackedProcess {
  id: string;
  command: string;
  process: ChildProcess;
  stdout: string;
  stderr: string;
  exitCode: number | null;
  startTime: number;
  killed: boolean;
  // AbortSignal for process cancellation
  abortSignal?: AbortSignal;
  // Kill timer for subprocess timeout
  killTimer?: ReturnType<typeof setTimeout>;
  // R1-F.2: escalation timer armed after a first-stage SIGTERM
  escalationTimer?: ReturnType<typeof setTimeout>;
  // R1-F.2: last signal actually issued to the child
  lastSignal?: KillSignal;
  // R1-F.2: set when a tree kill was initiated
  treeKillInitiated?: boolean;
}

const processes = new Map<string, TrackedProcess>();
let nextId = 1;

function isAlive(tracked: TrackedProcess): boolean {
  return tracked.exitCode === null && tracked.process.exitCode === null;
}

/**
 * R1-F.2 Mechanism 2 (Windows tree kill).
 * `taskkill /F /T /PID <pid>`: /F forces TerminateProcess on every process in
 * the tree rooted at <pid>; /T walks the full descendant tree. Resolves when
 * taskkill exits 0; rejects with combined output otherwise.
 */
export function treeKillWin32(pid: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const tk = spawn('taskkill', ['/F', '/T', '/PID', String(pid)], {
      stdio: 'pipe',
      windowsHide: true,
    });
    let out = '';
    tk.stdout?.on('data', (d: Buffer) => { out += d.toString(); });
    tk.stderr?.on('data', (d: Buffer) => { out += d.toString(); });
    tk.on('error', reject);
    tk.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`taskkill exited ${code}: ${out.trim().slice(-300)}`));
    });
  });
}

/**
 * R1-F.2 extended timeout: arm escalation after a first-stage SIGTERM.
 * Exported for behavioral testing with a real sacrificial process (evidence
 * T7) — the timer body is the production code path used by abort/timeout/kill.
 */
export function scheduleKillEscalation(tracked: TrackedProcess): void {
  if (tracked.escalationTimer) clearTimeout(tracked.escalationTimer);
  tracked.escalationTimer = setTimeout(() => {
    tracked.escalationTimer = undefined;
    if (!isAlive(tracked)) return; // exited (or exited during grace) — nothing to escalate
    try {
      if (process.platform === 'win32' && tracked.process.pid) {
        // win32: SIGKILL would map to TerminateProcess on the direct child
        // only. Escalate to a tree-wide forceful kill instead so descendants
        // cannot outlive the escalation either.
        tracked.lastSignal = 'SIGKILL';
        void treeKillWin32(tracked.process.pid).catch(() => { /* already gone */ });
      } else {
        tracked.lastSignal = 'SIGKILL';
        tracked.process.kill('SIGKILL');
      }
    } catch { /* process already gone */ }
  }, KILL_GRACE_PERIOD_MS);
}

/** Clear any pending timers attached to a tracked process. */
function clearTimers(tracked: TrackedProcess): void {
  if (tracked.killTimer) { clearTimeout(tracked.killTimer); tracked.killTimer = undefined; }
  if (tracked.escalationTimer) { clearTimeout(tracked.escalationTimer); tracked.escalationTimer = undefined; }
}

/**
 * R1-F.2 Mechanism 1 (signal control): issue `signal` to the direct child.
 * SIGTERM is stage 1 of the extended-timeout ladder → arms escalation after
 * KILL_GRACE_PERIOD_MS. SIGKILL needs no grace (nothing survives it).
 */
function terminateWithEscalation(tracked: TrackedProcess, signal: KillSignal): void {
  if (!isAlive(tracked)) return;
  tracked.killed = true;
  tracked.lastSignal = signal;
  try { tracked.process.kill(signal); } catch { /* already gone */ }
  if (signal !== 'SIGTERM') return;
  scheduleKillEscalation(tracked);
}

const plugin: ToolPlugin = {
  name: 'process',
  tools: [
    {
      name: 'process_start',
      description: 'Start a background process. Returns session_id for polling. Use for long-running commands (servers, builds, tests). On timeout: SIGTERM first, then escalation after a 5s grace period.',
      schema: {
        type: 'object',
        properties: {
          command: { type: 'string', description: 'Command to run' },
          workdir: { type: 'string', description: 'Working directory (default: project root)' }
        },
        required: ['command']
      },
      execute(args: Record<string, any>) {
        const { command, workdir, signal: abortSignal, timeout = DEFAULT_SUBPROCESS_TIMEOUT_MS } = args;
        if (!command) return { error: 'command is required' };

        // If already aborted, don't start
        if (abortSignal && abortSignal.aborted) {
          return { error: 'Process cancelled via AbortSignal' };
        }

        const id = `proc-${nextId++}`;
        const cwd = workdir || BASE_PATH;

        try {
          const child = spawn(command, { shell: true, cwd, stdio: 'pipe', windowsHide: true });
          const tracked: TrackedProcess = {
            id, command, process: child,
            stdout: '', stderr: '', exitCode: null,
            startTime: Date.now(), killed: false,
            abortSignal: abortSignal,
          };

          // ── AbortSignal listener: kill on abort (stage 1: SIGTERM → escalation)
          if (abortSignal) {
            const onAbort = () => terminateWithEscalation(tracked, 'SIGTERM');
            abortSignal.addEventListener('abort', onAbort, { once: true });
          }

          // ── Subprocess timeout (stage 1: SIGTERM → escalation)
          tracked.killTimer = setTimeout(() => {
            if (isAlive(tracked)) terminateWithEscalation(tracked, 'SIGTERM');
          }, timeout);

          child.stdout?.on('data', (d: Buffer) => {
            tracked.stdout += d.toString();
            if (tracked.stdout.length > 500000) tracked.stdout = tracked.stdout.slice(-400000);
          });
          child.stderr?.on('data', (d: Buffer) => {
            tracked.stderr += d.toString();
            if (tracked.stderr.length > 500000) tracked.stderr = tracked.stderr.slice(-400000);
          });

          // ── Cleanup on exit
          child.on('exit', (code) => {
            tracked.exitCode = code;
            tracked.killed = true;
            clearTimers(tracked);
            // Remove listeners to prevent leaks
            child.stdout?.removeAllListeners('data');
            child.stderr?.removeAllListeners('data');
            // Clean up process tracking after a short delay
            setTimeout(() => processes.delete(id), 1000);
          });

          processes.set(id, tracked);
          return { session_id: id, pid: child.pid, command };
        } catch (err: any) {
          return { error: `Failed to start process: ${err.message}` };
        }
      }
    },
    {
      name: 'process_poll',
      description: 'Check status of a background process. Returns recent output.',
      schema: {
        type: 'object',
        properties: {
          session_id: { type: 'string', description: 'Process session ID' },
          offset: { type: 'number', description: 'Line offset for log output (default: last 100 lines)' }
        },
        required: ['session_id']
      },
      execute(args: Record<string, any>) {
        const proc = processes.get(args.session_id);
        if (!proc) return { error: `Process ${args.session_id} not found` };

        const running = proc.process.exitCode === null && !proc.killed;
        const lines = proc.stdout.split('\n');
        const offset = Math.max(0, lines.length - (args.offset || 100));

        return {
          session_id: proc.id,
          pid: proc.process.pid,
          command: proc.command,
          running,
          exit_code: proc.exitCode,
          uptime_ms: Date.now() - proc.startTime,
          stdout: lines.slice(offset).join('\n'),
          stderr_lines: proc.stderr.split('\n').slice(-20).join('\n'),
        };
      }
    },
    {
      name: 'process_log',
      description: 'Get full log output of a background process.',
      schema: {
        type: 'object',
        properties: {
          session_id: { type: 'string' },
          limit: { type: 'number', description: 'Max lines (default 200)' }
        },
        required: ['session_id']
      },
      execute(args: Record<string, any>) {
        const proc = processes.get(args.session_id);
        if (!proc) return { error: `Process ${args.session_id} not found` };
        const limit = args.limit || 200;
        const lines = proc.stdout.split('\n');
        return { stdout: lines.slice(-limit).join('\n'), stderr: proc.stderr.slice(-5000) };
      }
    },
    {
      name: 'process_kill',
      description: 'Kill a background process. Default: SIGTERM to the direct child, escalating after a 5s grace period if still alive (win32 escalates via taskkill /F /T, posix via SIGKILL). Optional `signal`: \'SIGKILL\' skips the grace period. Optional `tree: true`: Windows tree kill via taskkill /F /T — terminates the whole descendant tree (independent mechanism; signal param not used).',
      schema: {
        type: 'object',
        properties: {
          session_id: { type: 'string' },
          signal: { type: 'string', enum: ['SIGTERM', 'SIGKILL'], description: 'Signal for direct-child kill (default SIGTERM)' },
          tree: { type: 'boolean', description: 'Windows: kill entire process tree via taskkill /F /T (default false)' }
        },
        required: ['session_id']
      },
      execute(args: Record<string, any>) {
        const proc = processes.get(args.session_id);
        if (!proc) return { error: `Process ${args.session_id} not found` };

        // Regression contract: omitting `signal` must keep default SIGTERM
        const signal: KillSignal = args.signal ?? 'SIGTERM';
        if (!(VALID_KILL_SIGNALS as readonly string[]).includes(signal)) {
          // Reject WITHOUT touching the process — invalid input must not kill
          return {
            error: `Unsupported signal '${args.signal}'. Valid signals: ${VALID_KILL_SIGNALS.join(', ')}. Omit for default SIGTERM.`,
            session_id: proc.id
          };
        }

        // An explicit kill supersedes any pending timeout
        if (proc.killTimer) { clearTimeout(proc.killTimer); proc.killTimer = undefined; }

        // Already exited — just settle tracking
        if (!isAlive(proc)) {
          clearTimers(proc);
          processes.delete(args.session_id);
          return { success: true, session_id: proc.id, already_exited: true, exit_code: proc.exitCode };
        }

        const pid = proc.process.pid;

        // ── Mechanism 2: tree kill (independent of signal control) ──
        if (args.tree === true) {
          clearTimers(proc);
          proc.killed = true;
          proc.treeKillInitiated = true;
          processes.delete(args.session_id);
          if (process.platform === 'win32' && pid) {
            void treeKillWin32(pid).catch(() => { /* best-effort; exit event settles state */ });
            return {
              success: true,
              session_id: proc.id,
              pid,
              tree_kill: true,
              method: 'taskkill /F /T',
              note: 'Windows: /F = TerminateProcess (forceful), /T = entire descendant tree. Signal param not applicable to tree kill.'
            };
          }
          // POSIX: tree kill not in R1-F.2 scope — direct-child signal fallback
          proc.lastSignal = signal;
          try { proc.process.kill(signal); } catch { /* already gone */ }
          return {
            success: true,
            session_id: proc.id,
            pid,
            signal,
            tree_kill: false,
            method: 'direct-child-only',
            note: 'POSIX tree kill not implemented in R1-F.2 scope; only the direct child received the signal.'
          };
        }

        // ── Mechanism 1: signal control on the direct child ──
        clearTimers(proc);
        terminateWithEscalation(proc, signal);
        processes.delete(args.session_id);
        return {
          success: true,
          session_id: proc.id,
          pid,
          signal,
          grace_period_ms: signal === 'SIGTERM' ? KILL_GRACE_PERIOD_MS : null,
          tree_kill: false
        };
      }
    },
    {
      name: 'process_list',
      description: 'List all tracked background processes.',
      schema: { type: 'object', properties: {} },
      execute() {
        const list = Array.from(processes.values()).map(p => ({
          id: p.id, command: p.command, running: p.process.exitCode === null && !p.killed,
          exit_code: p.exitCode, uptime_ms: Date.now() - p.startTime,
        }));
        return { processes: list, total: list.length };
      }
    }
  ]
};

export default plugin;
