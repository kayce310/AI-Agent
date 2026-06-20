/**
 * @file Self-Evolution Learner
 * @layer core
 * @owner evolution
 *
 * Injects relevant past experiences into the prompt.
 * This is how Coral "learns from itself" — by seeing what worked/failed before.
 */

import { Logger } from '../logger.js';
import { ExperienceStore, ExperienceBlock } from './experience-store.js';

const log = new Logger({ module: 'Learner' });

/**
 * SelfEvolutionLearner — Queries past experiences and formats them for prompt injection.
 * 
 * Usage:
 *   const learner = new SelfEvolutionLearner(experienceStore);
 *   const context = await learner.getContext("install pnpm", 5);
 *   // Returns: "Previously: \n✅ Used [pnpm] — installed successfully\n❌ Tried [npm] — version conflict..."
 */
export class SelfEvolutionLearner {
  private store: ExperienceStore;
  private enabled = true;
  private maxExperiences = 5;

  constructor(store: ExperienceStore, options?: { enabled?: boolean; maxExperiences?: number }) {
    this.store = store;
    if (options?.enabled !== undefined) this.enabled = options.enabled;
    if (options?.maxExperiences !== undefined) this.maxExperiences = options.maxExperiences;
  }

  /**
   * Get learning context for a given task.
   * Returns formatted string to inject into prompt, or null if no relevant experiences.
   */
  async getContext(task: string, limit?: number): Promise<string | null> {
    if (!this.enabled) return null;

    const max = limit ?? this.maxExperiences;
    const experiences = await this.store.findSimilar(task, max);

    if (experiences.length === 0) return null;

    return this.formatExperiences(experiences);
  }

  /**
   * Get stats about learning.
   */
  async getStats(): Promise<{ total: number; successRate: string; topTags: string[] }> {
    const stats = await this.store.getStats();
    const successRate = stats.total > 0
      ? `${Math.round((stats.success / stats.total) * 100)}%`
      : '0%';
    return {
      total: stats.total,
      successRate,
      topTags: stats.topTags,
    };
  }

  /**
   * Format experiences for prompt injection.
   */
  private formatExperiences(experiences: ExperienceBlock[]): string {
    const lines: string[] = [];

    for (const exp of experiences) {
      const icon = exp.outcome === 'success' ? '✅' : exp.outcome === 'failure' ? '❌' : '⚠️';
      const duration = exp.durationMs ? ` (${exp.durationMs}ms)` : '';
      const tags = exp.contextTags.length > 0 ? ` [${exp.contextTags.slice(0, 3).join(', ')}]` : '';

      lines.push(`${icon} ${exp.task}: ${exp.action.slice(0, 80)}${tags}${duration}`);
    }

    return [
      '--- KINH NGHIỆM (Learning Context) ---',
      'Các task tương tự đã thực hiện trước đó:',
      ...lines,
      '--- KẾT THÚC KINH NGHIỆM ---',
    ].join('\n');
  }
}

export default SelfEvolutionLearner;
