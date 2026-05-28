/**
 * @file agent-manager — Sub-Agent Lifecycle Manager
 * @layer core
 * @depends-on src/core/engine/agent.ts, src/core/llm/model-adapter.ts, src/core/tools/tool-registry.ts
 * @imported-by src/core/engine/orchestrator.ts
 * @owner core-agents
 *
 * Inspired by Hermes Agent delegate_tool.py — spawn isolated subagents
 * with independent iteration budgets and lifecycle management.
 *
 * Key features:
 * - Sub-agents run in-process (new Agent instances)
 * - Each sub-agent has its own tool call budget
 * - Timeout mechanism prevents runaway sub-agents
 * - Results collected and reported back to parent
 * - Stats tracking for observability
 */

import { Agent, AgentConfig, AgentResult } from '../engine/agent.js';
import { ModelRouter } from '../llm/model-adapter.js';
import { ToolRegistry } from '../tools/tool-registry.js';
import { HookRegistry, globalHooks } from '../hooks.js';
import { Tracer } from '../observability/tracer.js';
import { EngineRequest } from '../types.js';

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

export type SubAgentStatus = 'pending' | 'running' | 'completed' | 'failed' | 'timed_out' | 'killed';

export interface SubAgentConfig {
  /** Unique identifier for the sub-agent */
  id: string;
  /** Session ID (inherited from parent) */
  sessionId: string;
  /** Task to execute */
  task: string;
  /** Optional system prompt override */
  systemPrompt?: string;
  /** Max tool call cycles (default: 5) */
  maxToolCycles?: number;
  /** Timeout in ms (default: 30000 = 30s) */
  timeoutMs?: number;
  /** Model router (shared from parent) */
  modelRouter: ModelRouter;
  /** Tool registry (shared from parent) */
  toolRegistry: ToolRegistry;
  /** Optional hooks (shared from parent) */
  hooks?: HookRegistry;
  /** Optional tracer */
  tracer?: Tracer;
  /** Debug mode */
  debug?: boolean;
}

export interface SubAgentInstance {
  id: string;
  sessionId: string;
  task: string;
  status: SubAgentStatus;
  startedAt: string;
  finishedAt?: string;
  durationMs?: number;
  result?: AgentResult;
  error?: string;
}

export interface AgentManagerStats {
  total: number;
  active: number;
  completed: number;
  failed: number;
  timedOut: number;
  killed: number;
}

// ──────────────────────────────────────────────
// AgentManager Class
// ──────────────────────────────────────────────

export class AgentManager {
  private subAgents = new Map<string, SubAgentInstance>();
  private activeTimers = new Map<string, NodeJS.Timeout>();
  private activeAgents = new Map<string, Agent>();
  private hooks: HookRegistry;

  constructor(hooks?: HookRegistry) {
    this.hooks = hooks ?? globalHooks;
  }

  // ── Lifecycle ──

  /**
   * Spawn a new sub-agent with its own iteration budget.
   * The sub-agent runs asynchronously — use getResult() or waitFor() to collect results.
   *
   * @returns The sub-agent ID
   */
  async spawn(config: SubAgentConfig): Promise<string> {
    const { id, sessionId, task, modelRouter, toolRegistry } = config;

    if (this.subAgents.has(id)) {
      throw new Error(`Sub-agent "${id}" already exists`);
    }

    const maxToolCycles = config.maxToolCycles ?? 5;
    const timeoutMs = config.timeoutMs ?? 30_000;

    // Create instance record
    const instance: SubAgentInstance = {
      id,
      sessionId,
      task,
      status: 'pending',
      startedAt: new Date().toISOString(),
    };
    this.subAgents.set(id, instance);

    // Emit spawn event
    await this.hooks.emit('subagent:spawn', {
      subAgentId: id,
      sessionId,
      task: task.substring(0, 100),
      maxToolCycles,
      timeoutMs,
    });

    // Create Agent instance
    const agentConfig: AgentConfig = {
      modelRouter,
      toolRegistry,
      hooks: config.hooks,
      tracer: config.tracer,
      maxToolCycles,
      debug: config.debug ?? false,
    };
    const agent = new Agent(agentConfig);
    this.activeAgents.set(id, agent);

    // Set timeout
    const timer = setTimeout(async () => {
      await this.handleTimeout(id);
    }, timeoutMs);
    this.activeTimers.set(id, timer);

    // Execute asynchronously
    instance.status = 'running';
    this.executeSubAgent(id, agent, task, sessionId, config.systemPrompt)
      .catch((err) => this.handleError(id, err));

    return id;
  }

  /**
   * Wait for a sub-agent to complete and return its result.
   * Polls every 100ms until done or timeout.
   */
  async waitFor(agentId: string, pollMs = 100, maxWaitMs = 60_000): Promise<SubAgentInstance> {
    const deadline = Date.now() + maxWaitMs;

    while (Date.now() < deadline) {
      const instance = this.subAgents.get(agentId);
      if (!instance) throw new Error(`Sub-agent "${agentId}" not found`);

      if (instance.status !== 'pending' && instance.status !== 'running') {
        return instance;
      }

      await new Promise(r => setTimeout(r, pollMs));
    }

    // Timeout waiting
    await this.kill(agentId);
    const instance = this.subAgents.get(agentId)!;
    instance.status = 'timed_out';
    instance.error = `Wait timeout (${maxWaitMs}ms)`;
    return instance;
  }

  /**
   * Wait for all specified sub-agents to complete.
   * Uses Promise.allSettled for parallel waiting.
   */
  async waitForAll(agentIds: string[], pollMs = 100, maxWaitMs = 60_000): Promise<SubAgentInstance[]> {
    const results = await Promise.allSettled(
      agentIds.map(id => this.waitFor(id, pollMs, maxWaitMs))
    );

    return results.map(r => {
      if (r.status === 'fulfilled') return r.value;
      // Should not happen — waitFor handles timeouts internally
      return this.subAgents.get('')!;
    }).filter(Boolean);
  }

  /**
   * Kill a sub-agent by ID.
   * Clears timeout timer and marks as killed.
   */
  async kill(agentId: string): Promise<void> {
    const instance = this.subAgents.get(agentId);
    if (!instance) throw new Error(`Sub-agent "${agentId}" not found`);

    if (instance.status === 'completed' || instance.status === 'killed' || instance.status === 'timed_out') {
      return; // Already terminal
    }

    // Clear timeout timer
    this.clearTimer(agentId);

    // Clean up agent
    this.activeAgents.delete(agentId);

    // Update instance
    instance.status = 'killed';
    instance.finishedAt = new Date().toISOString();
    if (!instance.error) {
      instance.error = 'Killed by parent';
    }

    await this.hooks.emit('subagent:killed', {
      subAgentId: agentId,
      sessionId: instance.sessionId,
    });
  }

  /**
   * Kill all active sub-agents.
   */
  async killAll(): Promise<void> {
    const activeIds = Array.from(this.subAgents.entries())
      .filter(([_, inst]) => inst.status === 'pending' || inst.status === 'running')
      .map(([id]) => id);

    await Promise.all(activeIds.map(id => this.kill(id)));
  }

  // ── Query ──

  /**
   * Get a sub-agent instance by ID.
   */
  get(agentId: string): SubAgentInstance | undefined {
    return this.subAgents.get(agentId);
  }

  /**
   * List all sub-agent instances.
   */
  list(): SubAgentInstance[] {
    return Array.from(this.subAgents.values());
  }

  /**
   * Get active (pending + running) sub-agent instances.
   */
  listActive(): SubAgentInstance[] {
    return this.list().filter(s => s.status === 'pending' || s.status === 'running');
  }

  /**
   * Get completed sub-agent instances.
   */
  listCompleted(): SubAgentInstance[] {
    return this.list().filter(s => s.status === 'completed');
  }

  /**
   * Get failed sub-agent instances (failed + timed_out + killed).
   */
  listFailed(): SubAgentInstance[] {
    return this.list().filter(s =>
      s.status === 'failed' || s.status === 'timed_out' || s.status === 'killed'
    );
  }

  /**
   * Get aggregate stats.
   */
  getStats(): AgentManagerStats {
    const all = this.list();
    return {
      total: all.length,
      active: all.filter(s => s.status === 'pending' || s.status === 'running').length,
      completed: all.filter(s => s.status === 'completed').length,
      failed: all.filter(s => s.status === 'failed').length,
      timedOut: all.filter(s => s.status === 'timed_out').length,
      killed: all.filter(s => s.status === 'killed').length,
    };
  }

  /**
   * Count active sub-agents.
   */
  get activeCount(): number {
    return this.listActive().length;
  }

  // ── Private: Execution ──

  private async executeSubAgent(
    id: string,
    agent: Agent,
    task: string,
    sessionId: string,
    systemPrompt?: string,
  ): Promise<void> {
    const instance = this.subAgents.get(id)!;

    try {
      const request: EngineRequest = {
        sessionId,
        messages: [{ role: 'user', content: task }],
        modelId: 'default',
        agentName: `sub-agent:${id}`,
        protocol: 'sub-agent',
        mentionPrefix: '',
        task,
        systemPrompt: systemPrompt || undefined,
      };

      const result = await agent.run(request);

      // Check if we were killed during execution
      if (instance.status === 'killed') return;

      instance.status = 'completed';
      instance.result = result;
      instance.finishedAt = new Date().toISOString();
      instance.durationMs = instance.finishedAt
        ? new Date(instance.finishedAt).getTime() - new Date(instance.startedAt).getTime()
        : undefined;

      await this.hooks.emit('subagent:completed', {
        subAgentId: id,
        sessionId,
        toolCycles: result.toolCycles,
        modelUsed: result.modelUsed,
      });
    } catch (err: any) {
      this.handleError(id, err);
    } finally {
      this.clearTimer(id);
      this.activeAgents.delete(id);
    }
  }

  private async handleTimeout(id: string): Promise<void> {
    const instance = this.subAgents.get(id);
    if (!instance) return;
    if (instance.status !== 'running' && instance.status !== 'pending') return;

    instance.status = 'timed_out';
    instance.finishedAt = new Date().toISOString();
    instance.error = `Sub-agent timed out after ${instance.finishedAt ? new Date(instance.finishedAt).getTime() - new Date(instance.startedAt).getTime() : '?'}ms`;
    this.activeAgents.delete(id);

    await this.hooks.emit('subagent:timeout', {
      subAgentId: id,
      sessionId: instance.sessionId,
    });
  }

  private async handleError(id: string, err: Error): Promise<void> {
    const instance = this.subAgents.get(id);
    if (!instance) return;
    if (instance.status === 'killed') return;

    instance.status = 'failed';
    instance.finishedAt = new Date().toISOString();
    instance.error = err.message;
    this.activeAgents.delete(id);

    await this.hooks.emit('subagent:error', {
      subAgentId: id,
      sessionId: instance.sessionId,
      error: err.message,
    });
  }

  private clearTimer(id: string): void {
    const timer = this.activeTimers.get(id);
    if (timer) {
      clearTimeout(timer);
      this.activeTimers.delete(id);
    }
  }
}
