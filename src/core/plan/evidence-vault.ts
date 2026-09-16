/**
 * @file Evidence Vault — Historical evidence storage for completion protocol
 * @layer core
 * @owner core-engine
 *
 * Stores evidence generated during plan execution.
 * Does NOT represent fresh reality observation.
 */

import { Logger } from '../logger.js';

const log = new Logger({ module: 'EvidenceVault' });

export interface StoredEvidence {
  id: string;
  planId: string;
  itemIndex: number;
  type: string;
  payload: any;
  timestamp: number;
}

export class EvidenceVault {
  private records: StoredEvidence[] = [];

  record(evidence: StoredEvidence) {
    this.records.push(evidence);
    log.info(`[EvidenceVault] Recorded evidence: ${evidence.id}`);
  }

  getByItem(planId: string, itemIndex: number): StoredEvidence[] {
    return this.records.filter(r => r.planId === planId && r.itemIndex === itemIndex);
  }

  clear() {
    this.records = [];
  }
}

export const evidenceVault = new EvidenceVault();
