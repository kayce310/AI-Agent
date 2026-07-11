import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SessionManager, SessionState } from '../src/platform/telegram/session-manager';

describe('SessionManager', () => {
  let manager: SessionManager;

  beforeEach(() => {
    SessionManager.clearDiskSessionFile();
    manager = new SessionManager();
  });

  afterEach(() => {
    manager.destroy();
  });

  describe('Session Creation', () => {
    it('creates new session for new user', async () => {
      const session = await manager.getOrCreateSession('user123');

      expect(session).toBeDefined();
      expect(session.userId).toBe('user123');
      expect(session.sessionId).toBeDefined();
      expect(session.introSent).toBe(false);
      expect(session.createdAt).toBeGreaterThan(0);
      expect(session.lastActivity).toBeGreaterThan(0);
    });

    it('returns same sessionId for same user within TTL', async () => {
      const session1 = await manager.getOrCreateSession('user123');
      const session2 = await manager.getOrCreateSession('user123');

      expect(session1.sessionId).toBe(session2.sessionId);
      expect(session1.userId).toBe(session2.userId);
    });

    it('creates different sessions for different users', async () => {
      const session1 = await manager.getOrCreateSession('user1');
      const session2 = await manager.getOrCreateSession('user2');

      expect(session1.sessionId).not.toBe(session2.sessionId);
      expect(session1.userId).toBe('user1');
      expect(session2.userId).toBe('user2');
    });
  });

  describe('Intro Tracking', () => {
    it('tracks intro sent status', async () => {
      const session1 = await manager.getOrCreateSession('user123');
      expect(session1.introSent).toBe(false);

      await manager.markIntroSent('user123');

      const session2 = await manager.getOrCreateSession('user123');
      expect(session2.introSent).toBe(true);
    });

    it('preserves intro status across calls', async () => {
      await manager.getOrCreateSession('user123');
      await manager.markIntroSent('user123');

      // Simulate multiple messages
      await manager.updateLastActivity('user123');
      await manager.updateLastActivity('user123');

      const session = await manager.getOrCreateSession('user123');
      expect(session.introSent).toBe(true);
    });
  });

  describe('Activity Tracking', () => {
    it('updates last activity on each call', async () => {
      vi.useFakeTimers();

      const session1 = await manager.getOrCreateSession('user123');
      const firstActivity = session1.lastActivity;

      vi.advanceTimersByTime(1000);
      await manager.updateLastActivity('user123');

      const session2 = await manager.getOrCreateSession('user123');
      expect(session2.lastActivity).toBeGreaterThan(firstActivity);

      vi.useRealTimers();
    });

    it('preserves session when activity is recent', async () => {
      vi.useFakeTimers();

      const session1 = await manager.getOrCreateSession('user123');
      const sessionId1 = session1.sessionId;

      // Advance 10 min (less than 15 min TTL)
      vi.advanceTimersByTime(10 * 60 * 1000);
      await manager.updateLastActivity('user123');

      const session2 = await manager.getOrCreateSession('user123');
      expect(session2.sessionId).toBe(sessionId1);

      vi.useRealTimers();
    });
  });

  describe('TTL Expiration', () => {
    it('creates new session after TTL expires', async () => {
      vi.useFakeTimers();

      const session1 = await manager.getOrCreateSession('user123');
      const sessionId1 = session1.sessionId;

      // Advance past TTL (15 min + 1 sec)
      vi.advanceTimersByTime(15 * 60 * 1000 + 1000);

      const session2 = await manager.getOrCreateSession('user123');
      expect(session2.sessionId).not.toBe(sessionId1);
      expect(session2.introSent).toBe(false);

      vi.useRealTimers();
    });

    it('resets intro flag on TTL expiration', async () => {
      vi.useFakeTimers();

      const session1 = await manager.getOrCreateSession('user123');
      await manager.markIntroSent('user123');

      // Advance past TTL
      vi.advanceTimersByTime(15 * 60 * 1000 + 1000);

      const session2 = await manager.getOrCreateSession('user123');
      expect(session2.introSent).toBe(false);

      vi.useRealTimers();
    });

    it('does not expire session with recent activity', async () => {
      vi.useFakeTimers();

      const session1 = await manager.getOrCreateSession('user123');
      const sessionId1 = session1.sessionId;

      // Advance 7.5 min
      vi.advanceTimersByTime(7.5 * 60 * 1000);
      await manager.updateLastActivity('user123');

      // Advance another 7.5 min (total 15 min, but last activity was 7.5 min ago)
      vi.advanceTimersByTime(7.5 * 60 * 1000);

      const session2 = await manager.getOrCreateSession('user123');
      expect(session2.sessionId).toBe(sessionId1);

      vi.useRealTimers();
    });
  });

  describe('Cleanup', () => {
    it('removes expired sessions on cleanup', async () => {
      vi.useFakeTimers();

      await manager.getOrCreateSession('user1');
      await manager.getOrCreateSession('user2');
      expect(manager.getActiveCount()).toBe(2);

      // Advance past TTL
      vi.advanceTimersByTime(15 * 60 * 1000 + 1000);
      manager.cleanup();

      expect(manager.getActiveCount()).toBe(0);

      vi.useRealTimers();
    });

    it('keeps non-expired sessions during cleanup', async () => {
      vi.useFakeTimers();

      const session1 = await manager.getOrCreateSession('user1');
      const sessionId1 = session1.sessionId;

      await manager.getOrCreateSession('user2');

      expect(manager.getActiveCount()).toBe(2);

      // Advance 10 min, update user1 to keep it alive
      vi.advanceTimersByTime(10 * 60 * 1000);
      await manager.updateLastActivity('user1');

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

    it('handles multiple users with mixed expiration', async () => {
      vi.useFakeTimers();

      // Create 3 users
      const s1 = await manager.getOrCreateSession('user1');
      const s1Id = s1.sessionId;
      vi.advanceTimersByTime(1000);

      await manager.getOrCreateSession('user2');
      vi.advanceTimersByTime(1000);

      await manager.getOrCreateSession('user3');
      expect(manager.getActiveCount()).toBe(3);

      // Update user1 (keep it alive)
      vi.advanceTimersByTime(8 * 60 * 1000);
      await manager.updateLastActivity('user1');

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
    it('gets session without TTL check via getSession', async () => {
      const session = await manager.getOrCreateSession('user123');
      const retrieved = manager.getSession('user123');

      expect(retrieved).toBeDefined();
      expect(retrieved?.sessionId).toBe(session.sessionId);
    });

    it('returns undefined for non-existent session', () => {
      const session = manager.getSession('nonexistent');
      expect(session).toBeUndefined();
    });

    it('tracks active count', async () => {
      expect(manager.getActiveCount()).toBe(0);

      await manager.getOrCreateSession('user1');
      expect(manager.getActiveCount()).toBe(1);

      await manager.getOrCreateSession('user2');
      expect(manager.getActiveCount()).toBe(2);

      await manager.getOrCreateSession('user1'); // Same user
      expect(manager.getActiveCount()).toBe(2);
    });
  });

  describe('Lifecycle', () => {
    it('cleans up resources on destroy', async () => {
      await manager.getOrCreateSession('user1');
      await manager.getOrCreateSession('user2');

      manager.destroy();

      expect(manager.getActiveCount()).toBe(0);
      expect(manager.getSession('user1')).toBeUndefined();
    });
  });
});
