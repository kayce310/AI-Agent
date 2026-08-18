/**
 * @file Progress Monitor — computed-only progress signal boundary
 * @layer core
 *
 * Phase 1 contract:
 * - Progress Monitor observes state; it does not own plan lifecycle.
 * - It never mutates TaskPlan.status.
 * - It never talks to CheckpointStore.
 * - It returns a computed ProgressSignal for upstream lifecycle authority.
 */

export type ProgressSignal =
  | { type: 'PROGRESS'; reason?: string }
  | { type: 'NO_PROGRESS'; reason?: string };

export interface ProgressObservation {
  /** True when a lifecycle transition was observed this cycle. */
  observedPlanTransition: boolean;
  /** True when deterministic evidence novelty was observed this cycle. */
  observedNovelEvidence: boolean;
  /** Deterministic fingerprint for evidence novelty checks. */
  evidenceFingerprint?: string;
  /** Monotonic cycle identifier from the current agent run. */
  cycleId: number;
  /** Optional timestamp for diagnostics only. */
  timestamp?: number;
}

export interface ProgressEvidenceInput {
  kind: 'tool_call' | 'plan_transition' | 'other';
  toolName?: string;
  args?: Record<string, unknown>;
  payload?: unknown;
  cycleId: number;
  timestamp?: number;
}

function stableSerialize(value: unknown): string {
  if (value === null || value === undefined) return 'null';
  if (typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) {
    return `[${value.map(stableSerialize).join(',')}]`;
  }
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  const entries = keys.map((k) => `${JSON.stringify(k)}:${stableSerialize(obj[k])}`);
  return `{${entries.join(',')}}`;
}

/**
 * Deterministic fingerprint for evidence novelty.
 * Same logical evidence => same fingerprint.
 * Different tool name / args / payload => different fingerprint.
 */
export function fingerprintProgressEvidence(input: ProgressEvidenceInput): string {
  const normalized = {
    kind: input.kind,
    toolName: input.toolName ?? '',
    args: input.args ?? null,
    payload: input.payload ?? null,
  };
  return stableSerialize(normalized);
}

/**
 * Create a computed-only progress observation from raw evidence facts.
 * The result contains no lifecycle mutation and no persistence hooks.
 */
export function createProgressObservation(input: {
  transitionObserved?: boolean;
  evidence?: ProgressEvidenceInput | null;
  novelEvidence?: boolean;
  cycleId: number;
  timestamp?: number;
}): ProgressObservation {
  const evidenceFingerprint = input.evidence ? fingerprintProgressEvidence(input.evidence) : undefined;
  return {
    observedPlanTransition: input.transitionObserved ?? false,
    observedNovelEvidence: input.novelEvidence ?? false,
    evidenceFingerprint,
    cycleId: input.cycleId,
    timestamp: input.timestamp,
  };
}

/**
 * Pure computed boundary between observed progress and lifecycle authority.
 * No internal mutation, no persistence, no checkpoint access.
 */
export function classifyProgress(observation: ProgressObservation): ProgressSignal {
  if (observation.observedPlanTransition) {
    return { type: 'PROGRESS', reason: 'plan_transition_observed' };
  }

  if (observation.observedNovelEvidence) {
    return {
      type: 'PROGRESS',
      reason: observation.evidenceFingerprint
        ? `novel_evidence:${observation.evidenceFingerprint}`
        : 'novel_evidence',
    };
  }

  return { type: 'NO_PROGRESS', reason: 'no_transition_and_no_novel_evidence' };
}

/**
 * Intentional no-op monitor wrapper.
 * Phase 1 only exposes a stable boundary for future phases.
 */
export class ProgressMonitor {
  observe(observation: ProgressObservation): ProgressSignal {
    return classifyProgress(observation);
  }
}
