/**
 * @file User Manager — Permission & Role System for Coral Telegram
 * @layer modules
 * @owner telegram-module
 *
 * Simple user management: allowlist + roles.
 * Admin = Kayce, User = family members.
 * Unknown users get denied access.
 */

export type UserRole = 'admin' | 'user';

export interface TelegramUser {
  userId: string;
  username?: string;
  firstName?: string;
  role: UserRole;
}

class UserManager {
  private users: Map<string, TelegramUser> = new Map();
  private bootstrapDone = false;

  constructor() {
    // Load from env or default to admin-only
    this.loadFromEnv();
  }

  /**
   * Bootstrap: first user becomes admin when no users are configured.
   * This allows personal bot setup without pre-configuring env.
   */
  bootstrap(userId: string): boolean {
    if (this.bootstrapDone || this.users.size > 0) return false;
    this.users.set(userId, { userId, role: 'admin' });
    this.bootstrapDone = true;
    return true;
  }

  /** Check if bootstrap has been done */
  isBootstrapped(): boolean {
    return this.users.size > 0;
  }

  /**
   * Load user config from environment variable CORAL_TELEGRAM_USERS.
   * Format: identifier:role,identifier:role,...
   * identifier can be numeric userId or @username
   * Examples:
   *   "123456:admin,789012:user"
   *   "@kayce:admin,@family:user"
   */
  private loadFromEnv(): void {
    const config = process.env.CORAL_TELEGRAM_USERS;
    if (!config) {
      // Fallback: no users configured — everyone is unknown
      return;
    }

    for (const entry of config.split(',')) {
      const [identifier, role] = entry.trim().split(':');
      if (identifier && (role === 'admin' || role === 'user')) {
        this.users.set(identifier.toLowerCase(), { userId: identifier, role });
      }
    }
  }

  /**
   * Get user info. Returns undefined if user is not in allowlist.
   * Matches by userId OR @username.
   */
  getUser(userId: string, username?: string): TelegramUser | undefined {
    const direct = this.users.get(userId);
    if (direct) return direct;
    if (username) {
      return this.users.get('@' + username.toLowerCase());
    }
    return undefined;
  }

  /**
   * Check if user is allowed to use Coral.
   * Matches by userId OR @username.
   */
  isAllowed(userId: string, username?: string): boolean {
    if (this.users.has(userId)) return true;
    if (username && this.users.has('@' + username.toLowerCase())) return true;
    return false;
  }

  /**
   * Check if user has admin role.
   * Matches by userId OR @username.
   */
  isAdmin(userId: string, username?: string): boolean {
    const user = this.getUser(userId, username);
    return user?.role === 'admin';
  }

  /**
   * Check if user has at least 'user' role.
   */
  isUser(userId: string, username?: string): boolean {
    return this.getUser(userId, username) !== undefined;
  }

  /**
   * Register a user manually (e.g. via /allow command).
   * identifier can be numeric userId or @username.
   */
  registerUser(identifier: string, role: UserRole = 'user'): void {
    this.users.set(identifier.toLowerCase(), { userId: identifier, role });
  }

  /**
   * Remove a user from the allowlist (e.g. via /disallow command).
   */
  unregisterUser(identifier: string): void {
    this.users.delete(identifier.toLowerCase());
  }

  /**
   * Get all non-admin user IDs.
   */
  getUserIds(): string[] {
    return Array.from(this.users.values())
      .filter(u => u.role === 'user')
      .map(u => u.userId);
  }

  /**
   * Get all admin user IDs.
   */
  getAdminIds(): string[] {
    return Array.from(this.users.values())
      .filter(u => u.role === 'admin')
      .map(u => u.userId);
  }
}

export const userManager = new UserManager();
export default UserManager;
