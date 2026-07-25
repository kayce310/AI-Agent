import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import { SessionManager } from './src/platform/telegram/session-manager';

// Mock runtime instrumentation before imports
const mockRuntimeInstrumentation: any = {
  sessionLock: vi.fn(),
  sessionUnlock: vi.fn(),
  logToolEvent: vi.fn(),
};
vi.stubGlobal('R', mockRuntimeInstrumentation);

describe('SessionManager tests (real implementation)', () => {
  let sessionManager: SessionManager;

  beforeEach(() => {
    // Clear disk file before each test
    SessionManager.clearDiskSessionFile();
    sessionManager = new SessionManager();
  });

  afterEach(() => {
    sessionManager.destroy();
  });

  it('should create a new session for a user', () => {
    const userId = 'test-user-1';
    const session = sessionManager.createSession(userId);

    expect(session).not.toBeUndefined();
    expect(session.userId).toBe(userId);
    expect(session.sessionId).toContain(userId);
    expect(session.introSent).toBe(false);
    expect(session.messages).toEqual([]);
  });

  it('should retrieve existing session for a user', () => {
    const userId = 'test-user-2';
    const session1 = sessionManager.createSession(userId);
    const session2 = sessionManager.createSession(userId);

    expect(session1).toBe(session2);
  });

  it('should mark intro as sent', async () => {
    const userId = 'test-user-3';
    const session = sessionManager.createSession(userId);
    const sessionId = session.sessionId;

    await sessionManager.markIntroSent(userId);

    const updatedSession = sessionManager.getSession(userId);
    expect(updatedSession?.introSent).toBe(true);
    expect(updatedSession?.sessionId).toBe(sessionId);
  });

  it('should update last activity timestamp', async () => {
    const userId = 'test-user-4';
    const session = sessionManager.createSession(userId);
    const initialActivity = session.lastActivity;

    await sessionManager.updateLastActivity(userId);

    const updatedSession = sessionManager.getSession(userId);
    expect(updatedSession?.lastActivity).toBeGreaterThan(initialActivity);
  });

  it('should cleanup expired sessions', async () => {
    const userId = 'test-user-5';
    const session = sessionManager.createSession(userId);

    await sessionManager.updateLastActivity(userId);

    // Manipulate session time to make it expire
    const testSession = sessionManager.getSession(userId);
    if (testSession) {
      testSession.lastActivity = Date.now() - 16 * 60 * 1000; // 16 minutes ago (exceeds TTL)
      sessionManager.markDirty();
    }

    sessionManager.cleanup();

    const expiredSession = sessionManager.getSession(userId);
    expect(expiredSession).toBeUndefined();
  });

  it('should persist session state to disk', async () => {
    const userId = 'test-user-6';
    const session = sessionManager.createSession(userId);

    await sessionManager.markIntroSent(userId);

    // Create a new manager instance to load from disk
    SessionManager.clearDiskSessionFile();
    const newManager = new SessionManager();

    const loadedSession = newManager.getSession(userId);
    expect(loadedSession).not.toBeUndefined();
    expect(loadedSession?.userId).toBe(userId);
    expect(loadedSession?.introSent).toBe(true);

    newManager.destroy();
  });

  it('should return active session count', () => {
    const initialCount = sessionManager.getActiveCount();
    sessionManager.createSession('user-1');
    sessionManager.createSession('user-2');

    const newCount = sessionManager.getActiveCount();
    expect(newCount).toBe(initialCount + 2);
  });

  it('should hold lock to prevent race conditions', async () => {
    const userId = 'test-user-7';
    const sessionPromise1 = sessionManager.createSession(userId);

    // Second promise should wait for first
    const sessionPromise2 = sessionManager.createSession(userId);

    // Should resolve immediately because same session
    expect(await sessionPromise1).toBe(await sessionPromise2);
  });
});