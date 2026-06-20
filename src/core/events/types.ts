/**
 * @file Agent Event Types — Event Sourcing Schema
 * @layer core
 * @created 2026-06-20
 */

import { z } from 'zod';

// ═══ BASE EVENT SCHEMA ═══
export const BaseEventSchema = z.object({
  id: z.string().uuid(),
  timestamp: z.number().positive(),
  type: z.string(),
  payload: z.record(z.string(), z.unknown()),
  metadata: z.object({
    source: z.string(),
    version: z.string().default('1.0'),
  }).optional(),
});

export type BaseEvent = z.infer<typeof BaseEventSchema>;

// ═══ TASK EVENTS ═══
export const TaskCreatedSchema = BaseEventSchema.extend({
  type: z.literal('task_created'),
  payload: z.object({
    goal: z.string(),
    plan: z.array(z.string()).optional(),
    constraints: z.array(z.string()).optional(),
  }),
});

export const TaskStartedSchema = BaseEventSchema.extend({
  type: z.literal('task_started'),
  payload: z.object({
    taskId: z.string(),
    goal: z.string(),
    currentStep: z.number().optional(),
  }),
});

export const TaskFinishedSchema = BaseEventSchema.extend({
  type: z.literal('task_finished'),
  payload: z.object({
    taskId: z.string(),
    goal: z.string(),
    success: z.boolean(),
    duration: z.number(),
    result: z.string().optional(),
  }),
});

// ═══ TOOL EVENTS ═══
export const ToolCalledSchema = BaseEventSchema.extend({
  type: z.literal('tool_called'),
  payload: z.object({
    toolName: z.string(),
    args: z.record(z.string(), z.unknown()),
    taskId: z.string().optional(),
  }),
});

export const ToolFinishedSchema = BaseEventSchema.extend({
  type: z.literal('tool_finished'),
  payload: z.object({
    toolName: z.string(),
    args: z.record(z.string(), z.unknown()),
    result: z.string(),
    success: z.boolean(),
    duration: z.number(),
  }),
});

// ═══ MEMORY EVENTS ═══
export const MemoryWriteSchema = BaseEventSchema.extend({
  type: z.literal('memory_write'),
  payload: z.object({
    key: z.string(),
    value: z.string(),
    scope: z.enum(['user', 'memory', 'session']),
  }),
});

// ═══ ERROR EVENTS ═══
export const ErrorEventSchema = BaseEventSchema.extend({
  type: z.literal('error'),
  payload: z.object({
    message: z.string(),
    stack: z.string().optional(),
    code: z.string().optional(),
    context: z.record(z.string(), z.unknown()).optional(),
  }),
});

// ═══ UNION TYPE ═══
export const AgentEventSchema = z.discriminatedUnion('type', [
  TaskCreatedSchema,
  TaskStartedSchema,
  TaskFinishedSchema,
  ToolCalledSchema,
  ToolFinishedSchema,
  MemoryWriteSchema,
  ErrorEventSchema,
]);

export type AgentEvent = z.infer<typeof AgentEventSchema>;

// ═══ EVENT TYPES ENUM ═══
export enum EventType {
  TASK_CREATED = 'task_created',
  TASK_STARTED = 'task_started',
  TASK_FINISHED = 'task_finished',
  TOOL_CALLED = 'tool_called',
  TOOL_FINISHED = 'tool_finished',
  MEMORY_WRITE = 'memory_write',
  ERROR = 'error',
}
