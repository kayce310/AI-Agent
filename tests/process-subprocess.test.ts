import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import processPlugin from '../../src/core/tools/process';

// Helper to get a tool executor by name
const getTool = (name: string) => {
  const tool = processPlugin.tools.find(t => t.name === name);
  if (!tool) throw new Error(`Tool ${name} not found`);
  return tool.execute;
};

describe('process tool subprocess cancellation', () => {
  let start: any, poll: any, kill: any, list: any;

  beforeEach(() => {
    start = getTool('process_start');
    poll = getTool('process_poll');
    kill = getTool('process_kill');
    list = getTool('process_list');
  });

  afterEach(async () => {
    // Clean up any leftover processes
    const procs = await list({});
    for (const p of procs.processes) {
      try {
        await kill({ session_id: p.id });
      } catch (_) {}
    }
  });

  it('AbortSignal triggers child.kill() and removes from tracking', async () => {
    const abortController = new AbortController();
    const { session_id } = await start({
      command: 'node',
      args: ['-e', 'setInterval(() => {}, 1000000)'], // Long-running
      signal: abortController.signal,
      timeout: 30000
    });

    // Verify process starts running
    let proc = await poll({ session_id });
    expect(proc.running).toBe(true);
    expect(proc.exitCode).toBeNull();

    // Trigger abort
    abortController.abort();

    // Wait for process to exit and cleanup (up to 5s)
    let exited = false;
    for (let i = 0; i < 10; i++) {
      await new Promise(r => setTimeout(r, 500));
      try {
        proc = await poll({ session_id });
        if (!proc.running && proc.exitCode !== null) {
          exited = true;
          break;
        }
      } catch (e) {
        // If process not found, it's been cleaned up
        exited = true;
        break;
      }
    }
    expect(exited).toBe(true);

    // Verify process removed from tracking
    await expect(poll({ session_id })).rejects.toMatch(/not found/);
  });

  it('timeout terminates subprocess and cleans up tracking', async () => {
    const { session_id } = await start({
      command: 'node',
      args: ['-e', 'setInterval(() => {}, 1000000)'], // Long-running
      timeout: 100 // 100ms timeout
    });

    // Wait for timeout to trigger and cleanup (hopefully) kill process
    await new Promise(r => setTimeout(r, 300));

    let proc;
    try {
      proc = await poll({ session_id });
    } catch (e) {
      // Process may have been cleaned up already
      proc = { running: false };
    }
    expect(proc.running).toBe(false);

    // Verify removed from tracking
    await expect(poll({ session_id })).rejects.toMatch(/not found/);
  });

  it('manual process_kill still works and cleans up tracking', async () => {
    const { session_id } = await start({
      command: 'node',
      args: ['-e', 'setInterval(() => {}, 1000000)']
    });

    // Verify running
    let proc = await poll({ session_id });
    expect(proc.running).toBe(true);

    // Kill manually
    await kill({ session_id });

    // Verify killed
    proc = await poll({ session_id });
    expect(proc.running).toBe(false);
    expect(proc.exitCode).not.toBeNull(); // Should have exit code from SIGTERM

    // Verify removed from tracking (after cleanup delay)
    await new Promise(r => setTimeout(r, 1500));
    await expect(poll({ session_id })).rejects.toMatch(/not found/);
  });
});