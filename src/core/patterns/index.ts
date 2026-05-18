/**
 * Agentic Patterns Registry
 * Central export for all 16+ agentic design patterns.
 */

// New class-based patterns (15)
export { DynamicScaffolding } from './dynamic-scaffolding.js';
export { OrchestratorWorkforce } from './orchestrator-workforce.js';
export { ToolArbiter } from './tool-arbiter.js';
export { EvaluationPattern } from './evaluation.js';
export { Supervisor } from './supervisor.js';
export { MultiAgentDebate } from './multi-agent.js';
export { AgentWorkforce } from './agent-workforce.js';
export { SelfDiscovery } from './self-discovery.js';
export { ContextCompression } from './context-compression.js';
export { MemoryAugmented } from './memory-augmented.js';
export { HumanInTheLoop } from './human-in-the-loop.js';
export { ChainOfThought } from './chain-of-thought.js';
export { ToolAugmented } from './tool-augmented.js';
export { SelfConsistency } from './self-consistency.js';
export { AdaptiveThinking } from './adaptive-thinking.js';

// Pre-existing function-based patterns (5) — re-exported for convenience
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