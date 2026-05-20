/**
 * MemoryTemporal — Time-indexed block storage with Append-Log Persistence
 *
 * Architecture (inspired by mem0):
 * - MemoryBlock: core unit with id, content, createdAt, metadata
 * - Temporal queries: timeRange, agentId, sessionId, world, limit
 * - Persistence: backed by MemoryLog (append-log) — survives restart
 * - History: tracks all mutations (add/delete) for audit
 *
 * Differences from mem0:
 * - No vector store (pure temporal/keyword in this layer)
 * - Uses append-log instead of SQLite for persistence
 * - Lightweight: no LLM inference, no embedding
 */

import path from 'path';
import { MemoryLog, createMemoryLog, MemoryBlock, MemoryBlockType } from './memory-log.js';

// ── Query Types (mem0-inspired SearchFilters) ──

export interface TemporalQuery {
  /** Time range filter */
  timeRange?: {
    start: string; // ISO 8601
    end: string;   // ISO 8601
  };
  /** Filter by agent */
  agentId?: string;
  /** Filter by session */
  sessionId?: string;
  /** Filter by world/context */
  world?: string;
  /** Filter by block type */
  type?: MemoryBlockType;
  /** Filter by tags */
  tags?: string[];
  /** Max results */
  limit?: number;
}

export interface MemoryItem {
  id: string;
  memory: string;
  hash?: string;
  createdAt: string;
  updatedAt?: string;
  score?: number;
  metadata?: Record<string, any>;
}

export interface MemoryConfig {
  logDir?: string;
  maxRetentionDays?: number;
  maxBlockSize?: number;
}

// ── MemoryTemporal Class ──

export class MemoryTemporal {
  private log!: MemoryLog;
  private loaded = false;
  private config: Required<MemoryConfig>;

  /** In-memory index rebuilt from append-log on init */
  private blocks: Map<string, MemoryBlock> = new Map();

  constructor(config?: MemoryConfig) {
    this.config = {
      logDir: config?.logDir ?? path.join(process.cwd(), 'knowledge', 'memory-temporal'),
      maxRetentionDays: config?.maxRetentionDays ?? 30,
      maxBlockSize: config?.maxBlockSize ?? 1024,
    };
  }

  // ── Lifecycle ──

  async init(): Promise<void> {
    if (this.loaded) return;

    this.log = await createMemoryLog(this.config.logDir);
    const replayed = await this.log.replay();
    this.blocks = new Map(replayed.map(b => [b.id, b]));
    this.loaded = true;
  }

  private async ensureLoaded(): Promise<void> {
    if (!this.loaded) await this.init();
  }

  // ── Write Operations (persisted via append-log) ──

  /**
   * Add a new memory block. Persisted to append-log (O(1)).
   */
  async addBlock(content: string, opts?: {
    type?: MemoryBlockType;
    agentId?: string;
    sessionId?: string;
    world?: string;
    tags?: string[];
    entities?: string[];
    parentId?: string;
    metadata?: Record<string, any>;
  }): Promise<MemoryBlock> {
    await this.ensureLoaded();

    const block: MemoryBlock = {
      id: `mem_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`,
      type: opts?.type ?? 'fact',
      content,
      timestamp: new Date().toISOString(),
      entities: opts?.entities?.length ? opts.entities : undefined,
      tags: [
        ...(opts?.tags ?? []),
        ...(opts?.agentId ? [`agent:${opts.agentId}`] : []),
        ...(opts?.world ? [`world:${opts.world}`] : []),
      ].length > 0 ? [...new Set([...(opts?.tags ?? []), ...(opts?.agentId ? [`agent:${opts.agentId}`] : []), ...(opts?.world ? [`world:${opts.world}`] : [])])] : undefined,
      sessionId: opts?.sessionId,
      parentId: opts?.parentId,
    };

    this.blocks.set(block.id, block);
    await this.log.append({ op: 'add', block });

    return block;
  }

  /**
   * Delete a block by ID. Persisted as 'clear' + re-add remaining (append-only).
   */
  async deleteBlock(id: string): Promise<boolean> {
    await this.ensureLoaded();

    if (!this.blocks.has(id)) return false;

    this.blocks.delete(id);

    // Rebuild snapshot for remaining blocks
    const remaining = Array.from(this.blocks.values());
    await this.log.append({ op: 'clear' });
    if (remaining.length > 0) {
      await this.log.append({ op: 'addMany', blocks: remaining });
    }

    return true;
  }

  // ── Temporal Query Engine ──

  /**
   * Query blocks with structured filters (mem0-inspired).
   */
  async query(q: TemporalQuery): Promise<MemoryItem[]> {
    await this.ensureLoaded();

    let results = Array.from(this.blocks.values());

    // Filter by time range
    if (q.timeRange) {
      const start = new Date(q.timeRange.start).getTime();
      const end = new Date(q.timeRange.end).getTime();
      results = results.filter(b => {
        const ts = new Date(b.timestamp).getTime();
        return ts >= start && ts <= end;
      });
    }

    // Filter by agentId (stored in tags as "agent:<id>")
    if (q.agentId) {
      const tag = `agent:${q.agentId}`;
      results = results.filter(b => b.tags?.includes(tag));
    }

    // Filter by sessionId
    if (q.sessionId) {
      results = results.filter(b => b.sessionId === q.sessionId);
    }

    // Filter by world (stored in tags as "world:<name>")
    if (q.world) {
      const tag = `world:${q.world}`;
      results = results.filter(b => b.tags?.includes(tag));
    }

    // Filter by type
    if (q.type) {
      results = results.filter(b => b.type === q.type);
    }

    // Filter by tags
    if (q.tags?.length) {
      results = results.filter(b =>
        q.tags!.some(t => b.tags?.includes(t))
      );
    }

    // Sort by timestamp descending (newest first)
    results.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Apply limit
    const limit = q.limit ?? 10;
    results = results.slice(0, limit);

    // Map to MemoryItem
    return results.map(b => ({
      id: b.id,
      memory: b.content,
      createdAt: b.timestamp,
      score: 1.0,
      metadata: {
        type: b.type,
        tags: b.tags,
        sessionId: b.sessionId,
        entities: b.entities,
        parentId: b.parentId,
      },
    }));
  }

  /**
   * Get most recent N blocks within retention window.
   */
  async getRecentBlocks(limit: number = 10): Promise<MemoryItem[]> {
    return this.query({ limit });
  }

  /**
   * Get blocks by world/context.
   */
  async getBlocksByWorld(world: string, limit?: number): Promise<MemoryItem[]> {
    return this.query({ world, limit });
  }

  /**
   * Get blocks by agent.
   */
  async getBlocksByAgent(agentId: string, limit?: number): Promise<MemoryItem[]> {
    return this.query({ agentId, limit });
  }

  /**
   * Get blocks by session.
   */
  async getBlocksBySession(sessionId: string, limit?: number): Promise<MemoryItem[]> {
    return this.query({ sessionId, limit });
  }

  /**
   * Get a single block by ID.
   */
  async getBlock(id: string): Promise<MemoryBlock | undefined> {
    await this.ensureLoaded();
    return this.blocks.get(id);
  }

  /**
   * Get all blocks (optionally filtered by type).
   */
  async getAll(type?: MemoryBlockType): Promise<MemoryBlock[]> {
    await this.ensureLoaded();
    const all = Array.from(this.blocks.values());
    if (type) return all.filter(b => b.type === type);
    return all;
  }

  // ── Stats ──

  getStats(): { totalBlocks: number; logSeq: number } {
    return {
      totalBlocks: this.blocks.size,
      logSeq: this.log.getStats().lastSeq,
    };
  }

  // ── Persistence ──

  /**
   * Force a snapshot flush.
   */
  async flush(): Promise<void> {
    await this.ensureLoaded();
    await this.log.createSnapshot(Array.from(this.blocks.values()));
  }

  /**
   * Close the temporal memory (flush + close log).
   */
  async close(): Promise<void> {
    if (this.loaded) {
      await this.flush();
      await this.log.close();
      this.loaded = false;
    }
  }
}

export default MemoryTemporal;
