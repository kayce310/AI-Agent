/**
 * @file Event Factory — Create validated agent events
 * @layer core
 * @created 2026-06-20
 * @updated 2026-06-21 — Phase 4A: decisionId linkage, reasoningSnippet, updated tool schemas
 */

import { randomUUID } from 'crypto';
import {
  AgentEvent,
  BaseEvent,
  TaskCreatedSchema,
  TaskStartedSchema,
  TaskFinishedSchema,
  ToolCalledSchema,
  ToolFinishedSchema,
  FileCreatedSchema,
  FileModifiedSchema,
  FileDeletedSchema,
  DecisionMadeSchema,
  MemoryWriteSchema,
  ErrorEventSchema,
  BaseEventSchema,
  BehaviorPlanGeneratedSchema,
} from './types.js';

// Reasoning updated schema (not in types.ts yet)
import { z } from 'zod';
import type { BehaviorPlan } from '../behavior/types.js';
const ReasoningUpdatedSchema = BaseEventSchema.extend({
  type: z.literal('reasoning_updated'),
  payload: z.object({
    taskId: z.string(),
    chunk: z.string(),
    isFinal: z.boolean(),
  }),
});



export class EventFactory {
  private static createBase(type: string): BaseEvent {
    return {
      id: randomUUID(),
      timestamp: Date.now(),
      type,
      payload: {},
    };
  }

  static taskCreated(goal: string, plan?: string[], constraints?: string[]): AgentEvent {
    return TaskCreatedSchema.parse({
      ...this.createBase('task_created'),
      payload: { goal, plan, constraints },
    });
  }

  static taskStarted(taskId: string, goal: string, currentStep?: number): AgentEvent {
    return TaskStartedSchema.parse({
      ...this.createBase('task_started'),
      payload: { taskId, goal, currentStep },
    });
  }

  static taskFinished(
    taskId: string,
    goal: string,
    success: boolean,
    duration: number,
    result?: string
  ): AgentEvent {
    return TaskFinishedSchema.parse({
      ...this.createBase('task_finished'),
      payload: { taskId, goal, success, duration, result },
    });
  }

  static toolCalled(taskId: string, decisionId: string, callId: string, toolName: string, args: Record<string, unknown>): AgentEvent {
    return ToolCalledSchema.parse({
      ...this.createBase('tool_called'),
      payload: { taskId, decisionId, callId, toolName, args },
    });
  }

  static toolFinished(
    taskId: string,
    decisionId: string,
    callId: string,
    toolName: string,
    success: boolean,
    durationMs: number,
    args?: Record<string, unknown>,
    result?: string
  ): AgentEvent {
    return ToolFinishedSchema.parse({
      ...this.createBase('tool_finished'),
      payload: { taskId, decisionId, callId, toolName, success, durationMs, args, result },
    });
  }

  static fileCreated(taskId: string, filePath: string): AgentEvent {
    return FileCreatedSchema.parse({
      ...this.createBase('file_created'),
      payload: { taskId, path: filePath },
    });
  }

  static fileModified(taskId: string, filePath: string): AgentEvent {
    return FileModifiedSchema.parse({
      ...this.createBase('file_modified'),
      payload: { taskId, path: filePath },
    });
  }

  static fileDeleted(taskId: string, filePath: string): AgentEvent {
    return FileDeletedSchema.parse({
      ...this.createBase('file_deleted'),
      payload: { taskId, path: filePath },
    });
  }

  static decisionMade(
    taskId: string,
    decisionId: string,
    decision: string,
    reason: string,
    nextAction: string,
    reasoningSnippet?: string
  ): AgentEvent {
    return DecisionMadeSchema.parse({
      ...this.createBase('decision_made'),
      payload: { taskId, decisionId, decision, reason, reasoningSnippet, nextAction },
    });
  }

  static memoryWrite(key: string, value: string, scope: 'user' | 'memory' | 'session'): AgentEvent {
    return MemoryWriteSchema.parse({
      ...this.createBase('memory_write'),
      payload: { key, value, scope },
    });
  }

  static error(message: string, stack?: string, code?: string, context?: Record<string, unknown>): AgentEvent {
    return ErrorEventSchema.parse({
      ...this.createBase('error'),
      payload: { message, stack, code, context },
    });
  }

  static reasoningUpdated(taskId: string, chunk: string, isFinal: boolean): AgentEvent {
    // Phase 4E-B: Live reasoning streaming
    return {
      id: randomUUID(),
      timestamp: Date.now(),
      type: 'reasoning_updated' as any,
      payload: { taskId, chunk, isFinal },
    } as unknown as AgentEvent;
  }

  static behaviorPlanGenerated(plan: BehaviorPlan): AgentEvent {
    return BehaviorPlanGeneratedSchema.parse({
      ...this.createBase('behavior_plan_generated'),
      payload: {
        planId: plan.id,
        sourceEventId: plan.sourceEventId,
        sourceEventType: plan.sourceEventType,
        taskId: plan.taskId,
        actions: plan.actions,
        emotion: plan.emotion,
        confidence: plan.confidence,
      },
    });
  }
}
