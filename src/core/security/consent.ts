/**
 * @file consent — User Consent Management
 * @layer core
 * @depends-on security/sqlite-storage
 * @owner core-security
 *
 * GDPR-style consent flow:
 *   - Records user consent for data processing
 *   - Stored in SQLite (persistent across restarts)
 *   - Consent can be revoked at any time
 *   - Required before agent processes personal data
 */

import { Logger } from '../logger.js';

const log = new Logger({ module: 'Consent' });

// ── Types ──

export type ConsentStatus = 'granted' | 'revoked' | 'pending';

export interface ConsentRecord {
  id?: number;
  userId: string;
  sessionId: string;
  status: ConsentStatus;
  purposes: string[];       // What they consented to
  grantedAt?: number;
  revokedAt?: number;
  expiresAt?: number;        // Optional expiry
  ipAddress?: string;
  userAgent?: string;
}

export interface ConsentCheck {
  hasConsent: boolean;
  isExpired: boolean;
  record: ConsentRecord | null;
  needsRenewal: boolean;
}

// ── Consent Manager ──

export class ConsentManager {
  private db: any; // CoralStorage or raw SQLite
  private initialized = false;

  constructor(db?: any) {
    this.db = db;
  }

  /**
   * Initialize with SQLite database
   */
  async initialize(dbPath?: string): Promise<void> {
    if (this.initialized) return;

    if (!this.db) {
      // Dynamic import to avoid hard dependency
      try {
        const { CoralStorage } = await import('../memory/sqlite-storage.js');
        this.db = new CoralStorage(dbPath);
      } catch {
        // Fallback: use a simple in-memory store
        this.db = new Map();
        log.warn('SQLite unavailable, using in-memory consent storage');
      }
    }

    // Ensure consent table exists
    if (this.db.exec) {
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS consent_records (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          userId TEXT NOT NULL,
          sessionId TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'pending',
          purposes TEXT NOT NULL DEFAULT '[]',
          grantedAt INTEGER,
          revokedAt INTEGER,
          expiresAt INTEGER,
          ipAddress TEXT,
          userAgent TEXT,
          UNIQUE(userId, sessionId)
        );
        CREATE INDEX IF NOT EXISTS idx_consent_user ON consent_records(userId);
        CREATE INDEX IF NOT EXISTS idx_consent_status ON consent_records(status);
      `);
    }

    this.initialized = true;
    log.info('ConsentManager initialized');
  }

  /**
   * Request consent from user
   */
  async requestConsent(
    userId: string,
    sessionId: string,
    purposes: string[] = ['data_processing', 'memory_storage']
  ): Promise<ConsentRecord> {
    // Check if existing valid consent exists
    const existing = await this.getConsent(userId);
    if (existing.hasConsent && !existing.isExpired) {
      return existing.record!;
    }

    const record: ConsentRecord = {
      userId,
      sessionId,
      status: 'pending',
      purposes,
      grantedAt: undefined,
    };

    if (this.db.exec) {
      const stmt = this.db.prepare(`
        INSERT OR REPLACE (userId, sessionId, status, purposes)
        VALUES (?, ?, 'pending', ?)
      `);
      if (stmt.run) {
        stmt.run(userId, sessionId, JSON.stringify(purposes));
      }
    }

    log.info(`Consent requested for user ${userId} (session ${sessionId})`);
    return record;
  }

  /**
   * Grant consent (user agrees)
   */
  async grantConsent(userId: string, sessionId: string): Promise<void> {
    const now = Date.now();

    if (this.db.exec) {
      const stmt = this.db.prepare(`
        UPDATE consent_records
        SET status = 'granted', grantedAt = ?
        WHERE userId = ? AND sessionId = ?
      `);
      if (stmt.run) stmt.run(now, userId, sessionId);
    } else if (this.db.set) {
      // In-memory fallback
      this.db.set(userId, { userId, sessionId, status: 'granted', grantedAt: now });
    }

    log.info(`Consent granted by user ${userId}`);
  }

  /**
   * Revoke consent
   */
  async revokeConsent(userId: string, sessionId: string): Promise<void> {
    const now = Date.now();

    if (this.db.exec) {
      const stmt = this.db.prepare(`
        UPDATE consent_records
        SET status = 'revoked', revokedAt = ?
        WHERE userId = ? AND sessionId = ?
      `);
      if (stmt.run) stmt.run(now, userId, sessionId);
    } else if (this.db.set) {
      this.db.set(userId, { userId, sessionId, status: 'revoked', revokedAt: now });
    }

    log.info(`Consent revoked by user ${userId}`);
  }

  /**
   * Check consent status
   */
  async getConsent(userId: string, sessionId?: string): Promise<ConsentCheck> {
    if (this.db.all) {
      const query = sessionId
        ? `SELECT * FROM consent_records WHERE userId = ? AND sessionId = ? ORDER BY id DESC LIMIT 1`
        : `SELECT * FROM consent_records WHERE userId = ? ORDER BY id DESC LIMIT 1`;
      const params = sessionId ? [userId, sessionId] : [userId];
      const stmt = this.db.prepare(query);
      const row = stmt.get ? stmt.get(...params) : null;

      if (!row) {
        return { hasConsent: false, isExpired: false, record: null, needsRenewal: true };
      }

      const record: ConsentRecord = {
        ...row,
        purposes: JSON.parse(row.purposes || '[]'),
      };

      const isExpired = row.expiresAt && row.expiresAt < Date.now();
      return {
        hasConsent: row.status === 'granted' && !isExpired,
        isExpired,
        record,
        needsRenewal: isExpired || row.status === 'revoked',
      };
    }

    // In-memory fallback
    const record = this.db.get?.(userId) || null;
    return {
      hasConsent: record?.status === 'granted',
      isExpired: false,
      record,
      needsRenewal: !record || record.status !== 'granted',
    };
  }

  /**
   * Check if user can proceed (has valid consent)
   */
  async canProceed(userId: string, sessionId?: string): Promise<boolean> {
    const check = await this.getConsent(userId, sessionId);
    return check.hasConsent && !check.isExpired;
  }

  /**
   * Get all consent records for a user
   */
  getAllRecords(userId: string): ConsentRecord[] {
    if (!this.db.all) return [];
    const stmt = this.db.prepare('SELECT * FROM consent_records WHERE userId = ? ORDER BY id DESC');
    const rows = stmt.all ? stmt.all(userId) : [];
    return rows.map((r: any) => ({ ...r, purposes: JSON.parse(r.purposes || '[]') }));
  }
}

// ── Singleton ──

let consentManagerInstance: ConsentManager | null = null;

export function getConsentManager(db?: any): ConsentManager {
  if (!consentManagerInstance) {
    consentManagerInstance = new ConsentManager(db);
  }
  return consentManagerInstance;
}

export default ConsentManager;
