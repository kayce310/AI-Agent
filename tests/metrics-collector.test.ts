import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import MetricsCollector from '../src/observability/metrics-collector';
import EventStore from '../src/observability/event-store';
import { promises as fs } from 'fs';
import { resolve } from 'path';
import { tmpdir } from 'os';

describe('MetricsCollector', () => {
  let collector: MetricsCollector;
  let eventStore: EventStore;
  let testDir: string;

  beforeEach(async () => {
    testDir = resolve(tmpdir(), `metrics-test-${Date.now()}`);
    eventStore = new EventStore(testDir);
    await eventStore.initialize();
    collector = new MetricsCollector(eventStore, 'session-1');
  });

  afterEach(async () => {
    collector.stopAutoFlush();
    try {
      await fs.rm(testDir, { recursive: true });
    } catch (err) {
      // ignore
    }
  });

  describe('recordToolCall', () => {
    it('should record tool call event with metrics', async () => {
      const event = await collector.recordToolCall({
        tool: 'calculator',
        input: { a: 1, b: 2 },
        duration: 100,
        success: true,
        output: 3,
      });

      expect(event.type).toBe('tool_call');
      expect(event.metadata?.duration).toBe(100);
      expect((event.data as any).tool).toBe('calculator');
    });

    it('should record tool call failure', async () => {
      const event = await collector.recordToolCall({
        tool: 'http-request',
        input: { url: 'http://example.com' },
        duration: 5000,
        success: false,
        error: 'Network timeout',
      });

      expect(event.type).toBe('tool_call');
      expect((event.data as any).success).toBe(false);
      expect((event.data as any).error).toBe('Network timeout');
    });
  });

  describe('recordLLMResponse', () => {
    it('should record LLM response with token metrics', async () => {
      const event = await collector.recordLLMResponse({
        model: 'gpt-4',
        prompt: 'What is 2+2?',
        response: '2+2=4',
        tokens: { input: 5, output: 3, total: 8 },
        duration: 500,
        temperature: 0.7,
      });

      expect(event.type).toBe('llm_response');
      expect(event.metadata?.tokens).toBe(8);
      expect(event.metadata?.duration).toBe(500);
      expect((event.data as any).model).toBe('gpt-4');
    });
  });

  describe('recordMemoryUpdate', () => {
    it('should record memory store operation', async () => {
      const event = await collector.recordMemoryUpdate({
        operation: 'store',
        key: 'user-context',
        duration: 50,
        success: true,
        itemCount: 1,
      });

      expect(event.type).toBe('memory_update');
      expect((event.data as any).operation).toBe('store');
      expect(event.metadata?.duration).toBe(50);
    });

    it('should record memory retrieve operation', async () => {
      const event = await collector.recordMemoryUpdate({
        operation: 'retrieve',
        key: 'user-context',
        duration: 30,
        success: true,
        itemCount: 1,
      });

      expect(event.type).toBe('memory_update');
      expect((event.data as any).operation).toBe('retrieve');
    });

    it('should record memory operation failure', async () => {
      const event = await collector.recordMemoryUpdate({
        operation: 'delete',
        key: 'nonexistent',
        duration: 10,
        success: false,
        error: 'Key not found',
      });

      expect((event.data as any).success).toBe(false);
      expect((event.data as any).error).toBe('Key not found');
    });
  });

  describe('recordError', () => {
    it('should record error event', async () => {
      const event = await collector.recordError({
        source: 'tool-executor',
        message: 'Tool execution timeout',
        stack: 'Error: timeout...',
        context: { toolName: 'api-call', duration: 30000 },
      });

      expect(event.type).toBe('error');
      expect((event.data as any).source).toBe('tool-executor');
      expect((event.data as any).message).toBe('Tool execution timeout');
    });
  });

  describe('recordHealthCheck', () => {
    it('should record healthy status', async () => {
      const event = await collector.recordHealthCheck({
        status: 'healthy',
        checks: { database: true, cache: true, api: true },
        memory: { used: 100, total: 256 },
        uptime: 3600,
      });

      expect(event.type).toBe('health_check');
      expect((event.data as any).status).toBe('healthy');
      expect((event.data as any).uptime).toBe(3600);
    });

    it('should record degraded status', async () => {
      const event = await collector.recordHealthCheck({
        status: 'degraded',
        checks: { database: true, cache: false, api: true },
        memory: { used: 200, total: 256 },
        uptime: 7200,
      });

      expect((event.data as any).status).toBe('degraded');
      expect((event.data as any).checks.cache).toBe(false);
    });
  });

  describe('getSnapshot', () => {
    it('should aggregate metrics from events', async () => {
      await collector.recordToolCall({
        tool: 'calc',
        input: {},
        duration: 100,
        success: true,
      });

      await collector.recordLLMResponse({
        model: 'gpt-4',
        prompt: 'test',
        response: 'response',
        tokens: { input: 10, output: 5, total: 15 },
        duration: 500,
      });

      await collector.recordMemoryUpdate({
        operation: 'store',
        key: 'test',
        duration: 50,
        success: true,
      });

      const snapshot = await collector.getSnapshot();

      expect(snapshot.summary.totalToolCalls).toBe(1);
      expect(snapshot.summary.totalLLMResponses).toBe(1);
      expect(snapshot.summary.totalMemoryUpdates).toBe(1);
      expect(snapshot.summary.tokensConsumed).toBe(15);
    });

    it('should calculate average durations', async () => {
      await collector.recordToolCall({
        tool: 'calc',
        input: {},
        duration: 100,
        success: true,
      });

      await collector.recordToolCall({
        tool: 'calc',
        input: {},
        duration: 200,
        success: true,
      });

      const snapshot = await collector.getSnapshot();
      expect(snapshot.summary.avgToolDuration).toBe(150);
    });
  });

  describe('autoFlush', () => {
    it('should auto-flush metrics on interval', async () => {
      vi.useFakeTimers();

      collector.startAutoFlush();

      await collector.recordToolCall({
        tool: 'test',
        input: {},
        duration: 100,
        success: true,
      });

      expect((collector as any).metricsBuffer.length).toBeGreaterThan(0);

      vi.advanceTimersByTime(5000);

      expect((collector as any).metricsBuffer.length).toBe(0);

      vi.useRealTimers();
    });

    it('should flush on stopAutoFlush', async () => {
      await collector.recordToolCall({
        tool: 'test',
        input: {},
        duration: 100,
        success: true,
      });

      expect((collector as any).metricsBuffer.length).toBeGreaterThan(0);

      collector.stopAutoFlush();

      expect((collector as any).metricsBuffer.length).toBe(0);
    });
  });

  describe('getMetricsWindow', () => {
    it('should query metrics in time window', async () => {
      const start = Date.now();

      await collector.recordToolCall({
        tool: 'calc',
        input: {},
        duration: 100,
        success: true,
      });

      const end = Date.now();

      const metrics = await collector.getMetricsWindow(start, end);
      expect(metrics.length).toBeGreaterThan(0);
      expect(metrics[0].name).toBe('tool_call_duration');
    });
  });

  describe('export', () => {
    it('should export all events and metrics', async () => {
      await collector.recordToolCall({
        tool: 'calc',
        input: {},
        duration: 100,
        success: true,
      });

      await collector.recordLLMResponse({
        model: 'gpt-4',
        prompt: 'test',
        response: 'response',
        tokens: { input: 10, output: 5, total: 15 },
        duration: 500,
      });

      const exported = await collector.export();
      expect(exported.length).toBe(2);
      expect(exported[0].event.type).toBe('tool_call');
      expect(exported[1].event.type).toBe('llm_response');
    });
  });

  describe('multiple sessions', () => {
    it('should isolate metrics by session', async () => {
      const collector2 = new MetricsCollector(eventStore, 'session-2');

      await collector.recordToolCall({
        tool: 'calc',
        input: {},
        duration: 100,
        success: true,
      });

      await collector2.recordToolCall({
        tool: 'http',
        input: {},
        duration: 200,
        success: true,
      });

      const snap1 = await collector.getSnapshot();
      const snap2 = await collector2.getSnapshot();

      expect(snap1.summary.totalToolCalls).toBe(1);
      expect(snap2.summary.totalToolCalls).toBe(1);
    });
  });
});
