/**
 * @file Gateway Types — Platform Adapter Contracts
 * @layer core
 * @depends-on (none)
 * @imported-by src/core/gateway/index.ts, all platform adapters
 * @owner core-gateway
 *
 * Hermes-inspired multi-platform adapter pattern.
 * Each platform (Discord, Telegram, CLI, etc.) implements PlatformAdapter.
 * The Gateway orchestrates lifecycle and message routing.
 */

import type { ConversationSessionId, UserId } from '../types/branded.js';

// ──────────────────────────────────────────────
// Core Message Types
// ──────────────────────────────────────────────

export interface CoralRequest {
  input: string;
  userId: UserId;
  sessionId: ConversationSessionId;
  platform: string;
  metadata?: Record<string, unknown>;
}

export interface CoralResponse {
  output: string;
  sessionId: ConversationSessionId;
  platform: string;
  metadata?: Record<string, unknown>;
}

/**
 * Standardized message envelope across all platforms.
 * Adapters convert platform-specific messages into this format.
 */
export interface AdapterMessage {
  /** Platform-specific message ID (for dedup) */
  messageId: string;
  /** Platform user ID */
  userId: UserId;
  /** Platform channel/chat ID (NOT a session identity) */
  channelId: UserId;
  /** Raw text content */
  text: string;
  /** Platform name */
  platform: string;
  /** Whether the message mentions the bot explicitly */
  isMention: boolean;
  /** Optional metadata from the platform */
  metadata?: Record<string, unknown>;
  /** Timestamp in ms */
  timestamp: number;
}

/**
 * Lifecycle status of an adapter.
 */
export type AdapterStatus = 'stopped' | 'starting' | 'running' | 'error' | 'stopping';

// ──────────────────────────────────────────────
// Platform Metadata
// ──────────────────────────────────────────────

/**
 * Platform-specific metadata — tells the Engine how to adapt responses.
 * Inspired by Hermes Agent platform adapters.
 */
export interface PlatformMeta {
  /** Max message length before splitting (Telegram: 4096, Discord: 2000, WhatsApp: 4096) */
  maxMessageLength?: number;
  /** Whether the platform supports PII-safe mode (mask emails, phones) */
  piiSafe?: boolean;
  /** Platform hint for response formatting (e.g., 'telegram', 'discord', 'slack') */
  platformHint?: string;
  /** Whether the platform supports markdown formatting */
  supportsMarkdown?: boolean;
  /** Whether the platform supports inline images */
  supportsImages?: boolean;
}

// ──────────────────────────────────────────────
// Platform Adapter Contract
// ──────────────────────────────────────────────

/**
 * PlatformAdapter — contract every platform module must implement.
 *
 * Inspired by Hermes Agent gateway/platforms/ adapters.
 * Each adapter wraps a platform SDK and translates between
 * platform-native events and Coral's AdapterMessage format.
 */
export interface PlatformAdapter {
  /** Unique platform name (discord, telegram, cli, slack, ...) */
  platform: string;

  /** Current adapter status */
  status: AdapterStatus;

  /** Platform-specific metadata (limits, capabilities, hints) */
  platformMeta?: PlatformMeta;

  /**
   * Start the adapter (connect to platform, begin listening).
   * Must resolve once the adapter is ready to receive messages.
   */
  start(): Promise<void>;

  /**
   * Stop the adapter (disconnect, cleanup resources).
   * Must resolve once fully stopped.
   */
  stop(): Promise<void>;

  /**
   * Send a text message to a platform channel/chat.
   * @param channelId Platform-specific channel identifier
   * @param content Message text to send
   * @returns Platform-specific message ID if available
   */
  sendMessage(channelId: string, content: string): Promise<string | null>;

  /**
   * Register a handler for incoming messages.
   * The handler receives normalized AdapterMessage objects.
   * Returns a CoralResponse that the adapter can use for platform-specific UI.
   * Called by the gateway after construction.
   */
  onMessage(handler: (msg: AdapterMessage) => Promise<CoralResponse | null>): void;
}
