/**
 * Kato Agent — Pattern Registry (Phase 7.2a)
 * 
 * Strategy pattern registry for agentic design patterns.
 * Each pattern defines a way to structure, route, and execute tasks.
 * Inspired by 21 Agentic Design Patterns (Andrew Ng, et al).
 */

// ── Pattern Definitions ─────────────────────────────────────────

export type PatternCategory =
  | 'chaining'
  | 'routing'
  | 'parallel'
  | 'code-exec'
  | 'reflection'
  | 'planning'
  | 'memory'
  | 'tool-use';

export interface AgenticPattern {
  id: string;
  name: string;
  category: PatternCategory;
  description: string;
  whenToUse: string;
  complexity: 'low' | 'medium' | 'high';
  fallbackPatterns?: string[];   // pattern IDs to fall back to
}

export interface PatternRegistry {
  register(pattern: AgenticPattern): void;
  get(id: string): AgenticPattern | undefined;
  findByCategory(category: PatternCategory): AgenticPattern[];
  all(): AgenticPattern[];
  remove(id: string): boolean;
}

export function createPatternRegistry(): PatternRegistry {
  const patterns = new Map<string, AgenticPattern>();

  return {
    register(pattern: AgenticPattern): void {
      if (patterns.has(pattern.id)) {
        throw new Error(`Pattern '${pattern.id}' already registered`);
      }
      patterns.set(pattern.id, { ...pattern });
    },

    get(id: string): AgenticPattern | undefined {
      const p = patterns.get(id);
      return p ? { ...p } : undefined;
    },

    findByCategory(category: PatternCategory): AgenticPattern[] {
      return Array.from(patterns.values()).filter(p => p.category === category);
    },

    all(): AgenticPattern[] {
      return Array.from(patterns.values()).map(p => ({ ...p }));
    },

    remove(id: string): boolean {
      return patterns.delete(id);
    },
  };
}

// ── 21 Critical Agentic Design Patterns ─────────────────────────

export function registerAllPatterns(registry: PatternRegistry): void {
  // 1. Chaining Patterns (Sequential)
  registry.register({
    id: 'chain-of-thought',
    name: 'Chain of Thought',
    category: 'chaining',
    description: 'Break complex reasoning into step-by-step intermediate thoughts before final answer',
    whenToUse: 'Math, logic, multi-step reasoning tasks',
    complexity: 'low',
    fallbackPatterns: ['reflection'],
  });
  registry.register({
    id: 'sop-execution',
    name: 'SOP Execution',
    category: 'chaining',
    description: 'Execute a predefined Standard Operating Procedure step-by-step with verification',
    whenToUse: 'Repeatable, well-defined procedures like analysis, research, writing',
    complexity: 'medium',
    fallbackPatterns: ['chain-of-thought'],
  });
  registry.register({
    id: 'plan-execute',
    name: 'Plan & Execute',
    category: 'chaining',
    description: 'First create a plan, then execute each step, adjusting as needed',
    whenToUse: 'Complex multi-step tasks requiring planning before execution',
    complexity: 'medium',
    fallbackPatterns: ['sop-execution', 'chain-of-thought'],
  });

  // 2. Routing Patterns
  registry.register({
    id: 'task-specific',
    name: 'Task-Specific Router',
    category: 'routing',
    description: 'Route to specialized handler based on task type classification',
    whenToUse: 'Multi-domain agent that needs different strategies per task type',
    complexity: 'medium',
    fallbackPatterns: ['chain-of-thought'],
  });
  registry.register({
    id: 'model-cascade',
    name: 'Model Cascade / Tiered Router',
    category: 'routing',
    description: 'Try cheaper/faster models first, fall back to more capable ones for complex tasks',
    whenToUse: 'Cost optimization, when tasks vary in complexity',
    complexity: 'high',
  });
  registry.register({
    id: 'router-strip',
    name: 'Router Strip',
    category: 'routing',
    description: 'Apply multiple routers sequentially: relevance → safety → complexity → tool selection',
    whenToUse: 'Production-grade agents needing comprehensive routing logic',
    complexity: 'high',
    fallbackPatterns: ['task-specific'],
  });

  // 3. Parallel Patterns
  registry.register({
    id: 'parallel-execution',
    name: 'Parallel Execution',
    category: 'parallel',
    description: 'Execute independent sub-tasks concurrently for speed',
    whenToUse: 'Tasks with independent sub-components (research multiple topics)',
    complexity: 'medium',
    fallbackPatterns: ['chain-of-thought'],
  });
  registry.register({
    id: 'voting-consensus',
    name: 'Voting / Consensus',
    category: 'parallel',
    description: 'Run the same task multiple times and aggregate results via majority vote',
    whenToUse: 'High-accuracy requirements, fact-checking, code review',
    complexity: 'medium',
    fallbackPatterns: ['reflection'],
  });
  registry.register({
    id: 'mixture-of-agents',
    name: 'Mixture of Agents',
    category: 'parallel',
    description: 'Divide work among specialized agents, each with different roles/tools',
    whenToUse: 'Complex domain tasks requiring multiple expertise areas',
    complexity: 'high',
    fallbackPatterns: ['parallel-execution'],
  });

  // 4. Code Execution Patterns
  registry.register({
    id: 'code-generation',
    name: 'Code Generation with Verification',
    category: 'code-exec',
    description: 'Generate code, run tests, iterate until passing',
    whenToUse: 'Programming tasks, data analysis, automation scripts',
    complexity: 'medium',
    fallbackPatterns: ['chain-of-thought', 'reflection'],
  });
  registry.register({
    id: 'tool-augmented',
    name: 'Tool-Augmented Generation',
    category: 'code-exec',
    description: 'Use code/tools to compute results and inject into response',
    whenToUse: 'Tasks needing computation, data access, or external APIs',
    complexity: 'medium',
    fallbackPatterns: ['chain-of-thought'],
  });
  registry.register({
    id: 'sandboxed-execution',
    name: 'Sandboxed Code Execution',
    category: 'code-exec',
    description: 'Execute generated code in isolated sandbox with resource limits',
    whenToUse: 'Unsafe code execution, multi-tenant environments',
    complexity: 'high',
    fallbackPatterns: ['tool-augmented'],
  });

  // 5. Reflection Patterns
  registry.register({
    id: 'reflection',
    name: 'Self-Reflection / Critique',
    category: 'reflection',
    description: 'LLM critiques its own output and refines based on self-feedback',
    whenToUse: 'Quality-critical tasks, creative writing, analysis',
    complexity: 'low',
    fallbackPatterns: ['chain-of-thought'],
  });
  registry.register({
    id: 'reflexion',
    name: 'Reflexion (Decision + Reflection Loop)',
    category: 'reflection',
    description: 'Act → Observe → Reflect → Retry with memory of past attempts',
    whenToUse: 'Tasks requiring iterative improvement, debugging',
    complexity: 'medium',
    fallbackPatterns: ['reflection', 'chain-of-thought'],
  });
  registry.register({
    id: 'self-ask',
    name: 'Self-Ask / Decomposition',
    category: 'reflection',
    description: 'LLM generates follow-up questions to decompose ambiguity',
    whenToUse: 'Ambiguous tasks, incomplete specifications',
    complexity: 'medium',
    fallbackPatterns: ['reflection', 'chain-of-thought'],
  });

  // 6. Planning Patterns
  registry.register({
    id: 'rewoo',
    name: 'ReWOO (Reasoning Without Observation)',
    category: 'planning',
    description: 'Plan all tool calls upfront, then execute them in parallel without interleaved reasoning',
    whenToUse: 'Tasks needing multiple independent tool calls before synthesis',
    complexity: 'high',
    fallbackPatterns: ['plan-execute', 'chain-of-thought'],
  });
  registry.register({
    id: 'tree-of-thoughts',
    name: 'Tree of Thoughts',
    category: 'planning',
    description: 'Explore multiple reasoning branches simultaneously, evaluate and backtrack',
    whenToUse: 'Creative problem-solving, puzzles, strategic planning',
    complexity: 'high',
    fallbackPatterns: ['chain-of-thought'],
  });
  registry.register({
    id: 'least-to-most',
    name: 'Least-to-Most Prompting',
    category: 'planning',
    description: 'Break problem into subproblems, solve easiest first, use results for harder ones',
    whenToUse: 'Complex problems with clear subproblem hierarchy',
    complexity: 'medium',
    fallbackPatterns: ['chain-of-thought', 'plan-execute'],
  });

  // 7. Memory Patterns
  registry.register({
    id: 'context-window',
    name: 'Context Window Management',
    category: 'memory',
    description: 'Selectively manage context: prioritize, summarize, rotate outdated entries',
    whenToUse: 'Long-running agents, continuous conversations',
    complexity: 'medium',
  });
  registry.register({
    id: 'rag',
    name: 'Retrieval-Augmented Generation',
    category: 'memory',
    description: 'Retrieve relevant documents from knowledge base before generation',
    whenToUse: 'Knowledge-intensive tasks, Q&A on private data',
    complexity: 'medium',
    fallbackPatterns: ['chain-of-thought'],
  });
  registry.register({
    id: 'episodic-memory',
    name: 'Episodic Memory with Reflection',
    category: 'memory',
    description: 'Store past experiences (actions + outcomes), retrieve similar episodes for guidance',
    whenToUse: 'Tasks benefiting from past experience, learning from mistakes',
    complexity: 'high',
    fallbackPatterns: ['rag', 'reflection'],
  });

  // 8. Tool Use Patterns
  registry.register({
    id: 'tool-selection',
    name: 'Automatic Tool Selection',
    category: 'tool-use',
    description: 'LLM dynamically selects the best tool based on current task context',
    whenToUse: 'Rich tool ecosystem, tasks requiring different tools',
    complexity: 'medium',
    fallbackPatterns: ['chain-of-thought'],
  });
  registry.register({
    id: 'multi-hop-tool',
    name: 'Multi-Hop Tool Use',
    category: 'tool-use',
    description: 'Chain multiple tool calls where output of one feeds into next',
    whenToUse: 'Complex workflows needing sequential tool orchestration',
    complexity: 'high',
    fallbackPatterns: ['tool-selection', 'chain-of-thought'],
  });
  registry.register({
    id: 'feedback-loop',
    name: 'Tool Feedback Loop',
    category: 'tool-use',
    description: 'Call tool, analyze result, decide next action in loop until satisfied',
    whenToUse: 'Iterative tasks, data exploration, debugging',
    complexity: 'medium',
    fallbackPatterns: ['tool-selection', 'reflexion'],
  });
}