/**
 * MemoryTemporal — Temporal Query Engine + Append-Log Persistence Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createMemoryLog, MemoryBlock } from '../src/core/memory/memory-log.js';

vi.mock('../src/core/memory/memory-log.js', async () => {
  const actual = await vi.importActual<typeof import('../src/core/memory/memory-log.js')>(
    '../src/core/memory/memory-log.js'
  );
  return {
    ...actual,
    createMemoryLog: vi.fn(),
    MemoryLog: vi.fn(),
  };
});

const mockCreateMemoryLog = vi.mocked(createMemoryLog);
import { MemoryTemporal } from '../src/core/memory/memory-temporal.js';

function makeMockLog() {
  const blocks: MemoryBlock[] = [];
  let seq = 0;
  const log = {
    replay: vi.fn().mockResolvedValue(blocks),
    append: vi.fn().mockImplementation(async (entry: any) => {
      seq++;
      if (entry.op === 'add' && entry.block) blocks.push(entry.block);
      if (entry.op === 'addMany' && entry.blocks) blocks.push(...entry.blocks);
      if (entry.op === 'clear') blocks.length = 0;
    }),
    createSnapshot: vi.fn().mockResolvedValue(undefined),
    close: vi.fn().mockResolvedValue(undefined),
    getStats: vi.fn().mockImplementation(() => ({ lastSeq: seq, totalOps: seq })),
    shouldSnapshot: vi.fn().mockReturnValue(false),
  };
  mockCreateMemoryLog.mockResolvedValue(log as any);
  return { log, blocks };
}

describe('MemoryTemporal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('init', () => {
    it('should initialize with empty blocks when log is empty', async () => {
      makeMockLog();
      const mem = new MemoryTemporal({ logDir: '/tmp/test' });
      await mem.init();
      expect(mockCreateMemoryLog).toHaveBeenCalledWith('/tmp/test');
    });

    it('should restore blocks from log replay', async () => {
      const { log } = makeMockLog();
      const existing: MemoryBlock = {
        id: 'existing-1', type: 'fact', content: 'restored', timestamp: '2025-01-01T00:00:00.000Z',
      };
      log.replay.mockResolvedValue([existing]);
      const mem = new MemoryTemporal({ logDir: '/tmp/test' });
      await mem.init();
      const block = await mem.getBlock('existing-1');
      expect(block).toBeDefined();
      expect(block!.content).toBe('restored');
    });
  });

  describe('addBlock', () => {
    it('should add a block with correct fields', async () => {
      makeMockLog();
      const mem = new MemoryTemporal({ logDir: '/tmp/test' });
      await mem.init();
      const block = await mem.addBlock('hello', { type: 'fact' });
      expect(block.id).toBeDefined();
      expect(block.content).toBe('hello');
      expect(block.type).toBe('fact');
      expect(block.timestamp).toBeDefined();
    });

    it('should add agentId and world as tags', async () => {
      makeMockLog();
      const mem = new MemoryTemporal({ logDir: '/tmp/test' });
      await mem.init();
      const block = await mem.addBlock('test', { agentId: 'a1', world: 'prod', tags: ['custom'] });
      expect(block.tags).toContain('agent:a1');
      expect(block.tags).toContain('world:prod');
      expect(block.tags).toContain('custom');
    });

    it('should set sessionId', async () => {
      makeMockLog();
      const mem = new MemoryTemporal({ logDir: '/tmp/test' });
      await mem.init();
      const block = await mem.addBlock('test', { sessionId: 'sess-123' });
      expect(block.sessionId).toBe('sess-123');
    });
  });

  describe('deleteBlock', () => {
    it('should delete and return true', async () => {
      makeMockLog();
      const mem = new MemoryTemporal({ logDir: '/tmp/test' });
      await mem.init();
      const block = await mem.addBlock('to delete');
      expect(await mem.deleteBlock(block.id)).toBe(true);
      expect(await mem.getBlock(block.id)).toBeUndefined();
    });

    it('should return false for non-existent', async () => {
      makeMockLog();
      const mem = new MemoryTemporal({ logDir: '/tmp/test' });
      await mem.init();
      expect(await mem.deleteBlock('nope')).toBe(false);
    });
  });

  describe('query', () => {
    it('should query by type', async () => {
      makeMockLog();
      const mem = new MemoryTemporal({ logDir: '/tmp/test' });
      await mem.init();
      await mem.addBlock('f1', { type: 'fact' });
      await mem.addBlock('t1', { type: 'task' });
      const results = await mem.query({ type: 'fact' });
      expect(results.length).toBe(1);
      expect(results[0].memory).toBe('f1');
    });

    it('should query by agentId', async () => {
      makeMockLog();
      const mem = new MemoryTemporal({ logDir: '/tmp/test' });
      await mem.init();
      await mem.addBlock('a1', { agentId: 'agent-1' });
      await mem.addBlock('a2', { agentId: 'agent-2' });
      const results = await mem.query({ agentId: 'agent-1' });
      expect(results.length).toBe(1);
    });

    it('should query by world', async () => {
      makeMockLog();
      const mem = new MemoryTemporal({ logDir: '/tmp/test' });
      await mem.init();
      await mem.addBlock('w1', { world: 'prod' });
      await mem.addBlock('w2', { world: 'dev' });
      expect((await mem.query({ world: 'prod' })).length).toBe(1);
    });

    it('should query by sessionId', async () => {
      makeMockLog();
      const mem = new MemoryTemporal({ logDir: '/tmp/test' });
      await mem.init();
      await mem.addBlock('s1', { sessionId: 'sess-1' });
      const results = await mem.query({ sessionId: 'sess-1' });
      expect(results.length).toBe(1);
    });

    it('should query by tags', async () => {
      makeMockLog();
      const mem = new MemoryTemporal({ logDir: '/tmp/test' });
      await mem.init();
      await mem.addBlock('tagged', { tags: ['important'] });
      const results = await mem.query({ tags: ['important'] });
      expect(results.length).toBe(1);
    });

    it('should respect limit', async () => {
      makeMockLog();
      const mem = new MemoryTemporal({ logDir: '/tmp/test' });
      await mem.init();
      await mem.addBlock('b1');
      await mem.addBlock('b2');
      await mem.addBlock('b3');
      expect((await mem.query({ limit: 2 })).length).toBe(2);
    });

    it('should sort newest first', async () => {
      makeMockLog();
      const mem = new MemoryTemporal({ logDir: '/tmp/test' });
      await mem.init();
      await mem.addBlock('oldest');
      await new Promise(r => setTimeout(r, 10));
      await mem.addBlock('newest');
      const results = await mem.query({});
      expect(results[0].memory).toBe('newest');
      expect(results[1].memory).toBe('oldest');
    });

    it('should return empty for no matches', async () => {
      makeMockLog();
      const mem = new MemoryTemporal({ logDir: '/tmp/test' });
      await mem.init();
      expect(await mem.query({ type: 'human' })).toEqual([]);
    });

    it('should query by timeRange', async () => {
      makeMockLog();
      const mem = new MemoryTemporal({ logDir: '/tmp/test' });
      await mem.init();
      await mem.addBlock('in range');
      const now = new Date();
      const results = await mem.query({
        timeRange: {
          start: new Date(now.getTime() - 60000).toISOString(),
          end: new Date(now.getTime() + 60000).toISOString(),
        },
      });
      expect(results.length).toBe(1);
    });
  });

  describe('convenience methods', () => {
    it('getRecentBlocks', async () => {
      makeMockLog();
      const mem = new MemoryTemporal({ logDir: '/tmp/test' });
      await mem.init();
      await mem.addBlock('r1');
      await mem.addBlock('r2');
      await mem.addBlock('r3');
      expect((await mem.getRecentBlocks(2)).length).toBe(2);
    });

    it('getBlocksByWorld', async () => {
      makeMockLog();
      const mem = new MemoryTemporal({ logDir: '/tmp/test' });
      await mem.init();
      await mem.addBlock('wb', { world: 'test-world' });
      expect((await mem.getBlocksByWorld('test-world')).length).toBe(1);
    });

    it('getBlocksByAgent', async () => {
      makeMockLog();
      const mem = new MemoryTemporal({ logDir: '/tmp/test' });
      await mem.init();
      await mem.addBlock('ab', { agentId: 'my-agent' });
      expect((await mem.getBlocksByAgent('my-agent')).length).toBe(1);
    });

    it('getBlocksBySession', async () => {
      makeMockLog();
      const mem = new MemoryTemporal({ logDir: '/tmp/test' });
      await mem.init();
      await mem.addBlock('sb', { sessionId: 'my-sess' });
      expect((await mem.getBlocksBySession('my-sess')).length).toBe(1);
    });

    it('getAll', async () => {
      makeMockLog();
      const mem = new MemoryTemporal({ logDir: '/tmp/test' });
      await mem.init();
      await mem.addBlock('b1');
      await mem.addBlock('b2');
      expect((await mem.getAll()).length).toBe(2);
    });

    it('getAll with type filter', async () => {
      makeMockLog();
      const mem = new MemoryTemporal({ logDir: '/tmp/test' });
      await mem.init();
      await mem.addBlock('f1', { type: 'fact' });
      await mem.addBlock('t1', { type: 'task' });
      expect((await mem.getAll('fact')).length).toBe(1);
    });
  });

  describe('getStats', () => {
    it('should return block count and log seq', async () => {
      makeMockLog();
      const mem = new MemoryTemporal({ logDir: '/tmp/test' });
      await mem.init();
      await mem.addBlock('t1');
      await mem.addBlock('t2');
      const stats = mem.getStats();
      expect(stats.totalBlocks).toBe(2);
      expect(stats.logSeq).toBeGreaterThanOrEqual(2);
    });
  });

  describe('flush/close', () => {
    it('should flush snapshot on close', async () => {
      const { log } = makeMockLog();
      const mem = new MemoryTemporal({ logDir: '/tmp/test' });
      await mem.init();
      await mem.addBlock('test');
      await mem.close();
      expect(log.createSnapshot).toHaveBeenCalled();
      expect(log.close).toHaveBeenCalled();
    });
  });
});
