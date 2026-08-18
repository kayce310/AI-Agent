import { describe, expect, it } from 'vitest';
import {
  classifyProgress,
  createProgressObservation,
  fingerprintProgressEvidence,
  ProgressMonitor,
  type ProgressObservation,
} from '../src/core/progress/progress-monitor.js';

describe('Progress boundary', () => {
  it('classifies plan transition as PROGRESS', () => {
    const observation: ProgressObservation = {
      observedPlanTransition: true,
      observedNovelEvidence: false,
      cycleId: 1,
      evidenceFingerprint: 'plan:pending->running',
    };

    expect(classifyProgress(observation)).toEqual({
      type: 'PROGRESS',
      reason: 'plan_transition_observed',
    });
  });

  it('classifies deterministic novelty as PROGRESS', () => {
    const monitor = new ProgressMonitor();
    const signal = monitor.observe({
      observedPlanTransition: false,
      observedNovelEvidence: true,
      evidenceFingerprint: 'tool:read_file::sha256:abc123',
      cycleId: 2,
      timestamp: Date.now(),
    });

    expect(signal.type).toBe('PROGRESS');
    expect(signal.reason).toBe('novel_evidence:tool:read_file::sha256:abc123');
  });

  it('classifies absence of transition and novelty as NO_PROGRESS', () => {
    const signal = classifyProgress({
      observedPlanTransition: false,
      observedNovelEvidence: false,
      cycleId: 3,
    });

    expect(signal).toEqual({
      type: 'NO_PROGRESS',
      reason: 'no_transition_and_no_novel_evidence',
    });
  });

  it('does not carry lifecycle mutation fields', () => {
    const signal = classifyProgress({
      observedPlanTransition: false,
      observedNovelEvidence: true,
      evidenceFingerprint: 'fingerprint',
      cycleId: 4,
    });

    expect(signal).not.toHaveProperty('status');
    expect(signal).not.toHaveProperty('planId');
    expect(signal).not.toHaveProperty('sessionId');
  });

  it('same evidence produces same fingerprint', () => {
    const a = fingerprintProgressEvidence({
      kind: 'tool_call',
      toolName: 'read_file',
      args: { path: 'a.txt', mode: 'utf8' },
      cycleId: 7,
    });
    const b = fingerprintProgressEvidence({
      kind: 'tool_call',
      toolName: 'read_file',
      args: { mode: 'utf8', path: 'a.txt' },
      cycleId: 99,
    });

    expect(a).toBe(b);
  });

  it('different evidence produces different fingerprint', () => {
    const a = fingerprintProgressEvidence({
      kind: 'tool_call',
      toolName: 'read_file',
      args: { path: 'a.txt' },
      cycleId: 1,
    });
    const b = fingerprintProgressEvidence({
      kind: 'tool_call',
      toolName: 'list_directory',
      args: { path: 'a.txt' },
      cycleId: 1,
    });

    expect(a).not.toBe(b);
  });

  it('createProgressObservation includes deterministic fingerprint and progress bits', () => {
    const observation = createProgressObservation({
      transitionObserved: true,
      evidence: {
        kind: 'plan_transition',
        payload: { from: 'pending', to: 'running' },
        cycleId: 11,
      },
      novelEvidence: false,
      cycleId: 11,
      timestamp: 123456,
    });

    expect(observation.observedPlanTransition).toBe(true);
    expect(observation.observedNovelEvidence).toBe(false);
    expect(observation.evidenceFingerprint).toContain('"kind":"plan_transition"');
    expect(observation.cycleId).toBe(11);
    expect(observation.timestamp).toBe(123456);
  });
});
