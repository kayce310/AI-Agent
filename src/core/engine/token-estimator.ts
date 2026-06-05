/**
 * @file Token Estimator — Rough token counting for context windows
 * @layer core
 * @depends-on (none — standalone)
 * @imported-by src/core/engine/context-compressor.ts
 * @owner core-engine
 *
 * Estimates token counts for messages using character-based heuristic.
 * Used to decide when to trigger context compression.
 *
 * Heuristic: ~4 chars per token (rough estimate across GPT/Claude)
 * Multimodal: images counted at ~1600 tokens each
 */

export interface Message {
  role: string;
  content: string | any;
}

export interface TokenEstimate {
  total: number;
  byMessage: number[];
}

/** Rough chars-per-token heuristic */
const CHARS_PER_TOKEN = 4;

/** Flat token cost per image (realistic ceiling for token budgeting) */
const IMAGE_TOKEN_ESTIMATE = 1600;

/** Convert image tokens to char-equivalent for tail-cut decisions */
const IMAGE_CHAR_EQUIVALENT = IMAGE_TOKEN_ESTIMATE * CHARS_PER_TOKEN;

/**
 * Extract text content from a message (handles multimodal).
 */
function getMessageText(content: any): string {
  if (typeof content === 'string') {
    return content;
  }
  if (!Array.isArray(content)) {
    return JSON.stringify(content ?? '');
  }

  const parts: string[] = [];
  for (const part of content) {
    if (typeof part === 'string') {
      parts.push(part);
    } else if (typeof part === 'object' && part?.type === 'text') {
      parts.push(part.text ?? '');
    }
  }
  return parts.join('\n');
}

/**
 * Calculate effective char-length for token budgeting (handles images).
 */
function getContentLength(content: any): number {
  if (typeof content === 'string') {
    return content.length;
  }
  if (!Array.isArray(content)) {
    return JSON.stringify(content ?? '').length;
  }

  let total = 0;
  for (const part of content) {
    if (typeof part === 'string') {
      total += part.length;
    } else if (typeof part === 'object' && part) {
      if (['image_url', 'input_image', 'image'].includes(part.type)) {
        total += IMAGE_CHAR_EQUIVALENT;
      } else if (part.type === 'text' && part.text) {
        total += part.text.length;
      }
    }
  }
  return total;
}

/**
 * Estimate token count for messages.
 * Returns total + breakdown by message.
 */
export function estimateTokens(messages: Message[]): TokenEstimate {
  const byMessage = messages.map((m) => {
    const contentLength = getContentLength(m.content);
    return Math.ceil(contentLength / CHARS_PER_TOKEN);
  });

  return {
    total: byMessage.reduce((a, b) => a + b, 0),
    byMessage,
  };
}

/**
 * Returns true if messages exceed threshold% of maxContext.
 * Use this to decide when to trigger compression.
 */
export function shouldCompress(
  messages: Message[],
  maxContext = 128_000,
  thresholdPct = 0.80,
): boolean {
  const { total } = estimateTokens(messages);
  return total > maxContext * thresholdPct;
}

/**
 * Get token budget remaining after messages.
 */
export function getTokenBudgetRemaining(
  messages: Message[],
  maxContext = 128_000,
): number {
  const { total } = estimateTokens(messages);
  return Math.max(0, maxContext - total);
}

export default {
  estimateTokens,
  shouldCompress,
  getTokenBudgetRemaining,
};
