/**
 * @file engine-instance — singleton registry cho production entry (start-telegram.ts).
 * commands.ts (/cancel, gateway-cancel-source P1) cần truy cập Engine để abort
 * request đang chạy. Engine tự đăng ký trong init() — không cần sửa entry script.
 * @layer core
 */
import type { Engine } from './engine.js';

let instance: Engine | null = null;

export function setEngineInstance(engine: Engine | null): void {
  instance = engine;
}

export function getEngineInstance(): Engine | null {
  return instance;
}
