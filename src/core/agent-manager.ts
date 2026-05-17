/**
 * AgentManager — Sub-agent lifecycle (spawn/kill/timeout)
 * Phase 5.3a: manage concurrent agent instances
 */

import { EventEmitter } from 'events';

export interface AgentInstance {
  id: string;
  name: string;
  status: 'running' | 'completed' | 'failed' | 'timeout';
  createdAt: number;
  completedAt?: number;
  result?: unknown;
  error?: string;
}

export interface AgentManagerConfig {
  maxConcurrency: number;
  defaultTimeoutMs: number;
}

const DEFAULT_CONFIG: AgentManagerConfig = {
  maxConcurrency: 5,
  defaultTimeoutMs: 120_000,
};

export class AgentManager extends EventEmitter {
  private agents: Map<string, AgentInstance> = new Map();
  private config: AgentManagerConfig;
  private timers: Map<string, NodeJS.Timeout> = new Map();

  constructor(config?: Partial<AgentManagerConfig>) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Spawn a new sub-agent.
   */
  spawn(name: string, timeoutMs?: number): AgentInstance {
    if (this.activeCount >= this.config.maxConcurrency) {
      throw new Error(`AgentManager: max concurrency (${this.config.maxConcurrency}) reached`);
    }

    const id = `agent-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    const agent: AgentInstance = {
      id,
      name,
      status: 'running',
      createdAt: Date.now(),
    };

    this.agents.set(id, agent);
    this.emit('agent:spawn', agent);

    // Auto-timeout
    const timeout = timeoutMs || this.config.defaultTimeoutMs;
    const timer = setTimeout(() => {
      this.timeout(id);
    }, timeout);
    this.timers.set(id, timer);

    return agent;
  }

  /**
   * Mark an agent as completed.
   */
  complete(id: string, result?: unknown): AgentInstance | undefined {
    const agent = this.agents.get(id);
    if (!agent) return undefined;

    agent.status = 'completed';
    agent.completedAt = Date.now();
    agent.result = result;
    this.clearTimer(id);
    this.emit('agent:complete', agent);
    return agent;
  }

  /**
   * Mark an agent as failed.
   */
  fail(id: string, error: string): AgentInstance | undefined {
    const agent = this.agents.get(id);
    if (!agent) return undefined;

    agent.status = 'failed';
    agent.completedAt = Date.now();
    agent.error = error;
    this.clearTimer(id);
    this.emit('agent:fail', agent);
    return agent;
  }

  /**
   * Kill an agent by ID.
   */
  kill(id: string): boolean {
    const agent = this.agents.get(id);
    if (!agent) return false;

    agent.status = 'failed';
    agent.completedAt = Date.now();
    agent.error = 'Agent killed';
    this.clearTimer(id);
    this.emit('agent:kill', agent);
    return true;
  }

  /**
   * Kill all running agents.
   */
  killAll(): number {
    let count = 0;
    for (const [id, agent] of this.agents) {
      if (agent.status === 'running') {
        this.kill(id);
        count++;
      }
    }
    return count;
  }

  /**
   * Get agent by ID.
   */
  get(id: string): AgentInstance | undefined {
    return this.agents.get(id);
  }

  /**
   * List all agents.
   */
  list(): AgentInstance[] {
    return Array.from(this.agents.values());
  }

  /**
   * Get count of running agents.
   */
  get activeCount(): number {
    let count = 0;
    for (const a of this.agents.values()) {
      if (a.status === 'running') count++;
    }
    return count;
  }

  /**
   * Remove completed/failed agents older than ageMs.
   */
  prune(ageMs: number = 300_000): number {
    const now = Date.now();
    let count = 0;
    for (const [id, agent] of this.agents) {
      if (agent.status !== 'running' && agent.completedAt && (now - agent.completedAt) > ageMs) {
        this.agents.delete(id);
        count++;
      }
    }
    return count;
  }

  private timeout(id: string): void {
    const agent = this.agents.get(id);
    if (agent && agent.status === 'running') {
      agent.status = 'timeout';
      agent.completedAt = Date.now();
      agent.error = `Agent timed out after ${this.config.defaultTimeoutMs}ms`;
      this.emit('agent:timeout', agent);
    }
  }

  private clearTimer(id: string): void {
    const timer = this.timers.get(id);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(id);
    }
  }
}

export default AgentManager;