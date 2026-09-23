/**
 * @file context-source — Context Architecture contracts
 * @layer core
 * @owner core-context
 */

// ── Provenance ──

export interface SourceProvenance {
  origin: 'file' | 'tool_call' | 'user' | 'memory' | 'system';
  identifier?: string;
  timestamp?: string;
  reliability?: number;
}

// ── ContextCandidate ──

export interface ContextCandidate {
  id: string;
  content: string;
  sourceId: string;
  provenance?: SourceProvenance;
  relevanceScore?: number;
  estimatedTokens: number;
  expiresAt?: string;
}

// ── ContextSource ──

export interface RequestContext {
  sessionId: string;
  taskId: string;
  task?: string;
  messages?: Array<{ role: string; content: string }>;
}

export interface ContextSource {
  id: string;
  getCandidates(request: RequestContext): Promise<ContextCandidate[]>;
  provenance?: SourceProvenance;
  budgetClaim: number;
  isActive(sessionId: string, taskId: string): boolean;
}

// ── BudgetContract ──

export interface BudgetPolicy {
  type: 'priority' | 'round-robin' | 'equal-share';
  maxTokensPerSource?: number;
  minTokensPerSource?: number;
  mandatorySources?: string[];
}

export interface AllocationResult {
  selected: Array<{ candidate: ContextCandidate; finalBudget: number }>;
  evicted: Array<{ candidate: ContextCandidate; reason: string }>;
  totalAllocated: number;
  totalBudget: number;
}

// ── CompiledContext ──

export interface CompiledContext {
  compiledAt: string;
  totalTokens: number;
  candidates: Array<{
    id: string;
    content: string;
    sourceId: string;
    provenance?: SourceProvenance;
  }>;
  metadata: {
    sourceCount: number;
    candidateCount: number;
    budgetPolicy: string;
  };
}

// ── Defaults ──

/** Default budget claims per source — implementation-level constants, not spec mandates */
export const DEFAULT_BUDGET_CLAIMS: Record<string, number> = {
  identity: 500,
  memory: 1000,
  learning: 500,
  world: 200,
  plan: 500,
};
