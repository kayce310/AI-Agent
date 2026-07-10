import { Logger } from '../logger.js';
import { Entity, Relationship } from './entity-extractor.js';
import { EntityStore } from './entity-store.js';

const log = new Logger({ module: 'EntityApprovalQueue' });

export interface EntityApproval {
  entityId: string;
  entity: Entity;
  relationships: Relationship[];
  status: 'pending' | 'approved' | 'rejected';
  priority: 'normal' | 'high' | 'critical';
  submittedAt: number;
  submittedBy: string;
  reviewer?: string;
  decisionAt?: number;
  decision?: 'approve' | 'reject';
  auditTrail: DecisionRecord[];
  expirationTime?: number;
}

export interface DecisionRecord {
  actor: string;
  decision: 'approve' | 'reject';
  timestamp: number;
  note?: string;
}

export interface ApprovalConfig {
  defaultExpirationMs: number;
  maxQueueSize: number;
}

export class EntityApprovalQueue {
  private approvals = new Map<string, EntityApproval>();
  private reviewers = new Set<string>();
  private config: ApprovalConfig;

  constructor(
    private store: EntityStore,
    config?: Partial<ApprovalConfig>
  ) {
    this.config = {
      defaultExpirationMs: 24 * 60 * 60 * 1000,
      maxQueueSize: 1000,
      ...config
    };
    log.info('EntityApprovalQueue initialized');
  }

  setReviewers(ids: string[]): void {
    this.reviewers.clear();
    for (const id of ids) {
      this.reviewers.add(id);
    }
    log.info(`Reviewers set: ${Array.from(this.reviewers).join(', ')}`);
  }

  async submitForApproval(
    entities: Entity[],
    relationships: Relationship[],
    userId: string,
    priority: 'normal' | 'high' | 'critical' = 'normal'
  ): Promise<string[]> {
    if (this.approvals.size >= this.config.maxQueueSize!) {
      throw new Error('Approval queue at maximum capacity');
    }

    const approvedIds: string[] = [];

    for (const entity of entities) {
      const entityId = this.generateEntityId(entity.type, entity.text);
      const existing = this.approvals.get(entityId);

      if (existing && existing.status !== 'rejected') {
        existing.entity = entity;
        existing.relationships = relationships;
        existing.status = 'pending';
        existing.decisionAt = undefined;
        existing.decision = undefined;
        existing.reviewer = undefined;
        existing.auditTrail = [];
        existing.expirationTime = this.calculateExpiration(priority);
        approvedIds.push(entityId);
        continue;
      }

      const approval: EntityApproval = {
        entityId,
        entity,
        relationships,
        status: 'pending',
        priority,
        submittedAt: Date.now(),
        submittedBy: userId,
        auditTrail: [],
        expirationTime: this.calculateExpiration(priority),
      };

      this.approvals.set(entityId, approval);
      approvedIds.push(entityId);
      log.info(`Entity submitted for approval: ${entityId} (${entity.text})`);
    }

    return approvedIds;
  }

  getPending(): EntityApproval[] {
    const now = Date.now();
    const pending: EntityApproval[] = [];

    for (const approval of this.approvals.values()) {
      if (approval.status === 'pending') {
        if (approval.expirationTime && now > approval.expirationTime) {
          approval.status = 'rejected';
          continue;
        }
        pending.push(approval);
      }
    }

    return pending;
  }

  async makeDecision(
    entityId: string,
    decision: 'approve' | 'reject',
    reviewerId: string,
    note?: string
  ): Promise<void> {
    const approval = this.approvals.get(entityId);
    if (!approval) {
      throw new Error(`Entity not found: ${entityId}`);
    }

    if (approval.status !== 'pending') {
      throw new Error(`Entity already processed: ${entityId}`);
    }

    if (!approval.reviewer || approval.reviewer !== reviewerId) {
      throw new Error(`Unauthorized reviewer: ${reviewerId}`);
    }

    approval.decision = decision;
    approval.decisionAt = Date.now();
    approval.auditTrail.push({
      actor: reviewerId,
      decision,
      timestamp: Date.now(),
      note
    });

    if (decision === 'approve') {
      approval.status = 'approved';
      try {
        await this.processApproval(approval);
        log.info(`Entity approved: ${entityId}`);
      } catch (error) {
        approval.status = 'rejected';
        log.error(`Approval processing failed: ${error}`);
      }
    } else {
      approval.status = 'rejected';
      log.warn(`Entity rejected: ${entityId} - ${note || 'No reason'}`);
    }
  }

  getStatus(entityId: string): EntityApproval | undefined {
    return this.approvals.get(entityId);
  }

  getStats() {
    const pending = Array.from(this.approvals.values()).filter(a => a.status === 'pending').length;
    const approved = Array.from(this.approvals.values()).filter(a => a.status === 'approved').length;
    const rejected = Array.from(this.approvals.values()).filter(a => a.status === 'rejected').length;

    return { pending, approved, rejected, total: this.approvals.size };
  }

  private calculateExpiration(priority: 'normal' | 'high' | 'critical'): number {
    const base = this.config.defaultExpirationMs!;
    return Date.now() + base;
  }

  private generateEntityId(type: string, text: string): string {
    const normalized = text.toLowerCase().trim();
    return `${type}:${normalized}`;
  }

  private async processApproval(approval: EntityApproval): Promise<void> {
    await this.store.addEntity(approval.entity, approval.submittedBy);
    if (approval.relationships.length > 0) {
      await this.store.addRelationships(approval.relationships);
    }
  }
}

let approvalQueueInstance: EntityApprovalQueue | null = null;

export async function getApprovalQueue(
  store?: EntityStore
): Promise<EntityApprovalQueue> {
  if (!approvalQueueInstance) {
    const entityStore = store || new EntityStore();
    approvalQueueInstance = new EntityApprovalQueue(entityStore);
  }
  return approvalQueueInstance;
}
