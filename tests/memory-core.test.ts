/**
 * @file MemoryCore Tests
 * @layer tests
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock fs before importing
vi.mock('fs/promises', () => ({
  default: {
    mkdir: vi.fn(async () => {}),
    readFile: vi.fn(async () => JSON.stringify([])),
    writeFile: vi.fn(async () => {}),
    readdir: vi.fn(async () => []),
  },
  mkdir: vi.fn(async () => {}),
  readFile: vi.fn(async () => JSON.stringify([])),
  writeFile: vi.fn(async () => {}),
  readdir: vi.fn(async () => []),
}));

describe('MemoryCore', () => {
  let MemoryCore: any;
  let memory: any;

  beforeEach(async () => {
    vi.resetModules();
    const mod = await import('../src/core/memory/memory.js');
    MemoryCore = mod.MemoryCore || mod.default;
    memory = new MemoryCore();
  });

  it('should be a class', () => {
    expect(typeof MemoryCore).toBe('function');
  });

  it('should have getChannelHistory method', () => {
    expect(typeof memory.getChannelHistory).toBe('function');
  });

  it('should have addMessage method', () => {
    expect(typeof memory.addMessage).toBe('function');
  });

  it('should return empty history for new channel', async () => {
    const history = await memory.getChannelHistory('channel-new');
    expect(Array.isArray(history)).toBe(true);
    expect(history).toHaveLength(0);
  });

  it('should add message and retrieve it', async () => {
    await memory.addMessage('channel-1', {
      role: 'user',
      content: 'hello',
      timestamp: Date.now(),
    });
    const history = await memory.getChannelHistory('channel-1');
    expect(history).toHaveLength(1);
    expect(history[0].content).toBe('hello');
  });

  it('should add multiple messages', async () => {
    await memory.addMessage('ch', { role: 'user', content: 'a', timestamp: Date.now() });
    await memory.addMessage('ch', { role: 'assistant', content: 'b', timestamp: Date.now() });
    await memory.addMessage('ch', { role: 'user', content: 'c', timestamp: Date.now() });
    const history = await memory.getChannelHistory('ch');
    expect(history).toHaveLength(3);
    expect(history[1].role).toBe('assistant');
  });

  it('should separate channels', async () => {
    await memory.addMessage('ch1', { role: 'user', content: 'msg1', timestamp: Date.now() });
    await memory.addMessage('ch2', { role: 'user', content: 'msg2', timestamp: Date.now() });
    const h1 = await memory.getChannelHistory('ch1');
    const h2 = await memory.getChannelHistory('ch2');
    expect(h1).toHaveLength(1);
    expect(h2).toHaveLength(1);
    expect(h1[0].content).toBe('msg1');
    expect(h2[0].content).toBe('msg2');
  });

  it('should have reloadChannel method', () => {
    expect(typeof memory.reloadChannel).toBe('function');
  });
});
