/**
 * @file Command Types — Cross-platform Command Definitions
 * @layer core
 * @owner core-commands
 *
 * Inspired by Hermes Agent's tool registry pattern.
 * Defines a platform-agnostic command interface that any platform
 * (Telegram, Discord, CLI, Web, etc.) can implement.
 *
 * Each command has:
 * - name + description (for /help display)
 * - platforms[] (which platforms this command runs on)
 * - checkFn (optional runtime availability gate, like Hermes check_fn)
 * - handler that receives a CommandContext (not platform-specific types)
 */

/**
 * Command execution context — platform-agnostic.
 * Each platform adapter fills this before calling the handler.
 */
export interface CommandContext {
  /** Platform name (telegram, discord, cli...) */
  platform: string;
  /** User ID on this platform */
  userId: string;
  /** Channel/Chat ID on this platform */
  channelId: string;
  /** Whether user is admin */
  isAdmin: boolean;
  /** Whether user is allowed to use the bot */
  isAllowed: boolean;
  /** Raw arguments array */
  args: string[];
  /** Platform-specific context (for platform-specific features like InlineKeyboard) */
  platformContext?: Record<string, unknown>;
}

/**
 * Result returned by a command handler.
 */
export interface CommandResult {
  /** Text to send to the user */
  text: string;
  /** Optional parse mode (markdown, html, etc.) */
  parseMode?: 'markdown' | 'html' | 'none';
  /** Optional extra data (e.g., inline keyboard payload) */
  extra?: Record<string, unknown>;
}

/**
 * Platform-agnostic command handler.
 * No dependency on grammy/Discord.js/etc.
 */
export type CommandHandler = (ctx: CommandContext) => Promise<CommandResult>;

/**
 * Command definition — Hermes-inspired.
 */
export interface Command {
  /** Command name (without slash — e.g., "help", "model") */
  name: string;
  /** Description for /help display */
  description: string;
  /** Handler function */
  handler: CommandHandler;
  /** Platforms this command is available on. Empty = all platforms. */
  platforms?: string[];
  /** Optional availability check (like Hermes check_fn) */
  checkFn?: () => boolean | Promise<boolean>;
  /** Optional JSON Schema for LLM tool use */
  schema?: Record<string, unknown>;
  /** Category for help grouping */
  category?: 'general' | 'session' | 'admin' | 'task' | 'developer';
}
