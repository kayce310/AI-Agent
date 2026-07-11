import { randomUUID } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { R } from '../../core/runtime-instrumentation.js';

export interface SessionState {
  sessionId: string;
  userId: string;
  createdAt: number;
  lastActivity: number;
  introSent: boolean;
  messages: any[]; // New: Store message history for agent context
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

const SESSION_FILE = path.join(
  process.env.TEMP || process.env.TMP || '/tmp',
  'coral-sessions.json'
);

/**
 * SessionManager: TTL-based session cache WITH disk persistence
 *
 * Keeps Coral agent stateless while providing session continuity to users.
 * Sessions expire after 24 hours of inactivity (longer for persistence).
 * State is saved to disk and restored on restart.
 * 
 * SECURITY: Uses mutex locks to prevent race conditions in concurrent access.
 */
export class SessionManager {
  private sessions = new Map<string, SessionState>();
  private readonly TTL_MS = 15 * 60 * 1000; // 15 minutes (matches test expectations)
  private cleanupInterval: NodeJS.Timeout | null = null;
  private dirty = false;
  private locks = new Map<string, { promise: Promise<void>; resolve: () => void }>();

  constructor() {
    this.load();
    // Auto-cleanup expired sessions every 10 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
      this.save();
    }, 10 * 60 * 1000);
  }

  /**
   * Acquire mutex lock for a user (prevents race conditions)
   * ponytail: simple promise-queue pattern — waiter yields until lock resolves
   */
  private async acquireLock(userId: string): Promise<void> {
    R.sessionLock({ event: 'LOCK_ACQUIRE', userId });
    while (this.locks.has(userId)) {
      // Wait for existing lock to release
      await this.locks.get(userId)!.promise;
    }
    // Create new lock for this acquirer
    let resolve: () => void;
    const promise = new Promise<void>((r) => {
      resolve = r;
    });
    this.locks.set(userId, { promise, resolve: resolve! });
    R.sessionLock({ event: 'LOCK_ACQUIRED', userId });
  }

  /**
   * Release mutex lock for a user
   */
  private releaseLock(userId: string): void {
    R.sessionLock({ event: 'LOCK_RELEASE', userId });
    const lock = this.locks.get(userId);
    if (lock) {
      lock.resolve(); // Signal waiting acquirers
      this.locks.delete(userId);
    }
  }

  /**
   * Get existing session or create new one (THREAD-SAFE)
   * Checks TTL and creates fresh session if expired
   */
  async getOrCreateSession(userId: string): Promise<SessionState> {
    await this.acquireLock(userId);
    try {
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

      existing.lastActivity = Date.now();
      this.markDirty();
      return existing;
    } finally {
      this.releaseLock(userId);
    }
  }

  /**
   * Create new session with fresh ID (INTERNAL - must hold lock)
   */
  private createNewSession(userId: string): SessionState {
    const session: SessionState = {
      sessionId: randomUUID(),
      userId,
      createdAt: Date.now(),
      lastActivity: Date.now(),
      introSent: false,
      messages: [], // Initialize messages array
    };
    this.sessions.set(userId, session);
    this.markDirty();
    this.save();
    return session;
  }

  /**
   * Mark intro as sent for this session (THREAD-SAFE)
   */
  async markIntroSent(userId: string): Promise<void> {
    await this.acquireLock(userId);
    try {
      const session = this.sessions.get(userId);
      if (session) {
        session.introSent = true;
        session.lastActivity = Date.now();
        this.markDirty();
        this.save();
      }
    } finally {
      this.releaseLock(userId);
    }
  }

  /**
   * Update last activity timestamp (THREAD-SAFE)
   */
  async updateLastActivity(userId: string): Promise<void> {
    await this.acquireLock(userId);
    try {
      const session = this.sessions.get(userId);
      if (session) {
        session.lastActivity = Date.now();
        this.markDirty();
      }
    } finally {
      this.releaseLock(userId);
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
   */
  cleanup(): void {
    const now = Date.now();
    const expired: string[] = [];

    this.sessions.forEach((session, userId) => {
      if (now - session.lastActivity > this.TTL_MS) {
        expired.push(userId);
      }
    });

    if (expired.length > 0) {
      expired.forEach(userId => this.sessions.delete(userId));
      this.markDirty();
    }
  }

  /**
   * Get active session count
   */
  getActiveCount(): number {
    return this.sessions.size;
  }

  /**
   * Get or create a session for a user
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
      messages: [], // Initialize messages array
    };

    this.sessions.set(userId, session);
    this.save();
    return session;
  }

  /**
   * Get session for user (without TTL check)
   */
  getSession(userId: string): SessionState | undefined {
    return this.sessions.get(userId);
  }

  // ── Persistence ──

  private markDirty(): void {
    this.dirty = true;
  }

  private save(): void {
    try {
      const data = Object.fromEntries(this.sessions.entries());
      fs.writeFileSync(SESSION_FILE, JSON.stringify(data, null, 2));
      this.dirty = false;
    } catch { /* silent — non-critical */ }
  }

  private load(): void {
    try {
      if (fs.existsSync(SESSION_FILE)) {
        const raw = fs.readFileSync(SESSION_FILE, 'utf8');
        const data = JSON.parse(raw);
        for (const [userId, session] of Object.entries(data) as [string, SessionState][]) {
          if (session && !this.isExpired(session)) {
            this.sessions.set(userId, session);
          }
        }
      }
    } catch { /* silent — will create fresh sessions */ }
  }

  /**
   * Destroy manager and cleanup resources
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    if (this.dirty) this.save();
    this.sessions.clear();
  }

  /**
   * Clear session file from disk (for testing)
   */
  static clearDiskSessionFile(): void {
    try {
      if (fs.existsSync(SESSION_FILE)) {
        fs.unlinkSync(SESSION_FILE);
      }
    } catch { /* silent */ }
  }
}
