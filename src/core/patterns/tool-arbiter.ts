/**
 * Tool Arbiter Pattern
 * Tool selection arbitration — intelligently selects the best tool for a given task.
 * 
 * Evaluates available tools based on:
 * - Task requirements matching
 * - Tool capability scores
 * - Historical success rates
 * - Cost/token efficiency
 */

export interface ToolCapability {
  name: string;
  description: string;
  inputTypes: string[];
  outputTypes: string[];
  costPerCall: number;
  avgLatencyMs: number;
  successRate: number;
}

export interface ArbitrationResult {
  selectedTool: string;
  confidence: number;
  reasoning: string;
  alternatives: { tool: string; score: number }[];
}

export class ToolArbiter {
  private tools: Map<string, ToolCapability> = new Map();
  private history: Map<string, { successes: number; failures: number }> = new Map();

  registerTool(capability: ToolCapability): void {
    this.tools.set(capability.name, capability);
    if (!this.history.has(capability.name)) {
      this.history.set(capability.name, { successes: 0, failures: 0 });
    }
  }

  /**
   * Arbitrate: select the best tool for a given task.
   */
  arbitrate(task: string, availableTools?: string[]): ArbitrationResult {
    const toolsToEvaluate = availableTools
      ? availableTools.filter(t => this.tools.has(t)).map(t => this.tools.get(t)!)
      : Array.from(this.tools.values());

    if (toolsToEvaluate.length === 0) {
      return {
        selectedTool: 'none',
        confidence: 0,
        reasoning: 'No tools available for arbitration',
        alternatives: [],
      };
    }

    const scores = toolsToEvaluate.map(tool => ({
      tool: tool.name,
      score: this.calculateScore(tool, task),
    }));

    scores.sort((a, b) => b.score - a.score);

    const winner = scores[0];
    const tool = this.tools.get(winner.tool)!;

    return {
      selectedTool: winner.tool,
      confidence: Math.min(winner.score / 100, 1),
      reasoning: `Selected "${winner.tool}" with score ${winner.score.toFixed(1)}/100. ` +
        `Success rate: ${(tool.successRate * 100).toFixed(0)}%, ` +
        `Cost: ${tool.costPerCall} tokens, ` +
        `Latency: ${tool.avgLatencyMs}ms`,
      alternatives: scores.slice(1, 4),
    };
  }

  private calculateScore(tool: ToolCapability, task: string): number {
    let score = 0;
    const lowerTask = task.toLowerCase();

    // Keyword matching (40 points)
    const keywords = tool.description.toLowerCase().split(/\s+/);
    const taskWords = lowerTask.split(/\s+/);
    const matches = keywords.filter(k => taskWords.includes(k));
    score += (matches.length / Math.max(keywords.length, 1)) * 40;

    // Success rate (30 points)
    score += tool.successRate * 30;

    // Cost efficiency (20 points) — lower cost = higher score
    const maxCost = Math.max(...Array.from(this.tools.values()).map(t => t.costPerCall), 1);
    score += (1 - tool.costPerCall / maxCost) * 20;

    // Latency (10 points) — lower latency = higher score
    const maxLatency = Math.max(...Array.from(this.tools.values()).map(t => t.avgLatencyMs), 1);
    score += (1 - tool.avgLatencyMs / maxLatency) * 10;

    return Math.min(score, 100);
  }

  /**
   * Record success/failure for a tool call.
   */
  recordOutcome(toolName: string, success: boolean): void {
    const record = this.history.get(toolName) || { successes: 0, failures: 0 };
    if (success) {
      record.successes++;
    } else {
      record.failures++;
    }
    this.history.set(toolName, record);

    // Update success rate
    const tool = this.tools.get(toolName);
    if (tool) {
      const total = record.successes + record.failures;
      tool.successRate = total > 0 ? record.successes / total : 0.5;
    }
  }

  /**
   * Get arbitration statistics.
   */
  getStats(): { totalTools: number; avgSuccessRate: number; totalCalls: number } {
    const tools = Array.from(this.tools.values());
    const totalCalls = Array.from(this.history.values()).reduce((sum, h) => sum + h.successes + h.failures, 0);
    const avgSuccessRate = tools.length > 0
      ? tools.reduce((sum, t) => sum + t.successRate, 0) / tools.length
      : 0;

    return { totalTools: tools.length, avgSuccessRate, totalCalls };
  }
}

export default ToolArbiter;