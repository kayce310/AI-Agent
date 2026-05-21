/**
 * @file adaptive-thinking — Agent pattern
 * @layer core
 * @depends-on (none — standalone)
 * @imported-by src/core/patterns/index.ts
 * @owner core-patterns
 */

/**
 * Adaptive Thinking Pattern
 * Adjusts thinking depth based on task complexity.
 * 
 * - Simple tasks: Quick response (shallow thinking)
 * - Moderate tasks: Standard reasoning (medium depth)
 * - Complex tasks: Deep analysis (extended thinking)
 */

export interface ThinkingConfig {
  shallowMaxTokens: number;
  mediumMaxTokens: number;
  deepMaxTokens: number;
  complexityThresholds: { simple: number; moderate: number };
}

export interface ThinkingResult {
  depth: 'shallow' | 'medium' | 'deep';
  maxTokens: number;
  prompt: string;
  reasoning: string;
}

const DEFAULT_CONFIG: ThinkingConfig = {
  shallowMaxTokens: 256,
  mediumMaxTokens: 1024,
  deepMaxTokens: 4096,
  complexityThresholds: { simple: 20, moderate: 50 },
};

export class AdaptiveThinking {
  private config: ThinkingConfig;

  constructor(config?: Partial<ThinkingConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Assess task complexity and determine thinking depth.
   */
  assessDepth(task: string): 'shallow' | 'medium' | 'deep' {
    const wordCount = task.split(/\s+/).length;
    const hasMultipleSteps = /\b(then|after|next|finally|step)\b/i.test(task);
    const hasConditions = /\b(if|when|unless|depending)\b/i.test(task);
    const hasAnalysis = /\b(analyze|compare|evaluate|synthesize|design)\b/i.test(task);

    let score = wordCount;
    if (hasMultipleSteps) score += 20;
    if (hasConditions) score += 15;
    if (hasAnalysis) score += 25;

    if (score < this.config.complexityThresholds.simple) return 'shallow';
    if (score < this.config.complexityThresholds.moderate) return 'medium';
    return 'deep';
  }

  /**
   * Get max tokens for a thinking depth.
   */
  getMaxTokens(depth: 'shallow' | 'medium' | 'deep'): number {
    switch (depth) {
      case 'shallow': return this.config.shallowMaxTokens;
      case 'medium': return this.config.mediumMaxTokens;
      case 'deep': return this.config.deepMaxTokens;
    }
  }

  /**
   * Build adaptive prompt based on assessed depth.
   */
  buildPrompt(task: string): ThinkingResult {
    const depth = this.assessDepth(task);
    const maxTokens = this.getMaxTokens(depth);

    let prompt: string;
    let reasoning: string;

    switch (depth) {
      case 'shallow':
        prompt = `Provide a concise answer to: ${task}`;
        reasoning = 'Quick response mode — minimal reasoning required.';
        break;
      case 'medium':
        prompt = `Think through this carefully and provide a well-reasoned answer:\n\n${task}\n\nReason step by step:`;
        reasoning = 'Standard reasoning mode — balanced depth and efficiency.';
        break;
      case 'deep':
        prompt = `Perform a deep analysis of the following:\n\n${task}\n\n` +
          `Approach:\n1. Break down the problem\n2. Analyze each component\n3. Consider alternatives\n4. Synthesize findings\n5. Provide comprehensive answer\n\nDetailed analysis:`;
        reasoning = 'Deep analysis mode — extended reasoning for complex problems.';
        break;
    }

    return { depth, maxTokens, prompt, reasoning };
  }
}

export default AdaptiveThinking;