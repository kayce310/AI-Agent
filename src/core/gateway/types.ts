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

// ──────────────────────────────────────────────
// Core Message Types
// ──────────────────────────────────────────────

export interface KatoRequest {
  input: string;
  userId: string;
  sessionId: string;
  platform: string;
  metadata?: Record<string, unknown>;
}

export interface KatoResponse {
  output: string;
  sessionId: string;
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
  userId: string;
  /** Platform channel/chat ID (used as Kato sessionId) */
  channelId: string;
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
// Platform Adapter Contract
// ──────────────────────────────────────────────

/**
 * PlatformAdapter — contract every platform module must implement.
 *
 * Inspired by Hermes Agent gateway/platforms/ adapters.
 * Each adapter wraps a platform SDK and translates between
 * platform-native events and Kato's AdapterMessage format.
 */
export interface PlatformAdapter {
  /** Unique platform name (discord, telegram, cli, slack, ...) */
  platform: string;

  /** Current adapter status */
  status: AdapterStatus;

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
   * Returns a KatoResponse that the adapter can use for platform-specific UI.
   * Called by the gateway after construction.
   */
  onMessage(handler: (msg: AdapterMessage) => Promise<KatoResponse | null>): void;
}
