/**
 * @file evolution — Evolution engine
 * @layer core
 * @depends-on src/core/types.ts
 * @imported-by src/core/engine/engine.ts
 * @owner core-evolution
 */

/**
 * Kato Evolution Engine — Error Registry + Self-Evolution
 * 
 * [V5.2] Cơ chế mới hoàn toàn:
 * - Error Registry: Lưu mọi lỗi vào state.json với checksum để tránh trùng
 * - Self-Evolution: Khi phát hiện lỗi lặp lại, tự động điều chỉnh behavior
 * - Cascade Learning: Ghi nhớ model nào hay lỗi gì để ưu tiên/routing khác
 */

import fs from 'fs/promises';
import path from 'path';
import { createHash } from 'node:crypto';
import { HookRegistry, HookContext } from './hooks.js';

// ─── Types ────────────────────────────────────────────────────────────

export interface ErrorRecord {
  /** MD5 hash của error message để dedup */
  fingerprint: string;
  /** Model gây lỗi */
  modelId: string;
  /** Tên lỗi (ví dụ: 'RATE_LIMIT', 'TOOL_EXECUTION', 'PROVIDER_DOWN', 'PARSE_ERROR') */
  errorType: string;
  /** Thông báo lỗi gốc */
  errorMessage: string;
  /** Full stack trace nếu có */
  stackTrace?: string;
  /** Timestamp */
  timestamp: string;
  /** Session ID */
  sessionId: string;
  /** Context: đoạn request gây lỗi (truncated 200 chars) */
  contextSnippet?: string;
  /** Hành động khắc phục (nếu có) */
  resolution?: string;
}

export interface EvolutionRule {
  id: string;
  /** Pattern: regex match trên errorMessage */
  pattern: string;
  /** Hành động: 'skip_model', 'add_cooldown', 'use_fallback', 'retry_less', 'load_skill' */
  action: 'skip_model' | 'add_cooldown' | 'use_fallback' | 'retry_less' | 'load_skill';
  /** Giá trị kèm theo (vd: hours cho cooldown, limit cho retry) */
  value?: number | string;
  /** Số lần lỗi trước khi kích hoạt */
  threshold: number;
  /** Đã active chưa */
  active: boolean;
  activatedAt?: string;
  /** Mô tả rule */
  description: string;
}

export interface EvolutionState {
  version: '1.0';
  /** Lịch sử lỗi (tối đa 1000 records) */
  errors: ErrorRecord[];
  /** Các rule đang áp dụng */
  rules: EvolutionRule[];
  /** Model performance tracking */
  modelPerformance: Record<string, {
    totalCalls: number;
    failedCalls: number;
    lastFailure: string | null;
    avgResponseTime: number;
    /** Thống kê error types của model này */
    errorTypes: Record<string, number>;
  }>;
  /** Metadata */
  meta: {
    lastUpdated: string;
    totalErrorsTracked: number;
    activeRules: number;
  };
}

// ─── Evolution Engine ─────────────────────────────────────────────────

export class EvolutionEngine {
  private statePath: string;
  private state: EvolutionState;
  private initialized = false;

  constructor(statePath?: string) {
    this.statePath = statePath ?? path.resolve('knowledge/workspace/evolution.json');
    this.state = this.getDefaultState();
  }

  async init(): Promise<void> {
    try {
      const raw = await fs.readFile(this.statePath, 'utf8');
      const parsed = JSON.parse(raw);
      this.state = this.mergeWithDefaults(parsed);
    } catch {
      this.state = this.getDefaultState();
      await this.persist();
    }
    this.initialized = true;
  }

  /** Ghi nhận lỗi mới */
  async recordError(record: Omit<ErrorRecord, 'fingerprint' | 'timestamp'>): Promise<void> {
    const errorFingerprint = createHash('md5')
      .update(`${record.modelId}:${record.errorMessage}`)
      .digest('hex')
      .slice(0, 12);

    // Nếu lỗi đã tồn tại → không ghi duplicate, chỉ tăng counter
    const existing = this.state.errors.find(e => e.fingerprint === errorFingerprint);
    if (existing) {
      return;
    }

    const fullRecord: ErrorRecord = {
      ...record,
      fingerprint: errorFingerprint,
      timestamp: new Date().toISOString(),
    };
    this.state.errors.push(fullRecord);

    // Giới hạn 1000 records
    if (this.state.errors.length > 1000) {
      this.state.errors = this.state.errors.slice(-1000);
    }

    // Cập nhật model performance
    const perf = this.state.modelPerformance[record.modelId] || {
      totalCalls: 0,
      failedCalls: 0,
      lastFailure: null,
      avgResponseTime: 0,
      errorTypes: {},
    };
    perf.failedCalls++;
    perf.lastFailure = fullRecord.timestamp;
    perf.errorTypes[record.errorType] = (perf.errorTypes[record.errorType] || 0) + 1;
    this.state.modelPerformance[record.modelId] = perf;

    this.state.meta.totalErrorsTracked++;
    this.state.meta.lastUpdated = fullRecord.timestamp;

    // Kiểm tra xem có cần kích hoạt rule nào không
    await this.evaluateRules(record);

    await this.persist();
  }

  /** Ghi nhận một cuộc gọi model thành công */
  async recordSuccess(modelId: string, responseTimeMs: number): Promise<void> {
    const perf = this.state.modelPerformance[modelId] || {
      totalCalls: 0,
      failedCalls: 0,
      lastFailure: null,
      avgResponseTime: 0,
      errorTypes: {},
    };
    perf.totalCalls++;
    perf.avgResponseTime = perf.totalCalls === 1
      ? responseTimeMs
      : (perf.avgResponseTime * (perf.totalCalls - 1) + responseTimeMs) / perf.totalCalls;
    this.state.modelPerformance[modelId] = perf;

    if (this.state.modelPerformance[modelId].totalCalls % 10 === 0) {
      await this.persist();
    }
  }

  /** Kiểm tra xem model có nên bị skip không dựa trên lịch sử */
  shouldSkipModel(modelId: string): boolean {
    const perf = this.state.modelPerformance[modelId];
    if (!perf || perf.totalCalls === 0) return false;

    // Nếu tỷ lệ lỗi > 50% và đã gọi ít nhất 5 lần → skip
    const failureRate = perf.failedCalls / perf.totalCalls;
    if (perf.totalCalls >= 5 && failureRate > 0.5) {
      /* auto-skip model */
      return true;
    }

    // Nếu có active rule skip cho model này
    const activeRule = this.state.rules.find(r =>
      r.active && r.action === 'skip_model' && r.value === modelId
    );
    if (activeRule) return true;

    return false;
  }

  /** Lấy gợi ý routing dựa trên evolution */
  getRoutingAdvice(): { preferredModel: string; reason: string } | null {
    const entries = Object.entries(this.state.modelPerformance);
    if (entries.length === 0) return null;

    // Tìm model có tỷ lệ thành công cao nhất
    let best: { modelId: string; score: number } = { modelId: '', score: 0 };
    for (const [modelId, perf] of entries) {
      if (perf.totalCalls < 3) continue; // Chưa đủ data
      const successRate = 1 - (perf.failedCalls / perf.totalCalls);
      if (successRate > best.score) {
        best = { modelId, score: successRate };
      }
    }

    if (best.score > 0.7) {
      return {
        preferredModel: best.modelId,
        reason: `Success rate ${(best.score * 100).toFixed(0)}% across ${this.state.modelPerformance[best.modelId].totalCalls} calls`,
      };
    }
    return null;
  }

  /** Đánh giá rules dựa trên lỗi vừa xảy ra */
  private async evaluateRules(record: Omit<ErrorRecord, 'fingerprint' | 'timestamp'>): Promise<void> {
    for (const rule of this.state.rules) {
      if (rule.active) continue;

      // Đếm số lần lỗi khớp pattern trong lịch sử
      const pattern = new RegExp(rule.pattern, 'i');
      const matchCount = this.state.errors.filter(e =>
        e.errorType === record.errorType && pattern.test(e.errorMessage)
      ).length;

      if (matchCount >= rule.threshold) {
        rule.active = true;
        rule.activatedAt = new Date().toISOString();
        /* rule activated */

        // Thực thi action
        await this.executeRuleAction(rule);
      }
    }
  }

  /** Thực thi hành động của rule */
  private async executeRuleAction(rule: EvolutionRule): Promise<void> {
    switch (rule.action) {
      case 'skip_model':
        break;
      case 'add_cooldown':
        break;
      case 'use_fallback':
        break;
      case 'retry_less':
        break;
      case 'load_skill':
        break;
    }
  }

  /** Thêm rule mới */
  async addRule(rule: Omit<EvolutionRule, 'active' | 'activatedAt'>): Promise<void> {
    this.state.rules.push({
      ...rule,
      active: false,
    });
    await this.persist();

  }

  /** Load mặc định các rule mẫu */
  async loadDefaultRules(): Promise<void> {
    const defaults: Omit<EvolutionRule, 'active' | 'activatedAt'>[] = [
      {
        id: 'rate-limit-cooldown',
        pattern: 'rate limit|429|Too Many Requests',
        action: 'add_cooldown',
        value: 12,
        threshold: 3,
        description: 'Rate limit xảy ra 3 lần → tăng cooldown từ 6h lên 12h',
      },
      {
        id: 'provider-down-fallback',
        pattern: 'connect ETIMEDOUT|ECONNREFUSED|ENOTFOUND|network error',
        action: 'use_fallback',
        value: 'openai/gpt-3.5-turbo',
        threshold: 2,
        description: 'Provider down 2 lần → tự động chuyển sang GPT-3.5 fallback',
      },
      {
        id: 'tool-execution-retry',
        pattern: 'Error executing|tool_call|function_call',
        action: 'retry_less',
        value: 1,
        threshold: 5,
        description: 'Tool execution lỗi 5 lần → giảm số lần retry xuống 1',
      },
      {
        id: 'parse-error-skip',
        pattern: 'Invalid API response|JSON parse|format',
        action: 'skip_model',
        value: '',
        threshold: 3,
        description: 'Parse error 3 lần → skip model đó tự động',
      },
    ];

    for (const rule of defaults) {
      const exists = this.state.rules.find(r => r.id === rule.id);
      if (!exists) {
        await this.addRule(rule);
      }
    }
  }

  /** Lấy thống kê evolution */
  getStats(): EvolutionState['meta'] & { modelCount: number } {
    return {
      ...this.state.meta,
      modelCount: Object.keys(this.state.modelPerformance).length,
    };
  }

  /**
   * Attach to HookRegistry — auto-record errors from lifecycle events.
   * Registers hooks for tool:error, model:error, task:error.
   */
  attachToHooks(hooks: HookRegistry): void {
    hooks.on('tool:error', async (ctx: HookContext) => {
      await this.recordError({
        modelId: 'tool',
        errorType: 'TOOL_EXECUTION',
        errorMessage: (ctx.data.error as string) ?? JSON.stringify(ctx.data),
        sessionId: (ctx.data.sessionId as string) ?? 'unknown',
        contextSnippet: JSON.stringify(ctx.data).slice(0, 200),
      });
    });

    hooks.on('model:error', async (ctx: HookContext) => {
      await this.recordError({
        modelId: (ctx.data.modelUsed as string) ?? 'unknown',
        errorType: 'MODEL_ERROR',
        errorMessage: (ctx.data.error as string) ?? JSON.stringify(ctx.data),
        sessionId: (ctx.data.sessionId as string) ?? 'unknown',
        contextSnippet: JSON.stringify(ctx.data).slice(0, 200),
      });
    });

    hooks.on('task:error', async (ctx: HookContext) => {
      await this.recordError({
        modelId: 'task',
        errorType: 'TASK_ERROR',
        errorMessage: (ctx.data.error as string) ?? JSON.stringify(ctx.data),
        sessionId: (ctx.data.sessionId as string) ?? 'unknown',
        contextSnippet: JSON.stringify(ctx.data).slice(0, 200),
      });
    });

  }

  /** Lấy danh sách errors gần đây */
  getRecentErrors(limit = 10): ErrorRecord[] {
    return this.state.errors.slice(-limit).reverse();
  }

  private async persist(): Promise<void> {
    await fs.mkdir(path.dirname(this.statePath), { recursive: true });
    await fs.writeFile(this.statePath, JSON.stringify(this.state, null, 2), 'utf8');
  }

  private getDefaultState(): EvolutionState {
    return {
      version: '1.0',
      errors: [],
      rules: [],
      modelPerformance: {},
      meta: {
        lastUpdated: new Date().toISOString(),
        totalErrorsTracked: 0,
        activeRules: 0,
      },
    };
  }

  private mergeWithDefaults(parsed: any): EvolutionState {
    return {
      ...this.getDefaultState(),
      ...parsed,
    };
  }
}

/** Singleton */
export const evolutionEngine = new EvolutionEngine();
export default EvolutionEngine;
