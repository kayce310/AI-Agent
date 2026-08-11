/**
 * @file HITL Manager — Shared singleton
 * @layer core
 * @owner core-security
 *
 * Chia sẻ MỘT instance HITLManager giữa:
 *  - start-telegram.ts (wire Telegram bridge + onPending notify)
 *  - tool execution path (agent.ts guard → consequence read path Phase 2)
 *
 * Tránh "new song song không bridge": nếu agent path tự new HITLManager,
 * approve keyboard từ Telegram sẽ không resolve đúng instance chờ.
 */

import { HITLManager } from './hitl.js';

let _hitlInstance: HITLManager | null = null;

/**
 * Get the shared HITLManager singleton.
 * Lazy-create — an toàn khi gọi từ cả boot path lẫn tool path.
 */
export function getHITLManager(): HITLManager {
  if (!_hitlInstance) {
    _hitlInstance = new HITLManager();
  }
  return _hitlInstance;
}

/**
 * Test helper: reset singleton (dùng trong test isolation).
 */
export function resetHITLManager(): void {
  _hitlInstance = null;
}

export default getHITLManager;