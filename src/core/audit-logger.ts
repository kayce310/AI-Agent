/**
 * @file Audit Logger — Security Event Logging
 * @layer core
 * @depends-on (none — standalone)
 * @imported-by engine.ts, privilege-guard.ts
 * @owner core-security
 *
 * Writes security-relevant events to a separate audit log file.
 * Events include: rate limit hits, privilege blocks, injection attempts,
 * tool blocks, and suspicious activity.
 *
 * Format: JSON lines (one event per line) for easy parsing.
 */

import * as fs from 'fs/promises';
import * as path from 'path';

export interface AuditEvent {
  timestamp: string;
  level: 'info' | 'warn' | 'critical';
  category: 'rate_limit' | 'privilege_block' | 'tool_block' | 'injection' | 'suspicious' | 'auth';
  userId?: string;
  sessionId?: string;
  tool?: string;
  detail: string;
  ip?: string;
}

const AUDIT_DIR = path.resolve(process.cwd(), 'logs', 'audit');

export class AuditLogger {
  private writeBuffer: AuditEvent[] = [];
  private flushInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    // Flush to disk every 30 seconds
    this.flushInterval = setInterval(() => this.flush(), 30_000);
  }

  /**
   * Log a security event.
   */
  async log(event: Omit<AuditEvent, 'timestamp'>): Promise<void> {
    const fullEvent: AuditEvent = {
      ...event,
      timestamp: new Date().toISOString(),
    };

    this.writeBuffer.push(fullEvent);

    // Immediate flush for critical events
    if (event.level === 'critical') {
      await this.flush();
    }
  }

  /**
   * Flush buffered events to disk.
   */
  private async flush(): Promise<void> {
    if (this.writeBuffer.length === 0) return;

    const events = this.writeBuffer.splice(0);
    const date = new Date().toISOString().split('T')[0];
    const filePath = path.join(AUDIT_DIR, `audit-${date}.jsonl`);

    try {
      await fs.mkdir(AUDIT_DIR, { recursive: true });
      const lines = events.map(e => JSON.stringify(e)).join('\n') + '\n';
      await fs.appendFile(filePath, lines, 'utf-8');
    } catch (err) {
      // Don't crash on audit log failure — just log to stderr
      console.error(`[AuditLogger] Failed to write audit log: ${err}`);
    }
  }

  /**
   * Destroy — flush, cleanup old logs, stop interval.
   */
  async destroy(): Promise<void> {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }
    await this.flush();
    await this.cleanupOldLogs();
  }

  /**
   * Remove audit logs older than RETENTION_DAYS (30 days).
   */
  private async cleanupOldLogs(): Promise<void> {
    try {
      const RETENTION_DAYS = 30;
      const cutoff = Date.now() - RETENTION_DAYS * 86400_000;
      const files = await fs.readdir(AUDIT_DIR);
      let deleted = 0;
      for (const file of files) {
        if (!file.startsWith('audit-') || !file.endsWith('.jsonl')) continue;
        const stat = await fs.stat(path.join(AUDIT_DIR, file));
        if (stat.mtimeMs < cutoff) {
          await fs.unlink(path.join(AUDIT_DIR, file));
          deleted++;
        }
      }
      if (deleted > 0) console.log(`[AuditLogger] Cleaned up ${deleted} old audit files`);
    } catch (err) {
      console.error(`[AuditLogger] Cleanup failed: ${err}`);
    }
  }
}

// Singleton
export const auditLogger = new AuditLogger();
