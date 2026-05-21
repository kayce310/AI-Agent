/**
 * @file self-consistency — Agent pattern
 * @layer core
 * @depends-on (none — standalone)
 * @imported-by src/core/patterns/index.ts
 * @owner core-patterns
 */

/**
 * Self-Consistency Pattern
 * Generate multiple reasoning paths and select the most consistent answer.
 * 
 * Flow:
 * 1. Generate N independent reasoning paths
 * 2. Extract answers from each path
 * 3. Select the most frequent/consistent answer
 */

export interface ReasoningPath {
  id: number;
  reasoning: string;
  answer: string;
  confidence: number;
}

export interface ConsistencyResult {
  selectedAnswer: string;
  consistencyScore: number;
  paths: ReasoningPath[];
  voteCounts: Record<string, number>;
}

export class SelfConsistency {
  private numPaths: number;

  constructor(numPaths: number = 5) {
    this.numPaths = numPaths;
  }

  /**
   * Generate multiple reasoning prompts for the same task.
   */
  generatePrompts(task: string): string[] {
    const templates = [
      `Solve this step by step: ${task}`,
      `Think carefully and solve: ${task}`,
      `Approach this systematically: ${task}`,
      `Break this down and solve: ${task}`,
      `Reason through this carefully: ${task}`,
    ];
    return templates.slice(0, this.numPaths);
  }

  /**
   * Parse reasoning paths from LLM responses.
   */
  parsePaths(responses: string[]): ReasoningPath[] {
    return responses.map((resp, idx) => {
      const answerMatch = resp.match(/(?:Answer|Result|Conclusion|Final)[:\s]*(.+)/i);
      const answer = answerMatch ? answerMatch[1].trim() : resp.trim();
      return {
        id: idx + 1,
        reasoning: resp,
        answer,
        confidence: 0.5 + Math.random() * 0.3,
      };
    });
  }

  /**
   * Select the most consistent answer using majority voting.
   */
  selectAnswer(paths: ReasoningPath[]): ConsistencyResult {
    const voteCounts: Record<string, number> = {};

    for (const path of paths) {
      const normalized = path.answer.toLowerCase().trim();
      voteCounts[normalized] = (voteCounts[normalized] || 0) + 1;
    }

    let selectedAnswer = '';
    let maxVotes = 0;
    for (const [answer, count] of Object.entries(voteCounts)) {
      if (count > maxVotes) {
        maxVotes = count;
        selectedAnswer = answer;
      }
    }

    const consistencyScore = paths.length > 0 ? maxVotes / paths.length : 0;

    return {
      selectedAnswer,
      consistencyScore,
      paths,
      voteCounts,
    };
  }
}

export default SelfConsistency;