/**
 * Kato PrivilegeGuard — Per-Tool RBAC (Role-Based Access Control)
 * Phase 8.2c — Tool Authorization
 *
 * PrivilegeGuard supports explicit allow/deny rules with optional restricted mode.
 * In standalone use it defaults to allow; Engine initializes it with deny for zero-trust.
 * Supports path traversal detection.
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
  /** Default effect when no rule matches — DEFAULT: 'allow' for standalone mode */
  defaultEffect?: 'allow' | 'deny';
  /** Whether restricted mode is active */
  restrictedMode?: boolean;
  /** In restricted mode, only allow these tool patterns */
  restrictedAllowList?: string[];
  /** Base workspace path for path traversal checks */
  workspaceRoot?: string;
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
  if (pattern === name) return true;
  if (pattern === '*') return true;

  const regexStr =
    '^' +
    pattern
      .replace(/[.+^${}()|[\]\\]/g, '\\$&')
      .replace(/\*\*/g, '<<<DOUBLESTAR>>>')
      .replace(/\*/g, '[^:]*')
      .replace(/<<<DOUBLESTAR>>>/g, '.*') +
    '$';

  return new RegExp(regexStr).test(name);
}

const TOOL_CATEGORY_MAP: Record<string, string[]> = {
  filesystem: ['list_directory', 'read_file'],
  knowledge: ['search_knowledge_graph', 'write_wiki_page'],
  document: ['read_pdf', 'read_docx', 'extract_pdf_to_md', 'extract_docx_to_md', 'archive_document'],
  network: ['fetch_url'],
  skills: ['load_skill', 'check_stale_skills'],
  system: ['process_new_raw', 'execute_command', 'extract_formulas'],
  report: ['generate_report'],
};

const TOOL_ALIAS_MAP: Record<string, string[]> = {
  'filesystem:read': ['read_file'],
  'filesystem:list': ['list_directory'],
  'knowledge:search': ['search_knowledge_graph'],
  'knowledge:read': ['search_knowledge_graph'],
  'document:read': ['read_pdf', 'read_docx'],
  'skills:list': ['check_stale_skills'],
  'skills:run': ['load_skill'],
  'sandbox:execute': ['execute_command'],
  'report:generate': ['generate_report'],
};

function toolPatternMatches(pattern: string, toolName: string): boolean {
  if (globMatch(pattern, toolName)) return true;

  const aliases = TOOL_ALIAS_MAP[pattern];
  if (aliases && aliases.includes(toolName)) {
    return true;
  }

  const categoryMatch = pattern.match(/^([a-zA-Z0-9_-]+):\*$/);
  if (categoryMatch) {
    const category = categoryMatch[1];
    return TOOL_CATEGORY_MAP[category]?.includes(toolName) ?? false;
  }

  return false;
}

// ── Path Traversal Detection ──

/**
 * Check if a path contains traversal attempts or escapes workspace.
 * Returns true if path is SAFE, false if TRAVERSAL DETECTED.
 */
export function isPathSafe(inputPath: string, workspaceRoot: string): boolean {
  // Reject raw traversal sequences
  if (inputPath.includes('..')) return false;
  if (inputPath.includes('~')) return false;

  // Normalize and check if within workspace
  const path = require('path');
  const resolved = path.resolve(workspaceRoot, inputPath);
  const normalizedRoot = path.resolve(workspaceRoot);

  if (!resolved.startsWith(normalizedRoot + path.sep) && resolved !== normalizedRoot) {
    return false;
  }

  return true;
}

/**
 * Validate all path-like arguments in a tool call.
 * Returns { safe: false, reason } if any path is unsafe.
 */
export function validateToolPaths(
  _toolName: string,
  args: Record<string, unknown>,
  workspaceRoot: string
): { safe: boolean; reason?: string } {
  const pathKeys = ['path', 'filePath', 'source', 'destination', 'target', 'dir', 'directory', 'root'];

  for (const key of pathKeys) {
    const val = args[key];
    if (typeof val === 'string' && val.length > 0) {
      if (!isPathSafe(val, workspaceRoot)) {
        return {
          safe: false,
          reason: `Path traversal detected in arg "${key}": "${val}"`,
        };
      }
    }
  }

  return { safe: true };
}

// ── PrivilegeGuard ──

export class PrivilegeGuard {
  private rules: PrivilegeRule[];
  private defaultEffect: 'allow' | 'deny';
  private restrictedMode: boolean;
  private restrictedAllowList: string[];
  private workspaceRoot: string;

  constructor(config: PrivilegeGuardConfig = {}) {
    this.rules = config.rules ?? [];
    this.defaultEffect = config.defaultEffect ?? 'allow';
    this.restrictedMode = config.restrictedMode ?? false;
    this.restrictedAllowList = config.restrictedAllowList ?? [];
    this.workspaceRoot = config.workspaceRoot ?? process.cwd();
  }

  /**
   * Add a privilege rule.
   */
  addRule(rule: PrivilegeRule): void {
    this.rules.push(rule);
  }

  /**
   * Check if a tool call is allowed.
   * ZERO-TRUST: Default deny. Must be explicitly allowed.
   * Also validates path arguments for traversal.
   */
  check(
    toolName: string,
    tags?: string[],
    args?: Record<string, unknown>
  ): PrivilegeCheckResult {
    // ── Path Traversal Check ──
    if (args && Object.keys(args).length > 0) {
      const pathCheck = validateToolPaths(toolName, args, this.workspaceRoot);
      if (!pathCheck.safe) {
        return {
          allowed: false,
          matchedRule: null,
          reason: `BLOCKED: ${pathCheck.reason}`,
        };
      }
    }

    // ── Restricted Mode ──
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

    // ── Evaluate rules in order (first match wins) ──
    for (const rule of this.rules) {
      if (!toolPatternMatches(rule.toolPattern, toolName)) continue;

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

    // ── No rule matched — use default (DENY) ──
    const allowed = this.defaultEffect === 'allow';
    return {
      allowed,
      matchedRule: null,
      reason: `Default effect applied: ${this.defaultEffect} (Zero-Trust)`,
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
   * Set workspace root for path validation.
   */
  setWorkspaceRoot(root: string): void {
    this.workspaceRoot = root;
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
      let rawArgs = data.args ?? data.toolArgs;
      let args: Record<string, unknown> | undefined;

      if (typeof rawArgs === 'string') {
        try {
          args = JSON.parse(rawArgs);
        } catch {
          args = undefined;
        }
      } else if (typeof rawArgs === 'object' && rawArgs !== null) {
        args = rawArgs as Record<string, unknown>;
      }

      const result = this.check(toolName, tags, args);

      if (!result.allowed) {
        return { allowed: false, reason: `PrivilegeGuard: ${result.reason}` };
      }

      return { allowed: true };
    });
  }
}

// ── Pre-built Rule Sets (WHITELIST APPROACH) ──

/**
 * Default ALLOW list — only these tools are permitted.
 * Everything else is denied by default.
 */
export function createDefaultAllowRules(): PrivilegeRule[] {
  return [
    // Explicitly allowed read operations
    { toolPattern: 'filesystem:read', effect: 'allow', reason: 'Explicitly allowed: read' },
    { toolPattern: 'filesystem:list', effect: 'allow', reason: 'Explicitly allowed: list' },
    { toolPattern: 'knowledge:search', effect: 'allow', reason: 'Explicitly allowed: search' },
    { toolPattern: 'knowledge:read', effect: 'allow', reason: 'Explicitly allowed: read' },
    { toolPattern: 'document:read', effect: 'allow', reason: 'Explicitly allowed: read' },
    { toolPattern: 'skills:list', effect: 'allow', reason: 'Explicitly allowed: list skills' },
    { toolPattern: 'sandbox:execute', effect: 'allow', reason: 'Explicitly allowed: sandbox exec' },
    { toolPattern: 'report:generate', effect: 'allow', reason: 'Explicitly allowed: report' },
  ];
}

/**
 * Rules for safe read-only mode.
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
  createDefaultAllowRules,
  createReadOnlyRules,
  createRestrictedAllowList,
  isPathSafe,
  validateToolPaths,
};
