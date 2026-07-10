/**
 * @file hitl-manager — Human-in-the-Loop Orchestrator
 * @layer core
 * @depends-on risk-scorer, entity-approval-queue
 * @owner core-observability
 *
 * Central HITL orchestrator that:
 *   1. Evaluates tool call risk via RiskScorer (B1)
 *   2. Auto-approves low-risk actions
 *   3. Escalates high/critical-risk actions to approval queue
 *   4. Requires second approver for critical-risk actions
 *
 * Dependency: B1 (RiskScorer) must be complete before this.
 */

import { Logger } from '../logger.js';
import { RiskScorer, getRiskScorer, RiskEvaluation } from '../observability/risk-scorer.js';
import { EntityApprovalQueue, getApprovalQueue, EntityApproval } from './entity-approval-queue.js';
import { EntityStore } from './entity-store.js';
import { Entity } from './entity-extractor.js';

const log = new Logger({ module: 'HITLManager' });

// ── Types ──

export type HitlDecision = 'auto_approved' | 'escalated' | 'rejected' | 'pending_approval';

export interface HitlDecisionRecord {
  toolName: string;
  args?: Record<string, any>;
  risk: RiskEvaluation;
  decision: HitlDecision;
  approvedBy?: string;
  rejectedReason?: string;
  escalatedAt?: number;
  resolvedAt?: number;
}

export interface HITLManagerConfig {
  riskScorer?: RiskScorer;
  approvalQueue?: EntityApprovalQueue;
  /** Auto-reject if risk is above this (even if queue unavailable) */
  hardRejectThreshold?: number;
  /** Maximum pending approvals before rejecting new ones */
  maxPendingApprovals?: number;
  /** Escalation timeout ms (return to caller after this) */
  escalationTimeoutMs?: number;
}

// ── HITL Manager Class ──

export class HITLManager {
  private riskScorer: RiskScorer;
  private approvalQueue: EntityApprovalQueue | null = null;
  private pendingToolCalls = new Map<string, HitlDecisionRecord>();
  private decisionHistory: HitlDecisionRecord[] = [];
  private hardRejectThreshold: number;
  private maxPendingApprovals: number;
  private escalationTimeoutMs: number;

  constructor(config: HITLManagerConfig = {}) {
    this.riskScorer = config.riskScorer || getRiskScorer();
    this.approvalQueue = config.approvalQueue || null;
    this.hardRejectThreshold = config.hardRejectThreshold ?? 0.95;
    this.maxPendingApprovals = config.maxPendingApprovals ?? 50;
    this.escalationTimeoutMs = config.escalationTimeoutMs ?? 300_000; // 5 min
  }

  /**
   * Initialize with approval queue (async dependency injection)
   */
  async initialize(store?: EntityStore): Promise<void> {
    this.approvalQueue = await getApprovalQueue(store);
    log.info('HITLManager initialized with approval queue');
  }

  /**
   * Process a tool call decision.
   * Returns: HitlDecisionRecord with the outcome.
   */
  async processToolCall(
    toolName: string,
    toolArgs?: Record<string, any>,
    sessionId?: string
  ): Promise<HitlDecisionRecord> {
    // 1. Evaluate risk
    const risk = this.riskScorer.evaluate(toolName, toolArgs);

    // 2. Auto-approve low risk
    if (!risk.requiresApproval) {
      const record: HitlDecisionRecord = {
        toolName,
        args: toolArgs,
        risk,
        decision: 'auto_approved',
        resolvedAt: Date.now(),
      };
      this.decisionHistory.push(record);
      log.debug(`Auto-approved: ${toolName} (risk: ${risk.level})`);
      return record;
    }

    // 3. Hard reject if above threshold
    if (risk.score >= this.hardRejectThreshold) {
      const record: HitlDecisionRecord = {
        toolName,
        args: toolArgs,
        risk,
        decision: 'rejected',
        rejectedReason: `Risk score ${risk.score.toFixed(2)} exceeds hard limit ${this.hardRejectThreshold}`,
        resolvedAt: Date.now(),
      };
      this.decisionHistory.push(record);
      log.warn(`Hard-rejected: ${toolName} (${risk.reasons.join('; ')})`);
      return record;
    }

    // 4. Check capacity
    if (this.pendingToolCalls.size >= this.maxPendingApprovals) {
      const record: HitlDecisionRecord = {
        toolName,
        args: toolArgs,
        risk,
        decision: 'rejected',
        rejectedReason: 'Max pending approvals reached, try again later',
        resolvedAt: Date.now(),
      };
      this.decisionHistory.push(record);
      return record;
    }

    // 5. Escalate to approval queue
    const record: HitlDecisionRecord = {
      toolName,
      args: toolArgs,
      risk,
      decision: 'escalated',
      escalatedAt: Date.now(),
    };
    this.pendingToolCalls.set(`${Date.now()}:${toolName}`, record);

    // Create entity-like approval entry for queue
    if (this.approvalQueue) {
      const entityText = this.serializeToolCall(toolName, toolArgs);
      const entity: Entity = {
        id: `tool_call:${toolName}:${Date.now()}`,
        type: 'ACTION',
        text: entityText,
        confidence: risk.score,
        context: `Tool call: ${toolName} escalated for HITL approval`,
      };
      await this.approvalQueue.submitForApproval(
        [entity],
        [],
        sessionId || 'system'
      );
    }

    log.info(`Escalated: ${toolName} (risk: ${risk.level}, reasons: ${risk.reasons.join('; ')})`);
    return record;
  }

  /**
   * Approve a pending tool call (called by human reviewer)
   */
  async approveToolCall(recordId: string, reviewerId: string): Promise<void> {
    const record = this.pendingToolCalls.get(recordId);
    if (!record) throw new Error(`Record not found: ${recordId}`);

    record.decision = record.risk.requiresSecondApprover ? 'pending_approval' : 'auto_approved';
    record.approvedBy = reviewerId;

    if (record.decision === 'auto_approved') {
      record.resolvedAt = Date.now();
      this.pendingToolCalls.delete(recordId);
    }

    log.info(`Tool call approved by ${reviewerId}: ${record.toolName}`);
  }

  /**
   * Reject a pending tool call
   */
  async rejectToolCall(recordId: string, reviewerId: string, reason?: string): Promise<void> {
    const record = this.pendingToolCalls.get(recordId);
    if (!record) throw new Error(`Record not found: ${recordId}`);

    record.decision = 'rejected';
    record.rejectedReason = reason || 'Rejected by human reviewer';
    record.resolvedAt = Date.now();
    this.pendingToolCalls.delete(recordId);

    log.info(`Tool call rejected by ${reviewerId}: ${record.toolName} — ${reason}`);
  }

  /**
   * Get all pending approvals for human review
   */
  getPendingToolCalls(): HitlDecisionRecord[] {
    return Array.from(this.pendingToolCalls.values());
  }

  /**
   * Get decision history
   */
  getDecisionHistory(limit = 100): HitlDecisionRecord[] {
    return this.decisionHistory.slice(-limit);
  }

  /**
   * Get statistics
   */
  getStats() {
    const history = this.decisionHistory;
    return {
      total: history.length,
      autoApproved: history.filter(h => h.decision === 'auto_approved').length,
      escalated: history.filter(h => h.decision === 'escalated').length,
      rejected: history.filter(h => h.decision === 'rejected').length,
      pending: this.pendingToolCalls.size,
    };
  }

  /**
   * Cleanup stale pending entries
   */
  cleanupStale(): number {
    let cleaned = 0;
    const cutoff = Date.now() - this.escalationTimeoutMs;
    for (const [id, record] of Array.from(this.pendingToolCalls.entries())) {
      if (record.escalatedAt && record.escalatedAt < cutoff) {
        this.pendingToolCalls.delete(id);
        record.decision = 'rejected';
        record.rejectedReason = 'Escalation timeout';
        record.resolvedAt = Date.now();
        this.decisionHistory.push(record);
        cleaned++;
      }
    }
    if (cleaned > 0) log.info(`Cleaned ${cleaned} stale HITL entries`);
    return cleaned;
  }

  // ── Private ──

  private serializeToolCall(toolName: string, args?: Record<string, any>): string {
    const argsStr = args ? JSON.stringify(args) : '';
    // Truncate long args to prevent queue bloat
    const truncated = argsStr.length > 500 ? argsStr.slice(0, 500) + '...[truncated]' : argsStr;
    return `${toolName} ${truncated}`.trim();
  }
}

// ── Singleton ──

let hitlManagerInstance: HITLManager | null = null;

export function getHITLManager(config?: HITLManagerConfig): HITLManager {
  if (!hitlManagerInstance) {
    hitlManagerInstance = new HITLManager(config);
  }
  return hitlManagerInstance;
}

export default HITLManager;
