/**
 * @file Consequence Memory — Config (env-driven, defaults an toàn như Phase 3)
 * @layer core
 * @owner core-memory
 *
 * ADR-003 Phase 3b — config hóa threshold + allowlist qua env.
 * Mặc định GIỐNG Phase 3 nếu env absent.
 *
 * Env:
 *   CONSEQUENCE_HITL_FAIL_SESSION=2
 *   CONSEQUENCE_HITL_FAIL_WINDOW=3
 *   CONSEQUENCE_BLOCK_FAIL_WINDOW=5
 *   CONSEQUENCE_WINDOW_MS=604800000
 *   CONSEQUENCE_BLOCK_ALLOWLIST=            # CSV rỗng mặc định; ví dụ "run_shell,deploy_prod"
 *   CONSEQUENCE_ENFORCE_BLOCK=false
 */

export interface ConsequenceConfig {
  hitlFailThresholdSession: number;
  hitlFailThresholdWindow: number;
  blockFailThresholdWindow: number;
  windowMs: number;
  blockAllowlist: string[];
  enforceBlock: boolean;
}

/** Parse CSV "a,b,c" → ["a","b","c"] (trim, bỏ rỗng). */
export function parseCsvAllowlist(raw: string | undefined): string[] {
  if (!raw || raw.trim() === '') return [];
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/** Parse int env với default an toàn. */
function parseIntEnv(raw: string | undefined, fallback: number): number {
  if (raw === undefined || raw === '') return fallback;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

/**
 * Load config từ env. Mặc định giống Phase 3 constants.
 */
export function loadConsequenceConfig(env: NodeJS.ProcessEnv = process.env): ConsequenceConfig {
  return {
    hitlFailThresholdSession: parseIntEnv(env.CONSEQUENCE_HITL_FAIL_SESSION, 2),
    hitlFailThresholdWindow: parseIntEnv(env.CONSEQUENCE_HITL_FAIL_WINDOW, 3),
    blockFailThresholdWindow: parseIntEnv(env.CONSEQUENCE_BLOCK_FAIL_WINDOW, 5),
    windowMs: parseIntEnv(env.CONSEQUENCE_WINDOW_MS, 7 * 24 * 3600 * 1000),
    blockAllowlist: parseCsvAllowlist(env.CONSEQUENCE_BLOCK_ALLOWLIST),
    enforceBlock: (env.CONSEQUENCE_ENFORCE_BLOCK ?? 'false').toLowerCase() === 'true',
  };
}