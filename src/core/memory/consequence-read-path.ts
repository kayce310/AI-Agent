/**
 * @file Consequence Memory — Read Path + Controlled Intervention (Phase 2)
 * @layer core
 * @owner core-memory
 *
 * ADR-003 Phase 2 — read path + suggest + require_hitl. KHÔNG enforce block rộng.
 *
 * Đăng ký MỘT guard trên `globalHooks` cho 'tool:call' → áp cho cả parent loop
 * (agent.ts) lẫn subagent loop (delegate.ts), vì cả hai emit 'tool:call' qua globalHooks.
 *
 * Decision table (runtime):
 *   - Không có record liên quan            → cho qua (allowed)
 *   - record_only                          → cho qua (log debug)
 *   - suggest / fail pattern nhẹ          → inject hint ngắn (không block)
 *   - require_hitl / fail lặp ≥ threshold  → HITL checkAndRequest trước execute
 *   - block                                → MẶC ĐỊNH KHÔNG enforce (chỉ allowlist hẹp, Phase 3)
 *
 * ADR-000:
 *   - Nguyên tắc 5: `lesson` KHÔNG BAO GIỜ là điều kiện quyết định. Quyết định dựa
 *     outcome + evidenceRef + failCount + reusePolicy (đã lưu), không dựa lesson text.
 *   - Fail-open cho nhánh suggest; HITL deny → block (fail-closed chỉ khi policy yêu cầu).
 *   - Single-writer vẫn là ConsequenceStore — module này chỉ ĐỌC, không ghi.
 */

import { Logger } from '../logger.js';
import { globalHooks } from '../hooks.js';
import { getRequestContext, ConsequenceHint } from '../request-context.js';
import { getHITLManager } from '../security/hitl-manager.js';
import { ConsequenceStore, getConsequenceStore } from './consequence-store.js';
import { ReusePolicy } from './consequence-types.js';
import { buildArgsDigest } from './consequence-redact.js';
import { loadConsequenceConfig } from './consequence-config.js';

const log = new Logger({ module: 'ConsequenceRead' });

// ── Threshold constants (explicit, không magic number rải rác) ──
/** Số fail cùng tool trong CÙNG session đủ để yêu cầu HITL. */
export const HITL_FAIL_THRESHOLD_SESSION = 2;
/** Số fail cùng tool trong WINDOW (cross-session) đủ để yêu cầu HITL. */
export const HITL_FAIL_THRESHOLD_WINDOW = 3;
/** Số fail cùng tool trong window đủ để BLOCK (chỉ khi tool ∈ allowlist). */
export const BLOCK_FAIL_THRESHOLD_WINDOW = 5;
/** Cửa sổ aggregation cross-session (7 ngày). */
export const AGGREGATION_WINDOW_MS = 7 * 24 * 3600 * 1000;
/** Số record tối đa lookup trả về. */
export const LOOKUP_LIMIT = 20;
/** Tool đặc biệt mức plan — không lookup/HITL. */
const PLAN_TERMINAL_TOOL = '__plan__';

/**
 * BLOCK_ALLOWLIST — tool được phép hard-deny khi đủ ngưỡng + evidence.
 * MẶC ĐỊNH RỖNG (an toàn). Chỉ thêm tool cực nguy hiểm khi có nhu cầu thật.
 * KHÔNG đoán bừa list dài.
 */
export const BLOCK_ALLOWLIST: string[] = [];

/**
 * Interface cho data truyền vào tool:call hook (xem agent.ts emit site).
 */
interface ToolCallHookData {
  sessionId?: string;
  toolName?: string;
  toolArgs?: unknown;
  cycle?: number;
  [key: string]: unknown;
}

/**
 * Quyết định can thiệp dựa trên lookup result.
 * KHÔNG dựa lesson text — chỉ outcome + policy + failCount.
 */
export interface ConsequenceDecision {
  /** 'allow' | 'suggest' | 'require_hitl' | 'block' */
  action: 'allow' | 'suggest' | 'require_hitl' | 'block';
  /** Policy mạnh nhất từ lookup. */
  policy: ReusePolicy;
  /** Hint ngắn cho suggest (mô tả, KHÔNG phải điều kiện). */
  hint?: string;
  /** evidenceRef ids để HITL reason. */
  evidenceIds: string[];
  failCountSession: number;
  failCountWindow: number;
  /** Reason code structured (không dùng lesson làm proof). */
  reasonCode?: string;
}

/**
 * Resolve decision từ lookup result (Phase 3).
 * Decision table:
 *   - miss / record_only            → allow
 *   - suggest / fail nhẹ            → suggest (không block)
 *   - require_hitl HOẶC failSession ≥ 2 HOẶC failWindow ≥ 3 → HITL
 *   - block + tool ∈ allowlist + failWindow ≥ 5 + evidence → deny
 *   - block ngoài allowlist         → KHÔNG block (fallback HITL/allow)
 */
export function resolveDecision(
  lookup: {
    maxPolicy: ReusePolicy;
    failCountSession: number;
    failCountWindow: number;
    evidenceIds: string[];
  },
  opts: {
    toolName?: string;
    blockAllowlist?: string[];
    enforceBlock?: boolean;
    hitlFailThresholdSession?: number;
    hitlFailThresholdWindow?: number;
    blockFailThresholdWindow?: number;
  } = {},
): ConsequenceDecision {
  const { maxPolicy, failCountSession, failCountWindow, evidenceIds } = lookup;
  const toolName = opts.toolName;
  const blockAllowlist = opts.blockAllowlist ?? BLOCK_ALLOWLIST;
  const enforceBlock = opts.enforceBlock ?? false;
  const hitlSessionThreshold = opts.hitlFailThresholdSession ?? HITL_FAIL_THRESHOLD_SESSION;
  const hitlWindowThreshold = opts.hitlFailThresholdWindow ?? HITL_FAIL_THRESHOLD_WINDOW;
  const blockWindowThreshold = opts.blockFailThresholdWindow ?? BLOCK_FAIL_THRESHOLD_WINDOW;

  // ── BLOCK: chỉ khi tool ∈ allowlist + đủ ngưỡng + evidence + enforceBlock ──
  if (
    maxPolicy === 'block' &&
    enforceBlock &&
    toolName &&
    blockAllowlist.includes(toolName) &&
    failCountWindow >= blockWindowThreshold &&
    evidenceIds.length > 0
  ) {
    return {
      action: 'block',
      policy: 'block',
      evidenceIds,
      failCountSession,
      failCountWindow,
      reasonCode: 'consequence_block_allowlist',
    };
  }

  // ── HITL: require_hitl OR failSession >= threshold OR failWindow >= threshold ──
  if (
    maxPolicy === 'require_hitl' ||
    failCountSession >= hitlSessionThreshold ||
    failCountWindow >= hitlWindowThreshold
  ) {
    const reasonCode = failCountWindow >= hitlWindowThreshold
      ? 'consequence_require_hitl_window'
      : 'consequence_require_hitl_session';
    return {
      action: 'require_hitl',
      policy: maxPolicy,
      evidenceIds,
      failCountSession,
      failCountWindow,
      reasonCode,
    };
  }

  // ── SUGGEST: policy suggest hoặc fail nhẹ ──
  if (maxPolicy === 'suggest' || failCountWindow >= 1) {
    return {
      action: 'suggest',
      policy: maxPolicy,
      evidenceIds,
      failCountSession,
      failCountWindow,
      reasonCode: 'consequence_suggest',
    };
  }

  // ── ALLOW ──
  return {
    action: 'allow',
    policy: 'record_only',
    evidenceIds,
    failCountSession,
    failCountWindow,
  };
}

/**
 * Build hint ngắn cho suggest (mô tả, KHÔNG phải điều kiện block).
 * Chỉ dùng outcome + failCount, không dùng lesson làm điều kiện.
 */
export function buildSuggestHint(
  toolName: string,
  failCountSession: number,
  failCountWindow: number,
): string {
  return `[consequence] Tool "${toolName}" đã fail ${failCountSession} lần (session) / ${failCountWindow} lần (7 ngày). Cân nhắc hướng khác hoặc kiểm tra điều kiện trước khi thử lại.`;
}

/**
 * Đặt consequenceHint có cấu trúc vào request context (Phase 3b).
 * Model-path đọc hint này để biết tín hiệu — nhưng quyết định vẫn ở read-path.
 * Fail-open: lỗi set hint không làm chết request.
 */
export function setConsequenceHint(opts: {
  decision: ConsequenceDecision;
  toolName: string;
  sessionId?: string;
  rctx?: { consequenceHint?: ConsequenceHint } | null;
}): void {
  const { decision, toolName, sessionId, rctx } = opts;
  try {
    const ctx = rctx ?? getRequestContext();
    if (!ctx) return;
    ctx.consequenceHint = {
      toolName,
      policy: decision.policy,
      failCountSession: decision.failCountSession,
      failCountWindow: decision.failCountWindow,
      evidenceRef: decision.evidenceIds.length > 0
        ? { checkpointId: decision.evidenceIds[0] }
        : undefined,
      reasonCode: decision.reasonCode,
    };
  } catch (err) {
    // Fail-open: không để lỗi set hint làm crash request.
    log.warn(`[Consequence] set hint failed (fail-open): ${String(err)}`);
  }
}

/**
 * Render consequenceHint thành 1 block ngắn cho prompt (≤500 chars).
 * Chỉ mô tả vận hành + counts + reasonCode — CẤM dán raw args/secret.
 * KHÔNG ra lệnh model "bạn phải block" nếu policy chỉ là suggest.
 */
export function renderConsequenceHint(hint: ConsequenceHint): string {
  const parts = [
    `[Consequence] ${hint.toolName}: ${hint.failCountSession} fail (session) / ${hint.failCountWindow} fail (7 ngày)`,
  ];
  if (hint.reasonCode) parts.push(`reason=${hint.reasonCode}`);
  if (hint.evidenceRef?.checkpointId) parts.push(`evidence=${hint.evidenceRef.checkpointId}`);
  if (hint.policy === 'suggest') {
    parts.push('Lưu ý vận hành: hãy kiểm tra điều kiện trước khi thử lại tool này.');
  }
  return parts.join(' | ').slice(0, 500);
}

/**
 * Register read path guard trên globalHooks.
 * Idempotent — unsubscribe previous trước khi đăng ký mới.
 */
let unsubscribed: (() => void) | null = null;

export function registerConsequenceReadPath(opts: {
  store?: ConsequenceStore;
  hitl?: { checkAndRequest: (action: any, options?: any) => Promise<string> };
  enforceBlock?: boolean;
  blockAllowlist?: string[];
  config?: import('./consequence-config.js').ConsequenceConfig;
} = {}): () => void {
  if (unsubscribed) {
    unsubscribed();
    unsubscribed = null;
  }

  const store = opts.store ?? getConsequenceStore();
  const hitl = opts.hitl ?? getHITLManager();
  // Config: env-driven, mặc định giống Phase 3. opts ghi đè cho test.
  const config = opts.config ?? loadConsequenceConfig();
  const enforceBlock = opts.enforceBlock ?? config.enforceBlock;
  const blockAllowlist = opts.blockAllowlist ?? config.blockAllowlist;

  const guard = async (ctx: { data: Record<string, unknown> }): Promise<{ allowed: boolean; reason?: string }> => {
    const data = ctx.data as ToolCallHookData;
    const toolName = data.toolName;
    if (!toolName || toolName === PLAN_TERMINAL_TOOL) {
      return { allowed: true };
    }

    const rctx = getRequestContext();
    const sessionId = data.sessionId || rctx?.sessionId;
    // Q3: userId thật của request — read path chỉ nhìn record của user này.
    const userId = rctx?.userId;

    try {
      // 1. Lookup (window cross-session + argsDigest), cách ly theo userId
      const argsDigest = buildArgsDigest(
        typeof data.toolArgs === 'object' && data.toolArgs !== null
          ? (data.toolArgs as Record<string, unknown>)
          : undefined,
      );
      const lookup = store.findRelevantForToolCall({
        toolName,
        argsDigest,
        sessionId,
        userId,
        windowMs: config.windowMs,
        limit: LOOKUP_LIMIT,
      });

      // 2. Resolve decision
      const decision = resolveDecision(lookup, {
        toolName,
        blockAllowlist,
        enforceBlock,
        hitlFailThresholdSession: config.hitlFailThresholdSession,
        hitlFailThresholdWindow: config.hitlFailThresholdWindow,
        blockFailThresholdWindow: config.blockFailThresholdWindow,
      });

      // 3. Observability: log lookup hit/miss + policy
      if (decision.action !== 'allow') {
        log.info(`[Consequence] tool=${toolName} policy=${decision.policy} action=${decision.action} failSession=${decision.failCountSession} failWindow=${decision.failCountWindow} reason=${decision.reasonCode ?? ''} evidence=${decision.evidenceIds.join(',')}`);
      } else {
        log.debug(`[Consequence] tool=${toolName} no intervention (policy=${decision.policy})`);
      }

      // 4. block (chỉ khi enforceBlock + allowlist + ngưỡng) → deny
      if (decision.action === 'block') {
        return {
          allowed: false,
          reason: `${decision.reasonCode}: ${toolName} blocked by consequence policy (fail ${decision.failCountWindow} trong window, evidence ${decision.evidenceIds.join(',')})`,
        };
      }

      // 5. require_hitl → HITL thật
      if (decision.action === 'require_hitl') {
        const hitlArgsDigest = buildArgsDigest(
          typeof data.toolArgs === 'object' && data.toolArgs !== null
            ? (data.toolArgs as Record<string, unknown>)
            : undefined,
        );
        const status = await hitl.checkAndRequest(
          {
            type: 'tool_call',
            name: toolName,
            args: { argsDigest: hitlArgsDigest },
            description: `Consequence policy yêu cầu phê duyệt trước khi gọi ${toolName} (fail ${decision.failCountSession} session / ${decision.failCountWindow} window). Evidence: ${decision.evidenceIds.join(',')}`,
          },
          { userId: sessionId ?? 'unknown' },
        );

        if (status === 'approved' || status === 'allowed') {
          log.info(`[Consequence] HITL approved tool=${toolName}`);
          // Sau approve vẫn đặt hint nhắc nhẹ (không bắt buộc, fail-open nếu lỗi)
          setConsequenceHint({ decision, toolName, sessionId, rctx });
          return { allowed: true };
        }
        // denied / expired / rejected → block tool
        log.warn(`[Consequence] HITL ${status} tool=${toolName} — tool blocked`);
        return { allowed: false, reason: `${decision.reasonCode}: ${toolName} not approved (${status})` };
      }

      // 6. suggest → không block; đặt hint có cấu trúc cho model (Phase 3b).
      if (decision.action === 'suggest') {
        log.info(`[Consequence] suggest tool=${toolName} hint="${buildSuggestHint(toolName, decision.failCountSession, decision.failCountWindow)}"`);
        setConsequenceHint({ decision, toolName, sessionId, rctx });
        return { allowed: true };
      }

      // 7. allow / record_only → cho qua
      return { allowed: true };
    } catch (err) {
      // Fail-open: lookup/HITL lỗi không được làm chết request cho nhánh suggest/allow.
      log.warn(`[Consequence] read path error (fail-open): ${String(err)}`);
      return { allowed: true };
    }
  };

  unsubscribed = globalHooks.before('tool:call', guard, 70, 'consequence-read-path');
  log.info('[Consequence] read path registered on globalHooks (tool:call)');
  return () => {
    if (unsubscribed) {
      unsubscribed();
      unsubscribed = null;
    }
  };
}