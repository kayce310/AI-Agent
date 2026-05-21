/**
 * @file reflection — Agent pattern
 * @layer core
 * @depends-on (none — standalone)
 * @imported-by src/core/patterns/index.ts
 * @owner core-patterns
 */

/**
 * Reflection Pattern — Self-evaluate and refine outputs
 * Phase 7.2c: generate → critique → refine cycle
 */

import { ModelRouter } from '../llm/model-adapter.js';

export interface ReflectionStep {
  type: 'generate' | 'critique' | 'refine';
  content: string;
}

export interface ReflectionConfig {
  maxCycles: number;
  critiquePrompt: string;
}

const DEFAULT_CONFIG: ReflectionConfig = {
  maxCycles: 3,
  critiquePrompt: 'Review the above output critically. Identify issues, errors, or improvements:',
};

/**
 * Run a reflection cycle: generate → critique → refine.
 */
export async function executeReflection(
  task: string,
  modelRouter: ModelRouter,
  config?: Partial<ReflectionConfig>,
): Promise<{ steps: ReflectionStep[]; finalOutput: string; cyclesUsed: number }> {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const steps: ReflectionStep[] = [];
  let currentOutput = '';

  for (let cycle = 0; cycle < cfg.maxCycles; cycle++) {
    // Generate
    const generateResult = await modelRouter.route([
      { role: 'user', content: cycle === 0 ? task : `Refine the following based on critique:\n\n${currentOutput}` },
    ], { maxTokens: 2048 });
    const generated = generateResult.content || '';
    steps.push({ type: 'generate', content: generated });

    if (cycle === cfg.maxCycles - 1) {
      currentOutput = generated;
      break;
    }

    // Critique
    const critiqueResult = await modelRouter.route([
      { role: 'user', content: `${generated}\n\n${cfg.critiquePrompt}` },
    ], { maxTokens: 1024 });
    const critique = critiqueResult.content || '';
    steps.push({ type: 'critique', content: critique });

    currentOutput = generated;
  }

  return { steps, finalOutput: currentOutput, cyclesUsed: steps.length };
}