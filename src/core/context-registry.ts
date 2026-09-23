/**
 * @file context-registry — ContextSourceRegistry enforcement boundary
 * @layer core
 * @owner core-context
 */

import { ContextSource } from './context-source.js';
import { Logger } from './logger.js';

const log = new Logger({ module: 'ContextRegistry' });

export class ContextSourceRegistry {
  private readonly sources = new Map<string, ContextSource>();

  /** Register a new ContextSource. Throws on duplicate ID or invalid source. */
  register(source: ContextSource): void {
    if (typeof source.id !== 'string' || source.id.trim() === '') {
      log.warn(`[ContextRegistry] Rejecting source with invalid id: ${String(source.id)}`);
      return;
    }
    if (this.sources.has(source.id)) {
      throw new Error(`Duplicate ContextSource id: "${source.id}"`);
    }
    if (typeof source.budgetClaim !== 'number' || source.budgetClaim < 0) {
      log.warn(`[ContextRegistry] Rejecting source "${source.id}": invalid budgetClaim=${source.budgetClaim}`);
      return;
    }
    if (typeof source.isActive !== 'function') {
      log.warn(`[ContextRegistry] Rejecting source "${source.id}": missing isActive()`);
      return;
    }
    this.sources.set(source.id, source);
    log.debug(`[ContextRegistry] Registered source: ${source.id}`);
  }

  /** Unregister a source. */
  unregister(sourceId: string): void {
    this.sources.delete(sourceId);
  }

  /** Get a registered source by ID. */
  get(sourceId: string): ContextSource | undefined {
    return this.sources.get(sourceId);
  }

  /**
   * Validate a source before registration (returns true if valid).
   */
  validate(source: ContextSource): boolean {
    return (
      typeof source.id === 'string' &&
      source.id.trim() !== '' &&
      typeof source.budgetClaim === 'number' &&
      source.budgetClaim >= 0 &&
      typeof source.isActive === 'function' &&
      !this.sources.has(source.id)
    );
  }

  /**
   * Get all active sources for a request.
   * Unregistered sources are NOT included (enforcement boundary).
   */
  getActive(sessionId: string, taskId: string): ContextSource[] {
    const active: ContextSource[] = [];
    for (const [id, source] of this.sources) {
      try {
        if (source.isActive(sessionId, taskId)) {
          active.push(source);
        }
      } catch (err: any) {
        log.warn(`[ContextRegistry] isActive() failed for "${id}": ${err.message}`);
      }
    }
    // Deterministic ordering by source id
    active.sort((a, b) => a.id.localeCompare(b.id));
    return active;
  }
}
