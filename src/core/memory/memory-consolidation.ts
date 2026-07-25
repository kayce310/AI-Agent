/**
 * @file memory-consolidation.ts — Memory module
 * @layer core
 * @depends-on src/core/memory/memory-log.ts, src/core/llm/model-adapter.ts
 * @imported-by src/core/engine/engine.ts
 * @owner core-memory
 *
 * Coral Agent — Memory Consolidation (Waku-inspired)
 *
 * After every N messages in a session, batch recent conversation blocks
 * and call LLM to extract:
 *   - facts: persistent knowledge (preferences, names, rules)
 *   - episodes: dated events ("yesterday we discussed X")
 *
 * Design principles (from Waku):
 *   - Consolidation NEVER deletes original blocks (safety)
 *   - Fail-open: if LLM fails, skip consolidation silently
 *   - Source provenance: all consolidated blocks tagged with source
 *   - Cheap model preferred (consolidation doesn't need frontier model)
 */

import { MemoryBlock } from './memory-log.js';
import { globalMemoryStore } from './memory-store.js';
import { Logger } from '../logger.js';

const log = new Logger({ module: 'MemoryConsolidation' });

// ── Config ──

/** Number of messages between consolidation runs */
const CONSOLIDATE_EVERY_N = 20;

/** Max characters of conversation to send to LLM for consolidation */
const MAX_INPUT_CHARS = 8000;

/** Max characters per consolidated fact/episode */
const MAX_BLOCK_CONTENT = 500;

// ── Types ──

export interface ConsolidationResult {
  facts: string[];
  episodes: string[];
  consolidated: number; // total blocks written
}

// ── Consolidation Module ──

export class MemoryConsolidation {
  private messageCount = 0;
  private modelRouter: any; // ModelRouter — avoid tight coupling
  private enabled: boolean;

  constructor(modelRouter?: any, enabled = true) {
    this.modelRouter = modelRouter;
    this.enabled = enabled;
  }

  /** Call after each user/assistant message pair to track count */
  tick(): void {
    this.messageCount++;
  }

  /** Should we consolidate now? */
  shouldConsolidate(): boolean {
    return this.enabled && this.messageCount >= CONSOLIDATE_EVERY_N;
  }

  /**
   * Run consolidation on recent session blocks.
   * Extracts facts + episodes via LLM, stores as new MemoryBlocks.
   *
   * @param sessionId - current session ID
   * @param recentMessages - recent conversation turns [{role, content}]
   * @returns ConsolidationResult with extracted facts/episodes
   */
  async consolidate(
    sessionId: string,
    recentMessages: Array<{ role: string; content: string }>,
  ): Promise<ConsolidationResult> {
    // Reset counter
    this.messageCount = 0;

    // No model router → can't consolidate
    if (!this.modelRouter) {
      log.debug('Consolidation skipped: no model router');
      return { facts: [], episodes: [], consolidated: 0 };
    }

    // Truncate input
    const input = recentMessages
      .map(m => `${m.role}: ${m.content}`)
      .join('\n')
      .substring(0, MAX_INPUT_CHARS);

    if (input.length < 50) {
      return { facts: [], episodes: [], consolidated: 0 };
    }

    try {
      const prompt = buildConsolidationPrompt(input);
      const response = await this.modelRouter.route(
        [{ role: 'user', content: prompt }],
        { temperature: 0.3, maxTokens: 1000 },
      );

      const parsed = parseConsolidationResponse(
        typeof response === 'string' ? response : (response as any).content || '',
      );

      // Store facts
      for (const fact of parsed.facts) {
        await globalMemoryStore.add('fact', fact.substring(0, MAX_BLOCK_CONTENT), {
          tags: ['consolidated', 'fact'],
          sessionId,
          source: { type: 'user' }, // extracted from user conversation
          importance: 0.8,
        });
      }

      // Store episodes
      for (const episode of parsed.episodes) {
        await globalMemoryStore.add('session', episode.substring(0, MAX_BLOCK_CONTENT), {
          tags: ['consolidated', 'episode'],
          sessionId,
          source: { type: 'user' },
          importance: 0.6,
        });
      }

      const total = parsed.facts.length + parsed.episodes.length;
      if (total > 0) {
        log.info(`Consolidation: ${parsed.facts.length} facts + ${parsed.episodes.length} episodes from session ${sessionId}`);
      }

      return {
        facts: parsed.facts,
        episodes: parsed.episodes,
        consolidated: total,
      };
    } catch (err: any) {
      // Fail-open: consolidation failure is non-fatal
      log.warn(`Consolidation failed: ${err.message}`);
      return { facts: [], episodes: [], consolidated: 0 };
    }
  }
}

// ── Prompt Engineering ──

function buildConsolidationPrompt(conversation: string): string {
  return `Extract key information from this conversation. Return JSON with two arrays:

"facts": persistent knowledge (user preferences, names, rules, technical details)
"episodes": dated events ("Discussed X", "Decided on Y", "User reported Z")

Rules:
- Max 5 facts, max 3 episodes
- Each item: one short sentence (under 50 words)
- Only extract genuinely useful information
- No filler or trivial details

Conversation:
${conversation}

Return ONLY valid JSON: {"facts":[...],"episodes":[...]}`;
}

// ── Response Parsing ──

function parseConsolidationResponse(response: string): { facts: string[]; episodes: string[] } {
  try {
    // Try to extract JSON from response (may have markdown wrapper)
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return { facts: [], episodes: [] };

    const parsed = JSON.parse(jsonMatch[0]);
    return {
      facts: Array.isArray(parsed.facts) ? parsed.facts.filter((f: any) => typeof f === 'string') : [],
      episodes: Array.isArray(parsed.episodes) ? parsed.episodes.filter((e: any) => typeof e === 'string') : [],
    };
  } catch {
    return { facts: [], episodes: [] };
  }
}
