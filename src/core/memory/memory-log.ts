/**
 * @file memory-log — Memory module
 * @layer core
 * @depends-on src/core/types.ts
 * @imported-by src/core/engine/engine.ts
 * @owner core-memory
 */

/**
 * Kato Agent — Memory Append-Log Persistence
 * Phase 4.0b — Thay thế full-rewrite flush() bằng append-log
 *
 * Vấn đề hiện tại:
 *   memory-store.ts flush() ghi toàn bộ O(n) blocks xuống disk.
 *   Với 10k+ blocks, mỗi lần flush tốn O(n) I/O và không durable (crash = mất).
 *
 * Giải pháp:
 *   - Append-log: mỗi operation ghi 1 dòng JSON → O(1) per write
 *   - Replay: startup đọc log → rebuild in-memory state
 *   - Snapshot: periodic (mỗi 1000 ops) để tránh replay quá dài
 *   - Atomic write: write + fsync để durable (chống crash)
 */

import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';

// ── Constants ──
const SNAPSHOT_INTERVAL = 1000; // tạo snapshot mỗi N operations
const LOG_FILENAME = 'store.log';
const SNAPSHOT_FILENAME = 'snapshot.json';
const MANIFEST_FILENAME = 'manifest.json';

// ── Rotation Constants ──
const MAX_LOG_FILE_SIZE = 10 * 1024 * 1024; // 10 MB — rotate khi log > 10MB
const MAX_LOG_FILES = 5;                      // giữ tối đa 5 file archive
const ARCHIVE_PREFIX = 'store';               // archive file prefix
const ARCHIVE_EXT = '.log.archive';           // archive extension

// ── Types ──

/** Loại memory block */
export type MemoryBlockType = 'human' | 'persona' | 'session' | 'task' | 'fact' | 'world';

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

/** Operation types được log */
export type LogOperation = 'add' | 'addMany' | 'snapshot' | 'clear';

/** Một dòng trong append-log */
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

// ── MemoryLog Class ──

export class MemoryLog {
  private logDir: string;
  private logStream: fsSync.WriteStream | null = null;
  private seq = 0;
  private opsSinceSnapshot = 0;
  private manifest!: Manifest;

  constructor(logDir: string) {
    this.logDir = logDir;
  }

  // ── Lifecycle ──

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
   * Ghi một operation vào append-log (O(1)).
   * Atomic write: dùng write + callback để đảm bảo ghi xong mới resolve.
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

    // Cập nhật manifest in-memory để getStats() trả về đúng giá trị
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
   * Đồng bộ log xuống disk (flush buffer).
   * Đảm bảo dữ liệu không mất nếu crash.
   */
  async sync(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.logStream) return resolve();
      // Flush buffer rồi fsync file descriptor
      // WriteStream.fd là nội bộ nhưng tồn tại sau khi stream mở (fd !== null)
      const fd = (this.logStream as any).fd;
      if (fd !== undefined && fd !== null) {
        fsSync.fsync(fd, (err) => {
          if (err) reject(err);
          else resolve();
        });
      } else {
        // Nếu chưa có fd (stream pending), đợi drain
        this.logStream!.once('drain', () => resolve());
      }
    });
  }

  /**
   * Tạo snapshot từ state hiện tại.
   * Snapshot = ghi toàn bộ blocks hiện tại vào 1 file + reset opsSinceSnapshot.
   */
  async createSnapshot(blocks: MemoryBlock[]): Promise<void> {
    const snapshotPath = path.join(this.logDir, SNAPSHOT_FILENAME);
    await fs.writeFile(snapshotPath, JSON.stringify(blocks, null, 2), 'utf8');

    this.opsSinceSnapshot = 0;
    this.manifest.lastSnapshotSeq = this.seq;
    this.manifest.totalBlocks = blocks.length;
    this.manifest.updatedAt = new Date().toISOString();
    await this.saveManifest();

    // Ghi 1 dòng snapshot vào log để đánh dấu
    await this.append({ op: 'snapshot' });
    await this.sync();
  }

  /**
   * Replay toàn bộ log từ đầu.
   * Nếu có snapshot, đọc snapshot trước, sau đó replay từ snapshot seq.
   * Bao gồm cả các file archive sau rotation.
   *
   * @returns danh sách blocks đã rebuild
   */
  async replay(): Promise<MemoryBlock[]> {
    const snapshot = await this.tryLoadSnapshot();
    let blocks: MemoryBlock[] = snapshot?.blocks ?? [];
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
              if (entry.blocks) blocks.push(...entry.blocks);
              break;
            case 'clear':
              blocks = [];
              break;
            case 'snapshot':
              // Snapshot marker — blocks đã được load từ snapshot file
              break;
          }
        }
      } catch (err: any) {
        if (err.code !== 'ENOENT') {
          console.warn(`⚠️ MemoryLog: cannot read log file ${logFile}: ${err.message}`);
        }
      }
    }
  
    this.seq = maxSeq;
    this.opsSinceSnapshot = this.seq - (this.manifest.lastSnapshotSeq || 0);
  
    return blocks;
  }

  /**
   * Collect all log files (active + archives) sorted by timestamp (oldest first).
   * Archives: store.<timestamp>.log.archive — sorted by timestamp ascending
   * Active: store.log — always last
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
   * Kiểm tra có cần tạo snapshot không (dựa trên opsSinceSnapshot).
   */
  shouldSnapshot(): boolean {
    return this.opsSinceSnapshot >= SNAPSHOT_INTERVAL;
  }

  /**
   * Đóng log stream (gọi khi shutdown).
   */
  async close(): Promise<void> {
    if (this.logStream) {
      await this.sync();
      this.logStream.close();
      this.logStream = null;
    }

    // Cập nhật manifest lần cuối (chỉ nếu đã init)
    if (this.manifest) {
      this.manifest.lastSeq = this.seq;
      this.manifest.totalOps = this.seq;
      this.manifest.updatedAt = new Date().toISOString();
      await this.saveManifest();
    }
  }

  // ── Private Helpers ──

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
   * Lấy thông tin manifest hiện tại (cho debug/monitoring).
   */
  getStats() {
    return { ...this.manifest };
  }

  // ── Rotation ──

  /**
   * Kiểm tra kích thước log file.
   * Dùng stat sync để tránh async overhead.
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
   * Kiểm tra log có cần rotate không.
   * Rotation trigger: log file > MAX_LOG_FILE_SIZE (10MB)
   */
  shouldRotate(): boolean {
    return this.getLogFileSize() >= MAX_LOG_FILE_SIZE;
  }

  /**
   * Thực hiện rotate log:
   * 1. Sync dữ liệu còn lại
   * 2. Close stream cũ
   * 3. Rename store.log → store.<timestamp>.log.archive
   * 4. Tạo stream mới (append mode)
   * 5. Prune archive cũ nếu vượt quá MAX_LOG_FILES
   * 6. Ghi dòng rotation marker vào log mới
   */
  async rotate(): Promise<void> {
    if (!this.logStream) throw new Error('MemoryLog not initialized');

    // 1. Sync + close stream cũ
    await this.sync();
    const oldStream = this.logStream;
    this.logStream = null;

    await new Promise<void>((resolve, reject) => {
      oldStream.close((err?: NodeJS.ErrnoException | null) => {
        if (err) reject(err);
        else resolve();
      });
    });

    // 2. Rename store.log → store.<timestamp>.log.archive
    const logPath = path.join(this.logDir, LOG_FILENAME);
    const timestamp = Date.now();
    const archiveName = `${ARCHIVE_PREFIX}.${timestamp}${ARCHIVE_EXT}`;
    const archivePath = path.join(this.logDir, archiveName);

    try {
      await fs.rename(logPath, archivePath);
    } catch (err: any) {
      if (err.code !== 'ENOENT') throw err;
    }

    // 3. Tạo stream mới
    this.logStream = fsSync.createWriteStream(logPath, { flags: 'a' });

    // 4. Ghi rotation marker
    const marker: LogEntry = {
      op: 'snapshot',
      timestamp: new Date().toISOString(),
      seq: this.seq,
    };
    const line = JSON.stringify(marker) + '\n';
    this.logStream.write(line, 'utf8');

    // 5. Cập nhật manifest
    this.manifest.updatedAt = new Date().toISOString();
    await this.saveManifest();

    // 6. Prune archive cũ
    await this.pruneArchives();
  }

  /**
   * Xóa các archive cũ nhất nếu vượt quá MAX_LOG_FILES.
   * Giữ MAX_LOG_FILES archive gần nhất, xóa phần còn lại.
   */
  async pruneArchives(): Promise<string[]> {
    let files: string[];
    try {
      files = await fs.readdir(this.logDir);
    } catch {
      return [];
    }

    // Lọc các file archive: store.<number>.log.archive
    const archiveRegex = new RegExp(
      `^${ARCHIVE_PREFIX}\\.\\d+${ARCHIVE_EXT.replace('.', '\\.')}$`,
    );
    const archives = files
      .filter((f) => archiveRegex.test(f))
      .map((f) => ({
        name: f,
        mtime: Date.now(), // fallback
      }));

    // Sắp xếp theo timestamp trong tên file
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
   * Kiểm tra và rotate nếu cần.
   * Gọi sau mỗi append hoặc sync nếu shouldRotate() == true.
   * @returns true nếu đã rotate
   */
  async checkAndRotate(): Promise<boolean> {
    if (this.shouldRotate()) {
      await this.rotate();
      return true;
    }
    return false;
  }
}

// ── Factory ──

/**
 * Khởi tạo MemoryLog từ store path.
 * Factory pattern để dễ test/mock.
 */
export async function createMemoryLog(storePath: string): Promise<MemoryLog> {
  const log = new MemoryLog(storePath);
  await log.init();
  return log;
}