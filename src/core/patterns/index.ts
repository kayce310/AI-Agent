/**
 * @file index — Agent pattern
 * @layer core
 * @depends-on (none — standalone)
 * @imported-by src/core/index.ts
 * @owner core-patterns
 */

/**
 * Agentic Patterns Registry
 * Central export for all agentic design patterns.
 */

// Pattern exports
export { ChainOfThought, ChainOfThoughtStep, ChainOfThoughtResult } from './chain-of-thought.js';
export { ChainingStep, executeChaining } from './chaining.js';
export { CodeExecRequest, CodeExecResult } from './code-exec.js';
export { ReflectionStep, ReflectionConfig } from './reflection.js';
export { Route, RoutingResult, executeRouting, keywordMatch, regexMatch } from './routing.js';
export { ParallelStep, ParallelResult, executeParallel } from './parallel.js';

// Pre-existing function-based patterns — re-exported for convenience
export {
  createPatternRegistry,
  registerAllPatterns,
  AgenticPattern
} from '../sop/pattern-registry.js';
export {
  createPatternSelector,
  analyzeTaskDescription,
  PatternSelector
} from '../sop/pattern-selector.js';
