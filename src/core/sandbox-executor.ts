/**
 * SandboxExecutor — Docker/E2B sandbox for code execution
 * Phase 5.2b: execute untrusted code in isolated environment
 *
 * Note: This provides the abstraction. Actual Docker/E2B integration
 * requires those runtimes to be available. Falls back to local exec
 * when sandbox is unavailable.
 */

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
}

export interface SandboxConfig {
  /** Default timeout in ms */
  defaultTimeout: number;
  /** Enable sandbox isolation (requires Docker) */
  useDocker: boolean;
  /** Docker image to use */
  dockerImage?: string;
}

const DEFAULT_CONFIG: SandboxConfig = {
  defaultTimeout: 30_000,
  useDocker: false,
};

export class SandboxExecutor {
  private config: SandboxConfig;

  constructor(config?: Partial<SandboxConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Execute code in sandbox.
   * Falls back to local eval for JS/TS when Docker unavailable.
   */
  async execute(request: SandboxRequest): Promise<SandboxResult> {
    const start = Date.now();
    const timeout = request.timeout || this.config.defaultTimeout;

    if (this.config.useDocker && this.config.dockerImage) {
      return this.executeDocker(request, timeout, start);
    }

    return this.executeLocal(request, timeout, start);
  }

  /**
   * Execute code via Node.js vm module (JS/TS only).
   */
  private async executeLocal(
    request: SandboxRequest,
    timeout: number,
    start: number,
  ): Promise<SandboxResult> {
    if (request.language !== 'javascript' && request.language !== 'typescript') {
      return {
        success: false,
        stdout: '',
        stderr: `SandboxExecutor: Unsupported language "${request.language}" for local execution. Use Docker sandbox.`,
        exitCode: -1,
        durationMs: Date.now() - start,
      };
    }

    try {
      const capturedStdout: string[] = [];
      const mockConsole = { log: (...args: any[]) => capturedStdout.push(args.join(' ')) };

      const vm = await import('vm');
      const context = vm.createContext({ console: mockConsole, ...(request.envVars || {}) });
      const script = new vm.Script(request.code);

      script.runInContext(context, { timeout });

      return {
        success: true,
        stdout: capturedStdout.join('\n'),
        stderr: '',
        exitCode: 0,
        durationMs: Date.now() - start,
      };
    } catch (err: any) {
      return {
        success: false,
        stdout: '',
        stderr: err.message,
        exitCode: 1,
        durationMs: Date.now() - start,
      };
    }
  }

  /**
   * Execute code in Docker container.
   * Placeholder — requires child_process exec of `docker run`.
   */
  private async executeDocker(
    request: SandboxRequest,
    timeout: number,
    start: number,
  ): Promise<SandboxResult> {
    // Docker execution requires actual Docker daemon.
    // This is the integration point for production deployments.
    return {
      success: false,
      stdout: '',
      stderr: `SandboxExecutor: Docker execution not yet implemented. Pass useDocker=false for local execution.`,
      exitCode: -1,
      durationMs: Date.now() - start,
    };
  }

  setConfig(config: Partial<SandboxConfig>): void {
    Object.assign(this.config, config);
  }

  getConfig(): SandboxConfig {
    return { ...this.config };
  }
}

export default SandboxExecutor;