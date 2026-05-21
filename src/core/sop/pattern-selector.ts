/**
 * @file pattern-selector — SOP module
 * @layer core
 * @depends-on src/core/types.ts
 * @imported-by src/core/engine/engine.ts
 * @owner core-sop
 */

/**
 * Kato Agent — Pattern Selector (Phase 7.2b)
 * 
 * Analyzes a task description and selects the best agentic pattern(s)
 * based on task characteristics, with fallback chain support.
 */

import { AgenticPattern, PatternCategory, PatternRegistry } from './pattern-registry.js';

export interface TaskProfile {
  /** Raw task description */
  description: string;
  /** Detected complexity: simple / moderate / complex */
  complexity: 'simple' | 'moderate' | 'complex';
  /** Detected categories of work */
  categories: string[];
  /** Whether the task requires external data */
  needsExternalData: boolean;
  /** Whether the task involves code generation */
  needsCodeGen: boolean;
  /** Whether the task requires iterative refinement */
  needsIteration: boolean;
  /** Whether the task has independent sub-tasks */
  hasParallelSubtasks: boolean;
  /** Whether the task is a well-defined repeatable procedure */
  isRepeatable: boolean;
  /** Priority (1-10) */
  priority: number;
}

export interface PatternSelectionResult {
  primary: AgenticPattern;
  fallbackChain: AgenticPattern[];
  confidence: 'low' | 'medium' | 'high';
}

export interface PatternSelector {
  /**
   * Analyze a task description and select the best matching pattern(s).
   */
  select(task: TaskProfile): PatternSelectionResult;

  /**
   * Given a pattern ID, get the full fallback chain.
   */
  getFallbackChain(patternId: string): AgenticPattern[];

  /**
   * Register a custom scoring function for pattern selection.
   */
  addScorer(name: string, scorer: (profile: TaskProfile, pattern: AgenticPattern) => number): void;
}

type Scorer = (profile: TaskProfile, pattern: AgenticPattern) => number;

export function createPatternSelector(registry: PatternRegistry): PatternSelector {
  const scorers = new Map<string, Scorer>();

  // ── Default Scorers ──────────────────────────────────────────

  /** Score based on category match */
  function categoryScorer(profile: TaskProfile, pattern: AgenticPattern): number {
    const catMap: Record<string, PatternCategory[]> = {
      'analysis': ['chaining', 'planning'],
      'research': ['memory', 'parallel', 'chaining'],
      'writing': ['chaining', 'reflection'],
      'coding': ['code-exec', 'chaining', 'reflection'],
      'planning': ['planning', 'chaining'],
      'reasoning': ['chaining', 'reflection', 'planning'],
      'creative': ['reflection', 'planning'],
      'data': ['code-exec', 'parallel', 'tool-use'],
      'qa': ['memory', 'tool-use'],
    };

    let score = 0;
    for (const cat of profile.categories) {
      const mapped = catMap[cat] || [];
      if (mapped.includes(pattern.category)) score += 2;
    }
    return score;
  }

  /** Score based on complexity match */
  function complexityScorer(profile: TaskProfile, pattern: AgenticPattern): number {
    const levelMap: Record<string, number> = {
      'simple': 0,
      'moderate': 1,
      'complex': 2,
    };
    const profileLevel = levelMap[profile.complexity] ?? 1;
    const patternLevel = pattern.complexity === 'low' ? 0 : pattern.complexity === 'medium' ? 1 : 2;
    const diff = Math.abs(profileLevel - patternLevel);
    return diff <= 1 ? 3 - diff : 0;
  }

  /** Score based on task features */
  function featureScorer(profile: TaskProfile, pattern: AgenticPattern): number {
    let score = 0;

    // Parallel execution match
    if (profile.hasParallelSubtasks && pattern.category === 'parallel') score += 3;

    // Iteration match
    if (profile.needsIteration) {
      if (pattern.category === 'reflection') score += 3;
      if (pattern.id === 'reflexion' || pattern.id === 'feedback-loop') score += 2;
    }

    // Code gen match
    if (profile.needsCodeGen && pattern.category === 'code-exec') score += 3;

    // External data match
    if (profile.needsExternalData && pattern.category === 'tool-use') score += 2;
    if (profile.needsExternalData && pattern.category === 'memory') score += 2;

    // Repeatable procedure match
    if (profile.isRepeatable && pattern.id === 'sop-execution') score += 4;

    return score;
  }

  scorers.set('category', categoryScorer);
  scorers.set('complexity', complexityScorer);
  scorers.set('feature', featureScorer);

  function scorePattern(profile: TaskProfile, pattern: AgenticPattern): number {
    let total = 0;
    for (const scorer of scorers.values()) {
      total += scorer(profile, pattern);
    }
    return total;
  }

  function getFallbackChain(patternId: string): AgenticPattern[] {
    const pattern = registry.get(patternId);
    if (!pattern || !pattern.fallbackPatterns?.length) return [];

    const chain: AgenticPattern[] = [];
    const visited = new Set<string>();
    visited.add(patternId);

    for (const fallbackId of pattern.fallbackPatterns) {
      if (visited.has(fallbackId)) continue;
      const fallback = registry.get(fallbackId);
      if (fallback) {
        chain.push(fallback);
        visited.add(fallbackId);
        // Recursively add their fallbacks (one level deep)
        for (const subFallbackId of fallback.fallbackPatterns ?? []) {
          if (!visited.has(subFallbackId)) {
            const subFallback = registry.get(subFallbackId);
            if (subFallback) {
              chain.push(subFallback);
              visited.add(subFallbackId);
            }
          }
        }
      }
    }

    return chain;
  }

  function select(task: TaskProfile): PatternSelectionResult {
    const allPatterns = registry.all();
    if (allPatterns.length === 0) {
      throw new Error('No patterns registered in registry');
    }

    // Score all patterns
    const scored = allPatterns.map(p => ({
      pattern: p,
      score: scorePattern(task, p),
    }));

    // Sort by score descending
    scored.sort((a, b) => b.score - a.score);

    // Pick primary (highest score)
    const primary = scored[0].pattern;
    const topScore = scored[0].score;

    // Build fallback chain from scored (excluding primary)
    const fallbackChain: AgenticPattern[] = [];
    for (const entry of scored.slice(1)) {
      if (entry.score > 0 && fallbackChain.length < 3) {
        fallbackChain.push(entry.pattern);
      }
    }

    // If primary score is 0, use pattern's own fallback chain
    if (topScore === 0) {
      const ownFallbacks = getFallbackChain(primary.id);
      return {
        primary,
        fallbackChain: ownFallbacks.length > 0 ? ownFallbacks : fallbackChain,
        confidence: 'low',
      };
    }

    // Determine confidence
    const confidence: 'low' | 'medium' | 'high' =
      topScore >= 10 ? 'high' :
      topScore >= 5 ? 'medium' :
      'low';

    return {
      primary,
      fallbackChain,
      confidence,
    };
  }

  return {
    select,
    getFallbackChain,
    addScorer(name: string, scorer: Scorer): void {
      scorers.set(name, scorer);
    },
  };
}

/**
 * Build a TaskProfile from a raw task description using keyword analysis.
 * For production: replace with LLM-based analysis.
 */
export function analyzeTaskDescription(description: string): TaskProfile {
  const lower = description.toLowerCase();

  const categories: string[] = [];
  if (/analyz|review|asses|evaluat/.test(lower)) categories.push('analysis');
  if (/research|find|search|gather|look up/.test(lower)) categories.push('research');
  if (/write|draft|create|compose|generate/.test(lower)) categories.push('writing');
  if (/code|implement|program|function|script|develop/.test(lower)) categories.push('coding');
  if (/plan|strategy|roadmap|schedule|organize/.test(lower)) categories.push('planning');
  if (/reason|explain|why|how|logic|deduce/.test(lower)) categories.push('reasoning');
  if (/creative|idea|brainstorm|design|imagine/.test(lower)) categories.push('creative');
  if (/data|report|statistics|chart|analytics/.test(lower)) categories.push('data');
  if (/question|ask|what|answer|q&a/.test(lower)) categories.push('qa');

  // Default if nothing matched
  if (categories.length === 0) categories.push('analysis');

  const needsIteration = /improve|refine|optimize|fix|debug|polish|revise/.test(lower);
  const needsExternalData = /search|find|look up|get|fetch|api|external|data/.test(lower);
  const needsCodeGen = /code|implement|function|script|program|build/.test(lower);
  const hasParallelSubtasks = /and also|meanwhile|simultaneously|both|multiple/.test(lower) ||
    (description.split(/[.,;]/).length > 3);
  const isRepeatable = /standard|procedure|routine|template|process|workflow/.test(lower);

  // Complexity heuristic
  const complexity: 'simple' | 'moderate' | 'complex' =
    description.length < 100 ? 'simple' :
    description.length < 300 ? 'moderate' :
    'complex';

  return {
    description,
    complexity,
    categories: [...new Set(categories)],
    needsExternalData,
    needsCodeGen,
    needsIteration,
    hasParallelSubtasks,
    isRepeatable,
    priority: complexity === 'complex' ? 7 : complexity === 'moderate' ? 5 : 3,
  };
}