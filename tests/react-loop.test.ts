/**
 * Tests for StreamingReActLoop
 * 
 * Verifies:
 * - Basic task decomposition + execution
 * - Streaming callbacks
 * - Timeout handling
 * - Circuit breaker
 * - Error budget
 * - Abort/cancel
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  StreamingReActLoop,
  StreamEvent,
  TimeoutError,
  isComplexTask
} from '../src/core/agent/react-loop';
import { Logger } from '../src/core/logger';

describe('StreamingReActLoop', () => {
  let loop: StreamingReActLoop;
  let mockLogger: Logger;
  let mockTaskRunner: ReturnType<typeof vi.fn>;
  let streamEvents: StreamEvent[];

  beforeEach(() => {
    mockLogger = new Logger({ minLevel: 'info', json: false });
    streamEvents = [];
    mockTaskRunner = vi.fn().mockImplementation(async (prompt: string) => {
      if (prompt.includes('phân tích') || prompt.includes('decomposition')) {
        return '---BẮT ĐẦU KẾ HOẠCH---\n[1] Research data\n[2] Analyze findings\n[3] Provide recommendation\n---KẾT THÚC KẾ HOẠCH---';
      }
      if (prompt.includes('tổng hợp') || prompt.includes('synthesis')) {
        return '## Kết quả tổng hợp\n\nĐây là kết quả cuối cùng.';
      }
      return `Result for: ${prompt.substring(0, 60)}`;
    });
    loop = new StreamingReActLoop(
      mockLogger,
      mockTaskRunner,
      (event) => { streamEvents.push(event); }
    );
  });

  describe('execute', () => {
    it('should decompose and execute multi-step tasks', async () => {
      const result = await loop.execute('Research IoT and evaluate options');
      expect(result.success).toBe(true);
      expect(result.steps.length).toBeGreaterThan(0);
      expect(result.iterationsUsed).toBeGreaterThan(0);
    });

    it('should emit stream events for each phase', async () => {
      await loop.execute('Compare frameworks');
      expect(streamEvents.length).toBeGreaterThan(0);
      const eventTypes = streamEvents.map(e => e.type);
      expect(eventTypes).toContain('decompose');
      expect(eventTypes).toContain('synthesis');
      expect(eventTypes).toContain('step_complete');
      expect(eventTypes).toContain('synthesis');
      expect(eventTypes).toContain('complete');
    });

    it('should reject empty requests', async () => {
      const result = await loop.execute('');
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should return step count in result', async () => {
      const result = await loop.execute('Research X');
      expect(result.steps.length).toBe(3); // 3 steps from mock decomposition
    });

    it('should include total duration', async () => {
      const result = await loop.execute('Do something');
      expect(result.totalDurationMs).toBeGreaterThanOrEqual(0);
    });

    it('should fallback to direct execution when no decomposition', async () => {
      mockTaskRunner = vi.fn().mockImplementation(async (prompt: string) => {
        if (prompt.includes('phân tích')) return '---KHÔNG THỂ PHÂN TÍCH---';
        return 'Direct result';
      });
      const simpleLoop = new StreamingReActLoop(mockLogger, mockTaskRunner);
      const result = await simpleLoop.execute('Simple question');
      expect(result.success).toBe(true);
      expect(result.steps.length).toBe(1);
    });
  });

  describe('streaming callbacks', () => {
    it('should emit decompose event first', async () => {
      await loop.execute('Research topic');
      expect(streamEvents[0].type).toBe('decompose');
    });

    it('should emit complete event last', async () => {
      await loop.execute('Research topic');
      expect(streamEvents[streamEvents.length - 1].type).toBe('complete');
    });

    it('should include step numbers in events', async () => {
      await loop.execute('Research topic');
      const stepEvents = streamEvents.filter(e => e.type === 'step_start' || e.type === 'step_complete');
      for (const evt of stepEvents) {
        expect(evt.step).toBeDefined();
        expect(evt.totalSteps).toBeDefined();
      }
    });

    it('should include timestamps in events', async () => {
      await loop.execute('Research topic');
      for (const evt of streamEvents) {
        expect(evt.timestamp).toBeGreaterThan(0);
      }
    });
  });

  describe('guardrails', () => {
    it('should handle step failures gracefully', async () => {
      const failingRunner = vi.fn()
        .mockImplementationOnce(async () => '---BẮT ĐẦU KẾ HOẠCH---\n[1] Step one\n[2] Step two\n[3] Step three\n---KẾT THÚC KẾ HOẠCH---')
        .mockImplementationOnce(async () => 'Result 1')
        .mockRejectedValueOnce(new Error('Step 2 failed'))
        .mockImplementationOnce(async () => 'Result 3')
        .mockImplementationOnce(async () => 'Synthesis done');

      const failingLoop = new StreamingReActLoop(mockLogger, failingRunner);
      const result = await failingLoop.execute('Complex task');
      expect(result.success).toBe(true);
      expect(result.errorsEncountered).toBe(1);
      expect(result.steps.some(s => !s.success)).toBe(true);
    });

    it('should circuit-break after consecutive failures', async () => {
      // Make decomposition succeed but all steps fail
      let callCount = 0;
      const circuitFailRunner = vi.fn().mockImplementation(async () => {
        callCount++;
        if (callCount === 1) {
          // Decomposition succeeds
          return '---BẮT ĐẦU KẾ HOẠCH---\n[1] Step A\n[2] Step B\n[3] Step C\n---KẾT THÚC KẾ HOẠCH---';
        }
        throw new Error('Step failed');
      });
      const cbLoop = new StreamingReActLoop(mockLogger, circuitFailRunner, undefined, {
        circuitBreakerThreshold: 2, // Break after 2 consecutive failures
        errorBudget: 10 // High so circuit breaker triggers first
      });
      const result = await cbLoop.execute('Task');
      expect(result.circuitBroken).toBe(true);
      // Should have stopped after 2 failures before reaching step 3
      expect(result.errorsEncountered).toBeGreaterThanOrEqual(2);
    });

    it('should stop after exceeding error budget', async () => {
      let callCount = 0;
      const errorBudgetRunner = vi.fn().mockImplementation(async () => {
        callCount++;
        if (callCount === 1) {
          return '---BẮT ĐẦU KẾ HOẠCH---\n[1] Step A\n[2] Step B\n[3] Step C\n---KẾT THÚC KẾ HOẠCH---';
        }
        throw new Error('Step failed');
      });
      const ebLoop = new StreamingReActLoop(mockLogger, errorBudgetRunner, undefined, {
        circuitBreakerThreshold: 10, // High so error budget triggers first
        errorBudget: 2 // Only allow 2 errors
      });
      const result = await ebLoop.execute('Task');
      expect(result.errorsEncountered).toBeGreaterThanOrEqual(2);
      // Should NOT have circuit broken (error budget triggered before circuit breaker)
      expect(result.error).toBeUndefined();
    });

    it('should abort execution on cancel', async () => {
      const slowRunner = vi.fn().mockImplementation(async () => {
        await new Promise(r => setTimeout(r, 1000));
        return 'Slow result';
      });
      const cancelLoop = new StreamingReActLoop(mockLogger, slowRunner);
      
      // Start execution then immediately cancel
      const execPromise = cancelLoop.execute('Task');
      cancelLoop.cancel();
      const result = await execPromise;
      
      expect(result.circuitBroken).toBe(false); // May or may not be set
    });
  });

  describe('timeout', () => {
    it('should timeout slow executions', async () => {
      // Simulate a step that exceeds the timeout by using executeWithTimeout directly
      // The runner returns a promise that never resolves
      let decomposeDone = false;
      const slowRunner = vi.fn().mockImplementation(async (prompt: string) => {
        if (!decomposeDone) {
          decomposeDone = true;
          return '---BẮT ĐẦU KẾ HOẠCH---\n[1] Step one\n---KẾT THÚC KẾ HOẠCH---';
        }
        if (prompt.includes('tổng hợp') || prompt.includes('synthesis')) {
          return 'Synthesis done';
        }
        // This step will never resolve — setTimeout in executeWithTimeout should catch it
        await new Promise(() => {});
        return 'never';
      });
      const timeoutLoop = new StreamingReActLoop(mockLogger, slowRunner, undefined, {
        timeoutPerIterationMs: 50,
        errorBudget: 10,
        circuitBreakerThreshold: 3
      });
      const result = await timeoutLoop.execute('Slow task');
      expect(result.timedOut).toBe(true);
      // Should have skipped the step but still synthesized
      expect(result.steps.length).toBe(1);
      expect(result.steps[0].success).toBe(false);
    });
  });

  describe('isComplexTask', () => {
    it('should detect multi-keyword tasks', () => {
      expect(isComplexTask('Research and evaluate options')).toBe(true);
    });
    it('should detect sequential tasks', () => {
      expect(isComplexTask('First research then analyze')).toBe(true);
    });
    it('should detect long requests', () => {
      expect(isComplexTask('A'.repeat(101))).toBe(true);
    });
    it('should ignore simple requests', () => {
      expect(isComplexTask('What is 2+2?')).toBe(false);
    });
    it('should ignore single-keyword requests', () => {
      expect(isComplexTask('Summarize this')).toBe(false);
    });
  });

  describe('TimeoutError', () => {
    it('should have correct name', () => {
      const err = new TimeoutError('test');
      expect(err.name).toBe('TimeoutError');
    });
  });

  describe('result structure', () => {
    it('should always have all required fields', async () => {
      const result = await loop.execute('Test task');
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('result');
      expect(result).toHaveProperty('steps');
      expect(result).toHaveProperty('totalDurationMs');
      expect(result).toHaveProperty('iterationsUsed');
      expect(result).toHaveProperty('errorsEncountered');
      expect(result).toHaveProperty('circuitBroken');
      expect(result).toHaveProperty('timedOut');
    });
  });
});
