/**
 * @file Human-In-The-Loop (HITL) Approval System
 * @layer core
 * @owner security
 *
 * Detects destructive actions and requires human approval before execution.
 * Flow: check → classify → queue → notify admin → await decision → proceed/block
 */

import { Logger } from '../logger.js';
const log = new Logger({ module: 'HITL' });

// ── Types ──

export interface HITLAction {
  type: 'tool_call' | 'command' | 'shutdown';
  name: string;
  args?: Record<string, any>;
  /** Human-readable summary shown to the approver */
  description: string;
}

export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'expired' | 'allowed';

export interface ApprovalRequest {
  id: string;
  userId: string;
  userDisplay?: string;
  action: HITLAction;
  status: ApprovalStatus;
  createdAt: number;
  expiresAt: number;
  decidedAt?: number;
  decidedBy?: string;
}

export type PendingApprovalCallback = (request: ApprovalRequest) => Promise<void>;

// ── Destructive Action Classifier ──

/**
 * Patterns that identify potentially destructive actions.
 * Matched case-insensitively against tool/command names.
 */
const DESTRUCTIVE_PATTERNS = [
  'delete', 'remove', 'kill', 'shutdown', 'drop', 'truncate',
  'destroy', 'stop', 'reboot', 'poweroff', 'format', 'rm ',
  'wipe', 'purge', 'erase',
];

/**
 * Check if a tool name or command matches destructive patterns.
 */
export function isDestructiveAction(name: string): boolean {
  const lower = name.toLowerCase();
  return DESTRUCTIVE_PATTERNS.some(p => lower.includes(p));
}

// ── Approval Queue ──

export interface QueueStats {
  pending: number;
  total: number;
  approved: number;
  rejected: number;
  expired: number;
}

/**
 * Thread-safe approval queue with automatic expiry.
 */
export class ApprovalQueue {
  private requests: Map<string, ApprovalRequest> = new Map();
  private timeouts: Map<string, NodeJS.Timeout> = new Map();
  private requestCounter = 0;
  private readonly defaultTTLMs: number;
  private onExpire?: (request: ApprovalRequest) => Promise<void>;

  constructor(options?: { defaultTTLMs?: number; onExpire?: (request: ApprovalRequest) => Promise<void> }) {
    this.defaultTTLMs = options?.defaultTTLMs ?? 5 * 60 * 1000; // 5 minutes
    this.onExpire = options?.onExpire;
  }

  /**
   * Create a new approval request.
   */
  create(userId: string, action: HITLAction, options?: { userDisplay?: string; ttlMs?: number }): ApprovalRequest {
    this.requestCounter++;
    const id = `hitl:${Date.now()}:${this.requestCounter}`;
    const now = Date.now();
    const ttl = options?.ttlMs ?? this.defaultTTLMs;

    const request: ApprovalRequest = {
      id,
      userId,
      userDisplay: options?.userDisplay,
      action,
      status: 'pending',
      createdAt: now,
      expiresAt: now + ttl,
    };

    this.requests.set(id, request);

    // Auto-expire
    const timer = setTimeout(() => {
      this._expire(id);
    }, ttl);
    this.timeouts.set(id, timer);

    log.info(`HITL request created: ${id} for ${action.name}`);
    return request;
  }

  /**
   * Approve a pending request.
   */
  approve(id: string, decidedBy: string): boolean {
    const req = this.requests.get(id);
    if (!req || req.status !== 'pending') return false;

    req.status = 'approved';
    req.decidedAt = Date.now();
    req.decidedBy = decidedBy;
    this._clearTimeout(id);

    log.info(`HITL request approved: ${id} by ${decidedBy}`);
    return true;
  }

  /**
   * Reject a pending request.
   */
  reject(id: string, decidedBy: string): boolean {
    const req = this.requests.get(id);
    if (!req || req.status !== 'pending') return false;

    req.status = 'rejected';
    req.decidedAt = Date.now();
    req.decidedBy = decidedBy;
    this._clearTimeout(id);

    log.info(`HITL request rejected: ${id} by ${decidedBy}`);
    return true;
  }

  /**
   * Get a request by ID.
   */
  get(id: string): ApprovalRequest | undefined {
    return this.requests.get(id);
  }

  /**
   * Get all pending requests.
   */
  getPending(): ApprovalRequest[] {
    return Array.from(this.requests.values()).filter(r => r.status === 'pending');
  }

  /**
   * Get queue statistics.
   */
  getStats(): QueueStats {
    let approved = 0, rejected = 0, expired = 0;
    this.requests.forEach(r => {
      if (r.status === 'approved') approved++;
      else if (r.status === 'rejected') rejected++;
      else if (r.status === 'expired') expired++;
    });
    return {
      pending: this.getPending().length,
      total: this.requests.size,
      approved,
      rejected,
      expired,
    };
  }

  /**
   * Remove expired/stale requests older than the given TTL.
   */
  cleanup(maxAgeMs?: number): number {
    const cutoff = Date.now() - (maxAgeMs ?? 30 * 60 * 1000); // default 30 min
    let removed = 0;
    Array.from(this.requests.entries()).forEach(([id, req]) => {
      if (req.decidedAt && req.decidedAt < cutoff) {
        this._clearTimeout(id);
        this.requests.delete(id);
        removed++;
      }
    });
    return removed;
  }

  // ── Private ──

  private _expire(id: string): void {
    const req = this.requests.get(id);
    if (!req || req.status !== 'pending') return;

    req.status = 'expired';
    req.decidedAt = Date.now();
    this.timeouts.delete(id);

    log.info(`HITL request expired: ${id} (${req.action.name})`);

    // Notify expiration callback
    if (this.onExpire) {
      this.onExpire(req).catch(e => log.error(`HITL expire callback failed: ${e}`));
    }
  }

  private _clearTimeout(id: string): void {
    const timer = this.timeouts.get(id);
    if (timer) {
      clearTimeout(timer);
      this.timeouts.delete(id);
    }
  }
}

// ── HITL Manager ──

/**
 * Orchestrates HITL flow:
 * 1. Classify action
 * 2. Create approval request if destructive
 * 3. Notify admin via callback
 * 4. Wait for decision (or return immediately for non-destructive)
 */
export class HITLManager {
  private queue: ApprovalQueue;
  private onPendingCallback: PendingApprovalCallback | null = null;
  private pendingResolvers: Map<string, { resolve: (status: ApprovalStatus) => void }> = new Map();

  constructor(options?: { defaultTTLMs?: number }) {
    this.queue = new ApprovalQueue({
      defaultTTLMs: options?.defaultTTLMs,
      onExpire: async (req) => {
        // Resolve any waiter with 'expired'
        const waiter = this.pendingResolvers.get(req.id);
        if (waiter) {
          waiter.resolve('expired');
          this.pendingResolvers.delete(req.id);
        }
      },
    });
  }

  /**
   * Set callback for notifying admin about pending approval.
   */
  set onPending(callback: PendingApprovalCallback | null) {
    this.onPendingCallback = callback;
  }

  /**
   * Get the underlying approval queue.
   */
  getQueue(): ApprovalQueue {
    return this.queue;
  }

  /**
   * Check an action and create approval request if needed.
   * Returns immediately if non-destructive.
   * For destructive actions, returns a promise that resolves on approve/reject/expire.
   */
  async checkAndRequest(
    action: HITLAction,
    options?: { userId?: string; userDisplay?: string }
  ): Promise<ApprovalStatus> {
    // Non-destructive → allowed immediately
    if (!isDestructiveAction(action.name)) {
      return 'allowed';
    }

    // Create approval request
    const userId = options?.userId ?? 'unknown';
    const req = this.queue.create(userId, action, { userDisplay: options?.userDisplay });

    // Notify admin
    if (this.onPendingCallback) {
      await this.onPendingCallback(req).catch(e => log.error(`HITL notify callback failed: ${e}`));
    }

    // If already decided (e.g., immediate expire), return status
    if (req.status !== 'pending') {
      return req.status;
    }

    // Wait for decision
    return new Promise<ApprovalStatus>((resolve) => {
      this.pendingResolvers.set(req.id, { resolve });
    });
  }

  /**
   * Resolve a pending request with the given status.
   */
  resolve(id: string, status: 'approved' | 'rejected', decidedBy: string): boolean {
    const updated = status === 'approved'
      ? this.queue.approve(id, decidedBy)
      : this.queue.reject(id, decidedBy);

    if (updated) {
      const waiter = this.pendingResolvers.get(id);
      if (waiter) {
        waiter.resolve(status);
        this.pendingResolvers.delete(id);
      }
    }

    return updated;
  }

  /**
   * Get stats.
   */
  getStats(): QueueStats {
    return this.queue.getStats();
  }
}

export default HITLManager;
