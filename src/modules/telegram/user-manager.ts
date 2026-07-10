/**
 * @file User Manager — Permission & Role System for Coral Telegram
 * @layer modules
 * @owner telegram-module
 *
 * Simple user management: allowlist + roles.
 * Admin = Kayce, User = family members.
 * Unknown users get denied access.
 * Persists to disk across restarts.
 */

import * as fs from 'fs';
import * as path from 'path';

export type UserRole = 'admin' | 'user';

export interface TelegramUser {
  userId: string;
  username?: string;
  firstName?: string;
  role: UserRole;
}

const USER_FILE = path.join(
  process.env.TEMP || process.env.TMP || '/tmp',
  'coral-users.json'
);

class UserManager {
  private users: Map<string, TelegramUser> = new Map();
  private bootstrapDone = false;

  constructor() {
    this.load();
  }

  /**
   * Bootstrap: first user becomes admin when no users are configured.
   * This allows personal bot setup without pre-configuring env.
   */
  bootstrap(userId: string): boolean {
    if (this.bootstrapDone || this.users.size > 0) return false;
    this.users.set(userId, { userId, role: 'admin' });
    this.bootstrapDone = true;
    this.save();
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
   */
  private loadFromEnv(): void {
    const config = process.env.CORAL_TELEGRAM_USERS;
    if (!config) return;

    for (const entry of config.split(',')) {
      const [identifier, role] = entry.trim().split(':');
      if (identifier && (role === 'admin' || role === 'user')) {
        this.users.set(identifier.toLowerCase(), { userId: identifier, role });
      }
    }
  }

  /** Get user info. Returns undefined if user is not in allowlist. */
  getUser(userId: string, username?: string): TelegramUser | undefined {
    const direct = this.users.get(userId);
    if (direct) return direct;
    if (username) {
      return this.users.get('@' + username.toLowerCase());
    }
    return undefined;
  }

  /** Check if user is allowed to use Coral. */
  isAllowed(userId: string, username?: string): boolean {
    if (this.users.has(userId)) return true;
    if (username && this.users.has('@' + username.toLowerCase())) return true;
    return false;
  }

  /** Check if user has admin role. */
  isAdmin(userId: string, username?: string): boolean {
    const user = this.getUser(userId, username);
    return user?.role === 'admin';
  }

  /** Check if user has at least 'user' role. */
  isUser(userId: string, username?: string): boolean {
    return this.getUser(userId, username) !== undefined;
  }

  /** Register a user manually (e.g. via /allow command). */
  registerUser(identifier: string, role: UserRole = 'user'): void {
    this.users.set(identifier.toLowerCase(), { userId: identifier, role });
    this.save();
  }

  /** Remove a user from the allowlist. */
  unregisterUser(identifier: string): void {
    this.users.delete(identifier.toLowerCase());
    this.save();
  }

  /** Get all non-admin user IDs. */
  getUserIds(): string[] {
    return Array.from(this.users.values())
      .filter(u => u.role === 'user')
      .map(u => u.userId);
  }

  /** Get all admin user IDs. */
  getAdminIds(): string[] {
    return Array.from(this.users.values())
      .filter(u => u.role === 'admin')
      .map(u => u.userId);
  }

  // ── Persistence ──

  private save(): void {
    try {
      const data = {
        bootstrapDone: this.bootstrapDone,
        users: Object.fromEntries(this.users.entries()),
      };
      fs.writeFileSync(USER_FILE, JSON.stringify(data, null, 2));
    } catch { /* silent — non-critical */ }
  }

  private load(): void {
    try {
      if (fs.existsSync(USER_FILE)) {
        const raw = fs.readFileSync(USER_FILE, 'utf8');
        const data = JSON.parse(raw);
        if (data.users) {
          for (const [key, user] of Object.entries(data.users) as [string, TelegramUser][]) {
            this.users.set(key, user);
          }
        }
        this.bootstrapDone = data.bootstrapDone || this.users.size > 0;
      }
    } catch { /* silent — will try env */ }

    // Always merge env users (env overrides disk for flexibility)
    this.loadFromEnv();
  }

  /**
   * Clear user file from disk (for testing)
   */
  static clearDiskUserFile(): void {
    try {
      if (fs.existsSync(USER_FILE)) {
        fs.unlinkSync(USER_FILE);
      }
    } catch { /* silent */ }
  }
}

export const userManager = new UserManager();
export default UserManager;
