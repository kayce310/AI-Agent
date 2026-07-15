/**
 * @file memory-store â€” Memory module
 * @layer core
 * @depends-on src/core/types.ts
 * @imported-by src/core/engine/engine.ts
 * @owner core-memory
 */

/**
 * Coral Agent â€” Memory Store (ADD-only + Append-Log Persistence)
 * Phase 4.0b â€” MemoryLog integration
 *
 * Replace cho MemoryCore legacy vá»›i:
 * - ADD-only pattern: khÃ´ng update/delete, chá»‰ append
 * - Multi-signal retrieval: text similarity + type filter + time range
 * - Append-log persistence (O(1) per write, durable, replayable)
 * - Periodic snapshot Ä‘á»ƒ trÃ¡nh replay quÃ¡ dÃ i
 * - Legacy store.json backup cho backward compat
 *
 * Migration path:
 *   1. Táº¡o memory-store.ts má»›i (file nÃ y) vá»›i MemoryLog
 *   2. Legacy file store.json váº«n Ä‘Æ°á»£c ghi nhÆ° backup
 *   3. Sau 1 thá»i gian â†’ drop store.json, chá»‰ dÃ¹ng append-log
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import 'dotenv/config';
import { MemoryLog, createMemoryLog, MemoryBlock, MemoryBlockType } from './memory-log.js';
import { Logger } from '../logger.js';

const log = new Logger({ module: 'MemoryStore' });

// ── Constants ──
const DEFAULT_STORE_PATH = './knowledge/memory-store';
const MAX_BLOCKS_PER_FILE = 500;

// â”€â”€ Types â”€â”€

/** Query options cho retrieval */
export interface MemoryQueryOptions {
  topK?: number;
  types?: MemoryBlockType[];
  timeRange?: [string, string]; // [startISO, endISO]
  tags?: string[];
  sessionId?: string;
}

/** Äá»‹nh nghÄ©a source gá»‘c cho migration */
export interface LegacyMessage {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  timestamp: number;
  reasoning_content?: string;
  tool_call_id?: string;
}

// Re-export for backward compatibility
export type { MemoryBlock, MemoryBlockType };

// ── Memory Store Class ──

/**
 * Minimal async mutex — no dependencies, FIFO ordering.
 * @internal
 */
class SimpleMutex {
  private _locked = false;
  private _pending: Array<() => void> = [];

  acquire(): Promise<void> {
    if (!this._locked) {
      this._locked = true;
      return Promise.resolve();
    }
    return new Promise(resolve => {
      this._pending.push(resolve);
    });
  }

  release(): void {
    const next = this._pending.shift();
    if (next) { next(); return; }
    this._locked = false;
  }
}

export class MemoryStore {
  private storePath: string;
  private blocks: MemoryBlock[] = [];
  private loaded = false;
  private log!: MemoryLog;
  private maxBlocks = 5000;
  private blocksMutex = new SimpleMutex();

  constructor(storePath?: string) {
    this.storePath = storePath || process.env.MEMORY_STORE_PATH || DEFAULT_STORE_PATH;
  }

  /** Configure store limits */
  setMaxBlocks(max: number): void {
    this.maxBlocks = max;
  }

  // â”€â”€ Initialization â”€â”€

  async init(): Promise<void> {
    if (this.loaded) return;

    try {
      await fs.mkdir(this.storePath, { recursive: true });
    } catch (err: any) {
      log.error(`Failed to create store directory: ${err.message}`);
    }

    // Initialize append-log persistence
    this.log = await createMemoryLog(this.storePath);

    // Replay từ log (snapshot + append replay)
    this.blocks = await this.log.replay();

    // Fallback: nếu log trống, thử load từ legacy store.json
    if (this.blocks.length === 0) {
      await this.loadFromDisk();

      // Nếu có legacy data, migrate vào log
      if (this.blocks.length > 0) {
        log.info(`Migrated ${this.blocks.length} block(s) from legacy store`);
        await this.log.append({ op: 'addMany', blocks: this.blocks });
        await this.log.createSnapshot(this.blocks);
      }
    }

    this.loaded = true;

  }

  // â”€â”€ ADD-only Write â”€â”€

  /**
   * ThÃªm má»™t memory block má»›i (ADD-only â€” khÃ´ng update, khÃ´ng delete).
   * Tá»± Ä‘á»™ng táº¡o ID vÃ  timestamp.
   * Ghi vÃ o append-log (O(1)) vÃ  táº¡o snapshot periodic.
   */
  async add(
    type: MemoryBlockType,
    content: string,
    opts?: {
      entities?: string[];
      tags?: string[];
      sessionId?: string;
      parentId?: string;
      /** Time-to-live in ms — auto-evicted after expiry */
      ttl?: number;
      /** Importance score 0.0–1.0 */
      importance?: number;
    },
  ): Promise<MemoryBlock> {
    await this.ensureLoaded();

    await this.blocksMutex.acquire();
    try {
      const now = new Date().toISOString();
    const expiresAt = opts?.ttl ? new Date(Date.now() + opts.ttl).toISOString() : undefined;

    const block: MemoryBlock = {
      id: this.generateId(),
      type,
      content,
      timestamp: now,
      entities: opts?.entities?.length ? opts.entities : undefined,
      tags: opts?.tags?.length ? opts.tags : undefined,
      sessionId: opts?.sessionId || undefined,
      parentId: opts?.parentId || undefined,
      ttl: opts?.ttl || undefined,
      expiresAt,
      importance: opts?.importance || undefined,
    };

    this.blocks.push(block);

    // Evict oldest blocks if over limit
    if (this.blocks.length > this.maxBlocks) {
      // Sort by timestamp, keep newest maxBlocks
      this.blocks.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      this.blocks = this.blocks.slice(0, this.maxBlocks);
    }

    // Ghi vào append-log (O(1))
    await this.log.append({ op: 'add', block });

    // Tạo snapshot nếu cần (periodic: mỗi 1000 ops)
    if (this.log.shouldSnapshot()) {
      await this.log.createSnapshot(this.blocks);
    }

    return block;
    } finally {
      this.blocksMutex.release();
    }
  }

  /**
   * Batch add nhiá»u blocks cÃ¹ng lÃºc.
   * Há»¯u Ã­ch cho migration hoáº·c import.
   */
  async addMany(blocks: Omit<MemoryBlock, 'id' | 'timestamp'>[]): Promise<MemoryBlock[]> {
    const results: MemoryBlock[] = [];

    for (const b of blocks) {
      const block: MemoryBlock = {
        ...b,
        id: this.generateId(),
        timestamp: new Date().toISOString(),
      };
      this.blocks.push(block);
      results.push(block);
    }

    // Evict oldest blocks if over limit
    if (this.blocks.length > this.maxBlocks) {
      this.blocks.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      this.blocks = this.blocks.slice(0, this.maxBlocks);
    }

    // Ghi batch vÃ o append-log (O(1))
    await this.log.append({ op: 'addMany', blocks: results });

    // Táº¡o snapshot náº¿u cáº§n (periodic)
    if (this.log.shouldSnapshot()) {
      await this.log.createSnapshot(this.blocks);
    }

    return results;
  }

  // â”€â”€ Multi-signal Retrieval â”€â”€

  /**
   * Query memory blocks vá»›i multi-signal:
   * - Text similarity (keyword overlap)
   * - Type filter
   * - Time range filter
   * - Tag filter
   * - Session filter
   */
  async query(text: string, opts?: MemoryQueryOptions): Promise<MemoryBlock[]> {
    await this.ensureLoaded();
    await this.blocksMutex.acquire();
    try {
      let results = this.blocks;
    // Filter expired blocks (cleanup runs async via cron)
    const now = Date.now();
    results = results.filter(b => !b.expiresAt || new Date(b.expiresAt).getTime() > now);

    // Filter by type(s)
    if (opts?.types?.length) {
      results = results.filter(b => opts.types!.includes(b.type));
    }

    // Filter by time range
    if (opts?.timeRange) {
      const [start, end] = opts.timeRange;
      results = results.filter(b => {
        return b.timestamp >= start && b.timestamp <= end;
      });
    }

    // Filter by tags
    if (opts?.tags?.length) {
      results = results.filter(b => {
        return b.tags && opts.tags!.some(t => b.tags!.includes(t));
      });
    }

    // Filter by sessionId
    if (opts?.sessionId) {
      results = results.filter(b => b.sessionId === opts.sessionId);
    }

    // Score by keyword overlap với query text
    const queryTokens = this.tokenize(text);
    if (queryTokens.length > 0 && text.trim().length > 0) {
      results = results
        .map(b => ({
          block: b,
          score: this.computeRelevance(b.content, queryTokens),
        }))
        .filter(item => item.score > 0)
        .sort((a, b) => b.score - a.score)
        .map(item => item.block);
    }

    // Apply topK
    const topK = opts?.topK ?? 10;
    return results.slice(0, topK);
    } finally {
      this.blocksMutex.release();
    }
  }

  /**
   * Láº¥y block theo ID
   */
  getBlock(id: string): MemoryBlock | undefined {
    return this.blocks.find(b => b.id === id);
  }

  /**
   * Get all blocks for a session
   */
  getBlocksBySession(sessionId: string): MemoryBlock[] {
    return this.blocks.filter(b => b.sessionId === sessionId);
  }

  /**
   * Get only non-expired blocks.
   * Filters out any block whose expiresAt is in the past.
   * Blocks without expiresAt are always included.
   */
  async getActive(): Promise<MemoryBlock[]> {
    await this.ensureLoaded();
    const now = Date.now();
    return this.blocks.filter(b => {
      if (!b.expiresAt) return true; // no expiry = always active
      return new Date(b.expiresAt).getTime() > now;
    });
  }

  /**
   * Remove all expired blocks from memory.
   * Returns count of removed blocks.
   * Called from cron for periodic cleanup.
   */
  async cleanupExpired(): Promise<number> {
    await this.ensureLoaded();
    const now = Date.now();
    const before = this.blocks.length;
    this.blocks = this.blocks.filter(b => {
      if (!b.expiresAt) return true; // no expiry = keep
      return new Date(b.expiresAt).getTime() > now;
    });
    const removed = before - this.blocks.length;

    // Also cleanup from append-log
    if (removed > 0) {
      // Re-snapshot to reflect cleanup in log
      await this.log.createSnapshot(this.blocks);
    }

    return removed;
  }

  /**
   * Láº¥y táº¥t cáº£ blocks (cÃ³ filter type)
   */
  async getAll(type?: MemoryBlockType): Promise<MemoryBlock[]> {
    await this.ensureLoaded();
    await this.blocksMutex.acquire();
    try {
      if (type) {
        return this.blocks.filter(b => b.type === type);
      }
      return [...this.blocks];
    } finally {
      this.blocksMutex.release();
    }
  }

  /**
   * Äáº¿m sá»‘ blocks
   */
  count(type?: MemoryBlockType): number {
    if (!this.loaded) return 0;
    if (type) {
      return this.blocks.filter(b => b.type === type).length;
    }
    return this.blocks.length;
  }

  // â”€â”€ Persistence â”€â”€

  /**
   * Äá»“ng bá»™ memory xuá»‘ng disk.
   * Phase 4.0b: DÃ¹ng append-log (O(1) snapshot) + backup store.json.
   */
  async flush(): Promise<void> {
    try {
      await fs.mkdir(this.storePath, { recursive: true });

      // 1. Táº¡o snapshot tá»« append-log
      if (this.blocks.length > 0) {
        await this.log.createSnapshot(this.blocks);
      }

      // 2. Backup: váº«n ghi store.json Ä‘á»ƒ tÆ°Æ¡ng thÃ­ch legacy readers
      const filePath = path.join(this.storePath, 'store.json');
      await fs.writeFile(filePath, JSON.stringify(this.blocks, null, 2), 'utf8');
    } catch (err: any) {
      log.error(`persistToDisk failed: ${err.message}`);
    }
  }

  /**
   * Migrate dá»¯ liá»‡u tá»« legacy MemoryCore.
   * Äá»c file JSON cÅ© vÃ  convert thÃ nh MemoryBlocks.
   *
   * @param legacyPath Path tá»›i thÆ° má»¥c memory legacy (VD: ./knowledge/memory)
   * @param channelId KÃªnh cáº§n migrate (náº¿u khÃ´ng cung cáº¥p, migrate táº¥t cáº£)
   */
  async migrateFromLegacy(legacyPath: string, channelId?: string): Promise<number> {
    let migratedCount = 0;

    try {
      await fs.access(legacyPath);
    } catch {
      log.info('No legacy memory directory found, skipping migration');
      return 0;
    }

    if (channelId) {
      // Migrate single channel
      const filePath = path.join(legacyPath, `${channelId}.json`);
      migratedCount += await this.migrateChannelFile(filePath, channelId);
    } else {
      // Migrate all .json files
      const files = await fs.readdir(legacyPath);
      for (const file of files) {
        if (!file.endsWith('.json')) continue;
        const chId = file.replace('.json', '');
        const filePath = path.join(legacyPath, file);
        migratedCount += await this.migrateChannelFile(filePath, chId);
      }
    }

    if (migratedCount > 0) {
      await this.flush();
      log.info(`Migration complete: ${migratedCount} channel(s)`);
    }

    return migratedCount;
  }

  private async migrateChannelFile(filePath: string, channelId: string): Promise<number> {
    try {
      const data = await fs.readFile(filePath, 'utf8');
      const messages: LegacyMessage[] = JSON.parse(data);

      const blocks: Omit<MemoryBlock, 'id' | 'timestamp'>[] = messages.map((msg, idx) => ({
        type: msg.role === 'user' ? 'human' : msg.role === 'assistant' ? 'persona' : 'session',
        content: msg.content,
        entities: [],
        tags: ['migrated', msg.role],
        sessionId: channelId,
      }));

      await this.addMany(blocks);
      return blocks.length;
    } catch {
      return 0;
    }
  }

  // â”€â”€ Utilities â”€â”€

  /**
   * XoÃ¡ táº¥t cáº£ blocks (chá»‰ dÃ¹ng cho test/reset).
   */
  async clear(): Promise<void> {
    this.blocks = [];
    await this.log.append({ op: 'clear' });
    await this.log.createSnapshot(this.blocks);
    await this.flush();
  }

  /** ÄÃ³ng store: flush + close log trÆ°á»›c khi shutdown */
  async close(): Promise<void> {
    await this.flush();
    await this.log.close();
    this.loaded = false;
  }

  // â”€â”€ Private Helpers â”€â”€

  private async ensureLoaded(): Promise<void> {
    if (!this.loaded) {
      await this.init();
    }
  }

  private async loadFromDisk(): Promise<void> {
    try {
      const manifestPath = path.join(this.storePath, 'manifest.json');
      let manifest: { batchCount: number } | null = null;

      try {
        const manifestData = await fs.readFile(manifestPath, 'utf8');
        manifest = JSON.parse(manifestData);
      } catch {
        // No manifest â€” single file mode
      }

      if (manifest && manifest.batchCount > 1) {
        // Multi-file mode
        for (let i = 0; i < manifest.batchCount; i++) {
          const batchPath = path.join(this.storePath, `store-${i}.json`);
          try {
            const data = await fs.readFile(batchPath, 'utf8');
            const batch: MemoryBlock[] = JSON.parse(data);
            this.blocks.push(...batch);
          } catch {
            log.warn(`Failed to load batch: ${batchPath}`);
          }
        }
      } else {
        // Single file mode
        const filePath = path.join(this.storePath, 'store.json');
        try {
          const data = await fs.readFile(filePath, 'utf8');
          const blocks: MemoryBlock[] = JSON.parse(data);
          // Bá» qua invalid format (empty array lÃ  valid)
          if (Array.isArray(blocks)) {
            this.blocks.push(...blocks);
          }
        } catch {
          // File khÃ´ng tá»“n táº¡i â€” láº§n Ä‘áº§u cháº¡y
        }
      }
    } catch (err: any) {
      log.error(`loadFromDisk failed: ${err.message}`);
    }
  }

  private generateId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `mem_${timestamp}_${random}`;
  }

  /**
   * Tokenize text thÃ nh tokens lowercase
   */
  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9_\p{L}]/gu, ' ')
      .split(/\s+/)
      .filter(t => t.length > 2);
  }

  /**
   * TÃ­nh relevance score giá»¯a content vÃ  query tokens
   * DÃ¹ng TF-like scoring: count token overlaps
   */
  private computeRelevance(content: string, queryTokens: string[]): number {
    const contentTokens = this.tokenize(content);
    if (contentTokens.length === 0 || queryTokens.length === 0) return 0;

    let score = 0;
    for (const qt of queryTokens) {
      const matches = contentTokens.filter(ct => ct.includes(qt) || qt.includes(ct)).length;
      score += matches / contentTokens.length;
    }

    // Normalize by query length
    return score / queryTokens.length;
  }
}

// â”€â”€ Singleton Export â”€â”€
export const globalMemoryStore = new MemoryStore();
export default MemoryStore;
