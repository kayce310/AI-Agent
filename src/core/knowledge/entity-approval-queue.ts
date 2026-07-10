// Simple HITL Entity Approval Queue

import { Logger } from '../logger.js';
import { Entity, Relationship } from './entity-extractor.js';
import { EntityStore } from './entity-store.js';

const log = new Logger({ module: 'EntityApproval' });

export interface EntityApproval {
  entityId: string;
  entity: Entity;
  relationships: Relationship[];
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: number;
  submittedBy: string;
  reviewer?: string;
  decisionAt?: number;
  decision?: 'approve' | 'reject';
  auditTrail: DecisionRecord[];
}

export interface DecisionRecord {
  actor: string;
  decision: 'approve' | 'reject';
  timestamp: number;
  note?: string;
}

export class EntityApprovalQueue {
  private approvals = new Map<string, EntityApproval>();
  private reviewers = new Set<string>();

  constructor(private store: EntityStore) {
    log.info('EntityApprovalQueue initialized');
  }

  setReviewers(ids: string[]) {
    this.reviewers.clear();
    ids.forEach(id => this.reviewers.add(id));
  }

  async submitForApproval(
    entities: Entity[],
    relationships: Relationship[],
    userId: string
  ): Promise<string[]> {
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
        approvedIds.push(entityId);
        continue;
      }

      const approval: EntityApproval = {
        entityId,
        entity,
        relationships,
        status: 'pending',
        submittedAt: Date.now(),
        submittedBy: userId,
        auditTrail: []
      };

      this.approvals.set(entityId, approval);
      approvedIds.push(entityId);
    }

    return approvedIds;
  }

  getPending(): EntityApproval[] {
    return Array.from(this.approvals.values()).filter(a => a.status === 'pending');
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
    approval.reviewer = reviewerId;
    approval.auditTrail.push({
      actor: reviewerId,
      decision,
      timestamp: Date.now(),
      note
    });

    if (decision === 'approve') {
      approval.status = 'approved';
      try {
        await this.store.addEntity(approval.entity, approval.submittedBy);
        if (approval.relationships.length > 0) {
          await this.store.addRelationships(approval.relationships);
        }
      } catch (error) {
        approval.status = 'rejected';
      }
    } else {
      approval.status = 'rejected';
    }
  }

  getStatus(entityId: string): EntityApproval | undefined {
    return this.approvals.get(entityId);
  }

  generateEntityId(type: string, text: string): string {
    return `${type}:${text.toLowerCase().trim()}`;
  }
}

let approvalQueueInstance: EntityApprovalQueue | null = null;

export async function getApprovalQueue(store?: EntityStore): Promise<EntityApprovalQueue> {
  if (!approvalQueueInstance) {
    const entityStore = store || new EntityStore();
    approvalQueueInstance = new EntityApprovalQueue(entityStore);
  }
  return approvalQueueInstance;
}
