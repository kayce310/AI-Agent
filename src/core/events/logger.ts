/**
 * @file Structured Logger — Event-based logging
 * @layer core
 * @created 2026-06-20
 * @updated 2026-06-21 — Phase 4A: decisionId linkage, reasoningSnippet, updated tool signatures
 */

import { EventBus } from './bus.js';
import { EventFactory } from './factory.js';

export class StructuredLogger {
  private bus: EventBus;

  constructor(bus: EventBus) {
    this.bus = bus;
  }

  taskCreated(goal: string, plan?: string[]): void {
    this.bus.publish(EventFactory.taskCreated(goal, plan));
  }

  taskStarted(taskId: string, goal: string): void {
    this.bus.publish(EventFactory.taskStarted(taskId, goal));
  }

  taskFinished(taskId: string, goal: string, success: boolean, duration: number, result?: string): void {
    this.bus.publish(EventFactory.taskFinished(taskId, goal, success, duration, result));
  }

  toolCall(taskId: string, decisionId: string, callId: string, toolName: string, args: Record<string, unknown>): void {
    this.bus.publish(EventFactory.toolCalled(taskId, decisionId, callId, toolName, args));
  }

  toolResult(
    taskId: string,
    decisionId: string,
    callId: string,
    toolName: string,
    success: boolean,
    durationMs: number,
    args?: Record<string, unknown>,
    result?: string
  ): void {
    this.bus.publish(EventFactory.toolFinished(taskId, decisionId, callId, toolName, success, durationMs, args, result));
  }

  fileCreated(taskId: string, filePath: string): void {
    this.bus.publish(EventFactory.fileCreated(taskId, filePath));
  }

  fileModified(taskId: string, filePath: string): void {
    this.bus.publish(EventFactory.fileModified(taskId, filePath));
  }

  fileDeleted(taskId: string, filePath: string): void {
    this.bus.publish(EventFactory.fileDeleted(taskId, filePath));
  }

  decisionMade(taskId: string, decisionId: string, decision: string, reason: string, nextAction: string, reasoningSnippet?: string): void {
    this.bus.publish(EventFactory.decisionMade(taskId, decisionId, decision, reason, nextAction, reasoningSnippet));
  }

  memoryWrite(key: string, value: string, scope: 'user' | 'memory' | 'session'): void {
    this.bus.publish(EventFactory.memoryWrite(key, value, scope));
  }

  error(message: string, stack?: string, code?: string): void {
    this.bus.publish(EventFactory.error(message, stack, code));
  }
}
