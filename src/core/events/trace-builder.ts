/**
 * @file Trace Builder — Phase 4C: Trace Engine
 * @layer core/events
 * @created 2026-06-21
 * @description Builds CognitiveTrace from AgentEvent stream
 *   Links by: taskId, decisionId, callId — structured payloads only.
 *   No text parsing, no regex, no timeline string scanning.
 */

import type { AgentEvent } from './types.js';

// ═══ TYPES ═══

export interface CognitiveTrace {
  taskId: string;
  decisions: DecisionTrace[];
}

export interface DecisionTrace {
  decisionId: string;
  /** The decision_made event that triggered this trace */
  decision: AgentEvent;
  /** Tool calls spawned by this decision, paired by callId */
  tools: {
    toolCalled?: AgentEvent;
    toolFinished?: AgentEvent;
  }[];
  /** Side-effects: file_*, memory_write, error during this decision */
  artifacts: AgentEvent[];
}

// ═══ CONSTANTS ═══

/** Event types that are purely lifecycle — excluded from artifacts */
const LIFECYCLE_EVENTS = new Set(['task_started', 'task_finished', 'task_created']);

/** Event types that carry decisionId — linked by decisionId, not artifacts */
const LINKED_EVENTS = new Set(['tool_called', 'tool_finished', 'decision_made']);

// ═══ BUILD COGNITIVE TRACE ═══

/**
 * Build a CognitiveTrace from a flat array of AgentEvents.
 *
 * Linking rules (strictly structured payloads only):
 * - taskId  → groups events into a task
 * - decisionId → links tool_called/tool_finished to decision_made
 * - callId  → pairs tool_called ↔ tool_finished
 *
 * @param taskId The task to trace
 * @param events Raw event stream (will be filtered & sorted internally)
 * @returns A complete CognitiveTrace, or empty decisions if no matches
 */
export function buildCognitiveTrace(taskId: string, events: AgentEvent[]): CognitiveTrace {
  // ── Filter: only events with matching taskId or no taskId (orphan artifacts) ──
  const taskEvents = events.filter(e => {
    const p = e.payload;
    if (typeof p !== 'object' || p === null) return false;
    const ptaskId = (p as Record<string, unknown>).taskId;
    // Explicit taskId match
    if (ptaskId !== undefined && ptaskId !== null) return ptaskId === taskId;
    // Events without taskId (memory_write, error) — include for artifact assignment
    return true;
  });

  // ── Sort: chronological order ──
  taskEvents.sort((a, b) => a.timestamp - b.timestamp);

  const decisions: DecisionTrace[] = [];
  // Track which decisionId is currently active (for artifact assignment)
  let activeDecisionId: string | null = null;

  for (const event of taskEvents) {
    const payload = event.payload as Record<string, unknown>;

    switch (event.type) {
      case 'decision_made': {
        const decisionId = payload.decisionId as string;
        activeDecisionId = decisionId;
        decisions.push({
          decisionId,
          decision: event,
          tools: [],
          artifacts: [],
        });
        break;
      }

      case 'tool_called': {
        const decisionId = payload.decisionId as string;
        const callId = payload.callId as string;
        const target = decisions.find(d => d.decisionId === decisionId);
        if (target) {
          // Check orphan tool_finished first (out-of-order: finished arrived before called)
          const orphan = target.tools.find(t => {
            if (t.toolCalled) return false;
            const tf = t.toolFinished?.payload as Record<string, unknown> | undefined;
            return tf?.callId === callId;
          });
          if (orphan) {
            orphan.toolCalled = event;
          } else {
            const existing = target.tools.find(t => {
              const tc = t.toolCalled?.payload as Record<string, unknown> | undefined;
              return tc?.callId === callId;
            });
            if (existing) {
              existing.toolCalled = event;
            } else {
              target.tools.push({ toolCalled: event });
            }
          }
        }
        break;
      }

      case 'tool_finished': {
        const callId = payload.callId as string;
        // Find by callId across all decisions (handles out-of-order)
        let matched = false;
        for (const d of decisions) {
          const tool = d.tools.find(t => {
            const tc = t.toolCalled?.payload as Record<string, unknown> | undefined;
            return tc?.callId === callId;
          });
          if (tool) {
            tool.toolFinished = event;
            matched = true;
            break;
          }
          // Also check orphan slots (no toolCalled)
          const orphan = d.tools.find(t => {
            const tf = t.toolFinished?.payload as Record<string, unknown> | undefined;
            return !t.toolCalled && tf?.callId === callId;
          });
          if (orphan) {
            orphan.toolFinished = event;
            matched = true;
            break;
          }
        }
        // No matching callId found → create orphan slot under active decision
        if (!matched && activeDecisionId) {
          const target = decisions.find(d => d.decisionId === activeDecisionId);
          if (target) {
            target.tools.push({ toolFinished: event });
          }
        }
        break;
      }

      default: {
        // Artifact: any event with taskId that isn't lifecycle or decision-linked
        if (activeDecisionId && !LIFECYCLE_EVENTS.has(event.type) && !LINKED_EVENTS.has(event.type)) {
          const target = decisions.find(d => d.decisionId === activeDecisionId);
          if (target) {
            target.artifacts.push(event);
          }
        }
        break;
      }
    }
  }

  return { taskId, decisions };
}
