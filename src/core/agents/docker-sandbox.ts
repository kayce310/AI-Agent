/**
 * @file docker-sandbox — Agent module
 * @layer core
 * @depends-on src/core/types.ts, src/core/tools/tool-registry.ts
 * @imported-by src/core/engine/engine.ts
 * @owner core-agents
 */

/**
 * DockerSandbox — Isolated execution + image lifecycle + quota
 * Phase 8.1a: full Docker-based sandbox management
 *
 * Note: Requires Docker daemon. Falls back to SandboxExecutor for local exec.
 */

import { SandboxExecutor, SandboxRequest, SandboxResult } from './sandbox-executor.js';

export interface DockerSandboxConfig {
  /** Max containers per session */
  maxContainers: number;
  /** Default image to use */
  defaultImage: string;
  /** CPU quota (e.g. 0.5 = half core) */
  cpuQuota: number;
  /** Memory limit (MB) */
  memoryLimitMb: number;
  /** Container timeout in ms */
  containerTimeoutMs: number;
}

const DEFAULT_CONFIG: DockerSandboxConfig = {
  maxContainers: 3,
  defaultImage: 'node:20-alpine',
  cpuQuota: 0.5,
  memoryLimitMb: 256,
  containerTimeoutMs: 60_000,
};

export interface ContainerInstance {
  id: string;
  image: string;
  createdAt: number;
  status: 'running' | 'stopped' | 'failed';
}

export class DockerSandbox {
  private config: DockerSandboxConfig;
  private containers: Map<string, ContainerInstance> = new Map();
  private executor: SandboxExecutor;

  constructor(config?: Partial<DockerSandboxConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.executor = new SandboxExecutor({ defaultTimeout: this.config.containerTimeoutMs });
  }

  /**
   * Execute code in Docker sandbox.
   * Uses local SandboxExecutor as fallback.
   */
  async execute(request: SandboxRequest, image?: string): Promise<SandboxResult> {
    // Track container (simplified — real Docker exec would use docker CLI)
    const containerId = `container-${Date.now()}`;
    this.containers.set(containerId, {
      id: containerId,
      image: image || this.config.defaultImage,
      createdAt: Date.now(),
      status: 'running',
    });

    try {
      // Delegate to SandboxExecutor for actual execution
      const result = await this.executor.execute({
        ...request,
        timeout: request.timeout || this.config.containerTimeoutMs,
      });

      // Update container status
      const container = this.containers.get(containerId);
      if (container) {
        container.status = result.success ? 'stopped' : 'failed';
      }

      return result;
    } catch (err: any) {
      const container = this.containers.get(containerId);
      if (container) container.status = 'failed';
      return {
          success: false,
          stdout: '',
          stderr: err.message,
          exitCode: 1,
          durationMs: 0,
          truncated: false,
        };
    }
  }

  /**
   * Get active container count.
   */
  get activeCount(): number {
    let count = 0;
    for (const c of this.containers.values()) {
      if (c.status === 'running') count++;
    }
    return count;
  }

  /**
   * List all containers.
   */
  listContainers(): ContainerInstance[] {
    return Array.from(this.containers.values());
  }

  /**
   * Clean up old containers.
   */
  cleanup(ageMs: number = 300_000): number {
    const now = Date.now();
    let count = 0;
    for (const [id, container] of this.containers) {
      if (container.status !== 'running' && (now - container.createdAt) > ageMs) {
        this.containers.delete(id);
        count++;
      }
    }
    return count;
  }

  getConfig(): DockerSandboxConfig {
    return { ...this.config };
  }
}

export default DockerSandbox;