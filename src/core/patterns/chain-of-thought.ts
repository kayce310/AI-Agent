/**
 * @file chain-of-thought — Agent pattern
 * @layer core
 * @depends-on src/core/llm/model-adapter.ts
 * @imported-by src/core/patterns/index.ts
 * @owner core-patterns
 */

/**
 * Chain of Thought Pattern
 * Breaks complex reasoning into step-by-step intermediate thoughts
 * before producing the final answer.
 */

import { ModelAdapter, ModelResponse } from '../llm/model-adapter.js';

export interface ChainOfThoughtStep {
  thought: string;
  action?: string;
  observation?: string;
}

export interface ChainOfThoughtResult {
  steps: ChainOfThoughtStep[];
  finalAnswer: string;
}

const COT_SYSTEM_PROMPT = `You are a reasoning engine that uses Chain of Thought.
For each question, break down your reasoning into clear steps:
1. First, analyze what is being asked
2. Break down the problem into sub-problems
3. Reason through each step explicitly
4. Arrive at a final conclusion

Format your response as:
STEP 1: [your first reasoning step]
STEP 2: [your second reasoning step]
...
FINAL ANSWER: [your concise final answer]`;

export class ChainOfThought {
  private model: ModelAdapter;

  constructor(model: ModelAdapter) {
    this.model = model;
  }

  async solve(question: string): Promise<ChainOfThoughtResult> {
    const messages = [
      { role: 'system' as const, content: COT_SYSTEM_PROMPT },
      { role: 'user' as const, content: question },
    ];

    const response: ModelResponse = await this.model.invoke(messages, {
      temperature: 0.3,
      maxTokens: 2048,
    });

    return this.parseResponse(response.content);
  }

  private parseResponse(content: string): ChainOfThoughtResult {
    const steps: ChainOfThoughtStep[] = [];
    const lines = content.split('\n');
    let finalAnswer = '';

    for (const line of lines) {
      const stepMatch = line.match(/^STEP\s*\d+:\s*(.+)/i);
      if (stepMatch) {
        steps.push({ thought: stepMatch[1].trim() });
      }
      const answerMatch = line.match(/^FINAL\s*ANSWER:\s*(.+)/i);
      if (answerMatch) {
        finalAnswer = answerMatch[1].trim();
      }
    }

    if (!finalAnswer && steps.length > 0) {
      finalAnswer = steps[steps.length - 1].thought;
    }

    return { steps, finalAnswer };
  }
}
