/**
 * Kato Agent — Memory Store (ADD-only + Multi-signal Retrieval)
 * Phase 3.4 — Memory Architecture Upgrade
 *
 * Replace cho MemoryCore legacy với:
 * - ADD-only pattern: không update/delete, chỉ append
 * - Multi-signal retrieval: text similarity + type filter + time range
 * - Structured MemoryBlock với entities/tags/timestamp
 * - Dual-write mode: vừa ghi vào store mới, vừa sync với legacy memory.ts
 *
 * Migration path:
 *   1. Tạo memory-store.ts mới (file này)
 *   2. Engine dùng cả 2: legacy để đọc history cũ, new để ghi memory mới
 *   3. Sau 1 thời gian → drop legacy
 */

import fs from 'fs/promises';
import path from 'path';
import 'dotenv/config';

// ── Constants ──
const DEFAULT_STORE_PATH = './knowledge/memory-store';
const MAX_BLOCKS_PER_FILE = 500;

// ── Types ──

/** Loại memory block */
export type MemoryBlockType = 'human' | 'persona' | 'session' | 'task' | 'fact';

/** Một block memory bất biến (ADD-only) */
export interface MemoryBlock {
  id: string;
  type: MemoryBlockType;
  content: string;
  timestamp: string;   // ISO 8601
  entities?: string[];
  tags?: string[];
  /** Optional: reference tới session này (cho session type) */
  sessionId?: string;
  /** Optional: link tới block khác */
  parentId?: string;
}

/** Query options cho retrieval */
export interface MemoryQueryOptions {
  topK?: number;
  types?: MemoryBlockType[];
  timeRange?: [string, string]; // [startISO, endISO]
  tags?: string[];
  sessionId?: string;
}

/** Định nghĩa source gốc cho migration */
export interface LegacyMessage {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  timestamp: number;
  reasoning_content?: string;
  tool_call_id?: string;
}

// ── Memory Store Class ──

export class MemoryStore {
  private storePath: string;
  private blocks: MemoryBlock[] = [];
  private loaded = false;

  constructor(storePath?: string) {
    this.storePath = storePath || process.env.MEMORY_STORE_PATH || DEFAULT_STORE_PATH;
  }

  // ── Initialization ──

  async init(): Promise<void> {
    if (this.loaded) return;

    try {
      await fs.mkdir(this.storePath, { recursive: true });
    } catch (err: any) {
      console.warn(`⚠️ MemoryStore: cannot create directory: ${err.message}`);
    }

    await this.loadFromDisk();
    this.loaded = true;
    console.log(`🧠 MemoryStore initialized at ${this.storePath} (${this.blocks.length} blocks loaded)`);
  }

  // ── ADD-only Write ──

  /**
   * Thêm một memory block mới (ADD-only — không update, không delete).
   * Tự động tạo ID và timestamp.
   */
  async add(
    type: MemoryBlockType,
    content: string,
    opts?: {
      entities?: string[];
      tags?: string[];
      sessionId?: string;
      parentId?: string;
    },
  ): Promise<MemoryBlock> {
    await this.ensureLoaded();

    const block: MemoryBlock = {
      id: this.generateId(),
      type,
      content,
      timestamp: new Date().toISOString(),
      entities: opts?.entities?.length ? opts.entities : undefined,
      tags: opts?.tags?.length ? opts.tags : undefined,
      sessionId: opts?.sessionId || undefined,
      parentId: opts?.parentId || undefined,
    };

    this.blocks.push(block);

    // Auto-flush nếu blocks tích lũy đủ
    if (this.blocks.length % MAX_BLOCKS_PER_FILE === 0) {
      await this.flush();
    }

    return block;
  }

  /**
   * Batch add nhiều blocks cùng lúc.
   * Hữu ích cho migration hoặc import.
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

    if (this.blocks.length % MAX_BLOCKS_PER_FILE === 0) {
      await this.flush();
    }

    return results;
  }

  // ── Multi-signal Retrieval ──

  /**
   * Query memory blocks với multi-signal:
   * - Text similarity (keyword overlap)
   * - Type filter
   * - Time range filter
   * - Tag filter
   * - Session filter
   */
  async query(text: string, opts?: MemoryQueryOptions): Promise<MemoryBlock[]> {
    await this.ensureLoaded();

    let results = this.blocks;

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
  }

  /**
   * Lấy block theo ID
   */
  async getById(id: string): Promise<MemoryBlock | undefined> {
    await this.ensureLoaded();
    return this.blocks.find(b => b.id === id);
  }

  /**
   * Lấy tất cả blocks (có filter type)
   */
  async getAll(type?: MemoryBlockType): Promise<MemoryBlock[]> {
    await this.ensureLoaded();
    if (type) {
      return this.blocks.filter(b => b.type === type);
    }
    return [...this.blocks];
  }

  /**
   * Đếm số blocks
   */
  count(type?: MemoryBlockType): number {
    if (!this.loaded) return 0;
    if (type) {
      return this.blocks.filter(b => b.type === type).length;
    }
    return this.blocks.length;
  }

  // ── Persistence ──

  /**
   * Ghi tất cả blocks xuống disk ngay lập tức.
   */
  async flush(): Promise<void> {
    try {
      await fs.mkdir(this.storePath, { recursive: true });

      // Chia nhỏ file nếu quá nhiều blocks
      if (this.blocks.length <= MAX_BLOCKS_PER_FILE) {
        const filePath = path.join(this.storePath, 'store.json');
        await fs.writeFile(filePath, JSON.stringify(this.blocks, null, 2), 'utf8');
      } else {
        // Split thành nhiều file theo batches
        const batches = Math.ceil(this.blocks.length / MAX_BLOCKS_PER_FILE);
        for (let i = 0; i < batches; i++) {
          const start = i * MAX_BLOCKS_PER_FILE;
          const end = start + MAX_BLOCKS_PER_FILE;
          const batch = this.blocks.slice(start, end);
          const filePath = path.join(this.storePath, `store-${i}.json`);
          await fs.writeFile(filePath, JSON.stringify(batch, null, 2), 'utf8');
        }

        // Ghi manifest
        const manifest = {
          version: 1,
          totalBlocks: this.blocks.length,
          batchCount: batches,
          blocksPerFile: MAX_BLOCKS_PER_FILE,
          updatedAt: new Date().toISOString(),
        };
        await fs.writeFile(
          path.join(this.storePath, 'manifest.json'),
          JSON.stringify(manifest, null, 2),
          'utf8',
        );
      }
    } catch (err: any) {
      console.error(`❌ MemoryStore flush failed:`, err.message);
    }
  }

  // ── Legacy Migration ──

  /**
   * Migrate dữ liệu từ legacy MemoryCore.
   * Đọc file JSON cũ và convert thành MemoryBlocks.
   *
   * @param legacyPath Path tới thư mục memory legacy (VD: ./knowledge/memory)
   * @param channelId Kênh cần migrate (nếu không cung cấp, migrate tất cả)
   */
  async migrateFromLegacy(legacyPath: string, channelId?: string): Promise<number> {
    let migratedCount = 0;

    try {
      await fs.access(legacyPath);
    } catch {
      console.warn(`⚠️ Legacy memory path not found: ${legacyPath}`);
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
      console.log(`✅ Migrated ${migratedCount} legacy messages to MemoryStore`);
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

  // ── Utilities ──

  /**
   * Xoá tất cả blocks (chỉ dùng cho test/reset).
   */
  async clear(): Promise<void> {
    this.blocks = [];
    await this.flush();
  }

  /** Đóng store: flush trước khi shutdown */
  async close(): Promise<void> {
    await this.flush();
    this.loaded = false;
  }

  // ── Private Helpers ──

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
        // No manifest — single file mode
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
            console.warn(`⚠️ MemoryStore: cannot load batch ${i}`);
          }
        }
      } else {
        // Single file mode
        const filePath = path.join(this.storePath, 'store.json');
        try {
          const data = await fs.readFile(filePath, 'utf8');
          const blocks: MemoryBlock[] = JSON.parse(data);
          // Bỏ qua invalid format (empty array là valid)
          if (Array.isArray(blocks)) {
            this.blocks.push(...blocks);
          }
        } catch {
          // File không tồn tại — lần đầu chạy
        }
      }
    } catch (err: any) {
      console.warn(`⚠️ MemoryStore: cannot load from disk: ${err.message}`);
    }
  }

  private generateId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `mem_${timestamp}_${random}`;
  }

  /**
   * Tokenize text thành tokens lowercase
   */
  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9_\p{L}]/gu, ' ')
      .split(/\s+/)
      .filter(t => t.length > 2);
  }

  /**
   * Tính relevance score giữa content và query tokens
   * Dùng TF-like scoring: count token overlaps
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

// ── Singleton Export ──
export const globalMemoryStore = new MemoryStore();
export default MemoryStore;