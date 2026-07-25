/**
 * @file memory-retrieval-gate.ts — Memory module
 * @layer core
 * @depends-on src/core/memory/memory-log.ts
 * @imported-by src/core/engine/engine.ts
 * @owner core-memory
 *
 * Coral Agent — Memory Retrieval Gate
 * Waku-inspired: decides WHETHER to query memory before hitting the store.
 *
 * Waku uses a small LLM model as gate. Coral uses a faster approach:
 * heuristic-based gate (zero token cost) that covers 80% of cases.
 *
 * Gate rules:
 *   1. Always retrieve: message contains memory keywords or is long enough
 *   2. Never retrieve: greetings, fillers, very short messages
 *   3. Default: retrieve (fail-open — stale memory beats no memory)
 */

/**
 * Memory recall keywords — if present, always retrieve.
 * Bilingual: Vietnamese + English.
 */
const ALWAYS_RECALL_KEYWORDS = [
  // English
  'remember', 'recall', 'memory', 'memorize', 'did i tell you', 'previously',
  'before', 'last time', 'earlier', 'context', 'history',
  // Vietnamese
  'nhớ', 'ghi nhớ', 'đã nói', 'trước đó', 'lần trước', 'đã hỏi',
];

/**
 * Messages that should NEVER trigger memory recall.
 * These are greetings, acknowledgments, and filler messages.
 */
const SKIP_RECALL_PATTERNS = [
  /^(hi|hello|hey|yo|sup|ok|okay|yes|no|yep|nope|thanks|thank you|thx|bye|goodbye)\s*[!.?]*$/i,
  /^(xin chào|chào|cảm ơn|tạm biệt|ok|được|không|vâng|dạ|ừ)\s*[!.?]*$/i,
  /^[.!?]+$/,  // pure punctuation
  /^\s*$/,      // whitespace only
];

/** Minimum character length for generic recall */
const MIN_LENGTH_FOR_RECALL = 8;

export interface GateDecision {
  shouldRetrieve: boolean;
  reason: 'always' | 'skip' | 'length' | 'default';
}

/**
 * Decide whether to query memory for this user message.
 *
 * @param message - the user's message text
 * @returns GateDecision with reason for debugging/logging
 */
export function shouldRecallMemory(message: string): GateDecision {
  const trimmed = message.trim();

  // 1. Empty → skip
  if (!trimmed) {
    return { shouldRetrieve: false, reason: 'skip' };
  }

  // 2. Skip patterns (greetings, fillers)
  for (const pattern of SKIP_RECALL_PATTERNS) {
    if (pattern.test(trimmed)) {
      return { shouldRetrieve: false, reason: 'skip' };
    }
  }

  // 3. Always-recall keywords
  const lower = trimmed.toLowerCase();
  for (const kw of ALWAYS_RECALL_KEYWORDS) {
    if (lower.includes(kw)) {
      return { shouldRetrieve: true, reason: 'always' };
    }
  }

  // 4. Length heuristic — short messages unlikely to need context
  if (trimmed.length < MIN_LENGTH_FOR_RECALL) {
    return { shouldRetrieve: false, reason: 'length' };
  }

  // 5. Default: retrieve (fail-open)
  return { shouldRetrieve: true, reason: 'default' };
}
