/**
 * Kato PrivilegeGuard — Per-Tool RBAC (Role-Based Access Control)
 * Phase 8.2c — Tool Authorization
 *
 * Controls which tools can be called based on:
 * - Tool name patterns
 * - Session/agent tags
 * - Custom allow/deny rules
 *
 * Supports "restricted mode" for sensitive operations.
 */

// ── Types ──

/** A single privilege rule */
export interface PrivilegeRule {
  /** Tool name or glob pattern (e.g. "filesystem:*", "system:*") */
  toolPattern: string;
  /** Allow or deny */
  effect: 'allow' | 'deny';
  /** Optional — only apply if all tags match */
  requiredTags?: string[];
  /** Optional — reason for this rule */
  reason?: string;
}

export interface PrivilegeGuardConfig {
  /** Explicit privilege rules */
  rules?: PrivilegeRule[];
  /** Default effect when no rule matches */
  defaultEffect?: 'allow' | 'deny';
  /** Whether restricted mode is active */
  restrictedMode?: boolean;
  /** In restricted mode, only allow these tool patterns */
  restrictedAllowList?: string[];
}

export interface PrivilegeCheckResult {
  allowed: boolean;
  matchedRule: PrivilegeRule | null;
  reason?: string;
}

// ── Glob Matching (simple) ──

/**
 * Simple glob match supporting `*` (single segment) and `**` (multi segment).
 */
function globMatch(pattern: string, name: string): boolean {
  // Exact match
  if (pattern === name) return true;
  if (pattern === '*') return true;

  // Convert glob pattern to regex
  const regexStr =
    '^' +
    pattern
      .replace(/[.+^${}()|[\]\\]/g, '\\$&') // escape regex chars
      .replace(/\*\*/g, '<<<DOUBLESTAR>>>')
      .replace(/\*/g, '[^:]*')
      .replace(/<<<DOUBLESTAR>>>/g, '.*') +
    '$';

  return new RegExp(regexStr).test(name);
}

// ── PrivilegeGuard ──

export class PrivilegeGuard {
  private rules: PrivilegeRule[];
  private defaultEffect: 'allow' | 'deny';
  private restrictedMode: boolean;
  private restrictedAllowList: string[];

  constructor(config: PrivilegeGuardConfig = {}) {
    this.rules = config.rules ?? [];
    this.defaultEffect = config.defaultEffect ?? 'allow';
    this.restrictedMode = config.restrictedMode ?? false;
    this.restrictedAllowList = config.restrictedAllowList ?? [];
  }

  /**
   * Add a privilege rule.
   */
  addRule(rule: PrivilegeRule): void {
    this.rules.push(rule);
  }

  /**
   * Check if a tool call is allowed.
   */
  check(toolName: string, tags?: string[]): PrivilegeCheckResult {
    // Restricted mode: only allow listed patterns
    if (this.restrictedMode) {
      for (const allowed of this.restrictedAllowList) {
        if (globMatch(allowed, toolName)) {
          return { allowed: true, matchedRule: null, reason: 'Restricted mode allow list match' };
        }
      }
      return {
        allowed: false,
        matchedRule: null,
        reason: `Restricted mode: tool "${toolName}" not in allow list`,
      };
    }

    // Evaluate rules in order (first match wins)
    for (const rule of this.rules) {
      if (!globMatch(rule.toolPattern, toolName)) continue;

      // Check tags if required
      if (rule.requiredTags && rule.requiredTags.length > 0) {
        if (!tags || tags.length === 0) continue;
        const hasAll = rule.requiredTags.every((t) => tags.includes(t));
        if (!hasAll) continue;
      }

      const allowed = rule.effect === 'allow';
      return {
        allowed,
        matchedRule: rule,
        reason: rule.reason ?? (allowed ? 'Allowed by rule' : 'Denied by rule'),
      };
    }

    // No rule matched — use default
    const allowed = this.defaultEffect === 'allow';
    return {
      allowed,
      matchedRule: null,
      reason: `Default effect applied: ${this.defaultEffect}`,
    };
  }

  /**
   * Enable/disable restricted mode.
   */
  setRestrictedMode(enabled: boolean, allowList?: string[]): void {
    this.restrictedMode = enabled;
    if (allowList) {
      this.restrictedAllowList = allowList;
    }
  }

  /**
   * Get restricted mode status.
   */
  isRestrictedMode(): boolean {
    return this.restrictedMode;
  }

  /**
   * Register as a HookRegistry guard handler.
   */
  attachToHooks(hooks: {
    before: (event: any, handler: (...args: any[]) => any) => () => void;
  }): () => void {
    return hooks.before('tool:call', (data: Record<string, unknown>) => {
      const toolName = typeof data.toolName === 'string' ? data.toolName : '';
      const tags = Array.isArray(data.tags) ? (data.tags as string[]) : undefined;
      const result = this.check(toolName, tags);

      if (!result.allowed) {
        return { allowed: false, reason: `PrivilegeGuard: ${result.reason}` };
      }

      return { allowed: true };
    });
  }
}

// ── Pre-built Rule Sets ──

/**
 * Rules for safe read-only mode (only read/list tools allowed).
 */
export function createReadOnlyRules(): PrivilegeRule[] {
  return [
    { toolPattern: 'filesystem:read', effect: 'allow', reason: 'Read-only mode' },
    { toolPattern: 'filesystem:list', effect: 'allow', reason: 'Read-only mode' },
    { toolPattern: 'knowledge:search', effect: 'allow', reason: 'Read-only mode' },
    { toolPattern: 'knowledge:read', effect: 'allow', reason: 'Read-only mode' },
    { toolPattern: 'document:read', effect: 'allow', reason: 'Read-only mode' },
    { toolPattern: '*', effect: 'deny', reason: 'Read-only mode: write operations blocked' },
  ];
}

/**
 * Default safe rules for general use.
 */
export function createDefaultRules(): PrivilegeRule[] {
  return [
    // Deny dangerous patterns
    { toolPattern: 'system:exec', effect: 'deny', requiredTags: ['admin'], reason: 'Requires admin tag' },
    { toolPattern: 'filesystem:delete', effect: 'deny', requiredTags: ['admin'], reason: 'Requires admin tag' },
    { toolPattern: 'filesystem:write', effect: 'deny', requiredTags: ['readonly'], reason: 'Denied in read-only mode' },
  ];
}

/**
 * Restricted-mode allow list (common safe tools).
 */
export function createRestrictedAllowList(): string[] {
  return [
    'knowledge:search',
    'knowledge:read',
    'filesystem:read',
    'filesystem:list',
    'document:read',
    'skills:list',
    'skills:run',
  ];
}

export default {
  PrivilegeGuard,
  createReadOnlyRules,
  createDefaultRules,
  createRestrictedAllowList,
};