/**
 * @file context-window — Token-budget-based Context Window Manager
 * @layer core
 * @owner core-engine
 *
 * Phase 5: Formal token budget management with importance scoring.
 * Extends the existing ensureTokenBudget in agent.ts with:
 * - Configurable per-session token budgets
 * - Importance scoring per message (role-based + content-based)
 * - Selective eviction preserving high-importance context
 * - Token usage analytics
 *
 * Architecture:
 * ┌──────────────────────┐
 * │ ContextWindowManager │
 * │  - budget/session    │
 * │  - score(message)    │
 * │  - evict(messages)   │
 * │  - summarize()       │
 * └────────┬─────────────┘
 *          │ called by
 *          ▼
 * ┌──────────────────────┐
 * │ Agent                │
 * │ ensureTokenBudget()  │
 * └──────────────────────┘
 */

import { Logger } from './logger.js';

const log = new Logger({ module: 'ContextWindow' });

// ── Configuration ──

export interface ContextWindowConfig {
  /** Default per-session token budget */
  defaultBudget: number;
  /** Per-session overrides */
  sessionBudgets?: Record<string, number>;
  /** Compression threshold (default: 75%) */
  compressThresholdPct: number;
  /** Force compression threshold (default: 85%) */
  forceCompressThresholdPct: number;
  /** Number of most recent messages to always preserve */
  tailProtect: number;
  /** Enable importance scoring (default: true) */
  enableImportanceScoring: boolean;
}

const DEFAULT_CONFIG: ContextWindowConfig = {
  defaultBudget: 128_000,
  compressThresholdPct: 0.75,
  forceCompressThresholdPct: 0.85,
  tailProtect: 5,
  enableImportanceScoring: true,
};

// ── Importance Scoring ──

export interface MessageScore {
  index: number;
  role: string;
  tokens: number;
  /** Higher = more important. 0 = drop candidate. */
  importance: number;
  reason: string;
}

export class ContextWindowManager {
  private config: ContextWindowConfig;
  private sessionTokens: Map<string, { total: number; lastUpdated: number }> = new Map();

  constructor(config?: Partial<ContextWindowConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /** Get effective budget for a session */
  getBudget(sessionId: string): number {
    return this.config.sessionBudgets?.[sessionId] || this.config.defaultBudget;
  }

  /** Set per-session budget */
  setBudget(sessionId: string, budget: number): void {
    if (!this.config.sessionBudgets) {
      this.config.sessionBudgets = {};
    }
    this.config.sessionBudgets[sessionId] = budget;
    log.info(`Set budget for ${sessionId}: ${budget}`);
  }

  /** Estimate token count for a set of messages */
  estimateTokens(messages: any[]): number {
    let total = 0;
    for (const msg of messages) {
      if (typeof msg.content === 'string') {
        // Rough estimate: ~4 chars per token
        total += Math.ceil(msg.content.length / 4);
      } else if (Array.isArray(msg.content)) {
        for (const part of msg.content) {
          if (part.text) total += Math.ceil(part.text.length / 4);
        }
      }
      // Add overhead per message (~8 tokens for role + metadata)
      total += 8;
    }
    return total;
  }

  /** Score messages by importance. Returns sorted scores. */
  scoreMessages(messages: any[]): MessageScore[] {
    const scores: MessageScore[] = [];
    const total = messages.length;

    for (let i = 0; i < total; i++) {
      const msg = messages[i];
      const role = msg.role || 'unknown';
      const content = typeof msg.content === 'string' ? msg.content : '';
      const tokens = Math.ceil(content.length / 4) + 8;

      let importance = 0.5; // baseline
      const reasons: string[] = [];

      // System prompts: always high priority
      if (role === 'system') {
        importance = 1.0;
        reasons.push('system');
      }
      // Tool results that contain important output
      else if (role === 'tool') {
        // Tool results with non-empty content are moderately important
        if (content.length > 0) {
          importance = 0.6;
          reasons.push('tool-result');
        } else {
          importance = 0.2;
          reasons.push('tool-empty');
        }
      }
      // User messages: high if they contain instructions
      else if (role === 'user') {
        // Longer user messages likely contain instructions/questions
        importance = Math.min(0.9, 0.5 + (content.length / 1000) * 0.3);
        if (content.startsWith('/') || content.includes('please') || content.includes('hãy') || content.includes('làm')) {
          importance = 0.9;
          reasons.push('instruction');
        }
        reasons.push('user');
      }
      // Assistant messages: higher if they have tool calls (complex reasoning)
      else if (role === 'assistant') {
        if (msg.tool_calls && msg.tool_calls.length > 0) {
          importance = 0.7;
          reasons.push('tool-call');
        } else {
          importance = 0.4;
          reasons.push('response');
        }
      }

      scores.push({ index: i, role, tokens, importance, reason: reasons.join(',') });
    }

    // Recent messages get a boost (recency = importance)
    for (let i = 0; i < total; i++) {
      // Linear boost: last 10 messages get +0.1 each, newest gets +0.3
      const recencyBoost = Math.max(0, (total - 1 - i) / total) * 0.3;
      scores[i].importance = Math.min(1.0, scores[i].importance + recencyBoost);
    }

    return scores.sort((a, b) => b.importance - a.importance);
  }

  /**
   * Evict messages to fit within budget.
   * Returns the trimmed message array.
   * Preserves: system messages, high-importance messages, tail protect.
   */
  evictToBudget(messages: any[], sessionId?: string): { messages: any[]; evicted: number; saved: number } {
    const budget = sessionId ? this.getBudget(sessionId) : this.config.defaultBudget;
    const currentTokens = this.estimateTokens(messages);

    if (currentTokens <= budget) {
      this.trackTokens(sessionId, currentTokens);
      return { messages, evicted: 0, saved: messages.length };
    }

    // Score and sort
    const scores = this.scoreMessages(messages);
    const tailProtect = this.config.tailProtect;

    // Protect: system messages + tail
    const protectedIndices = new Set<number>();
    for (const score of scores) {
      if (score.role === 'system') {
        protectedIndices.add(score.index);
      }
    }
    // Protect last N messages
    for (let i = Math.max(0, messages.length - tailProtect); i < messages.length; i++) {
      protectedIndices.add(i);
    }

    // Build eviction candidates: low-importance, non-protected messages
    const evictCandidates = scores
      .filter(s => !protectedIndices.has(s.index))
      .sort((a, b) => a.importance - b.importance);

    let tokensToRemove = currentTokens - budget;
    let evicted = 0;
    const toRemove = new Set<number>();

    for (const candidate of evictCandidates) {
      if (tokensToRemove <= 0) break;
      toRemove.add(candidate.index);
      tokensToRemove -= candidate.tokens;
      evicted++;
    }

    // Build result
    const result = messages.filter((_, idx) => !toRemove.has(idx));
    const finalTokens = this.estimateTokens(result);

    log.info(
      `ContextWindow: ${currentTokens.toLocaleString()} → ${finalTokens.toLocaleString()} tok ` +
      `(${currentTokens - finalTokens} freed, ${evicted} msg(s) evicted)`
    );

    this.trackTokens(sessionId, finalTokens);
    return { messages: result, evicted, saved: result.length };
  }

  /** Get token usage analytics for a session */
  getAnalytics(sessionId: string): { total: number; budget: number; usagePct: number; lastUpdated: number | null } {
    const tracked = this.sessionTokens.get(sessionId);
    const budget = this.getBudget(sessionId);
    return {
      total: tracked?.total ?? 0,
      budget,
      usagePct: budget > 0 ? ((tracked?.total ?? 0) / budget) * 100 : 0,
      lastUpdated: tracked?.lastUpdated ?? null,
    };
  }

  /** Track token usage for analytics */
  private trackTokens(sessionId?: string, total?: number): void {
    if (!sessionId || total === undefined) return;
    this.sessionTokens.set(sessionId, { total, lastUpdated: Date.now() });
  }
}

// ── Singleton ──

let globalContextManager: ContextWindowManager | null = null;

export function getContextManager(): ContextWindowManager {
  if (!globalContextManager) {
    globalContextManager = new ContextWindowManager();
  }
  return globalContextManager;
}

export default ContextWindowManager;
