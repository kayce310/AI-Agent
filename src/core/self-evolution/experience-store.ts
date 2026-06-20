/**
 * @file Experience Store — Coral's Learning Memory
 * @layer core
 * @owner evolution
 *
 * Stores experiences (success/failure) from past tool calls and tasks.
 * Each experience is tagged with context for similarity matching.
 * 
 * This builds on top of MemoryStore (Phase 1), adding structured
 * outcome tracking and retrieval for self-improvement.
 */

import { Logger } from '../logger.js';
import { globalMemoryStore } from '../memory/memory-store.js';

const log = new Logger({ module: 'Experience' });

// ═══ EXPERIENCE TYPES ═══

export type ExperienceOutcome = 'success' | 'failure' | 'partial' | 'error';
export type ExperienceSource = 'tool' | 'agent' | 'engine' | 'cron';

export interface ExperienceBlock {
  id: string;
  timestamp: number;
  source: ExperienceSource;
  outcome: ExperienceOutcome;
  
  /** What was being done (e.g., "install npm package", "calculate fibonacci") */
  task: string;
  
  /** What context surrounded this task */
  contextTags: string[];
  
  /** What was tried (tool name, approach) */
  action: string;
  
  /** What happened (result summary, error message) */
  result: string;
  
  /** How long it took (ms) */
  durationMs?: number;
  
  /** Tags for query matching */
  tags: string[];
  
  /** Session/chat ID for context */
  sessionId?: string;
  
  /** Full raw output (truncated to 500 chars) */
  detail?: string;
}

// ═══ EXPERIENCE STORE ═══

/**
 * ExperienceStore — Records and queries past experiences for self-improvement.
 * 
 * Usage:
 *   const ex = new ExperienceStore();
 *   await ex.record('install pnpm', 'wrote Docker script', 'success', ['docker', 'node']);
 *   const similar = await ex.findSimilar('install node', 5);
 */
export class ExperienceStore {
  private blockCounter = 0;

  /**
   * Record a new experience.
   * Saves as a memory block so it persists across restarts.
   */
  async record(
    task: string,
    action: string,
    outcome: ExperienceOutcome,
    tags: string[],
    options?: {
      source?: ExperienceSource;
      durationMs?: number;
      result?: string;
      detail?: string;
      sessionId?: string;
    }
  ): Promise<string> {
    const block: ExperienceBlock = {
      id: `exp_${Date.now()}_${++this.blockCounter}`,
      timestamp: Date.now(),
      source: options?.source ?? 'agent',
      outcome,
      task,
      contextTags: tags,
      action,
      result: options?.result ?? this.defaultResult(outcome),
      durationMs: options?.durationMs,
      tags: ['experience', outcome, ...tags],
      sessionId: options?.sessionId,
      detail: options?.detail?.slice(0, 500),
    };

    // Persist to MemoryStore
    try {
      const content = this.serialize(block);
      await globalMemoryStore.add('persona', content, {
        sessionId: options?.sessionId ?? 'evolution',
        tags: block.tags,
      });
    } catch (err: any) {
      log.warn(`Failed to persist experience: ${err.message}`);
    }

    log.debug(`Recorded ${outcome}: ${task} → ${action}`);
    return block.id;
  }

  /**
   * Record a tool success.
   */
  async recordSuccess(
    task: string,
    action: string,
    tags: string[],
    options?: { durationMs?: number; sessionId?: string }
  ): Promise<string> {
    return this.record(task, action, 'success', tags, {
      ...options,
      result: `Successfully completed: ${action}`,
    });
  }

  /**
   * Record a tool failure.
   */
  async recordFailure(
    task: string,
    action: string,
    error: string,
    tags: string[],
    options?: { durationMs?: number; sessionId?: string }
  ): Promise<string> {
    return this.record(task, action, 'failure', tags, {
      ...options,
      result: `Failed: ${error}`,
      detail: error,
    });
  }

  /**
   * Find experiences similar to a task.
   * Uses MemoryStore.query() with tag matching.
   */
  async findSimilar(task: string, limit = 5): Promise<ExperienceBlock[]> {
    try {
      // Query with experience-relevant tags
      const results = await globalMemoryStore.query(task, {
        topK: limit * 2,
        tags: ['experience'],
      });

      // Parse and deduplicate
      const experiences: ExperienceBlock[] = [];
      const seen = new Set<string>();

      for (const r of results) {
        const parsed = this.deserialize(r.content);
        if (parsed && !seen.has(parsed.id)) {
          seen.add(parsed.id);
          experiences.push(parsed);
          if (experiences.length >= limit) break;
        }
      }

      return experiences;
    } catch (err: any) {
      log.warn(`Failed to query experiences: ${err.message}`);
      return [];
    }
  }

  /**
   * Get recent experiences.
   */
  async recent(limit = 10): Promise<ExperienceBlock[]> {
    try {
      const results = await globalMemoryStore.query('experience', {
        topK: limit * 2,
      });

      const experiences: ExperienceBlock[] = [];
      const seen = new Set<string>();

      for (const r of results) {
        const parsed = this.deserialize(r.content);
        if (parsed && !seen.has(parsed.id)) {
          seen.add(parsed.id);
          experiences.push(parsed);
          if (experiences.length >= limit) break;
        }
      }

      return experiences.sort((a, b) => b.timestamp - a.timestamp);
    } catch {
      return [];
    }
  }

  /**
   * Get stats about experiences.
   */
  async getStats(): Promise<{ total: number; success: number; failure: number; topTags: string[] }> {
    const all = await this.recent(1000);
    const success = all.filter(e => e.outcome === 'success').length;
    const failure = all.filter(e => e.outcome === 'failure').length;

    // Count tags
    const tagCount = new Map<string, number>();
    all.forEach(e => e.tags.forEach(t => tagCount.set(t, (tagCount.get(t) || 0) + 1)));
    const topTags = Array.from(tagCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([t]) => t);

    return { total: all.length, success, failure, topTags };
  }

  // ═══ SERIALIZATION ═══

  private serialize(block: ExperienceBlock): string {
    const lines = [
      `[EXPERIENCE] id=${block.id}`,
      `outcome=${block.outcome}`,
      `task=${block.task}`,
      `action=${block.action}`,
      `result=${block.result.slice(0, 200)}`,
      `tags=${block.tags.join(',')}`,
      `source=${block.source}`,
      `duration=${block.durationMs ?? '0'}`,
    ];
    if (block.detail) {
      lines.push(`detail=${block.detail.slice(0, 300)}`);
    }
    return lines.join('\n');
  }

  private deserialize(content: string): ExperienceBlock | null {
    try {
      const lines = content.split('\n');
      const map = new Map<string, string>();
      for (const line of lines) {
        const idx = line.indexOf('=');
        if (idx > 0) {
          map.set(line.slice(0, idx), line.slice(idx + 1));
        }
      }

      const tagsStr = map.get('tags') || '';
      return {
        id: map.get('id') || `exp_unknown`,
        timestamp: parseInt(map.get('timestamp') || '0') || Date.now(),
        source: (map.get('source') as ExperienceSource) || 'agent',
        outcome: (map.get('outcome') as ExperienceOutcome) || 'error',
        task: map.get('task') || '',
        contextTags: tagsStr.split(',').filter(Boolean),
        action: map.get('action') || '',
        result: map.get('result') || '',
        durationMs: parseInt(map.get('duration') || '0') || undefined,
        tags: tagsStr.split(',').filter(Boolean),
        detail: map.get('detail'),
      };
    } catch {
      return null;
    }
  }

  private defaultResult(outcome: ExperienceOutcome): string {
    switch (outcome) {
      case 'success': return 'Task completed successfully';
      case 'failure': return 'Task failed';
      case 'partial': return 'Task partially completed';
      case 'error': return 'Error occurred during task';
    }
  }
}

export default ExperienceStore;
