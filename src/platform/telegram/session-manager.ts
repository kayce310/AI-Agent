import { randomUUID } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { R } from '../../core/runtime-instrumentation.js';
import type { ConversationSessionId } from '../../core/types/branded.js';
import { asConversationSessionId } from '../../core/types/branded.js';

export interface SessionState {
  sessionId: ConversationSessionId;
  userId: string;
  createdAt: number;
  lastActivity: number;
  introSent: boolean;
  messages: any[]; // Store message history for agent context
  title?: string; // Human-readable title (from first message)
  model?: string; // Model used in this session
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
 * SessionManager: TTL-based session cache WITH disk persistence + multi-session history
 *
 * Keeps Coral agent stateless while providing session continuity to users.
 * Sessions expire after 15 minutes of inactivity.
 * Disk persistence survives Coral restart (not related to TTL).
 * State is saved to disk and restored on restart.
 * 
 * Multi-session: supports /new (archive + create), /switch (restore old), /sessions (list all).
 * 
 * SECURITY: Uses mutex locks to prevent race conditions in concurrent access.
 */
export class SessionManager {
  private sessions = new Map<string, SessionState>();
  private sessionHistory = new Map<string, SessionState[]>(); // userId -> archived sessions
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
   */
  private async acquireLock(userId: string): Promise<void> {
    R.sessionLock({ event: 'LOCK_ACQUIRE', userId });
    while (this.locks.has(userId)) {
      await this.locks.get(userId)!.promise;
    }
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
      lock.resolve();
      this.locks.delete(userId);
    }
  }

  /**
   * Get existing session or create new one (THREAD-SAFE)
   */
  async getOrCreateSession(userId: string): Promise<SessionState> {
    await this.acquireLock(userId);
    try {
      const existing = this.sessions.get(userId);
      if (existing && this.isExpired(existing)) {
        this.addToHistory(userId, existing);
        this.sessions.delete(userId);
        return this.createNewSession(userId);
      }
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
      sessionId: asConversationSessionId(randomUUID()),
      userId,
      createdAt: Date.now(),
      lastActivity: Date.now(),
      introSent: false,
      messages: [],
    };
    this.sessions.set(userId, session);
    this.markDirty();
    this.save();
    return session;
  }

  // ──────────────────────────────────────────────
  // Multi-Session Methods
  // ──────────────────────────────────────────────

  /**
   * Archive current active session to history, then create a new one.
   */
  async archiveSession(userId: string): Promise<SessionState> {
    await this.acquireLock(userId);
    try {
      const existing = this.sessions.get(userId);
      if (existing) {
        this.addToHistory(userId, existing);
      }
      return this.createNewSession(userId);
    } finally {
      this.releaseLock(userId);
    }
  }

  /**
   * Switch to a previous session by sessionId.
   */
  async switchSession(userId: string, sessionId: string): Promise<SessionState | null> {
    await this.acquireLock(userId);
    try {
      const history = this.sessionHistory.get(userId) || [];
      const idx = history.findIndex(s => s.sessionId === sessionId || s.sessionId.startsWith(sessionId));
      if (idx === -1) return null;

      const target = history.splice(idx, 1)[0];

      const current = this.sessions.get(userId);
      if (current) {
        this.addToHistory(userId, current);
      }

      target.lastActivity = Date.now();
      this.sessions.set(userId, target);
      this.markDirty();
      this.save();
      return target;
    } finally {
      this.releaseLock(userId);
    }
  }

  /**
   * List all sessions for a user (active + archived).
   */
  listSessions(userId: string): { active: SessionState | null; history: SessionState[] } {
    const active = this.sessions.get(userId) || null;
    const history = (this.sessionHistory.get(userId) || [])
      .sort((a, b) => b.lastActivity - a.lastActivity);
    return { active, history };
  }

  /**
   * Add session to history (internal)
   */
  private addToHistory(userId: string, session: SessionState): void {
    if (!this.sessionHistory.has(userId)) {
      this.sessionHistory.set(userId, []);
    }
    const history = this.sessionHistory.get(userId)!;
    const existing = history.findIndex(s => s.sessionId === session.sessionId);
    if (existing >= 0) {
      history[existing] = session;
    } else {
      history.push(session);
    }
    while (history.length > 50) {
      history.shift();
    }
  }

  /**
   * Set title for a session (from first message)
   */
  async setSessionTitle(userId: string, title: string): Promise<void> {
    await this.acquireLock(userId);
    try {
      const session = this.sessions.get(userId);
      if (session && !session.title) {
        session.title = title.slice(0, 100);
        this.markDirty();
      }
    } finally {
      this.releaseLock(userId);
    }
  }

  /**
   * Set model for a session
   */
  async setSessionModel(userId: string, model: string): Promise<void> {
    await this.acquireLock(userId);
    try {
      const session = this.sessions.get(userId);
      if (session) {
        session.model = model;
        this.markDirty();
      }
    } finally {
      this.releaseLock(userId);
    }
  }

  /**
   * Get a specific session by ID from history (without switching)
   */
  getSessionFromHistory(userId: string, sessionId: string): SessionState | null {
    const history = this.sessionHistory.get(userId) || [];
    return history.find(s => s.sessionId === sessionId || s.sessionId.startsWith(sessionId)) || null;
  }

  // ──────────────────────────────────────────────
  // Existing Methods
  // ──────────────────────────────────────────────

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
      expired.forEach(userId => {
        const session = this.sessions.get(userId);
        if (session) {
          this.addToHistory(userId, session);
        }
        this.sessions.delete(userId);
      });
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
      sessionId: asConversationSessionId(`session-${userId}-${Date.now()}`),
      userId,
      lastActivity: Date.now(),
      introSent: false,
      createdAt: Date.now(),
      messages: [],
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
      const data = {
        active: Object.fromEntries(this.sessions.entries()),
        history: Object.fromEntries(this.sessionHistory.entries()),
      };
      fs.writeFileSync(SESSION_FILE, JSON.stringify(data, null, 2));
      this.dirty = false;
    } catch { /* silent — non-critical */ }
  }

  private load(): void {
    try {
      if (fs.existsSync(SESSION_FILE)) {
        const raw = fs.readFileSync(SESSION_FILE, 'utf8');
        const data = JSON.parse(raw);

        // Handle both old format (flat map) and new format ({active, history})
        if (data.active && typeof data.active === 'object') {
          for (const [userId, session] of Object.entries(data.active) as [string, SessionState][]) {
            if (session && !this.isExpired(session)) {
              this.sessions.set(userId, session);
            }
          }
          if (data.history) {
            for (const [userId, sessions] of Object.entries(data.history) as [string, SessionState[]][]) {
              if (Array.isArray(sessions)) {
                this.sessionHistory.set(userId, sessions);
              }
            }
          }
        } else {
          // Old format: flat map of userId -> SessionState
          for (const [userId, session] of Object.entries(data) as [string, SessionState][]) {
            if (session && !this.isExpired(session)) {
              this.sessions.set(userId, session);
            }
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
    this.sessionHistory.clear();
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
