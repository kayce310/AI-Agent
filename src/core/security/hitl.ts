/**
 * @file Human-In-The-Loop (HITL) Approval System
 * @layer core
 * @owner security
 *
 * Detects destructive actions and requires human approval before execution.
 * Flow: check → classify → queue → notify admin → await decision → proceed/block
 *
 * Integrated with SQLite Persistent Storage (HITLStore) and Atomic CAS updates.
 * Architecture Reference: docs/adr/ADR-000-state-principles.md
 * Design Reference: HITL_ADMIN_AUTHORIZATION_DESIGN_H1.md
 */

import { randomUUID } from 'node:crypto';
import { Logger } from '../logger.js';
import { HITLStore, getHITLStore } from './hitl-store.js';
import type {
  HITLApprovalRequest,
  HITLRequestState,
  HITLActionDescriptor,
  HITLCorrelationContext,
  HITLRiskLevel,
  HITLDecisionChannel,
} from './hitl-types.js';

export * from './hitl-types.js';

const log = new Logger({ module: 'HITL' });

// ── Types (Backward-Compatible) ──

export interface HITLAction {
  type: 'tool_call' | 'command' | 'shutdown' | 'system_operation' | 'file_mutation';
  name: string;
  args?: Record<string, any>;
  /** Human-readable summary shown to the approver */
  description: string;
  riskLevel?: HITLRiskLevel;
}

export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'expired' | 'allowed' | 'cancelled';

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
  correlationToken?: string;
  correlation?: HITLCorrelationContext;
  triggerReason?: string;
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
  cancelled: number;
}

/**
 * Thread-safe approval queue with SQLite persistence and automatic expiry.
 */
export class ApprovalQueue {
  private requests: Map<string, ApprovalRequest> = new Map();
  private timeouts: Map<string, NodeJS.Timeout> = new Map();
  private requestCounter = 0;
  private readonly defaultTTLMs: number;
  private onExpire?: (request: ApprovalRequest) => Promise<void>;
  private store: HITLStore;

  constructor(options?: {
    defaultTTLMs?: number;
    onExpire?: (request: ApprovalRequest) => Promise<void>;
    store?: HITLStore;
  }) {
    this.defaultTTLMs = options?.defaultTTLMs ?? 5 * 60 * 1000; // 5 minutes
    this.onExpire = options?.onExpire;
    this.store = options?.store ?? getHITLStore();
  }

  /**
   * Create a new approval request, persisting to SQLite.
   */
  create(
    userId: string,
    action: HITLAction,
    options?: {
      userDisplay?: string;
      ttlMs?: number;
      correlation?: Partial<HITLCorrelationContext>;
      triggerReason?: string;
      evidenceIds?: string[];
      riskLevel?: HITLRiskLevel;
    }
  ): ApprovalRequest {
    this.requestCounter++;
    const now = Date.now();
    const id = `hitl:${now}:${this.requestCounter}`;
    const ttl = options?.ttlMs ?? this.defaultTTLMs;
    const expiresAt = now + ttl;
    const correlationToken = randomUUID();

    const correlation: HITLCorrelationContext = {
      requestId: id,
      correlationToken,
      sessionId: options?.correlation?.sessionId || 'default',
      taskId: options?.correlation?.taskId || `task-${now}`,
      planId: options?.correlation?.planId,
      checkpointRequestId: options?.correlation?.checkpointRequestId,
      toolCallId: options?.correlation?.toolCallId,
    };

    const request: ApprovalRequest = {
      id,
      userId,
      userDisplay: options?.userDisplay,
      action,
      status: 'pending',
      createdAt: now,
      expiresAt,
      correlationToken,
      correlation,
      triggerReason: options?.triggerReason,
    };

    // 1. Keep in memory for fast synchronous lookup
    this.requests.set(id, request);

    // 2. Persist to SQLite (Single Source of Truth)
    try {
      const persistentRecord: HITLApprovalRequest = {
        id,
        correlation,
        action: {
          type: (action.type as any) || 'tool_call',
          name: action.name,
          args: action.args,
          description: action.description,
          riskLevel: options?.riskLevel || action.riskLevel || 'medium',
        },
        status: 'pending',
        requesterUserId: userId,
        requesterDisplay: options?.userDisplay,
        createdAt: now,
        expiresAt,
        triggerReason: options?.triggerReason || `Action requires human confirmation: ${action.name}`,
        evidenceIds: options?.evidenceIds,
      };
      this.store.save(persistentRecord);
    } catch (err) {
      log.error(`Failed to persist HITL request to SQLite: ${err}`);
    }

    // 3. Auto-expire timer
    const timer = setTimeout(() => {
      this._expire(id);
    }, ttl);
    this.timeouts.set(id, timer);

    log.info(`HITL request created: ${id} for ${action.name} (TTL: ${ttl}ms)`);
    return request;
  }

  /**
   * Approve a pending request using Atomic CAS.
   */
  approve(
    id: string,
    decidedBy: string,
    options?: { approverRole?: 'admin' | 'owner' | 'system'; channel?: HITLDecisionChannel; reason?: string; correlationToken?: string }
  ): boolean {
    const req = this.requests.get(id);
    if (!req || req.status !== 'pending') return false;

    // Validate correlation token:
    // If correlationToken is provided, it must match.
    // If channel is 'telegram', correlationToken is mandatory.
    if (req.correlationToken && options?.correlationToken) {
      if (!req.correlationToken.startsWith(options.correlationToken)) {
        log.warn(`HITL approve rejected: correlationToken mismatch for ${id}`);
        return false;
      }
    } else if (req.correlationToken && options?.channel === 'telegram') {
      log.warn(`HITL approve rejected: correlationToken missing for telegram channel on ${id}`);
      return false;
    }

    // Atomic CAS update in SQLite
    const cas = this.store.updateStatusAtomic(id, 'approved', 'pending', {
      decidedBy,
      approverRole: options?.approverRole || 'admin',
      channel: options?.channel || 'telegram',
      type: 'approve',
      reason: options?.reason,
    });

    if (!cas.success) {
      log.warn(`HITL approve CAS failed for ${id}: already decided or not pending`);
      return false;
    }

    req.status = 'approved';
    req.decidedAt = Date.now();
    req.decidedBy = decidedBy;
    this._clearTimeout(id);

    log.info(`HITL request approved: ${id} by ${decidedBy}`);
    return true;
  }

  /**
   * Reject a pending request using Atomic CAS.
   */
  reject(
    id: string,
    decidedBy: string,
    options?: { approverRole?: 'admin' | 'owner' | 'system'; channel?: HITLDecisionChannel; reason?: string; correlationToken?: string }
  ): boolean {
    const req = this.requests.get(id);
    if (!req || req.status !== 'pending') return false;

    // Validate correlation token:
    // If correlationToken is provided, it must match.
    // If channel is 'telegram', correlationToken is mandatory.
    if (req.correlationToken && options?.correlationToken) {
      if (!req.correlationToken.startsWith(options.correlationToken)) {
        log.warn(`HITL reject rejected: correlationToken mismatch for ${id}`);
        return false;
      }
    } else if (req.correlationToken && options?.channel === 'telegram') {
      log.warn(`HITL reject rejected: correlationToken missing for telegram channel on ${id}`);
      return false;
    }

    // Atomic CAS update in SQLite
    const cas = this.store.updateStatusAtomic(id, 'rejected', 'pending', {
      decidedBy,
      approverRole: options?.approverRole || 'admin',
      channel: options?.channel || 'telegram',
      type: 'reject',
      reason: options?.reason,
    });

    if (!cas.success) {
      log.warn(`HITL reject CAS failed for ${id}: already decided or not pending`);
      return false;
    }

    req.status = 'rejected';
    req.decidedAt = Date.now();
    req.decidedBy = decidedBy;
    this._clearTimeout(id);

    log.info(`HITL request rejected: ${id} by ${decidedBy}`);
    return true;
  }

  /**
   * Cancel a pending request (e.g. on session abort).
   */
  cancel(id: string, reason?: string): boolean {
    const req = this.requests.get(id);
    if (!req || req.status !== 'pending') return false;

    const cas = this.store.updateStatusAtomic(id, 'cancelled', 'pending', {
      decidedBy: 'system_abort',
      approverRole: 'system',
      channel: 'system_policy',
      type: 'reject',
      reason: reason || 'Session cancelled by user',
    });

    if (!cas.success) return false;

    req.status = 'cancelled';
    req.decidedAt = Date.now();
    this._clearTimeout(id);

    log.info(`HITL request cancelled: ${id} (${reason || 'aborted'})`);
    return true;
  }

  /**
   * Get a request by ID. Checks in-memory cache first, falls back to SQLite.
   */
  get(id: string): ApprovalRequest | undefined {
    const cached = this.requests.get(id);
    if (cached) return cached;

    const fromDb = this.store.get(id);
    if (!fromDb) return undefined;

    const converted: ApprovalRequest = {
      id: fromDb.id,
      userId: fromDb.requesterUserId,
      userDisplay: fromDb.requesterDisplay,
      action: {
        type: fromDb.action.type,
        name: fromDb.action.name,
        args: fromDb.action.args,
        description: fromDb.action.description,
        riskLevel: fromDb.action.riskLevel,
      },
      status: fromDb.status,
      createdAt: fromDb.createdAt,
      expiresAt: fromDb.expiresAt,
      decidedAt: fromDb.decision?.decidedAt,
      decidedBy: fromDb.decision?.decidedBy,
      correlationToken: fromDb.correlation.correlationToken,
      correlation: fromDb.correlation,
    };
    this.requests.set(id, converted);
    return converted;
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
    let approved = 0, rejected = 0, expired = 0, cancelled = 0;
    this.requests.forEach(r => {
      if (r.status === 'approved') approved++;
      else if (r.status === 'rejected') rejected++;
      else if (r.status === 'expired') expired++;
      else if (r.status === 'cancelled') cancelled++;
    });
    return {
      pending: this.getPending().length,
      total: this.requests.size,
      approved,
      rejected,
      expired,
      cancelled,
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
    this.store.cleanup(maxAgeMs);
    return removed;
  }

  /**
   * Recover pending requests from SQLite on startup.
   */
  recoverFromStore(): number {
    const pendingFromDb = this.store.getPending();
    const now = Date.now();
    let recoveredCount = 0;

    for (const r of pendingFromDb) {
      if (r.expiresAt <= now) {
        // Already expired while process was down
        this.store.updateStatusAtomic(r.id, 'expired', 'pending');
        continue;
      }

      // Convert to ApprovalRequest
      const req: ApprovalRequest = {
        id: r.id,
        userId: r.requesterUserId,
        userDisplay: r.requesterDisplay,
        action: {
          type: r.action.type,
          name: r.action.name,
          args: r.action.args,
          description: r.action.description,
          riskLevel: r.action.riskLevel,
        },
        status: 'pending',
        createdAt: r.createdAt,
        expiresAt: r.expiresAt,
        correlationToken: r.correlation.correlationToken,
        correlation: r.correlation,
      };

      this.requests.set(r.id, req);

      // Re-arm timer for remaining duration
      const remainingTtl = r.expiresAt - now;
      const timer = setTimeout(() => {
        this._expire(r.id);
      }, remainingTtl);
      this.timeouts.set(r.id, timer);

      recoveredCount++;
    }

    log.info(`HITL recovered ${recoveredCount} pending request(s) from SQLite storage`);
    return recoveredCount;
  }

  // ── Private ──

  private _expire(id: string): void {
    const req = this.requests.get(id);
    if (!req || req.status !== 'pending') return;

    // Atomic CAS update in SQLite
    this.store.updateStatusAtomic(id, 'expired', 'pending');

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
 * 1. Classify action (or accept forceHITL from policy engine)
 * 2. Create approval request and persist to SQLite
 * 3. Notify admin via callback
 * 4. Wait for decision or cancellation via AbortSignal
 */
export class HITLManager {
  private queue: ApprovalQueue;
  private onPendingCallback: PendingApprovalCallback | null = null;
  private pendingResolvers: Map<string, { resolve: (status: ApprovalStatus) => void }> = new Map();

  constructor(options?: { defaultTTLMs?: number; store?: HITLStore }) {
    this.queue = new ApprovalQueue({
      defaultTTLMs: options?.defaultTTLMs,
      store: options?.store,
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
   * Returns immediately if non-destructive unless forceHITL is set.
   * For destructive or policy-mandated actions, returns a promise that resolves on decision.
   */
  async checkAndRequest(
    action: HITLAction,
    options?: {
      userId?: string;
      userDisplay?: string;
      ttlMs?: number;
      signal?: AbortSignal;
      forceHITL?: boolean;
      correlation?: Partial<HITLCorrelationContext>;
      triggerReason?: string;
      evidenceIds?: string[];
      riskLevel?: HITLRiskLevel;
    }
  ): Promise<ApprovalStatus> {
    // If signal is already aborted, return cancelled immediately
    if (options?.signal?.aborted) {
      return 'cancelled';
    }

    // Non-destructive → allowed immediately (unless caller explicitly requested forceHITL)
    if (!options?.forceHITL && !isDestructiveAction(action.name)) {
      return 'allowed';
    }

    // Create approval request (persists to SQLite)
    const userId = options?.userId ?? 'unknown';
    const req = this.queue.create(userId, action, {
      userDisplay: options?.userDisplay,
      ttlMs: options?.ttlMs,
      correlation: options?.correlation,
      triggerReason: options?.triggerReason,
      evidenceIds: options?.evidenceIds,
      riskLevel: options?.riskLevel,
    });

    // Notify admin
    if (this.onPendingCallback) {
      try {
        await this.onPendingCallback(req);
      } catch (e) {
        log.error(`HITL notify callback failed for request ${req.id}: ${e}`);
        if (req.status === 'pending') {
          this.queue.cancel(req.id, `Notification delivery failed: ${e instanceof Error ? e.message : String(e)}`);
          return 'rejected';
        }
      }
    }

    // If already decided (e.g., immediate expire or delivery failure), return status
    if (req.status !== 'pending') {
      return req.status;
    }

    // Wait for decision with AbortSignal support
    return new Promise<ApprovalStatus>((resolve) => {
      let abortHandler: (() => void) | undefined;

      const safeResolve = (status: ApprovalStatus) => {
        if (options?.signal && abortHandler) {
          options.signal.removeEventListener('abort', abortHandler);
        }
        this.pendingResolvers.delete(req.id);
        resolve(status);
      };

      if (options?.signal) {
        abortHandler = () => {
          this.queue.cancel(req.id, 'Execution cancelled via AbortSignal');
          safeResolve('cancelled');
        };
        options.signal.addEventListener('abort', abortHandler, { once: true });
      }

      this.pendingResolvers.set(req.id, { resolve: safeResolve });
    });
  }

  /**
   * Resolve a pending request with the given status.
   */
  resolve(
    id: string,
    status: 'approved' | 'rejected',
    decidedBy: string,
    options?: { approverRole?: 'admin' | 'owner' | 'system'; channel?: HITLDecisionChannel; reason?: string; correlationToken?: string }
  ): boolean {
    const updated = status === 'approved'
      ? this.queue.approve(id, decidedBy, options)
      : this.queue.reject(id, decidedBy, options);

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
   * Cancel a pending request.
   */
  cancel(id: string, reason?: string): boolean {
    const updated = this.queue.cancel(id, reason);
    if (updated) {
      const waiter = this.pendingResolvers.get(id);
      if (waiter) {
        waiter.resolve('cancelled');
        this.pendingResolvers.delete(id);
      }
    }
    return updated;
  }

  /**
   * Recover pending requests from SQLite on startup.
   */
  recoverPending(): number {
    return this.queue.recoverFromStore();
  }

  /**
   * Get stats.
   */
  getStats(): QueueStats {
    return this.queue.getStats();
  }
}

export default HITLManager;
