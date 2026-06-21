/**
 * Tests for CoralAgentLoop
 * 
 * Verifies multi-step task orchestration via task decomposition + sequential execution
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CoralAgentLoop, createCoralAgentLoop } from '../src/core/agent/agent-loop';
import { Logger } from '../src/core/logger';

describe('CoralAgentLoop', () => {
  let loop: CoralAgentLoop;
  let mockLogger: Logger;
  let mockTaskRunner: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockLogger = new Logger({ minLevel: 'info', json: false });
    mockTaskRunner = vi.fn().mockImplementation(async (prompt: string) => {
      // Default: return a simple success for any task
      if (prompt.includes('decomposition') || prompt.includes('phân tích')) {
        return '---BẮT ĐẦU KẾ HOẠCH---\n[1] Analyze the requirements\n[2] Research and gather data\n[3] Provide final recommendation\n---KẾT THÚC KẾ HOẠCH---';
      }
      if (prompt.includes('synthesis') || prompt.includes('tổng hợp')) {
        return '## Tổng hợp kết quả\n\nĐây là kết quả tổng hợp từ các bước.';
      }
      return `Kết quả xử lý cho: ${prompt.substring(0, 50)}`;
    });
    loop = new CoralAgentLoop(mockLogger, mockTaskRunner);
  });

  describe('execute', () => {
    it('should decompose and execute multi-step tasks', async () => {
      const request = 'Research IoT devices and evaluate options';
      const result = await loop.execute(request);

      expect(result.success).toBe(true);
      expect(result.steps.length).toBeGreaterThan(0);
      expect(result.stepCount).toBeGreaterThan(0);
      // Should have at least: decomposition + 3 steps + synthesis
      expect(mockTaskRunner).toHaveBeenCalledTimes(5);
    });

    it('should reject empty requests', async () => {
      const result = await loop.execute('');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should return step count in result', async () => {
      const request = 'Analyze something';
      const result = await loop.execute(request);

      expect(result.stepCount).toBeGreaterThan(0);
      expect(result.stepCount).toBe(3); // 3 steps from decomposition
    });

    it('should track execution steps', async () => {
      const request = 'Research and evaluate IoT frameworks';
      const result = await loop.execute(request);

      expect(result.steps).toBeDefined();
      expect(Array.isArray(result.steps)).toBe(true);
      expect(result.steps.length).toBeGreaterThan(0);
    });

    it('should accept optional context parameter', async () => {
      const request = 'Evaluate this';
      const context = 'Previous conversation about IoT';
      const result = await loop.execute(request, context);

      expect(result.success).toBe(true);
    });

    it('should fall back to direct execution when decomposition returns nothing', async () => {
      const simpleRunner = vi.fn().mockImplementation(async (prompt: string) => {
        if (prompt.includes('decomposition')) {
          return '---KHÔNG THỂ PHÂN TÍCH---';
        }
        return 'Direct result';
      });
      const simpleLoop = new CoralAgentLoop(mockLogger, simpleRunner);
      const result = await simpleLoop.execute('Simple question');

      expect(result.success).toBe(true);
      expect(result.stepCount).toBe(1);
    });
  });

  describe('isComplexTask', () => {
    it('should identify tasks with multiple complex keywords', () => {
      const request = 'Research and evaluate IoT options';
      expect(loop.isComplexTask(request)).toBe(true);
    });

    it('should identify tasks with sequential indicators', () => {
      const request = 'First research, then analyze, then recommend';
      expect(loop.isComplexTask(request)).toBe(true);
    });

    it('should identify longer requests as potentially complex', () => {
      const request =
        'This is a very long request that describes a complex task with many steps and requirements that need to be fulfilled';
      expect(loop.isComplexTask(request)).toBe(true);
    });

    it('should identify simple tasks as non-complex', () => {
      const request = 'What is 2 + 2?';
      expect(loop.isComplexTask(request)).toBe(false);
    });

    it('should identify single-keyword requests as non-complex', () => {
      const request = 'Summarize this article';
      expect(loop.isComplexTask(request)).toBe(false);
    });
  });

  describe('createCoralAgentLoop', () => {
    it('should create a CoralAgentLoop with default config', () => {
      const createdLoop = new CoralAgentLoop(mockLogger, vi.fn());

      expect(createdLoop).toBeInstanceOf(CoralAgentLoop);
    });
  });

  describe('config', () => {
    it('should accept custom config on initialization', () => {
      const customLoop = new CoralAgentLoop(mockLogger, vi.fn(), {
        maxSteps: 3,
        timeoutPerStepMs: 30000
      });

      expect(customLoop).toBeInstanceOf(CoralAgentLoop);
    });
  });

  describe('step execution', () => {
    it('should handle individual step failures gracefully', async () => {
      // Make second step fail
      const failingRunner = vi.fn()
        .mockImplementationOnce(async () => '---BẮT ĐẦU KẾ HOẠCH---\n[1] Step one\n[2] Step two\n[3] Step three\n---KẾT THÚC KẾ HOẠCH---')
        .mockImplementationOnce(async () => 'Result step 1')
        .mockRejectedValueOnce(new Error('Step 2 failed'))
        .mockImplementationOnce(async () => 'Result step 3')
        .mockImplementationOnce(async () => 'Synthesis result');

      const failingLoop = new CoralAgentLoop(mockLogger, failingRunner);
      const result = await failingLoop.execute('Complex task');

      expect(result.success).toBe(true); // Overall still succeeds
      expect(result.stepCount).toBe(3);
    });
  });

  describe('result structure', () => {
    it('should always return TaskExecutionResult with required fields', async () => {
      const request = 'Test request';
      const result = await loop.execute(request);

      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('result');
      expect(result).toHaveProperty('steps');
      expect(result).toHaveProperty('executionTimeMs');
      expect(result).toHaveProperty('stepCount');
    });

    it('should include error field when task fails', async () => {
      const result = await loop.execute('');

      expect(result.success).toBe(false);
      expect(result).toHaveProperty('error');
    });
  });
});
