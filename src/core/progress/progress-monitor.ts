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

export interface NoProgressWindowState {
  runId: string;
  counter: number;
  thresholdReached: boolean;
}

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

/**
 * Ephemeral no-progress window for a single agent run.
 * In-memory only. Reset on run boundary or positive progress.
 */
export class NoProgressWindow {
  private runId: string;
  private counter = 0;
  private threshold: number;

  constructor(runId: string, threshold = 3) {
    this.runId = runId;
    this.threshold = threshold;
  }

  startRun(runId: string): void {
    this.runId = runId;
    this.counter = 0;
  }

  reset(): void {
    this.counter = 0;
  }

  apply(signal: ProgressSignal): NoProgressWindowState {
    if (signal.type === 'PROGRESS') {
      this.reset();
      return this.snapshot(false);
    }

    this.counter += 1;
    return this.snapshot(this.counter >= this.threshold);
  }

  snapshot(thresholdReached = this.counter >= this.threshold): NoProgressWindowState {
    return {
      runId: this.runId,
      counter: this.counter,
      thresholdReached,
    };
  }
}

export interface ProgressTrackerInput {
  runId: string;
  cycleId: number;
  transitionObserved?: boolean;
  evidence?: ProgressEvidenceInput[];
}

export interface ProgressTrackerResult {
  signal: ProgressSignal;
  observation: ProgressObservation;
  window: NoProgressWindowState;
  novelEvidenceCount: number;
}

/**
 * Ephemeral progress tracker for a single agent run.
 * Combines deterministic novelty + no-progress window, but never mutates
 * lifecycle state or persists anything.
 */
export class ProgressTracker {
  private monitor = new ProgressMonitor();
  private window: NoProgressWindow;
  private seenFingerprints = new Set<string>();

  constructor(runId: string, threshold = 3) {
    this.window = new NoProgressWindow(runId, threshold);
  }

  startRun(runId: string): void {
    this.window.startRun(runId);
    this.seenFingerprints.clear();
  }

  evaluate(input: ProgressTrackerInput): ProgressTrackerResult {
    const novelEvidence = this.collectNovelEvidence(input.evidence ?? []);
    const observation = createProgressObservation({
      transitionObserved: input.transitionObserved ?? false,
      evidence: input.evidence?.[0] ?? null,
      novelEvidence,
      cycleId: input.cycleId,
    });
    const signal = this.monitor.observe(observation);
    const window = this.window.apply(signal);
    return {
      signal,
      observation,
      window,
      novelEvidenceCount: this.seenFingerprints.size,
    };
  }

  private collectNovelEvidence(evidence: ProgressEvidenceInput[]): boolean {
    let foundNovel = false;
    for (const item of evidence) {
      if (item.kind !== 'tool_call' && item.kind !== 'plan_transition') continue;
      const fingerprint = fingerprintProgressEvidence(item);
      if (this.seenFingerprints.has(fingerprint)) continue;
      this.seenFingerprints.add(fingerprint);
      foundNovel = true;
    }
    return foundNovel;
  }
}
