/**
 * @file Event Factory — Create validated agent events
 * @layer core
 * @created 2026-06-20
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
  MemoryWriteSchema,
  ErrorEventSchema,
} from './types.js';

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

  static toolCalled(toolName: string, args: Record<string, unknown>, taskId?: string): AgentEvent {
    return ToolCalledSchema.parse({
      ...this.createBase('tool_called'),
      payload: { toolName, args, taskId },
    });
  }

  static toolFinished(
    toolName: string,
    args: Record<string, unknown>,
    result: string,
    success: boolean,
    duration: number
  ): AgentEvent {
    return ToolFinishedSchema.parse({
      ...this.createBase('tool_finished'),
      payload: { toolName, args, result, success, duration },
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
}
