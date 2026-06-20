/**
 * @file Agent Event Types — Event Sourcing Schema
 * @layer core
 * @created 2026-06-20
 * @updated 2026-06-21 — Phase 1: file events, decision_made, error codes
 */

import { z } from 'zod';

// ═══ ERROR CODES ═══
export enum ErrorCode {
  ENGINE_AGENT_FAILED = 'ENGINE_AGENT_FAILED',
  TOOL_EXECUTION_FAILED = 'TOOL_EXECUTION_FAILED',
  FILE_ACCESS_FAILED = 'FILE_ACCESS_FAILED',
  MEMORY_WRITE_FAILED = 'MEMORY_WRITE_FAILED',
  VALIDATION_FAILED = 'VALIDATION_FAILED',
  NETWORK_ERROR = 'NETWORK_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

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
    taskId: z.string(),
    callId: z.string(),
    toolName: z.string(),
    args: z.record(z.string(), z.unknown()),
  }),
});

export const ToolFinishedSchema = BaseEventSchema.extend({
  type: z.literal('tool_finished'),
  payload: z.object({
    taskId: z.string(),
    callId: z.string(),
    toolName: z.string(),
    success: z.boolean(),
    durationMs: z.number(),
    args: z.record(z.string(), z.unknown()).optional(),
    result: z.string().optional(),
  }),
});

// ═══ FILE EVENTS ═══
export const FileCreatedSchema = BaseEventSchema.extend({
  type: z.literal('file_created'),
  payload: z.object({
    taskId: z.string(),
    path: z.string(),
  }),
});

export const FileModifiedSchema = BaseEventSchema.extend({
  type: z.literal('file_modified'),
  payload: z.object({
    taskId: z.string(),
    path: z.string(),
  }),
});

export const FileDeletedSchema = BaseEventSchema.extend({
  type: z.literal('file_deleted'),
  payload: z.object({
    taskId: z.string(),
    path: z.string(),
  }),
});

// ═══ DECISION EVENTS ═══
export const DecisionMadeSchema = BaseEventSchema.extend({
  type: z.literal('decision_made'),
  payload: z.object({
    taskId: z.string(),
    decision: z.string(),
    reason: z.string(),
    nextAction: z.string(),
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
  FileCreatedSchema,
  FileModifiedSchema,
  FileDeletedSchema,
  DecisionMadeSchema,
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
  FILE_CREATED = 'file_created',
  FILE_MODIFIED = 'file_modified',
  FILE_DELETED = 'file_deleted',
  DECISION_MADE = 'decision_made',
  MEMORY_WRITE = 'memory_write',
  ERROR = 'error',
}
