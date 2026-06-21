/**
 * @file Agent State — Frontend Fields Verification
 * @layer tests
 * @created 2026-06-21
 * 
 * Verify that frontend-only state fields persist through WebSocket merge
 * and that event reducer properly initializes all fields.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { randomUUID } from 'crypto';
import { 
  AgentState, 
  createInitialState, 
  reduceEvent, 
  buildStateFromEvents 
} from '../src/core/events/agent-state.js';
import { AgentEvent } from '../src/core/events/types.js';

describe('Agent State — Frontend Fields', () => {
  let initialState: AgentState;

  beforeEach(() => {
    initialState = createInitialState();
  });

  describe('Initial state includes all frontend-only fields', () => {
    it('should have streamingText initialized to empty string', () => {
      expect(initialState.streamingText).toBe('');
    });

    it('should have streamIndex initialized to 0', () => {
      expect(initialState.streamIndex).toBe(0);
    });

    it('should have eventCount initialized to 0', () => {
      expect(initialState.eventCount).toBe(0);
    });

    it('should have toolStartTime initialized to null', () => {
      expect(initialState.toolStartTime).toBeNull();
    });

    it('should have lastConfidence initialized to null', () => {
      expect(initialState.lastConfidence).toBeNull();
    });

    it('should have focusPaused initialized to false', () => {
      expect(initialState.focusPaused).toBe(false);
    });

    it('should have focusEventBuffer initialized to empty array', () => {
      expect(initialState.focusEventBuffer).toEqual([]);
    });
  });

  describe('Task start event resets eventCount', () => {
    it('should reset eventCount to 0 on task_started', () => {
      const state = { ...initialState, eventCount: 42 };
      
      const taskStartEvent: AgentEvent = {
        id: randomUUID(),
        timestamp: Date.now(),
        type: 'task_started',
        payload: {
          taskId: 'task-123',
          goal: 'Test goal',
        },
      };

      const newState = reduceEvent(state, taskStartEvent);

      expect(newState.eventCount).toBe(0);
      expect(newState.currentTaskId).toBe('task-123');
      expect(newState.status).toBe('working');
    });
  });

  describe('Frontend-only fields survive state merge', () => {
    it('should preserve frontend fields when merging backend state', () => {
      // Simulate frontend state with active timer/streaming
      const frontendState: AgentState = {
        ...initialState,
        streamingText: 'Agent is thinking...',
        streamIndex: 10,
        eventCount: 5,
        toolStartTime: Date.now() - 1000,
        lastConfidence: 0.85,
        focusPaused: true,
        focusEventBuffer: [],
      };

      // Backend sends state without frontend fields (like frontend would merge)
      const backendState: Partial<AgentState> = {
        status: 'working',
        currentTaskId: 'task-456',
        currentGoal: 'Backend goal',
        activeTools: [],
        recentFiles: [],
        lastError: null,
        recentDecisions: [],
        timeline: [],
      };

      // Simulate Object.assign() merge
      const mergedState = Object.assign({}, frontendState, backendState) as AgentState;

      // Frontend fields should still be present
      expect(mergedState.streamingText).toBe('Agent is thinking...');
      expect(mergedState.streamIndex).toBe(10);
      expect(mergedState.eventCount).toBe(5);
      expect(mergedState.toolStartTime).toBeGreaterThan(0);
      expect(mergedState.lastConfidence).toBe(0.85);
      expect(mergedState.focusPaused).toBe(true);
    });
  });

  describe('Event reducer preserves frontend state', () => {
    it('should preserve frontend fields when reducing events', () => {
      const stateWithFrontendData: AgentState = {
        ...initialState,
        streamingText: 'Thinking...',
        eventCount: 3,
        toolStartTime: Date.now() - 500,
      };

      const toolEvent: AgentEvent = {
        id: randomUUID(),
        timestamp: Date.now(),
        type: 'tool_called',
        payload: {
          taskId: 'task-789',
          decisionId: 'dec-1',
          callId: 'call-1',
          toolName: 'read_file',
          args: { path: '/test' },
        },
      };

      const newState = reduceEvent(stateWithFrontendData, toolEvent);

      // Frontend fields should be preserved (via spread operator in reducer)
      expect(newState.streamingText).toBe('Thinking...');
      expect(newState.eventCount).toBe(3);
      expect(newState.toolStartTime).toBeGreaterThan(0);

      // Tool event should be applied
      expect(newState.activeTools).toHaveLength(1);
      expect(newState.activeTools[0].toolName).toBe('read_file');
    });
  });

  describe('Full state rebuild from events', () => {
    it('should initialize all fields when building state from events', () => {
      const events: AgentEvent[] = [
        {
          id: randomUUID(),
          timestamp: Date.now(),
          type: 'task_started',
          payload: { taskId: 'task-rebuild', goal: 'Rebuild test' },
        },
        {
          id: randomUUID(),
          timestamp: Date.now() + 100,
          type: 'decision_made',
          payload: {
            taskId: 'task-rebuild',
            decisionId: 'dec-rebuild',
            decision: 'Test decision',
            reason: 'Testing',
            nextAction: 'Continue testing',
          },
        },
      ];

      const rebuilt = buildStateFromEvents(events);

      // All frontend fields should exist
      expect(rebuilt.streamingText).toBeDefined();
      expect(rebuilt.streamIndex).toBeDefined();
      expect(rebuilt.eventCount).toBeDefined();
      expect(rebuilt.toolStartTime).toBeDefined();
      expect(rebuilt.lastConfidence).toBeDefined();
      expect(rebuilt.focusPaused).toBeDefined();
      expect(rebuilt.focusEventBuffer).toBeDefined();

      // State should be correct
      expect(rebuilt.status).toBe('working');
      expect(rebuilt.currentTaskId).toBe('task-rebuild');
      expect(rebuilt.eventCount).toBe(0); // Reset on task_started
    });
  });
});
