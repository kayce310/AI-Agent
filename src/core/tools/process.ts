/**
 * @file process — Tool plugin
 * @layer core
 * @owner core-tools
 *
 * Background process management: spawn, poll, kill, log.
 * Lightweight — tracks processes in-memory.
 */
import { spawn, ChildProcess } from 'child_process';
import type { ToolPlugin } from './tool-registry.js';
import { BASE_PATH } from './_shared.js';

interface TrackedProcess {
  id: string;
  command: string;
  process: ChildProcess;
  stdout: string;
  stderr: string;
  exitCode: number | null;
  startTime: number;
  killed: boolean;
}

const processes = new Map<string, TrackedProcess>();
let nextId = 1;

const plugin: ToolPlugin = {
  name: 'process',
  tools: [
    {
      name: 'process_start',
      description: 'Start a background process. Returns session_id for polling. Use for long-running commands (servers, builds, tests).',
      schema: {
        type: 'object',
        properties: {
          command: { type: 'string', description: 'Command to run' },
          workdir: { type: 'string', description: 'Working directory (default: project root)' }
        },
        required: ['command']
      },
      execute(args: Record<string, any>) {
        const { command, workdir } = args;
        if (!command) return { error: 'command is required' };

        const id = `proc-${nextId++}`;
        const cwd = workdir || BASE_PATH;

        try {
          const child = spawn(command, { shell: true, cwd, stdio: 'pipe', windowsHide: true });
          const tracked: TrackedProcess = {
            id, command, process: child,
            stdout: '', stderr: '', exitCode: null,
            startTime: Date.now(), killed: false,
          };

          child.stdout?.on('data', (d: Buffer) => {
            tracked.stdout += d.toString();
            if (tracked.stdout.length > 500000) tracked.stdout = tracked.stdout.slice(-400000);
          });
          child.stderr?.on('data', (d: Buffer) => {
            tracked.stderr += d.toString();
            if (tracked.stderr.length > 500000) tracked.stderr = tracked.stderr.slice(-400000);
          });
          child.on('exit', (code) => { tracked.exitCode = code; });

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
      description: 'Kill a background process.',
      schema: {
        type: 'object',
        properties: { session_id: { type: 'string' } },
        required: ['session_id']
      },
      execute(args: Record<string, any>) {
        const proc = processes.get(args.session_id);
        if (!proc) return { error: `Process ${args.session_id} not found` };
        proc.killed = true;
        proc.process.kill('SIGTERM');
        return { success: true, session_id: proc.id, signal: 'SIGTERM' };
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
