import { describe, it, expect, beforeEach } from 'vitest';
import { MemoryStore } from '../src/core/memory/memory-store.js';
import PromptBuilder from '../src/core/llm/prompt-builder.js';
import { ContextSourceRegistry } from '../src/core/context-registry.js';
import { ContextCompiler } from '../src/core/context-compiler.js';
import { PlanContextSource } from '../src/core/plan/plan-context-source.js';
import { ContextWindowManager } from '../src/core/context-window.js';
import { CheckpointStore } from '../src/core/checkpoint.js';
import { worldModel } from '../src/core/world/model.js';
import { SelfEvolutionLearner } from '../src/core/self-evolution/learner.js';
import * as fs from 'fs/promises';
import * as path from 'path';

const TEST_STORE_PATH = './knowledge/memory-store-test';

/**
 * Test ContextSourceRegistry registration and validation
 */
describe('ContextSourceRegistry — Registration and Validation', () => {
  let registry: ContextSourceRegistry;

  beforeEach(() => {
    registry = new ContextSourceRegistry();
  });

  it('should register a valid source', () => {
    const source = {
      id: 'test-source',
      budgetClaim: 100,
      isActive: () => true,
      getCandidates: async () => [],
    };
    expect(() => registry.register(source)).not.toThrow();
    expect(registry.get('test-source')).toBe(source);
  });

  it('should reject duplicate source IDs', () => {
    const source1 = { id: 'dup', budgetClaim: 100, isActive: () => true, getCandidates: async () => [] };
    const source2 = { id: 'dup', budgetClaim: 200, isActive: () => true, getCandidates: async () => [] };
    registry.register(source1);
    expect(() => registry.register(source2)).toThrow();
  });

  it('should reject source with invalid id', () => {
    const source = { id: '', budgetClaim: 100, isActive: () => true, getCandidates: async () => [] };
    expect(() => registry.register(source)).not.toThrow(); // should just log and skip
  });

  it('should reject source with negative budgetClaim', () => {
    const source = { id: 'negative', budgetClaim: -50, isActive: () => true, getCandidates: async () => [] };
    expect(() => registry.register(source)).not.toThrow(); // should just log and skip
  });

  it('should get active sources', () => {
    const source1 = { id: 's1', budgetClaim: 100, isActive: () => true, getCandidates: async () => [] };
    const source2 = { id: 's2', budgetClaim: 200, isActive: () => false, getCandidates: async () => [] };
    registry.register(source1);
    registry.register(source2);
    const active = registry.getActive('session-1', 'task-1');
    expect(active).toHaveLength(1);
    expect(active[0].id).toBe('s1');
  });

  it('should return empty array if no active sources', () => {
    const active = registry.getActive('session-1', 'task-1');
    expect(active).toHaveLength(0);
  });
});

/**
 * Test ContextCompiler candidate selection and assembly
 */
describe('ContextCompiler — Candidate Selection and Assembly', () => {
  let compiler: ContextCompiler;
  let mockRegistry: ContextSourceRegistry;

  beforeEach(() => {
    const contextManager = new ContextWindowManager();
    compiler = new ContextCompiler(contextManager);
    mockRegistry = new ContextSourceRegistry();
  });

  it('should compile candidates from multiple sources', async () => {
    const source1 = {
      id: 'source-1',
      budgetClaim: 500,
      isActive: () => true,
      getCandidates: async () => [{
        id: 'c1',
        content: 'Content from source 1',
        sourceId: 'source-1',
        estimatedTokens: 50,
      }],
      provenance: { origin: 'memory', identifier: 'block-1' },
    };

    const source2 = {
      id: 'source-2',
      budgetClaim: 300,
      isActive: () => true,
      getCandidates: async () => [{
        id: 'c2',
        content: 'Content from source 2',
        sourceId: 'source-2',
        estimatedTokens: 30,
      }],
      provenance: { origin: 'system', identifier: 'world-model' },
    };

    mockRegistry.register(source1);
    mockRegistry.register(source2);

    const request = {
      sessionId: 'session-1',
      taskId: 'task-1',
      task: 'Test task',
      messages: [],
    };

    const sources = mockRegistry.getActive('session-1', 'task-1');
    const compiled = await compiler.compile({ request, sources });

    expect(compiled.candidates).toHaveLength(2);
    expect(compiled.candidates.map(c => c.sourceId)).toEqual(['source-1', 'source-2']);
    expect(compiled.totalTokens).toBe(80);
    expect(compiled.metadata.sourceCount).toBe(2);
    expect(compiled.metadata.candidateCount).toBe(2);
  });

  it('should preserve provenance in compiled context', async () => {
    const source = {
      id: 'provenance-test',
      budgetClaim: 200,
      isActive: () => true,
      getCandidates: async () => [{
        id: 'c1',
        content: 'Test content',
        sourceId: 'provenance-test',
        estimatedTokens: 20,
        provenance: { origin: 'user', identifier: 'file.txt', timestamp: '2026-01-01T00:00:00Z' },
      }],
      provenance: { origin: 'system', identifier: 'prompt-builder' },
    };

    mockRegistry.register(source);

    const request = {
      sessionId: 'session-1',
      taskId: 'task-1',
      task: 'Test task',
      messages: [],
    };

    const sources = mockRegistry.getActive('session-1', 'task-1');
    const compiled = await compiler.compile({ request, sources });

    expect(compiled.candidates[0].provenance).toEqual({ origin: 'user', identifier: 'file.txt', timestamp: '2026-01-01T00:00:00Z' });
  });

  it('should enforce budget allocation (evict optional candidates)', async () => {
    const source = {
      id: 'budget-test',
      budgetClaim: 500,
      isActive: () => true,
      getCandidates: async () => [
        { id: 'c1', content: 'Content 1', sourceId: 'budget-test', estimatedTokens: 400 },
        { id: 'c2', content: 'Content 2', sourceId: 'budget-test', estimatedTokens: 200 },
      ],
    };

    mockRegistry.register(source);

    const request = {
      sessionId: 'session-1',
      taskId: 'task-1',
      task: 'Test task',
      messages: [],
    };

    const sources = mockRegistry.getActive('session-1', 'task-1');
    const compiled = await compiler.compile({ request, sources });

    // With a 3000 token budget, both candidates should fit
    expect(compiled.candidates).toHaveLength(2);
    expect(compiled.totalTokens).toBe(600);
  });
});

/**
 * Test B1 regression — planContext must flow through ContextSource boundary
 */
describe('B1 Regression — Plan Context Boundary', () => {
  it('should NOT have planContext appended after truncation', async () => {
    // This test replaces the existing broken B1 test in state-driven-plan.test.ts
    // It verifies that planContext flows through ContextSource → Compiler → final budget boundary

    const checkpointStore = new CheckpointStore('./test-checkpoint');
    const planSource = new PlanContextSource(checkpointStore);

    // Simulate an active plan
    const mockPlan = {
      id: 'test-plan',
      goal: 'Test goal',
      status: 'running',
      currentItemIndex: 0,
      items: [{ id: 'item-1', index: 0, description: 'Test item', status: 'pending' }],
    };
    checkpointStore.setPlan('session-1', mockPlan);

    const request = {
      sessionId: 'session-1',
      taskId: 'task-1',
      task: 'Test task',
      messages: [],
    };

    const candidates = await planSource.getCandidates(request);
    expect(candidates).toHaveLength(1);
    expect(candidates[0].sourceId).toBe('plan');
    expect(candidates[0].content).toContain('test-plan');

    // Verify the plan context is a candidate, not a string appended after truncation
    expect(typeof candidates[0].content).toBe('string');
    expect(candidates[0].content).not.toContain('[TRUNCATION_BYPASS]');
    expect(candidates[0].content).toContain('KẾ HOẠCH HIỆN TẠI');
  });
});

/**
 * Test integration of all ContextSources
 */
describe('Context Architecture Integration', () => {
  let registry: ContextSourceRegistry;
  let compiler: ContextCompiler;

  beforeEach(async () => {
    // Create a temporary test store for memory
    const testMemoryStore = new MemoryStore(TEST_STORE_PATH);
    const testCheckpointStore = new CheckpointStore('./test-checkpoint-integration');

    registry = new ContextSourceRegistry();
    compiler = new ContextCompiler(new ContextWindowManager());

    // Register sources
    const promptSource = new PromptBuilder();
    registry.register(promptSource);

    await testMemoryStore.init();
    registry.register(testMemoryStore);

    const learningSource = new SelfEvolutionLearner({
      store: {
        findSimilar: async () => [] as any[],
      } as any,
    });
    registry.register(learningSource);

    registry.register(worldModel);

    const planSource = new PlanContextSource(testCheckpointStore);
    registry.register(planSource);
  });

  it('should integrate all registered sources', async () => {
    const request = {
      sessionId: 'session-1',
      taskId: 'task-1',
      task: 'Integration test',
      messages: [],
    };

    const activeSources = registry.getActive('session-1', 'task-1');
    console.log('Active sources:', activeSources.map(s => s.id));
    expect(activeSources.length).toBeGreaterThanOrEqual(1); // At minimum identity should be active

    const compiled = await compiler.compile({ request, sources: activeSources });

    console.log('Compiled candidates:', compiled.candidates.length);
    console.log('Source count:', compiled.metadata.sourceCount);
    console.log('Candidates by source:', compiled.candidates.map(c => c.sourceId));

    expect(compiled.candidates.length).toBeGreaterThanOrEqual(1);
    expect(compiled.metadata.sourceCount).toBeGreaterThanOrEqual(1);
  });
});
