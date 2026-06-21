import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SessionManager, SessionState } from '../src/platform/telegram/session-manager';

describe('SessionManager', () => {
  let manager: SessionManager;

  beforeEach(() => {
    manager = new SessionManager();
  });

  afterEach(() => {
    manager.destroy();
  });

  describe('Session Creation', () => {
    it('creates new session for new user', () => {
      const session = manager.getOrCreateSession('user123');

      expect(session).toBeDefined();
      expect(session.userId).toBe('user123');
      expect(session.sessionId).toBeDefined();
      expect(session.introSent).toBe(false);
      expect(session.createdAt).toBeGreaterThan(0);
      expect(session.lastActivity).toBeGreaterThan(0);
    });

    it('returns same sessionId for same user within TTL', () => {
      const session1 = manager.getOrCreateSession('user123');
      const session2 = manager.getOrCreateSession('user123');

      expect(session1.sessionId).toBe(session2.sessionId);
      expect(session1.userId).toBe(session2.userId);
    });

    it('creates different sessions for different users', () => {
      const session1 = manager.getOrCreateSession('user1');
      const session2 = manager.getOrCreateSession('user2');

      expect(session1.sessionId).not.toBe(session2.sessionId);
      expect(session1.userId).toBe('user1');
      expect(session2.userId).toBe('user2');
    });
  });

  describe('Intro Tracking', () => {
    it('tracks intro sent status', () => {
      const session1 = manager.getOrCreateSession('user123');
      expect(session1.introSent).toBe(false);

      manager.markIntroSent('user123');

      const session2 = manager.getOrCreateSession('user123');
      expect(session2.introSent).toBe(true);
    });

    it('preserves intro status across calls', () => {
      manager.getOrCreateSession('user123');
      manager.markIntroSent('user123');

      // Simulate multiple messages
      manager.updateLastActivity('user123');
      manager.updateLastActivity('user123');

      const session = manager.getOrCreateSession('user123');
      expect(session.introSent).toBe(true);
    });
  });

  describe('Activity Tracking', () => {
    it('updates last activity on each call', () => {
      vi.useFakeTimers();

      const session1 = manager.getOrCreateSession('user123');
      const firstActivity = session1.lastActivity;

      vi.advanceTimersByTime(1000);
      manager.updateLastActivity('user123');

      const session2 = manager.getOrCreateSession('user123');
      expect(session2.lastActivity).toBeGreaterThan(firstActivity);

      vi.useRealTimers();
    });

    it('preserves session when activity is recent', () => {
      vi.useFakeTimers();

      const session1 = manager.getOrCreateSession('user123');
      const sessionId1 = session1.sessionId;

      // Advance 10 min (less than 15 min TTL)
      vi.advanceTimersByTime(10 * 60 * 1000);
      manager.updateLastActivity('user123');

      const session2 = manager.getOrCreateSession('user123');
      expect(session2.sessionId).toBe(sessionId1);

      vi.useRealTimers();
    });
  });

  describe('TTL Expiration', () => {
    it('creates new session after TTL expires', () => {
      vi.useFakeTimers();

      const session1 = manager.getOrCreateSession('user123');
      const sessionId1 = session1.sessionId;

      // Advance past TTL (15 min + 1 sec)
      vi.advanceTimersByTime(15 * 60 * 1000 + 1000);

      const session2 = manager.getOrCreateSession('user123');
      expect(session2.sessionId).not.toBe(sessionId1);
      expect(session2.introSent).toBe(false);

      vi.useRealTimers();
    });

    it('resets intro flag on TTL expiration', () => {
      vi.useFakeTimers();

      const session1 = manager.getOrCreateSession('user123');
      manager.markIntroSent('user123');

      // Advance past TTL
      vi.advanceTimersByTime(15 * 60 * 1000 + 1000);

      const session2 = manager.getOrCreateSession('user123');
      expect(session2.introSent).toBe(false);

      vi.useRealTimers();
    });

    it('does not expire session with recent activity', () => {
      vi.useFakeTimers();

      const session1 = manager.getOrCreateSession('user123');
      const sessionId1 = session1.sessionId;

      // Advance 7.5 min
      vi.advanceTimersByTime(7.5 * 60 * 1000);
      manager.updateLastActivity('user123');

      // Advance another 7.5 min (total 15 min, but last activity was 7.5 min ago)
      vi.advanceTimersByTime(7.5 * 60 * 1000);

      const session2 = manager.getOrCreateSession('user123');
      expect(session2.sessionId).toBe(sessionId1);

      vi.useRealTimers();
    });
  });

  describe('Cleanup', () => {
    it('removes expired sessions on cleanup', () => {
      vi.useFakeTimers();

      manager.getOrCreateSession('user1');
      manager.getOrCreateSession('user2');
      expect(manager.getActiveCount()).toBe(2);

      // Advance past TTL
      vi.advanceTimersByTime(15 * 60 * 1000 + 1000);
      manager.cleanup();

      expect(manager.getActiveCount()).toBe(0);

      vi.useRealTimers();
    });

    it('keeps non-expired sessions during cleanup', () => {
      vi.useFakeTimers();

      const session1 = manager.getOrCreateSession('user1');
      const sessionId1 = session1.sessionId;

      manager.getOrCreateSession('user2');

      expect(manager.getActiveCount()).toBe(2);

      // Advance 10 min, update user1 to keep it alive
      vi.advanceTimersByTime(10 * 60 * 1000);
      manager.updateLastActivity('user1');

      // Advance another 6 min (user1 last activity 6 min ago, within TTL)
      // (user2 last activity 16 min ago, expired)
      vi.advanceTimersByTime(6 * 60 * 1000);

      manager.cleanup();

      // user1 should still exist
      const remainingSession = manager.getSession('user1');
      expect(remainingSession).toBeDefined();
      expect(remainingSession?.sessionId).toBe(sessionId1);

      // user2 should be gone
      const expiredSession = manager.getSession('user2');
      expect(expiredSession).toBeUndefined();

      expect(manager.getActiveCount()).toBe(1);

      vi.useRealTimers();
    });

    it('handles multiple users with mixed expiration', () => {
      vi.useFakeTimers();

      // Create 3 users
      const s1 = manager.getOrCreateSession('user1');
      const s1Id = s1.sessionId;
      vi.advanceTimersByTime(1000);

      manager.getOrCreateSession('user2');
      vi.advanceTimersByTime(1000);

      manager.getOrCreateSession('user3');
      expect(manager.getActiveCount()).toBe(3);

      // Update user1 (keep it alive)
      vi.advanceTimersByTime(8 * 60 * 1000);
      manager.updateLastActivity('user1');

      // Let user2 and user3 expire
      vi.advanceTimersByTime(7 * 60 * 1000 + 1000);
      manager.cleanup();

      // Only user1 should remain
      expect(manager.getActiveCount()).toBe(1);
      const remaining = manager.getSession('user1');
      expect(remaining?.sessionId).toBe(s1Id);

      vi.useRealTimers();
    });
  });

  describe('Session Retrieval', () => {
    it('gets session without TTL check via getSession', () => {
      const session = manager.getOrCreateSession('user123');
      const retrieved = manager.getSession('user123');

      expect(retrieved).toBeDefined();
      expect(retrieved?.sessionId).toBe(session.sessionId);
    });

    it('returns undefined for non-existent session', () => {
      const session = manager.getSession('nonexistent');
      expect(session).toBeUndefined();
    });

    it('tracks active count', () => {
      expect(manager.getActiveCount()).toBe(0);

      manager.getOrCreateSession('user1');
      expect(manager.getActiveCount()).toBe(1);

      manager.getOrCreateSession('user2');
      expect(manager.getActiveCount()).toBe(2);

      manager.getOrCreateSession('user1'); // Same user
      expect(manager.getActiveCount()).toBe(2);
    });
  });

  describe('Lifecycle', () => {
    it('cleans up resources on destroy', () => {
      manager.getOrCreateSession('user1');
      manager.getOrCreateSession('user2');

      manager.destroy();

      expect(manager.getActiveCount()).toBe(0);
      expect(manager.getSession('user1')).toBeUndefined();
    });
  });
});
