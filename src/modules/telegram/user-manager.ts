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

  constructor() {
    // Load from env or default to admin-only
    this.loadFromEnv();
  }

  /**
   * Load user config from environment variable CORAL_TELEGRAM_USERS.
   * Format: userId:role,userId:role,...
   * Example: "123456:admin,789012:user"
   */
  private loadFromEnv(): void {
    const config = process.env.CORAL_TELEGRAM_USERS;
    if (!config) {
      // Fallback: no users configured — everyone is unknown
      return;
    }

    for (const entry of config.split(',')) {
      const [userId, role] = entry.split(':');
      if (userId && (role === 'admin' || role === 'user')) {
        this.users.set(userId, { userId, role });
      }
    }
  }

  /**
   * Get user info. Returns undefined if user is not in allowlist.
   */
  getUser(userId: string): TelegramUser | undefined {
    return this.users.get(userId);
  }

  /**
   * Check if user is allowed to use Coral.
   */
  isAllowed(userId: string): boolean {
    return this.users.has(userId);
  }

  /**
   * Check if user has admin role.
   */
  isAdmin(userId: string): boolean {
    const user = this.users.get(userId);
    return user?.role === 'admin';
  }

  /**
   * Check if user has at least 'user' role.
   */
  isUser(userId: string): boolean {
    const user = this.users.get(userId);
    return user !== undefined;
  }

  /**
   * Register a user manually (e.g. via /allow command).
   */
  registerUser(userId: string, role: UserRole = 'user'): void {
    this.users.set(userId, { userId, role });
  }
}

export const userManager = new UserManager();
export default UserManager;
