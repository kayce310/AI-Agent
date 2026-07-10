/**
 * @file Event Bus — Publish/subscribe for agent events
 * @layer core
 * @created 2026-06-20
 */

import { AgentEvent } from './types.js';
import { EventStore } from './store.js';
import { EventValidator } from './validator.js';

export type EventHandler = (event: AgentEvent) => void;

export class EventBus {
  private store: EventStore;
  private handlers: Map<string, EventHandler[]> = new Map();
  private globalHandlers: EventHandler[] = [];

  constructor(store: EventStore) {
    this.store = store;
  }

  /**
   * Publish event to bus
   */
  publish(event: AgentEvent): void {
    // Validate event
    const validation = EventValidator.validate(event);
    if (!validation.valid) {
      console.error('[EventBus] Invalid event:', validation.errors);
      return;
    }

    // Persist to store
    this.store.append(event);
    console.log(`[EventBus] Published: ${event.type} id=${event.id?.slice(0,8)}`);

    // Notify type-specific handlers
    const typeHandlers = this.handlers.get(event.type) || [];
    typeHandlers.forEach(handler => {
      try {
        handler(event);
      } catch (error) {
        console.error(`[EventBus] Handler error for ${event.type}:`, error);
      }
    });

    // Notify global handlers
    this.globalHandlers.forEach(handler => {
      try {
        handler(event);
      } catch (error) {
        console.error('[EventBus] Global handler error:', error);
      }
    });
  }

  /**
   * Subscribe to specific event type
   */
  subscribe(type: string, handler: EventHandler): () => void {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, []);
    }
    this.handlers.get(type)!.push(handler);

    // Return unsubscribe function
    return () => {
      const handlers = this.handlers.get(type);
      if (handlers) {
        const index = handlers.indexOf(handler);
        if (index > -1) {
          handlers.splice(index, 1);
        }
      }
    };
  }

  /**
   * Subscribe to all events
   */
  subscribeAll(handler: EventHandler): () => void {
    this.globalHandlers.push(handler);

    return () => {
      const index = this.globalHandlers.indexOf(handler);
      if (index > -1) {
        this.globalHandlers.splice(index, 1);
      }
    };
  }

  /**
   * Get recent events from store
   */
  getRecent(limit: number = 50): AgentEvent[] {
    return this.store.getRecent(limit);
  }

  /**
   * Get events by task
   */
  getByTask(taskId: string): AgentEvent[] {
    return this.store.getByTask(taskId);
  }

  /**
   * Get event count by type
   */
  getCountByType(): Record<string, number> {
    return this.store.getCountByType();
  }
}
