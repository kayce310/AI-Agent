/**
 * @file Emotion Tag Parser — Extract [EMOTION: ...] from LLM response content
 * @layer core/behavior
 * @created 2026-07-23
 * @phase Phase 3 — LLM self-annotation
 *
 * Parses the [EMOTION: <tag>] marker from LLM output.
 * The marker is injected via PromptBuilder instruction and stripped before
 * the response is shown to the user.
 *
 * Format: [EMOTION: <tag>]  (case-insensitive, flexible whitespace)
 * Examples:
 *   [EMOTION: confident]
 *   [EMOTION: Uncertain ]
 *   [EMOTION:apologetic]
 */

import { EmotionTag, VALID_EMOTION_TAGS } from './types.js';

// Regex: matches [EMOTION: <tag>] with flexible whitespace
const EMOTION_REGEX = /\[EMOTION:\s*(\w+)\s*\]/i;

// Regex: matches any [EMOTION:...] for stripping (even if invalid)
const EMOTION_STRIP_REGEX = /\[EMOTION:\s*\w+\s*\]/gi;

export interface ParsedEmotionTag {
  /** The parsed emotion tag, or null if missing/invalid */
  tag: EmotionTag | null;
  /** The raw string matched (e.g. "confident") or null */
  raw: string | null;
  /** Whether the tag was valid (in VALID_EMOTION_TAGS) */
  valid: boolean;
}

/**
 * Parse [EMOTION: <tag>] from LLM response content.
 * Returns the parsed tag and whether it was valid.
 */
export function parseEmotionTag(content: string): ParsedEmotionTag {
  if (!content || typeof content !== 'string') {
    return { tag: null, raw: null, valid: false };
  }

  const match = content.match(EMOTION_REGEX);
  if (!match) {
    return { tag: null, raw: null, valid: false };
  }

  const raw = match[1].toLowerCase();
  const valid = VALID_EMOTION_TAGS.has(raw);

  return {
    tag: valid ? (raw as EmotionTag) : null,
    raw: match[1],
    valid,
  };
}

/**
 * Strip [EMOTION: ...] markers from response content.
 * Returns clean text for user display.
 */
export function stripEmotionTag(content: string): string {
  if (!content || typeof content !== 'string') return content;
  return content.replace(EMOTION_STRIP_REGEX, '').trim();
}

/**
 * Build the emotion instruction section to inject into the system prompt.
 * This tells the LLM to output [EMOTION: <tag>] at the end of every response.
 */
export function buildEmotionInstruction(
  recentEmotions?: string[],
  consistencyWindow?: number,
): string {
  let instruction =
    '\n\n# Emotion Self-Annotation (Behavioral Rendering)\n' +
    'At the END of every response, append exactly ONE emotion tag on its own line:\n' +
    '[EMOTION: <label>]\n\n' +
    'Valid labels (pick the ONE that best describes your current state):\n' +
    '- confident: you are sure of your answer, results are positive\n' +
    '- uncertain: you are unsure, guessing, or lack sufficient information\n' +
    '- apologetic: you made an error, caused inconvenience, or cannot fulfill the request\n' +
    '- neutral: routine response, no strong emotion\n' +
    '- enthusiastic: excited about sharing good news or a successful outcome\n' +
    '- excited: very enthusiastic about a discovery or breakthrough\n' +
    '- thoughtful: deep in analysis, considering multiple perspectives\n' +
    '- urgent: time-sensitive, need immediate attention\n\n' +
    'RULES:\n' +
    '- Exactly ONE tag per response, always at the very end\n' +
    '- Do NOT explain or justify the tag\n' +
    '- Do NOT include any other text after the tag\n' +
    '- If multiple emotions apply, choose the DOMINANT one\n';

  // Consistency context: show recent emotions to reduce jitter
  if (recentEmotions && recentEmotions.length > 0) {
    const window = consistencyWindow || 3;
    const recent = recentEmotions.slice(-window);
    instruction +=
      `\n## Consistency Context\n` +
      `Your recent emotion tags (most recent first): ${recent.join(', ')}\n` +
      `Aim for consistency unless the situation genuinely warrants a change. ` +
      `Avoid oscillating between emotions without clear reason.\n`;
  }

  return instruction;
}
