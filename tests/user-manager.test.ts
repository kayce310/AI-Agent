/**
 * @file UserManager Tests
 * @layer tests
 * @owner telegram-module
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import UserManager from '../src/modules/telegram/user-manager.js';

describe('UserManager', () => {
  let manager: UserManager;

  beforeEach(() => {
    // Clear disk state to avoid cross-test contamination
    UserManager.clearDiskUserFile();
    // Clear env
    delete process.env.CORAL_TELEGRAM_USERS;
    manager = new UserManager();
  });

  describe('constructor + env parsing', () => {
    it('should parse allowlist from CORAL_TELEGRAM_USERS env', () => {
      process.env.CORAL_TELEGRAM_USERS = '123:admin,456:user,789:user';
      const m = new UserManager();
      expect(m.isAllowed('123')).toBe(true);
      expect(m.isAllowed('456')).toBe(true);
      expect(m.isAllowed('789')).toBe(true);
      expect(m.isAllowed('999')).toBe(false);
    });

    it('should handle empty env', () => {
      const m = new UserManager();
      expect(m.isAllowed('123')).toBe(false);
    });

    it('should handle malformed entries gracefully', () => {
      process.env.CORAL_TELEGRAM_USERS = '123:admin,,456:user,invalid';
      const m = new UserManager();
      expect(m.isAllowed('123')).toBe(true);
      expect(m.isAllowed('456')).toBe(true);
      expect(m.isAllowed('invalid')).toBe(false);
    });

    it('should ignore entries with invalid roles', () => {
      process.env.CORAL_TELEGRAM_USERS = '123:admin,456:superadmin,789:user';
      const m = new UserManager();
      expect(m.isAllowed('123')).toBe(true);
      expect(m.isAllowed('456')).toBe(false); // invalid role
      expect(m.isAllowed('789')).toBe(true);
    });
  });

  describe('isAllowed', () => {
    it('should reject unknown users', () => {
      expect(manager.isAllowed('999')).toBe(false);
    });

    it('should allow configured users', () => {
      process.env.CORAL_TELEGRAM_USERS = '123:admin';
      const m = new UserManager();
      expect(m.isAllowed('123')).toBe(true);
    });
  });

  describe('isAdmin', () => {
    it('should return false for non-admin user', () => {
      process.env.CORAL_TELEGRAM_USERS = '123:user';
      const m = new UserManager();
      expect(m.isAdmin('123')).toBe(false);
    });

    it('should return true for admin user', () => {
      process.env.CORAL_TELEGRAM_USERS = '123:admin';
      const m = new UserManager();
      expect(m.isAdmin('123')).toBe(true);
    });

    it('should return false for unknown user', () => {
      expect(manager.isAdmin('999')).toBe(false);
    });
  });

  describe('isUser', () => {
    it('should return true for any registered user', () => {
      process.env.CORAL_TELEGRAM_USERS = '123:admin,456:user';
      const m = new UserManager();
      expect(m.isUser('123')).toBe(true);
      expect(m.isUser('456')).toBe(true);
    });

    it('should return false for unknown user', () => {
      expect(manager.isUser('999')).toBe(false);
    });
  });

  describe('registerUser', () => {
    it('should add user with default role', () => {
      manager.registerUser('999');
      expect(manager.isAllowed('999')).toBe(true);
      expect(manager.isAdmin('999')).toBe(false);
    });

    it('should add user with specified role', () => {
      manager.registerUser('999', 'admin');
      expect(manager.isAllowed('999')).toBe(true);
      expect(manager.isAdmin('999')).toBe(true);
    });
  });

  describe('getUser', () => {
    it('should return undefined for unknown user', () => {
      expect(manager.getUser('999')).toBeUndefined();
    });

    it('should return user info for known user', () => {
      process.env.CORAL_TELEGRAM_USERS = '123:admin';
      const m = new UserManager();
      const user = m.getUser('123');
      expect(user).toBeDefined();
      expect(user?.userId).toBe('123');
      expect(user?.role).toBe('admin');
    });
  });

  describe('bootstrap', () => {
    it('should allow first user as admin when no users configured', () => {
      const result = manager.bootstrap('999');
      expect(result).toBe(true);
      expect(manager.isAllowed('999')).toBe(true);
      expect(manager.isAdmin('999')).toBe(true);
    });

    it('should not bootstrap twice', () => {
      manager.bootstrap('111');
      const result = manager.bootstrap('222');
      expect(result).toBe(false); // already bootstrapped
      expect(manager.isAllowed('222')).toBe(false);
    });

    it('should not bootstrap if env users exist', () => {
      process.env.CORAL_TELEGRAM_USERS = '123:user';
      const m = new UserManager();
      const result = m.bootstrap('999');
      expect(result).toBe(false); // users already configured via env
      expect(m.isAllowed('999')).toBe(false);
    });
  });

  describe('unregisterUser', () => {
    it('should remove user from allowlist', () => {
      manager.registerUser('999', 'user');
      expect(manager.isAllowed('999')).toBe(true);
      manager.unregisterUser('999');
      expect(manager.isAllowed('999')).toBe(false);
    });

    it('should not throw on non-existent user', () => {
      expect(() => manager.unregisterUser('nonexistent')).not.toThrow();
    });
  });

  describe('getUserIds / getAdminIds', () => {
    it('should return only user-role IDs', () => {
      manager.registerUser('111', 'admin');
      manager.registerUser('222', 'user');
      manager.registerUser('333', 'user');
      const users = manager.getUserIds();
      expect(users).toContain('222');
      expect(users).toContain('333');
      expect(users).not.toContain('111');
    });

    it('should return only admin-role IDs', () => {
      manager.registerUser('111', 'admin');
      manager.registerUser('222', 'user');
      const admins = manager.getAdminIds();
      expect(admins).toContain('111');
      expect(admins).not.toContain('222');
    });

    it('should return empty arrays when no users', () => {
      expect(manager.getUserIds()).toEqual([]);
      expect(manager.getAdminIds()).toEqual([]);
    });
  });
});
