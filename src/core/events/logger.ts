/**
 * @file Structured Logger — Event-based logging
 * @layer core
 * @created 2026-06-20
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

  toolCall(toolName: string, args: Record<string, unknown>): void {
    this.bus.publish(EventFactory.toolCalled(toolName, args));
  }

  toolResult(toolName: string, args: Record<string, unknown>, result: string, success: boolean, duration: number): void {
    this.bus.publish(EventFactory.toolFinished(toolName, args, result, success, duration));
  }

  memoryWrite(key: string, value: string, scope: 'user' | 'memory' | 'session'): void {
    this.bus.publish(EventFactory.memoryWrite(key, value, scope));
  }

  error(message: string, stack?: string, code?: string): void {
    this.bus.publish(EventFactory.error(message, stack, code));
  }
}
