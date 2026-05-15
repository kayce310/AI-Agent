/**
 * Kato Agent — HookRegistry (Event Lifecycle System)
 * Phase 3.5 — Event-driven Engine
 *
 * Cho phép plugins can thiệp vào agent lifecycle:
 * - Logging: ghi lại mọi tool call
 * - Security: guard trước khi execute tool
 * - Memory: tự động lưu context
 * - Tracing: span tracking cho o11y
 */

// ── Event Types ──
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
  | 'model:error'
  | 'skill:load'
  | 'skill:unload';

// ── Hook Context ──
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

// ── HookRegistry ──
export class HookRegistry {
  private hooks = new Map<EventType, AgentHook[]>();

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
   * Emit an event, calling all registered handlers in priority order.
   * All handlers run sequentially (await) so they don't race.
   */
  async emit(event: EventType, data: Record<string, unknown> = {}): Promise<void> {
    const handlers = this.hooks.get(event);
    if (!handlers || handlers.length === 0) return;

    const ctx: HookContext = {
      event,
      timestamp: new Date().toISOString(),
      data,
    };

    for (const hook of handlers) {
      try {
        await hook.handler(ctx);
      } catch (err) {
        console.error(`[HOOK:${event}] Error in handler:`, err);
        // Don't throw — let other handlers run
      }
    }
  }

  /**
   * Remove all hooks for a specific event type.
   */
  clear(event?: EventType): void {
    if (event) {
      this.hooks.delete(event);
    } else {
      this.hooks.clear();
    }
  }

  /**
   * List all registered event types and handler counts.
   */
  summary(): Record<EventType, number> {
    const result: Record<string, number> = {};
    for (const [event, handlers] of this.hooks.entries()) {
      result[event] = handlers.length;
    }
    return result as Record<EventType, number>;
  }
}

// ── Singleton ──
export const globalHooks = new HookRegistry();

export default HookRegistry;