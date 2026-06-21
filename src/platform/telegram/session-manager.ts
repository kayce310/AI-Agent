import { randomUUID } from 'crypto';

export interface SessionState {
  sessionId: string;
  userId: string;
  createdAt: number;
  lastActivity: number;
  introSent: boolean;
}

export interface SessionActivityEvent {
  type: 'session_activity';
  sessionId: string;
  userId: string;
  action: 'message_received' | 'session_created' | 'session_expired';
  isNewSession: boolean;
}

export interface IntroSentEvent {
  type: 'intro_sent';
  sessionId: string;
  userId: string;
}

/**
 * SessionManager: Lightweight TTL-based session cache
 * 
 * Keeps Coral agent stateless while providing session continuity to users.
 * Sessions expire after 15 minutes of inactivity.
 * 
 * Usage:
 *   const manager = new SessionManager();
 *   const session = manager.getOrCreateSession(userId);
 *   if (!session.introSent) {
 *     sendIntro(userId);
 *     manager.markIntroSent(userId);
 *   }
 */
export class SessionManager {
  private sessions = new Map<string, SessionState>();
  private readonly TTL_MS = 15 * 60 * 1000; // 15 minutes
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Auto-cleanup expired sessions every 5 minutes
    this.cleanupInterval = setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  /**
   * Get existing session or create new one
   * Checks TTL and creates fresh session if expired
   */
  getOrCreateSession(userId: string): SessionState {
    const existing = this.sessions.get(userId);

    // Check if session expired
    if (existing && this.isExpired(existing)) {
      this.sessions.delete(userId);
      return this.createNewSession(userId);
    }

    // Return existing or create new
    if (!existing) {
      return this.createNewSession(userId);
    }

    return existing;
  }

  /**
   * Create new session with fresh ID
   */
  private createNewSession(userId: string): SessionState {
    const session: SessionState = {
      sessionId: randomUUID(),
      userId,
      createdAt: Date.now(),
      lastActivity: Date.now(),
      introSent: false,
    };
    this.sessions.set(userId, session);
    return session;
  }

  /**
   * Mark intro as sent for this session
   */
  markIntroSent(userId: string): void {
    const session = this.sessions.get(userId);
    if (session) {
      session.introSent = true;
      session.lastActivity = Date.now();
    }
  }

  /**
   * Update last activity timestamp (call on each message)
   */
  updateLastActivity(userId: string): void {
    const session = this.sessions.get(userId);
    if (session) {
      session.lastActivity = Date.now();
    }
  }

  /**
   * Check if session has expired
   */
  private isExpired(session: SessionState): boolean {
    return Date.now() - session.lastActivity > this.TTL_MS;
  }

  /**
   * Remove all expired sessions
   * Called automatically every 5 minutes
   */
  cleanup(): void {
    const now = Date.now();
    const expired: string[] = [];

    this.sessions.forEach((session, userId) => {
      if (now - session.lastActivity > this.TTL_MS) {
        expired.push(userId);
      }
    });

    expired.forEach(userId => this.sessions.delete(userId));
  }

  /**
   * Get active session count
   */
  getActiveCount(): number {
    return this.sessions.size;
  }

  /**
   * Get or create a session for a user
   * Creates a new session if none exists for the given userId
   */
  createSession(userId: string): SessionState {
    const existing = this.getSession(userId);
    if (existing) return existing;

    const session: SessionState = {
      sessionId: `session-${userId}-${Date.now()}`,
      userId,
      lastActivity: Date.now(),
      introSent: false,
      createdAt: Date.now(),
    };

    this.sessions.set(userId, session);
    return session;
  }

  /**
   * Get session for user (without TTL check)
   */
  getSession(userId: string): SessionState | undefined {
    return this.sessions.get(userId);
  }

  /**
   * Destroy manager and cleanup resources
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.sessions.clear();
  }
}
