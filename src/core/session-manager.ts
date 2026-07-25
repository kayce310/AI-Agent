/**
 * @file Session Manager — Cross-platform Session Management
 * @layer core
 * @owner core-commands
 *
 * Moved from src/platform/telegram/session-manager.ts to core.
 * Platform-agnostic: works with Telegram, Discord, CLI, etc.
 */

export {
  SessionManager,
  SessionState,
  SessionActivityEvent,
  IntroSentEvent,
} from '../platform/telegram/session-manager.js';
