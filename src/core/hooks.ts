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
  | 'model:intermediate_response'
  | 'model:error'
  | 'skill:load'
  | 'skill:unload'
  // Phase 5.2 — Orchestrator events
  | 'orchestrator:decompose-start'
  | 'orchestrator:decompose-end'
  | 'orchestrator:execute-start'
  | 'orchestrator:execute-end'
  | 'orchestrator:synthesize-start'
  | 'orchestrator:synthesize-end';

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

// ── Guard Types ──
export interface GuardResult {
  allowed: boolean;
  reason?: string;
}

export type GuardHandler = (context: HookContext) => Promise<GuardResult>;

export interface AgentGuard {
  event: EventType;
  handler: GuardHandler;
  priority?: number;
}

// ── HookRegistry ──
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
  before(event: EventType, handler: GuardHandler, priority = 0): () => void {
    const guard: AgentGuard = { event, handler, priority };
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

    // ── Guards (run first) ──
    const guards = this.guards.get(event);
    if (guards && guards.length > 0) {
      for (const guard of guards) {
        try {
          const result = await guard.handler(ctx);
          if (!result.allowed) {
            console.warn(`[GUARD:${event}] Blocked: ${result.reason ?? 'no reason'}`);
            return false;
          }
        } catch (err) {
          console.error(`[GUARD:${event}] Error in guard:`, err);
          // Guard error → block by default (fail-closed)
          console.warn(`[GUARD:${event}] Blocked due to guard error`);
          return false;
        }
      }
    }

    // ── Hooks ──
    const handlers = this.hooks.get(event);
    if (!handlers || handlers.length === 0) return true;

    for (const hook of handlers) {
      try {
        await hook.handler(ctx);
      } catch (err) {
        console.error(`[HOOK:${event}] Error in handler:`, err);
        // Don't throw — let other handlers run
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
    const allEvents = new Set([...this.hooks.keys(), ...this.guards.keys()]);
    for (const event of allEvents) {
      const hCount = this.hooks.get(event)?.length ?? 0;
      const gCount = this.guards.get(event)?.length ?? 0;
      result[event] = hCount + gCount;
    }
    return result;
  }
}

// ── Singleton ──
export const globalHooks = new HookRegistry();

export default HookRegistry;