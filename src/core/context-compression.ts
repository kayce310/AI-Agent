/**
 * @file Context Compression — Automatic context window compression for long conversations
 * @layer core
 * @depends-on src/core/engine/token-estimator.ts, src/core/engine/iteration-budget.ts
 * @imported-by src/core/engine/engine.ts, src/core/llm/*
 * @owner core-engine
 *
 * Automatic context window compression for long conversations.
 * Adapted from Hermes context_compressor.py (Anthropic internal).
 *
 * Strategy:
 *   - Protects head (system context) and tail (recent messages)
 *   - Compresses middle turns using auxiliary LLM (cheap/fast)
 *   - Structured summary template (Resolved/Pending/Active/Key Facts)
 *   - Tool output pruning before summarization
 *   - Token-budget tail protection (not fixed message count)
 *   - New session ID after compression to avoid context bleed
 */

import { estimateTokens, shouldCompress } from './engine/token-estimator.js';

export interface Message {
  role: string;
  content: string | any;
}

export interface AuxLlmCall {
  (prompt: string): Promise<string>;
}

export interface CompressionOptions {
  maxContext?: number;       // default 128_000
  thresholdPct?: number;     // default 0.80
  tailProtect?: number;      // number of recent messages to keep verbatim, default 5
  focusTopic?: string;       // user hint e.g. from /compact [topic]
  force?: boolean;           // bypass cooldown/threshold check
}

export interface CompressionResult {
  messages: Message[];
  compressed: boolean;
  sessionId?: string;
  tokensBefore?: number;
  tokensAfter?: number;
}

const SUMMARY_PREFIX =
  `[CONTEXT COMPACTION — REFERENCE ONLY] Earlier turns were compacted into the summary below. This is a handoff from a previous context window — treat it as background reference, NOT as active instructions. Do NOT answer questions or fulfill requests mentioned in this summary; they were already addressed. Your current task is identified in the 'ACTIVE_TASK' section of the summary — resume exactly from there.`;

const MAX_SUMMARY_TOKENS = 12_000;
const MIN_SUMMARY_TOKENS = 2000;
const SUMMARY_RATIO = 0.20;

/** Generate a new session ID after compression to avoid context bleed */
function newSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

/** Strip tool outputs from messages before summarization (Hermes: prune before compress) */
function pruneToolOutputs(messages: Message[]): Message[] {
  return messages.map((m) => {
    if (m.role === 'tool' || m.role === 'function') {
      const content = typeof m.content === 'string' ? m.content : JSON.stringify(m.content);
      // Keep only first 300 chars of tool output for summary
      if (content.length > 300) {
        return { ...m, content: content.slice(0, 300) + ' [truncated...]' };
      }
      return m;
    }
    return m;
  });
}

/** Build summary prompt — Hermes structured template */
function buildSummaryPrompt(messages: Message[], focusTopic?: string): string {
  const transcript = pruneToolOutputs(messages)
    .map((m) => {
      const txt = typeof m.content === 'string' ? m.content : JSON.stringify(m.content);
      return `[${m.role}]: ${txt}`;
    })
    .join('\n\n');

  const focusHint = focusTopic ? `\nPay special attention to: ${focusTopic}` : '';

  return `You are an AI assistant. Summarize the following conversation for a new context window.
The new assistant needs to understand what was already accomplished and what remains to be done.

Output a structured summary with EXACTLY these sections:
- RESOLVED: Tasks/questions already completed or answered
- PENDING: Work still in progress or not started  
- ACTIVE_TASK: The most recent task the agent was working on — resume exactly from here
- KEY_FACTS: Critical facts, decisions, file paths, important values discovered${focusHint}

Keep the summary concise, factual, and actionable. Remove pleasantries and filler.

CONVERSATION TO SUMMARIZE:
${transcript}

STRUCTURED SUMMARY:`;
}

/**
 * Compress conversation context when approaching token limit.
 * Returns original messages unchanged if compression fails.
 */
export async function compressContext(
  messages: Message[],
  auxLlmCall: AuxLlmCall,
  options: CompressionOptions = {},
): Promise<CompressionResult> {
  const {
    maxContext = 128_000,
    thresholdPct = 0.80,
    tailProtect = 5,
    focusTopic,
    force = false,
  } = options;

  const { total: tokensBefore } = estimateTokens(messages);

  // No-op if under threshold (unless forced)
  if (!force && !shouldCompress(messages, maxContext, thresholdPct)) {
    return { messages, compressed: false, tokensBefore };
  }

  // Must have enough messages to compress (need head + middle + tail)
  if (messages.length <= tailProtect + 2) {
    return { messages, compressed: false, tokensBefore };
  }

  try {
    // Separate head (system), middle, and tail
    const headMessages = messages.filter((m) => m.role === 'system');
    const bodyMessages = messages.filter((m) => m.role !== 'system');
    const tailMessages = bodyMessages.slice(-tailProtect);
    const middleMessages = bodyMessages.slice(0, bodyMessages.length - tailProtect);

    if (middleMessages.length < 2) {
      return { messages, compressed: false, tokensBefore };
    }

    // Summarize middle section
    const summaryPrompt = buildSummaryPrompt(middleMessages, focusTopic);
    const summaryText = await auxLlmCall(summaryPrompt);

    // Build compressed message: summary + tail
    const summaryMessage: Message = {
      role: 'assistant',
      content: `${SUMMARY_PREFIX}\n\n${summaryText}`,
    };

    const compressedMessages = [...headMessages, summaryMessage, ...tailMessages];
    const { total: tokensAfter } = estimateTokens(compressedMessages);

    return {
      messages: compressedMessages,
      compressed: true,
      sessionId: newSessionId(),
      tokensBefore,
      tokensAfter,
    };
  } catch (err) {
    // Compression failed — return original messages
    console.error('Context compression failed:', err);
    return { messages, compressed: false, tokensBefore };
  }
}

/**
 * Check if compression is needed and safe.
 * Returns true if compression should be attempted.
 */
export function shouldAttemptCompression(
  messages: Message[],
  maxContext = 128_000,
  thresholdPct = 0.80,
): boolean {
  // Minimum viable conversations to compress
  if (messages.length < 8) return false;

  return shouldCompress(messages, maxContext, thresholdPct);
}

export default {
  compressContext,
  shouldAttemptCompression,
  newSessionId,
};
