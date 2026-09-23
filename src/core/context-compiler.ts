/**
 * @file context-compiler — ContextCompiler: selection → conflict → allocation → assembly
 * @layer core
 * @owner core-context
 */

import { randomUUID } from 'crypto';
import { Logger } from './logger.js';
import {
  ContextSource,
  ContextCandidate,
  RequestContext,
  BudgetPolicy,
  AllocationResult,
  CompiledContext,
  SourceProvenance,
  DEFAULT_BUDGET_CLAIMS,
} from './context-source.js';
import { ContextWindowManager } from './context-window.js';

const log = new Logger({ module: 'ContextCompiler' });

// Default budget policy
const DEFAULT_POLICY: BudgetPolicy = {
  type: 'priority',
  mandatorySources: ['identity'],
};

export class ContextCompiler {
  private contextManager: ContextWindowManager;

  constructor(contextManager?: ContextWindowManager) {
    this.contextManager = contextManager || new ContextWindowManager();
  }

  /**
   * Compile context from active sources into a CompiledContext.
   * Pipeline: selection → conflict placeholder → allocation → assembly
   */
  async compile(input: {
    request: RequestContext;
    sources: ContextSource[];
    policy?: BudgetPolicy;
  }): Promise<CompiledContext> {
    const { request, sources, policy } = { ...input, policy: input.policy ?? DEFAULT_POLICY };

    // ── Stage 1: Candidate Selection ──
    const allCandidates: ContextCandidate[] = [];
    for (const source of sources) {
      try {
        const candidates = await source.getCandidates(request);
        for (const candidate of candidates) {
          // Retain sourceId and provenance from source
          allCandidates.push({
            ...candidate,
            sourceId: source.id,
            provenance: candidate.provenance ?? source.provenance,
          });
        }
      } catch (err: any) {
        log.warn(`[ContextCompiler] getCandidates() failed for source "${source.id}": ${err.message}`);
      }
    }

    // ── Stage 2: Conflict Detection (PLACEHOLDER — no-op) ──
    // Deferred: no conflict resolution algorithm yet
    const conflictFreeCandidates = allCandidates;

    // ── Stage 3: Budget Allocation ──
    const allocation = this.allocate(conflictFreeCandidates, policy);

    // ── Stage 4: Assembly ──
    const compiled = this.assemble(allocation.selected.map(s => s.candidate), policy.type);

    return compiled;
  }

  /**
   * Allocate budget across candidates.
   * Returns selected candidates with final budgets and evicted candidates.
   */
  private allocate(candidates: ContextCandidate[], policy: BudgetPolicy): AllocationResult {
    const totalBudget = this.contextManager.getBudget('context-compiler');
    const mandatory = new Set(policy.mandatorySources ?? []);

    const selected: Array<{ candidate: ContextCandidate; finalBudget: number }> = [];
    const evicted: Array<{ candidate: ContextCandidate; reason: string }> = [];
    let totalAllocated = 0;

    // Sort: mandatory sources first, then by sourceId for determinism
    const sorted = [...candidates].sort((a, b) => {
      const aMandatory = mandatory.has(a.sourceId);
      const bMandatory = mandatory.has(b.sourceId);
      if (aMandatory !== bMandatory) return aMandatory ? -1 : 1;
      return a.sourceId.localeCompare(b.sourceId);
    });

    for (const candidate of sorted) {
      if (totalAllocated + candidate.estimatedTokens > totalBudget) {
        // Check if source is mandatory
        if (mandatory.has(candidate.sourceId)) {
          // Keep mandatory sources even if over budget
          selected.push({ candidate, finalBudget: candidate.estimatedTokens });
          totalAllocated += candidate.estimatedTokens;
          continue;
        }
        // Evict optional candidate
        evicted.push({
          candidate,
          reason: totalAllocated + candidate.estimatedTokens > totalBudget
            ? 'budget_exceeded'
            : 'policy',
        });
        continue;
      }
      selected.push({ candidate, finalBudget: candidate.estimatedTokens });
      totalAllocated += candidate.estimatedTokens;
    }

    return {
      selected,
      evicted,
      totalAllocated,
      totalBudget,
    };
  }

  /**
   * Assemble candidates into CompiledContext with deterministic ordering.
   * Order: sourceId (ascending), then candidate id (ascending).
   */
  private assemble(
    candidates: ContextCandidate[],
    policyType: string,
  ): CompiledContext {
    // Deterministic sort: by sourceId, then by id
    const sorted = [...candidates].sort((a, b) => {
      const cmp = a.sourceId.localeCompare(b.sourceId);
      return cmp !== 0 ? cmp : a.id.localeCompare(b.id);
    });

    let totalTokens = 0;
    for (const c of sorted) {
      totalTokens += c.estimatedTokens;
    }

    return {
      compiledAt: new Date().toISOString(),
      totalTokens,
      candidates: sorted.map(c => ({
        id: c.id,
        content: c.content,
        sourceId: c.sourceId,
        provenance: c.provenance,
      })),
      metadata: {
        sourceCount: new Set(sorted.map(c => c.sourceId)).size,
        candidateCount: sorted.length,
        budgetPolicy: policyType,
      },
    };
  }

  /**
   * Convert CompiledContext to a plain string for model consumption.
   * Groups candidates by source with section markers.
   */
  compileToString(compiled: CompiledContext): string {
    const sections: string[] = [];
    let currentSource = '';

    for (const candidate of compiled.candidates) {
      if (candidate.sourceId !== currentSource) {
        currentSource = candidate.sourceId;
        sections.push(`## [${currentSource}]`);
      }
      sections.push(candidate.content);
    }

    return sections.join('\n\n');
  }
}
