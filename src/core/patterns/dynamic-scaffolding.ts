/**
 * @file dynamic-scaffolding — Agent pattern
 * @layer core
 * @depends-on (none — standalone)
 * @imported-by src/core/patterns/index.ts
 * @owner core-patterns
 */

/**
 * Dynamic Scaffolding Pattern
 * Auto-generate agent structure based on task analysis.
 * 
 * Analyzes task complexity and dynamically creates:
 * - Sub-agent roles
 * - Tool assignments
 * - Communication protocols
 * - Execution order
 */

export interface ScaffoldingConfig {
  maxAgents: number;
  maxDepth: number;
  allowParallel: boolean;
}

export interface AgentRole {
  id: string;
  name: string;
  role: string;
  tools: string[];
  dependencies: string[];
  prompt: string;
}

export interface ScaffoldingPlan {
  taskId: string;
  agents: AgentRole[];
  executionOrder: string[][];
  communicationProtocol: 'sequential' | 'parallel' | 'hybrid';
}

const DEFAULT_CONFIG: ScaffoldingConfig = {
  maxAgents: 5,
  maxDepth: 3,
  allowParallel: true,
};

export class DynamicScaffolding {
  private config: ScaffoldingConfig;

  constructor(config?: Partial<ScaffoldingConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Analyze task and generate scaffolding plan.
   */
  analyze(task: string): ScaffoldingPlan {
    const complexity = this.assessComplexity(task);
    const agents = this.generateRoles(task, complexity);
    const executionOrder = this.computeExecutionOrder(agents);
    const protocol = this.determineProtocol(complexity);

    return {
      taskId: `task-${Date.now()}`,
      agents,
      executionOrder,
      communicationProtocol: protocol,
    };
  }

  private assessComplexity(task: string): 'simple' | 'moderate' | 'complex' {
    const wordCount = task.split(/\s+/).length;
    const hasMultipleSteps = /\b(then|after|next|finally|step)\b/i.test(task);
    const hasConditions = /\b(if|when|unless|depending)\b/i.test(task);

    if (wordCount > 50 || (hasMultipleSteps && hasConditions)) return 'complex';
    if (wordCount > 20 || hasMultipleSteps) return 'moderate';
    return 'simple';
  }

  private generateRoles(task: string, complexity: string): AgentRole[] {
    const agents: AgentRole[] = [];

    // Always have a coordinator
    agents.push({
      id: 'coordinator',
      name: 'Task Coordinator',
      role: 'Orchestrate and synthesize results from all sub-agents',
      tools: ['synthesize', 'validate'],
      dependencies: [],
      prompt: `You are the task coordinator. Your job is to:\n1. Break down the task: "${task}"\n2. Delegate to specialized sub-agents\n3. Synthesize their outputs into a final result\n\nAlways validate the final output before returning.`,
    });

    if (complexity === 'simple') {
      agents.push({
        id: 'executor',
        name: 'Task Executor',
        role: 'Execute the task directly',
        tools: ['execute', 'validate'],
        dependencies: ['coordinator'],
        prompt: `Execute this task: "${task}"\n\nProvide a complete, well-structured response.`,
      });
    } else {
      // Add researcher for complex tasks
      agents.push({
        id: 'researcher',
        name: 'Research Agent',
        role: 'Gather information and research the topic',
        tools: ['search', 'read', 'analyze'],
        dependencies: ['coordinator'],
        prompt: `Research the following task thoroughly: "${task}"\n\nGather relevant information, facts, and context. Provide structured findings.`,
      });

      // Add analyst
      agents.push({
        id: 'analyst',
        name: 'Analysis Agent',
        role: 'Analyze research findings and synthesize insights',
        tools: ['analyze', 'compare', 'evaluate'],
        dependencies: ['researcher'],
        prompt: `Analyze the research findings for: "${task}"\n\nIdentify patterns, insights, and actionable conclusions.`,
      });

      // Add writer for complex tasks
      if (complexity === 'complex') {
        agents.push({
          id: 'writer',
          name: 'Synthesis Agent',
          role: 'Write the final output based on analysis',
          tools: ['write', 'format', 'validate'],
          dependencies: ['analyst'],
          prompt: `Based on the analysis, produce a comprehensive response for: "${task}"\n\nEnsure the output is well-structured, complete, and actionable.`,
        });
      }
    }

    return agents.slice(0, this.config.maxAgents);
  }

  private computeExecutionOrder(agents: AgentRole[]): string[][] {
    const order: string[][] = [];
    const completed = new Set<string>();

    // First level: agents with no dependencies (coordinator)
    const firstLevel = agents.filter(a => a.dependencies.length === 0).map(a => a.id);
    if (firstLevel.length > 0) {
      order.push(firstLevel);
      firstLevel.forEach(id => completed.add(id));
    }

    // Subsequent levels: agents whose dependencies are all completed
    let remaining = agents.filter(a => !completed.has(a.id));
    while (remaining.length > 0) {
      const level = remaining.filter(a =>
        a.dependencies.every(dep => completed.has(dep))
      ).map(a => a.id);

      if (level.length === 0) break; // Circular dependency protection

      order.push(level);
      level.forEach(id => completed.add(id));
      remaining = agents.filter(a => !completed.has(a.id));
    }

    return order;
  }

  private determineProtocol(complexity: string): 'sequential' | 'parallel' | 'hybrid' {
    if (complexity === 'simple') return 'sequential';
    if (complexity === 'complex' && this.config.allowParallel) return 'hybrid';
    return 'sequential';
  }

  /**
   * Get prompt template for a specific role.
   */
  getPromptTemplate(role: AgentRole): string {
    return role.prompt;
  }

  /**
   * Validate that a scaffolding plan is executable.
   */
  validatePlan(plan: ScaffoldingPlan): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (plan.agents.length === 0) {
      errors.push('No agents defined in plan');
    }

    if (plan.executionOrder.length === 0) {
      errors.push('No execution order defined');
    }

    // Check for circular dependencies
    const agentIds = new Set(plan.agents.map(a => a.id));
    for (const agent of plan.agents) {
      for (const dep of agent.dependencies) {
        if (!agentIds.has(dep)) {
          errors.push(`Agent ${agent.id} depends on non-existent agent ${dep}`);
        }
      }
    }

    return { valid: errors.length === 0, errors };
  }
}

export default DynamicScaffolding;