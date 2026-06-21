import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import ObservabilityIntegration from '../src/observability/integration';
import { promises as fs } from 'fs';
import { resolve } from 'path';
import { tmpdir } from 'os';

describe('ObservabilityIntegration', () => {
  let integration: ObservabilityIntegration;
  let testDir: string;

  beforeEach(async () => {
    testDir = resolve(tmpdir(), `obs-integration-test-${Date.now()}`);
    integration = new ObservabilityIntegration({
      enabled: true,
      eventStoreDir: testDir,
      sessionId: 'test-session',
    });
    await integration.initialize();
  });

  afterEach(async () => {
    await integration.shutdown();
    try {
      await fs.rm(testDir, { recursive: true });
    } catch (err) {
      // ignore
    }
  });

  describe('initialization', () => {
    it('should initialize with observability enabled', async () => {
      expect(integration.isEnabled()).toBe(true);
      expect(integration.getSessionId()).toBe('test-session');
    });

    it('should handle disabled observability gracefully', async () => {
      const disabled = new ObservabilityIntegration({
        enabled: false,
        sessionId: 'disabled-session',
      });
      await disabled.initialize();
      expect(disabled.isEnabled()).toBe(false);
      await disabled.shutdown();
    });
  });

  describe('tool call recording', () => {
    it('should record tool call event', async () => {
      await integration.recordToolCall({
        tool: 'calculator',
        input: { a: 1, b: 2 },
        duration: 100,
        success: true,
        output: 3,
      });

      const { events } = await integration.getEvents({ limit: 10 });
      expect(events.length).toBeGreaterThan(0);
      expect(events[0].type).toBe('tool_call');
    });

    it('should record tool call failure', async () => {
      await integration.recordToolCall({
        tool: 'api-call',
        input: { url: 'http://example.com' },
        duration: 5000,
        success: false,
        error: 'Timeout',
      });

      const { events } = await integration.getEvents({ type: 'tool_call', limit: 10 });
      expect(events.some(e => (e.data as any).success === false)).toBe(true);
    });
  });

  describe('LLM response recording', () => {
    it('should record LLM response with tokens', async () => {
      await integration.recordLLMResponse({
        model: 'gpt-4',
        prompt: 'What is 2+2?',
        response: '4',
        tokens: { input: 5, output: 1, total: 6 },
        duration: 500,
      });

      const { events } = await integration.getEvents({ type: 'llm_response', limit: 10 });
      expect(events.length).toBeGreaterThan(0);
      expect(events[0].metadata?.tokens).toBe(6);
    });
  });

  describe('memory update recording', () => {
    it('should record memory store operation', async () => {
      await integration.recordMemoryUpdate({
        operation: 'store',
        key: 'user-context',
        duration: 50,
        success: true,
        itemCount: 1,
      });

      const { events } = await integration.getEvents({ type: 'memory_update', limit: 10 });
      expect(events.length).toBeGreaterThan(0);
      expect((events[0].data as any).operation).toBe('store');
    });

    it('should record memory operation failure', async () => {
      await integration.recordMemoryUpdate({
        operation: 'retrieve',
        key: 'nonexistent',
        duration: 10,
        success: false,
        error: 'Not found',
      });

      const { events } = await integration.getEvents({ type: 'memory_update', limit: 10 });
      expect(events.some(e => (e.data as any).success === false)).toBe(true);
    });
  });

  describe('error recording', () => {
    it('should record error event', async () => {
      await integration.recordError({
        source: 'tool-executor',
        message: 'Tool execution failed',
        stack: 'Error: failed...',
        context: { tool: 'test', duration: 1000 },
      });

      const { events } = await integration.getEvents({ type: 'error', limit: 10 });
      expect(events.length).toBeGreaterThan(0);
      expect((events[0].data as any).source).toBe('tool-executor');
    });
  });

  describe('health check recording', () => {
    it('should record healthy status', async () => {
      await integration.recordHealthCheck({
        status: 'healthy',
        checks: { database: true, cache: true },
        memory: { used: 100, total: 256 },
        uptime: 3600,
      });

      const { events } = await integration.getEvents({ type: 'health_check', limit: 10 });
      expect(events.length).toBeGreaterThan(0);
      expect((events[0].data as any).status).toBe('healthy');
    });

    it('should record degraded status', async () => {
      await integration.recordHealthCheck({
        status: 'degraded',
        checks: { database: true, cache: false },
        memory: { used: 200, total: 256 },
        uptime: 7200,
      });

      const { events } = await integration.getEvents({ type: 'health_check', limit: 10 });
      expect(events.some(e => (e.data as any).status === 'degraded')).toBe(true);
    });
  });

  describe('metrics', () => {
    it('should get metrics snapshot', async () => {
      await integration.recordToolCall({
        tool: 'calc',
        input: {},
        duration: 100,
        success: true,
      });

      await integration.recordLLMResponse({
        model: 'gpt-4',
        prompt: 'test',
        response: 'response',
        tokens: { input: 10, output: 5, total: 15 },
        duration: 500,
      });

      const metrics = await integration.getMetrics();
      expect(metrics).not.toBeNull();
      expect(metrics?.summary.totalToolCalls).toBeGreaterThan(0);
      expect(metrics?.summary.totalLLMResponses).toBeGreaterThan(0);
    });
  });

  describe('event queries', () => {
    beforeEach(async () => {
      for (let i = 0; i < 5; i++) {
        await integration.recordToolCall({
          tool: 'calc',
          input: { n: i },
          duration: 100 + i * 10,
          success: true,
        });
      }
    });

    it('should query events with limit', async () => {
      const { events, nextCursor } = await integration.getEvents({ limit: 2 });
      expect(events.length).toBe(2);
      expect(nextCursor).toBeDefined();
    });

    it('should filter events by type', async () => {
      const { events } = await integration.getEvents({
        type: 'tool_call',
        limit: 10,
      });
      expect(events.length).toBe(5);
      expect(events.every(e => e.type === 'tool_call')).toBe(true);
    });
  });

  describe('event ordering', () => {
    it('should verify event ordering', async () => {
      for (let i = 0; i < 3; i++) {
        await integration.recordToolCall({
          tool: 'calc',
          input: {},
          duration: 100,
          success: true,
        });
      }

      const { isValid, gaps } = await integration.verifyOrdering();
      expect(isValid).toBe(true);
      expect(gaps).toHaveLength(0);
    });
  });

  describe('error handling', () => {
    it('should handle recording errors gracefully', async () => {
      // Create integration but don't initialize
      const uninitialized = new ObservabilityIntegration({
        enabled: true,
        eventStoreDir: '/nonexistent/path/that/cannot/exist',
        sessionId: 'error-session',
      });

      // Should not throw
      await uninitialized.recordToolCall({
        tool: 'test',
        input: {},
        duration: 100,
        success: true,
      });

      await uninitialized.shutdown();
    });

    it('should return empty metrics on error', async () => {
      const uninitialized = new ObservabilityIntegration({
        enabled: true,
        eventStoreDir: '/nonexistent/path',
        sessionId: 'error-session',
      });

      const metrics = await uninitialized.getMetrics();
      // Should return metrics object but with empty/zero values
      expect(metrics).not.toBeNull();
      expect(metrics?.summary.totalToolCalls).toBe(0);
      expect(metrics?.summary.totalLLMResponses).toBe(0);

      await uninitialized.shutdown();
    });
  });

  describe('disabled observability', () => {
    it('should skip all operations when disabled', async () => {
      const disabled = new ObservabilityIntegration({
        enabled: false,
        sessionId: 'disabled-session',
      });

      // Should not throw and should return empty/null
      await disabled.recordToolCall({
        tool: 'test',
        input: {},
        duration: 100,
        success: true,
      });

      const events = await disabled.getEvents();
      expect(events.events).toHaveLength(0);

      const metrics = await disabled.getMetrics();
      expect(metrics).toBeNull();

      await disabled.shutdown();
    });
  });
});
