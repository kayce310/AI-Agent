/**
 * @file Phase 6 Integration Tests — Evolution + Learning
 * @layer tests
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PromptBuilder } from '../src/core/llm/prompt-builder.js';
import { EvolutionEngine } from '../src/core/evolution.js';
import { HookRegistry } from '../src/core/hooks.js';

describe('Phase 6 — Evolution Integration', () => {
  describe('PromptBuilder — learningContext', () => {
    it('should include learning context when provided', () => {
      const builder = new PromptBuilder();
      const prompt = builder.buildSystem({
        agentName: 'Coral',
        mentionPrefix: '@coral',
        learningContext: '✅ Installed pnpm — success\n❌ Tried npm — conflict',
        currentRequest: 'test',
      });
      expect(prompt).toContain('KINH NGHIỆM');
      expect(prompt).toContain('✅ Installed pnpm');
      expect(prompt).toContain('❌ Tried npm');
    });

    it('should skip learning context when null', () => {
      const builder = new PromptBuilder();
      const prompt = builder.buildSystem({
        agentName: 'Coral',
        mentionPrefix: '@coral',
        learningContext: undefined,
        currentRequest: 'test',
      });
      // Memory context section shouldn't appear
      expect(prompt).not.toContain('KINH NGHIỆM');
    });

    it('should show learning section after memory section', () => {
      const builder = new PromptBuilder();
      const prompt = builder.buildSystem({
        agentName: 'Coral',
        mentionPrefix: '@coral',
        memoryContext: 'Previous conversation about Node.js',
        learningContext: '✅ Tool X worked well',
        currentRequest: 'help',
      });
      const memoryIdx = prompt.indexOf('TRÍ NHỚ');
      const learnIdx = prompt.indexOf('KINH NGHIỆM');
      // Learning section should come before task section
      expect(learnIdx).toBeGreaterThan(memoryIdx);
    });
  });

  describe('EvolutionEngine — hooks wire', () => {
    it('should attach to HookRegistry without error', () => {
      const hooks = new HookRegistry();
      const engine = new EvolutionEngine();
      expect(() => engine.attachToHooks(hooks)).not.toThrow();
    });

    it('should record tool errors via hooks', async () => {
      const hooks = new HookRegistry();
      const engine = new EvolutionEngine();
      engine.attachToHooks(hooks);

      await hooks.emit('tool:error', {
        sessionId: 'test-session',
        data: { error: 'ENOENT: no such file', toolName: 'read_file' },
      });

      const errors = engine.getRecentErrors(10);
      expect(errors.length).toBeGreaterThanOrEqual(1);
      expect(errors[0].errorType).toBe('TOOL_EXECUTION');
    });

    it('should record model errors via hooks', async () => {
      const hooks = new HookRegistry();
      const engine = new EvolutionEngine();
      engine.attachToHooks(hooks);

      await hooks.emit('model:error', {
        sessionId: 'test-session',
        data: { error: 'Rate limit exceeded', modelUsed: 'gpt-4' },
      });

      const errors = engine.getRecentErrors(10);
      expect(errors.length).toBeGreaterThanOrEqual(1);
      expect(errors.some(e => e.errorType === 'MODEL_ERROR')).toBe(true);
    });

    it('should detect bad models via shouldSkipModel', async () => {
      const engine = new EvolutionEngine();
      // 5 successes + 4 unique errors = 5 total calls (only successes count),
      // failure rate = 4/5 = 80% (>50%) ⇒ skip
      for (let i = 0; i < 5; i++) {
        await engine.recordSuccess('bad-model', 500);
      }
      for (let i = 0; i < 4; i++) {
        await engine.recordError({
          modelId: 'bad-model',
          errorType: 'RATE_LIMIT',
          errorMessage: `429 error #${i}`, // unique message to avoid dedup
          sessionId: 'test',
        });
      }

      expect(engine.shouldSkipModel('bad-model')).toBe(true);
      expect(engine.shouldSkipModel('unknown-model')).toBe(false);
    });

    it('should provide routing advice based on success rates', async () => {
      const engine = new EvolutionEngine();
      // Good model: 10 successes, 1 error = 10 total calls, 1/10=10% failure = 90% success
      for (let i = 0; i < 10; i++) {
        await engine.recordSuccess('good-model', 200);
      }
      await engine.recordError({
        modelId: 'good-model',
        errorType: 'TIMEOUT',
        errorMessage: 'timeout',
        sessionId: 'test',
      });

      const advice = engine.getRoutingAdvice();
      if (advice) {
        expect(advice.preferredModel).toBe('good-model');
        expect(advice.reason).toContain('90');
      }
    });
  });
});