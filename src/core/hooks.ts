/**
 * @file hooks â€” Event lifecycle hooks
 * @layer core
 * @depends-on (none â€” standalone)
 * @imported-by src/core/engine/engine.ts
 * @owner core-hooks
 */

/**
 * Coral Agent â€” HookRegistry (Event Lifecycle System)
 * Phase 3.5 â€” Event-driven Engine
 *
 * Cho phÃ©p plugins can thiá»‡p vÃ o agent lifecycle:
 * - Logging: ghi láº¡i má»i tool call
 * - Security: guard trÆ°á»›c khi execute tool
 * - Memory: tá»± Ä‘á»™ng lÆ°u context
 * - Tracing: span tracking cho o11y
 */

import { Logger } from './logger.js';

const log = new Logger({ module: 'Hooks' });

// â€"â€" Event Types â€"â€"
export type EventType =
  | 'task:start'
  | 'task:complete'
  | 'task:error'
  | 'tool:call'
  | 'tool:result'
  | 'tool:error'
  | 'memory:write'
  | 'memory:read'
  | 'model:invoke'
  | 'model:response'
  | 'model:intermediate_response'
  | 'model:error'
  | 'skill:load'
  | 'skill:unload'
  | 'context:compressed'
  | 'context:evicted'
  // Phase 5.2 â€” Orchestrator events
  | 'orchestrator:decompose-start'
  | 'orchestrator:decompose-end'
  | 'orchestrator:execute-start'
  | 'orchestrator:execute-end'
  | 'orchestrator:synthesize-start'
  | 'orchestrator:synthesize-end';

// â”€â”€ Hook Context â”€â”€
export interface HookContext {
  event: EventType;
  timestamp: string;
  data: Record<string, unknown>;
}

export type HookHandler = (context: HookContext) => Promise<void>;

export interface AgentHook {
  event: EventType;
  handler: HookHandler;
  priority?: number; // higher = runs first, default 0
}

// â”€â”€ Guard Types â”€â”€
export interface GuardResult {
  allowed: boolean;
  reason?: string;
}

export type GuardHandler = (context: HookContext) => Promise<GuardResult>;

export interface AgentGuard {
  event: EventType;
  handler: GuardHandler;
  priority?: number;
  name?: string;
}

// â”€â”€ HookRegistry â”€â”€
export class HookRegistry {
  private hooks = new Map<EventType, AgentHook[]>();
  private guards = new Map<EventType, AgentGuard[]>();

  /**
   * Register a hook for a specific event type.
   * Returns an unsubscribe function.
   */
  on(event: EventType, handler: HookHandler, priority = 0): () => void {
    const hook: AgentHook = { event, handler, priority };
    const existing = this.hooks.get(event) || [];
    existing.push(hook);
    // Sort by priority descending (higher runs first)
    existing.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
    this.hooks.set(event, existing);

    return () => {
      const idx = (this.hooks.get(event) || []).indexOf(hook);
      if (idx !== -1) {
        this.hooks.get(event)!.splice(idx, 1);
      }
    };
  }

  /**
   * Register a guard for a specific event type.
   * Guards run BEFORE regular hooks. If ANY guard returns
   * { allowed: false }, the entire event is blocked:
   * no further guards or hooks run, and emit() returns false.
   * Returns an unsubscribe function.
   */
  before(event: EventType, handler: GuardHandler, priority = 0, name?: string): () => void {
    const guard: AgentGuard = { event, handler, priority, name };
    const existing = this.guards.get(event) || [];
    existing.push(guard);
    existing.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
    this.guards.set(event, existing);

    return () => {
      const idx = (this.guards.get(event) || []).indexOf(guard);
      if (idx !== -1) {
        this.guards.get(event)!.splice(idx, 1);
      }
    };
  }

  /**
   * Emit an event.
   *
   * 1. Guards run first (priority order).
   *    If any guard returns { allowed: false }, emit returns false
   *    and no hooks run.
   * 2. Hooks run sequentially (priority order).
   *
   * @returns true if allowed (no guard blocked), false if blocked.
   */
  async emit(event: EventType, data: Record<string, unknown> = {}): Promise<boolean> {
    const ctx: HookContext = {
      event,
      timestamp: new Date().toISOString(),
      data,
    };

    // â”€â”€ Guards (run first) â”€â”€
    const guards = this.guards.get(event);
    if (guards && guards.length > 0) {
      for (const guard of guards) {
        try {
          const result = await guard.handler(ctx);
          if (!result.allowed) {
            log.warn(`Guard "${guard.name}" blocked event "${event}"`);
            return false;
          }
        } catch (err) {
          log.error(`Guard "${guard.name}" error on event "${event}": ${String(err)}`);
          // Guard error → block by default (fail-closed)
          log.warn(`Event "${event}" blocked due to guard error`);
          return false;
        }
      }
    }

    // â”€â”€ Hooks â”€â”€
    const handlers = this.hooks.get(event);
    if (!handlers || handlers.length === 0) return true;

    for (const hook of handlers) {
      try {
        await hook.handler(ctx);
      } catch (err) {
        log.error(`Hook error on event "${event}": ${String(err)}`);
        // Don't throw â€” let other handlers run
      }
    }

    return true;
  }

  /**
   * Remove all hooks and guards for a specific event type,
   * or clear everything if no event type is given.
   */
  clear(event?: EventType): void {
    if (event) {
      this.hooks.delete(event);
      this.guards.delete(event);
    } else {
      this.hooks.clear();
      this.guards.clear();
    }
  }

  /**
   * List all registered event types with handler/guard counts.
   */
  summary(): Record<string, number> {
    const result: Record<string, number> = {};
    const allEvents = new Set([...Array.from(this.hooks.keys()), ...Array.from(this.guards.keys())]);
    for (const event of Array.from(allEvents)) {
      const hCount = this.hooks.get(event)?.length ?? 0;
      const gCount = this.guards.get(event)?.length ?? 0;
      result[event] = hCount + gCount;
    }
    return result;
  }
}

// â”€â”€ Singleton â”€â”€
export const globalHooks = new HookRegistry();

export default HookRegistry;