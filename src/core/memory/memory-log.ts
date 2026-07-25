/**
 * @file memory-log â€” Memory module
 * @layer core
 * @depends-on src/core/types.ts
 * @imported-by src/core/engine/engine.ts
 * @owner core-memory
 */

/**
 * Coral Agent â€” Memory Append-Log Persistence
 * Phase 4.0b â€” Thay tháº¿ full-rewrite flush() báº±ng append-log
 *
 * Váº¥n Ä‘á» hiá»‡n táº¡i:
 *   memory-store.ts flush() ghi toÃ n bá»™ O(n) blocks xuá»‘ng disk.
 *   Vá»›i 10k+ blocks, má»—i láº§n flush tá»‘n O(n) I/O vÃ  khÃ´ng durable (crash = máº¥t).
 *
 * Giáº£i phÃ¡p:
 *   - Append-log: má»—i operation ghi 1 dÃ²ng JSON â†’ O(1) per write
 *   - Replay: startup Ä‘á»c log â†’ rebuild in-memory state
 *   - Snapshot: periodic (má»—i 1000 ops) Ä‘á»ƒ trÃ¡nh replay quÃ¡ dÃ i
 *   - Atomic write: write + fsync Ä‘á»ƒ durable (chá»‘ng crash)
 */

import * as fs from 'fs/promises';
import { Logger } from '../logger.js';
const log = new Logger({ module: 'MemoryLog' });
import * as fsSync from 'fs';
import * as path from 'path';

// â”€â”€ Constants â”€â”€
const SNAPSHOT_INTERVAL = 1000; // táº¡o snapshot má»—i N operations
const LOG_FILENAME = 'store.log';
const SNAPSHOT_FILENAME = 'snapshot.json';
const MANIFEST_FILENAME = 'manifest.json';

// â”€â”€ Rotation Constants â”€â”€
const MAX_LOG_FILE_SIZE = 10 * 1024 * 1024; // 10 MB â€” rotate khi log > 10MB
const MAX_LOG_FILES = 5;                      // giá»¯ tá»‘i Ä‘a 5 file archive
const ARCHIVE_PREFIX = 'store';               // archive file prefix
const ARCHIVE_EXT = '.log.archive';           // archive extension

// â”€â”€ Types â”€â”€

/** Loáº¡i memory block */
export type MemoryBlockType = 'human' | 'persona' | 'session' | 'task' | 'fact' | 'world';

/** Má»™t block memory báº¥t biáº¿n (ADD-only) */
export interface MemoryBlock {
  id: string;
  type: MemoryBlockType;
  content: string;
  timestamp: string;   // ISO 8601
  entities?: string[];
  tags?: string[];
  /** Optional: reference tá»›i session nÃ y (cho session type) */
  sessionId?: string;
  /** Optional: link tá»›i block khÃ¡c */
  parentId?: string;
  /** Time-to-live in milliseconds from creation — auto-evicts after expiry */
  ttl?: number;
  /** ISO 8601 timestamp when this block expires (calculated from ttl) */
  expiresAt?: string;
  /** Importance score 0.0–1.0 — higher = survives cleanup longer */
  importance?: number;
  /** Provenance: where this block came from (Waku-inspired: track source for security) */
  source?: { type: 'user' | 'tool' | 'web' | 'cron' | 'legacy'; uri?: string };
}

/** Operation types Ä‘Æ°á»£c log */
export type LogOperation = 'add' | 'addMany' | 'snapshot' | 'clear';

/** Má»™t dÃ²ng trong append-log */
export interface LogEntry {
  op: LogOperation;
  block?: MemoryBlock;
  blocks?: MemoryBlock[];
  timestamp: string;
  seq: number; // sequence number
}

/** Manifest metadata */
interface Manifest {
  version: number;
  lastSeq: number;
  totalOps: number;
  lastSnapshotSeq: number;
  totalBlocks: number;
  updatedAt: string;
}

// â”€â”€ MemoryLog Class â”€â”€

export class MemoryLog {
  private logDir: string;
  private logStream: fsSync.WriteStream | null = null;
  private seq = 0;
  private opsSinceSnapshot = 0;
  private manifest!: Manifest;

  constructor(logDir: string) {
    this.logDir = logDir;
  }

  // â”€â”€ Lifecycle â”€â”€

  async init(): Promise<void> {
    await fs.mkdir(this.logDir, { recursive: true });
    this.logStream = fsSync.createWriteStream(
      path.join(this.logDir, LOG_FILENAME),
      { flags: 'a' }, // append mode
    );
    this.manifest = await this.loadOrCreateManifest();
    this.seq = this.manifest.lastSeq;
    this.opsSinceSnapshot = this.seq - this.manifest.lastSnapshotSeq;
  }

  /**
   * Ghi má»™t operation vÃ o append-log (O(1)).
   * Atomic write: dÃ¹ng write + callback Ä‘á»ƒ Ä‘áº£m báº£o ghi xong má»›i resolve.
   */
  async append(entry: Omit<LogEntry, 'seq' | 'timestamp'>): Promise<void> {
    if (!this.logStream) {
      throw new Error('MemoryLog not initialized. Call init() first.');
    }

    this.seq++;
    const logEntry: LogEntry = {
      ...entry,
      timestamp: new Date().toISOString(),
      seq: this.seq,
    };

    // Cáº­p nháº­t manifest in-memory Ä‘á»ƒ getStats() tráº£ vá» Ä‘Ãºng giÃ¡ trá»‹
    this.manifest.lastSeq = this.seq;
    this.manifest.totalOps = this.seq;

    const line = JSON.stringify(logEntry) + '\n';

    return new Promise((resolve, reject) => {
      if (!this.logStream) return reject(new Error('Stream closed'));

      const ok = this.logStream.write(line, 'utf8', (err) => {
        if (err) reject(err);
      });

      if (!ok) {
        // Backpressure: drain event
        this.logStream!.once('drain', () => resolve());
      } else {
        resolve();
      }
    });
  }

  /**
   * Äá»“ng bá»™ log xuá»‘ng disk (flush buffer).
   * Äáº£m báº£o dá»¯ liá»‡u khÃ´ng máº¥t náº¿u crash.
   */
  async sync(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.logStream) return resolve();
      // Flush buffer rá»“i fsync file descriptor
      // WriteStream.fd lÃ  ná»™i bá»™ nhÆ°ng tá»“n táº¡i sau khi stream má»Ÿ (fd !== null)
      const fd = (this.logStream as any).fd;
      if (fd !== undefined && fd !== null) {
        fsSync.fsync(fd, (err) => {
          if (err) reject(err);
          else resolve();
        });
      } else {
        // Náº¿u chÆ°a cÃ³ fd (stream pending), Ä‘á»£i drain
        this.logStream!.once('drain', () => resolve());
      }
    });
  }

  /**
   * Táº¡o snapshot tá»« state hiá»‡n táº¡i.
   * Snapshot = ghi toÃ n bá»™ blocks hiá»‡n táº¡i vÃ o 1 file + reset opsSinceSnapshot.
   */
  async createSnapshot(blocks: MemoryBlock[]): Promise<void> {
    const snapshotPath = path.join(this.logDir, SNAPSHOT_FILENAME);
    await fs.writeFile(snapshotPath, JSON.stringify(blocks, null, 2), 'utf8');

    this.opsSinceSnapshot = 0;
    this.manifest.lastSnapshotSeq = this.seq;
    this.manifest.totalBlocks = blocks.length;
    this.manifest.updatedAt = new Date().toISOString();
    await this.saveManifest();

    // Ghi 1 dÃ²ng snapshot vÃ o log Ä‘á»ƒ Ä‘Ã¡nh dáº¥u
    await this.append({ op: 'snapshot' });
    await this.sync();
  }

  /**
   * Replay toÃ n bá»™ log tá»« Ä‘áº§u.
   * Náº¿u cÃ³ snapshot, Ä‘á»c snapshot trÆ°á»›c, sau Ä‘Ã³ replay tá»« snapshot seq.
   * Bao gá»“m cáº£ cÃ¡c file archive sau rotation.
   *
   * @returns danh sÃ¡ch blocks Ä‘Ã£ rebuild
   */
  async replay(): Promise<MemoryBlock[]> {
    const snapshot = await this.tryLoadSnapshot();
    let blocks: MemoryBlock[] = Array.isArray(snapshot?.blocks) ? snapshot.blocks : [];
    let startSeq = snapshot?.seq ?? 0;
  
    // Collect all log files: active + archives, sorted by timestamp (oldest first)
    const allLogFiles = await this.collectLogFiles();
  
    let maxSeq = startSeq;
  
    for (const logFile of allLogFiles) {
      const filePath = path.join(this.logDir, logFile);
      try {
        const content = await fs.readFile(filePath, 'utf8');
        const lines = content.trim().split('\n');
  
        for (const line of lines) {
          if (!line.trim()) continue;
  
          const entry: LogEntry = JSON.parse(line);
  
          // Update maxSeq regardless of snapshot skip
          if (entry.seq > maxSeq) maxSeq = entry.seq;
  
          // Skip entries before snapshot
          if (entry.seq <= startSeq) continue;
  
          switch (entry.op) {
            case 'add':
              if (entry.block) blocks.push(entry.block);
              break;
            case 'addMany':
              if (Array.isArray(entry.blocks)) blocks.push(...entry.blocks);
              break;
            case 'clear':
              blocks = [];
              break;
            case 'snapshot':
              // Snapshot marker â€” blocks Ä‘Ã£ Ä‘Æ°á»£c load tá»« snapshot file
              break;
          }
        }
      } catch (err: any) {
        if (err.code !== 'ENOENT') {
          log.error("Replay error", { error: String(err) });
        }
      }
    }
  
    this.seq = maxSeq;
    this.opsSinceSnapshot = this.seq - (this.manifest.lastSnapshotSeq || 0);
  
    return blocks;
  }

  /**
   * Collect all log files (active + archives) sorted by timestamp (oldest first).
   * Archives: store.<timestamp>.log.archive â€” sorted by timestamp ascending
   * Active: store.log â€” always last
   */
  private async collectLogFiles(): Promise<string[]> {
    const archiveRegex = new RegExp(
      `^${ARCHIVE_PREFIX}\\.\\d+${ARCHIVE_EXT.replace('.', '\\.')}$`,
    );

    let files: string[];
    try {
      files = await fs.readdir(this.logDir);
    } catch {
      return [LOG_FILENAME];
    }

    // Get archives sorted by timestamp (oldest first)
    const archives = files
      .filter((f) => archiveRegex.test(f))
      .sort((a, b) => {
        const tsA = parseInt(a.split('.')[1], 10);
        const tsB = parseInt(b.split('.')[1], 10);
        return tsA - tsB; // oldest first
      });

    // Active log always comes last
    const hasActiveLog = files.includes(LOG_FILENAME);
    return hasActiveLog ? [...archives, LOG_FILENAME] : archives;
  }

  /**
   * Kiá»ƒm tra cÃ³ cáº§n táº¡o snapshot khÃ´ng (dá»±a trÃªn opsSinceSnapshot).
   */
  shouldSnapshot(): boolean {
    return this.opsSinceSnapshot >= SNAPSHOT_INTERVAL;
  }

  /**
   * ÄÃ³ng log stream (gá»i khi shutdown).
   */
  async close(): Promise<void> {
    if (this.logStream) {
      await this.sync();
      this.logStream.close();
      this.logStream = null;
    }

    // Cáº­p nháº­t manifest láº§n cuá»‘i (chá»‰ náº¿u Ä‘Ã£ init)
    if (this.manifest) {
      this.manifest.lastSeq = this.seq;
      this.manifest.totalOps = this.seq;
      this.manifest.updatedAt = new Date().toISOString();
      await this.saveManifest();
    }
  }

  // â”€â”€ Private Helpers â”€â”€

  private async loadOrCreateManifest(): Promise<Manifest> {
    const manifestPath = path.join(this.logDir, MANIFEST_FILENAME);
    try {
      const data = await fs.readFile(manifestPath, 'utf8');
      return JSON.parse(data);
    } catch {
      const m: Manifest = {
        version: 1,
        lastSeq: 0,
        totalOps: 0,
        lastSnapshotSeq: 0,
        totalBlocks: 0,
        updatedAt: new Date().toISOString(),
      };
      await fs.writeFile(manifestPath, JSON.stringify(m, null, 2), 'utf8');
      return m;
    }
  }

  private async saveManifest(): Promise<void> {
    const manifestPath = path.join(this.logDir, MANIFEST_FILENAME);
    this.manifest.lastSeq = this.seq;
    await fs.writeFile(
      manifestPath,
      JSON.stringify(this.manifest, null, 2),
      'utf8',
    );
  }

  private async tryLoadSnapshot(): Promise<{ blocks: MemoryBlock[]; seq: number } | null> {
    const snapshotPath = path.join(this.logDir, SNAPSHOT_FILENAME);
    try {
      const data = await fs.readFile(snapshotPath, 'utf8');
      const blocks: MemoryBlock[] = JSON.parse(data);
      return {
        blocks,
        seq: this.manifest.lastSnapshotSeq,
      };
    } catch {
      return null;
    }
  }

  /**
   * Láº¥y thÃ´ng tin manifest hiá»‡n táº¡i (cho debug/monitoring).
   */
  getStats() {
    return { ...this.manifest };
  }

  // â”€â”€ Rotation â”€â”€

  /**
   * Kiá»ƒm tra kÃ­ch thÆ°á»›c log file.
   * DÃ¹ng stat sync Ä‘á»ƒ trÃ¡nh async overhead.
   */
  getLogFileSize(): number {
    const logPath = path.join(this.logDir, LOG_FILENAME);
    try {
      const stat = fsSync.statSync(logPath);
      return stat.size;
    } catch {
      return 0;
    }
  }

  /**
   * Kiá»ƒm tra log cÃ³ cáº§n rotate khÃ´ng.
   * Rotation trigger: log file > MAX_LOG_FILE_SIZE (10MB)
   */
  shouldRotate(): boolean {
    return this.getLogFileSize() >= MAX_LOG_FILE_SIZE;
  }

  /**
   * Thá»±c hiá»‡n rotate log:
   * 1. Sync dá»¯ liá»‡u cÃ²n láº¡i
   * 2. Close stream cÅ©
   * 3. Rename store.log â†’ store.<timestamp>.log.archive
   * 4. Táº¡o stream má»›i (append mode)
   * 5. Prune archive cÅ© náº¿u vÆ°á»£t quÃ¡ MAX_LOG_FILES
   * 6. Ghi dÃ²ng rotation marker vÃ o log má»›i
   */
  async rotate(): Promise<void> {
    if (!this.logStream) throw new Error('MemoryLog not initialized');

    // 1. Sync + close stream cÅ©
    await this.sync();
    const oldStream = this.logStream;
    this.logStream = null;

    await new Promise<void>((resolve, reject) => {
      oldStream.close((err?: NodeJS.ErrnoException | null) => {
        if (err) reject(err);
        else resolve();
      });
    });

    // 2. Rename store.log â†’ store.<timestamp>.log.archive
    const logPath = path.join(this.logDir, LOG_FILENAME);
    const timestamp = Date.now();
    const archiveName = `${ARCHIVE_PREFIX}.${timestamp}${ARCHIVE_EXT}`;
    const archivePath = path.join(this.logDir, archiveName);

    try {
      await fs.rename(logPath, archivePath);
    } catch (err: any) {
      if (err.code !== 'ENOENT') throw err;
    }

    // 3. Táº¡o stream má»›i
    this.logStream = fsSync.createWriteStream(logPath, { flags: 'a' });

    // 4. Ghi rotation marker
    const marker: LogEntry = {
      op: 'snapshot',
      timestamp: new Date().toISOString(),
      seq: this.seq,
    };
    const line = JSON.stringify(marker) + '\n';
    this.logStream.write(line, 'utf8');

    // 5. Cáº­p nháº­t manifest
    this.manifest.updatedAt = new Date().toISOString();
    await this.saveManifest();

    // 6. Prune archive cÅ©
    await this.pruneArchives();
  }

  /**
   * XÃ³a cÃ¡c archive cÅ© nháº¥t náº¿u vÆ°á»£t quÃ¡ MAX_LOG_FILES.
   * Giá»¯ MAX_LOG_FILES archive gáº§n nháº¥t, xÃ³a pháº§n cÃ²n láº¡i.
   */
  async pruneArchives(): Promise<string[]> {
    let files: string[];
    try {
      files = await fs.readdir(this.logDir);
    } catch {
      return [];
    }

    // Lá»c cÃ¡c file archive: store.<number>.log.archive
    const archiveRegex = new RegExp(
      `^${ARCHIVE_PREFIX}\\.\\d+${ARCHIVE_EXT.replace('.', '\\.')}$`,
    );
    const archives = files
      .filter((f) => archiveRegex.test(f))
      .map((f) => ({
        name: f,
        mtime: Date.now(), // fallback
      }));

    // Sáº¯p xáº¿p theo timestamp trong tÃªn file
    archives.sort((a, b) => {
      const tsA = parseInt(a.name.split('.')[1], 10);
      const tsB = parseInt(b.name.split('.')[1], 10);
      return tsB - tsA; // newest first
    });

    const deleted: string[] = [];
    if (archives.length > MAX_LOG_FILES) {
      const toDelete = archives.slice(MAX_LOG_FILES);
      for (const arch of toDelete) {
        try {
          await fs.unlink(path.join(this.logDir, arch.name));
          deleted.push(arch.name);
        } catch {
          // skip if file already deleted
        }
      }
    }

    return deleted;
  }

  /**
   * Kiá»ƒm tra vÃ  rotate náº¿u cáº§n.
   * Gá»i sau má»—i append hoáº·c sync náº¿u shouldRotate() == true.
   * @returns true náº¿u Ä‘Ã£ rotate
   */
  async checkAndRotate(): Promise<boolean> {
    if (this.shouldRotate()) {
      await this.rotate();
      return true;
    }
    return false;
  }
}

// â”€â”€ Factory â”€â”€

/**
 * Khá»Ÿi táº¡o MemoryLog tá»« store path.
 * Factory pattern Ä‘á»ƒ dá»… test/mock.
 */
export async function createMemoryLog(storePath: string): Promise<MemoryLog> {
  const log = new MemoryLog(storePath);
  await log.init();
  return log;
}