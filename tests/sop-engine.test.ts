/**
 * Phase 7 — SOP Engine + Pattern Registry : Test Suite
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createSOPRegistry, createAnalyzeSOP, createResearchSOP, createWriteSOP, SOP } from '../src/core/sop/sop-registry.js';
import { createSOPEngine, SOPEngine, SOPExecutionContext } from '../src/core/sop/sop-engine.js';
import { createPatternRegistry, registerAllPatterns, AgenticPattern } from '../src/core/patterns/index.js';
import { createPatternSelector, analyzeTaskDescription, PatternSelector } from '../src/core/patterns/index.js';

// ── SOP Registry Tests ─────────────────────────────────────────

describe('SOPRegistry (Phase 7.1a)', () => {
  it('should register and retrieve a SOP', () => {
    const registry = createSOPRegistry();
    const sop = createAnalyzeSOP();
    registry.register(sop);
    expect(registry.get('sop-analyze')).toBeDefined();
    expect(registry.get('sop-analyze')!.name).toBe('Task Analysis');
  });

  it('should throw on duplicate registration', () => {
    const registry = createSOPRegistry();
    registry.register(createAnalyzeSOP());
    expect(() => registry.register(createAnalyzeSOP())).toThrow('already registered');
  });

  it('should find SOPs by tags', () => {
    const registry = createSOPRegistry();
    registry.register(createAnalyzeSOP());
    registry.register(createResearchSOP());
    registry.register(createWriteSOP());

    const coreSOPs = registry.find(['core']);
    expect(coreSOPs.length).toBe(3);

    const analysisSOPs = registry.find(['analysis']);
    expect(analysisSOPs.length).toBe(1);
    expect(analysisSOPs[0].name).toBe('Task Analysis');
  });

  it('should return all registered SOPs', () => {
    const registry = createSOPRegistry();
    registry.register(createAnalyzeSOP());
    registry.register(createResearchSOP());
    expect(registry.all().length).toBe(2);
  });

  it('should remove a SOP', () => {
    const registry = createSOPRegistry();
    registry.register(createAnalyzeSOP());
    expect(registry.remove('sop-analyze')).toBe(true);
    expect(registry.get('sop-analyze')).toBeUndefined();
  });

  it('should return empty array for non-matching tags', () => {
    const registry = createSOPRegistry();
    registry.register(createAnalyzeSOP());
    expect(registry.find(['nonexistent']).length).toBe(0);
  });

  it('should return empty array for empty tags', () => {
    const registry = createSOPRegistry();
    registry.register(createAnalyzeSOP());
    expect(registry.find([]).length).toBe(0);
  });

  it('should parse valid YAML/JSON', () => {
    const registry = createSOPRegistry();
    const json = JSON.stringify(createAnalyzeSOP());
    const parsed = registry.loadFromYaml(json);
    expect(parsed.id).toBe('sop-analyze');
    expect(parsed.steps.length).toBe(4);
  });

  it('should throw on invalid YAML/JSON', () => {
    const registry = createSOPRegistry();
    expect(() => registry.loadFromYaml('not-json')).toThrow('Invalid SOP');
  });

  it('should deep-clone returned SOPs', () => {
    const registry = createSOPRegistry();
    registry.register(createAnalyzeSOP());
    const sop = registry.get('sop-analyze')!;
    sop.name = 'Modified';
    expect(registry.get('sop-analyze')!.name).toBe('Task Analysis');
  });
});

// ── Built-in SOP Templates ─────────────────────────────────────

describe('Built-in SOP Templates (Phase 7.1c)', () => {
  it('createAnalyzeSOP should have 4 steps', () => {
    const sop = createAnalyzeSOP();
    expect(sop.steps.length).toBe(4);
    expect(sop.steps[0].type).toBe('llm');
    expect(sop.steps[3].type).toBe('verify');
  });

  it('createResearchSOP should have 3 steps with a tool step', () => {
    const sop = createResearchSOP();
    expect(sop.steps.length).toBe(3);
    expect(sop.steps.find(s => s.type === 'tool')).toBeDefined();
    expect(sop.steps.find(s => s.type === 'tool')!.toolName).toBe('knowledge_search');
  });

  it('createWriteSOP should have 4 steps with verify at end', () => {
    const sop = createWriteSOP();
    expect(sop.steps.length).toBe(4);
    expect(sop.steps[3].type).toBe('verify');
  });

  it('all SOPs should have version 1.0', () => {
    [createAnalyzeSOP(), createResearchSOP(), createWriteSOP()].forEach(sop => {
      expect(sop.version).toBe('1.0');
    });
  });
});

// ── SOP Engine Tests ───────────────────────────────────────────

describe('SOPEngine (Phase 7.1b)', () => {
  it('should execute LLM steps successfully', async () => {
    const mockLLM = vi.fn().mockResolvedValue('Requirement analysis complete');
    const engine = createSOPEngine({ llmProvider: mockLLM });
    const sop: SOP = {
      id: 'test-sop',
      name: 'Test',
      description: 'Test SOP',
      version: '1.0',
      steps: [
        { id: 'step-1', name: 'Test Step', description: 'desc', instruction: 'Do something', type: 'llm' },
      ],
    };

    const result = await engine.execute(sop);
    expect(result.sopId).toBe('test-sop');
    expect(result.currentStepIndex).toBe(0);
    expect(mockLLM).toHaveBeenCalledTimes(1);
  });

  it('should execute multiple LLM steps sequentially', async () => {
    const mockLLM = vi.fn().mockResolvedValue('Step output');
    const engine = createSOPEngine({ llmProvider: mockLLM });
    const sop: SOP = {
      id: 'multi-step',
      name: 'Multi',
      description: 'Multi-step SOP',
      version: '1.0',
      steps: [
        { id: 's1', name: 'Step 1', description: 'd1', instruction: 'Do 1', type: 'llm' },
        { id: 's2', name: 'Step 2', description: 'd2', instruction: 'Do 2', type: 'llm' },
        { id: 's3', name: 'Step 3', description: 'd3', instruction: 'Do 3', type: 'llm' },
      ],
    };

    const result = await engine.execute(sop);
    expect(result.results.size).toBe(3);
    expect(mockLLM).toHaveBeenCalledTimes(3);
  });

  it('should handle tool steps', async () => {
    const mockTool = vi.fn().mockResolvedValue('Tool result');
    const engine = createSOPEngine({ toolProvider: mockTool });
    const sop: SOP = {
      id: 'tool-test',
      name: 'Tool Test',
      description: 'Test tool step',
      version: '1.0',
      steps: [
        { id: 't1', name: 'Tool Step', description: 'd', instruction: 'Call tool', type: 'tool', toolName: 'search' },
      ],
    };

    const result = await engine.execute(sop);
    expect(mockTool).toHaveBeenCalledWith('search', 'Call tool');
  });

  it('should handle verify steps', async () => {
    const mockLLM = vi.fn().mockResolvedValue('PASS: Everything looks good');
    const engine = createSOPEngine({ llmProvider: mockLLM });
    const sop: SOP = {
      id: 'verify-test',
      name: 'Verify Test',
      description: 'Test verify step',
      version: '1.0',
      steps: [
        { id: 'v1', name: 'Verify Step', description: 'd', instruction: 'Check output', type: 'verify', expectedOutput: 'Pass' },
      ],
    };

    const result = await engine.execute(sop);
    expect(result.results.get('v1')?.status).toBe('success');
  });

  it('should handle decision steps', async () => {
    const mockLLM = vi.fn().mockResolvedValue('YES');
    const engine = createSOPEngine({ llmProvider: mockLLM });
    const sop: SOP = {
      id: 'decision-test',
      name: 'Decision Test',
      description: 'Test decision step',
      version: '1.0',
      steps: [
        { id: 'd1', name: 'Decision Step', description: 'd', instruction: 'Should we proceed?', type: 'decision' },
      ],
    };

    const result = await engine.execute(sop);
    expect(result.results.get('d1')?.output).toBe('YES');
  });

  it('should handle sub-sop steps', async () => {
    const registry = createSOPRegistry();
    const subSOP = createAnalyzeSOP();
    registry.register(subSOP);

    const mockLLM = vi.fn().mockResolvedValue('Sub SOP output');
    const engine = createSOPEngine({
      llmProvider: mockLLM,
      sopProvider: (id: string) => registry.get(id),
    });

    const sop: SOP = {
      id: 'parent-sop',
      name: 'Parent',
      description: 'Parent with sub-SOP',
      version: '1.0',
      steps: [
        { id: 'sub', name: 'Sub SOP Step', description: 'd', instruction: 'Run sub', type: 'sub-sop', subSOPId: 'sop-analyze' },
      ],
    };

    const result = await engine.execute(sop);
    expect(result.results.get('sub')?.status).toBe('success');
  });

  it('should handle LLM failure with retry', async () => {
    const mockLLM = vi.fn()
      .mockRejectedValueOnce(new Error('API error'))
      .mockResolvedValueOnce('Success on retry');
    const engine = createSOPEngine({ llmProvider: mockLLM });
    const sop: SOP = {
      id: 'retry-test',
      name: 'Retry',
      description: 'Test retry',
      version: '1.0',
      steps: [
        { id: 'r1', name: 'Retry Step', description: 'd', instruction: 'Do it', type: 'llm', retryCount: 1 },
      ],
    };

    const result = await engine.execute(sop);
    expect(mockLLM).toHaveBeenCalledTimes(2);
    expect(result.results.get('r1')?.status).toBe('success');
    expect(result.results.get('r1')?.retriesUsed).toBe(1);
  });

  it('should fail after exhausting retries', async () => {
    const mockLLM = vi.fn().mockRejectedValue(new Error('Persistent failure'));
    const engine = createSOPEngine({ llmProvider: mockLLM });
    const sop: SOP = {
      id: 'fail-test',
      name: 'Fail',
      description: 'Test failure',
      version: '1.0',
      steps: [
        { id: 'f1', name: 'Fail Step', description: 'd', instruction: 'Will fail', type: 'llm', retryCount: 1 },
      ],
    };

    const onError = vi.fn();
    const engineWithCallback = createSOPEngine({ llmProvider: mockLLM, onError });
    const result = await engineWithCallback.execute(sop);
    expect(result.results.get('f1')?.status).toBe('error');
    expect(onError).toHaveBeenCalledTimes(1);
  });

  it('should stop execution on critical error', async () => {
    const mockLLM = vi.fn()
      .mockResolvedValueOnce('Step 1 OK')
      .mockRejectedValueOnce(new Error('Critical failure'));
    const engine = createSOPEngine({ llmProvider: mockLLM });
    const sop: SOP = {
      id: 'stop-test',
      name: 'Stop',
      description: 'Test stop on error',
      version: '1.0',
      steps: [
        { id: 'ok', name: 'OK Step', description: 'd', instruction: 'Do 1', type: 'llm' },
        { id: 'bad', name: 'Bad Step', description: 'd', instruction: 'Do 2', type: 'llm' },
        { id: 'never', name: 'Never Step', description: 'd', instruction: 'Do 3', type: 'llm' },
      ],
    };

    const result = await engine.execute(sop);
    expect(result.results.get('ok')?.status).toBe('success');
    expect(result.results.get('bad')?.status).toBe('error');
    expect(result.results.has('never')).toBe(false);
  });

  it('should track step start time', async () => {
    const mockLLM = vi.fn().mockResolvedValue('Output');
    const engine = createSOPEngine({ llmProvider: mockLLM });
    const sop: SOP = {
      id: 'time-test',
      name: 'Time',
      description: 'Test timing',
      version: '1.0',
      steps: [
        { id: 't1', name: 'Time Step', description: 'd', instruction: 'Do', type: 'llm' },
      ],
    };

    const result = await engine.execute(sop);
    expect(result.startTime).toBeGreaterThan(0);
  });

  it('should throw on LLM step without provider', async () => {
    const engine = createSOPEngine({});
    const sop: SOP = {
      id: 'no-llm',
      name: 'No LLM',
      description: 'No LLM provider',
      version: '1.0',
      steps: [
        { id: 'x', name: 'X', description: 'd', instruction: 'Do', type: 'llm' },
      ],
    };

    const result = await engine.execute(sop);
    expect(result.results.get('x')?.status).toBe('error');
    expect(result.results.get('x')?.error).toContain('No LLM provider');
  });

  it('should get execution result by SOP id', async () => {
    const mockLLM = vi.fn().mockResolvedValue('Output');
    const engine = createSOPEngine({ llmProvider: mockLLM });
    const sop: SOP = {
      id: 'get-result',
      name: 'Get Result',
      description: 'Test get result',
      version: '1.0',
      steps: [
        { id: 'g1', name: 'G1', description: 'd', instruction: 'Do', type: 'llm' },
      ],
    };

    await engine.execute(sop);
    const retrieved = engine.getResult('get-result');
    expect(retrieved).toBeDefined();
    expect(retrieved!.sopId).toBe('get-result');
  });

  it('should interpolate variables in instructions', async () => {
    const mockLLM = vi.fn().mockResolvedValue('Output');
    const engine = createSOPEngine({ llmProvider: mockLLM });
    const sop: SOP = {
      id: 'var-test',
      name: 'Var Test',
      description: 'Test variable interpolation',
      version: '1.0',
      steps: [
        { id: 'v1', name: 'Var', description: 'd', instruction: 'Analyze {{topic}}', type: 'llm' },
      ],
    };

    await engine.execute(sop, { topic: 'AI Safety' });
    expect(mockLLM).toHaveBeenCalledWith('Analyze AI Safety', expect.any(String));
  });

  it('should fire onStepComplete callback', async () => {
    const mockLLM = vi.fn().mockResolvedValue('Output');
    const onStep = vi.fn();
    const engine = createSOPEngine({ llmProvider: mockLLM, onStepComplete: onStep });
    const sop: SOP = {
      id: 'cb-test',
      name: 'Callback',
      description: 'Test callback',
      version: '1.0',
      steps: [
        { id: 'c1', name: 'C1', description: 'd', instruction: 'Do', type: 'llm' },
      ],
    };

    await engine.execute(sop);
    expect(onStep).toHaveBeenCalledTimes(1);
    expect(onStep).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'c1' }),
      expect.objectContaining({ status: 'success' }),
    );
  });
});

// ── Pattern Registry Tests ─────────────────────────────────────

describe('PatternRegistry (Phase 7.2a)', () => {
  it('should register and retrieve a pattern', () => {
    const registry = createPatternRegistry();
    registry.register({
      id: 'test-pattern',
      name: 'Test Pattern',
      category: 'chaining',
      description: 'A test pattern',
      whenToUse: 'Testing',
      complexity: 'low',
    });

    const p = registry.get('test-pattern');
    expect(p).toBeDefined();
    expect(p!.name).toBe('Test Pattern');
  });

  it('should throw on duplicate registration', () => {
    const registry = createPatternRegistry();
    registry.register({
      id: 'dup',
      name: 'Duplicate',
      category: 'chaining',
      description: 'd',
      whenToUse: 'w',
      complexity: 'low',
    });
    expect(() => registry.register({
      id: 'dup',
      name: 'Duplicate 2',
      category: 'reflection',
      description: 'd',
      whenToUse: 'w',
      complexity: 'low',
    })).toThrow('already registered');
  });

  it('should find patterns by category', () => {
    const registry = createPatternRegistry();
    registry.register({
      id: 'p1',
      name: 'P1',
      category: 'chaining',
      description: 'd',
      whenToUse: 'w',
      complexity: 'low',
    });
    registry.register({
      id: 'p2',
      name: 'P2',
      category: 'reflection',
      description: 'd',
      whenToUse: 'w',
      complexity: 'low',
    });

    expect(registry.findByCategory('chaining').length).toBe(1);
    expect(registry.findByCategory('reflection').length).toBe(1);
    expect(registry.findByCategory('parallel').length).toBe(0);
  });

  it('should return all patterns', () => {
    const registry = createPatternRegistry();
    registry.register({
      id: 'a', name: 'A', category: 'chaining', description: 'd', whenToUse: 'w', complexity: 'low',
    });
    registry.register({
      id: 'b', name: 'B', category: 'reflection', description: 'd', whenToUse: 'w', complexity: 'low',
    });
    expect(registry.all().length).toBe(2);
  });

  it('should remove a pattern', () => {
    const registry = createPatternRegistry();
    registry.register({
      id: 'remove-me', name: 'Remove', category: 'chaining', description: 'd', whenToUse: 'w', complexity: 'low',
    });
    expect(registry.remove('remove-me')).toBe(true);
    expect(registry.get('remove-me')).toBeUndefined();
  });
});

// ── 21 Patterns Registration ──────────────────────────────────

describe('21 Agentic Design Patterns (Phase 7.2c)', () => {
  it('should register all 21 patterns', () => {
    const registry = createPatternRegistry();
    registerAllPatterns(registry);
    expect(registry.all().length).toBe(24);
  });

  it('should have patterns in all 8 categories', () => {
    const registry = createPatternRegistry();
    registerAllPatterns(registry);

    const categories = ['chaining', 'routing', 'parallel', 'code-exec', 'reflection', 'planning', 'memory', 'tool-use'];
    for (const cat of categories) {
      expect(registry.findByCategory(cat as any).length).toBeGreaterThan(0);
    }
  });

  it('should have fallback chains for most patterns', () => {
    const registry = createPatternRegistry();
    registerAllPatterns(registry);

    const withFallbacks = registry.all().filter(p => p.fallbackPatterns?.length);
    expect(withFallbacks.length).toBeGreaterThan(15); // most patterns have fallbacks
  });

  it('should not have circular fallback chains (one level check)', () => {
    const registry = createPatternRegistry();
    registerAllPatterns(registry);

    const all = registry.all();
    const allIds = new Set(all.map(p => p.id));

    for (const pattern of all) {
      for (const fallback of pattern.fallbackPatterns ?? []) {
        expect(allIds.has(fallback)).toBe(true);
      }
    }
  });
});

// ── Pattern Selector Tests ─────────────────────────────────────

describe('PatternSelector (Phase 7.2b)', () => {
  let registry: ReturnType<typeof createPatternRegistry>;
  let selector: PatternSelector;

  beforeEach(() => {
    registry = createPatternRegistry();
    registerAllPatterns(registry);
    selector = createPatternSelector(registry);
  });

  it('should select a primary pattern for analysis task', () => {
    const profile = {
      description: 'Analyze the security implications of a code change',
      complexity: 'moderate' as const,
      categories: ['analysis', 'coding'],
      needsExternalData: false,
      needsCodeGen: false,
      needsIteration: false,
      hasParallelSubtasks: false,
      isRepeatable: false,
      priority: 5,
    };

    const result = selector.select(profile);
    expect(result.primary).toBeDefined();
    expect(result.confidence).toBeDefined();
  });

  it('should select code-exec pattern for coding tasks', () => {
    const profile = {
      description: 'Implement a new feature in the codebase. Write tests for the changes.',
      complexity: 'complex' as const,
      categories: ['coding'],
      needsExternalData: false,
      needsCodeGen: true,
      needsIteration: false,
      hasParallelSubtasks: false,
      isRepeatable: false,
      priority: 7,
    };

    const result = selector.select(profile);
    // code-exec patterns should score high
    const codeExecPatterns = registry.findByCategory('code-exec');
    expect(codeExecPatterns.map(p => p.id)).toContain(result.primary.id);
  });

  it('should select reflection pattern for iterative tasks', () => {
    const profile = {
      description: 'Improve and refine the output of the previous analysis',
      complexity: 'moderate' as const,
      categories: ['analysis'],
      needsExternalData: false,
      needsCodeGen: false,
      needsIteration: true,
      hasParallelSubtasks: false,
      isRepeatable: false,
      priority: 5,
    };

    const result = selector.select(profile);
    expect(result.primary.category).toBe('reflection');
  });

  it('should select sop-execution for repeatable procedures', () => {
    const profile = {
      description: 'Follow the standard procedure for code review',
      complexity: 'simple' as const,
      categories: ['analysis'],
      needsExternalData: false,
      needsCodeGen: false,
      needsIteration: false,
      hasParallelSubtasks: false,
      isRepeatable: true,
      priority: 3,
    };

    const result = selector.select(profile);
    expect(result.primary.id).toBe('sop-execution');
  });

  it('should provide fallback chain', () => {
    const profile = {
      description: 'A complex task with many requirements',
      complexity: 'complex' as const,
      categories: ['analysis'],
      needsExternalData: true,
      needsCodeGen: false,
      needsIteration: true,
      hasParallelSubtasks: true,
      isRepeatable: false,
      priority: 7,
    };

    const result = selector.select(profile);
    expect(result.fallbackChain.length).toBeGreaterThan(0);
  });

  it('should get fallback chain for a specific pattern', () => {
    const chain = selector.getFallbackChain('chain-of-thought');
    expect(chain.length).toBeGreaterThan(0);
  });

  it('should handle empty registry gracefully', () => {
    const emptyRegistry = createPatternRegistry();
    const emptySelector = createPatternSelector(emptyRegistry);
    const profile = {
      description: 'Test',
      complexity: 'simple' as const,
      categories: ['analysis'],
      needsExternalData: false,
      needsCodeGen: false,
      needsIteration: false,
      hasParallelSubtasks: false,
      isRepeatable: false,
      priority: 3,
    };

    expect(() => emptySelector.select(profile)).toThrow('No patterns registered');
  });

  it('should allow custom scorer registration', () => {
    const customScorer = vi.fn().mockReturnValue(100);
    selector.addScorer('custom', customScorer);

    const profile = {
      description: 'Test',
      complexity: 'simple' as const,
      categories: ['analysis'],
      needsExternalData: false,
      needsCodeGen: false,
      needsIteration: false,
      hasParallelSubtasks: false,
      isRepeatable: false,
      priority: 3,
    };

    const result = selector.select(profile);
    expect(customScorer).toHaveBeenCalled();
    expect(result.primary).toBeDefined();
  });
});

// ── Task Analysis Tests ────────────────────────────────────────

describe('analyzeTaskDescription (Phase 7.2b)', () => {
  it('should detect analysis tasks', () => {
    const profile = analyzeTaskDescription('Analyze the performance metrics and evaluate the results');
    expect(profile.categories).toContain('analysis');
  });

  it('should detect coding tasks', () => {
    const profile = analyzeTaskDescription('Implement a function that processes JSON data');
    expect(profile.categories).toContain('coding');
    expect(profile.needsCodeGen).toBe(true);
  });

  it('should detect research tasks', () => {
    const profile = analyzeTaskDescription('Research the latest advancements in AI safety');
    expect(profile.categories).toContain('research');
    expect(profile.needsExternalData).toBe(true);
  });

  it('should detect iterative tasks', () => {
    const profile = analyzeTaskDescription('Optimize and refine the algorithm for better performance');
    expect(profile.needsIteration).toBe(true);
  });

  it('should detect repeatable procedures', () => {
    const profile = analyzeTaskDescription('Follow the standard deployment procedure');
    expect(profile.isRepeatable).toBe(true);
  });

  it('should detect parallel subtasks', () => {
    const profile = analyzeTaskDescription('Research both the frontend and backend architectures simultaneously');
    expect(profile.hasParallelSubtasks).toBe(true);
  });

  it('should set correct complexity for short tasks', () => {
    const profile = analyzeTaskDescription('Fix the bug');
    expect(profile.complexity).toBe('simple');
  });

  it('should set correct complexity for long tasks', () => {
    const longDesc = 'A very detailed description '.repeat(30);
    const profile = analyzeTaskDescription(longDesc);
    expect(profile.complexity).toBe('complex');
  });

  it('should set priority based on complexity', () => {
    const simple = analyzeTaskDescription('Quick task');
    expect(simple.priority).toBe(3);

    const complex = analyzeTaskDescription('A very detailed description '.repeat(30));
    expect(complex.priority).toBe(7);
  });

  it('should default to analysis category for unknown tasks', () => {
    const profile = analyzeTaskDescription('Do something unspecified');
    expect(profile.categories).toContain('analysis');
  });
});