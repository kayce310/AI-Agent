/**
 * SandboxExecutor — WSL2 Bridge + Bubblewrap isolated execution
 * Phase 5.2b: execute untrusted code in bwrap sandbox via WSL2
 *
 * Architecture:
 *   Node.js (Windows) → spawn('wsl.exe') → Linux → bwrap → python3/node
 *
 * Security:
 *   - bwrap --unshare-all (namespace isolation)
 *   - --unshare-net (network isolation)
 *   - --ro-bind / / (read-only rootfs)
 *   - --tmpfs /etc, /home, /root, /mnt (mount-over hiding)
 *   - --dev /dev (safe /dev)
 *   - File-based code execution (no stdin injection)
 *   - Output truncation (max 2000 chars per stream)
 */

import { spawn } from 'child_process';
import * as path from 'path';

export interface SandboxRequest {
  code: string;
  language: 'javascript' | 'typescript' | 'python' | 'bash' | 'unknown';
  timeout?: number;
  envVars?: Record<string, string>;
}

export interface SandboxResult {
  success: boolean;
  stdout: string;
  stderr: string;
  exitCode: number;
  durationMs: number;
  truncated: boolean;
}

export interface SandboxConfig {
  /** Default timeout in ms */
  defaultTimeout: number;
  /** Enable WSL2 bridge sandbox */
  useWSL: number;
  /** Max output length per stream (stdout/stderr) */
  maxOutputLength: number;
  /** Temp directory inside WSL for code files */
  wslTempDir: string;
}

const DEFAULT_CONFIG: SandboxConfig = {
  defaultTimeout: 30_000,
  useWSL: 1,
  maxOutputLength: 2000,
  wslTempDir: '/tmp/kato_exec',
};

// ── Output Truncation ──

/**
 * Truncate output to maxLen characters.
 * If exceeded, keeps first half + [...TRUNCATED...] + last half.
 */
function truncateOutput(output: string, maxLen: number): { text: string; truncated: boolean } {
  if (output.length <= maxLen) {
    return { text: output, truncated: false };
  }

  const half = Math.floor((maxLen - 15) / 2); // 15 = length of "\n[...TRUNCATED...]\n"
  const start = output.substring(0, half);
  const end = output.substring(output.length - half);

  return {
    text: `${start}\n[...TRUNCATED...]\n${end}`,
    truncated: true,
  };
}

// ── File Extension Map ──

function getFileExtension(language: string): string {
  switch (language) {
    case 'python': return '.py';
    case 'bash': return '.sh';
    case 'javascript': return '.js';
    case 'typescript': return '.ts';
    default: return '.txt';
  }
}

function getRunner(language: string): string {
  switch (language) {
    case 'python': return 'python3';
    case 'bash': return 'bash';
    case 'javascript':
    case 'typescript':
    default: return 'node';
  }
}

// ── SandboxExecutor ──

export class SandboxExecutor {
  private config: SandboxConfig;

  constructor(config?: Partial<SandboxConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Execute code in bwrap sandbox via WSL2 bridge.
   * Code is written to a temp file inside WSL, then executed.
   */
  async execute(request: SandboxRequest): Promise<SandboxResult> {
    const start = Date.now();
    const timeout = request.timeout || this.config.defaultTimeout;

    if (!this.config.useWSL) {
      return {
        success: false,
        stdout: '',
        stderr: 'WSL2 sandbox is disabled. Enable useWSL in config.',
        exitCode: -1,
        durationMs: Date.now() - start,
        truncated: false,
      };
    }

    return this.executeWSL(request, timeout, start);
  }

  /**
   * Execute code via WSL2 → bwrap sandbox.
   * Code is written to temp file, then executed.
   */
  private executeWSL(
    request: SandboxRequest,
    timeout: number,
    start: number,
  ): Promise<SandboxResult> {
    const runner = getRunner(request.language);
    const ext = getFileExtension(request.language);
    const fileName = `run_${Date.now()}${ext}`;
    const wslFilePath = path.posix.join(this.config.wslTempDir, fileName);

    return new Promise((resolve) => {
      let stdout = '';
      let stderr = '';
      let timedOut = false;
      let exited = false;

      // Step 1: Create temp dir and write code file inside WSL
      const setupCmd = `mkdir -p ${this.config.wslTempDir} && cat > ${wslFilePath}`;

      const setupChild = spawn('wsl.exe', ['bash', '-c', setupCmd], {
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      setupChild.stdin.write(request.code);
      setupChild.stdin.end();

      setupChild.on('close', (setupCode) => {
        if (setupCode !== 0) {
          resolve({
            success: false,
            stdout: '',
            stderr: `Failed to write code file in WSL (exit ${setupCode})`,
            exitCode: setupCode ?? 1,
            durationMs: Date.now() - start,
            truncated: false,
          });
          return;
        }

        // Step 2: Execute the file inside bwrap sandbox
        const bwrapArgs = [
          'bwrap',
          '--ro-bind', '/', '/',
          '--tmpfs', '/etc',
          '--tmpfs', '/home',
          '--tmpfs', '/root',
          '--tmpfs', '/mnt',
          '--dev', '/dev',
          '--unshare-all',
          '--unshare-net',
          '--clearenv',
          '--setenv', 'PATH', '/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin',
          '--setenv', 'HOME', '/tmp',
          runner,
          wslFilePath,
        ];

        const child = spawn('wsl.exe', bwrapArgs, { stdio: ['pipe', 'pipe', 'pipe'] });

        const timer = setTimeout(() => {
          timedOut = true;
          child.kill();
          if (!exited) {
            exited = true;
            resolve({
              success: false,
              stdout: truncateOutput(stdout, this.config.maxOutputLength).text,
              stderr: 'Execution timed out',
              exitCode: -1,
              durationMs: Date.now() - start,
              truncated: true,
            });
          }
        }, timeout);

        child.stdout.on('data', (data: Buffer) => { stdout += data.toString(); });
        child.stderr.on('data', (data: Buffer) => { stderr += data.toString(); });

        child.on('error', (err: Error) => {
          if (timedOut || exited) return;
          clearTimeout(timer);
          exited = true;
          resolve({
            success: false,
            stdout: truncateOutput(stdout, this.config.maxOutputLength).text,
            stderr: `WSL2 bridge error: ${err.message}`,
            exitCode: -1,
            durationMs: Date.now() - start,
            truncated: false,
          });
        });

        child.on('close', (code: number | null) => {
          if (timedOut || exited) return;
          clearTimeout(timer);
          exited = true;

          // Step 3: Cleanup temp file
          spawn('wsl.exe', ['rm', '-f', wslFilePath]).on('close', () => {});

          // Truncate outputs
          const truncatedStdout = truncateOutput(stdout, this.config.maxOutputLength);
          const truncatedStderr = truncateOutput(stderr, this.config.maxOutputLength);

          resolve({
            success: code === 0,
            stdout: truncatedStdout.text,
            stderr: truncatedStderr.text,
            exitCode: code ?? 1,
            durationMs: Date.now() - start,
            truncated: truncatedStdout.truncated || truncatedStderr.truncated,
          });
        });
      });

      setupChild.on('error', (err: Error) => {
        resolve({
          success: false,
          stdout: '',
          stderr: `WSL2 setup error: ${err.message}`,
          exitCode: -1,
          durationMs: Date.now() - start,
          truncated: false,
        });
      });
    });
  }

  setConfig(config: Partial<SandboxConfig>): void {
    Object.assign(this.config, config);
  }

  getConfig(): SandboxConfig {
    return { ...this.config };
  }
}

export default SandboxExecutor;
