/**
 * @file Agent State — Derives current state from events
 * @layer core
 * @created 2026-06-21
 * @updated 2026-06-21 — Phase 2: callId for tool cleanup, currentTaskLabel, fallback states
 *
 * Events → State → UI (NOT Events → UI)
 * This is the single source of truth for all dashboard state.
 */

import { AgentEvent } from './types.js';

// ═══ STATE TYPES ═══

export type AgentStatus = 'idle' | 'working' | 'error' | 'offline' | 'paused';

export interface ActiveTool {
  callId: string;
  toolName: string;
  args: Record<string, unknown>;
  startedAt: number;
}

export interface RecentFile {
  path: string;
  event: 'created' | 'modified' | 'deleted';
  timestamp: number;
}

export interface RecentDecision {
  decision: string;
  reason: string;
  nextAction: string;
  timestamp: number;
}

export interface AgentState {
  status: AgentStatus;
  currentGoal: string | null;
  currentTaskId: string | null;
  currentTaskLabel: string | null;
  activeTools: ActiveTool[];
  recentFiles: RecentFile[];
  lastError: { message: string; code?: string; timestamp: number } | null;
  recentDecisions: RecentDecision[];
  timeline: AgentEvent[];
}

// ═══ INITIAL STATE ═══

export function createInitialState(): AgentState {
  return {
    status: 'idle',
    currentGoal: null,
    currentTaskId: null,
    currentTaskLabel: null,
    activeTools: [],
    recentFiles: [],
    lastError: null,
    recentDecisions: [],
    timeline: [],
  };
}

// ═══ STATE REDUCER ═══

const MAX_RECENT_FILES = 50;
const MAX_RECENT_DECISIONS = 20;
const MAX_TIMELINE = 200;

/**
 * Apply an event to the current state, returning the new state.
 * Pure function — does not mutate the input state.
 */
export function reduceEvent(state: AgentState, event: AgentEvent): AgentState {
  // Always append to timeline
  const timeline = [event, ...state.timeline].slice(0, MAX_TIMELINE);

  switch (event.type) {
    case 'task_started': {
      const p = event.payload as { taskId: string; goal: string; currentStep?: number };
      return {
        ...state,
        status: 'working',
        currentGoal: p.goal,
        currentTaskId: p.taskId,
        currentTaskLabel: p.goal, // Fallback: goal is the label until engine provides a real label
        timeline,
      };
    }

    case 'task_finished': {
      const p = event.payload as { taskId: string; success: boolean };
      return {
        ...state,
        status: p.success ? 'idle' : 'error',
        currentGoal: null,
        currentTaskId: null,
        currentTaskLabel: null,
        timeline,
      };
    }

    case 'tool_called': {
      const p = event.payload as { taskId: string; callId: string; toolName: string; args: Record<string, unknown> };
      const activeTools: ActiveTool[] = [
        { callId: p.callId, toolName: p.toolName, args: p.args, startedAt: event.timestamp },
        ...state.activeTools,
      ];
      return {
        ...state,
        activeTools,
        timeline,
      };
    }

    case 'tool_finished': {
      const p = event.payload as { callId: string };
      const activeTools = state.activeTools.filter(t => t.callId !== p.callId);
      return {
        ...state,
        activeTools,
        timeline,
      };
    }

    case 'file_created': {
      const p = event.payload as { path: string };
      const file: RecentFile = { path: p.path, event: 'created', timestamp: event.timestamp };
      const recentFiles = [file, ...state.recentFiles].slice(0, MAX_RECENT_FILES);
      return { ...state, recentFiles, timeline };
    }

    case 'file_modified': {
      const p = event.payload as { path: string };
      const file: RecentFile = { path: p.path, event: 'modified', timestamp: event.timestamp };
      const recentFiles = [file, ...state.recentFiles].slice(0, MAX_RECENT_FILES);
      return { ...state, recentFiles, timeline };
    }

    case 'file_deleted': {
      const p = event.payload as { path: string };
      const file: RecentFile = { path: p.path, event: 'deleted', timestamp: event.timestamp };
      const recentFiles = [file, ...state.recentFiles].slice(0, MAX_RECENT_FILES);
      return { ...state, recentFiles, timeline };
    }

    case 'decision_made': {
      const p = event.payload as { decision: string; reason: string; nextAction: string };
      const decision: RecentDecision = {
        decision: p.decision,
        reason: p.reason,
        nextAction: p.nextAction,
        timestamp: event.timestamp,
      };
      const recentDecisions = [decision, ...state.recentDecisions].slice(0, MAX_RECENT_DECISIONS);
      return { ...state, recentDecisions, timeline };
    }

    case 'error': {
      const p = event.payload as { message: string; code?: string };
      return {
        ...state,
        status: 'error',
        lastError: { message: p.message, code: p.code, timestamp: event.timestamp },
        timeline,
      };
    }

    default:
      return { ...state, timeline };
  }
}

/**
 * Build full state from an array of events (ordered oldest→newest).
 */
export function buildStateFromEvents(events: AgentEvent[]): AgentState {
  return events.reduce(reduceEvent, createInitialState());
}
