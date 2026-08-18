import { describe, expect, it } from 'vitest';
import {
  classifyProgress,
  createProgressObservation,
  fingerprintProgressEvidence,
  NoProgressWindow,
  ProgressTracker,
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

  it('increments on NO_PROGRESS and resets on PROGRESS', () => {
    const window = new NoProgressWindow('run-a', 3);

    expect(window.apply({ type: 'NO_PROGRESS' }).counter).toBe(1);
    expect(window.apply({ type: 'NO_PROGRESS' }).counter).toBe(2);

    const resetState = window.apply({ type: 'PROGRESS' });
    expect(resetState.counter).toBe(0);
    expect(resetState.thresholdReached).toBe(false);

    expect(window.apply({ type: 'NO_PROGRESS' }).counter).toBe(1);
  });

  it('reaches threshold at N consecutive NO_PROGRESS signals', () => {
    const window = new NoProgressWindow('run-b', 3);

    expect(window.apply({ type: 'NO_PROGRESS' })).toMatchObject({ counter: 1, thresholdReached: false });
    expect(window.apply({ type: 'NO_PROGRESS' })).toMatchObject({ counter: 2, thresholdReached: false });
    expect(window.apply({ type: 'NO_PROGRESS' })).toMatchObject({ counter: 3, thresholdReached: true });
  });

  it('restart boundary resets counter to zero for a new run', () => {
    const window = new NoProgressWindow('run-a', 3);

    window.apply({ type: 'NO_PROGRESS' });
    window.apply({ type: 'NO_PROGRESS' });
    expect(window.snapshot().counter).toBe(2);

    window.startRun('run-b');
    expect(window.snapshot()).toEqual({
      runId: 'run-b',
      counter: 0,
      thresholdReached: false,
    });

    expect(window.apply({ type: 'NO_PROGRESS' }).counter).toBe(1);
  });

  it('does not persist across objects', () => {
    const runA = new NoProgressWindow('run-a', 3);
    runA.apply({ type: 'NO_PROGRESS' });
    runA.apply({ type: 'NO_PROGRESS' });

    const runB = new NoProgressWindow('run-b', 3);
    expect(runB.snapshot()).toEqual({
      runId: 'run-b',
      counter: 0,
      thresholdReached: false,
    });
  });

  it('tracker treats duplicate evidence as NO_PROGRESS', () => {
    const tracker = new ProgressTracker('run-a', 3);

    const first = tracker.evaluate({
      runId: 'run-a',
      cycleId: 1,
      evidence: [
        {
          kind: 'tool_call',
          toolName: 'read_file',
          args: { path: 'a.txt' },
          cycleId: 1,
        },
      ],
    });
    expect(first.signal.type).toBe('PROGRESS');
    expect(first.window.counter).toBe(0);

    const second = tracker.evaluate({
      runId: 'run-a',
      cycleId: 2,
      evidence: [
        {
          kind: 'tool_call',
          toolName: 'read_file',
          args: { path: 'a.txt' },
          cycleId: 2,
        },
      ],
    });
    expect(second.signal.type).toBe('NO_PROGRESS');
    expect(second.window.counter).toBe(1);
  });

  it('tracker resets on new run boundary', () => {
    const tracker = new ProgressTracker('run-a', 3);

    tracker.evaluate({
      runId: 'run-a',
      cycleId: 1,
      evidence: [
        { kind: 'tool_call', toolName: 'read_file', args: { path: 'a.txt' }, cycleId: 1 },
      ],
    });
    tracker.evaluate({
      runId: 'run-a',
      cycleId: 2,
      evidence: [
        { kind: 'tool_call', toolName: 'read_file', args: { path: 'a.txt' }, cycleId: 2 },
      ],
    });

    tracker.startRun('run-b');
    const afterRestart = tracker.evaluate({
      runId: 'run-b',
      cycleId: 1,
      evidence: [
        { kind: 'tool_call', toolName: 'read_file', args: { path: 'a.txt' }, cycleId: 1 },
      ],
    });

    expect(afterRestart.window.counter).toBe(0);
    expect(afterRestart.signal.type).toBe('PROGRESS');
  });

  it('threshold reached only changes signal, not lifecycle state', () => {
    const tracker = new ProgressTracker('run-a', 2);
    const first = tracker.evaluate({
      runId: 'run-a',
      cycleId: 1,
      evidence: [],
    });
    const second = tracker.evaluate({
      runId: 'run-a',
      cycleId: 2,
      evidence: [],
    });

    expect(first.signal.type).toBe('NO_PROGRESS');
    expect(second.signal.type).toBe('NO_PROGRESS');
    expect(second.window.thresholdReached).toBe(true);
    expect(second.observation).toMatchObject({ observedNovelEvidence: false, observedPlanTransition: false });
  });
});
