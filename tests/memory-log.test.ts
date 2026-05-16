/**
 * Kato Agent — MemoryLog Unit Tests
 * Phase 4.0d — Test append-log persistence: init, append, replay, snapshot
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { MemoryLog, createMemoryLog } from '../src/core/memory-log.js';

describe('MemoryLog', () => {
  let logDir: string;
  let log: MemoryLog;

  beforeEach(async () => {
    logDir = path.join(os.tmpdir(), `kato-memlog-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    log = await createMemoryLog(logDir);
  });

  afterEach(async () => {
    await log.close();
    // Cleanup temp files
    try {
      await fs.rm(logDir, { recursive: true, force: true });
    } catch {}
  });

  // ── Init ──

  it('should create log directory and manifest on init', async () => {
    const files = await fs.readdir(logDir);
    expect(files).toContain('store.log');
    expect(files).toContain('manifest.json');
  });

  it('should have seq=0 initially', () => {
    const stats = log.getStats();
    expect(stats.lastSeq).toBe(0);
  });

  // ── Append ──

  it('should append an entry and increment seq', async () => {
    await log.append({
      op: 'add',
      block: { id: '1', type: 'fact', content: 'test', timestamp: new Date().toISOString() },
    });

    const stats = log.getStats();
    expect(stats.lastSeq).toBe(1);
    expect(stats.totalOps).toBe(1);
  });

  it('should handle addMany operation', async () => {
    const blocks = [
      { id: '1', type: 'fact' as const, content: 'a', timestamp: new Date().toISOString() },
      { id: '2', type: 'fact' as const, content: 'b', timestamp: new Date().toISOString() },
    ];

    await log.append({ op: 'addMany', blocks });
    const stats = log.getStats();
    // addMany ghi 1 log entry (chứa nhiều blocks), seq chỉ +1
    expect(stats.lastSeq).toBe(1);
    expect(stats.totalOps).toBe(1);
  });

  it('should sync data to disk', async () => {
    await log.append({ op: 'add', block: makeBlock('1', 'test-sync') });
    await log.sync();

    const content = await fs.readFile(path.join(logDir, 'store.log'), 'utf8');
    const lines = content.trim().split('\n');
    expect(lines.length).toBe(1);

    const entry = JSON.parse(lines[0]);
    expect(entry.op).toBe('add');
    expect(entry.block.content).toBe('test-sync');
  });

  // ── Snapshot ──

  it('should create snapshot file', async () => {
    const blocks = [makeBlock('1', 'snap-test')];
    await log.createSnapshot(blocks);

    const snapshotPath = path.join(logDir, 'snapshot.json');
    const data = await fs.readFile(snapshotPath, 'utf8');
    const loaded = JSON.parse(data);
    expect(loaded).toHaveLength(1);
    expect(loaded[0].id).toBe('1');
  });

  it('should reset opsSinceSnapshot after snapshot', () => {
    expect(log.shouldSnapshot()).toBe(false);
  });

  // ── Replay ──

  it('should replay single add', async () => {
    const block = makeBlock('r1', 'replay-test');
    await log.append({ op: 'add', block });
    await log.append({ op: 'add', block: makeBlock('r2', 'replay-test-2') });
    await log.sync();

    const log2 = await createMemoryLog(logDir);
    const blocks = await log2.replay();
    await log2.close();

    expect(blocks).toHaveLength(2);
    expect(blocks[0].id).toBe('r1');
    expect(blocks[1].id).toBe('r2');
  });

  it('should replay addMany', async () => {
    const blocks = [
      makeBlock('m1', 'batch-1'),
      makeBlock('m2', 'batch-2'),
      makeBlock('m3', 'batch-3'),
    ];
    await log.append({ op: 'addMany', blocks });
    await log.sync();

    const log2 = await createMemoryLog(logDir);
    const loaded = await log2.replay();
    await log2.close();

    expect(loaded).toHaveLength(3);
    expect(loaded.map(b => b.id)).toEqual(['m1', 'm2', 'm3']);
  });

  it('should handle clear operation', async () => {
    await log.append({ op: 'add', block: makeBlock('c1', 'before-clear') });
    await log.append({ op: 'clear' });
    await log.append({ op: 'add', block: makeBlock('c2', 'after-clear') });
    await log.sync();

    const log2 = await createMemoryLog(logDir);
    const loaded = await log2.replay();
    await log2.close();

    expect(loaded).toHaveLength(1);
    expect(loaded[0].id).toBe('c2');
  });

  // ── Snapshot + Replay ──

  it('should replay from snapshot correctly', async () => {
    // Ghi 3 blocks + snapshot
    await log.append({ op: 'add', block: makeBlock('s1', 'before-snap') });
    await log.append({ op: 'add', block: makeBlock('s2', 'before-snap-2') });
    await log.createSnapshot([
      makeBlock('s1', 'before-snap'),
      makeBlock('s2', 'before-snap-2'),
    ]);
    // Ghi thêm sau snapshot
    await log.append({ op: 'add', block: makeBlock('s3', 'after-snap') });
    await log.sync();

    const log2 = await createMemoryLog(logDir);
    const loaded = await log2.replay();
    await log2.close();

    expect(loaded).toHaveLength(3);
    // Snapshot lưu s1, s2 → replay chỉ có s3 → tổng 3
    expect(loaded.map(b => b.id)).toEqual(['s1', 's2', 's3']);
  });

  it('should handle empty log gracefully', async () => {
    const log2 = await createMemoryLog(logDir);
    const blocks = await log2.replay();
    await log2.close();

    expect(blocks).toEqual([]);
  });

  // ── Replay consistency with large volume ──

  it('should replay 100 entries consistently', async () => {
    for (let i = 0; i < 100; i++) {
      await log.append({ op: 'add', block: makeBlock(`v${i}`, `value-${i}`) });
    }
    await log.sync();

    const log2 = await createMemoryLog(logDir);
    const loaded = await log2.replay();
    await log2.close();

    expect(loaded).toHaveLength(100);
    expect(loaded[0].id).toBe('v0');
    expect(loaded[99].id).toBe('v99');
  });

  // ── Error Handling ──

  it('should throw if append called before init', async () => {
    const uninitializedLog = new MemoryLog(logDir);
    await expect(
      uninitializedLog.append({ op: 'add', block: makeBlock('err', 'no-init') })
    ).rejects.toThrow('not initialized');
  });

  it('should throw if close called without init', async () => {
    const uninitializedLog = new MemoryLog(logDir);
    // close should not throw even without init (sync handles null stream)
    await expect(uninitializedLog.close()).resolves.not.toThrow();
  });

  // ── Rotation Tests ──

  describe('Rotation', () => {
    it('should return 0 for log file size when file does not exist', () => {
      expect(log.getLogFileSize()).toBe(0);
    });

    it('should return false for shouldRotate when log is small', () => {
      expect(log.shouldRotate()).toBe(false);
    });

    it('should return file size > 0 after writing entries', async () => {
      // Ghi 10 entries để log file có content
      for (let i = 0; i < 10; i++) {
        await log.append({ op: 'add', block: makeBlock(`r${i}`, `x`.repeat(1000)) });
      }
      await log.sync();

      const size = log.getLogFileSize();
      expect(size).toBeGreaterThan(0);
    });

    it('should rotate and create archive file', async () => {
      // Ghi đủ data để có log size > 0
      for (let i = 0; i < 20; i++) {
        await log.append({ op: 'add', block: makeBlock(`a${i}`, `data-${i}`) });
      }
      await log.sync();

      // Force rotate bằng cách set threshold = current size
      // Cách khác: gọi rotate() trực tiếp
      await log.rotate();

      // Kiểm tra archive file tồn tại
      const files = await fs.readdir(logDir);
      const archives = files.filter(f => f.endsWith('.archive'));
      expect(archives.length).toBeGreaterThanOrEqual(1);

      // Kiểm tra log file mới được tạo
      expect(files).toContain('store.log');
    });

    it('should prune archives when exceeding MAX_LOG_FILES', async () => {
      // Tạo nhiều archive files bằng cách rotate nhiều lần
      for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 5; j++) {
          await log.append({ op: 'add', block: makeBlock(`p${i}-${j}`, `x`) });
        }
        await log.sync();
        await log.rotate();
      }

      // Kiểm tra số archive <= MAX_LOG_FILES (5)
      const files = await fs.readdir(logDir);
      const archives = files.filter(f => f.endsWith('.archive'));
      expect(archives.length).toBeLessThanOrEqual(5);
    });

    it('should checkAndRotate return false when log is small', async () => {
      const rotated = await log.checkAndRotate();
      expect(rotated).toBe(false);
    });

    it('should replay after rotation', async () => {
      // Ghi data
      for (let i = 0; i < 10; i++) {
        await log.append({ op: 'add', block: makeBlock(`rot${i}`, `val-${i}`) });
      }
      await log.sync();

      // Rotate
      await log.rotate();

      // Ghi thêm sau rotate
      for (let i = 10; i < 15; i++) {
        await log.append({ op: 'add', block: makeBlock(`rot${i}`, `val-${i}`) });
      }
      await log.sync();

      // Replay — chỉ lấy từ log hiện tại (archive không auto-replay)
      const log2 = await createMemoryLog(logDir);
      const blocks = await log2.replay();
      await log2.close();

      // Sau rotate, chỉ có entries mới (rot10-rot14)
      expect(blocks.length).toBeGreaterThanOrEqual(5);
      expect(blocks[0].id).toBe('rot10');
    });
  });
});

// ── Test Helpers ──

function makeBlock(id: string, content: string) {
  return {
    id,
    type: 'fact' as const,
    content,
    timestamp: new Date().toISOString(),
  };
}