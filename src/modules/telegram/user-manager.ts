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
import type Database from 'better-sqlite3';
import { getStorage } from '../../core/memory/sqlite-storage.js';

export type UserRole = 'admin' | 'user';

export interface TelegramUser {
  userId: string;
  username?: string;
  firstName?: string;
  role: UserRole;
  createdAt?: number;
  updatedAt?: number;
}

const USER_FILE = path.join(
  process.env.TEMP || process.env.TMP || '/tmp',
  'coral-users.json'
);

export class UserManager {
  private users: Map<string, TelegramUser> = new Map();
  private bootstrapDone = false;
  private db: Database.Database | null = null;

  constructor(db?: Database.Database) {
    try {
      this.db = db ?? getStorage().getDb();
      this.initSchema();
    } catch {
      // In isolated environments without storage, fallback gracefully
      this.db = null;
    }
    this.load();
  }

  /**
   * Khởi tạo schema bảng SQLite cho telegram_users.
   */
  private initSchema(): void {
    if (!this.db) return;
    try {
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS telegram_users (
          user_id TEXT PRIMARY KEY,
          username TEXT,
          first_name TEXT,
          role TEXT NOT NULL CHECK(role IN ('admin', 'user')),
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_tg_users_role ON telegram_users(role);
      `);
    } catch { /* silent */ }
  }

  /**
   * Bootstrap: first user becomes admin when no users are configured.
   * This allows personal bot setup without pre-configuring env.
   */
  bootstrap(userId: string): boolean {
    if (this.bootstrapDone || this.users.size > 0) return false;
    const now = Date.now();
    const user: TelegramUser = { userId, role: 'admin', createdAt: now, updatedAt: now };
    this.users.set(userId.toLowerCase(), user);
    this.bootstrapDone = true;
    this.saveUser(user);
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
    const direct = this.users.get(userId.toLowerCase());
    if (direct) return direct;
    if (username) {
      return this.users.get('@' + username.toLowerCase());
    }
    return undefined;
  }

  /** Check if user is allowed to use Coral. */
  isAllowed(userId: string, username?: string): boolean {
    if (this.users.has(userId.toLowerCase())) return true;
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
  registerUser(identifier: string, role: UserRole = 'user', username?: string, firstName?: string): void {
    const now = Date.now();
    const user: TelegramUser = { userId: identifier, role, username, firstName, createdAt: now, updatedAt: now };
    this.users.set(identifier.toLowerCase(), user);
    if (username) {
      this.users.set('@' + username.toLowerCase(), user);
    }
    this.saveUser(user);
  }

  /** Remove a user from the allowlist. */
  unregisterUser(identifier: string): void {
    const user = this.users.get(identifier.toLowerCase());
    this.users.delete(identifier.toLowerCase());
    if (user?.username) {
      this.users.delete('@' + user.username.toLowerCase());
    }
    this.deleteUser(identifier);
    if (user && user.userId !== identifier) {
      this.deleteUser(user.userId);
    }
  }

  /** Get all non-admin user IDs. */
  getUserIds(): string[] {
    const unique = new Set<string>();
    for (const u of this.users.values()) {
      if (u.role === 'user') unique.add(u.userId);
    }
    return Array.from(unique);
  }

  /** Get all admin user IDs. */
  getAdminIds(): string[] {
    const unique = new Set<string>();
    for (const u of this.users.values()) {
      if (u.role === 'admin') unique.add(u.userId);
    }
    return Array.from(unique);
  }

  // ── Persistence ──

  private saveUser(user: TelegramUser): void {
    if (this.db) {
      try {
        const now = Date.now();
        this.db.prepare(`
          INSERT INTO telegram_users (user_id, username, first_name, role, created_at, updated_at)
          VALUES (@userId, @username, @firstName, @role, @createdAt, @updatedAt)
          ON CONFLICT(user_id) DO UPDATE SET
            username = excluded.username,
            first_name = excluded.first_name,
            role = excluded.role,
            updated_at = excluded.updated_at
        `).run({
          userId: user.userId,
          username: user.username || null,
          firstName: user.firstName || null,
          role: user.role,
          createdAt: user.createdAt || now,
          updatedAt: now,
        });
      } catch { /* silent — non-critical */ }
    }
  }

  private deleteUser(identifier: string): void {
    if (this.db) {
      try {
        this.db.prepare('DELETE FROM telegram_users WHERE user_id = ?').run(identifier);
      } catch { /* silent */ }
    }
  }

  private load(): void {
    // 1. Tự động di chuyển dữ liệu cũ từ JSON file sang SQLite nếu bảng đang trống
    if (this.db) {
      try {
        const countRow = this.db.prepare('SELECT COUNT(*) as count FROM telegram_users').get() as { count: number };
        if (countRow.count === 0 && fs.existsSync(USER_FILE)) {
          const raw = fs.readFileSync(USER_FILE, 'utf8');
          const data = JSON.parse(raw);
          if (data.users) {
            const insertStmt = this.db.prepare(`
              INSERT OR IGNORE INTO telegram_users (user_id, username, first_name, role, created_at, updated_at)
              VALUES (@userId, @username, @firstName, @role, @createdAt, @updatedAt)
            `);
            const now = Date.now();
            for (const [key, user] of Object.entries(data.users) as [string, TelegramUser][]) {
              const uId = user.userId || key;
              insertStmt.run({
                userId: uId,
                username: user.username || null,
                firstName: user.firstName || null,
                role: user.role,
                createdAt: now,
                updatedAt: now,
              });
            }
          }
        }
      } catch { /* silent migration failure */ }

      // 2. Tải toàn bộ người dùng từ SQLite vào bộ nhớ cache
      try {
        const rows = this.db.prepare('SELECT * FROM telegram_users').all() as any[];
        for (const row of rows) {
          const u: TelegramUser = {
            userId: row.user_id,
            username: row.username || undefined,
            firstName: row.first_name || undefined,
            role: row.role as UserRole,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
          };
          this.users.set(row.user_id.toLowerCase(), u);
          if (u.username) {
            this.users.set('@' + u.username.toLowerCase(), u);
          }
          if (u.role === 'admin') {
            this.bootstrapDone = true;
          }
        }
      } catch { /* silent */ }
    } else {
      // Fallback khi SQLite không khả dụng
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
      } catch { /* silent */ }
    }

    // 3. Luôn gộp người dùng cấu hình qua biến môi trường (ưu tiên cao nhất)
    this.loadFromEnv();
  }

  /**
   * Clear user file from disk & SQLite table (for testing)
   */
  static clearDiskUserFile(): void {
    try {
      if (fs.existsSync(USER_FILE)) {
        fs.unlinkSync(USER_FILE);
      }
    } catch { /* silent */ }
    try {
      const db = getStorage().getDb();
      db.prepare('DELETE FROM telegram_users').run();
    } catch { /* silent */ }
  }
}

export const userManager = new UserManager();
export default UserManager;
